import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DocumentSignatureManager } from './DocumentSignatureManager';
import { DocumentViewer } from './DocumentViewer';
import { useSignatureManagement, type ApprovalData } from '@/hooks/useSignatureManagement';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RefreshCw, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface EnhancedDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    document_type: string;
    file_name: string;
    document_data: string;
    quotation_id: string;
    payment_id?: string;
    payment_type: string;
    document_status?: string;
    generated_at?: string;
    file_size?: number;
  };
  onDownload?: () => void;
}

export const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  isOpen,
  onClose,
  document,
  onDownload,
}) => {
  const [approvals, setApprovals] = useState<ApprovalData[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [quotationData, setQuotationData] = useState<any>(null);
  const [currentDocument, setCurrentDocument] = useState(document);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const { user, hasRole } = useAuth();
  const { getDocumentApprovals } = useSignatureManagement();

  useEffect(() => {
    if (isOpen && document.quotation_id) {
      loadQuotationData();
    }
  }, [isOpen, document.quotation_id]);

  const loadQuotationData = async () => {
    try {
      const { data, error } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('id', document.quotation_id)
        .single();

      if (!error && data) {
        setQuotationData(data);
      }
    } catch (error) {
      console.error('Error loading quotation data:', error);
    }
  };

  const handleApprovalsUpdate = async () => {
    console.log('🔄 Approval updated - reloading and regenerating document...');
    
    // Reload approvals from database
    const result = await getDocumentApprovals(document.id);
    if (result.success) {
      console.log('✅ Loaded approvals:', result.approvals.length);
      
      // Type cast the approvals to match our interface
      const typedApprovals = result.approvals.map(approval => ({
        ...approval,
        approval_type: approval.approval_type as 'prepared_by' | 'checked_by' | 'approved_by'
      }));
      setApprovals(typedApprovals);
      
      // Ensure quotation data is loaded
      if (!quotationData) {
        console.log('⏳ Loading quotation data first...');
        await loadQuotationData();
      }
      
      // Give a moment for state to update
      setTimeout(async () => {
        console.log('🚀 Starting document regeneration...');
        toast.info('Regenerating document with signatures...');
        await regenerateDocumentWithSignatures();
      }, 300);
    }
  };

  const regenerateDocumentWithSignatures = async () => {
    if (!quotationData) {
      console.error('❌ Missing quotation data');
      toast.error('Missing quotation data to regenerate document');
      return;
    }

    try {
      setIsRegenerating(true);
      toast.loading('Fetching signatures and regenerating PDF...');
      console.log('📄 Regenerating document with ID:', document.id);

      // Get payment data if payment_id exists
      let paymentData = null;
      if (document.payment_id) {
        console.log('💰 Fetching payment data...');
        const { data, error: paymentError } = await supabase
          .from('special_hire_payments')
          .select('*')
          .eq('id', document.payment_id)
          .maybeSingle();

        if (!paymentError && data) {
          paymentData = data;
          console.log('✅ Payment data loaded');
        }
      } else {
        console.log('ℹ️ No payment_id - this is normal for some document types');
      }

      // Fetch current signatures
      console.log('✍️ Fetching signatures for document:', document.id);
      const { data: signatures, error: sigError } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', document.id);

      if (sigError) {
        console.error('❌ Error fetching signatures:', sigError);
        toast.error('Failed to fetch signatures');
        return;
      }

      console.log('✅ Fetched signatures:', signatures?.length || 0);
      
      if (!signatures || signatures.length === 0) {
        toast.warning('No signatures found. Please add signatures first.');
        return;
      }

      // Prepare approval signatures with validation and proper date formatting
      const approvalSignatures: any = {};
      let signatureCount = 0;
      
      if (signatures && signatures.length > 0) {
        signatures.forEach(approval => {
          // Validate signature data
          const hasSignatureImage = approval.signature_data && 
                                   approval.signature_data.length > 100 &&
                                   (approval.signature_data.startsWith('data:image/') || 
                                    approval.signature_data.startsWith('iVBOR'));
          
          console.log(`  - ${approval.approval_type}: ${approval.approver_name} ${hasSignatureImage ? '✓ (signature image valid)' : '✗ (text only - no image)'}`);
          
          if (hasSignatureImage) {
            signatureCount++;
          }
          
          // Ensure proper base64 format for images
          let signatureData = approval.signature_data;
          if (signatureData && !signatureData.startsWith('data:image/')) {
            signatureData = `data:image/png;base64,${signatureData}`;
          }
          
          approvalSignatures[approval.approval_type] = {
            approver_name: approval.approver_name,
            signature_data: signatureData,
            approval_date: format(new Date(approval.approval_date), 'dd/MM/yyyy'),
          };
        });
        
        console.log('📝 Approval signatures prepared for PDF:', {
          prepared_by: approvalSignatures.prepared_by?.approver_name || 'N/A',
          checked_by: approvalSignatures.checked_by?.approver_name || 'N/A',
          approved_by: approvalSignatures.approved_by?.approver_name || 'N/A',
          signatureImagesFound: signatureCount
        });
      } else {
        console.warn('⚠️ No signatures found for this document');
        toast.warning('No signatures to embed in document');
        return;
      }

      // Calculate total amount
      const calculateTotalAmount = (quotation: any) => {
        return quotation.gross_revenue + 
               (quotation.fuel_cost_fuel_only || 0) + 
               (quotation.commission_pass_through_amount || 0) +
               (quotation.total_additional_charges || 0) - 
               (quotation.discount_amount_lkr || 0);
      };

      // Create invoice data with signatures
      const invoiceData: InvoiceData = {
        invoiceNo: `UPDATED-${document.payment_type.toUpperCase()}-${Date.now()}`,
        invoiceType: document.payment_type as 'advance' | 'balance',
        quotationNo: quotationData.quotation_no,
        customerName: quotationData.customer_name,
        customerPhone: quotationData.customer_phone || '',
        customerEmail: quotationData.customer_email,
        companyName: quotationData.company_name,
        pickupLocation: quotationData.pickup_location,
        dropLocation: quotationData.drop_location,
        pickupDate: new Date(quotationData.pickup_datetime),
        dropDate: new Date(quotationData.drop_datetime || quotationData.pickup_datetime),
        busType: 'Standard Bus',
        numberOfBuses: quotationData.number_of_buses,
        numberOfPassengers: quotationData.number_of_passengers,
        totalAmount: calculateTotalAmount(quotationData),
        advanceAmount: quotationData.advance_paid || 0,
        paidAmount: paymentData?.amount || 0,
        vehicleNo: quotationData.assigned_bus_no,
        driverName: quotationData.assigned_driver_name,
        conductorName: quotationData.assigned_conductor_name,
        invoice_status: 'approved',
        document_type: document.document_type as 'sales_receipt' | 'invoice',
        preparedBy: approvalSignatures.prepared_by,
        approvedBy: approvalSignatures.approved_by,
        checkedBy: approvalSignatures.checked_by,
      };

      // Generate new PDF with signatures
      console.log('🖨️ Generating PDF with invoice data...');
      const pdfBlob = await generateInvoicePDF(invoiceData);
      console.log('✅ PDF generated, size:', pdfBlob.size, 'bytes');
      
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('🔄 Converting PDF to base64...');
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);
      console.log('✅ PDF converted to base64, length:', base64Data.length);

      // Update document in database
      console.log('💾 Updating document in database...');
      const newFileName = `SIGNED-${document.document_type}-${quotationData.quotation_no}-${Date.now()}.pdf`;
      const { error: updateError } = await supabase
        .from('document_storage')
        .update({
          document_data: base64Data,
          file_name: newFileName,
          file_size: uint8Array.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw updateError;
      }
      
      console.log('✅ Document updated in database');

      // Update local document state with new PDF data
      const updatedDoc = {
        ...document,
        document_data: base64Data,
        file_name: newFileName,
        file_size: uint8Array.length,
        generated_at: document.generated_at || new Date().toISOString(),
      };
      
      console.log('🔄 Updating component state with new document...');
      setCurrentDocument(updatedDoc);
      
      // Force re-render with a slight delay to ensure state updates
      setTimeout(() => {
        console.log('♻️ Force re-rendering PDF preview...');
        setCurrentDocument({...updatedDoc});
      }, 100);

      console.log('🎉 Document regeneration complete!');
      toast.success('✓ Document updated with signatures!');
    } catch (error) {
      console.error('Error regenerating document:', error);
      toast.error('Failed to regenerate document with signatures');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Check if user has permission to manage signatures (admin/supervisor/finance)
  const canManageSignatures = user && (hasRole('admin') || hasRole('supervisor') || hasRole('finance'));
  
  // Debug logging
  console.log('🔍 EnhancedDocumentViewer Debug:', {
    user: user?.email,
    hasUser: !!user,
    isAdmin: hasRole('admin'),
    isSupervisor: hasRole('supervisor'),
    isFinance: hasRole('finance'),
    canManageSignatures,
    isOpen
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Document Viewer - {document.file_name}</span>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Prominent Update Button */}
        {canManageSignatures && (
          <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-primary mb-1">Embed Signatures in PDF</h4>
                <p className="text-sm text-muted-foreground">
                  Click to update the PDF with all current signatures from the approval section
                </p>
              </div>
              <Button
                onClick={regenerateDocumentWithSignatures}
                disabled={isRegenerating || approvals.length === 0}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              >
                <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Updating PDF...' : 'Update PDF Now'}
              </Button>
            </div>
            {approvals.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Add signatures in the approval section first
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Document Preview</h3>
              {isRegenerating && (
                <Badge variant="secondary" className="animate-pulse">
                  Updating...
                </Badge>
              )}
            </div>
            <DocumentViewer
              key={currentDocument.document_data} // Force re-render when document data changes
              isOpen={false}
              onClose={() => {}}
              document={{
                ...currentDocument,
                quotation_id: currentDocument.quotation_id,
                document_type: currentDocument.document_type as 'sales_receipt' | 'invoice',
                payment_type: currentDocument.payment_type as 'advance' | 'balance' | 'full',
                document_status: (currentDocument.document_status || 'approved') as 'approved' | 'draft',
                generated_at: currentDocument.generated_at || new Date().toISOString(),
              }}
              onDownload={onDownload}
              onSignatureUpdated={handleApprovalsUpdate}
            />
          </div>

          {/* Signature Management */}
          {canManageSignatures && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Document Approvals</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignaturePreview(!showSignaturePreview)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showSignaturePreview ? 'Hide Preview' : 'Preview Signatures'}
                </Button>
              </div>

              {/* Signature Preview Section */}
              {showSignaturePreview && approvals.length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
                  <h4 className="font-semibold text-sm">Signature Details Preview</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {approvals.map((approval) => (
                      <div key={approval.id} className="border rounded-md p-3 bg-background">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">
                              {approval.approval_type.replace('_', ' ')}
                            </p>
                            <p className="font-semibold">{approval.approver_name}</p>
                          </div>
                          <Badge variant="default" className="text-xs">
                            {format(new Date(approval.approval_date), 'dd MMM yyyy')}
                          </Badge>
                        </div>
                        {approval.signature_data ? (
                          <div className="border rounded p-2 bg-white">
                            <img 
                              src={approval.signature_data} 
                              alt={`${approval.approver_name} signature`}
                              className="max-h-20 w-auto mx-auto"
                            />
                            <p className="text-xs text-center text-muted-foreground mt-1">
                              Digital Signature
                            </p>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded p-3 text-center">
                            <p className="text-sm font-medium">{approval.approver_name}</p>
                            <p className="text-xs text-muted-foreground">No signature image</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DocumentSignatureManager
                documentId={document.id}
                quotationId={document.quotation_id}
                paymentId={document.payment_id}
                documentStatus={(document.document_status || 'draft') as 'draft' | 'approved'}
                onSignatureUpdated={handleApprovalsUpdate}
              />
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {approvals.length > 0 && (
              <span>
                {approvals.length} signature{approvals.length !== 1 ? 's' : ''} added
              </span>
            )}
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};