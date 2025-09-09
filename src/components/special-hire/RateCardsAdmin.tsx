import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Schema for Outside hire (simplified)
const outsideHireSchema = z.object({
  bus_type_id: z.string().min(1, 'Bus type is required'),
  flat_fee_lkr: z.number().min(0, 'Flat fee must be positive'),
  exceeding_km_rate_lkr: z.number().min(0, 'Exceeding KM rate must be positive'),
  exceeding_km_threshold: z.number().min(100, 'Threshold must be at least 100km'),
  standard_hours: z.number().min(0, 'Standard hours must be positive'),
  overtime_rate_lkr_per_hour: z.number().min(0, 'Overtime rate must be positive'),
  overnight_charge_lkr_per_day: z.number().min(0, 'Overnight charge must be 0 or positive'),
  effective_from: z.date(),
  effective_to: z.date().optional(),
  is_active: z.boolean().default(true)
});

// Schema for Other hire types (simplified to match Outside)
const otherHireSchema = z.object({
  hire_type: z.enum(['Lyceum']),
  bus_type_id: z.string().min(1, 'Bus type is required'),
  flat_fee_lkr: z.number().min(0, 'Flat fee must be positive'),
  exceeding_km_rate_lkr: z.number().min(0, 'Exceeding KM rate must be positive'),
  exceeding_km_threshold: z.number().min(100, 'Threshold must be at least 100km'),
  standard_hours: z.number().min(0, 'Standard hours must be positive'),
  overtime_rate_lkr_per_hour: z.number().min(0, 'Overtime rate must be positive'),
  overnight_charge_lkr_per_day: z.number().min(0, 'Overnight charge must be 0 or positive'),
  effective_from: z.date(),
  effective_to: z.date().optional(),
  is_active: z.boolean().default(true)
});

type OutsideHireFormData = z.infer<typeof outsideHireSchema>;
type OtherHireFormData = z.infer<typeof otherHireSchema>;

interface RateCard {
  id: string;
  hire_type: string;
  bus_type_id: string;
  from_km: number;
  to_km: number;
  flat_fee_lkr: number;
  standard_hours: number;
  overtime_rate_lkr_per_hour: number;
  overnight_charge_lkr_per_day: number;
  exceeding_km_rate_lkr: number;
  free_exceeding_km: number;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
  bus_types?: { name: string };
}

interface BusType {
  id: string;
  name: string;
}

