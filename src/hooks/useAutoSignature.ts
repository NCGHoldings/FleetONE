import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SignatureRole = 'prepared_by' | 'checked_by' | 'approved_by';

export const useAutoSignature = () => {
  const [isLoading, setIsLoading] = useState(false);

  const getDefaultSigner = async (role: SignatureRole) => {
    try {
      const { data: setting, error: settingError } = await supabase
        .from('special_hire_signature_settings')
        .select('default_user_id, is_enabled')
        .eq('signature_role', role)
        .single();

      if (settingError || !setting?.default_user_id || !setting.is_enabled) {
        return { success: false, enabled: false };
      }

      // Get user profile with signature
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, signature_data, user_id')
        .eq('user_id', setting.default_user_id)
        .single();

      if (profileError || !profile?.signature_data) {
        return { success: false, enabled: true, reason: 'No signature found' };
      }

      return {
        success: true,
        enabled: true,
        user_id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        signature_data: profile.signature_data,
      };
    } catch (error) {
      console.error('Error getting default signer:', error);
      return { success: false, enabled: false };
    }
  };

  const autoAddSignature = async (
    documentId: string,
    role: SignatureRole
  ) => {
    try {
      setIsLoading(true);

      // Get default signer
      const signer = await getDefaultSigner(role);
      if (!signer.success || !signer.signature_data) {
        console.log(`Auto-signature skipped for ${role}: ${signer.reason || 'not configured'}`);
        return { success: false, skipped: true, reason: signer.reason };
      }

      // Check if signature already exists
      const { data: existing } = await supabase
        .from('document_approvals')
        .select('id')
        .eq('document_id', documentId)
        .eq('approval_type', role)
        .maybeSingle();

      if (existing) {
        console.log(`Signature already exists for ${role}`);
        return { success: true, existed: true };
      }

      // Add signature to document_approvals
      const { error: insertError } = await supabase
        .from('document_approvals')
        .insert({
          document_id: documentId,
          approval_type: role,
          approver_name: `${signer.first_name} ${signer.last_name}`.trim(),
          signature_data: signer.signature_data,
          approval_date: new Date().toISOString().split('T')[0],
          user_id: signer.user_id,
        });

      if (insertError) throw insertError;

      return { 
        success: true, 
        approver_name: `${signer.first_name} ${signer.last_name}`.trim() 
      };
    } catch (error) {
      console.error(`Error auto-adding signature for ${role}:`, error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const autoAddMultipleSignatures = async (
    documentId: string,
    roles: SignatureRole[]
  ) => {
    const results = await Promise.all(
      roles.map(role => autoAddSignature(documentId, role))
    );
    return results;
  };

  return {
    getDefaultSigner,
    autoAddSignature,
    autoAddMultipleSignatures,
    isLoading,
  };
};
