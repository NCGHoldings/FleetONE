import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApprovalSignatureModal } from './ApprovalSignatureModal';
import { SignaturePreviewCard } from './SignaturePreviewCard';
import { useSignatureManagement, type ApprovalData } from '@/hooks/useSignatureManagement';
import { Pen, User, Calendar, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DocumentSignatureManagerProps {
  documentId: string;
  documentStatus: 'draft' | 'approved';
  onSignatureUpdated?: () => void;
}

export const DocumentSignatureManager: React.FC<DocumentSignatureManagerProps> = ({
  documentId,
  documentStatus,
  onSignatureUpdated,
}) => {
  const [approvals, setApprovals] = useState<ApprovalData[]>([]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentApprovalType, setCurrentApprovalType] = useState<'prepared_by' | 'checked_by' | 'approved_by'>('prepared_by');
  const [editingApproval, setEditingApproval] = useState<ApprovalData | undefined>();
  
  const { getDocumentApprovals, deleteApproval, isLoading } = useSignatureManagement();

  useEffect(() => {
    loadApprovals();
  }, [documentId]);

  const loadApprovals = async () => {
    const result = await getDocumentApprovals(documentId);
    if (result.success) {
      // Type cast the approvals to match our interface
      const typedApprovals = result.approvals.map(approval => ({
        ...approval,
        approval_type: approval.approval_type as 'prepared_by' | 'checked_by' | 'approved_by'
      }));
      setApprovals(typedApprovals);
    }
  };

  const handleAddSignature = (approvalType: 'prepared_by' | 'checked_by' | 'approved_by') => {
    setCurrentApprovalType(approvalType);
    setEditingApproval(undefined);
    setShowSignatureModal(true);
  };

  const handleEditSignature = (approval: ApprovalData) => {
    setCurrentApprovalType(approval.approval_type);
    setEditingApproval(approval.id ? approval : undefined); // Only set existing approval if it has an ID
    setShowSignatureModal(true);
  };

  const handleDeleteSignature = async (approvalId: string) => {
    if (window.confirm('Are you sure you want to delete this signature?')) {
      const result = await deleteApproval(approvalId);
      if (result.success) {
        await loadApprovals();
        onSignatureUpdated?.();
        toast.success('Signature deleted successfully');
      }
    }
  };

  const handleSignatureSaved = async () => {
    await loadApprovals();
    onSignatureUpdated?.();
  };

  const getApprovalTypeName = (type: string) => {
    switch (type) {
      case 'prepared_by': return 'Prepared By';
      case 'checked_by': return 'Checked By';  
      case 'approved_by': return 'Approved By';
      default: return type;
    }
  };

  const getApprovalByType = (type: 'prepared_by' | 'checked_by' | 'approved_by') => {
    return approvals.find(a => a.approval_type === type);
  };

  const approvalTypes: Array<'prepared_by' | 'checked_by' | 'approved_by'> = ['prepared_by', 'checked_by', 'approved_by'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Document Signatures</h3>
          <p className="text-sm text-muted-foreground">
            Manage signatures for document approval workflow
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={documentStatus === 'approved' ? 'default' : 'secondary'}>
            {documentStatus === 'approved' ? 'Approved' : 'Draft'}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadApprovals}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {approvalTypes.map((approvalType) => {
          const approval = getApprovalByType(approvalType);
          
          return (
            <SignaturePreviewCard
              key={approvalType}
              title={getApprovalTypeName(approvalType)}
              approvalType={approvalType}
              approval={approval}
              onEdit={() => handleEditSignature(approval || { 
                approval_type: approvalType,
                document_id: documentId,
                approver_name: '',
                approval_date: format(new Date(), 'yyyy-MM-dd')
              })}
              showAddButton={!approval}
            />
          );
        })}
      </div>

      {/* Quick Action Summary */}
      <div className="bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Signature Status: {approvals.length} of 3 signatures completed
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All signatures are required for final document approval
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            {approvalTypes.map((type) => {
              const hasSignature = getApprovalByType(type);
              return (
                <div
                  key={type}
                  className={`w-3 h-3 rounded-full ${
                    hasSignature ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  title={`${getApprovalTypeName(type)}: ${hasSignature ? 'Completed' : 'Pending'}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <ApprovalSignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          documentId={documentId}
          approvalType={currentApprovalType}
          title={`${getApprovalTypeName(currentApprovalType)} Signature`}
          onSave={handleSignatureSaved}
          existingApproval={editingApproval}
        />
      )}
    </div>
  );
};