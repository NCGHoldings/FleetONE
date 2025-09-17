import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Plus, X, Trash2, Eye, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CostBreakdown } from './CostBreakdown';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';

const formSchema = z.object({
  // Customer Details
  companyName: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  specialRequest: z.string().optional(),
  
  // Trip Details
  busTypeId: z.string().min(1, 'Bus type is required'),
  hireType: z.enum(['Outside', 'Lyceum', 'Internal']),
  numberOfBuses: z.number().min(1, 'At least 1 bus is required'),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  dropLocation: z.string().min(1, 'Drop location is required'),
  
  numberOfPassengers: z.number().min(1, 'Number of passengers is required'),
  pickupDateTime: z.date(),
  dropDateTime: z.date(),
  parkingLocationId: z.string().min(1, 'Parking location is required'),
  
  // Commission Settings (company expenses)
  commissionPct: z.number().min(0, 'Commission percentage must be positive').max(100, 'Commission cannot exceed 100%'),
  commissionPassThroughPct: z.number().min(0, 'Pass-through percentage must be positive').max(100, 'Pass-through cannot exceed 100%'),
  
  // Discount Settings (requires admin approval if > 0)
  discountType: z.enum(['percentage', 'amount']).default('percentage'),
  discountPct: z.number().min(0, 'Discount percentage must be positive').max(100, 'Discount cannot exceed 100%').default(0),
  discountAmount: z.number().min(0, 'Discount amount must be positive').default(0),
}).refine((data) => data.commissionPassThroughPct <= data.commissionPct, {
  message: "Commission pass-through cannot exceed commission percentage",
  path: ["commissionPassThroughPct"],
});

// Additional charge types
const additionalChargeTypes = [
  { value: 'permits', label: 'Permits Cost' },
  { value: 'highway', label: 'Highway Charges' },
  { value: 'additional_fuel', label: 'Additional Fuel Costs' },
  { value: 'driver_charges', label: 'Driver Charges' },
  { value: 'additional_distance', label: 'Additional Distance/KM' },
  { value: 'other', label: 'Other' }
];

interface AdditionalCharge {
  id: string;
  type: string;
  amount: number;
  distance?: number; // For additional_distance type
  reason?: string;
  applyPerBus: boolean;
  busesCount: number;
}

interface OtherExpense {
  id: string;
  label: string;
  amount: number;
}

type FormData = z.infer<typeof formSchema>;

interface BusType {
  id: string;
  name: string;
  capacity: number;
  avg_km_per_l: number;
  features: string;
}

interface ParkingLocation {
  id: string;
  parking_location_name: string;
  parking_lat: number;
  parking_lng: number;
  is_default: boolean;
}

interface IntermediateStop {
  id: string;
  location: string;
  lat?: number;
  lng?: number;
}

interface Props {
  onSubmit: () => void;
  onCancel: () => void;
  initialData?: any;
  isEditing?: boolean;
  submissionData?: any;
}

