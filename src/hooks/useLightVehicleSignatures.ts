import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LightVehicleSignature {
  id: string;
  quotation_id: string;
  signature_role: 'sales_manager' | 'approved_by' | 'customer';
  signer_name: string;
  signature_data: string;
  signature_type: 'drawing' | 'text' | 'image';
  signed_at: string;
  signed_by: string | null;
}

export const useLightVehicleSignatures = () => {
  const [loading, setLoading] = useState(false);

  const fetchSignatures = async (quotationId: string): Promise<LightVehicleSignature[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lightvehicle_quotation_signatures')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('signature_role');

      if (error) throw error;
      return (data || []) as LightVehicleSignature[];
    } catch (error) {
      console.error('Error fetching signatures:', error);
      toast.error('Failed to load signatures');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const saveSignature = async (
    quotationId: string,
    signatureRole: 'sales_manager' | 'approved_by' | 'customer',
    signerName: string,
    signatureData: string,
    signatureType: 'drawing' | 'text' | 'image'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('lightvehicle_quotation_signatures')
        .upsert({
          quotation_id: quotationId,
          signature_role: signatureRole,
          signer_name: signerName,
          signature_data: signatureData,
          signature_type: signatureType,
          signed_by: user?.id || null,
          signed_at: new Date().toISOString()
        }, {
          onConflict: 'quotation_id,signature_role'
        });

      if (error) throw error;

      toast.success('Signature saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteSignature = async (signatureId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('lightvehicle_quotation_signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;

      toast.success('Signature removed');
      return true;
    } catch (error) {
      console.error('Error deleting signature:', error);
      toast.error('Failed to remove signature');
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
      if (!user) return { signature_data: null, signature_type: null };

      const { data, error } = await supabase
        .from('profiles')
        .select('signature_data, signature_type')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data || { signature_data: null, signature_type: null };
    } catch (error) {
      console.error('Error fetching profile signature:', error);
      return { signature_data: null, signature_type: null };
    }
  };

  return {
    loading,
    fetchSignatures,
    saveSignature,
    deleteSignature,
    getProfileSignature
  };
};
