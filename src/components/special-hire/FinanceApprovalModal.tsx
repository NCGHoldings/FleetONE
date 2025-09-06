import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, ExternalLink, FileText, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { DocumentViewer } from './DocumentViewer';
import { format } from 'date-fns';

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
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  
  const { getDocumentsByQuotation, approveDocument } = useDocumentManagement();

  // Load documents when modal opens
  useEffect(() => {
    if (isOpen && paymentData) {
      loadDocuments();
    }
  }, [isOpen, paymentData]);

  const loadDocuments = async () => {
    if (!paymentData) return;
    
    setDocumentsLoading(true);
    try {
      // Get documents by quotation ID (we need to find the quotation ID from the payment)
      const { data: paymentDetails, error } = await supabase
        .from('special_hire_payments')
        .select('quotation_id')
        .eq('id', paymentData.id)
        .single();
      
      if (error) throw error;
      
      const result = await getDocumentsByQuotation(paymentDetails.quotation_id);
      if (result.success) {
        // Filter documents related to this payment
        const paymentDocuments = result.documents?.filter(doc => doc.payment_id === paymentData.id) || [];
        setDocuments(paymentDocuments);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleApproveDocument = async (documentId: string) => {
    const result = await approveDocument(documentId);
    if (result.success) {
      await loadDocuments(); // Reload documents to show updated status
    }
    return result;
  };

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

          {/* Draft Documents Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label className="font-medium">Generated Documents</Label>
                
                {documentsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Loading documents...</p>
                  </div>
                ) : documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {doc.document_type === 'sales_receipt' ? 'Sales Receipt' : 'Invoice'}
                              </span>
                              <Badge variant={doc.document_status === 'draft' ? 'secondary' : 'default'}>
                                {doc.document_status === 'draft' ? 'DRAFT' : 'APPROVED'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Generated: {format(new Date(doc.generated_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDocument(doc);
                              setDocumentViewerOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          
                          {doc.document_status === 'draft' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApproveDocument(doc.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve Document
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No documents found for this payment.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
      
      {/* Document Viewer */}
      {documentViewerOpen && selectedDocument && (
        <DocumentViewer
          isOpen={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}
    </Dialog>
  );
};