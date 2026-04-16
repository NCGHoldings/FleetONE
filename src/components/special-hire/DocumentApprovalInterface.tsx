import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignatureCaptureModal, type ApprovalData } from './SignatureCaptureModal';
import { useSignatureManagement, type ApprovalData as SignatureApprovalData } from '@/hooks/useSignatureManagement';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { Pen, Check, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DocumentApprovalInterfaceProps {
  documentId: string;
  quotationId?: string;
  paymentId?: string;
  onApprovalsUpdate?: (approvals: SignatureApprovalData[]) => void;
  showFinanceApproval?: boolean; // Only show for finance team
}

export const DocumentApprovalInterface: React.FC<DocumentApprovalInterfaceProps> = ({
  documentId,
  quotationId,
  paymentId,
  onApprovalsUpdate,
  showFinanceApproval = false,
}) => {
  const [approvals, setApprovals] = useState<SignatureApprovalData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentApprovalType, setCurrentApprovalType] = useState<'prepared_by' | 'checked_by' | 'approved_by'>('prepared_by');
  const [actualDocumentId, setActualDocumentId] = useState<string>(documentId);
  const { getDocumentApprovals, saveApproval, isLoading } = useSignatureManagement();
  const { ensureDocumentExists } = useDocumentManagement();

  useEffect(() => {
    loadApprovals();
  }, [documentId]);

  const loadApprovals = async () => {
    const result = await getDocumentApprovals(actualDocumentId);
    if (result.success) {
      // Type cast the approvals to match our interface
      const typedApprovals = result.approvals.map(approval => ({
        ...approval,
        approval_type: approval.approval_type as 'prepared_by' | 'checked_by' | 'approved_by'
      }));
      setApprovals(typedApprovals);
      onApprovalsUpdate?.(typedApprovals);
    }
  };

  const handleApprovalClick = async (type: 'prepared_by' | 'checked_by' | 'approved_by') => {
    // Ensure document exists before opening signature modal
    if (quotationId && !actualDocumentId) {
      const result = await ensureDocumentExists(quotationId, paymentId);
      if (result.success && result.documentId) {
        setActualDocumentId(result.documentId);
        setCurrentApprovalType(type);
        setShowModal(true);
      } else {
        toast.error('Failed to prepare document for signature.');
      }
    } else {
      setCurrentApprovalType(type);
      setShowModal(true);
    }
  };

  const handleSaveApproval = async (approvalData: ApprovalData) => {
    const signatureApprovalData: SignatureApprovalData = {
      document_id: actualDocumentId,
      approval_type: approvalData.approvalType,
      approver_name: approvalData.approverName,
      signature_data: approvalData.signatureData,
      approval_date: approvalData.approvalDate,
    };

    const result = await saveApproval(signatureApprovalData);
    if (result.success) {
      await loadApprovals();
    }
  };

  const getApprovalByType = (type: 'prepared_by' | 'checked_by' | 'approved_by') => {
    return approvals.find(approval => approval.approval_type === type);
  };

  const getApprovalStatus = (type: 'prepared_by' | 'checked_by' | 'approved_by') => {
    const approval = getApprovalByType(type);
    if (approval) {
      return { status: 'completed', approval };
    }
    return { status: 'pending', approval: null };
  };

  const approvalTypes = [
    { type: 'prepared_by' as const, title: 'Prepared By', description: 'Document preparer signature' },
    { type: 'checked_by' as const, title: 'Checked By', description: 'Document reviewer signature' },
    { type: 'approved_by' as const, title: 'Approved By', description: 'Finance/Supervisor approval', requiresFinance: true },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {approvalTypes.map((approvalType) => {
          // Hide finance approval if user doesn't have permission
          if (approvalType.requiresFinance && !showFinanceApproval) {
            return null;
          }

          const { status, approval } = getApprovalStatus(approvalType.type);
          
          return (
            <Card key={approvalType.type} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{approvalType.title}</CardTitle>
                  <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                    {status === 'completed' ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {status === 'completed' ? 'Signed' : 'Pending'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{approvalType.description}</p>
              </CardHeader>
              
              <CardContent className="pt-0">
                {approval ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{approval.approver_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(approval.approval_date), 'dd/MM/yyyy')}
                    </p>
                    {approval.signature_data && (
                      <div className="mt-2 p-2 border border-gray-200 rounded-md">
                        <img 
                          src={approval.signature_data} 
                          alt="Signature" 
                          className="max-h-12 w-auto mx-auto"
                        />
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprovalClick(approvalType.type)}
                      className="w-full mt-2"
                    >
                      <Pen className="w-3 h-3 mr-1" />
                      Update
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprovalClick(approvalType.type)}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Pen className="w-3 h-3 mr-1" />
                    Add Signature
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SignatureCaptureModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveApproval}
        approvalType={currentApprovalType}
        title={approvalTypes.find(t => t.type === currentApprovalType)?.title || 'Add Approval'}
        documentId={actualDocumentId}
      />
    </div>
  );
};