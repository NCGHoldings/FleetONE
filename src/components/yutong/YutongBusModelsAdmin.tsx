
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
  model_name: z.string().min(1, 'Model name is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  base_price: z.number().min(1, 'Base price is required'),
  engine_type: z.string().optional(),
  fuel_type: z.string().optional(),
  dimensions: z.string().optional(),
  features: z.string().optional(),
  is_active: z.boolean().default(true)
});

type FormData = z.infer<typeof formSchema>;

interface BusModel {
  id: string;
  model_name: string;
  capacity: number;
  base_price: number;
  engine_type: string;
  fuel_type: string;
  dimensions: string;
  features: string;
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
        .order('model_name');

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
      model_name: model.model_name,
      capacity: model.capacity,
      base_price: model.base_price,
      engine_type: model.engine_type || '',
      fuel_type: model.fuel_type || '',
      dimensions: model.dimensions || '',
      features: model.features || '',
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
      accessorKey: "model_name",
      header: "Model Name",
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => `${row.getValue("capacity")} seats`,
    },
    {
      accessorKey: "base_price",
      header: "Base Price",
      cell: ({ row }) => `LKR ${row.getValue<number>("base_price").toLocaleString()}`,
    },
    {
      accessorKey: "fuel_type",
      header: "Fuel Type",
      cell: ({ row }) => row.getValue("fuel_type") || "-",
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
                      name="model_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ZK6129H" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity (seats)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
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
                      name="base_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (LKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuel_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Diesel, CNG" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engine_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., YC6L280-30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 12m x 2.5m x 3.2m" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Key features and specifications" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
        <DataTable columns={columns} data={busModels} searchKey="model_name" />
      </CardContent>
    </Card>
  );
}