export function SpecialHireForm({ onSubmit, onCancel, initialData, isEditing = false, submissionData }: Props) {
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [intermediateStops, setIntermediateStops] = useState<IntermediateStop[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useMultiParking, setUseMultiParking] = useState(false);
  const [busDetails, setBusDetails] = useState<Array<{
    busNumber: number;
    parkingLocationId: string;
    parkingLocationName: string;
    parkingLat: number;
    parkingLng: number;
  }>>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      companyName: initialData.company_name || '',
      customerName: initialData.customer_name || '',
      customerPhone: initialData.customer_phone || '',
      customerEmail: initialData.customer_email || '',
      specialRequest: initialData.special_request || '',
      busTypeId: initialData.bus_type_id || '',
      hireType: initialData.hire_type || 'Outside',
      numberOfBuses: initialData.number_of_buses || 1,
      pickupLocation: initialData.pickup_location || '',
      dropLocation: initialData.drop_location || '',
      
      numberOfPassengers: initialData.number_of_passengers || 1,
      pickupDateTime: initialData.pickup_date_time ? new Date(initialData.pickup_date_time) : new Date(),
      dropDateTime: initialData.drop_date_time ? new Date(initialData.drop_date_time) : new Date(),
      parkingLocationId: initialData.parking_location_id || '',
      commissionPct: initialData.commission_pct || 0,
      commissionPassThroughPct: initialData.commission_pass_through_pct || 0,
      discountType: (initialData.discount_percentage && initialData.discount_percentage > 0) ? 'percentage' : 'amount',
      discountPct: initialData.discount_percentage || 0,
      discountAmount: initialData.discount_amount || 0,
    } : {
      companyName: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      specialRequest: '',
      busTypeId: '',
      hireType: 'Outside',
      numberOfBuses: 1,
      pickupLocation: '',
      dropLocation: '',
      numberOfPassengers: 1,
      pickupDateTime: new Date(),
      dropDateTime: new Date(),
      parkingLocationId: '',
      commissionPct: 0,
      commissionPassThroughPct: 0,
      discountType: 'percentage',
      discountPct: 0,
      discountAmount: 0,
    }
  });

  const watchedNumberOfBuses = form.watch('numberOfBuses');

  useEffect(() => {
    loadBusTypes();
    loadParkingLocations();
    
    // Auto-fill form from submission data
    if (submissionData) {
      form.setValue('companyName', submissionData.company_name || '');
      form.setValue('customerName', submissionData.customer_name);
      form.setValue('customerPhone', submissionData.customer_phone);
      form.setValue('customerEmail', submissionData.customer_email || '');
      form.setValue('specialRequest', submissionData.special_request || '');
      form.setValue('hireType', submissionData.hire_type as 'Outside' | 'Lyceum' | 'Internal');
      form.setValue('numberOfBuses', submissionData.number_of_buses);
      form.setValue('pickupLocation', submissionData.pickup_location);
      form.setValue('dropLocation', submissionData.drop_location);
      form.setValue('numberOfPassengers', submissionData.number_of_passengers);
      form.setValue('pickupDateTime', new Date(submissionData.pickup_datetime));
      form.setValue('dropDateTime', new Date(submissionData.drop_datetime));
      
      // Parse intermediate places from special_request field
      if (submissionData.special_request) {
        const intermediateMatch = submissionData.special_request.match(/Intermediate places:\s*(.+?)(?:\n|$)/);
        if (intermediateMatch && intermediateMatch[1]) {
          const places = intermediateMatch[1]
            .split(',')
            .map((place, index) => ({
              id: `temp-${index}`,
              location: place.trim()
            }))
            .filter(stop => stop.location);
          setIntermediateStops(places);
        }
      }
    }
    
    // If editing, set intermediate stops and additional charges from initial data
    if (isEditing && initialData) {
      // Load intermediate stops
      if (initialData.intermediate_stops) {
        try {
          const stops = Array.isArray(initialData.intermediate_stops) 
            ? initialData.intermediate_stops 
            : JSON.parse(initialData.intermediate_stops);
          setIntermediateStops(stops || []);
        } catch (e) {
          console.warn('Failed to parse intermediate stops:', e);
          setIntermediateStops([]);
        }
      }

      // Load additional charges
      if (initialData.additional_charges) {
        try {
          const charges = Array.isArray(initialData.additional_charges) 
            ? initialData.additional_charges 
            : JSON.parse(initialData.additional_charges);
          
          // Convert to internal format with IDs
          const formattedCharges = charges.map((charge: any, index: number) => ({
            id: `existing-${index}`,
            type: charge.type || 'other',
            amount: Number(charge.amount) || 0,
            reason: charge.reason || ''
          }));
          
          setAdditionalCharges(formattedCharges);
        } catch (e) {
          console.warn('Failed to parse additional charges:', e);
          setAdditionalCharges([]);
        }
      }
    }
  }, [isEditing, initialData]);

  // Auto-clamp commission pass-through to not exceed commission percentage
  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      if (name === 'commissionPct' || name === 'commissionPassThroughPct') {
        const commissionPct = values.commissionPct || 0;
        const passThroughPct = values.commissionPassThroughPct || 0;
        
        if (passThroughPct > commissionPct) {
          form.setValue('commissionPassThroughPct', commissionPct, { shouldValidate: true });
          toast({
            title: "Commission Pass-through Adjusted",
            description: `Pass-through percentage cannot exceed commission percentage (${commissionPct}%)`,
            variant: "default"
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, toast]);

  // Manage bus details when number of buses changes
  useEffect(() => {
    if (useMultiParking && watchedNumberOfBuses) {
      const currentBusCount = busDetails.length;
      if (currentBusCount < watchedNumberOfBuses) {
        // Add new bus details
        const newBuses = [];
        for (let i = currentBusCount; i < watchedNumberOfBuses; i++) {
          const defaultLocation = parkingLocations.find(loc => loc.is_default) || parkingLocations[0];
          if (defaultLocation) {
            newBuses.push({
              busNumber: i + 1,
              parkingLocationId: defaultLocation.id,
              parkingLocationName: defaultLocation.parking_location_name,
              parkingLat: defaultLocation.parking_lat,
              parkingLng: defaultLocation.parking_lng,
            });
          }
        }
        setBusDetails([...busDetails, ...newBuses]);
      } else if (currentBusCount > watchedNumberOfBuses) {
        // Remove excess bus details
        setBusDetails(busDetails.slice(0, watchedNumberOfBuses));
      }
    }
  }, [watchedNumberOfBuses, useMultiParking, busDetails.length, parkingLocations]);

  const handleMultiParkingToggle = (enabled: boolean) => {
    setUseMultiParking(enabled);
    if (enabled) {
      // Initialize bus details for current number of buses
      const buses = [];
      const defaultLocation = parkingLocations.find(loc => loc.is_default) || parkingLocations[0];
      
      for (let i = 0; i < watchedNumberOfBuses; i++) {
        if (defaultLocation) {
          buses.push({
            busNumber: i + 1,
            parkingLocationId: defaultLocation.id,
            parkingLocationName: defaultLocation.parking_location_name,
            parkingLat: defaultLocation.parking_lat,
            parkingLng: defaultLocation.parking_lng,
          });
        }
      }
      setBusDetails(buses);
    } else {
      setBusDetails([]);
      // Reset to single parking mode - user can select parking location manually
    }
  };

  const updateBusParking = (busNumber: number, parkingLocationId: string) => {
    const location = parkingLocations.find(loc => loc.id === parkingLocationId);
    if (location) {
      setBusDetails(prev => prev.map(bus => 
        bus.busNumber === busNumber 
          ? {
              ...bus,
              parkingLocationId: location.id,
              parkingLocationName: location.parking_location_name,
              parkingLat: location.parking_lat,
              parkingLng: location.parking_lng,
            }
          : bus
      ));
    }
  };

  const loadBusTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBusTypes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bus types",
        variant: "destructive"
      });
    }
  };

  const loadParkingLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_settings')
        .select('*')
        .order('parking_location_name');

      if (error) throw error;
      setParkingLocations(data || []);
      
      // Set default parking location if not editing
      if (!isEditing && data && data.length > 0) {
        const defaultLocation = data.find(loc => loc.is_default) || data[0];
        if (defaultLocation) {
          form.setValue('parkingLocationId', defaultLocation.id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load parking locations",
        variant: "destructive"
      });
    }
  };

  const addIntermediateStop = () => {
    const newStop: IntermediateStop = {
      id: Date.now().toString(),
      location: ''
    };
    setIntermediateStops([...intermediateStops, newStop]);
  };

  const removeIntermediateStop = (id: string) => {
    setIntermediateStops(intermediateStops.filter(stop => stop.id !== id));
  };

  const updateIntermediateStop = (id: string, location: string) => {
    setIntermediateStops(intermediateStops.map(stop => 
      stop.id === id ? { ...stop, location } : stop
    ));
  };

  const addAdditionalCharge = () => {
    const newCharge: AdditionalCharge = {
      id: Date.now().toString(),
      type: 'permits',   
      amount: 0,
      reason: '',
      applyPerBus: false,
      busesCount: 1
    };
    setAdditionalCharges(charges => [...charges, newCharge]);
  };

  const updateAdditionalCharge = async (id: string, field: keyof AdditionalCharge, value: any) => {
    setAdditionalCharges(charges => 
      charges.map(charge => {
        if (charge.id === id) {
          const updatedCharge = { ...charge, [field]: value };
          
          // Auto-calculate amount for additional_distance type
          if (updatedCharge.type === 'additional_distance' && field === 'distance' && value > 0) {
            // Get the exceeding KM rate from hire rate cards
            const calculateDistanceAmount = async () => {
              const watchedBusTypeId = form.watch('busTypeId');
              const watchedHireType = form.watch('hireType');
              
              if (watchedBusTypeId && watchedHireType) {
                // Use Lyceum rates for both Lyceum and Internal hire types
                const rateCardHireType = watchedHireType === 'Internal' ? 'Lyceum' : watchedHireType;
                const { data: rateCards } = await supabase
                  .from('hire_rate_cards')
                  .select('exceeding_km_rate_lkr')
                  .eq('hire_type', rateCardHireType)
                  .eq('bus_type_id', watchedBusTypeId)
                  .eq('is_active', true)
                  .limit(1)
                  .single();
                
                if (rateCards && rateCards.exceeding_km_rate_lkr) {
                  const calculatedAmount = value * rateCards.exceeding_km_rate_lkr;
                  setAdditionalCharges(prevCharges => 
                    prevCharges.map(prevCharge => 
                      prevCharge.id === id 
                        ? { ...prevCharge, amount: calculatedAmount }
                        : prevCharge
                    )
                  );
                }
              }
            };
            calculateDistanceAmount();
          }
          
          // Reset amount when changing away from additional_distance type
          if (field === 'type' && charge.type === 'additional_distance' && value !== 'additional_distance') {
            updatedCharge.amount = 0;
            updatedCharge.distance = 0;
          }
          
          return updatedCharge;
        }
        return charge;
      })
    );
  };

  const removeAdditionalCharge = (id: string) => {
    setAdditionalCharges(charges => charges.filter(charge => charge.id !== id));
  };

  const addOtherExpense = () => {
    const newExpense: OtherExpense = {
      id: Date.now().toString(),
      label: '',
      amount: 0
    };
    setOtherExpenses(expenses => [...expenses, newExpense]);
  };

  const updateOtherExpense = (id: string, field: keyof OtherExpense, value: any) => {
    setOtherExpenses(expenses => 
      expenses.map(expense => 
        expense.id === id 
          ? { ...expense, [field]: value }
          : expense
      )
    );
  };

  const removeOtherExpense = (id: string) => {
    setOtherExpenses(expenses => expenses.filter(expense => expense.id !== id));
  };

  const calculateCosts = async (data: FormData) => {
    try {
      // Get selected parking location
      const { data: fuelSettings } = await supabase
        .from('fuel_settings')
        .select('*')
        .eq('id', data.parkingLocationId)
        .single();

      if (!fuelSettings) {
        throw new Error('Selected parking location not found');
      }

      console.log('Calculating distance with real Mapbox API:', {
        pickup: data.pickupLocation,
        drop: data.dropLocation,
        parking: { lat: fuelSettings.parking_lat, lng: fuelSettings.parking_lng }
      });

      // Filter out empty intermediate stops
      const validIntermediateStops = intermediateStops.filter(stop => stop.location && stop.location.trim());

      // Prepare distance calculation parameters
      let distanceCalculationBody: any = {
        pickupLocation: data.pickupLocation,
        dropLocation: data.dropLocation,
        intermediateStops: validIntermediateStops,
        numberOfBuses: data.numberOfBuses,
      };

      if (useMultiParking && busDetails.length > 0) {
        // Multi-parking mode: send bus details with individual parking locations
        distanceCalculationBody.busDetails = busDetails.map(bus => ({
          busNumber: bus.busNumber,
          parkingLocationName: bus.parkingLocationName,
          parkingLat: bus.parkingLat,
          parkingLng: bus.parkingLng,
        }));
      } else {
        // Single parking mode: use selected parking location for all buses
        distanceCalculationBody.parkingLat = fuelSettings.parking_lat;
        distanceCalculationBody.parkingLng = fuelSettings.parking_lng;
      }

      // Call edge function to calculate real distances
      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: distanceCalculationBody
      });

      if (error) {
        console.error('Distance calculation error:', error);
        throw new Error(`Distance calculation failed: ${error.message || 'Unknown error'}`);
      }

      if (!distanceData) {
        throw new Error('No distance data received from calculation service');
      }

      console.log('Distance calculation result:', distanceData);

      // Get bus type details
      const { data: busTypeData } = await supabase
        .from('bus_types')
        .select('*')
        .eq('id', data.busTypeId)
        .single();

      if (!busTypeData) {
        throw new Error('Bus type not found');
      }

      // Get rate cards for the hire type and bus type
      // Use Lyceum rates for both Lyceum and Internal hire types
      const rateCardHireType = data.hireType === 'Internal' ? 'Lyceum' : data.hireType;
      const { data: allRateCards } = await supabase
        .from('hire_rate_cards')
        .select('*')
        .eq('hire_type', rateCardHireType)
        .eq('bus_type_id', data.busTypeId)
        .eq('is_active', true)
        .order('from_km');

      if (!allRateCards || allRateCards.length === 0) {
        throw new Error(`No rate cards found for ${data.hireType} hire type. Please configure rate cards first.`);
      }

      const tripDistance = distanceData.kmTrip || 0;
      let rateCard = null;
      let fixedRate = 0;
      let exceedingDistanceCharge = 0;
      let baseCoverageKm = 100;
      let exceedingKm = 0;

      // Handle different hire types with proper rate card logic
      if (data.hireType !== 'Outside') {
        // For Other hire types (Lyceum, etc.) - use range-based rates
        rateCard = allRateCards.find(card => 
          tripDistance >= (card.from_km || 0) && 
          (card.to_km === null || tripDistance <= card.to_km)
        );

        if (!rateCard) {
          // Fallback to first available rate card
          rateCard = allRateCards[0];
        }

        if (!rateCard) {
          throw new Error(`No suitable rate card found for ${data.hireType} hire type and ${tripDistance}km distance.`);
        }

        // Use flat fee from the range-based rate card
        fixedRate = rateCard.flat_fee_lkr || 0;

        // Handle exceeding km for distances beyond 100km
        if (tripDistance > 100) {
          const exceedingRateCard = allRateCards.find(card => 
            card.from_km >= 101 && card.exceeding_km_rate_lkr != null
          );
          if (exceedingRateCard) {
            baseCoverageKm = exceedingRateCard.exceeding_km_threshold || 100;
            exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
            exceedingDistanceCharge = exceedingKm * (exceedingRateCard.exceeding_km_rate_lkr || 0);
          }
        }
      } else {
        // Outside hire logic - unified flat fee + exceeding rate
        rateCard = allRateCards.find(c => c.flat_fee_lkr != null && c.exceeding_km_rate_lkr != null) || allRateCards[0];
        if (!rateCard) {
          throw new Error(`No rate card found for ${data.hireType} hire type. Please configure flat fee and exceeding km rate.`);
        }

        fixedRate = rateCard.flat_fee_lkr || 0;
        baseCoverageKm = rateCard.exceeding_km_threshold || 100;
        exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
        exceedingDistanceCharge = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);
      }
      
      // Calculate total additional distance from additional_distance charges
      const totalAdditionalDistance = additionalCharges
        .filter(charge => charge.type === 'additional_distance')
        .reduce((sum, charge) => sum + (charge.distance || 0), 0);

      // Use trip distance + additional distance for extra time calculations
      const totalTripDistanceForCalculation = tripDistance + totalAdditionalDistance;

      // Calculate extra time charges for Outside hire type
      let overtimeCharge = 0;
      let overnightCharge = 0;
      let totalExtraTimeCharge = 0;
      
      if (data.hireType === 'Outside') {
        // Use only quoted distance (tripDistance) for available hours calculation
        const extraTimeResult = calculateExtraTimeCharge(
          totalTripDistanceForCalculation, // Include additional distance
          data.pickupDateTime,
          data.dropDateTime,
          {
            baselineSpeedKmph: 10,
            hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
            nightBlockFee: rateCard.overnight_charge_lkr_per_day || 3000
          }
        );
        
        overtimeCharge = extraTimeResult.overtimeCharge;
        overnightCharge = extraTimeResult.overnightCharge;
        totalExtraTimeCharge = extraTimeResult.totalExtraCharge;
      }
      
      const hireCharge = fixedRate + exceedingDistanceCharge + totalExtraTimeCharge;

      // Fuel cost calculation - different for single vs multi-parking
      let totalFuelCost = 0;
      let fuelLiters = 0;

      if (useMultiParking && distanceData.isMultiParking && distanceData.busCalculations) {
        // Multi-parking: calculate fuel cost per bus based on individual distances
        for (const busCalc of distanceData.busCalculations) {
          const busEmptyRunKm = busCalc.kmParkingToPickup + busCalc.kmDropToParking;
          const busFuelLiters = busEmptyRunKm / (busTypeData.avg_km_per_l || 8);
          const busFuelCost = busFuelLiters * fuelSettings.diesel_price_lkr_per_l;
          totalFuelCost += busFuelCost;
          fuelLiters += busFuelLiters;
        }
      } else {
        // Single parking: calculate fuel cost for all buses using same empty run distance
        const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
        fuelLiters = (emptyRunKm / (busTypeData.avg_km_per_l || 8)) * data.numberOfBuses;
        totalFuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;
      }

      const grossRevenue = hireCharge * data.numberOfBuses;
      // Commission and discount calculations
      const baseCustomerTotal = grossRevenue + totalFuelCost;
      
      // Commission pass-through (added to customer bill)
      // Ensure pass-through percentage never exceeds commission percentage
      const safePassThroughPct = Math.min(data.commissionPassThroughPct, data.commissionPct);
      const commissionPassThroughAmount = baseCustomerTotal * (safePassThroughPct / 100);
      
      // Discount (subtracted from customer bill)
      const discountAmount = data.discountType === 'percentage' 
        ? baseCustomerTotal * (data.discountPct / 100)
        : data.discountAmount;
      
      // Final customer total with additional charges (handle distance-based charges)
      const totalAdditionalCharges = additionalCharges.reduce((sum, charge) => {
        let chargeAmount = charge.type === 'additional_distance' ? (charge.amount || 0) : charge.amount;
        return sum + (charge.applyPerBus ? chargeAmount * charge.busesCount : chargeAmount);
      }, 0);
      const finalCustomerTotal = baseCustomerTotal + commissionPassThroughAmount - discountAmount + totalAdditionalCharges;
      
      // Company expenses
      const commissionExpense = baseCustomerTotal * (data.commissionPct / 100); // Total commission company pays
      const driverCharge = 1500; // Default driver charge
      const totalExpenses = (driverCharge * data.numberOfBuses) + commissionExpense + totalFuelCost;
      const netProfit = finalCustomerTotal - totalExpenses;

      const costs = {
        km_parking_to_pickup: Math.round((distanceData.kmParkingToPickup || 0) * 10) / 10,
        km_trip: Math.round((distanceData.kmTrip || 0) * 10) / 10,
        km_drop_to_parking: Math.round((distanceData.kmDropToParking || 0) * 10) / 10,
        fuel_cost_fuel_only: Math.round(totalFuelCost),
        hire_charge: Math.round(hireCharge),
        extra_charges: Math.round(totalExtraTimeCharge),
        gross_revenue: Math.round(grossRevenue), // Base hire charges
        commission_pct: data.commissionPct,
        commission_pass_through_pct: data.commissionPassThroughPct,
        commission_pass_through_amount: Math.round(commissionPassThroughAmount),
        discount_percentage: data.discountPct,
        discount_amount: Math.round(discountAmount),
        driver_charge: driverCharge,
        other_expenses: otherExpenses.map(expense => ({
          label: expense.label,
          amount: expense.amount
        })),
        commission_amount: Math.round(commissionExpense),
        additional_charges: additionalCharges.map(charge => ({
          type: charge.type,
          amount: charge.type === 'additional_distance' ? (charge.amount || 0) : charge.amount,
          distance: charge.type === 'additional_distance' ? charge.distance : undefined,
          reason: charge.reason || additionalChargeTypes.find(t => t.value === charge.type)?.label,
          applyPerBus: charge.applyPerBus,
          busesCount: charge.busesCount
        })),
        total_additional_charges: Math.round(totalAdditionalCharges),
        total_expenses: Math.round(totalExpenses),
        net_profit: Math.round(netProfit)
      };

      // Also set display data for UI
      setCostData({
        kmParkingToPickup: costs.km_parking_to_pickup,
        kmTrip: costs.km_trip,
        kmDropToParking: costs.km_drop_to_parking,
        fuelCostFuelOnly: costs.fuel_cost_fuel_only,
        hireCharge: Math.round(hireCharge),
        fixedRate: Math.round(fixedRate),
        exceedingDistanceCharge: Math.round(exceedingDistanceCharge),
        overtimeCharge: Math.round(overtimeCharge),
        overnightCharge: Math.round(overnightCharge),
        pickupDateTime: data.pickupDateTime.toISOString(),
        dropDateTime: data.dropDateTime.toISOString(),
        rateCardDetails: {
          standardHours: rateCard.standard_hours || 8,
          actualHours: data.hireType === 'Outside' ? Math.round(((new Date(data.dropDateTime).getTime() - new Date(data.pickupDateTime).getTime()) / (1000 * 60 * 60)) * 100) / 100 : 8,
          availableHours: Math.round((tripDistance / 10) * 100) / 100, // Available hours based on quoted distance only
          overtimeHours: data.hireType === 'Outside' ? Math.round((Math.max(0, (new Date(data.dropDateTime).getTime() - new Date(data.pickupDateTime).getTime()) / (1000 * 60 * 60) - (tripDistance / 10))) * 100) / 100 : 0,
          agreedDistance: baseCoverageKm,
          actualDistance: tripDistance,
          exceedingKm,
          freeExceedingKm: 0,
          chargeableExceedingKm: exceedingKm
        },
        grossRevenue: Math.round(hireCharge * data.numberOfBuses),
        customerTotalWithFuel: Math.round(finalCustomerTotal),
        commissionPassThroughPct: data.commissionPassThroughPct,
        commissionPassThroughAmount: Math.round(commissionPassThroughAmount),
        discountType: data.discountType,
        discountPct: data.discountType === 'percentage' ? data.discountPct : 0,
        discountAmount: Math.round(discountAmount),
        additionalCharges: costs.additional_charges,
        totalAdditionalCharges: costs.total_additional_charges,
        driverCharge: costs.driver_charge,
        otherExpenses: costs.other_expenses,
        commissionPct: costs.commission_pct,
        commissionAmount: costs.commission_amount,
        totalExpenses: costs.total_expenses,
        netProfit: costs.net_profit,
        numberOfBuses: data.numberOfBuses,
        totalDistance: (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0),
        fuelLiters: Math.round(fuelLiters * 10) / 10,
        busTypeName: busTypeData.name,
        busTypeEfficiency: busTypeData.avg_km_per_l || 8,
        fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
        maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20,
        fuelPrice: fuelSettings.diesel_price_lkr_per_l,
        pickupAddress: distanceData.pickupAddress,
        dropAddress: distanceData.dropAddress,
        // Multi-parking metadata for correct fuel calculation display
        busCalculations: distanceData.busCalculations,
        isMultiParking: !!distanceData.isMultiParking,
      });

      const discountText = data.discountType === 'percentage' && data.discountPct > 0 
        ? `(${data.discountPct}% discount)` 
        : data.discountType === 'amount' && data.discountAmount > 0 
        ? `(LKR ${data.discountAmount} discount)` 
        : '';
      
      toast({
        title: "Cost Calculated",
        description: `Trip: ${tripDistance}km | Total: LKR ${Math.round(finalCustomerTotal).toLocaleString()} ${discountText}`
      });

      return { costs, distanceData };
    } catch (error: any) {
      console.error('Error calculating costs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to calculate distance",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleSubmit = async (data: FormData) => {
    setLoading(true);
    try {
        // Get current user data for created_by field
        const { data: userData } = await supabase.auth.getUser();
        
        // Check if discount requires admin approval
        if ((data.discountType === 'percentage' && data.discountPct > 0) || 
            (data.discountType === 'amount' && data.discountAmount > 0)) {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user?.id);
        
        const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');
        
        if (!isAdmin) {
          toast({
            title: "Admin Approval Required",
            description: "Quotations with discounts require admin approval. This quotation will be marked as pending approval.",
            variant: "default"
          });
        }
      }

      // Calculate costs first
      const { costs, distanceData } = await calculateCosts(data);

      // Filter out empty intermediate stops before creating quotation
      const validIntermediateStops = intermediateStops.filter(stop => stop.location && stop.location.trim());

      // Create audit log entry for editing
      let auditEntry = null;
      if (isEditing && initialData) {
        const currentUser = await supabase.auth.getUser();
        auditEntry = {
          action: 'UPDATE',
          timestamp: new Date().toISOString(),
          user_id: currentUser.data.user?.id,
          user_email: currentUser.data.user?.email,
          changes: {
            // Track what fields were changed
            customer_name: data.customerName !== initialData.customer_name ? { from: initialData.customer_name, to: data.customerName } : undefined,
            pickup_location: data.pickupLocation !== initialData.pickup_location ? { from: initialData.pickup_location, to: data.pickupLocation } : undefined,
            drop_location: data.dropLocation !== initialData.drop_location ? { from: initialData.drop_location, to: data.dropLocation } : undefined,
            
            commission_pct: data.commissionPct !== (initialData.commission_pct || 5) ? { from: initialData.commission_pct || 5, to: data.commissionPct } : undefined,
            discount_type: data.discountType !== (initialData.discount_type || 'percentage') ? { from: initialData.discount_type || 'percentage', to: data.discountType } : undefined,
            discount_percentage: data.discountPct !== (initialData.discount_percentage || 0) ? { from: initialData.discount_percentage || 0, to: data.discountPct } : undefined,
            discount_amount_lkr: data.discountAmount !== (initialData.discount_amount_lkr || 0) ? { from: initialData.discount_amount_lkr || 0, to: data.discountAmount } : undefined,
          }
        };
      }

      // Create quotation data
      const quotationData = {
        company_name: data.companyName || null,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail || null,
        special_request: data.specialRequest || null,
        bus_type_id: data.busTypeId,
        hire_type: data.hireType,
        number_of_buses: data.numberOfBuses,
        pickup_location: data.pickupLocation,
        drop_location: data.dropLocation,
        
        intermediate_stops: JSON.stringify(validIntermediateStops),
        number_of_passengers: data.numberOfPassengers,
        pickup_datetime: data.pickupDateTime.toISOString(),
        drop_datetime: data.dropDateTime.toISOString(),
        parking_location_id: data.parkingLocationId,
        uses_multi_parking: useMultiParking,
        pickup_lat: distanceData?.pickupCoords?.[1] || null,
        pickup_lng: distanceData?.pickupCoords?.[0] || null,
        drop_lat: distanceData?.dropCoords?.[1] || null,
        drop_lng: distanceData?.dropCoords?.[0] || null,
        km_parking_to_pickup: costs.km_parking_to_pickup,
        km_trip: costs.km_trip,
        km_drop_to_parking: costs.km_drop_to_parking,
        fuel_cost_fuel_only: costs.fuel_cost_fuel_only,
        hire_charge: costs.hire_charge,
        extra_charges: costs.extra_charges,
        gross_revenue: costs.gross_revenue,
        driver_charge: costs.driver_charge,
        other_expenses: costs.other_expenses,
        commission_pct: costs.commission_pct,
        commission_pass_through_pct: Math.min(costs.commission_pass_through_pct, costs.commission_pct),
        commission_pass_through_amount: costs.commission_pass_through_amount,
        commission_amount: costs.commission_amount,
        discount_type: data.discountType,
        discount_percentage: costs.discount_percentage,
        discount_amount_lkr: costs.discount_amount,
        additional_charges: JSON.stringify(costs.additional_charges),
        total_additional_charges: costs.total_additional_charges,
        total_expenses: costs.total_expenses,
        net_profit: costs.net_profit,
        approval_status: ((data.discountType === 'percentage' && data.discountPct > 0) || 
                         (data.discountType === 'amount' && data.discountAmount > 0) ? 'pending' : 'approved') as 'pending' | 'approved' | 'rejected',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        audit_log: isEditing ? [...(initialData?.audit_log || []), auditEntry].filter(Boolean) : [],
        // Set created_by for new quotations
        ...(isEditing ? {} : { created_by: userData.user?.id })
      };

      if (isEditing && initialData) {
        const { error } = await supabase
          .from('special_hire_quotations')
          .update(quotationData)
          .eq('id', initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Quotation updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('special_hire_quotations')
          .insert([quotationData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Quotation created successfully"
        });
      }

      onSubmit();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create quotation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Special Hire Quotation' : 'New Special Hire Quotation'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="specialRequest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Request</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any special requirements..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trip Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="busTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bus Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bus type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {busTypes.map((busType) => (
                              <SelectItem key={busType.id} value={busType.id}>
                                {busType.name} (Capacity: {busType.capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hireType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hire Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Outside">Outside</SelectItem>
                            <SelectItem value="Lyceum">Lyceum</SelectItem>
                            <SelectItem value="Internal">Internal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parkingLocationId"
                    render={({ field }) => (
                      <FormItem className={useMultiParking ? "opacity-50 pointer-events-none" : ""}>
                        <FormLabel>Parking Location * {useMultiParking && "(Disabled - Using multi-parking)"}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={useMultiParking}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parking location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parkingLocations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {location.parking_location_name}
                                  {location.is_default && <Badge variant="secondary">Default</Badge>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Multi-parking toggle */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Different parking locations per bus</Label>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={useMultiParking} 
                        onCheckedChange={handleMultiParkingToggle}
                        disabled={watchedNumberOfBuses === 1}
                      />
                      <Label className="text-sm text-muted-foreground">
                        {watchedNumberOfBuses === 1 ? "Single bus - multi-parking not needed" : "Enable for multiple bus locations"}
                      </Label>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="numberOfBuses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Buses *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField
                     control={form.control}
                     name="pickupLocation"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Pickup Location *</FormLabel>
                         <FormControl>
                           <LocationAutocomplete
                             value={field.value || ""}
                             onChange={field.onChange}
                             placeholder="Enter pickup location"
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="dropLocation"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Drop Location *</FormLabel>
                         <FormControl>
                           <LocationAutocomplete
                             value={field.value || ""}
                             onChange={field.onChange}
                             placeholder="Enter drop location"
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>


                  {/* Intermediate Stops */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Intermediate Stops</label>
                      <Button type="button" variant="outline" size="sm" onClick={addIntermediateStop}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stop
                      </Button>
                    </div>

                    {intermediateStops.map((stop, index) => (
                      <div key={stop.id} className="flex items-center gap-2">
                        <LocationAutocomplete
                          value={stop.location}
                          onChange={(value) => updateIntermediateStop(stop.id, value)}
                          placeholder={`Stop ${index + 1} location`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIntermediateStop(stop.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Additional Distance Summary */}
                    {additionalCharges.some(charge => charge.type === 'additional_distance' && charge.distance > 0) && (
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                        <h4 className="text-sm font-medium text-foreground mb-2">Route Distance Summary</h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Base trip distance:</span>
                            <span>{costData ? `${costData.kmTrip} KM` : 'Calculate to see'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Additional distance:</span>
                            <span>
                              {additionalCharges
                                .filter(charge => charge.type === 'additional_distance')
                                .reduce((sum, charge) => sum + (charge.distance || 0), 0)} KM
                            </span>
                          </div>
                          <div className="flex justify-between font-medium text-foreground border-t pt-1">
                            <span>Total trip distance:</span>
                            <span>
                              {costData 
                                ? `${costData.kmTrip + additionalCharges
                                    .filter(charge => charge.type === 'additional_distance')
                                    .reduce((sum, charge) => sum + (charge.distance || 0), 0)} KM`
                                : 'Calculate to see'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                {/* Multi-parking bus details */}
                {useMultiParking && busDetails.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">Bus Parking Locations</h4>
                      <Badge variant="outline">{busDetails.length} buses</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {busDetails.map((bus) => (
                        <Card key={bus.busNumber} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Bus {bus.busNumber}</span>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Parking Location</Label>
                              <Select 
                                value={bus.parkingLocationId} 
                                onValueChange={(value) => updateBusParking(bus.busNumber, value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {parkingLocations.map((location) => (
                                    <SelectItem key={location.id} value={location.id}>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        {location.parking_location_name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="numberOfPassengers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Passengers *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pickupDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Date & Time *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP HH:mm")
                                ) : (
                                  <span>Pick date & time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <div className="flex">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (date) {
                                    const newDateTime = new Date(date);
                                    if (field.value) {
                                      newDateTime.setHours(field.value.getHours());
                                      newDateTime.setMinutes(field.value.getMinutes());
                                    }
                                    field.onChange(newDateTime);
                                  }
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                              <div className="border-l p-3 space-y-3">
                                <div className="text-sm font-medium">Time</div>
                                <div className="space-y-2">
                                  <Input
                                    type="time"
                                    value={field.value ? format(field.value, "HH:mm") : ""}
                                    onChange={(e) => {
                                      if (e.target.value && field.value) {
                                        const [hours, minutes] = e.target.value.split(':');
                                        const newDateTime = new Date(field.value);
                                        newDateTime.setHours(parseInt(hours));
                                        newDateTime.setMinutes(parseInt(minutes));
                                        field.onChange(newDateTime);
                                      }
                                    }}
                                    className="w-[120px]"
                                  />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dropDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drop Date & Time *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP HH:mm")
                                ) : (
                                  <span>Pick date & time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <div className="flex">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (date) {
                                    const newDateTime = new Date(date);
                                    if (field.value) {
                                      newDateTime.setHours(field.value.getHours());
                                      newDateTime.setMinutes(field.value.getMinutes());
                                    }
                                    field.onChange(newDateTime);
                                  }
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                              <div className="border-l p-3 space-y-3">
                                <div className="text-sm font-medium">Time</div>
                                <div className="space-y-2">
                                  <Input
                                    type="time"
                                    value={field.value ? format(field.value, "HH:mm") : ""}
                                    onChange={(e) => {
                                      if (e.target.value && field.value) {
                                        const [hours, minutes] = e.target.value.split(':');
                                        const newDateTime = new Date(field.value);
                                        newDateTime.setHours(parseInt(hours));
                                        newDateTime.setMinutes(parseInt(minutes));
                                        field.onChange(newDateTime);
                                      } else if (e.target.value) {
                                        // If no date is set, set to today with selected time
                                        const [hours, minutes] = e.target.value.split(':');
                                        const newDateTime = new Date();
                                        newDateTime.setHours(parseInt(hours));
                                        newDateTime.setMinutes(parseInt(minutes));
                                        field.onChange(newDateTime);
                                      }
                                    }}
                                    className="w-[120px]"
                                  />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                {/* Additional Charges */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="text-xl font-bold text-foreground">
                      Additional Charges
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={addAdditionalCharge}
                      className="text-base font-medium px-6 py-3 h-12"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Charge
                    </Button>
                  </div>
                  
                  {additionalCharges.map((charge, index) => (
                     <Card key={charge.id} className="p-8 border-2 border-muted bg-card shadow-lg">
                       <div className="space-y-8">
                         <div className="flex items-center justify-between mb-6">
                           <h4 className="text-2xl font-bold text-foreground">Additional Charge #{index + 1}</h4>
                           <Button
                             type="button"
                             variant="outline"
                             size="lg"
                             onClick={() => removeAdditionalCharge(charge.id)}
                             className="text-destructive hover:text-destructive hover:bg-destructive/10 px-6 py-3 h-12"
                           >
                             <Trash2 className="w-5 h-5 mr-2" />
                             Remove
                           </Button>
                         </div>
                         
                         <div className="grid grid-cols-1 gap-8">
                           <div className="space-y-4">
                             <Label className="text-lg font-bold text-foreground">
                               Charge Type *
                             </Label>
                             <Select
                               value={charge.type}
                               onValueChange={(value) => updateAdditionalCharge(charge.id, 'type', value)}
                             >
                               <SelectTrigger className="h-14 text-lg">
                                 <SelectValue placeholder="Select charge type" />
                               </SelectTrigger>
                               <SelectContent className="bg-popover border border-border z-50">
                                 {additionalChargeTypes.map((type) => (
                                   <SelectItem 
                                     key={type.value} 
                                     value={type.value}
                                     className="cursor-pointer hover:bg-accent text-lg py-3"
                                   >
                                     {type.label}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>
                           
                            {charge.type === 'additional_distance' ? (
                              <div className="space-y-4">
                                <Label className="text-lg font-bold text-foreground">
                                  Additional Distance (KM) *
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={charge.distance || ''}
                                  onChange={(e) => updateAdditionalCharge(charge.id, 'distance', parseFloat(e.target.value) || 0)}
                                  placeholder="Enter additional kilometers (e.g., 50)"
                                  className="h-14 text-lg"
                                />
                                {charge.distance && charge.distance > 0 && (
                                  <div className="p-4 bg-muted/30 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                      Auto-calculated charge: {charge.distance} KM × Exceeding Rate = LKR {(charge.amount || 0).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <Label className="text-lg font-bold text-foreground">
                                  Amount (LKR) *
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={charge.amount}
                                  onChange={(e) => updateAdditionalCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)}
                                  placeholder="Enter amount (e.g., 5000.00)"
                                  className="h-14 text-lg"
                                />
                              </div>
                            )}
                         </div>
                         
                          {charge.type === 'other' && (
                            <div className="space-y-4">
                              <Label className="text-lg font-bold text-foreground">
                                Reason / Description *
                              </Label>
                              <Input
                                value={charge.reason || ''}
                                onChange={(e) => updateAdditionalCharge(charge.id, 'reason', e.target.value)}
                                placeholder="Please specify the reason for this charge"
                                className="h-14 text-lg"
                              />
                            </div>
                          )}
                          
                          {/* Per Bus Application Settings */}
                          <div className="border-t pt-6 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                              <div className="space-y-2">
                                <Label className="text-lg font-bold text-foreground">
                                  Apply to Multiple Buses
                                </Label>
                                <p className="text-base text-muted-foreground">
                                  Enable this if the charge should be applied per bus
                                </p>
                              </div>
                              <Switch
                                checked={charge.applyPerBus}
                                onCheckedChange={(checked) => updateAdditionalCharge(charge.id, 'applyPerBus', checked)}
                                className="scale-125"
                              />
                            </div>
                            
                            {charge.applyPerBus && (
                              <div className="space-y-4">
                                <Label className="text-lg font-bold text-foreground">
                                  Number of Buses *
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={watchedNumberOfBuses}
                                  value={charge.busesCount}
                                  onChange={(e) => updateAdditionalCharge(charge.id, 'busesCount', e.target.value ? parseInt(e.target.value) : 1)}
                                  placeholder="Enter number of buses"
                                  className="h-14 text-lg w-40"
                                />
                                <p className="text-base text-muted-foreground">
                                  Maximum: {watchedNumberOfBuses} buses (total buses for this trip)
                                </p>
                              </div>
                            )}
                          </div>
                       </div>
                     </Card>
                  ))}
                 </div>

                {/* Other Expenses (Internal Costs) */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                      <div className="text-xl font-bold text-foreground">
                        Other Expenses (Internal Costs)
                      </div>
                      <p className="text-base text-muted-foreground">
                        Internal expenses that will be deducted from profit (not charged to customer)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOtherExpense}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Expense
                    </Button>
                  </div>
                  
                  {otherExpenses.map((expense, index) => (
                    <Card key={expense.id} className="p-4 border border-muted bg-muted/20">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label className="text-sm font-medium text-foreground">Expense Description</Label>
                          <Input
                            value={expense.label}
                            onChange={(e) => updateOtherExpense(expense.id, 'label', e.target.value)}
                            placeholder="e.g., Office Expenses, Staff Costs, etc."
                            className="mt-1"
                          />
                        </div>
                        <div className="w-32">
                          <Label className="text-sm font-medium text-foreground">Amount (LKR)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={expense.amount}
                            onChange={(e) => updateOtherExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOtherExpense(expense.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-6"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                 </div>


                {/* Commission and Discount Settings */}
                <div className="space-y-4">
                  <div className="text-base font-semibold text-foreground">
                    Commission & Discount Settings
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="commissionPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Total Commission (%)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="5.0"
                              className="h-10 text-base"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground">
                            Commission that company pays
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="commissionPassThroughPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Pass to Customer (%)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max={form.watch('commissionPct') || 100}
                              placeholder="0.0"
                              className="h-10 text-base"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground">
                            Commission added to customer bill (max: {form.watch('commissionPct') || 0}%)
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">Discount Type</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('discountPct', 0);
                              form.setValue('discountAmount', 0);
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 text-base">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="amount">Fixed Amount (LKR)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('discountType') === 'percentage' ? (
                      <FormField
                        control={form.control}
                        name="discountPct"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                              Discount Percentage (%)
                              {field.value > 0 && (
                                <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-300">
                                  Admin Approval Required
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="0.0"
                                className="h-10 text-base"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                            <div className="text-xs text-muted-foreground">
                              {field.value > 0 
                                ? `${field.value}% discount will be applied (requires admin approval)`
                                : 'Percentage discount to subtract from total'
                              }
                            </div>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="discountAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                              Discount Amount (LKR)
                              {field.value > 0 && (
                                <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-300">
                                  Admin Approval Required
                                </Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="h-10 text-base"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                            <div className="text-xs text-muted-foreground">
                              {field.value > 0 
                                ? `LKR ${field.value.toLocaleString()} discount will be applied (requires admin approval)`
                                : 'Fixed amount discount to subtract from total'
                              }
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>

        {/* Cost Breakdown */}
        {costData && (
          <CostBreakdown data={costData} />
        )}

         <div className="flex justify-between items-center pt-6 border-t">
           <Button 
             type="button" 
             variant="outline"
             size="lg"
             onClick={() => form.handleSubmit(calculateCosts)()}
           >
             Calculate Costs
           </Button>
           <div className="flex justify-end space-x-3">
             <Button type="button" variant="outline" size="lg" onClick={onCancel}>
               Cancel
             </Button>
             <Button type="submit" size="lg" disabled={loading || !costData}>
               {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Quotation' : 'Create Quotation')}
             </Button>
           </div>
         </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}