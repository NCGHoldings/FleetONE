import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ColumnDef } from '@tanstack/react-table';

const formSchema = z.object({
  bus_id: z.string().optional(),
  bus_registration: z.string().min(1, 'Bus registration is required'),
  allocation_date: z.string().min(1, 'Allocation date is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
  status: z.string().default('allocated'),
});

interface Bus {
  id: string;
  bus_no: string;
  registration_number: string;
  type: string;
  model: string;
}

interface BusAllocation {
  id: string;
  addon_id: string;
  bus_id?: string;
  bus_registration: string;
  allocation_date: string;
  quantity: number;
  notes?: string;
  status: string;
  created_at: string;
  buses?: Bus;
}

interface BusAllocationModalProps {
  addon: {
    id: string;
    addon_name: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

export function BusAllocationModal({ addon, open, onClose }: BusAllocationModalProps) {
  const [allocations, setAllocations] = useState<BusAllocation[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bus_id: '',
      bus_registration: '',
      allocation_date: new Date().toISOString().split('T')[0],
      quantity: 1,
      notes: '',
      status: 'allocated',
    },
  });

  const loadBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_no, registration_number, type, model')
        .eq('status', 'active')
        .order('bus_no');

      if (error) throw error;
      setBuses(data || []);
    } catch (error: any) {
      console.error('Error loading buses:', error);
    }
  };

  const loadAllocations = async () => {
    if (!addon) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('yutong_addon_bus_allocations')
        .select(`
          *,
          buses (
            id,
            bus_no,
            registration_number,
            type,
            model
          )
        `)
        .eq('addon_id', addon.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllocations(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bus allocations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && addon) {
      loadBuses();
      loadAllocations();
    }
  }, [open, addon]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!addon) return;

    try {
      const allocationData = {
        addon_id: addon.id,
        bus_id: values.bus_id || null,
        bus_registration: values.bus_registration,
        allocation_date: values.allocation_date,
        quantity: values.quantity,
        notes: values.notes,
        status: values.status,
        created_by: null, // This would be set by auth in a real app
      };

      const { error } = await supabase
        .from('yutong_addon_bus_allocations')
        .insert([allocationData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bus allocation added successfully",
      });

      form.reset();
      loadAllocations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return;

    try {
      const { error } = await supabase
        .from('yutong_addon_bus_allocations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Allocation deleted successfully",
      });
      loadAllocations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBusChange = (busId: string) => {
    const selectedBus = buses.find(bus => bus.id === busId);
    if (selectedBus) {
      form.setValue('bus_registration', selectedBus.registration_number || selectedBus.bus_no);
    }
  };

  const columns: ColumnDef<BusAllocation>[] = [
    {
      accessorKey: 'bus_registration',
      header: 'Bus Registration',
    },
    {
      accessorKey: 'allocation_date',
      header: 'Allocation Date',
      cell: ({ row }) => new Date(row.original.allocation_date).toLocaleDateString(),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'allocated' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.notes || 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleDelete(row.original.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Bus Allocations - {addon?.addon_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Allocation Form */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Add New Bus Allocation</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="bus_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Bus (Optional)</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleBusChange(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bus" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {buses.map((bus) => (
                              <SelectItem key={bus.id} value={bus.id}>
                                {bus.bus_no} - {bus.type} ({bus.registration_number})
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
                    name="bus_registration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bus Registration *</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC-1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allocation_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allocation Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="allocated">Allocated</SelectItem>
                            <SelectItem value="installed">Installed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes..." 
                            {...field} 
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Allocation
                </Button>
              </form>
            </Form>
          </div>

          {/* Allocations Table */}
          <div>
            <h3 className="text-lg font-medium mb-4">Current Allocations</h3>
            <DataTable
              columns={columns}
              data={allocations}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}