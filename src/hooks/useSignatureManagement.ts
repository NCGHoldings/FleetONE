import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ApprovalData {
  id?: string;
  document_id: string;
  approval_type: 'prepared_by' | 'checked_by' | 'approved_by';
  approver_name: string;
  signature_data?: string;
  approval_date: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
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

      // Prepare data for database
      const dbData = {
        document_id: approvalData.document_id,
        approval_type: approvalData.approval_type,
        approver_name: approvalData.approver_name,
        signature_data: approvalData.signature_data,
        approval_date: approvalData.approval_date,
        user_id: user?.id,
      };

      let result;
      if (approvalData.id) {
        // Update existing approval
        const { data, error } = await supabase
          .from('document_approvals')
          .update(dbData)
          .eq('id', approvalData.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new approval  
        const { data, error } = await supabase
          .from('document_approvals')
          .insert(dbData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Increment name usage for suggestions
      if (approvalData.approver_name) {
        await supabase.rpc('increment_name_suggestion', {
          p_name: approvalData.approver_name
        });
      }

      toast.success('Approval signature saved successfully');
      return { success: true, data: result };
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