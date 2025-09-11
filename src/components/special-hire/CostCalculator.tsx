import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calculator, MapPin } from 'lucide-react';
import { CostBreakdown } from './CostBreakdown';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function CostCalculator() {
  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropLocation: '',
    busType: '',
    hireType: 'Outside',
    numberOfBuses: 1,
    driverCharge: 1500,
    // Commission handling (separated): total commission to pay and portion passed to customer
    commissionPct: 0,
    commissionPassThroughPct: 0,
    // Discount handling (requires admin approval if > 0)
    discountType: 'percentage' as 'percentage' | 'amount',
    discountPct: 0,
    discountAmount: 0,
    // General adjustment for other purposes (positive=surcharge, negative=discount)
    percentageAdjustment: 0,
    expectedWorkHours: 8,
    overnightDays: 0,
    agreedDistance: 0
  });
  
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

  const calculateCosts = async () => {
    if (!fuelSettings) {
      toast({ title: "Error", description: "Fuel settings not loaded", variant: "destructive" });
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

      // Call edge function to calculate distances using Mapbox API
      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: {
          pickupLocation: formData.pickupLocation,
          dropLocation: formData.dropLocation,
          intermediateStops,
          parkingLat: fuelSettings.parking_lat,
          parkingLng: fuelSettings.parking_lng
        }
      });

      console.log('Distance calculation result:', distanceData, error);

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
          const estimatedActualHours = formData.expectedWorkHours;
          // Use only quoted distance (tripDistance) for available hours calculation
          const availableHours = tripDistance / 10; // baseline speed 10 kmph
          const extraHours = Math.max(0, estimatedActualHours - availableHours);
          
          if (extraHours > 0) {
            if (extraHours <= 10) {
              overtimeCharge = extraHours * (rateCard.overtime_rate_lkr_per_hour || 500);
            } else {
              // First night block
              overnightCharge += (rateCard.overnight_charge_lkr_per_day || 3000);
              let remaining = extraHours - 24;
              
              // Additional blocks
              while (remaining > 0) {
                if (remaining > 10) {
                  overnightCharge += (rateCard.overnight_charge_lkr_per_day || 3000);
                  remaining -= 24;
                } else {
                  overtimeCharge += remaining * (rateCard.overtime_rate_lkr_per_hour || 500);
                  remaining = 0;
                }
              }
            }
            totalExtraTimeCharge = overtimeCharge + overnightCharge;
          }
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
          fuelPrice: fuelSettings.diesel_price_lkr_per_l
        };

        console.log('Final cost calculation result (Outside):', result);
        setCostData(result);
        toast({ 
          title: "Cost Calculated (Outside)", 
          description: `Trip: ${tripDistance}km | Total: LKR ${Math.round(finalCustomerTotal).toLocaleString()} | Commission: ${formData.commissionPct}% | Discount: ${formData.discountPct}% | Maintenance: LKR ${Math.round(maintenanceCost).toLocaleString()}`
        });

        return;
      }

      // All hire types now use unified 100km flat fee + exceeding rate logic
      if (allRateCards && allRateCards.length > 0) {
        rateCard = allRateCards.find(c => c.flat_fee_lkr != null && c.exceeding_km_rate_lkr != null) || allRateCards[0];
      }
      if (!rateCard) {
        throw new Error(`No rate card found for ${formData.hireType} hire type. Please configure flat fee and exceeding km rate.`);
      }
      setSelectedRateCard(rateCard);

      const fixedRate = rateCard.flat_fee_lkr || 0;
      const baseCoverageKm = rateCard.exceeding_km_threshold || 100;
      const exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
      const exceedingDistanceCharge = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);

      // Calculate overtime charges
      const overtimeHours = Math.max(0, formData.expectedWorkHours - (rateCard.standard_hours || 8));
      const overtimeCharge = overtimeHours * (rateCard.overtime_rate_lkr_per_hour || 0);
      const overnightCharge = formData.overnightDays * (rateCard.overnight_charge_lkr_per_day || 0);

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
          overtimeHours,
          agreedDistance: baseCoverageKm,
          actualDistance: tripDistance,
          exceedingKm,
          freeExceedingKm: 0,
          chargeableExceedingKm: exceedingKm,
          rateCardRange: `0-999999km`,
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
        fuelPrice: fuelSettings.diesel_price_lkr_per_l
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Location</Label>
              <div className="relative">
                <Input
                  placeholder="Enter pickup location"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({...formData, pickupLocation: e.target.value})}
                />
                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Drop Location</Label>
              <div className="relative">
                <Input
                  placeholder="Enter drop location"
                  value={formData.dropLocation}
                  onChange={(e) => setFormData({...formData, dropLocation: e.target.value})}
                />
                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bus Type</Label>
              <Select onValueChange={(value) => setFormData({...formData, busType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus type" />
                </SelectTrigger>
                <SelectContent>
                  {busTypes.map((busType) => (
                    <SelectItem key={busType.id} value={busType.id}>
                      {busType.name} ({busType.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hire Type</Label>
              <Select onValueChange={(value) => setFormData({...formData, hireType: value})} defaultValue={formData.hireType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Outside">Outside</SelectItem>
                  <SelectItem value="Lyceum">Lyceum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Buses</Label>
              <Input
                type="number"
                min="1"
                value={formData.numberOfBuses}
                onChange={(e) => setFormData({...formData, numberOfBuses: parseInt(e.target.value) || 1})}
              />
            </div>

            <div className="space-y-2">
              <Label>Driver Charge (LKR)</Label>
              <Input
                type="number"
                value={formData.driverCharge}
                onChange={(e) => setFormData({...formData, driverCharge: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Commission (%) - Optional</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.commissionPct}
                onChange={(e) => setFormData({...formData, commissionPct: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">
                Leave at 0 if no commission applies. Enter percentage if commission is required.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pass to customer (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.commissionPassThroughPct}
                onChange={(e) => setFormData({...formData, commissionPassThroughPct: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">
                Must be less than or equal to Commission to pay (%). This portion is added to the customer total.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Expected Work Hours</Label>
              <Input
                type="number"
                min="1"
                step="0.5"
                value={formData.expectedWorkHours}
                onChange={(e) => setFormData({...formData, expectedWorkHours: parseFloat(e.target.value) || 8})}
              />
            </div>

            <div className="space-y-2">
              <Label>Overnight Days (Outside only)</Label>
              <Input
                type="number"
                min="0"
                value={formData.overnightDays}
                onChange={(e) => setFormData({...formData, overnightDays: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.discountPct}
                onChange={(e) => setFormData({...formData, discountPct: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground text-amber-600">
                ⚠️ Discounts require admin approval and may prevent quotation creation
              </p>
            </div>

            <div className="space-y-2">
              <Label>Agreed Distance (km)</Label>
              <Input
                type="number"
                min="0"
                placeholder="Leave empty to use trip distance"
                value={formData.agreedDistance || ''}
                onChange={(e) => setFormData({...formData, agreedDistance: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          {/* Intermediate Stops */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Intermediate Stops</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIntermediateStops([...intermediateStops, { id: Date.now().toString(), location: '' }])}
              >
                Add Stop
              </Button>
            </div>
            {intermediateStops.map((stop, index) => (
              <div key={stop.id} className="flex gap-2 items-center">
                <Input
                  placeholder={`Stop ${index + 1} location`}
                  value={stop.location}
                  onChange={(e) => {
                    const updated = [...intermediateStops];
                    updated[index].location = e.target.value;
                    setIntermediateStops(updated);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIntermediateStops(intermediateStops.filter(s => s.id !== stop.id))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Rate Card Information */}
          {selectedRateCard && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Selected Rate Card</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Range: {selectedRateCard.from_km}-{selectedRateCard.to_km}km</div>
                <div>Base Rate: LKR {selectedRateCard.flat_fee_lkr?.toLocaleString()}</div>
                <div>Standard Hours: {selectedRateCard.standard_hours}hrs</div>
                <div>Overtime Rate: LKR {selectedRateCard.overtime_rate_lkr_per_hour}/hr</div>
              </div>
            </div>
          )}

          <Button 
            onClick={calculateCosts} 
            disabled={calculating || !formData.pickupLocation || !formData.dropLocation || !formData.busType}
            className="w-full"
          >
            {calculating ? 'Calculating...' : 'Calculate Costs'}
          </Button>
        </CardContent>
      </Card>

      {costData && <CostBreakdown data={costData} />}
    </div>
  );
}
