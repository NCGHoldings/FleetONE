import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ApprovalData {
  id?: string;
  document_id: string;
  approval_type: 'prepared_by' | 'approved_by' | 'received_by';
  approver_name: string;
  signature_data?: string;
  approval_date: string;
  user_id?: string;
}

export interface NameSuggestion {
  id: string;
  name: string;
  usage_count: number;
  last_used_at: string;
}

export const useSignatureManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Get name suggestions for autocomplete
  const getNameSuggestions = useCallback(async (): Promise<NameSuggestion[]> => {
    try {
      const { data, error } = await supabase
        .from('approval_name_suggestions')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching name suggestions:', error);
      return [];
    }
  }, []);

  // Save approval data (name, signature, date)
  const saveApproval = useCallback(async (approvalData: ApprovalData) => {
    try {
      setIsLoading(true);

      // Save approval data
      const { data, error } = await supabase
        .from('document_approvals')
        .upsert({
          ...approvalData,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment name usage for suggestions
      if (approvalData.approver_name) {
        await supabase.rpc('increment_name_suggestion', {
          p_name: approvalData.approver_name
        });
      }

      toast.success('Approval signature saved successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error saving approval:', error);
      toast.error('Failed to save approval signature');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Get approvals for a document
  const getDocumentApprovals = useCallback(async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, approvals: data || [] };
    } catch (error) {
      console.error('Error fetching document approvals:', error);
      return { success: false, error, approvals: [] };
    }
  }, []);

  // Delete approval
  const deleteApproval = useCallback(async (approvalId: string) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('document_approvals')
        .delete()
        .eq('id', approvalId);

      if (error) throw error;

      toast.success('Approval deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting approval:', error);
      toast.error('Failed to delete approval');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    saveApproval,
    getDocumentApprovals,
    deleteApproval,
    getNameSuggestions,
  };
};