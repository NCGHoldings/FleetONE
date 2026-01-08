import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface DocumentApproval {
  id: string;
  document_id: string;
  approval_type: 'prepared_by' | 'checked_by' | 'approved_by';
  approver_name: string;
  signature_data?: string;
  approval_date: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export const useDocumentApprovals = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const getDocumentApprovals = async (documentId: string): Promise<DocumentApproval[]> => {
    try {
      const { data, error } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DocumentApproval[];
    } catch (error) {
      console.error('Error fetching document approvals:', error);
      toast.error('Failed to fetch approvals');
      return [];
    }
  };

  const saveApproval = async (
    documentId: string,
    approvalType: 'prepared_by' | 'checked_by' | 'approved_by',
    approverName: string,
    approvalDate: Date,
    signatureData?: string
  ) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('document_approvals')
        .insert({
          document_id: documentId,
          approval_type: approvalType,
          approver_name: approverName,
          signature_data: signatureData,
          approval_date: approvalDate.toISOString().split('T')[0],
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment name suggestion usage
      await supabase.rpc('increment_name_suggestion', {
        p_name: approverName
      });

      toast.success('Approval saved successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error saving approval:', error);
      toast.error('Failed to save approval');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const updateApproval = async (
    approvalId: string,
    approverName: string,
    approvalDate: Date,
    signatureData?: string
  ) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('document_approvals')
        .update({
          approver_name: approverName,
          signature_data: signatureData,
          approval_date: approvalDate.toISOString().split('T')[0],
        })
        .eq('id', approvalId);

      if (error) throw error;

      // Increment name suggestion usage
      await supabase.rpc('increment_name_suggestion', {
        p_name: approverName
      });

      toast.success('Approval updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApproval = async (approvalId: string) => {
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
  };

  const getNameSuggestions = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('approval_name_suggestions')
        .select('name')
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data ? data.map(item => item.name) : [];
    } catch (error) {
      console.error('Error fetching name suggestions:', error);
      return [];
    }
  };

  return {
    getDocumentApprovals,
    saveApproval,
    updateApproval,
    deleteApproval,
    getNameSuggestions,
    isLoading,
  };
};