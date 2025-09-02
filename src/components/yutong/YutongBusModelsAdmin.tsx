
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  bus_name: z.string().min(1, 'Bus name is required'),
  model: z.string().min(1, 'Model is required'),
  seating_capacity: z.number().min(1, 'Seating capacity must be at least 1'),
  engine: z.string().min(1, 'Engine is required'),
  manufactured_year: z.number().min(1900, 'Valid year required').max(new Date().getFullYear() + 1),
  condition: z.string().min(1, 'Condition is required'),
  unit_price: z.number().min(1, 'Unit price is required'),
  is_active: z.boolean().default(true)
});

type FormData = z.infer<typeof formSchema>;

interface BusModel {
  id: string;
  bus_name: string;
  model: string;
  seating_capacity: number;
  engine: string;
  manufactured_year: number;
  condition: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
}

export function YutongBusModelsAdmin() {
  const [busModels, setBusModels] = useState<BusModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<BusModel | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true
    }
  });

  const loadBusModels = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('yutong_bus_models')
        .select('*')
        .order('bus_name');

      if (error) throw error;
      setBusModels(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bus models",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusModels();
  }, []);

  const handleSubmit = async (data: FormData) => {
    try {
      if (editingModel) {
        const { error } = await (supabase as any)
          .from('yutong_bus_models')
          .update(data)
          .eq('id', editingModel.id);

        if (error) throw error;
        toast({ title: "Success", description: "Bus model updated successfully" });
      } else {
        const { error } = await (supabase as any)
          .from('yutong_bus_models')
          .insert([data as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Bus model created successfully" });
      }

      setShowDialog(false);
      setEditingModel(null);
      form.reset();
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (model: BusModel) => {
    setEditingModel(model);
    form.reset({
      bus_name: model.bus_name,
      model: model.model,
      seating_capacity: model.seating_capacity,
      engine: model.engine,
      manufactured_year: model.manufactured_year,
      condition: model.condition,
      unit_price: model.unit_price,
      is_active: model.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bus model?')) return;

    try {
      const { error } = await (supabase as any)
        .from('yutong_bus_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Bus model deleted successfully" });
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const columns: ColumnDef<BusModel>[] = [
    {
      accessorKey: "bus_name",
      header: "Bus Name",
    },
    {
      accessorKey: "model",
      header: "Model",
    },
    {
      accessorKey: "seating_capacity",
      header: "Capacity",
      cell: ({ row }) => `${row.getValue("seating_capacity")} seats`,
    },
    {
      accessorKey: "manufactured_year",
      header: "Year",
    },
    {
      accessorKey: "condition",
      header: "Condition",
    },
    {
      accessorKey: "unit_price",
      header: "Unit Price",
      cell: ({ row }) => `LKR ${row.getValue<number>("unit_price").toLocaleString()}`,
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
          <CardTitle>Yutong Bus Models</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingModel(null);
                form.reset({ is_active: true });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bus Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? 'Edit Bus Model' : 'Add New Bus Model'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bus_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bus Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Yutong ZK6129H" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ZK6129H" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seating_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seating Capacity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g., 49"
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
                      name="engine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., YC6L280-30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manufactured_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufactured Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear() + 1}
                              placeholder="e.g., 2024"
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
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., New, Used, Refurbished" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (LKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 12500000"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                      {editingModel ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={busModels} searchKey="bus_name" />
      </CardContent>
    </Card>
  );
}
