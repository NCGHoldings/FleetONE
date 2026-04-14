import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SignatureCaptureModal, type ApprovalData } from './SignatureCaptureModal';
import { useFinanceApproval } from '@/hooks/useFinanceApproval';
import { type ApprovalSignature } from '@/lib/invoice-generator';
import { Check, FileText, Pen } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '@/contexts/CompanyContext';

interface FinanceApprovalWithSignatureProps {
  paymentId: string;
  onApproved?: () => void;
  disabled?: boolean;
}

export const FinanceApprovalWithSignature: React.FC<FinanceApprovalWithSignatureProps> = ({
  paymentId,
  onApproved,
  disabled = false,
}) => {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { approvePayment, isLoading } = useFinanceApproval();
  const { getEffectiveCompanyId } = useCompany();

  const handleApprovalWithSignature = async (approvalData: any) => {
    try {
      setIsApproving(true);
      
      const approverSignature: ApprovalSignature = {
        approver_name: approvalData.approver_name,
        signature_data: approvalData.signature_data,
        approval_date: approvalData.approval_date,
      };

      const result = await approvePayment(paymentId, `Approved by ${approverSignature.approver_name} with signature`, undefined, getEffectiveCompanyId());

      if (result.success) {
        setShowApprovalModal(false);
        onApproved?.();
        toast.success('Payment approved with signature successfully!');
      }
    } catch (error) {
      console.error('Error approving with signature:', error);
      toast.error('Failed to approve payment with signature');
    } finally {
      setIsApproving(false);
    }
  };

  const handleQuickApproval = async () => {
    try {
      setIsApproving(true);
      const result = await approvePayment(paymentId, 'Quick approval without signature', undefined, getEffectiveCompanyId());
      
      if (result.success) {
        onApproved?.();
        toast.success('Payment approved successfully!');
      }
    } catch (error) {
      console.error('Error with quick approval:', error);
      toast.error('Failed to approve payment');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleQuickApproval}
        disabled={disabled || isLoading || isApproving}
        className="flex items-center gap-2"
        variant="default"
      >
        <Check className="h-4 w-4" />
        Quick Approve
      </Button>

      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogTrigger asChild>
          <Button
            disabled={disabled || isLoading || isApproving}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Pen className="h-4 w-4" />
            Approve with Signature
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <SignatureCaptureModal
            isOpen={showApprovalModal}
            onClose={() => setShowApprovalModal(false)}
            documentId={paymentId}
            approvalType="approved_by"
            title="Finance Approval Signature"
            onSave={handleApprovalWithSignature}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};