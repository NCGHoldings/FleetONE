import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  hire_type: z.enum(['Outside', 'Lyceum']),
  bus_type_id: z.string().min(1, 'Bus type is required'),
  from_km: z.number().min(0, 'From KM must be 0 or positive'),
  to_km: z.number().optional(),
  rate_per_km_lkr: z.number().optional(),
  flat_fee_lkr: z.number().optional(),
  effective_from: z.date(),
  effective_to: z.date().optional(),
  is_active: z.boolean().default(true)
});

type FormData = z.infer<typeof formSchema>;

interface RateCard {
  id: string;
  hire_type: string;
  bus_type_id: string;
  from_km: number;
  to_km: number | null;
  rate_per_km_lkr: number | null;
  flat_fee_lkr: number | null;
  effective_from: string;
  effective_to: string | null;
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
  const [editingRateCard, setEditingRateCard] = useState<RateCard | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hire_type: 'Outside',
      from_km: 0,
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

  const handleSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        effective_from: data.effective_from.toISOString().split('T')[0],
        effective_to: data.effective_to?.toISOString().split('T')[0] || null
      };

      if (editingRateCard) {
        const { error } = await supabase
          .from('hire_rate_cards')
          .update(payload)
          .eq('id', editingRateCard.id);

        if (error) throw error;
        toast({ title: "Success", description: "Rate card updated successfully" });
      } else {
        const { error } = await supabase
          .from('hire_rate_cards')
          .insert([payload as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Rate card created successfully" });
      }

      setShowDialog(false);
      setEditingRateCard(null);
      form.reset();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (rateCard: RateCard) => {
    setEditingRateCard(rateCard);
    form.reset({
      hire_type: rateCard.hire_type as 'Outside' | 'Lyceum',
      bus_type_id: rateCard.bus_type_id,
      from_km: rateCard.from_km,
      to_km: rateCard.to_km || undefined,
      rate_per_km_lkr: rateCard.rate_per_km_lkr || undefined,
      flat_fee_lkr: rateCard.flat_fee_lkr || undefined,
      effective_from: new Date(rateCard.effective_from),
      effective_to: rateCard.effective_to ? new Date(rateCard.effective_to) : undefined,
      is_active: rateCard.is_active
    });
    setShowDialog(true);
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

  const columns: ColumnDef<RateCard>[] = [
    {
      accessorKey: "hire_type",
      header: "Hire Type",
    },
    {
      accessorKey: "bus_types.name",
      header: "Bus Type",
      cell: ({ row }) => row.original.bus_types?.name || "-",
    },
    {
      accessorKey: "from_km",
      header: "From KM",
    },
    {
      accessorKey: "to_km",
      header: "To KM",
      cell: ({ row }) => row.getValue("to_km") || "No limit",
    },
    {
      accessorKey: "rate_per_km_lkr",
      header: "Rate/KM",
      cell: ({ row }) => {
        const rate = row.getValue("rate_per_km_lkr");
        return rate ? `LKR ${rate}` : "-";
      },
    },
    {
      accessorKey: "flat_fee_lkr",
      header: "Flat Fee",
      cell: ({ row }) => {
        const fee = row.getValue("flat_fee_lkr");
        return fee ? `LKR ${fee}` : "-";
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <span className={row.getValue("is_active") ? "text-green-600" : "text-red-600"}>
          {row.getValue("is_active") ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Rate Cards Management</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingRateCard(null);
                form.reset({
                  hire_type: 'Outside',
                  from_km: 0,
                  effective_from: new Date(),
                  is_active: true
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rate Card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRateCard ? 'Edit Rate Card' : 'Add New Rate Card'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="from_km"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From KM</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="to_km"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To KM (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Leave empty for no limit"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rate_per_km_lkr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate per KM (LKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="flat_fee_lkr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat Fee (LKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
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
                    <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRateCard ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={rateCards} searchKey="hire_type" />
      </CardContent>
    </Card>
  );
}