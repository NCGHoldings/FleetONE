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
import { useAuth } from '@/hooks/useAuth';

const formSchema = z.object({
  customer_type: z.enum(['personal', 'company']).default('personal'),
  customer_category_id: z.string().optional(),
  customer_name: z.string().min(1, 'Customer name is required'),
  representative_name: z.string().optional(),
  designation: z.string().optional(),
  company_name: z.string().optional(),
  customer_address: z.string().optional(),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Valid email is required').optional().or(z.literal('')),
  finance_company: z.string().optional(),
  contact_person: z.string().optional(),
  business_registration: z.string().optional(),
  tax_registration: z.string().optional(),
  model_id: z.string().min(1, 'Vehicle model is required'),
  color: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(1, 'Unit price is required'),
  discount: z.number().min(0).max(100).optional(),
  additional_charges: z.number().optional(),
  additional_charges_description: z.string().optional(),
  payment_terms: z.string().optional(),
  delivery_terms: z.string().optional(),
  warranty_terms: z.string().optional(),
  validity_period: z.string().default('30 days'),
  notes: z.string().optional(),
  referral_agent_id: z.string().optional(),
  responsible_person_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ResponsiblePerson {
  id: string;
  person_name: string;
  designation?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
}

interface VehicleModel {
  id: string;
  vehicle_name: string;
  model_name: string;
  brand: string;
  category: string;
  engine_cc?: string;
  transmission?: string;
  fuel_type?: string;
  base_price: number;
}

interface LightVehicleQuotationFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export function LightVehicleQuotationForm({ onSubmit, onCancel }: LightVehicleQuotationFormProps) {
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [referralAgents, setReferralAgents] = useState<any[]>([]);
  const [responsiblePersons, setResponsiblePersons] = useState<ResponsiblePerson[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: customerCategories } = useActiveCustomerCategories();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      discount: 0,
      additional_charges: 0,
      validity_period: '30 days',
      customer_type: 'personal',
    }
  });

  useEffect(() => {
    loadVehicleModels();
    loadReferralAgents();
    loadResponsiblePersons();
  }, []);

  const loadVehicleModels = async () => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_models')
        .select('id, vehicle_name, model_name, brand, category, engine_cc, transmission, fuel_type, base_price')
        .eq('is_active', true)
        .order('vehicle_name');

      if (error) throw error;
      setVehicleModels(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load vehicle models",
        variant: "destructive"
      });
    }
  };

  const loadReferralAgents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('referral_agents')
        .select('id, name, phone')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setReferralAgents(data || []);
    } catch (error: any) {
      console.error('Error loading referral agents:', error);
    }
  };

  const loadResponsiblePersons = async () => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_responsible_persons')
        .select('id, person_name, designation, phone, email, is_default')
        .eq('is_active', true)
        .order('person_name');

      if (error) throw error;
      setResponsiblePersons(data || []);
      
      // Auto-select default person
      const defaultPerson = data?.find((p: any) => p.is_default);
      if (defaultPerson) {
        form.setValue('responsible_person_id', defaultPerson.id);
      }
    } catch (error: any) {
      console.error('Error loading responsible persons:', error);
    }
  };

  const handleModelChange = (modelId: string) => {
    const model = vehicleModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      form.setValue('unit_price', model.base_price);
    }
  };

  const calculateTotals = () => {
    const quantity = form.watch('quantity') || 0;
    const unitPrice = form.watch('unit_price') || 0;
    const discount = form.watch('discount') || 0;
    const additionalCharges = form.watch('additional_charges') || 0;
    
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount + additionalCharges;
    return { subtotal, discountAmount, total };
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      const { subtotal, discountAmount, total } = calculateTotals();
      
      const quotationData = {
        customer_type: data.customer_type,
        customer_name: data.customer_name,
        representative_name: data.representative_name || null,
        designation: data.designation || null,
        company_name: data.company_name || null,
        customer_address: data.customer_address || null,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        finance_company: data.finance_company || null,
        contact_person: data.contact_person || null,
        business_registration: data.business_registration || null,
        tax_registration: data.tax_registration || null,
        model_id: data.model_id,
        vehicle_name: selectedModel ? `${selectedModel.vehicle_name} ${selectedModel.model_name}` : '',
        brand: selectedModel?.brand || null,
        category: selectedModel?.category || null,
        engine_cc: selectedModel?.engine_cc || null,
        transmission: selectedModel?.transmission || null,
        fuel_type: selectedModel?.fuel_type || null,
        color: data.color || null,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_price: subtotal,
        discount: discountAmount,
        additional_charges: data.additional_charges || 0,
        additional_charges_description: data.additional_charges_description || null,
        grand_total: total,
        payment_terms: data.payment_terms || null,
        delivery_terms: data.delivery_terms || null,
        warranty_terms: data.warranty_terms || null,
        validity_period: data.validity_period,
        notes: data.notes || null,
        status: 'draft',
        referral_agent_id: data.referral_agent_id || null,
        responsible_person_id: data.responsible_person_id || null,
        customer_category_id: data.customer_category_id || null,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('lightvehicle_quotations')
        .insert([quotationData as any]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quotation created successfully."
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

  const customerType = form.watch('customer_type');
  const { subtotal, discountAmount, total } = calculateTotals();

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Light Vehicle Quotation</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{customerType === 'company' ? 'Company Name *' : 'Customer Name *'}</FormLabel>
                      <FormControl>
                        <Input placeholder={customerType === 'company' ? 'Company name' : 'Customer name'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {customerType === 'company' && (
                  <>
                    <FormField
                      control={form.control}
                      name="representative_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Representative Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Representative name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="Designation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_registration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Registration</FormLabel>
                          <FormControl>
                            <Input placeholder="Business registration number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tax_registration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Registration</FormLabel>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact person" {...field} />
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
                        <Input placeholder="Finance company (if applicable)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vehicle Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="model_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Model *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        handleModelChange(value);
                      }}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicleModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.vehicle_name} - {model.model_name} ({model.brand})
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="Vehicle color" {...field} />
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
                  name="discount"
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
                  name="additional_charges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Charges (LKR)</FormLabel>
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
                  name="additional_charges_description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Additional Charges Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Description of additional charges" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Price Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>LKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>- LKR {discountAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Charges:</span>
                  <span>+ LKR {(form.watch('additional_charges') || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Grand Total:</span>
                  <span>LKR {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Terms & Conditions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Payment terms" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delivery_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Terms</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Delivery terms" {...field} />
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
                        <Textarea placeholder="Warranty terms" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validity_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validity Period</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 30 days" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referral_agent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referral Agent</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral agent (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {referralAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name} ({agent.phone})
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
                  name="responsible_person_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsible Person (Footer Contact)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select responsible person" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {responsiblePersons.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.person_name} - {person.designation || 'N/A'}
                              {person.is_default && ' (Default)'}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
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
