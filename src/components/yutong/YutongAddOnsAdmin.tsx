import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Bus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ColumnDef } from '@tanstack/react-table';
import { BusAllocationModal } from './BusAllocationModal';

const formSchema = z.object({
  addon_name: z.string().min(1, 'Add-on name is required'),
  addon_code: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  installation_time_hours: z.number().min(0).optional(),
  warranty_months: z.number().min(0).optional(),
  supplier_name: z.string().optional(),
  supplier_contact: z.string().optional(),
  is_active: z.boolean().default(true),
});

interface AddOn {
  id: string;
  addon_name: string;
  addon_code?: string;
  category: string;
  description?: string;
  price: number;
  installation_time_hours?: number;
  warranty_months?: number;
  supplier_name?: string;
  supplier_contact?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function YutongAddOnsAdmin() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddOn, setEditingAddOn] = useState<AddOn | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showBusAllocation, setShowBusAllocation] = useState(false);
  const [selectedAddOnForAllocation, setSelectedAddOnForAllocation] = useState<AddOn | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      addon_name: '',
      addon_code: '',
      category: 'general',
      description: '',
      price: 0,
      installation_time_hours: 1,
      warranty_months: 12,
      supplier_name: '',
      supplier_contact: '',
      is_active: true,
    },
  });

  const loadAddOns = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('yutong_addons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddOns(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddOns();
  }, []);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingAddOn) {
        const { error } = await (supabase as any)
          .from('yutong_addons')
          .update(values)
          .eq('id', editingAddOn.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Add-on updated successfully",
        });
      } else {
        const { error } = await (supabase as any)
          .from('yutong_addons')
          .insert([values]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Add-on created successfully",
        });
      }

      form.reset();
      setShowDialog(false);
      setEditingAddOn(null);
      loadAddOns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (addOn: AddOn) => {
    setEditingAddOn(addOn);
    form.reset({
      addon_name: addOn.addon_name,
      addon_code: addOn.addon_code || '',
      category: addOn.category,
      description: addOn.description || '',
      price: addOn.price,
      installation_time_hours: addOn.installation_time_hours || 1,
      warranty_months: addOn.warranty_months || 12,
      supplier_name: addOn.supplier_name || '',
      supplier_contact: addOn.supplier_contact || '',
      is_active: addOn.is_active,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) return;

    try {
      const { error } = await (supabase as any)
        .from('yutong_addons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Add-on deleted successfully",
      });
      loadAddOns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManageBuses = (addOn: AddOn) => {
    setSelectedAddOnForAllocation(addOn);
    setShowBusAllocation(true);
  };

  const columns: ColumnDef<AddOn>[] = [
    {
      accessorKey: 'addon_name',
      header: 'Add-on Name',
    },
    {
      accessorKey: 'addon_code',
      header: 'Code',
      cell: ({ row }) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">
          {row.original.addon_code || 'N/A'}
        </code>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price (LKR)',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.price.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'installation_time_hours',
      header: 'Install Time',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.installation_time_hours || 0}h
        </span>
      ),
    },
    {
      accessorKey: 'warranty_months',
      header: 'Warranty',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.warranty_months || 0} months
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleManageBuses(row.original)}
            title="Manage Bus Allocations"
          >
            <Bus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Yutong Bus Add-ons Management</CardTitle>
          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setEditingAddOn(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add New Add-on
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAddOn ? 'Edit Add-on' : 'Add New Add-on'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="addon_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Add-on Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="GPS Navigation System" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="addon_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Add-on Code</FormLabel>
                          <FormControl>
                            <Input placeholder="GPS-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="comfort">Comfort</SelectItem>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="performance">Performance</SelectItem>
                            <SelectItem value="exterior">Exterior</SelectItem>
                            <SelectItem value="interior">Interior</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed description of the add-on..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (LKR) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="150000" 
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
                      name="installation_time_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Installation Time (Hours)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2" 
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
                      name="warranty_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty (Months)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="12" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supplier_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Name</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC Electronics Ltd" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supplier_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="011-234-5678" {...field} />
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this add-on for quotations
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingAddOn ? 'Update Add-on' : 'Create Add-on'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={addOns}
        />
      </CardContent>

      <BusAllocationModal
        addon={selectedAddOnForAllocation}
        open={showBusAllocation}
        onClose={() => {
          setShowBusAllocation(false);
          setSelectedAddOnForAllocation(null);
        }}
      />
    </Card>
  );
}