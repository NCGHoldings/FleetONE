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

      // Validate required fields
      if (!approvalData.document_id) {
        toast.error('Document ID is required');
        return { success: false, error: 'Missing document_id' };
      }

      if (!approvalData.approver_name?.trim()) {
        toast.error('Approver name is required');
        return { success: false, error: 'Missing approver_name' };
      }

      // Verify document exists before attempting to save
      console.log('Verifying document exists:', approvalData.document_id);
      const { data: docCheck, error: docError } = await supabase
        .from('document_storage')
        .select('id')
        .eq('id', approvalData.document_id)
        .maybeSingle();

      if (docError) {
        console.error('Error checking document:', docError);
        toast.error('Failed to verify document exists');
        return { success: false, error: docError };
      }

      if (!docCheck) {
        console.error('Document not found:', approvalData.document_id);
        toast.error('Document not found. Please ensure the document exists before adding signatures.');
        return { success: false, error: 'Document not found in database' };
      }

      // Format approval_date properly as a date string (YYYY-MM-DD)
      let formattedDate = approvalData.approval_date;
      if (typeof approvalData.approval_date === 'string') {
        // Ensure it's in YYYY-MM-DD format
        const dateObj = new Date(approvalData.approval_date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      }

      // Prepare data for database
      const dbData = {
        document_id: approvalData.document_id,
        approval_type: approvalData.approval_type,
        approver_name: approvalData.approver_name.trim(),
        signature_data: approvalData.signature_data || null,
        approval_date: formattedDate,
        user_id: user?.id || null,
      };

      console.log('Saving approval data:', { ...dbData, signature_data: dbData.signature_data ? '[DATA]' : null });

      let result;
      if (approvalData.id) {
        // Update existing approval
        const { data, error } = await supabase
          .from('document_approvals')
          .update(dbData)
          .eq('id', approvalData.id)
          .select()
          .single();
        
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        result = data;
      } else {
        // Insert new approval  
        const { data, error } = await supabase
          .from('document_approvals')
          .insert(dbData)
          .select()
          .single();
        
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        result = data;
      }

      // Increment name usage for suggestions (don't fail if this errors)
      if (approvalData.approver_name) {
        try {
          await supabase.rpc('increment_name_suggestion', {
            p_name: approvalData.approver_name.trim()
          });
        } catch (suggestionError) {
          console.warn('Failed to update name suggestions:', suggestionError);
          // Don't fail the entire operation if suggestions fail
        }
      }

      toast.success('Approval signature saved successfully');
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error saving approval:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save approval signature';
      
      if (error?.message?.includes('foreign key')) {
        errorMessage = 'Document not found. Please ensure the document exists before adding signatures.';
      } else if (error?.message?.includes('violates')) {
        errorMessage = 'Database constraint violation. Please check all required fields.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
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

  // Get profile signature (reusable across all documents)
  const getProfileSignature = useCallback(async (): Promise<{ 
    signature_data: string | null; 
    signature_type: string | null;
  }> => {
    try {
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
  }, [user]);

  // Save profile signature for reuse
  const saveProfileSignature = useCallback(async (
    signatureData: string,
    signatureType: 'drawing' | 'text' | 'image'
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          signature_data: signatureData,
          signature_type: signatureType
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Signature saved to your profile');
      return true;
    } catch (error) {
      console.error('Error saving profile signature:', error);
      toast.error('Failed to save signature to profile');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isLoading,
    saveApproval,
    getDocumentApprovals,
    deleteApproval,
    getNameSuggestions,
    getProfileSignature,
    saveProfileSignature
  };
};