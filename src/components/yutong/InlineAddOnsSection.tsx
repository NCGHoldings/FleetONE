import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface TempAddOn {
  id: string;
  addon_id: string;
  addon_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

interface InlineAddOnsSectionProps {
  addOns: TempAddOn[];
  onAddOnsChange: (addOns: TempAddOn[]) => void;
}

export function InlineAddOnsSection({ addOns, onAddOnsChange }: InlineAddOnsSectionProps) {
  const [availableAddOns, setAvailableAddOns] = useState<AddOn[]>([]);
  const [showDialog, setShowDialog] = useState(false);
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

  useEffect(() => {
    loadAvailableAddOns();
  }, []);

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
    try {
      const selectedAddOn = availableAddOns.find(addon => addon.id === values.addon_id);
      if (!selectedAddOn) {
        toast({
          title: "Error",
          description: "Selected add-on not found",
          variant: "destructive",
        });
        return;
      }

      const totalPrice = calculateTotalPrice();
      
      const newAddOn: TempAddOn = {
        id: `temp-${Date.now()}`,
        addon_id: values.addon_id,
        addon_name: selectedAddOn.addon_name,
        category: selectedAddOn.category,
        quantity: values.quantity,
        unit_price: values.unit_price,
        total_price: totalPrice,
        notes: values.notes,
      };

      onAddOnsChange([...addOns, newAddOn]);

      toast({
        title: "Success",
        description: "Add-on added to quotation",
      });

      form.reset();
      setShowDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemove = (id: string) => {
    const updatedAddOns = addOns.filter(addon => addon.id !== id);
    onAddOnsChange(updatedAddOns);
    toast({
      title: "Success",
      description: "Add-on removed from quotation",
    });
  };

  const totalAddOnsValue = addOns.reduce((sum, addon) => sum + addon.total_price, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Add-ons</CardTitle>
            {addOns.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Total Add-ons Value: LKR {totalAddOnsValue.toLocaleString()}
              </p>
            )}
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Add-on
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Add-on to Quotation</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit(handleSubmit)(e);
                }} className="space-y-4">
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
        {addOns.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No add-ons added yet. Click "Add Add-on" to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {addOns.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{addon.addon_name}</h4>
                    <Badge variant="outline">{addon.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Quantity: {addon.quantity} × LKR {addon.unit_price.toLocaleString()} = 
                    <span className="font-bold text-primary ml-1">
                      LKR {addon.total_price.toLocaleString()}
                    </span>
                  </div>
                  {addon.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{addon.notes}</p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(addon.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}