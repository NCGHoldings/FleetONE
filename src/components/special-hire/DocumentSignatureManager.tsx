import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApprovalSignatureModal } from './ApprovalSignatureModal';
import { useSignatureManagement, type ApprovalData } from '@/hooks/useSignatureManagement';
import { Pen, User, Calendar, Trash2 } from 'lucide-react';
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
    setEditingApproval(approval);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Document Signatures</h3>
        <Badge variant={documentStatus === 'approved' ? 'default' : 'secondary'}>
          {documentStatus === 'approved' ? 'Approved' : 'Draft'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {approvalTypes.map((approvalType) => {
          const approval = getApprovalByType(approvalType);
          
          return (
            <div key={approvalType} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{getApprovalTypeName(approvalType)}</h4>
                {approval && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditSignature(approval)}
                      className="h-8 w-8 p-0"
                    >
                      <Pen className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSignature(approval.id!)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {approval ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{approval.approver_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(approval.approval_date), 'dd/MM/yyyy')}</span>
                  </div>

                  {approval.signature_data && (
                    <div className="mt-2">
                      <img 
                        src={approval.signature_data} 
                        alt="Signature" 
                        className="max-w-full h-12 border border-border rounded"
                      />
                    </div>
                  )}
                  
                  <Badge variant="outline" className="text-xs">
                    {approval.signature_data ? 'With Signature' : 'Name Only'}
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddSignature(approvalType)}
                    className="flex items-center gap-2"
                  >
                    <Pen className="h-4 w-4" />
                    Add Signature
                  </Button>
                </div>
              )}
            </div>
          );
        })}
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