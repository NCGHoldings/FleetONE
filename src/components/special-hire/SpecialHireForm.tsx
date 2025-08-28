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
    // This would integrate with Mapbox for distance calculation
    // For now, using mock data
    const mockCosts = {
      kmParkingToPickup: 15,
      kmTrip: 120,
      kmDropToParking: 20,
      fuelCostFuelOnly: 2500,
      hireCharge: 12000,
      extraCharges: 0,
      grossRevenue: 14500,
      driverCharge: 1500,
      otherExpenses: [],
      commissionPct: 5,
      commissionAmount: 725,
      totalExpenses: 2225,
      netProfit: 12275
    };
    
    setCostData(mockCosts);
    return mockCosts;
  };

  const handleSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Calculate costs first
      const costs = await calculateCosts(data);

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
        intermediate_stops: JSON.stringify(intermediateStops),
        number_of_passengers: data.numberOfPassengers,
        pickup_datetime: data.pickupDateTime.toISOString(),
        drop_datetime: data.dropDateTime.toISOString(),
        ...costs,
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
                          <div className="relative">
                            <Input placeholder="Enter pickup location" {...field} />
                            <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                          </div>
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
                          <div className="relative">
                            <Input placeholder="Enter drop location" {...field} />
                            <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                          </div>
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
                      <Input
                        placeholder="Stop location"
                        value={stop.location}
                        onChange={(e) => updateIntermediateStop(stop.id, e.target.value)}
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