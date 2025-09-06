import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FinanceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (notes?: string) => void;
  onReject: (reason: string) => void;
  paymentData: {
    id: string;
    amount: number;
    payment_type: string;
    method: string;
    reference_no?: string;
    payment_proof_url?: string;
    notes?: string;
    status: string;
    created_at: string;
    quotation: {
      quotation_no: string;
      customer_name: string;
      company_name?: string;
    };
  };
  loading?: boolean;
}

export const FinanceApprovalModal = ({ 
  isOpen, 
  onClose, 
  onApprove, 
  onReject, 
  paymentData, 
  loading = false 
}: FinanceApprovalModalProps) => {
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = () => {
    setAction('approve');
    onApprove(notes || undefined);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    setAction('reject');
    onReject(rejectionReason);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_finance':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Finance</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finance Payment Approval</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Quotation No:</p>
                  <p className="text-muted-foreground">{paymentData.quotation.quotation_no}</p>
                </div>
                <div>
                  <p className="font-medium">Customer:</p>
                  <p className="text-muted-foreground">{paymentData.quotation.company_name || paymentData.quotation.customer_name}</p>
                </div>
                <div>
                  <p className="font-medium">Amount:</p>
                  <p className="text-muted-foreground font-semibold text-lg">LKR {paymentData.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium">Payment Type:</p>
                  <p className="text-muted-foreground capitalize">{paymentData.payment_type}</p>
                </div>
                <div>
                  <p className="font-medium">Method:</p>
                  <p className="text-muted-foreground capitalize">{paymentData.method}</p>
                </div>
                <div>
                  <p className="font-medium">Status:</p>
                  {getStatusBadge(paymentData.status)}
                </div>
                {paymentData.reference_no && (
                  <div className="col-span-2">
                    <p className="font-medium">Reference:</p>
                    <p className="text-muted-foreground">{paymentData.reference_no}</p>
                  </div>
                )}
                {paymentData.notes && (
                  <div className="col-span-2">
                    <p className="font-medium">Operations Notes:</p>
                    <p className="text-muted-foreground">{paymentData.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Proof */}
          {paymentData.payment_proof_url && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="font-medium">Payment Proof</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { data: signedUrl } = await supabase.storage
                            .from('payment-proofs')
                            .createSignedUrl(paymentData.payment_proof_url!, 300);
                          if (signedUrl?.signedUrl) {
                            window.open(signedUrl.signedUrl, '_blank');
                          }
                        } catch (e) {
                          window.open(paymentData.payment_proof_url!, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Payment Proof
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Finance Review */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Finance Review</Label>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Approval Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the approval..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection">Rejection Reason (Required if rejecting)</Label>
              <Textarea
                id="rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide detailed reason for rejection..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReject} 
            disabled={loading || !rejectionReason.trim() || action === 'approve'}
          >
            {loading && action === 'reject' ? 'Rejecting...' : 'Reject Payment'}
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={loading || action === 'reject'}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading && action === 'approve' ? 'Approving...' : 'Approve Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};