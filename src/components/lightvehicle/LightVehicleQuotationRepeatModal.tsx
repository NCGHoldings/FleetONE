import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface LightVehicleQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name: string;
  bus_model: string;
  bus_model_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  valid_until: string;
  special_features?: string;
  delivery_timeline?: string;
  payment_terms?: string;
  warranty_terms?: string;
  discount_percentage?: number;
  notes?: string;
  vehicle_customization?: string;
}

interface LightVehicleQuotationRepeatModalProps {
  quotation: LightVehicleQuotation | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LightVehicleQuotationRepeatModal({
  quotation,
  open,
  onClose,
  onSuccess,
}: LightVehicleQuotationRepeatModalProps) {
  const [numberOfCopies, setNumberOfCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate a unique quotation number
  const generateQuotationNo = async (index: number): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get the count of quotations created today
    const { count } = await (supabase as any)
      .from('lightvehicle_quotations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString().slice(0, 10));
    
    const nextNum = (count || 0) + index + 1;
    const paddedNum = String(nextNum).padStart(4, '0');
    
    return `YTQ-${dateStr}-${paddedNum}-v1.0`;
  };

  const handleRepeat = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      // Fetch the COMPLETE quotation data from database to get ALL fields
      const { data: fullQuotation, error: fetchError } = await (supabase as any)
        .from('lightvehicle_quotations')
        .select('*')
        .eq('id', quotation.id)
        .single();

      if (fetchError || !fullQuotation) {
        throw new Error('Failed to fetch quotation details');
      }

      // Fetch add-ons for this quotation
      const { data: addOns } = await (supabase as any)
        .from('lightvehicle_quotation_addons')
        .select('*')
        .eq('quotation_id', quotation.id);

      // Create quotations one by one to get unique quotation numbers
      const newQuotations = [];
      
      for (let i = 0; i < numberOfCopies; i++) {
        const quotationNo = await generateQuotationNo(i);
        
        // Copy ALL fields from the original quotation except system fields
        const duplicateData = {
          // New quotation identifiers
          quotation_no: quotationNo,
          status: 'draft',
          version_number: '1.0',
          is_active_version: true,
          created_by: user.id,
          
          // Customer information
          customer_name: fullQuotation.customer_name,
          customer_phone: fullQuotation.customer_phone,
          customer_email: fullQuotation.customer_email || '',
          company_name: fullQuotation.company_name,
          customer_address: fullQuotation.customer_address,
          customer_id: fullQuotation.customer_id,
          customer_type: fullQuotation.customer_type,
          attention_to: fullQuotation.attention_to,
          contact_person: fullQuotation.contact_person,
          main_customer_name: fullQuotation.main_customer_name,
          is_sub_customer: fullQuotation.is_sub_customer,
          relationship_notes: fullQuotation.relationship_notes,
          business_registration_number: fullQuotation.business_registration_number,
          tax_registration_number: fullQuotation.tax_registration_number,
          
          // Bus details
          bus_model: fullQuotation.bus_model,
          bus_model_id: fullQuotation.bus_model_id,
          seating_capacity: fullQuotation.seating_capacity,
          
          // Customization options
          seat_colour: fullQuotation.seat_colour,
          curtain_colour: fullQuotation.curtain_colour,
          body_colour: fullQuotation.body_colour,
          seat_headrest_logo: fullQuotation.seat_headrest_logo,
          special_features: fullQuotation.special_features,
          
          // Pricing
          quantity: 1,
          unit_price: fullQuotation.unit_price,
          total_price: fullQuotation.unit_price,
          discount_percentage: fullQuotation.discount_percentage,
          discount_amount: fullQuotation.discount_amount,
          
          // Terms and validity
          valid_until: fullQuotation.valid_until,
          valid_days: fullQuotation.valid_days,
          delivery_timeline: fullQuotation.delivery_timeline,
          payment_terms: fullQuotation.payment_terms,
          warranty_terms: fullQuotation.warranty_terms,
          finance_company: fullQuotation.finance_company,
          
          // Staff/Representative
          responsible_person: fullQuotation.responsible_person,
          responsible_person_id: fullQuotation.responsible_person_id,
          representative_name: fullQuotation.representative_name,
          designation: fullQuotation.designation,
          
          // References
          inquiry_id: fullQuotation.inquiry_id,
          referral_agent_id: fullQuotation.referral_agent_id,
        };

        const { data, error } = await (supabase as any)
          .from('lightvehicle_quotations')
          .insert(duplicateData)
          .select()
          .single();

        if (error) throw error;
        newQuotations.push(data);
      }

      // Duplicate add-ons for each new quotation
      if (addOns && addOns.length > 0 && newQuotations.length > 0) {
        for (const newQuotation of newQuotations) {
          const addOnsCopy = addOns.map(addon => ({
            quotation_id: newQuotation.id,
            addon_id: addon.addon_id,
            quantity: addon.quantity,
            unit_price: addon.unit_price,
            total_price: addon.total_price,
            is_free_of_charge: addon.is_free_of_charge,
            notes: addon.notes,
          }));
          
          await (supabase as any).from('lightvehicle_quotation_addons').insert(addOnsCopy);
        }
      }

      // Copy signatures from original quotation to each new quotation
      const { data: originalSignatures } = await (supabase as any)
        .from('lightvehicle_quotation_signatures')
        .select('*')
        .eq('quotation_id', quotation.id);

      if (originalSignatures && originalSignatures.length > 0 && newQuotations.length > 0) {
        for (const newQuotation of newQuotations) {
          const signaturesCopy = originalSignatures.map(sig => ({
            quotation_id: newQuotation.id,
            signature_role: sig.signature_role,
            signer_name: sig.signer_name,
            signature_data: sig.signature_data,
            signature_type: sig.signature_type,
            signed_by: sig.signed_by,
            signed_at: sig.signed_at,
          }));

          await (supabase as any).from('lightvehicle_quotation_signatures').insert(signaturesCopy);
        }
      }

      toast({
        title: "Success",
        description: `${numberOfCopies} quotation${numberOfCopies > 1 ? 's' : ''} created successfully`,
      });

      onSuccess();
      onClose();
      setNumberOfCopies(1);
    } catch (error: any) {
      console.error('Error repeating quotation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create quotations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Repeat Quotation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Quotation:</span>
              <span className="font-medium">{quotation.quotation_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{quotation.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company:</span>
              <span className="font-medium">{quotation.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bus Model:</span>
              <span className="font-medium">{quotation.bus_model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit Price:</span>
              <span className="font-medium">LKR {quotation.unit_price.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label htmlFor="copies">Number of Copies</Label>
            <Input
              id="copies"
              type="number"
              min={1}
              max={20}
              value={numberOfCopies}
              onChange={(e) => setNumberOfCopies(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="mt-2"
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">This will create {numberOfCopies} new quotation{numberOfCopies > 1 ? 's' : ''} with:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Same customer details</li>
                  <li>Same bus model and price</li>
                  <li>Same add-ons and customizations</li>
                  <li>Same signatures (if any)</li>
                  <li>New unique quotation numbers</li>
                  <li>Status set to "Draft"</li>
                </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRepeat} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Create {numberOfCopies} Quotation{numberOfCopies > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
