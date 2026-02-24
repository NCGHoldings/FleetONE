import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Edit } from 'lucide-react';
import { generateInvoiceHTML, generateInvoicePDF, type ApprovalSignature, type InvoiceData } from '@/lib/invoice-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ApprovalSignatureModal } from './ApprovalSignatureModal';
import { format } from 'date-fns';
import { sanitizeHTML } from '@/lib/sanitize';

interface InvoiceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
  onDownload?: () => void;
}

export const InvoiceViewer = ({ isOpen, onClose, invoiceData }: InvoiceViewerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<{
    preparedBy?: ApprovalSignature;
    checkedBy?: ApprovalSignature;
    approvedBy?: ApprovalSignature;
  }>({});
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [currentApprovalType, setCurrentApprovalType] = useState<'prepared_by' | 'checked_by' | 'approved_by'>('prepared_by');

  // Fetch document ID and signatures from database
  useEffect(() => {
    if (!isOpen || !invoiceData.invoiceNo) return;

    const fetchDocumentAndSignatures = async () => {
      try {
        // Find the document_storage record for this invoice
        const { data: docData, error: docError } = await supabase
          .from('document_storage')
          .select('id')
          .eq('file_name', `${invoiceData.invoiceNo}.pdf`)
          .maybeSingle();

        if (docError) {
          console.error('Error fetching document:', docError);
          return;
        }

        if (docData) {
          setDocumentId(docData.id);

          // Fetch signatures for this document
          const { data: sigData, error: sigError } = await supabase
            .from('document_approvals')
            .select('*')
            .eq('document_id', docData.id);

          if (sigError) {
            console.error('Error fetching signatures:', sigError);
            return;
          }

          if (sigData && sigData.length > 0) {
            const preparedBy = sigData.find(s => s.approval_type === 'prepared_by');
            const checkedBy = sigData.find(s => s.approval_type === 'checked_by');
            const approvedBy = sigData.find(s => s.approval_type === 'approved_by');

            setSignatures({
              preparedBy: preparedBy ? {
                approver_name: preparedBy.approver_name,
                signature_data: preparedBy.signature_data || undefined,
                approval_date: format(new Date(preparedBy.approval_date), 'yyyy-MM-dd')
              } : undefined,
              checkedBy: checkedBy ? {
                approver_name: checkedBy.approver_name,
                signature_data: checkedBy.signature_data || undefined,
                approval_date: format(new Date(checkedBy.approval_date), 'yyyy-MM-dd')
              } : undefined,
              approvedBy: approvedBy ? {
                approver_name: approvedBy.approver_name,
                signature_data: approvedBy.signature_data || undefined,
                approval_date: format(new Date(approvedBy.approval_date), 'yyyy-MM-dd')
              } : undefined,
            });
          }
        }
      } catch (error) {
        console.error('Error in fetchDocumentAndSignatures:', error);
      }
    };

    fetchDocumentAndSignatures();
  }, [isOpen, invoiceData.invoiceNo]);

  const displayData: InvoiceData = {
    ...invoiceData,
    preparedBy: signatures.preparedBy,
    checkedBy: signatures.checkedBy,
    approvedBy: signatures.approvedBy,
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const pdfBlob = await generateInvoicePDF(displayData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${displayData.document_type === 'sales_receipt' ? 'receipt' : 'invoice'}-${displayData.quotationNo}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSignature = (type: 'prepared_by' | 'checked_by' | 'approved_by') => {
    if (!documentId) {
      toast.error('Document not found. Please save the document first.');
      return;
    }
    setCurrentApprovalType(type);
    setSignatureModalOpen(true);
  };

  const handleSignatureSaved = () => {
    setSignatureModalOpen(false);
    // Refresh signatures
    if (documentId) {
      supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', documentId)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error refreshing signatures:', error);
            return;
          }
          if (data && data.length > 0) {
            const preparedBy = data.find(s => s.approval_type === 'prepared_by');
            const checkedBy = data.find(s => s.approval_type === 'checked_by');
            const approvedBy = data.find(s => s.approval_type === 'approved_by');

            setSignatures({
              preparedBy: preparedBy ? {
                approver_name: preparedBy.approver_name,
                signature_data: preparedBy.signature_data || undefined,
                approval_date: format(new Date(preparedBy.approval_date), 'yyyy-MM-dd')
              } : undefined,
              checkedBy: checkedBy ? {
                approver_name: checkedBy.approver_name,
                signature_data: checkedBy.signature_data || undefined,
                approval_date: format(new Date(checkedBy.approval_date), 'yyyy-MM-dd')
              } : undefined,
              approvedBy: approvedBy ? {
                approver_name: approvedBy.approver_name,
                signature_data: approvedBy.signature_data || undefined,
                approval_date: format(new Date(approvedBy.approval_date), 'yyyy-MM-dd')
              } : undefined,
            });
          }
        });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>
              {invoiceData.document_type === 'sales_receipt' || invoiceData.invoiceType === 'advance' ? 'Sales Receipt' : 'Invoice'} Preview
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isLoading ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="preview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="signatures">Signatures</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-auto border rounded-lg bg-background mt-2">
              <div 
                className="text-foreground p-4"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(generateInvoiceHTML(displayData)) }}
              />
            </TabsContent>

            <TabsContent value="signatures" className="flex-1 mt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Prepared By */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Prepared By</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleManageSignature('prepared_by')}
                        disabled={!documentId}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {signatures.preparedBy ? 'Edit' : 'Add'}
                      </Button>
                    </div>
                    {signatures.preparedBy ? (
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {signatures.preparedBy.approver_name}</p>
                        <p><strong>Date:</strong> {signatures.preparedBy.approval_date}</p>
                        {signatures.preparedBy.signature_data && (
                          <div>
                            <strong>Signature:</strong>
                            <img 
                              src={signatures.preparedBy.signature_data} 
                              alt="Signature" 
                              className="max-w-full h-20 border rounded mt-1"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No signature added</p>
                    )}
                  </div>

                  {/* Checked By */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Checked By</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleManageSignature('checked_by')}
                        disabled={!documentId}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {signatures.checkedBy ? 'Edit' : 'Add'}
                      </Button>
                    </div>
                    {signatures.checkedBy ? (
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {signatures.checkedBy.approver_name}</p>
                        <p><strong>Date:</strong> {signatures.checkedBy.approval_date}</p>
                        {signatures.checkedBy.signature_data && (
                          <div>
                            <strong>Signature:</strong>
                            <img 
                              src={signatures.checkedBy.signature_data} 
                              alt="Signature" 
                              className="max-w-full h-20 border rounded mt-1"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No signature added</p>
                    )}
                  </div>

                  {/* Approved By */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Approved By</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleManageSignature('approved_by')}
                        disabled={!documentId}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {signatures.approvedBy ? 'Edit' : 'Add'}
                      </Button>
                    </div>
                    {signatures.approvedBy ? (
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {signatures.approvedBy.approver_name}</p>
                        <p><strong>Date:</strong> {signatures.approvedBy.approval_date}</p>
                        {signatures.approvedBy.signature_data && (
                          <div>
                            <strong>Signature:</strong>
                            <img 
                              src={signatures.approvedBy.signature_data} 
                              alt="Signature" 
                              className="max-w-full h-20 border rounded mt-1"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No signature added</p>
                    )}
                  </div>
                </div>

                {!documentId && (
                  <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
                    <p>To add signatures, the document must be saved first. Generate and save the document, then you can add signatures.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {documentId && (
        <ApprovalSignatureModal
          isOpen={signatureModalOpen}
          onClose={() => setSignatureModalOpen(false)}
          onSave={handleSignatureSaved}
          approvalType={currentApprovalType}
          documentId={documentId}
          title={`${currentApprovalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Signature`}
        />
      )}
    </>
  );
};