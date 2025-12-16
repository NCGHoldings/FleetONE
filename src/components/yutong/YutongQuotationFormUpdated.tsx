import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, Link2 } from 'lucide-react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { QuotationAddOnsSection } from './QuotationAddOnsSection';
import { InlineAddOnsSection } from './InlineAddOnsSection';

const formSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Valid email is required').optional().or(z.literal('')),
  company_name: z.string().optional(),
  customer_address: z.string().optional(),
  contact_person: z.string().optional(),
  finance_company: z.string().optional(),
  customer_type: z.enum(['personal', 'company']).default('personal'),
  business_registration_number: z.string().optional(),
  tax_registration_number: z.string().optional(),
  referral_agent_id: z.string().optional(),
  bus_model_id: z.string().min(1, 'Bus model is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(1, 'Unit price is required'),
  discount_amount: z.number().min(0).optional(),
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

// Interface for inquiry data passed from Vehicle Inquiry Hub
interface InquiryInitialData {
  inquiryId: string;
  inquiryNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName: string;
  address: string;
  interestedModel: string;
  quantity: number;
}

interface YutongQuotationFormProps {
  onSubmit: () => void;
  onCancel: () => void;
  initialData?: InquiryInitialData | null;
}

interface BusModel {
  id: string;
  bus_name: string;
  model_name: string;
  capacity: string;
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
  is_free_of_charge?: boolean;
  notes?: string;
}

export function YutongQuotationForm({ onSubmit, onCancel, initialData }: YutongQuotationFormProps) {
  const [busModels, setBusModels] = useState<BusModel[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedModel, setSelectedModel] = useState<BusModel | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [createdQuotationId, setCreatedQuotationId] = useState<string | null>(null);
  const [tempAddOns, setTempAddOns] = useState<TempAddOn[]>([]);
  const [responsiblePersons, setResponsiblePersons] = useState<any[]>([]);
  const [customizationOptions, setCustomizationOptions] = useState<any[]>([]);
  const [referralAgents, setReferralAgents] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: initialData?.quantity || 1,
      discount_amount: 0,
      valid_days: 30,
      customer_type: 'personal',
      customer_name: initialData?.customerName || '',
      customer_phone: initialData?.customerPhone || '',
      customer_email: initialData?.customerEmail || '',
      company_name: initialData?.companyName || '',
      customer_address: initialData?.address || '',
      contact_person: '',
      finance_company: '',
      referral_agent_id: '',
    }
  });

  useEffect(() => {
    loadBusModels();
    loadCustomers();
    loadResponsiblePersons();
    loadCustomizationOptions();
    loadReferralAgents();
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

  const loadReferralAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_agents')
        .select('id, agent_name')
        .eq('status', 'active')
        .order('agent_name');

      if (error) throw error;
      setReferralAgents(data || []);
    } catch (error: any) {
      console.error('Error loading referral agents:', error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    
    if (customer) {
      // Auto-fill customer details based on customer type
      form.setValue('company_name', customer.company_name);
      form.setValue('customer_phone', customer.phone);
      form.setValue('customer_email', customer.email || '');
      form.setValue('contact_person', customer.contact_person || '');
      // Set customer_name based on type
      if (customer.company_name) {
        form.setValue('customer_type', 'company');
        form.setValue('customer_name', customer.company_name);
      } else {
        form.setValue('customer_type', 'personal');
        form.setValue('customer_name', customer.contact_person || '');
      }
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
    const discountAmount = form.watch('discount_amount') || 0;
    
    const subtotal = quantity * unitPrice;
    const addOnsTotal = tempAddOns.reduce((sum, addon) => {
      return addon.is_free_of_charge ? sum : sum + addon.total_price;
    }, 0);
    
    return subtotal - discountAmount + addOnsTotal;
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create quotations",
          variant: "destructive",
        });
        return;
      }

      const totalPrice = calculateTotalPrice();

      const quotationData = {
        customer_id: selectedCustomer?.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        company_name: data.company_name,
        customer_address: data.customer_address || null,
        contact_person: data.contact_person || null,
        bus_model: selectedModel ? `${selectedModel.bus_name} ${selectedModel.model_name}` : 'Unknown Model',
        bus_model_id: data.bus_model_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        discount_amount: data.discount_amount || 0,
        total_price: totalPrice,
        special_features: data.special_features,
        delivery_timeline: data.delivery_timeline,
        payment_terms: data.payment_terms,
        warranty_terms: data.warranty_terms,
        valid_until: new Date(Date.now() + (data.valid_days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        status: 'draft',
        created_by: user.id,
        responsible_person_id: data.responsible_person_id || null,
        seat_colour: data.seat_colour || null,
        curtain_colour: data.curtain_colour || null,
        body_colour: data.body_colour || null,
        seat_headrest_logo: data.seat_headrest_logo || null,
        finance_company: data.finance_company || null,
        customer_type: data.customer_type || 'personal',
        business_registration_number: data.business_registration_number || null,
        tax_registration_number: data.tax_registration_number || null,
        referral_agent_id: data.referral_agent_id || null,
        inquiry_id: initialData?.inquiryId || null,
      };

      const { data: quotation, error } = await supabase
        .from('yutong_quotations')
        .insert([quotationData as any])
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
          is_free_of_charge: addon.is_free_of_charge || false,
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
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      toast({
        title: "Error",
        description: error.message || error.details || "Failed to create quotation. Please check the console for details.",
        variant: "destructive",
      });
    }
  };


  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create Yutong Bus Quotation
            {initialData?.inquiryNumber && (
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
                <Link2 className="h-3 w-3 mr-1" />
                {initialData.inquiryNumber}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Inquiry Reference Banner */}
        {initialData?.inquiryId && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">Generating Quotation Against Inquiry</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              <div className="flex flex-wrap gap-4 mt-1">
                <span><strong>Inquiry No:</strong> {initialData.inquiryNumber}</span>
                <span><strong>Customer:</strong> {initialData.customerName}</span>
                {initialData.interestedModel && (
                  <span><strong>Model Interest:</strong> {initialData.interestedModel}</span>
                )}
              </div>
              <p className="text-sm mt-2 opacity-80">This quotation will be automatically linked to the inquiry for tracking.</p>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              
              {/* 1. Select Existing Customer */}
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

              {/* 2. Customer Type Selection */}
              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              {/* 3. Dynamic Fields Based on Customer Type */}
              {form.watch('customer_type') === 'personal' ? (
                <>
                  {/* Personal Customer Fields */}
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter customer name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter customer address" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter phone number" />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} placeholder="Optional" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter contact person name if different" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <>
                  {/* Company Fields */}
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter company name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter contact person name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter company address" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter phone number" />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} placeholder="Optional" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Finance Company - Available for Both Types */}
              <FormField
                control={form.control}
                name="finance_company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finance Company (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter finance company name if applicable" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">If financed, enter the finance company name</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Referral Agent - Internal Only */}
              <FormField
                control={form.control}
                name="referral_agent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Agent (Internal Only)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select referral agent (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {referralAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.agent_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">For internal tracking only - will not appear on quotation</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <h3 className="text-lg font-semibold">Add-ons</h3>
              <InlineAddOnsSection 
                addOns={tempAddOns} 
                onAddOnsChange={setTempAddOns} 
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              
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
                <h4 className="font-semibold">Vehicle Customization</h4>
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
                  <span>Discount:</span>
                  <span>-LKR {(form.watch('discount_amount') || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Add-ons:</span>
                  <span>LKR {tempAddOns.reduce((sum, addon) => addon.is_free_of_charge ? sum : sum + addon.total_price, 0).toLocaleString()}</span>
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
      </DialogContent>
    </Dialog>
  );
}