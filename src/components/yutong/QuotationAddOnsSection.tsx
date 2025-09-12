import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ColumnDef } from '@tanstack/react-table';

const formSchema = z.object({
  addon_id: z.string().min(1, 'Add-on is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  notes: z.string().optional(),
});

interface AddOn {
  id: string;
  addon_name: string;
  price: number;
  category: string;
}

interface QuotationAddOn {
  id: string;
  quotation_id: string;
  addon_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  yutong_addons?: AddOn;
}

interface QuotationAddOnsSectionProps {
  quotationId: string | null;
  onAddOnsChange?: (addOns: QuotationAddOn[]) => void;
}

export function QuotationAddOnsSection({ quotationId, onAddOnsChange }: QuotationAddOnsSectionProps) {
  const [quotationAddOns, setQuotationAddOns] = useState<QuotationAddOn[]>([]);
  const [availableAddOns, setAvailableAddOns] = useState<AddOn[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      addon_id: '',
      quantity: 1,
      unit_price: 0,
      notes: '',
    },
  });

  const loadAvailableAddOns = async () => {
    try {
      console.log('Loading available add-ons...');
      const { data, error } = await supabase
        .from('yutong_addons')
        .select('id, addon_name, price, category')
        .eq('is_active', true)
        .order('addon_name');

      if (error) throw error;
      console.log('Add-ons loaded:', data);
      setAvailableAddOns(data || []);
    } catch (error: any) {
      console.error('Error loading add-ons:', error);
      toast({
        title: "Error",
        description: "Failed to load add-ons",
        variant: "destructive",
      });
    }
  };

  const loadQuotationAddOns = async () => {
    if (!quotationId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('yutong_quotation_addons')
        .select(`
          *,
          yutong_addons (
            id,
            addon_name,
            price,
            category
          )
        `)
        .eq('quotation_id', quotationId)
        .order('created_at');

      if (error) throw error;
      setQuotationAddOns(data || []);
      onAddOnsChange?.(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load quotation add-ons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableAddOns();
    if (quotationId) {
      loadQuotationAddOns();
    }
  }, [quotationId]);

  const handleAddOnChange = (addonId: string) => {
    const selectedAddOn = availableAddOns.find(addon => addon.id === addonId);
    if (selectedAddOn) {
      form.setValue('unit_price', selectedAddOn.price);
    }
  };

  const calculateTotalPrice = () => {
    const quantity = form.watch('quantity') || 0;
    const unitPrice = form.watch('unit_price') || 0;
    return quantity * unitPrice;
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!quotationId) {
      toast({
        title: "Error",
        description: "No quotation selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalPrice = calculateTotalPrice();
      
      const addOnData = {
        quotation_id: quotationId,
        addon_id: values.addon_id,
        quantity: values.quantity,
        unit_price: values.unit_price,
        total_price: totalPrice,
        notes: values.notes,
      };

      const { error } = await supabase
        .from('yutong_quotation_addons')
        .insert([addOnData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Add-on added to quotation successfully",
      });

      form.reset();
      setShowDialog(false);
      loadQuotationAddOns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this add-on from the quotation?')) return;

    try {
      const { error } = await supabase
        .from('yutong_quotation_addons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Add-on removed from quotation",
      });
      loadQuotationAddOns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<QuotationAddOn>[] = [
    {
      accessorKey: 'yutong_addons.addon_name',
      header: 'Add-on Name',
      cell: ({ row }) => row.original.yutong_addons?.addon_name || 'N/A',
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
    },
    {
      accessorKey: 'unit_price',
      header: 'Unit Price (LKR)',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.unit_price.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'total_price',
      header: 'Total Price (LKR)',
      cell: ({ row }) => (
        <span className="font-bold text-primary">
          {row.original.total_price.toLocaleString()}
        </span>
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

  if (!quotationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quotation Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please save the quotation first to add add-ons.</p>
        </CardContent>
      </Card>
    );
  }

  const totalAddOnsValue = quotationAddOns.reduce((sum, addon) => sum + addon.total_price, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Quotation Add-ons</CardTitle>
            {quotationAddOns.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Total Add-ons Value: LKR {totalAddOnsValue.toLocaleString()}
              </p>
            )}
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Add-on
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Add-on to Quotation</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="addon_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Add-on *</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          handleAddOnChange(value);
                        }}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select add-on" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableAddOns.map((addon) => (
                              <SelectItem key={addon.id} value={addon.id}>
                                {addon.addon_name} - LKR {addon.price.toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (LKR) *</FormLabel>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes for this add-on..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price Summary */}
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Add-on Price Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Unit Price:</span>
                        <span>LKR {(form.watch('unit_price') || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span>{form.watch('quantity') || 0}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total Price:</span>
                        <span>LKR {calculateTotalPrice().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Add to Quotation
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
          data={quotationAddOns}
        />
      </CardContent>
    </Card>
  );
}