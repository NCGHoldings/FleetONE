import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LightVehicleInvoiceSignature {
  id: string;
  invoice_record_id: string;
  signature_role: string;
  signer_name: string;
  signature_data: string;
  signature_type: string;
  signed_at: string;
  signed_by?: string;
  created_at?: string;
}

export function useLightVehicleInvoiceSignatures() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSignatures = async (invoiceRecordId: string): Promise<LightVehicleInvoiceSignature[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lightvehicle_invoice_signatures')
        .select('*')
        .eq('invoice_record_id', invoiceRecordId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching invoice signatures:', error);
      toast.error('Failed to fetch signatures');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const saveSignature = async (
    invoiceRecordId: string,
    role: 'prepared_by' | 'approved_by' | 'received_by',
    signerName: string,
    signatureData: string,
    signatureType: 'drawn' | 'typed' = 'drawn'
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      // Check if signature already exists for this role
      const { data: existing } = await supabase
        .from('lightvehicle_invoice_signatures')
        .select('id')
        .eq('invoice_record_id', invoiceRecordId)
        .eq('signature_role', role)
        .maybeSingle();

      if (existing) {
        // Update existing signature
        const { error } = await supabase
          .from('lightvehicle_invoice_signatures')
          .update({
            signer_name: signerName,
            signature_data: signatureData,
            signature_type: signatureType,
            signed_at: new Date().toISOString(),
            signed_by: user?.user?.id
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new signature
        const { error } = await supabase
          .from('lightvehicle_invoice_signatures')
          .insert({
            invoice_record_id: invoiceRecordId,
            signature_role: role,
            signer_name: signerName,
            signature_data: signatureData,
            signature_type: signatureType,
            signed_at: new Date().toISOString(),
            signed_by: user?.user?.id
          });

        if (error) throw error;
      }

      toast.success('Signature saved successfully');
      return true;
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSignature = async (signatureId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lightvehicle_invoice_signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;

      toast.success('Signature removed');
      return true;
    } catch (error: any) {
      console.error('Error deleting signature:', error);
      toast.error('Failed to remove signature');
      return false;
    }
  };

  return {
    isLoading,
    isSaving,
    fetchSignatures,
    saveSignature,
    deleteSignature
  };
}
