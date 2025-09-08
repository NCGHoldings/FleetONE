import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QuotationAddOnsSection } from './QuotationAddOnsSection';
import { InlineAddOnsSection } from './InlineAddOnsSection';

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
  bus_name: string;
  model_name: string;
  capacity: number;
  base_price: number;
}

interface Customer {
  id: string;
  customer_code: string;
  company_name: string;
  contact_person?: string;
  phone: string;
  email?: string;
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

export function YutongQuotationForm({ onSubmit, onCancel }: YutongQuotationFormProps) {
  const [busModels, setBusModels] = useState<BusModel[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedModel, setSelectedModel] = useState<BusModel | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [createdQuotationId, setCreatedQuotationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [tempAddOns, setTempAddOns] = useState<TempAddOn[]>([]);
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
    loadCustomers();
  }, []);

  const loadBusModels = async () => {
    try {
      const { data, error } = await supabase
        .from('yutong_bus_models')
        .select('*')
        .eq('is_active', true)
        .order('bus_name');

      if (error) {
        console.error('Error loading bus models:', error);
        toast({
          title: "Error",
          description: "Failed to load bus models",
          variant: "destructive",
        });
        return;
      }

      setBusModels(data || []);
    } catch (error) {
      console.error('Error loading bus models:', error);
      toast({
        title: "Error", 
        description: "Failed to load bus models",
        variant: "destructive",
      });
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('yutong_customers')
        .select('*')
        .eq('is_active', true)
        .order('company_name');

      if (error) {
        console.error('Error loading customers:', error);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    
    if (customer) {
      // Auto-fill customer details
      form.setValue('customer_name', customer.contact_person || '');
      form.setValue('customer_phone', customer.phone);
      form.setValue('customer_email', customer.email || '');
      form.setValue('company_name', customer.company_name);
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
    const addOnsTotal = tempAddOns.reduce((sum, addon) => sum + addon.total_price, 0);
    
    return subtotal - discountAmount + addOnsTotal;
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      const totalPrice = calculateTotalPrice();
      const quotationNo = `YTQ-${Date.now()}`;

      const quotationData = {
        quotation_no: quotationNo,
        customer_id: selectedCustomer?.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        company_name: data.company_name,
        bus_model: selectedModel ? `${selectedModel.bus_name} ${selectedModel.model_name}` : 'Unknown Model',
        bus_model_id: data.bus_model_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        discount_percentage: data.discount_percentage || 0,
        subtotal: data.quantity * data.unit_price,
        total_price: totalPrice,
        special_features: data.special_features,
        delivery_timeline: data.delivery_timeline,
        payment_terms: data.payment_terms,
        warranty_terms: data.warranty_terms,
        valid_until: new Date(Date.now() + (data.valid_days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        status: 'draft',
      };

      const { data: quotation, error } = await supabase
        .from('yutong_quotations')
        .insert([quotationData])
        .select()
        .single();

      if (error) throw error;

      setCreatedQuotationId(quotation.id);

      // Handle add-ons if any
      if (tempAddOns.length > 0) {
        const addOnInserts = tempAddOns.map(addon => ({
          quotation_id: quotation.id,
          addon_id: addon.addon_id,
          quantity: addon.quantity,
          unit_price: addon.unit_price,
          total_price: addon.total_price,
          notes: addon.notes,
        }));

        const { error: addOnError } = await supabase
          .from('yutong_quotation_addons')
          .insert(addOnInserts);

        if (addOnError) {
          console.error('Error saving add-ons:', addOnError);
        }
      }

      toast({
        title: "Success",
        description: "Yutong quotation created successfully",
      });

      onSubmit();
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    }
  };

  const handleFinalSubmit = async () => {
    // Trigger form submission from the basic info tab
    const formData = form.getValues();
    
    // Validate required fields
    if (!formData.customer_name || !formData.customer_phone || !formData.customer_email || !formData.bus_model_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields in the Basic Information tab",
        variant: "destructive",
      });
      setActiveTab('basic');
      return;
    }

    await handleFormSubmit(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Create Yutong Bus Quotation</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Customer Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Customer Information</h3>
                  
                  <FormField
                    name="existing_customer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Existing Customer (Optional)</FormLabel>
                        <Select onValueChange={handleCustomerChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select existing customer or create new" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.company_name} ({customer.customer_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

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
                                {model.bus_name} {model.model_name} - {model.capacity} seats
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                      name="discount_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount (%)</FormLabel>
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

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                  
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

                    <FormField
                      control={form.control}
                      name="valid_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid Days</FormLabel>
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
                      <span>Discount ({form.watch('discount_percentage') || 0}%):</span>
                      <span>-LKR {(((form.watch('quantity') || 0) * (form.watch('unit_price') || 0)) * ((form.watch('discount_percentage') || 0) / 100)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Add-ons:</span>
                      <span>LKR {tempAddOns.reduce((sum, addon) => sum + addon.total_price, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>LKR {calculateTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Quotation
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="addons" className="space-y-4">
            <InlineAddOnsSection 
              addOns={tempAddOns} 
              onAddOnsChange={setTempAddOns} 
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={() => setActiveTab('basic')}>
                Back to Basic Info
              </Button>
              <Button onClick={handleFinalSubmit}>
                Complete Quotation
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}