import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DocumentType = 
  | 'quotation' 
  | 'advance_receipt' 
  | 'balance_invoice' 
  | 'post_trip_adjustment' 
  | 'sales_receipt';

export type DocumentStatus = 'draft' | 'preview' | 'generated' | 'sent' | 'approved';

export interface DocumentVersion {
  id: string;
  quotation_id: string;
  document_type: DocumentType;
  version_number: number;
  document_data: Record<string, any>;
  changes_made?: Record<string, { old: any; new: any }>;
  change_reason?: string;
  document_status: DocumentStatus;
  generated_pdf_path?: string;
  changed_by?: string;
  changed_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFlowStep {
  type: DocumentType;
  label: string;
  description: string;
  status: 'pending' | 'draft' | 'ready' | 'sent' | 'completed';
  currentVersion?: DocumentVersion;
  allVersions: DocumentVersion[];
  canEdit: boolean;
  canGenerate: boolean;
}

export interface DocumentFlowState {
  quotationId: string;
  quotationNo: string;
  tripStatus: string;
  steps: DocumentFlowStep[];
  loading: boolean;
}

export interface ChangeImpact {
  affectedDocuments: Array<{
    type: DocumentType;
    label: string;
    impact: string;
    willRegenerate: boolean;
  }>;
  newVersionNumber: string;
  warnings: string[];
  requiresReapproval: boolean;
}

export function useDocumentFlow(quotationId: string | null) {
  const [flowState, setFlowState] = useState<DocumentFlowState | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDocumentFlow = useCallback(async () => {
    if (!quotationId) return;
    
    setLoading(true);
    try {
      // Fetch quotation data
      const { data: quotation, error: quotationError } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      // Fetch all document versions for this quotation
      const { data: versions, error: versionsError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;

      // Fetch payments to determine flow status
      const { data: payments } = await supabase
        .from('special_hire_payments')
        .select('*')
        .eq('quotation_id', quotationId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      // Get invoices from document_storage
      const { data: invoices } = await supabase
        .from('document_storage')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: true });

      const advancePayment = payments?.find(p => p.payment_type === 'advance');
      const balancePayment = payments?.find(p => p.payment_type === 'balance');
      const tripStatus = quotation.trip_status || 'pending';

      // Build flow steps
      const steps: DocumentFlowStep[] = [
        {
          type: 'quotation',
          label: 'Quotation',
          description: 'Initial quote sent to customer',
          status: quotation.status === 'confirmed' ? 'completed' : 
                  quotation.status === 'sent' ? 'sent' : 'ready',
          currentVersion: versions?.find(v => v.document_type === 'quotation' && v.document_status !== 'draft') as DocumentVersion | undefined,
          allVersions: (versions?.filter(v => v.document_type === 'quotation') || []) as DocumentVersion[],
          canEdit: tripStatus !== 'completed' && tripStatus !== 'cancelled',
          canGenerate: true
        },
        {
          type: 'advance_receipt',
          label: 'Advance Receipt',
          description: 'Receipt for advance payment',
          status: advancePayment ? 'completed' : 'pending',
          currentVersion: versions?.find(v => v.document_type === 'advance_receipt') as DocumentVersion | undefined,
          allVersions: (versions?.filter(v => v.document_type === 'advance_receipt') || []) as DocumentVersion[],
          canEdit: !!advancePayment && tripStatus !== 'completed',
          canGenerate: !!advancePayment
        },
        {
          type: 'post_trip_adjustment',
          label: 'Post-Trip Adjustment',
          description: 'Adjustments after trip completion',
          status: tripStatus === 'completed' ? 'completed' : 
                  tripStatus === 'in_progress' ? 'ready' : 'pending',
          currentVersion: versions?.find(v => v.document_type === 'post_trip_adjustment') as DocumentVersion | undefined,
          allVersions: (versions?.filter(v => v.document_type === 'post_trip_adjustment') || []) as DocumentVersion[],
          canEdit: tripStatus === 'in_progress' || tripStatus === 'pending_adjustment',
          canGenerate: tripStatus !== 'pending' && tripStatus !== 'cancelled'
        },
        {
          type: 'balance_invoice',
          label: 'Balance Invoice',
          description: 'Final invoice for remaining balance',
          status: balancePayment ? 'completed' : 
                  invoices?.some(i => i.payment_type === 'balance') ? 'sent' : 'pending',
          currentVersion: versions?.find(v => v.document_type === 'balance_invoice') as DocumentVersion | undefined,
          allVersions: (versions?.filter(v => v.document_type === 'balance_invoice') || []) as DocumentVersion[],
          canEdit: !balancePayment && tripStatus !== 'cancelled',
          canGenerate: !!advancePayment && tripStatus !== 'cancelled'
        }
      ];

      setFlowState({
        quotationId,
        quotationNo: quotation.quotation_no,
        tripStatus,
        steps,
        loading: false
      });

    } catch (error: any) {
      console.error('Error fetching document flow:', error);
      toast.error('Failed to load document flow');
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    fetchDocumentFlow();
  }, [fetchDocumentFlow]);

  const saveDocumentVersion = useCallback(async (
    documentType: DocumentType,
    documentData: Record<string, any>,
    changeReason?: string,
    previousData?: Record<string, any>
  ): Promise<DocumentVersion | null> => {
    if (!quotationId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current version number
      const { data: existingVersions } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('quotation_id', quotationId)
        .eq('document_type', documentType)
        .order('version_number', { ascending: false })
        .limit(1);

      const newVersionNumber = existingVersions?.[0]?.version_number 
        ? existingVersions[0].version_number + 1 
        : 1;

      // Calculate changes made
      let changesMade: Record<string, { old: any; new: any }> | undefined;
      if (previousData) {
        changesMade = {};
        Object.keys(documentData).forEach(key => {
          if (JSON.stringify(previousData[key]) !== JSON.stringify(documentData[key])) {
            changesMade![key] = {
              old: previousData[key],
              new: documentData[key]
            };
          }
        });
      }

      const { data, error } = await supabase
        .from('document_versions')
        .insert({
          quotation_id: quotationId,
          document_type: documentType,
          version_number: newVersionNumber,
          document_data: documentData,
          changes_made: changesMade,
          change_reason: changeReason,
          document_status: 'draft',
          changed_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchDocumentFlow();
      return data as DocumentVersion;

    } catch (error: any) {
      console.error('Error saving document version:', error);
      toast.error('Failed to save document version');
      return null;
    }
  }, [quotationId, fetchDocumentFlow]);

  const updateDocumentStatus = useCallback(async (
    versionId: string,
    newStatus: DocumentStatus,
    pdfPath?: string
  ) => {
    try {
      const { error } = await supabase
        .from('document_versions')
        .update({
          document_status: newStatus,
          generated_pdf_path: pdfPath
        })
        .eq('id', versionId);

      if (error) throw error;
      
      await fetchDocumentFlow();
      return true;

    } catch (error: any) {
      console.error('Error updating document status:', error);
      toast.error('Failed to update document status');
      return false;
    }
  }, [fetchDocumentFlow]);

  const calculateChangeImpact = useCallback((
    documentType: DocumentType,
    changedFields: string[]
  ): ChangeImpact => {
    const impact: ChangeImpact = {
      affectedDocuments: [],
      newVersionNumber: '',
      warnings: [],
      requiresReapproval: false
    };

    // Determine which documents will be affected
    if (documentType === 'quotation') {
      // Changes to quotation affect all downstream documents
      if (changedFields.includes('gross_revenue') || changedFields.includes('total_amount')) {
        impact.affectedDocuments.push({
          type: 'quotation',
          label: 'Quotation',
          impact: 'Amount will be updated',
          willRegenerate: true
        });
        impact.affectedDocuments.push({
          type: 'advance_receipt',
          label: 'Advance Receipt',
          impact: 'Balance due will change',
          willRegenerate: false
        });
        impact.affectedDocuments.push({
          type: 'balance_invoice',
          label: 'Balance Invoice',
          impact: 'Final amount will change',
          willRegenerate: true
        });
        impact.requiresReapproval = true;
        impact.warnings.push('Changing the total amount may require customer re-approval');
      }

      if (changedFields.includes('customer_name') || changedFields.includes('customer_email')) {
        impact.affectedDocuments.push({
          type: 'quotation',
          label: 'Quotation',
          impact: 'Customer details will be updated',
          willRegenerate: true
        });
        impact.warnings.push('All existing documents will show the new customer details');
      }
    }

    if (documentType === 'post_trip_adjustment') {
      impact.affectedDocuments.push({
        type: 'balance_invoice',
        label: 'Balance Invoice',
        impact: 'Adjustments will be reflected in final invoice',
        willRegenerate: true
      });
    }

    // Get version number
    const currentVersion = flowState?.steps.find(s => s.type === documentType)?.currentVersion;
    impact.newVersionNumber = `v${(currentVersion?.version_number || 0) + 1}`;

    return impact;
  }, [flowState]);

  const restoreVersion = useCallback(async (versionId: string): Promise<boolean> => {
    try {
      const { data: version, error: fetchError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (fetchError) throw fetchError;

      // Create a new version with the restored data
      const documentData = typeof version.document_data === 'object' && version.document_data !== null
        ? version.document_data as Record<string, any>
        : {};
      
      await saveDocumentVersion(
        version.document_type as DocumentType,
        documentData,
        `Restored from version ${version.version_number}`
      );

      toast.success(`Restored ${version.document_type} to version ${version.version_number}`);
      return true;

    } catch (error: any) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
      return false;
    }
  }, [saveDocumentVersion]);

  return {
    flowState,
    loading,
    refresh: fetchDocumentFlow,
    saveDocumentVersion,
    updateDocumentStatus,
    calculateChangeImpact,
    restoreVersion
  };
}
