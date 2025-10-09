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
import { EditTypeSelectionModal } from '../special-hire/EditTypeSelectionModal';

const formSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Valid email is required').optional().or(z.literal('')),
  company_name: z.string().optional(),
  finance_company: z.string().optional(),
  customer_type: z.enum(['personal', 'company']).default('personal'),
  business_registration_number: z.string().optional(),
  tax_registration_number: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(1, 'Unit price is required'),
  discount_amount: z.number().min(0).optional(),
  special_features: z.string().optional(),
  delivery_timeline: z.string().optional(),
  payment_terms: z.string().optional(),
  warranty_terms: z.string().optional(),
  responsible_person: z.string().optional(),
  seat_colour: z.string().optional(),
  curtain_colour: z.string().optional(),
  body_colour: z.string().optional(),
  seat_headrest_logo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name?: string;
  finance_company?: string;
  customer_type?: string;
  business_registration_number?: string;
  tax_registration_number?: string;
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
  seat_colour?: string;
  curtain_colour?: string;
  body_colour?: string;
  seat_headrest_logo?: string;
  status?: string;
  valid_until?: string;
  parent_quotation_id?: string;
  version_number?: string;
  edit_type?: string;
  edit_reason?: string;
  is_active_version?: boolean;
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
  const [customizationOptions, setCustomizationOptions] = useState<any[]>([]);
  const [showEditTypeModal, setShowEditTypeModal] = useState(true);
  const [editConfig, setEditConfig] = useState<{
    editType: 'staff_edit' | 'customer_request';
    editReason: string;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      company_name: '',
      finance_company: '',
      customer_type: 'personal',
      business_registration_number: '',
      tax_registration_number: '',
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      special_features: '',
      delivery_timeline: '',
      payment_terms: '',
      warranty_terms: '',
      responsible_person: '',
      seat_colour: '',
      curtain_colour: '',
      body_colour: '',
      seat_headrest_logo: '',
    }
  });

  // Reset edit type modal when dialog opens
  useEffect(() => {
    if (open) {
      setShowEditTypeModal(true);
      setEditConfig(null);
    }
  }, [open]);

  // Load quotation data and add-ons when dialog opens
  useEffect(() => {
    if (quotation && open) {
      form.reset({
        customer_name: quotation.customer_name || '',
        customer_phone: quotation.customer_phone || '',
        customer_email: quotation.customer_email || '',
        company_name: quotation.company_name || '',
        finance_company: quotation.finance_company || '',
        customer_type: (quotation.customer_type as 'personal' | 'company') || 'personal',
        business_registration_number: quotation.business_registration_number || '',
        tax_registration_number: quotation.tax_registration_number || '',
        quantity: quotation.quantity || 1,
        unit_price: quotation.unit_price || 0,
        discount_amount: quotation.discount_amount || 0,
        special_features: quotation.special_features || '',
        delivery_timeline: quotation.delivery_timeline || '',
        payment_terms: quotation.payment_terms || '',
        warranty_terms: quotation.warranty_terms || '',
        responsible_person: quotation.responsible_person || '',
        seat_colour: quotation.seat_colour || '',
        curtain_colour: quotation.curtain_colour || '',
        body_colour: quotation.body_colour || '',
        seat_headrest_logo: quotation.seat_headrest_logo || '',
      });

      // Load existing add-ons
      loadQuotationAddOns();
      loadCustomizationOptions();
    }
  }, [quotation, open, form]);

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

      const totalPrice = calculateTotalPrice();

      // Generate next version number using Yutong-specific function
      const { data: versionData, error: versionError } = await supabase
        .rpc('generate_next_yutong_version_number' as any, { p_parent_id: quotation.id });

      if (versionError) throw versionError;
      const nextVersion = versionData || '1.1';

      // Get base quotation number (remove existing version suffix if present)
      const baseQuotationNo = quotation.quotation_no.replace(/-v\d+\.\d+$/, '');
      
      // Create versioned quotation number like Special Hire does
      const versionedQuotationNo = `${baseQuotationNo}-v${nextVersion}`;

      // Mark old quotation as inactive
      const { error: deactivateError } = await supabase
        .from('yutong_quotations')
        .update({ is_active_version: false })
        .eq('id', quotation.id);

      if (deactivateError) throw deactivateError;

      // Create new quotation version with versioned quotation number
      const { data: newQuotation, error: quotationError } = await (supabase
        .from('yutong_quotations')
        .insert as any)({
          quotation_no: versionedQuotationNo,
          parent_quotation_id: quotation.id,
          version_number: nextVersion,
          edit_type: editConfig.editType,
          edit_reason: editConfig.editReason,
          is_active_version: true,
          bus_model: quotation.bus_model,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email || null,
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
          seat_colour: data.seat_colour || null,
          curtain_colour: data.curtain_colour || null,
          body_colour: data.body_colour || null,
          seat_headrest_logo: data.seat_headrest_logo || null,
          finance_company: data.finance_company || null,
          customer_type: data.customer_type || 'personal',
          business_registration_number: data.business_registration_number || null,
          tax_registration_number: data.tax_registration_number || null,
          status: quotation.status,
          valid_until: quotation.valid_until,
          created_by: user.id,
        })
        .select()
        .single();

      if (quotationError) {
        // Reactivate old quotation if new version creation failed
        await supabase
          .from('yutong_quotations')
          .update({ is_active_version: true })
          .eq('id', quotation.id);
        throw quotationError;
      }

      // Insert add-ons for new version
      if (quotationAddOns.length > 0) {
        const addOnsToInsert = quotationAddOns.map(addon => ({
          quotation_id: newQuotation.id,
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

  if (!quotation) return null;

  // Show edit type selection modal first
  if (showEditTypeModal) {
    return (
      <EditTypeSelectionModal
        isOpen={showEditTypeModal}
        onClose={handleEditTypeCancel}
        onConfirm={handleEditTypeConfirm}
        quotationNo={quotation.quotation_no}
      />
    );
  }

  // If no edit config yet, don't show the form
  if (!editConfig) return null;

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
                  name="finance_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finance Company</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              {form.watch('customer_type') === 'company' && (
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
              )}

              <div className="grid grid-cols-2 gap-4">
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

              {/* Vehicle Customization Section */}
              <div className="space-y-4 border-t pt-4 mt-4">
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
