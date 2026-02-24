import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  name: z.string().min(1, 'Name is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  avg_km_per_l: z.number().min(0.1, 'Fuel efficiency must be positive'),
  features: z.string().optional(),
  is_active: z.boolean().default(true)
});

type FormData = z.infer<typeof formSchema>;

interface BusType {
  id: string;
  name: string;
  capacity: number;
  avg_km_per_l: number;
  features: string;
  is_active: boolean;
  created_at: string;
}

export function BusTypesAdmin() {
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBusType, setEditingBusType] = useState<BusType | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true
    }
  });

  const loadBusTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setBusTypes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bus types",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusTypes();
  }, []);

  const handleSubmit = async (data: FormData) => {
    try {
      if (editingBusType) {
        const { error } = await supabase
          .from('bus_types')
          .update(data)
          .eq('id', editingBusType.id);

        if (error) throw error;
        toast({ title: "Success", description: "Bus type updated successfully" });
      } else {
        const { error } = await supabase
          .from('bus_types')
          .insert([data as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Bus type created successfully" });
      }

      setShowDialog(false);
      setEditingBusType(null);
      form.reset();
      loadBusTypes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (busType: BusType) => {
    setEditingBusType(busType);
    form.reset({
      name: busType.name,
      capacity: busType.capacity,
      avg_km_per_l: busType.avg_km_per_l,
      features: busType.features || '',
      is_active: busType.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bus type?')) return;

    try {
      const { error } = await supabase
        .from('bus_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Bus type deleted successfully" });
      loadBusTypes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const columns: ColumnDef<BusType>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => `${row.getValue("capacity")} seats`,
    },
    {
      accessorKey: "avg_km_per_l",
      header: "Fuel Efficiency",
      cell: ({ row }) => `${row.getValue("avg_km_per_l")} km/L`,
    },
    {
      accessorKey: "features",
      header: "Features",
      cell: ({ row }) => (
        <div className="max-w-xs truncate">{row.getValue("features") || "-"}</div>
      ),
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
          <CardTitle>Bus Types Management</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingBusType(null);
                form.reset({ is_active: true });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bus Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBusType ? 'Edit Bus Type' : 'Add New Bus Type'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Bus type name" {...field} />
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
                    name="avg_km_per_l"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average km/L</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
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
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                          <Input placeholder="Features (optional)" {...field} />
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
                      {editingBusType ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={busTypes} searchKey="name" />
      </CardContent>
    </Card>
  );
}