export function RateCardsAdmin() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outside');
  
  // Outside Hire states
  const [showOutsideDialog, setShowOutsideDialog] = useState(false);
  const [editingOutsideCard, setEditingOutsideCard] = useState<RateCard | null>(null);
  
  // Other Hire states  
  const [showOtherDialog, setShowOtherDialog] = useState(false);
  const [editingOtherCard, setEditingOtherCard] = useState<RateCard | null>(null);
  
  const { toast } = useToast();

  const outsideForm = useForm<OutsideHireFormData>({
    resolver: zodResolver(outsideHireSchema),
    defaultValues: {
      flat_fee_lkr: 30000,
      exceeding_km_rate_lkr: 175,
      exceeding_km_threshold: 100,
      standard_hours: 8,
      overtime_rate_lkr_per_hour: 500,
      overnight_charge_lkr_per_day: 0,
      effective_from: new Date(),
      is_active: true
    }
  });

  const otherForm = useForm<OtherHireFormData>({
    resolver: zodResolver(otherHireSchema),
    defaultValues: {
      hire_type: 'Lyceum',
      flat_fee_lkr: 30000,
      exceeding_km_rate_lkr: 175,
      exceeding_km_threshold: 100,
      standard_hours: 8,
      overtime_rate_lkr_per_hour: 500,
      overnight_charge_lkr_per_day: 0,
      effective_from: new Date(),
      is_active: true
    }
  });

  const loadData = async () => {
    try {
      const [rateCardsResult, busTypesResult] = await Promise.all([
        supabase
          .from('hire_rate_cards')
          .select(`
            *,
            bus_types:bus_type_id (name)
          `)
          .order('hire_type')
          .order('from_km'),
        supabase
          .from('bus_types')
          .select('id, name')
          .eq('is_active', true)
          .order('name')
      ]);

      if (rateCardsResult.error) throw rateCardsResult.error;
      if (busTypesResult.error) throw busTypesResult.error;

      setRateCards(rateCardsResult.data || []);
      setBusTypes(busTypesResult.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter rate cards by hire type
  const outsideRateCards = rateCards.filter(card => card.hire_type === 'Outside');
  const otherRateCards = rateCards.filter(card => card.hire_type !== 'Outside');

  // Columns for Outside Hire (simplified)
  const outsideColumns: ColumnDef<RateCard>[] = [
    {
      accessorKey: "bus_types.name",
      header: "Bus Type",
      cell: ({ row }) => row.original.bus_types?.name || "N/A",
    },
    {
      accessorKey: "flat_fee_lkr",
      header: "Flat Fee (First 100km)",
      cell: ({ row }) => {
        const fee = row.getValue("flat_fee_lkr");
        return `LKR ${fee?.toLocaleString() || '0'}`;
      },
    },
    {
      accessorKey: "exceeding_km_rate_lkr", 
      header: "Exceeding Rate (/km)",
      cell: ({ row }) => `LKR ${row.getValue("exceeding_km_rate_lkr")}/km`,
    },
    {
      accessorKey: "exceeding_km_threshold", 
      header: "Exceeding Threshold",
      cell: ({ row }) => `Beyond ${row.getValue("exceeding_km_threshold")}km`,
    },
    {
      accessorKey: "standard_hours",
      header: "Standard Hours",
      cell: ({ row }) => `${row.getValue("standard_hours")} hrs`,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <span className={row.getValue("is_active") ? "text-success" : "text-destructive"}>
          {row.getValue("is_active") ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleEditOutside(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Columns for Other Hire Types (simplified)
  const otherColumns: ColumnDef<RateCard>[] = [
    {
      accessorKey: "hire_type",
      header: "Hire Type",
    },
    {
      accessorKey: "bus_types.name",
      header: "Bus Type",
      cell: ({ row }) => row.original.bus_types?.name || "N/A",
    },
    {
      accessorKey: "flat_fee_lkr",
      header: "Flat Fee (First 100km)",
      cell: ({ row }) => {
        const fee = row.getValue("flat_fee_lkr");
        return `LKR ${fee?.toLocaleString() || '0'}`;
      },
    },
    {
      accessorKey: "exceeding_km_rate_lkr", 
      header: "Exceeding Rate (/km)",
      cell: ({ row }) => `LKR ${row.getValue("exceeding_km_rate_lkr")}/km`,
    },
    {
      accessorKey: "exceeding_km_threshold", 
      header: "Exceeding Threshold",
      cell: ({ row }) => `Beyond ${row.getValue("exceeding_km_threshold")}km`,
    },
    {
      accessorKey: "standard_hours",
      header: "Standard Hours",
      cell: ({ row }) => `${row.getValue("standard_hours")} hrs`,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <span className={row.getValue("is_active") ? "text-success" : "text-destructive"}>
          {row.getValue("is_active") ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleEditOther(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSubmitOutside = async (data: OutsideHireFormData) => {
    try {
      const payload = {
        ...data,
        hire_type: 'Outside',
        from_km: 0,
        to_km: 999999, // Auto-set for Outside hire
        free_exceeding_km: 0, // Not used for Outside hire
        effective_from: data.effective_from.toISOString().split('T')[0],
        effective_to: data.effective_to?.toISOString().split('T')[0] || null
      };

      if (editingOutsideCard) {
        const { error } = await supabase
          .from('hire_rate_cards')
          .update(payload)
          .eq('id', editingOutsideCard.id);

        if (error) throw error;
        toast({ title: "Success", description: "Outside hire rate updated successfully" });
      } else {
        const { error } = await supabase
          .from('hire_rate_cards')
          .insert([payload as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Outside hire rate created successfully" });
      }

      setShowOutsideDialog(false);
      setEditingOutsideCard(null);
      outsideForm.reset();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmitOther = async (data: OtherHireFormData) => {
    try {
      const payload = {
        ...data,
        from_km: 0,
        to_km: 999999, // Auto-set for simplified 100km + exceeding model
        free_exceeding_km: 0, // Not used in simplified model
        effective_from: data.effective_from.toISOString().split('T')[0],
        effective_to: data.effective_to?.toISOString().split('T')[0] || null
      };

      if (editingOtherCard) {
        const { error } = await supabase
          .from('hire_rate_cards')
          .update(payload)
          .eq('id', editingOtherCard.id);

        if (error) throw error;
        toast({ title: "Success", description: "Rate card updated successfully" });
      } else {
        const { error } = await supabase
          .from('hire_rate_cards')
          .insert([payload as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Rate card created successfully" });
      }

      setShowOtherDialog(false);
      setEditingOtherCard(null);
      otherForm.reset();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditOutside = (rateCard: RateCard) => {
    setEditingOutsideCard(rateCard);
    outsideForm.reset({
      bus_type_id: rateCard.bus_type_id,
      flat_fee_lkr: rateCard.flat_fee_lkr || 0,
      exceeding_km_rate_lkr: rateCard.exceeding_km_rate_lkr || 175,
      standard_hours: rateCard.standard_hours || 8,
      overtime_rate_lkr_per_hour: rateCard.overtime_rate_lkr_per_hour || 500,
      overnight_charge_lkr_per_day: rateCard.overnight_charge_lkr_per_day || 0,
      effective_from: new Date(rateCard.effective_from),
      effective_to: rateCard.effective_to ? new Date(rateCard.effective_to) : undefined,
      is_active: rateCard.is_active
    });
    setShowOutsideDialog(true);
  };

  const handleEditOther = (rateCard: RateCard) => {
    setEditingOtherCard(rateCard);
    otherForm.reset({
      hire_type: rateCard.hire_type as 'Lyceum',
      bus_type_id: rateCard.bus_type_id,
      flat_fee_lkr: rateCard.flat_fee_lkr || 0,
      exceeding_km_rate_lkr: rateCard.exceeding_km_rate_lkr || 175,
      standard_hours: rateCard.standard_hours || 8,
      overtime_rate_lkr_per_hour: rateCard.overtime_rate_lkr_per_hour || 500,
      overnight_charge_lkr_per_day: rateCard.overnight_charge_lkr_per_day || 0,
      effective_from: new Date(rateCard.effective_from),
      effective_to: rateCard.effective_to ? new Date(rateCard.effective_to) : undefined,
      is_active: rateCard.is_active
    });
    setShowOtherDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate card?')) return;

    try {
      const { error } = await supabase
        .from('hire_rate_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Rate card deleted successfully" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outside">Outside Hire Rates</TabsTrigger>
          <TabsTrigger value="other">Other Hire Rates</TabsTrigger>
        </TabsList>

        {/* Outside Hire Tab */}
        <TabsContent value="outside" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Outside Hire Rates</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Flat rate for first 100km + exceeding rate for distance beyond 100km
                  </p>
                </div>
                <Dialog open={showOutsideDialog} onOpenChange={setShowOutsideDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingOutsideCard(null);
                      outsideForm.reset();
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Outside Rate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingOutsideCard ? 'Edit Outside Hire Rate' : 'Add Outside Hire Rate'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...outsideForm}>
                      <form onSubmit={outsideForm.handleSubmit(handleSubmitOutside)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={outsideForm.control}
                            name="bus_type_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bus Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select bus type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {busTypes.map((busType) => (
                                      <SelectItem key={busType.id} value={busType.id}>
                                        {busType.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="flat_fee_lkr"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Flat Fee (First 100km)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g., 30000"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="exceeding_km_rate_lkr"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Exceeding Rate (Beyond {outsideForm.watch('exceeding_km_threshold') || 100}km)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g., 175"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="exceeding_km_threshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Exceeding Threshold</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))} 
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select threshold" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="100">Beyond 100km</SelectItem>
                                    <SelectItem value="200">Beyond 200km</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="standard_hours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Standard Hours</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="8"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="overtime_rate_lkr_per_hour"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Overtime Rate (LKR/hour)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="500"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="overnight_charge_lkr_per_day"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Overnight Charge (LKR/day)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="effective_from"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Effective From</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={outsideForm.control}
                            name="effective_to"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Effective To (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={outsideForm.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Active</FormLabel>
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowOutsideDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingOutsideCard ? 'Update' : 'Create'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={outsideColumns} data={outsideRateCards} searchKey="bus_types.name" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Hire Types Tab */}
        <TabsContent value="other" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Other Hire Rates</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Flat rate for first 100km + exceeding rate for Lyceum and other hire types
                  </p>
                </div>
                <Dialog open={showOtherDialog} onOpenChange={setShowOtherDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingOtherCard(null);
                      otherForm.reset();
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rate Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingOtherCard ? 'Edit Rate Card' : 'Add New Rate Card'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...otherForm}>
                      <form onSubmit={otherForm.handleSubmit(handleSubmitOther)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={otherForm.control}
                            name="hire_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hire Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Lyceum">Lyceum</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="bus_type_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bus Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select bus type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {busTypes.map((busType) => (
                                      <SelectItem key={busType.id} value={busType.id}>
                                        {busType.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="flat_fee_lkr"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Flat Fee (First 100km)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g., 30000"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="exceeding_km_rate_lkr"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Exceeding Rate (Beyond {otherForm.watch('exceeding_km_threshold') || 100}km)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g., 175"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="exceeding_km_threshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Exceeding Threshold</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))} 
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select threshold" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="100">Beyond 100km</SelectItem>
                                    <SelectItem value="200">Beyond 200km</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="standard_hours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Standard Hours</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="8"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="overtime_rate_lkr_per_hour"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Overtime Rate (LKR/hour)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="500"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="overnight_charge_lkr_per_day"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Overnight Charge (LKR/day)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="effective_from"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Effective From</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={otherForm.control}
                            name="effective_to"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Effective To (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                             )}
                           />
                        </div>

                        <FormField
                          control={otherForm.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Active</FormLabel>
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowOtherDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingOtherCard ? 'Update' : 'Create'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={otherColumns} data={otherRateCards} searchKey="hire_type" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
