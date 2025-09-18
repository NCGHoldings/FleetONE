import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DocumentSignatureManager } from './DocumentSignatureManager';
import { DocumentViewer } from './DocumentViewer';
import { useSignatureManagement, type ApprovalData } from '@/hooks/useSignatureManagement';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RefreshCw, Download } from 'lucide-react';

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
  const { user } = useAuth();
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
    // Reload approvals from database
    const result = await getDocumentApprovals(document.quotation_id);
    if (result.success) {
      // Type cast the approvals to match our interface
      const typedApprovals = result.approvals.map(approval => ({
        ...approval,
        approval_type: approval.approval_type as 'prepared_by' | 'checked_by' | 'approved_by'
      }));
      setApprovals(typedApprovals);
      
      // Auto-regenerate document with new signatures
      if (typedApprovals.length > 0) {
        await regenerateDocumentWithSignatures();
      }
    }
  };

  const regenerateDocumentWithSignatures = async () => {
    if (!quotationData || !document.payment_id) {
      toast.error('Missing required data to regenerate document');
      return;
    }

    try {
      setIsRegenerating(true);

      // Get payment data
      const { data: paymentData, error: paymentError } = await supabase
        .from('special_hire_payments')
        .select('*')
        .eq('id', document.payment_id)
        .single();

      if (paymentError || !paymentData) {
        throw new Error('Failed to fetch payment data');
      }

      // Fetch current signatures
      const { data: signatures } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', document.quotation_id);

      // Prepare approval signatures
      const approvalSignatures: any = {};
      if (signatures) {
        signatures.forEach(approval => {
          approvalSignatures[approval.approval_type] = {
            approver_name: approval.approver_name,
            signature_data: approval.signature_data,
            approval_date: approval.approval_date,
          };
        });
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
        paidAmount: paymentData.amount,
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
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Update document in database
      const { error: updateError } = await supabase
        .from('document_storage')
        .update({
          document_data: base64Data,
          file_name: `UPDATED-${document.document_type}-${quotationData.quotation_no}-${Date.now()}.pdf`,
          file_size: uint8Array.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);

      if (updateError) throw updateError;

      // Update local document state instead of reloading
      setCurrentDocument({
        ...document,
        document_data: base64Data,
        file_name: `UPDATED-${document.document_type}-${quotationData.quotation_no}-${Date.now()}.pdf`,
        file_size: uint8Array.length,
        generated_at: new Date().toISOString(),
      });

      toast.success('Document updated with signatures successfully!');
    } catch (error) {
      console.error('Error regenerating document:', error);
      toast.error('Failed to regenerate document with signatures');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Check if user has permission to manage signatures (admin/supervisor/finance)
  const canManageSignatures = user && ['admin', 'supervisor', 'finance'].includes(user.role || '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Document Viewer - {document.file_name}</span>
            <div className="flex items-center gap-2">
              {canManageSignatures && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateDocumentWithSignatures}
                  disabled={isRegenerating}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Update with Signatures
                </Button>
              )}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Document Preview</h3>
            <DocumentViewer
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
              </div>
              <DocumentSignatureManager
                documentId={document.quotation_id}
                quotationId={document.quotation_id}
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