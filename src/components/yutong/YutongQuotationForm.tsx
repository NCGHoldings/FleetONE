
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
import { useAuth } from '@/hooks/useAuth';
import { QuotationAddOnsSection } from './QuotationAddOnsSection';
import { InlineAddOnsSection } from './InlineAddOnsSection';
import { useActiveCustomerCategories } from '@/hooks/useCustomerCategories';

const formSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Valid email is required'),
  company_name: z.string().optional(),
  finance_company: z.string().optional(),
  customer_type: z.enum(['personal', 'company']).default('personal'),
  customer_category_id: z.string().optional(),
  business_registration_number: z.string().optional(),
  tax_registration_number: z.string().optional(),
  bus_model_id: z.string().min(1, 'Bus model is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(1, 'Unit price is required'),
  discount_percentage: z.number().min(0).max(100).optional(),
  special_features: z.string().optional(),
  delivery_timeline: z.string().optional(),
  payment_terms: z.string().optional(),
  warranty_terms: z.string().optional(),
  valid_days: z.number().min(1).max(365).default(30),
  responsible_person_id: z.string().optional(),
  seat_colour: z.string().optional(),
  curtain_colour: z.string().optional(),
  body_colour: z.string().optional(),
  seat_headrest_logo: z.string().optional(),
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
  capacity: string;
  base_price: number;
}

interface TempAddOn {
  id: string;
  addon_id: string;
  addon_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_free_of_charge?: boolean;
  notes?: string;
}

