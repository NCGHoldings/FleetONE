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
});

type FormData = z.infer<typeof formSchema>;

interface BusType {
  id: string;
  name: string;
  capacity: number;
  avg_km_per_l: number;
  features: string;
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
}

export function SpecialHireForm({ onSubmit, onCancel }: Props) {
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [intermediateStops, setIntermediateStops] = useState<IntermediateStop[]>([]);
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hireType: 'Outside',
      numberOfBuses: 1,
      numberOfPassengers: 1,
      pickupDateTime: new Date(),
      dropDateTime: new Date(),
    }
  });

  useEffect(() => {
    loadBusTypes();
  }, []);

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
      // Get fuel settings for parking location
      const { data: fuelSettings } = await supabase
        .from('fuel_settings')
        .select('*')
        .eq('is_default', true)
        .single();

      if (!fuelSettings) {
        throw new Error('Fuel settings not configured');
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
      
      const hireCharge = fixedRate + exceedingDistanceCharge;

      // Fuel cost on empty running only (parking→pickup + drop→parking)
      const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
      const fuelLiters = (emptyRunKm / (busTypeData.avg_km_per_l || 8));
      const fuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;

      const grossRevenue = hireCharge * data.numberOfBuses;
      const customerTotalWithFuel = grossRevenue + (fuelCost * data.numberOfBuses);
      const commissionAmount = customerTotalWithFuel * 0.05; // 5% default commission
      const driverCharge = 1500; // Default driver charge
      const totalExpenses = (driverCharge * data.numberOfBuses) + commissionAmount + (fuelCost * data.numberOfBuses);
      const netProfit = customerTotalWithFuel - totalExpenses;

      const costs = {
        km_parking_to_pickup: Math.round((distanceData.kmParkingToPickup || 0) * 10) / 10,
        km_trip: Math.round((distanceData.kmTrip || 0) * 10) / 10,
        km_drop_to_parking: Math.round((distanceData.kmDropToParking || 0) * 10) / 10,
        fuel_cost_fuel_only: Math.round(fuelCost),
        hire_charge: Math.round(hireCharge),
        extra_charges: 0,
        gross_revenue: Math.round(grossRevenue), // Save hire charges only (flat fee + exceeding)
        driver_charge: driverCharge,
        other_expenses: [],
        commission_pct: 5.0,
        commission_amount: Math.round(commissionAmount),
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
        overtimeCharge: 0,
        overnightCharge: 0,
        rateCardDetails: {
          standardHours: rateCard.standard_hours || 8,
          actualHours: 8,
          overtimeHours: 0,
          agreedDistance: baseCoverageKm,
          actualDistance: tripDistance,
          exceedingKm,
          freeExceedingKm: 0,
          chargeableExceedingKm: exceedingKm
        },
        grossRevenue: Math.round(hireCharge * data.numberOfBuses),
        customerTotalWithFuel: Math.round(customerTotalWithFuel),
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

      toast({
        title: "Cost Calculated",
        description: `Trip: ${tripDistance}km | Flat: LKR ${Math.round(fixedRate).toLocaleString()} | Exceeding: LKR ${Math.round(exceedingDistanceCharge).toLocaleString()} | Customer Total: LKR ${Math.round(customerTotalWithFuel).toLocaleString()}`
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
      // Calculate costs first
      const { costs, distanceData } = await calculateCosts(data);

      // Filter out empty intermediate stops before creating quotation
      const validIntermediateStops = intermediateStops.filter(stop => stop.location && stop.location.trim());

      // Create quotation
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
        commission_amount: costs.commission_amount,
        total_expenses: costs.total_expenses,
        net_profit: costs.net_profit,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
      };

      const { error } = await supabase
        .from('special_hire_quotations')
        .insert([quotationData]);

      if (error) throw error;

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
          <DialogTitle>New Special Hire Quotation</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Intermediate Stops</label>
                    <Button type="button" variant="outline" size="sm" onClick={addIntermediateStop}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stop
                    </Button>
                  </div>
                   {intermediateStops.map((stop) => (
                     <div key={stop.id} className="flex items-center gap-2">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="pointer-events-auto"
                            />
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
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            {costData && (
              <CostBreakdown data={costData} />
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Quotation'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}