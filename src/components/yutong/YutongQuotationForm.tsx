
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Valid email is required'),
  company_name: z.string().optional(),
  bus_model_id: z.string().min(1, 'Bus model is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(1, 'Unit price is required'),
  discount_percentage: z.number().min(0).max(100).optional(),
  special_features: z.string().optional(),
  delivery_timeline: z.string().optional(),
  payment_terms: z.string().optional(),
  warranty_terms: z.string().optional(),
  valid_days: z.number().min(1).max(365).default(30),
});

type FormData = z.infer<typeof formSchema>;

interface YutongQuotationFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

interface BusModel {
  id: string;
  model_name: string;
  capacity: number;
  base_price: number;
}

export function YutongQuotationForm({ onSubmit, onCancel }: YutongQuotationFormProps) {
  const [busModels, setBusModels] = useState<BusModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<BusModel | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      discount_percentage: 0,
      valid_days: 30,
    }
  });

  useEffect(() => {
    loadBusModels();
  }, []);

  const loadBusModels = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('yutong_bus_models')
        .select('*')
        .eq('is_active', true)
        .order('model_name');

      if (error) throw error;
      setBusModels(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bus models",
        variant: "destructive"
      });
    }
  };

  const handleModelChange = (modelId: string) => {
    const model = busModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      form.setValue('unit_price', model.base_price);
    }
  };

  const calculateTotalPrice = () => {
    const quantity = form.watch('quantity') || 0;
    const unitPrice = form.watch('unit_price') || 0;
    const discountPercentage = form.watch('discount_percentage') || 0;
    
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercentage / 100);
    return subtotal - discountAmount;
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      const totalPrice = calculateTotalPrice();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + data.valid_days);

      const quotationData = {
        ...data,
        bus_model: selectedModel?.model_name || '',
        total_price: totalPrice,
        valid_until: validUntil.toISOString().split('T')[0],
        status: 'draft'
      };

      const { error } = await (supabase as any)
        .from('yutong_quotations')
        .insert([quotationData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quotation created successfully"
      });

      onSubmit();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Yutong Bus Quotation</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
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
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bus_model_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bus Model *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleModelChange(value);
                    }}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bus model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {busModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.model_name} ({model.capacity} seats)
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

              <FormField
                control={form.control}
                name="discount_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
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
                name="valid_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid for (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="special_features"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Features</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special features or customizations" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="delivery_timeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Timeline</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3-4 months" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 30% advance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warranty_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Terms</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2 years" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Price Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span>LKR {(form.watch('unit_price') || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{form.watch('quantity') || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>LKR {((form.watch('quantity') || 0) * (form.watch('unit_price') || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount ({form.watch('discount_percentage') || 0}%):</span>
                  <span>-LKR {(((form.watch('quantity') || 0) * (form.watch('unit_price') || 0)) * ((form.watch('discount_percentage') || 0) / 100)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total Price:</span>
                  <span>LKR {calculateTotalPrice().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                Create Quotation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
