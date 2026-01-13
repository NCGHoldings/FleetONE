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
import { EditTypeSelectionModal } from '../special-hire/EditTypeSelectionModal';

const formSchema = z.object({
  customer_type: z.enum(['personal', 'company']).default('personal'),
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
  color: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(1, 'Unit price is required'),
  discount_amount: z.number().min(0).optional(),
  payment_terms: z.string().optional(),
  delivery_terms: z.string().optional(),
  warranty_terms: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LightVehicleQuotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address?: string;
  company_name?: string;
  customer_type?: string;
  business_registration_number?: string;
  tax_registration_number?: string;
  representative_name?: string;
  designation?: string;
  vehicle_name: string;
  brand: string;
  category: string;
  engine_cc?: string;
  transmission?: string;
  fuel_type?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  grand_total: number;
  status: string;
  valid_until?: string;
  created_at: string;
  notes?: string;
  payment_terms?: string;
  warranty_terms?: string;
  delivery_timeline?: string;
  model_id?: string;
  finance_company?: string;
  contact_person?: string;
}

interface LightVehicleEditQuotationModalProps {
  quotation: LightVehicleQuotation | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LightVehicleEditQuotationModal({ quotation, open, onClose, onSuccess }: LightVehicleEditQuotationModalProps) {
  const { toast } = useToast();
  const [showEditTypeModal, setShowEditTypeModal] = useState(true);
  const [editConfig, setEditConfig] = useState<{
    editType: 'staff_edit' | 'customer_request';
    editReason: string;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_type: 'personal',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      company_name: '',
      customer_address: '',
      contact_person: '',
      finance_company: '',
      business_registration: '',
      tax_registration: '',
      representative_name: '',
      designation: '',
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      payment_terms: '',
      delivery_terms: '',
      warranty_terms: '',
      notes: '',
      color: '',
    }
  });

  // Reset edit type modal when dialog opens
  useEffect(() => {
    if (open) {
      setShowEditTypeModal(true);
      setEditConfig(null);
    }
  }, [open]);

  // Load quotation data when dialog opens
  useEffect(() => {
    if (quotation && open) {
      form.reset({
        customer_type: (quotation.customer_type as 'personal' | 'company') || 'personal',
        customer_name: quotation.customer_name || '',
        customer_phone: quotation.customer_phone || '',
        customer_email: quotation.customer_email || '',
        company_name: quotation.company_name || '',
        customer_address: quotation.customer_address || '',
        contact_person: quotation.contact_person || '',
        finance_company: quotation.finance_company || '',
        business_registration: quotation.business_registration_number || '',
        tax_registration: quotation.tax_registration_number || '',
        representative_name: quotation.representative_name || '',
        designation: quotation.designation || '',
        quantity: quotation.quantity || 1,
        unit_price: quotation.unit_price || 0,
        discount_amount: quotation.discount_amount || 0,
        payment_terms: quotation.payment_terms || '',
        delivery_terms: quotation.delivery_timeline || '',
        warranty_terms: quotation.warranty_terms || '',
        notes: quotation.notes || '',
        color: quotation.color || '',
      });
    }
  }, [quotation, open, form]);

  const calculateTotals = () => {
    const quantity = form.watch('quantity') || 0;
    const unitPrice = form.watch('unit_price') || 0;
    const discountAmount = form.watch('discount_amount') || 0;
    
    const subtotal = quantity * unitPrice;
    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total };
  };

  const handleEditTypeConfirm = (editType: 'staff_edit' | 'customer_request', reason?: string) => {
    setEditConfig({
      editType,
      editReason: reason || '',
    });
    setShowEditTypeModal(false);
  };

  const handleEditTypeCancel = () => {
    setShowEditTypeModal(false);
    onClose();
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      if (!quotation || !editConfig) {
        toast({
          title: "Error",
          description: "No quotation or edit configuration found",
          variant: "destructive",
        });
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { total } = calculateTotals();

      // Generate next version number
      const { data: versionData, error: versionError } = await supabase
        .rpc('generate_next_lightvehicle_version_number' as any, { p_parent_id: quotation.id });

      if (versionError) {
        console.error('Version generation error:', versionError);
        // Fallback to simple versioning
      }
      const nextVersion = versionData || '1.1';

      // Get base quotation number (remove existing version suffix if present)
      const baseQuotationNo = quotation.quotation_number.replace(/-v\d+\.\d+$/, '');
      
      // Create versioned quotation number
      const versionedQuotationNo = `${baseQuotationNo}-v${nextVersion}`;

      // Mark old quotation as inactive
      const { error: deactivateError } = await supabase
        .from('lightvehicle_quotations')
        .update({ is_active_version: false })
        .eq('id', quotation.id);

      if (deactivateError) throw deactivateError;

      // Create new quotation version
      const { data: newQuotation, error: quotationError } = await (supabase
        .from('lightvehicle_quotations')
        .insert as any)({
          quotation_number: versionedQuotationNo,
          parent_quotation_id: quotation.id,
          version_number: nextVersion,
          edit_type: editConfig.editType,
          edit_reason: editConfig.editReason,
          is_active_version: true,
          model_id: quotation.model_id,
          vehicle_name: quotation.vehicle_name,
          brand: quotation.brand,
          category: quotation.category,
          engine_cc: quotation.engine_cc,
          transmission: quotation.transmission,
          fuel_type: quotation.fuel_type,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email || null,
          company_name: data.company_name || null,
          customer_address: data.customer_address || null,
          contact_person: data.contact_person || null,
          finance_company: data.finance_company || null,
          customer_type: data.customer_type || 'personal',
          business_registration_number: data.business_registration || null,
          tax_registration_number: data.tax_registration || null,
          representative_name: data.representative_name || null,
          designation: data.designation || null,
          color: data.color || null,
          quantity: data.quantity,
          unit_price: data.unit_price,
          discount_amount: data.discount_amount || 0,
          grand_total: total,
          payment_terms: data.payment_terms || null,
          delivery_timeline: data.delivery_terms || null,
          warranty_terms: data.warranty_terms || null,
          notes: data.notes || null,
          status: quotation.status,
          valid_until: quotation.valid_until,
          created_by: user.id,
        })
        .select()
        .single();

      if (quotationError) {
        // Reactivate old quotation if new version creation failed
        await supabase
          .from('lightvehicle_quotations')
          .update({ is_active_version: true })
          .eq('id', quotation.id);
        throw quotationError;
      }

      // Copy add-ons from original quotation
      try {
        const { data: originalAddOns, error: addOnsFetchError } = await supabase
          .from('lightvehicle_quotation_addons')
          .select('*')
          .eq('quotation_id', quotation.id);

        if (!addOnsFetchError && originalAddOns && originalAddOns.length > 0) {
          const addOnsToCopy = originalAddOns.map(addon => ({
            quotation_id: newQuotation.id,
            addon_name: addon.addon_name,
            quantity: addon.quantity,
            unit_price: addon.unit_price,
          }));

          await supabase
            .from('lightvehicle_quotation_addons')
            .insert(addOnsToCopy);
        }
      } catch (addOnsError) {
        console.error('Error copying add-ons:', addOnsError);
      }

      // Copy signatures from original quotation
      try {
        const { data: originalSignatures, error: sigFetchError } = await supabase
          .from('lightvehicle_quotation_signatures')
          .select('*')
          .eq('quotation_id', quotation.id);

        if (!sigFetchError && originalSignatures && originalSignatures.length > 0) {
          const signaturesToCopy = originalSignatures.map(sig => ({
            quotation_id: newQuotation.id,
            signature_role: sig.signature_role,
            signer_name: sig.signer_name,
            signature_data: sig.signature_data,
            signature_type: sig.signature_type,
            signed_by: sig.signed_by,
            signed_at: sig.signed_at,
          }));

          await supabase
            .from('lightvehicle_quotation_signatures')
            .insert(signaturesToCopy);
        }
      } catch (sigError) {
        console.error('Error copying signatures:', sigError);
      }

      toast({
        title: "Success",
        description: `New quotation version ${nextVersion} created successfully`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating quotation version:', error);
      toast({
        title: "Error",
        description: "Failed to create quotation version",
        variant: "destructive",
      });
    }
  };

  // Return null if no quotation or modal is not open
  if (!quotation || !open) return null;

  // Show edit type selection modal first
  if (showEditTypeModal) {
    return (
      <EditTypeSelectionModal
        isOpen={showEditTypeModal}
        onClose={handleEditTypeCancel}
        onConfirm={handleEditTypeConfirm}
        quotationNo={quotation.quotation_number}
      />
    );
  }

  // If no edit config yet, don't show the form
  if (!editConfig) return null;

  const customerType = form.watch('customer_type');
  const { subtotal, discountAmount, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Quotation - {quotation.quotation_number}</DialogTitle>
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
              <div className="p-4 bg-muted rounded-lg">
                <p><b>Vehicle:</b> {quotation.brand} - {quotation.vehicle_name}</p>
                <p><b>Category:</b> {quotation.category}</p>
                {quotation.engine_cc && <p><b>Engine:</b> {quotation.engine_cc} CC</p>}
                {quotation.transmission && <p><b>Transmission:</b> {quotation.transmission}</p>}
                {quotation.fuel_type && <p><b>Fuel Type:</b> {quotation.fuel_type}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount (LKR)</FormLabel>
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
            </div>

            {/* Price Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Price Summary</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>LKR {subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-LKR {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>LKR {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
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
                      <FormLabel>Delivery Timeline</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Delivery timeline" {...field} />
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
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

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Create New Version
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
