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
import { InlineAddOnsSection } from './InlineAddOnsSection';

const formSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Valid email is required'),
  company_name: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(1, 'Unit price is required'),
  discount_amount: z.number().min(0).optional(),
  special_features: z.string().optional(),
  delivery_timeline: z.string().optional(),
  payment_terms: z.string().optional(),
  warranty_terms: z.string().optional(),
  responsible_person: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name?: string;
  bus_model: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  total_price: number;
  special_features?: string;
  delivery_timeline?: string;
  payment_terms?: string;
  warranty_terms?: string;
  responsible_person?: string;
}

interface YutongEditQuotationModalProps {
  quotation: YutongQuotation | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function YutongEditQuotationModal({ quotation, open, onClose, onSuccess }: YutongEditQuotationModalProps) {
  const { toast } = useToast();
  const [quotationAddOns, setQuotationAddOns] = useState<any[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      company_name: '',
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      special_features: '',
      delivery_timeline: '',
      payment_terms: '',
      warranty_terms: '',
      responsible_person: '',
    }
  });

  // Load quotation data and add-ons when dialog opens
  useEffect(() => {
    if (quotation && open) {
      form.reset({
        customer_name: quotation.customer_name || '',
        customer_phone: quotation.customer_phone || '',
        customer_email: quotation.customer_email || '',
        company_name: quotation.company_name || '',
        quantity: quotation.quantity || 1,
        unit_price: quotation.unit_price || 0,
        discount_amount: quotation.discount_amount || 0,
        special_features: quotation.special_features || '',
        delivery_timeline: quotation.delivery_timeline || '',
        payment_terms: quotation.payment_terms || '',
        warranty_terms: quotation.warranty_terms || '',
        responsible_person: quotation.responsible_person || '',
      });

      // Load existing add-ons
      loadQuotationAddOns();
    }
  }, [quotation, open, form]);

  const loadQuotationAddOns = async () => {
    if (!quotation?.id) return;

    try {
      const { data, error } = await supabase
        .from('yutong_quotation_addons')
        .select(`
          id,
          addon_id,
          quantity,
          unit_price,
          total_price,
          is_free_of_charge,
          notes,
          yutong_addons (
            addon_name,
            category
          )
        `)
        .eq('quotation_id', quotation.id);

      if (error) throw error;
      
      // Transform the data to match TempAddOn structure
      const transformedAddOns = (data || []).map((item: any) => ({
        id: item.id,
        addon_id: item.addon_id,
        addon_name: item.yutong_addons?.addon_name || '',
        category: item.yutong_addons?.category || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_free_of_charge: item.is_free_of_charge || false,
        notes: item.notes || '',
      }));
      
      setQuotationAddOns(transformedAddOns);
    } catch (error) {
      console.error('Error loading add-ons:', error);
    }
  };

  const calculateTotalPrice = () => {
    const quantity = form.watch('quantity') || 0;
    const unitPrice = form.watch('unit_price') || 0;
    const discountAmount = form.watch('discount_amount') || 0;
    
    const subtotal = quantity * unitPrice;
    return subtotal - discountAmount;
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      if (!quotation) {
        toast({
          title: "Error",
          description: "No quotation selected for editing",
          variant: "destructive",
        });
        return;
      }

      const totalPrice = calculateTotalPrice();

      // Update quotation
      const { error: quotationError } = await supabase
        .from('yutong_quotations')
        .update({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          company_name: data.company_name,
          quantity: data.quantity,
          unit_price: data.unit_price,
          discount_amount: data.discount_amount || 0,
          total_price: totalPrice,
          special_features: data.special_features,
          delivery_timeline: data.delivery_timeline,
          payment_terms: data.payment_terms,
          warranty_terms: data.warranty_terms,
          responsible_person: data.responsible_person,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quotation.id);

      if (quotationError) throw quotationError;

      // Update add-ons: Delete existing and insert new ones
      const { error: deleteError } = await supabase
        .from('yutong_quotation_addons')
        .delete()
        .eq('quotation_id', quotation.id);

      if (deleteError) throw deleteError;

      // Insert new add-ons
      if (quotationAddOns.length > 0) {
        const addOnsToInsert = quotationAddOns.map(addon => ({
          quotation_id: quotation.id,
          addon_id: addon.addon_id,
          quantity: addon.quantity,
          unit_price: addon.unit_price,
          total_price: addon.total_price,
          is_free_of_charge: addon.is_free_of_charge || false,
          notes: addon.notes || null,
        }));

        const { error: insertError } = await supabase
          .from('yutong_quotation_addons')
          .insert(addOnsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Quotation updated successfully",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to update quotation",
        variant: "destructive",
      });
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Quotation - {quotation.quotation_no}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bus Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bus Information</h3>
              
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm"><strong>Bus Model:</strong> {quotation.bus_model}</p>
                <p className="text-xs text-muted-foreground mt-1">Bus model cannot be changed after quotation creation</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))} 
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
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (LKR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Add-ons Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Add-Ons</h3>
              <InlineAddOnsSection
                addOns={quotationAddOns}
                onAddOnsChange={setQuotationAddOns}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              
              <FormField
                control={form.control}
                name="responsible_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Person</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="delivery_timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Timeline</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 3-4 months" />
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
                      <Textarea {...field} />
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
                      <Textarea {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Price Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>LKR {((form.watch('quantity') || 0) * (form.watch('unit_price') || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-LKR {(form.watch('discount_amount') || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>LKR {calculateTotalPrice().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Update Quotation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
