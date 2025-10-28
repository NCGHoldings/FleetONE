import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface YutongInvoiceSignature {
  id: string;
  invoice_record_id: string;
  signature_role: 'prepared_by' | 'approved_by' | 'received_by';
  signer_name: string;
  signature_data: string;
  signature_type: 'drawing' | 'text' | 'image';
  signed_at: string;
  signed_by: string | null;
}

export const useYutongInvoiceSignatures = () => {
  const [loading, setLoading] = useState(false);

  const fetchSignatures = async (invoiceRecordId: string): Promise<YutongInvoiceSignature[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('yutong_invoice_signatures')
        .select('*')
        .eq('invoice_record_id', invoiceRecordId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as YutongInvoiceSignature[];
    } catch (error: any) {
      console.error('Error fetching invoice signatures:', error);
      toast.error('Failed to fetch signatures');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const saveSignature = async (
    invoiceRecordId: string,
    signatureRole: 'prepared_by' | 'approved_by' | 'received_by',
    signerName: string,
    signatureData: string,
    signatureType: 'drawing' | 'text' | 'image'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('yutong_invoice_signatures')
        .upsert({
          invoice_record_id: invoiceRecordId,
          signature_role: signatureRole,
          signer_name: signerName,
          signature_data: signatureData,
          signature_type: signatureType,
          signed_by: user?.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'invoice_record_id,signature_role'
        });

      if (error) throw error;

      toast.success('Signature saved successfully');
      return true;
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteSignature = async (signatureId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('yutong_invoice_signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;

      toast.success('Signature deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting signature:', error);
      toast.error('Failed to delete signature: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getProfileSignature = async (): Promise<{
    signature_data: string | null;
    signature_type: string | null;
  }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { signature_data: null, signature_type: null };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('signature_data, signature_type')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      return {
        signature_data: data?.signature_data || null,
        signature_type: data?.signature_type || null
      };
    } catch (error: any) {
      console.error('Error fetching profile signature:', error);
      return { signature_data: null, signature_type: null };
    }
  };

  const saveProfileSignature = async (
    signatureData: string,
    signatureType: 'drawing' | 'text' | 'image'
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          signature_data: signatureData,
          signature_type: signatureType
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile signature saved successfully');
      return true;
    } catch (error: any) {
      console.error('Error saving profile signature:', error);
      toast.error('Failed to save profile signature: ' + error.message);
      return false;
    }
  };

  return {
    loading,
    fetchSignatures,
    saveSignature,
    deleteSignature,
    getProfileSignature,
    saveProfileSignature
  };
};