export function YutongQuotationForm({ onSubmit, onCancel }: YutongQuotationFormProps) {
  const [busModels, setBusModels] = useState<BusModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<BusModel | null>(null);
  const [createdQuotationId, setCreatedQuotationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [tempAddOns, setTempAddOns] = useState<TempAddOn[]>([]);
  const [responsiblePersons, setResponsiblePersons] = useState<any[]>([]);
  const [customizationOptions, setCustomizationOptions] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: customerCategories } = useActiveCustomerCategories();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      discount_percentage: 0,
      valid_days: 30,
      customer_type: 'personal',
    }
  });

  useEffect(() => {
    loadBusModels();
    loadResponsiblePersons();
    loadCustomizationOptions();
  }, []);

  const loadCustomizationOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("yutong_customization_options")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setCustomizationOptions(data || []);
    } catch (error: any) {
      console.error("Error loading customization options:", error);
    }
  };

  const loadResponsiblePersons = async () => {
    try {
      const { data, error } = await supabase
        .from("yutong_responsible_persons")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      setResponsiblePersons(data || []);

      // Set default person if available
      const defaultPerson = data?.find(p => p.is_default);
      if (defaultPerson) {
        form.setValue("responsible_person_id", defaultPerson.id);
      }
    } catch (error: any) {
      console.error("Error loading responsible persons:", error);
    }
  };

  const loadBusModels = async () => {
    try {
      const { data, error } = await supabase
        .from('yutong_bus_models')
        .select('id, bus_name, model_name, capacity, base_price')
        .eq('is_active', true)
        .order('bus_name');

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
      const addOnsTotal = tempAddOns.reduce((sum, addon) => {
        return addon.is_free_of_charge ? sum : sum + addon.total_price;
      }, 0);
      const grandTotal = totalPrice + addOnsTotal;
      
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + data.valid_days);
      
      console.log('Creating quotation with user:', user);
      console.log('User ID:', user?.id);

      const quotationData = {
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        company_name: data.company_name || '',
        bus_model: selectedModel ? `${selectedModel.bus_name} ${selectedModel.model_name}` : '',
        bus_model_id: data.bus_model_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        discount_percentage: data.discount_percentage || 0,
        total_price: grandTotal,
        valid_until: validUntil.toISOString().split('T')[0],
        valid_days: data.valid_days,
        status: 'draft',
        special_features: data.special_features || '',
        delivery_timeline: data.delivery_timeline || '',
        payment_terms: data.payment_terms || '',
        warranty_terms: data.warranty_terms || '',
        responsible_person_id: data.responsible_person_id || null,
        seat_colour: data.seat_colour || null,
        curtain_colour: data.curtain_colour || null,
        body_colour: data.body_colour || null,
        seat_headrest_logo: data.seat_headrest_logo || null,
        finance_company: data.finance_company || null,
        customer_type: data.customer_type || 'personal',
        business_registration_number: data.business_registration_number || null,
        tax_registration_number: data.tax_registration_number || null,
        created_by: user?.id
      };

      const { data: insertedData, error } = await supabase
        .from('yutong_quotations')
        .insert([quotationData as any])
        .select()
        .single();

      console.log('Inserted data:', insertedData);
      console.log('Insert error:', error);

      if (error) throw error;

      // Save add-ons if any
      if (tempAddOns.length > 0) {
        const addOnsData = tempAddOns.map(addon => ({
          quotation_id: insertedData.id,
          addon_id: addon.addon_id,
          quantity: addon.quantity,
          unit_price: addon.unit_price,
          total_price: addon.total_price,
          is_free_of_charge: addon.is_free_of_charge || false,
          notes: addon.notes
        }));

        const { error: addOnsError } = await supabase
          .from('yutong_quotation_addons')
          .insert(addOnsData);

        if (addOnsError) throw addOnsError;
      }

      toast({
        title: "Success",
        description: `Quotation created successfully${tempAddOns.length > 0 ? ` with ${tempAddOns.length} add-ons` : ''}.`
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

  const handleFinalSubmit = () => {
    onSubmit();
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Yutong Bus Quotation</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="addons" disabled={!createdQuotationId}>
              Add-ons {createdQuotationId ? '✓' : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
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
                name="finance_company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finance Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Finance company (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="personal">Personal Customer</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('customer_type') === 'company' && (
                <>
                  <FormField
                    control={form.control}
                    name="business_registration_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Business registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tax_registration_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Tax registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

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
                            {model.bus_name} ({model.capacity} seats)
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
                      value={field.value || ''} 
                      onChange={field.onChange}
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
                      <Input 
                        placeholder="e.g., 3-4 months" 
                        value={field.value || ''} 
                        onChange={field.onChange}
                      />
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
                      <Textarea 
                        placeholder="e.g., 30% advance, balance on delivery" 
                        value={field.value || ''} 
                        onChange={field.onChange}
                        className="min-h-[60px]"
                      />
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
                      <Textarea 
                        placeholder="e.g., Engine - 3 years, Wearable Parts - 1 month" 
                        value={field.value || ''} 
                        onChange={field.onChange}
                        className="min-h-[60px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="responsible_person_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsible Person</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select responsible person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {responsiblePersons.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} {person.position && `- ${person.position}`} {person.is_default && "(Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vehicle Customization Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Vehicle Customization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="seat_colour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Colour</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select seat colour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customizationOptions
                            .filter(opt => opt.option_type === 'seat_colour')
                            .map((opt) => (
                              <SelectItem key={opt.id} value={opt.option_value}>
                                {opt.option_value}
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
                  name="curtain_colour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Curtain Colour</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select curtain colour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customizationOptions
                            .filter(opt => opt.option_type === 'curtain_colour')
                            .map((opt) => (
                              <SelectItem key={opt.id} value={opt.option_value}>
                                {opt.option_value}
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
                  name="body_colour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Colour</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select body colour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customizationOptions
                            .filter(opt => opt.option_type === 'body_colour')
                            .map((opt) => (
                              <SelectItem key={opt.id} value={opt.option_value}>
                                {opt.option_value}
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
                  name="seat_headrest_logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Headrest Logo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select headrest logo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customizationOptions
                            .filter(opt => opt.option_type === 'headrest_logo')
                            .map((opt) => (
                              <SelectItem key={opt.id} value={opt.option_value}>
                                {opt.option_value}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Add-ons Section */}
            <div className="space-y-4">
              <InlineAddOnsSection 
                addOns={tempAddOns} 
                onAddOnsChange={setTempAddOns}
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
                <div className="flex justify-between">
                  <span>Bus Total:</span>
                  <span>LKR {calculateTotalPrice().toLocaleString()}</span>
                </div>
                {tempAddOns.length > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons Total:</span>
                    <span>LKR {tempAddOns.reduce((sum, addon) => addon.is_free_of_charge ? sum : sum + addon.total_price, 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>LKR {(calculateTotalPrice() + tempAddOns.reduce((sum, addon) => addon.is_free_of_charge ? sum : sum + addon.total_price, 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                Create Quotation {tempAddOns.length > 0 && `with ${tempAddOns.length} Add-ons`}
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="addons" className="space-y-4">
        <QuotationAddOnsSection quotationId={createdQuotationId} />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setActiveTab("basic")}
          >
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
