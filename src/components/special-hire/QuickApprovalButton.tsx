import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoSignature } from '@/hooks/useAutoSignature';
import { useDocumentRegeneration } from '@/hooks/useDocumentRegeneration';

interface QuickApprovalButtonProps {
  documentId: string;
  quotationId: string;
  onApproved?: () => void;
}

export const QuickApprovalButton = ({
  documentId,
  quotationId,
  onApproved,
}: QuickApprovalButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { autoAddSignature } = useAutoSignature();
  const { regenerateDocumentWithSignatures } = useDocumentRegeneration();

  const handleQuickApprove = async () => {
    try {
      setIsProcessing(true);

      // Auto-add approved_by signature using the actual document ID
      const result = await autoAddSignature(documentId, 'approved_by');

      if (!result.success) {
        if (result.skipped) {
          toast.error(
            `Auto-signature not configured: ${result.reason || 'Please configure default signer in Settings'}`
          );
        } else {
          toast.error('Failed to add approval signature');
        }
        return;
      }

      if (result.existed) {
        toast.info('Document already has approval signature');
      } else {
        toast.success(`Approval signature added: ${result.approver_name}`);
      }

      // Regenerate PDF with new signature
      toast.info('Updating document...');
      const regenResult = await regenerateDocumentWithSignatures(documentId, quotationId);

      if (regenResult.success) {
        toast.success('✅ Document approved and updated successfully!');
        onApproved?.();
      } else {
        toast.error('Document approved but failed to regenerate PDF');
      }
    } catch (error) {
      console.error('Quick approval error:', error);
      toast.error('Failed to approve document');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleQuickApprove}
      disabled={isProcessing}
      variant="default"
      className="bg-purple-600 hover:bg-purple-700"
    >
      <CheckCircle className="w-4 h-4 mr-2" />
      {isProcessing ? 'Processing...' : 'Quick Approve'}
    </Button>
  );
};
