import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  hireType: z.enum(['Outside', 'Lyceum']),
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
}

export function SpecialHireForm({ onSubmit, onCancel, initialData, isEditing = false }: Props) {
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [intermediateStops, setIntermediateStops] = useState<IntermediateStop[]>([]);
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
      pickupDateTime: initialData.pickup_datetime ? new Date(initialData.pickup_datetime) : new Date(),
      dropDateTime: initialData.drop_datetime ? new Date(initialData.drop_datetime) : new Date(),
      parkingLocationId: initialData.parking_location_id || '',
      commissionPct: initialData.commission_pct || 5,
      commissionPassThroughPct: initialData.commission_pass_through_pct || 0,
      discountType: initialData.discount_type || 'percentage',
      discountPct: initialData.discount_percentage || 0,
      discountAmount: initialData.discount_amount_lkr || 0,
    } : {
      hireType: 'Outside',
      numberOfBuses: 1,
      numberOfPassengers: 1,
      pickupDateTime: new Date(),
      dropDateTime: new Date(),
      parkingLocationId: '',
      commissionPct: 5,
      commissionPassThroughPct: 0,
      discountType: 'percentage',
      discountPct: 0,
      discountAmount: 0,
    }
  });

  useEffect(() => {
    loadBusTypes();
    loadParkingLocations();
    
    // If editing, set intermediate stops from initial data
    if (isEditing && initialData?.intermediate_stops) {
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

      // Call edge function to calculate real distances using Mapbox API
      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: {
          pickupLocation: data.pickupLocation,
          dropLocation: data.dropLocation,
          intermediateStops: validIntermediateStops,
          parkingLat: fuelSettings.parking_lat,
          parkingLng: fuelSettings.parking_lng
        }
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

      // Get rate card for unified 100km flat fee + exceeding rate pricing
      const { data: allRateCards } = await supabase
        .from('hire_rate_cards')
        .select('*')
        .eq('hire_type', data.hireType)
        .eq('bus_type_id', data.busTypeId)
        .eq('is_active', true)
        .order('from_km');

      let rateCard = null;
      if (allRateCards && allRateCards.length > 0) {
        rateCard = allRateCards.find(c => c.flat_fee_lkr != null && c.exceeding_km_rate_lkr != null) || allRateCards[0];
      }

      if (!rateCard) {
        throw new Error(`No rate card found for ${data.hireType} hire type. Please configure flat fee and exceeding km rate.`);
      }

      // Apply unified 100km flat fee + exceeding rate formula
      const tripDistance = distanceData.kmTrip || 0;
      const fixedRate = rateCard.flat_fee_lkr || 0;
      const baseCoverageKm = 100;
      const exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
      const exceedingDistanceCharge = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);
      
      // Calculate extra time charges for Outside hire type
      let overtimeCharge = 0;
      let overnightCharge = 0;
      let totalExtraTimeCharge = 0;
      
      if (data.hireType === 'Outside') {
        // Use only quoted distance (tripDistance) for available hours calculation
        const extraTimeResult = calculateExtraTimeCharge(
          tripDistance,
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

      // Fuel cost on empty running only (parking→pickup + drop→parking)
      const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
      const fuelLiters = (emptyRunKm / (busTypeData.avg_km_per_l || 8));
      const fuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;

      const grossRevenue = hireCharge * data.numberOfBuses;
      // Commission and discount calculations
      const baseCustomerTotal = grossRevenue + (fuelCost * data.numberOfBuses);
      
      // Commission pass-through (added to customer bill)
      // Ensure pass-through percentage never exceeds commission percentage
      const safePassThroughPct = Math.min(data.commissionPassThroughPct, data.commissionPct);
      const commissionPassThroughAmount = baseCustomerTotal * (safePassThroughPct / 100);
      
      // Discount (subtracted from customer bill)
      const discountAmount = data.discountType === 'percentage' 
        ? baseCustomerTotal * (data.discountPct / 100)
        : data.discountAmount;
      
      // Final customer total
      const finalCustomerTotal = baseCustomerTotal + commissionPassThroughAmount - discountAmount;
      
      // Company expenses
      const commissionExpense = baseCustomerTotal * (data.commissionPct / 100); // Total commission company pays
      const driverCharge = 1500; // Default driver charge
      const totalExpenses = (driverCharge * data.numberOfBuses) + commissionExpense + (fuelCost * data.numberOfBuses);
      const netProfit = finalCustomerTotal - totalExpenses;

      const costs = {
        km_parking_to_pickup: Math.round((distanceData.kmParkingToPickup || 0) * 10) / 10,
        km_trip: Math.round((distanceData.kmTrip || 0) * 10) / 10,
        km_drop_to_parking: Math.round((distanceData.kmDropToParking || 0) * 10) / 10,
        fuel_cost_fuel_only: Math.round(fuelCost),
        hire_charge: Math.round(hireCharge),
        extra_charges: Math.round(totalExtraTimeCharge),
        gross_revenue: Math.round(grossRevenue), // Base hire charges
        commission_pct: data.commissionPct,
        commission_pass_through_pct: data.commissionPassThroughPct,
        commission_pass_through_amount: Math.round(commissionPassThroughAmount),
        discount_percentage: data.discountPct,
        discount_amount: Math.round(discountAmount),
        driver_charge: driverCharge,
        other_expenses: [],
        commission_amount: Math.round(commissionExpense),
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
        driverCharge: costs.driver_charge,
        otherExpenses: costs.other_expenses,
        commissionPct: costs.commission_pct,
        commissionAmount: costs.commission_amount,
        totalExpenses: costs.total_expenses,
        netProfit: costs.net_profit,
        totalDistance: (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0),
        fuelLiters: Math.round(fuelLiters * 10) / 10,
        busTypeName: busTypeData.name,
        fuelPrice: fuelSettings.diesel_price_lkr_per_l,
        pickupAddress: distanceData.pickupAddress,
        dropAddress: distanceData.dropAddress
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
      // Check if discount requires admin approval
      if ((data.discountType === 'percentage' && data.discountPct > 0) || 
          (data.discountType === 'amount' && data.discountAmount > 0)) {
        const { data: userData } = await supabase.auth.getUser();
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
        total_expenses: costs.total_expenses,
        net_profit: costs.net_profit,
        approval_status: ((data.discountType === 'percentage' && data.discountPct > 0) || 
                         (data.discountType === 'amount' && data.discountAmount > 0) ? 'pending' : 'approved') as 'pending' | 'approved' | 'rejected',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        audit_log: isEditing ? [...(initialData?.audit_log || []), auditEntry].filter(Boolean) : []
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
                      <FormItem>
                        <FormLabel>Parking Location *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stop
                    </Button>
                  </div>
                   {intermediateStops.map((stop) => (
                     <div key={stop.id} className="flex items-center gap-3">
                       <LocationAutocomplete
                         value={stop.location}
                         onChange={(value) => updateIntermediateStop(stop.id, value)}
                         placeholder="Enter intermediate location"
                         className="flex-1"
                       />
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => removeIntermediateStop(stop.id)}
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   ))}
                </div>

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
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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

                {/* Commission and Discount Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="commissionPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Commission (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="5"
                            className="h-10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground mt-1">
                          Commission company pays
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commissionPassThroughPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Pass to Customer (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="0"
                            className="h-10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground mt-1">
                          Commission passed to customer
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Discount Type</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Reset discount values when type changes
                          form.setValue('discountPct', 0);
                          form.setValue('discountAmount', 0);
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue />
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
                          <FormLabel className="text-sm font-medium">Discount (%)
                            {field.value > 0 && <Badge variant="secondary" className="ml-2 text-xs">Admin Approval Required</Badge>}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="0"
                              className="h-10"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground mt-1">
                            Percentage discount (requires admin approval)
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
                          <FormLabel className="text-sm font-medium">Discount (LKR)
                            {field.value > 0 && <Badge variant="secondary" className="ml-2 text-xs">Admin Approval Required</Badge>}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              className="h-10"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground mt-1">
                            Fixed amount discount (requires admin approval)
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
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