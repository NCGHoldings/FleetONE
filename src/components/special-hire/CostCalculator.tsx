import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calculator, MapPin, Plus, Trash2 } from 'lucide-react';
import { CostBreakdown } from './CostBreakdown';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';

export function CostCalculator() {
  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropLocation: '',
    busType: '',
    hireType: 'Outside',
    numberOfBuses: 1,
    driverCharge: 1500,
    commissionPct: 0,
    commissionPassThroughPct: 0,
    discountType: 'percentage' as 'percentage' | 'amount',
    discountPct: 0,
    discountAmount: 0,
    percentageAdjustment: 0,
    expectedWorkHours: 8,
    overnightDays: 0,
    agreedDistance: 0
  });
  
  const [isMultiBusMode, setIsMultiBusMode] = useState(false);
  const [selectedBusFleet, setSelectedBusFleet] = useState<Array<{id: string, busTypeId: string, quantity: number}>>([]);
  const [costData, setCostData] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [busTypes, setBusTypes] = useState<any[]>([]);
  const [fuelSettings, setFuelSettings] = useState<any>(null);
  const [intermediateStops, setIntermediateStops] = useState<Array<{id: string, location: string}>>([]);
  const [selectedRateCard, setSelectedRateCard] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBusTypes();
    fetchFuelSettings();
  }, []);

  const fetchBusTypes = async () => {
    const { data } = await supabase
      .from('bus_types')
      .select('*')
      .eq('is_active', true);
    if (data) setBusTypes(data);
  };

  const fetchFuelSettings = async () => {
    const { data } = await supabase
      .from('fuel_settings')
      .select('*')
      .eq('is_default', true)
      .single();
    if (data) setFuelSettings(data);
  };

  const calculateMultiBusFleetCosts = async () => {
    if (selectedBusFleet.some(b => !b.busTypeId || b.quantity < 1)) {
      toast({ 
        title: "Incomplete Bus Selection", 
        description: "Please select a bus type and quantity for all entries",
        variant: "destructive" 
      });
      return;
    }

    setCalculating(true);
    
    try {
      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: {
          pickupLocation: formData.pickupLocation,
          dropLocation: formData.dropLocation,
          intermediateStops,
          parkingLat: fuelSettings.parking_lat,
          parkingLng: fuelSettings.parking_lng,
          calculateSegments: true,
        }
      });
      
      if (error || !distanceData) throw new Error('Distance calculation failed');
      
      const tripDistance = distanceData.kmTrip || 0;
      const busFleetDetails = [];
      let combinedSubtotal = 0;
      let totalBuses = 0;
      let totalCapacity = 0;
      let totalFuelCost = 0;
      let totalMaintenanceCost = 0;
      let totalOvertimeCharge = 0;
      let totalOvernightCharge = 0;
      let totalExceedingDistanceCharge = 0;
      
      for (const bus of selectedBusFleet) {
        const busType = busTypes.find(bt => bt.id === bus.busTypeId);
        if (!busType) continue;
        
        const { data: rateCards } = await supabase
          .from('hire_rate_cards')
          .select('*')
          .eq('hire_type', formData.hireType)
          .eq('bus_type_id', bus.busTypeId)
          .eq('is_active', true)
          .order('from_km');
        
        let hireChargePerBus = 0;
        let overtimeChargePerBus = 0;
        let overnightChargePerBus = 0;
        let exceedingDistanceChargePerBus = 0;
        const rateCard = rateCards?.[0];
        
        if (!rateCard) {
          toast({
            title: "Rate Card Missing",
            description: `No rate card found for ${busType.name}`,
            variant: "destructive"
          });
          continue;
        }
        
        if (formData.hireType === 'Outside') {
          const fixedRate = rateCard.flat_fee_lkr || 0;
          const baseCoverageKm = rateCard.exceeding_km_threshold || 100;
          const exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
          exceedingDistanceChargePerBus = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);
          
          // Calculate overtime/overnight charges using standard function
          if (formData.expectedWorkHours && formData.expectedWorkHours > 0) {
            const now = new Date();
            const endTime = new Date(now.getTime() + formData.expectedWorkHours * 60 * 60 * 1000);
            
            const extraTimeResult = calculateExtraTimeCharge(
              tripDistance,
              now,
              endTime,
              {
                baselineSpeedKmph: 10,
                hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
                nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
                useStandardHours: false
              }
            );
            
            overtimeChargePerBus = extraTimeResult.overtimeCharge;
            overnightChargePerBus = extraTimeResult.overnightCharge;
          }
          
          hireChargePerBus = fixedRate + exceedingDistanceChargePerBus + overtimeChargePerBus + overnightChargePerBus;
        } else {
          // For other hire types, use flat fee
          hireChargePerBus = rateCard.flat_fee_lkr || 0;
        }
        
        const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
        const fuelCostPerBus = (emptyRunKm / (busType.avg_km_per_l || 8)) * fuelSettings.diesel_price_lkr_per_l;
        const totalTripDistance = (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0);
        const maintenanceCostPerBus = totalTripDistance * (fuelSettings.maintenance_rate_lkr_per_km || 20);
        
        const subtotalPerBus = hireChargePerBus + fuelCostPerBus + maintenanceCostPerBus;
        
        busFleetDetails.push({
          bus_type_id: busType.id,
          bus_type_name: busType.name,
          quantity: bus.quantity,
          seating_capacity: busType.capacity,
          hire_charge_per_bus: Math.round(hireChargePerBus),
          fuel_cost_per_bus: Math.round(fuelCostPerBus),
          maintenance_cost_per_bus: Math.round(maintenanceCostPerBus),
          overtime_charge_per_bus: Math.round(overtimeChargePerBus),
          overnight_charge_per_bus: Math.round(overnightChargePerBus),
          exceeding_distance_charge_per_bus: Math.round(exceedingDistanceChargePerBus),
          subtotal_per_bus: Math.round(subtotalPerBus),
          subtotal_all_buses: Math.round(subtotalPerBus * bus.quantity)
        });
        
        combinedSubtotal += subtotalPerBus * bus.quantity;
        totalBuses += bus.quantity;
        totalCapacity += busType.capacity * bus.quantity;
        totalFuelCost += fuelCostPerBus * bus.quantity;
        totalMaintenanceCost += maintenanceCostPerBus * bus.quantity;
        totalOvertimeCharge += overtimeChargePerBus * bus.quantity;
        totalOvernightCharge += overnightChargePerBus * bus.quantity;
        totalExceedingDistanceCharge += exceedingDistanceChargePerBus * bus.quantity;
      }
      
      // Apply commission and discount
      const grossRevenue = combinedSubtotal;
      const commissionExpenseAmount = grossRevenue * (formData.commissionPct / 100);
      const commissionPassThroughAmount = grossRevenue * (formData.commissionPassThroughPct / 100);
      
      let discountAmount = 0;
      if (formData.discountType === 'percentage') {
        discountAmount = grossRevenue * (formData.discountPct / 100);
      } else if (formData.discountType === 'amount') {
        discountAmount = formData.discountAmount;
      }
      
      const subtotalAfterAdjustments = grossRevenue + commissionPassThroughAmount - discountAmount;
      const adjustmentAmount = subtotalAfterAdjustments * (formData.percentageAdjustment / 100);
      const finalCustomerTotal = subtotalAfterAdjustments + adjustmentAmount;
      
      const totalExpenses = 
        (formData.driverCharge * totalBuses) + 
        totalFuelCost + 
        totalMaintenanceCost + 
        commissionExpenseAmount;
      
      const netProfit = finalCustomerTotal - totalExpenses;
      
      const totalTripDistance = (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0);
      
      setCostData({
        kmParkingToPickup: distanceData.kmParkingToPickup,
        kmTrip: distanceData.kmTrip,
        kmDropToParking: distanceData.kmDropToParking,
        totalTripDistance: totalTripDistance,
        
        busFleetDetails: {
          buses: busFleetDetails,
          total_buses: totalBuses,
          total_capacity: totalCapacity,
          combined_subtotal: Math.round(combinedSubtotal)
        },
        
        hireCharge: busFleetDetails.reduce((sum, b) => sum + b.hire_charge_per_bus * b.quantity, 0),
        overtimeCharge: Math.round(totalOvertimeCharge),
        overnightCharge: Math.round(totalOvernightCharge),
        exceedingDistanceCharge: Math.round(totalExceedingDistanceCharge),
        
        fuelCostFuelOnly: Math.round(totalFuelCost),
        maintenanceCost: Math.round(totalMaintenanceCost),
        busTypeEfficiency: 8,
        fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
        maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20,
        
        grossRevenue: Math.round(grossRevenue),
        customerTotalWithFuel: Math.round(finalCustomerTotal),
        
        commissionPct: formData.commissionPct,
        commissionAmount: Math.round(commissionExpenseAmount),
        commissionPassThroughPct: formData.commissionPassThroughPct,
        commissionPassThroughAmount: Math.round(commissionPassThroughAmount),
        
        discountType: formData.discountType,
        discountPct: formData.discountPct,
        discountAmount: Math.round(discountAmount),
        
        percentageAdjustment: formData.percentageAdjustment,
        adjustmentAmount: Math.round(adjustmentAmount),
        
        driverCharge: formData.driverCharge * totalBuses,
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(netProfit),
        
        numberOfBuses: totalBuses,
        isMultiBusMode: true
      });
      
      toast({
        title: "Multi-Bus Fleet Calculated",
        description: `${totalBuses} buses | ${totalCapacity} seats | LKR ${Math.round(finalCustomerTotal).toLocaleString()}`
      });
    } catch (error: any) {
      toast({ title: "Calculation Failed", description: error.message, variant: "destructive" });
    } finally {
      setCalculating(false);
    }
  };

  const calculateCosts = async () => {
    if (!fuelSettings) {
      toast({ title: "Error", description: "Fuel settings not loaded", variant: "destructive" });
      return;
    }

    if (isMultiBusMode && selectedBusFleet.length > 0) {
      return calculateMultiBusFleetCosts();
    }

    if (!formData.busType) {
      toast({ title: "Error", description: "Please select a bus type", variant: "destructive" });
      return;
    }

    // Single bus mode validation
    if (!formData.busType) {
      toast({ title: "Error", description: "Please select a bus type", variant: "destructive" });
      return;
    }

    // Validate commission split and discount
    if (formData.commissionPassThroughPct > formData.commissionPct) {
      toast({ 
        title: "Invalid Commission Split", 
        description: "Pass to customer (%) cannot be greater than Commission to pay (%).", 
        variant: "destructive" 
      });
      return;
    }

    const hasDiscount = (formData.discountType === 'percentage' && formData.discountPct > 0) || 
                        (formData.discountType === 'amount' && formData.discountAmount > 0);
    
    if (hasDiscount) {
      // Check if user is admin for discount approval
      const { data: userData } = await supabase.auth.getUser();
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user?.id);
      
      const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');
      
      if (!isAdmin) {
        toast({ 
          title: "Admin Approval Required", 
          description: "Discounts require admin approval. Please contact an administrator.", 
          variant: "destructive" 
        });
        return;
      }
    }

    setCalculating(true);
    
    try {
      console.log('Starting distance calculation with:', {
        pickup: formData.pickupLocation,
        drop: formData.dropLocation,
        parking: { lat: fuelSettings.parking_lat, lng: fuelSettings.parking_lng }
      });

      // Call edge function to calculate distances with enhanced accuracy
      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: {
          pickupLocation: formData.pickupLocation,
          dropLocation: formData.dropLocation,
          intermediateStops,
          parkingLat: fuelSettings.parking_lat,
          parkingLng: fuelSettings.parking_lng,
          // Enhanced parameters for accurate distance calculation
          calculateSegments: true, // Use segment-by-segment calculation for accuracy
          avoidHighways: false, // Allow highways for bus routes
          avoidTolls: false, // Allow tolls
          debugMode: true, // Enable detailed logging
          routePreference: 'distance', // Prioritize shortest distance
        }
      });

      console.log('Distance calculation result:', {
        distanceData, 
        error,
        calculationMethod: distanceData?.calculationMethod,
        segmentDetails: distanceData?.segmentDetails,
        routeComparison: distanceData?.routeComparison
      });

      if (error) {
        console.error('Distance calculation error:', error);
        throw new Error(`Distance calculation failed: ${error.message || 'Unknown error'}`);
      }

      if (!distanceData) {
        throw new Error('No distance data received from calculation service');
      }

      // Get selected bus type details
      const selectedBusType = busTypes.find(bt => bt.id === formData.busType);
      if (!selectedBusType) throw new Error('Please select a bus type');

      // Find appropriate rate card based on trip distance
      const tripDistance = distanceData.kmTrip || 0;
      
      // Get all rate cards for this hire type and bus type to find the best match
      const { data: allRateCards } = await supabase
        .from('hire_rate_cards')
        .select('*')
        .eq('hire_type', formData.hireType)
        .eq('bus_type_id', formData.busType)
        .eq('is_active', true)
        .order('from_km');

      let rateCard: any = null;

      // Outside hire special logic: Flat rate covers first 100km, then exceeding rate per km over 100. Add fuel cost (trip km only).
      if (formData.hireType === 'Outside') {
        if (allRateCards && allRateCards.length > 0) {
          rateCard = allRateCards.find(c => c.flat_fee_lkr != null && c.exceeding_km_rate_lkr != null) || allRateCards[0];
        }
        if (!rateCard) {
          throw new Error('No Outside rate card found for this bus type. Please configure flat fee and exceeding km rate.');
        }
        setSelectedRateCard(rateCard);

        const fixedRate = rateCard.flat_fee_lkr || 0;
        const baseCoverageKm = rateCard.exceeding_km_threshold || 100;
        const exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
        const exceedingDistanceCharge = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);

        // Calculate extra time charges for Outside hire type using work hours
        let overtimeCharge = 0;
        let overnightCharge = 0;
        let totalExtraTimeCharge = 0;
        
        if (formData.expectedWorkHours && formData.expectedWorkHours > 0) {
          const now = new Date();
          const endTime = new Date(now.getTime() + formData.expectedWorkHours * 60 * 60 * 1000);
          
          const extraTimeResult = calculateExtraTimeCharge(
            tripDistance,
            now,
            endTime,
            {
              baselineSpeedKmph: 10,
              hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
              nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
              useStandardHours: false
            }
          );
          
          overtimeCharge = extraTimeResult.overtimeCharge;
          overnightCharge = extraTimeResult.overnightCharge;
          totalExtraTimeCharge = extraTimeResult.totalExtraCharge;
        }

        const hireCharge = fixedRate + exceedingDistanceCharge + totalExtraTimeCharge;

        // Fuel cost on empty running only (parking→pickup + drop→parking)
        const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
        const fuelLiters = (emptyRunKm / (selectedBusType.avg_km_per_l || 8));
        const fuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;

        // Maintenance cost on total distance (parking→pickup + trip + drop→parking)
        const totalTripDistance = (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0);
        const maintenanceCost = totalTripDistance * (fuelSettings.maintenance_rate_lkr_per_km || 20);

        // Revenue and commission split calculations
        const grossRevenue = hireCharge * formData.numberOfBuses;
        const customerSubtotal = grossRevenue + (fuelCost * formData.numberOfBuses) + (maintenanceCost * formData.numberOfBuses);
        
        const commissionExpenseAmount = customerSubtotal * (formData.commissionPct / 100);
        const commissionPassThroughAmount = customerSubtotal * (formData.commissionPassThroughPct / 100);
        const discountAmount = customerSubtotal * (formData.discountPct / 100);

        // Customer total calculation: base + commission passthrough + fuel + maintenance - discount + percentage adjustment
        const customerTotalBeforeAdjustment = customerSubtotal + commissionPassThroughAmount - discountAmount;
        const adjustmentAmount = customerTotalBeforeAdjustment * (formData.percentageAdjustment / 100);
        const finalCustomerTotal = customerTotalBeforeAdjustment + adjustmentAmount;
        
        console.log('Outside hire calculation debug:', {
          customerSubtotal,
          fuelCost,
          commissionPassThroughAmount,
          customerTotalBeforeAdjustment,
          percentageAdjustment: formData.percentageAdjustment,
          adjustmentAmount,
          finalCustomerTotal
        });

        const totalExpenses = (formData.driverCharge * formData.numberOfBuses) + (fuelCost * formData.numberOfBuses) + (maintenanceCost * formData.numberOfBuses) + commissionExpenseAmount;
        const netProfit = finalCustomerTotal - totalExpenses;

        const result = {
          ...distanceData,
          totalDistance: (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0),
          totalTripDistance,
          fuelLiters: Math.round(fuelLiters * 10) / 10,
          fuelCostFuelOnly: Math.round(fuelCost),
          maintenanceCost: Math.round(maintenanceCost),
          hireCharge: Math.round(hireCharge),
          fixedRate: Math.round(fixedRate),
          overtimeCharge: Math.round(overtimeCharge),
          overnightCharge: Math.round(overnightCharge),
          exceedingDistanceCharge: Math.round(exceedingDistanceCharge),
          rateCardDetails: {
            standardHours: rateCard.standard_hours,
            actualHours: formData.expectedWorkHours,
            availableHours: tripDistance / 10, // Available hours based on quoted distance
            overtimeHours: 0,
            agreedDistance: baseCoverageKm,
            actualDistance: tripDistance,
            exceedingKm,
            freeExceedingKm: 0,
            chargeableExceedingKm: exceedingKm,
            rateCardRange: `${rateCard.from_km}-${rateCard.to_km}km`,
            rateCardId: rateCard.id
          },
        grossRevenue: Math.round(grossRevenue),
        customerTotalWithFuel: Math.round(finalCustomerTotal),
          driverCharge: formData.driverCharge,
          otherExpenses: [],
          // Commission and adjustments (new)
          commissionPct: formData.commissionPct,
          commissionAmount: Math.round(commissionExpenseAmount),
          commissionPassThroughPct: formData.commissionPassThroughPct,
          commissionPassThroughAmount: Math.round(commissionPassThroughAmount),
          discountPct: formData.discountPct,
          discountAmount: Math.round(discountAmount),
          percentageAdjustment: formData.percentageAdjustment,
          adjustmentAmount: Math.round(adjustmentAmount),
          totalExpenses: Math.round(totalExpenses),
          netProfit: Math.round(netProfit),
          busTypeName: selectedBusType.name,
          busTypeEfficiency: selectedBusType.avg_km_per_l || 8,
          fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
          maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20
        };

        console.log('Final cost calculation result (Outside):', result);
        setCostData(result);
        toast({ 
          title: "Cost Calculated (Outside)", 
          description: `Trip: ${tripDistance}km | Total: LKR ${Math.round(finalCustomerTotal).toLocaleString()} | Commission: ${formData.commissionPct}% | Discount: ${formData.discountPct}% | Maintenance: LKR ${Math.round(maintenanceCost).toLocaleString()}`
        });

        return;
      }

      // Handle different hire types with proper rate card logic
      if (!allRateCards || allRateCards.length === 0) {
        throw new Error(`No rate cards found for ${formData.hireType} hire type. Please configure rate cards first.`);
      }

      let fixedRate = 0;
      let exceedingDistanceCharge = 0;
      let overtimeCharge = 0;
      let overnightCharge = 0;
      let baseCoverageKm = 100;
      let exceedingKm = 0;

      // For Other hire types (Lyceum, etc.) - use range-based rates
      if (formData.hireType !== 'Outside') {
        // For trips beyond 100km, use 75-100km rate for first 100km + exceeding km rate
        if (tripDistance > 100) {
          // Find the 75-100km range rate card for the first 100km base charge
          const baseRateCard = allRateCards.find(card => 
            card.from_km >= 75 && card.to_km >= 100
          );
          
          if (baseRateCard) {
            // Use the 75-100km rate for the first 100km
            fixedRate = baseRateCard.flat_fee_lkr || 0;
            rateCard = baseRateCard;
            baseCoverageKm = 100;
            
            // Calculate exceeding km beyond 100km
            exceedingKm = tripDistance - 100;
            
            // Find exceeding km rate (could be from same or different rate card)
            const exceedingRate = baseRateCard.exceeding_km_rate_lkr || 
                                allRateCards.find(card => card.exceeding_km_rate_lkr != null)?.exceeding_km_rate_lkr || 0;
            
            exceedingDistanceCharge = exceedingKm * exceedingRate;
          } else {
            // Fallback if no 75-100km range found
            rateCard = allRateCards.find(card => 
              tripDistance >= (card.from_km || 0) && 
              (card.to_km === null || tripDistance <= card.to_km)
            ) || allRateCards[0];
            
            fixedRate = rateCard?.flat_fee_lkr || 0;
          }
        } else {
          // For trips <= 100km, use normal range-based rate card selection
          rateCard = allRateCards.find(card => 
            tripDistance >= (card.from_km || 0) && 
            (card.to_km === null || tripDistance <= card.to_km)
          );

          if (!rateCard) {
            // Fallback to first available rate card
            rateCard = allRateCards[0];
          }
          
          fixedRate = rateCard?.flat_fee_lkr || 0;
        }

        if (!rateCard) {
          throw new Error(`No suitable rate card found for ${formData.hireType} hire type and ${tripDistance}km distance.`);
        }

        setSelectedRateCard(rateCard);
        
        // Calculate overtime based on standard hours from rate card
        const standardHours = rateCard.standard_hours || 8;
        const overtimeHours = Math.max(0, formData.expectedWorkHours - standardHours);
        overtimeCharge = overtimeHours * (rateCard.overtime_rate_lkr_per_hour || 0);
        overnightCharge = formData.overnightDays * (rateCard.overnight_charge_lkr_per_day || 0);
      } else {
        // Outside hire logic - unified flat fee + exceeding rate
        rateCard = allRateCards.find(c => c.flat_fee_lkr != null && c.exceeding_km_rate_lkr != null) || allRateCards[0];
        if (!rateCard) {
          throw new Error(`No rate card found for ${formData.hireType} hire type. Please configure flat fee and exceeding km rate.`);
        }
        setSelectedRateCard(rateCard);

        fixedRate = rateCard.flat_fee_lkr || 0;
        baseCoverageKm = rateCard.exceeding_km_threshold || 100;
        exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
        exceedingDistanceCharge = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);

        // Calculate overtime charges
        const overtimeHours = Math.max(0, formData.expectedWorkHours - (rateCard.standard_hours || 8));
        overtimeCharge = overtimeHours * (rateCard.overtime_rate_lkr_per_hour || 0);
        overnightCharge = formData.overnightDays * (rateCard.overnight_charge_lkr_per_day || 0);
      }

      const hireCharge = fixedRate + exceedingDistanceCharge + overtimeCharge + overnightCharge;

      // Fuel cost on empty running only (parking→pickup + drop→parking)
      const totalDistance = (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0);
      const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
      const fuelLiters = (emptyRunKm / (selectedBusType.avg_km_per_l || 8));
      const fuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;

      // Maintenance cost on total distance (parking→pickup + trip + drop→parking)
      const maintenanceCost = totalDistance * (fuelSettings.maintenance_rate_lkr_per_km || 20);

      // Revenue and commission split calculations
      const grossRevenue = hireCharge * formData.numberOfBuses;
      const customerSubtotal = grossRevenue + (fuelCost * formData.numberOfBuses) + (maintenanceCost * formData.numberOfBuses);
      
      const commissionExpenseAmount = customerSubtotal * (formData.commissionPct / 100);
      const commissionPassThroughAmount = customerSubtotal * (formData.commissionPassThroughPct / 100);
      const discountAmount = customerSubtotal * (formData.discountPct / 100);

      // Customer total calculation: base + commission passthrough + fuel + maintenance - discount + percentage adjustment
      const customerTotalBeforeAdjustment = customerSubtotal + commissionPassThroughAmount - discountAmount;
      const adjustmentAmount = customerTotalBeforeAdjustment * (formData.percentageAdjustment / 100);
      const finalCustomerTotal = customerTotalBeforeAdjustment + adjustmentAmount;

        
        console.log('General hire calculation debug:', {
          customerSubtotal,
          fuelCost,
          commissionPassThroughAmount,
          customerTotalBeforeAdjustment,
          percentageAdjustment: formData.percentageAdjustment,
          adjustmentAmount,
          finalCustomerTotal
        });

      const totalExpenses = (formData.driverCharge * formData.numberOfBuses) + (fuelCost * formData.numberOfBuses) + (maintenanceCost * formData.numberOfBuses) + commissionExpenseAmount;
      const netProfit = finalCustomerTotal - totalExpenses;

      const result = {
        ...distanceData,
        totalDistance,
        totalTripDistance: totalDistance,
        fuelLiters: Math.round(fuelLiters * 10) / 10,
        fuelCostFuelOnly: Math.round(fuelCost),
        maintenanceCost: Math.round(maintenanceCost),
        hireCharge: Math.round(hireCharge),
        fixedRate: Math.round(fixedRate),
        overtimeCharge: Math.round(overtimeCharge),
        overnightCharge: Math.round(overnightCharge),
        exceedingDistanceCharge: Math.round(exceedingDistanceCharge),
        rateCardDetails: {
          standardHours: rateCard.standard_hours || 8,
          actualHours: formData.expectedWorkHours,
          overtimeHours: Math.max(0, formData.expectedWorkHours - (rateCard.standard_hours || 8)),
          agreedDistance: baseCoverageKm,
          actualDistance: tripDistance,
          exceedingKm,
          freeExceedingKm: 0,
          chargeableExceedingKm: exceedingKm,
          rateCardRange: `${rateCard.from_km || 0}-${rateCard.to_km || '∞'}km`,
          rateCardId: rateCard.id
        },
        grossRevenue: Math.round(grossRevenue),
        customerTotalWithFuel: Math.round(finalCustomerTotal),
        driverCharge: formData.driverCharge,
        otherExpenses: [],
        // Commission and adjustments (new)
        commissionPct: formData.commissionPct,
        commissionAmount: Math.round(commissionExpenseAmount),
        commissionPassThroughPct: formData.commissionPassThroughPct,
        commissionPassThroughAmount: Math.round(commissionPassThroughAmount),
        discountPct: formData.discountPct,
        discountAmount: Math.round(discountAmount),
        percentageAdjustment: formData.percentageAdjustment,
        adjustmentAmount: Math.round(adjustmentAmount),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(netProfit),
        busTypeName: selectedBusType.name,
        busTypeEfficiency: selectedBusType.avg_km_per_l || 8,
        fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
        maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20
      };

      console.log('Final cost calculation result:', result);
      setCostData(result);
      toast({ 
        title: "Cost Calculated Successfully", 
        description: `Trip: ${tripDistance}km | Total: LKR ${Math.round(finalCustomerTotal).toLocaleString()} | Commission: ${formData.commissionPct}% | Discount: ${formData.discountPct}% | Maintenance: LKR ${Math.round(maintenanceCost).toLocaleString()}`
      });
    } catch (error: any) {
      console.error('Error calculating costs:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to calculate costs", 
        variant: "destructive" 
      });
    }

    setCalculating(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Cost Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Pickup Location</Label>
            <Input
              value={formData.pickupLocation}
              onChange={(e) => setFormData({...formData, pickupLocation: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Drop Location</Label>
            <Input
              value={formData.dropLocation}
              onChange={(e) => setFormData({...formData, dropLocation: e.target.value})}
            />
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label>Multi-Bus Fleet Mode</Label>
              <Switch
                checked={isMultiBusMode}
                onCheckedChange={(checked) => {
                  setIsMultiBusMode(checked);
                  if (checked) {
                    setSelectedBusFleet([{ id: crypto.randomUUID(), busTypeId: '', quantity: 1 }]);
                  } else {
                    setSelectedBusFleet([]);
                  }
                }}
              />
            </div>
          </div>

          {isMultiBusMode ? (
            <div className="col-span-2 space-y-3">
              {selectedBusFleet.map((bus, index) => (
                <div key={bus.id} className="flex gap-2">
                  <Select value={bus.busTypeId} onValueChange={(value) => {
                    const updated = [...selectedBusFleet];
                    updated[index].busTypeId = value;
                    setSelectedBusFleet(updated);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select bus type" />
                    </SelectTrigger>
                    <SelectContent>
                      {busTypes.map((bt) => (
                        <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={bus.quantity}
                    onChange={(e) => {
                      const updated = [...selectedBusFleet];
                      updated[index].quantity = parseInt(e.target.value) || 1;
                      setSelectedBusFleet(updated);
                    }}
                    className="w-24"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setSelectedBusFleet(selectedBusFleet.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setSelectedBusFleet([...selectedBusFleet, { id: crypto.randomUUID(), busTypeId: '', quantity: 1 }])}>
                <Plus className="h-4 w-4 mr-2" /> Add Bus
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Bus Type</Label>
              <Select onValueChange={(value) => setFormData({...formData, busType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {busTypes.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button onClick={calculateCosts} disabled={calculating} className="w-full">
          <Calculator className="h-4 w-4 mr-2" />
          {calculating ? 'Calculating...' : 'Calculate Costs'}
        </Button>

        {costData && <CostBreakdown data={costData} />}
      </CardContent>
    </Card>
  );
}

