import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SinotruckInvoiceSignature {
  id: string;
  invoice_record_id: string;
  signature_role: 'prepared_by' | 'approved_by' | 'received_by';
  signer_name: string;
  signature_data: string;
  signature_type: 'drawing' | 'text' | 'image';
  signed_at: string;
  signed_by?: string;
  created_at: string;
}

export function useSinotruckInvoiceSignatures() {
  const [loading, setLoading] = useState(false);

  const fetchSignatures = async (invoiceRecordId: string): Promise<SinotruckInvoiceSignature[]> => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_invoice_signatures')
        .select('*')
        .eq('invoice_record_id', invoiceRecordId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SinotruckInvoiceSignature[];
    } catch (error: any) {
      console.error('Error fetching invoice signatures:', error);
      return [];
    }
  };

  const saveSignature = async (
    invoiceRecordId: string,
    role: 'prepared_by' | 'approved_by' | 'received_by',
    signerName: string,
    signatureData: string,
    signatureType: 'drawing' | 'text' | 'image'
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if signature exists for this role
      const { data: existing } = await supabase
        .from('sinotruck_invoice_signatures')
        .select('id')
        .eq('invoice_record_id', invoiceRecordId)
        .eq('signature_role', role)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('sinotruck_invoice_signatures')
          .update({
            signer_name: signerName,
            signature_data: signatureData,
            signature_type: signatureType,
            signed_at: new Date().toISOString(),
            signed_by: user?.id
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast.success('Signature updated successfully');
      } else {
        // Insert new
        const { error } = await supabase
          .from('sinotruck_invoice_signatures')
          .insert({
            invoice_record_id: invoiceRecordId,
            signature_role: role,
            signer_name: signerName,
            signature_data: signatureData,
            signature_type: signatureType,
            signed_at: new Date().toISOString(),
            signed_by: user?.id
          });

        if (error) throw error;
        toast.success('Signature saved successfully');
      }

      return true;
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteSignature = async (signatureId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sinotruck_invoice_signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;
      toast.success('Signature deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting signature:', error);
      toast.error('Failed to delete signature');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchSignatures,
    saveSignature,
    deleteSignature
  };
}
