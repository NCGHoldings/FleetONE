import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download, X, FileText, Settings, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentSignatureManager } from './DocumentSignatureManager';
import { EnhancedPDFViewer } from './EnhancedPDFViewer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    quotation_id?: string;
    payment_id?: string;
    document_type: 'sales_receipt' | 'invoice';
    payment_type: 'advance' | 'balance' | 'full';
    document_status: 'draft' | 'approved';
    file_name: string;
    file_size?: number;
    generated_at: string;
    document_data: string; // base64 encoded PDF
  };
  onDownload?: () => void;
  onSignatureUpdated?: () => void;
}

export const DocumentViewer = ({ 
  isOpen, 
  onClose, 
  document, 
  onDownload,
  onSignatureUpdated
}: DocumentViewerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(document);
  const pdfViewerDownloadRef = useRef<(() => void) | null>(null);
  const { user, hasRole } = useAuth();
  
  // Check if user can manage signatures - allow all authenticated users
  const canManageSignatures = !!user;

  const handleDownload = async () => {
    // Use the PDF viewer's download function (includes annotations)
    if (pdfViewerDownloadRef.current) {
      pdfViewerDownloadRef.current();
      return;
    }

    // Fallback to original download
    if (onDownload) {
      setIsLoading(true);
      try {
        await onDownload();
      } finally {
        setIsLoading(false);
      }
    } else {
      // Default download behavior (robust decoding)
      const arr = toUint8FromAny(document.document_data);
      if (!arr) {
        console.error('Unable to decode document for download');
        return;
      }
      const blob = new Blob([new Uint8Array(arr)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const normalizeBase64 = (str: string) => {
    let s = (str || '').trim().replace(/\s/g, '');
    if (s.startsWith('data:')) s = s.substring(s.indexOf(',') + 1);
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4;
    if (pad) s += '='.repeat(4 - pad);
    return s;
  };

  const isHexString = (str: string) => /^\\x?[0-9a-fA-F]+$/.test((str || '').trim());

  const hexToUint8Array = (hex: string) => {
    let h = (hex || '').trim();
    if (h.startsWith('\\x')) h = h.slice(2);
    if (h.length % 2 !== 0) return new Uint8Array();
    const arr = new Uint8Array(h.length / 2);
    for (let i = 0; i < h.length; i += 2) arr[i / 2] = parseInt(h.substring(i, i + 2), 16);
    return arr;
  };

  const bufferJsonToUint8 = (str: string): Uint8Array | null => {
    try {
      const obj = JSON.parse(str);
      if (obj && obj.type === 'Buffer' && Array.isArray(obj.data)) return new Uint8Array(obj.data);
    } catch {}
    return null;
  };

  const toUint8FromAny = (raw: string): Uint8Array | null => {
    if (!raw) return null;
    // JSON Buffer format
    const jsonArr = bufferJsonToUint8(raw);
    if (jsonArr) return jsonArr;
    // Hex format (e.g. "\\x25504446...")
    if (isHexString(raw)) return hexToUint8Array(raw);
    // Base64 (normalize first)
    try {
      const b64 = normalizeBase64(raw);
      const byteStr = atob(b64);
      const nums = new Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) nums[i] = byteStr.charCodeAt(i);
      return new Uint8Array(nums);
    } catch (err) {
      console.error('Failed to decode document data', err);
      return null;
    }
  };

  const createPdfBlobUrl = (arr: Uint8Array) => {
    const blob = new Blob([new Uint8Array(arr)], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  const getPdfDataUrl = () => {
    try {
      if (!document.document_data) return '';
      const arr = toUint8FromAny(document.document_data);
      if (!arr) return '';
      // Prefer blob URL for consistent rendering
      return createPdfBlobUrl(arr);
    } catch (error) {
      console.error('Error creating PDF URL:', error);
      return '';
    }
  };

  const getPdfBlob = () => {
    try {
      if (!document.document_data) return '';
      const arr = toUint8FromAny(document.document_data);
      if (!arr) return '';
      return createPdfBlobUrl(arr);
    } catch (error) {
      console.error('Error creating PDF blob URL:', error);
      return '';
    }
  };

  const getDocumentTitle = () => {
    const type = document.document_type === 'sales_receipt' ? 'Sales Receipt' : 'Invoice';
    const status = document.document_status === 'draft' ? ' (DRAFT)' : '';
    return `${type}${status}`;
  };

  const getStatusBadge = () => {
    if (document.document_status === 'draft') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">DRAFT</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">APPROVED</Badge>;
  };

  const regenerateDocumentWithSignatures = async () => {
    if (!document.quotation_id) {
      toast.error('Missing quotation data');
      return;
    }

    try {
      setIsRegenerating(true);
      toast.loading('Updating PDF with signatures...');

      // Fetch quotation data
      const { data: quotationData, error: quotError } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('id', document.quotation_id)
        .single();

      if (quotError || !quotationData) {
        throw new Error('Failed to load quotation data');
      }

      // Fetch payment data if exists
      let paymentData = null;
      if (document.payment_type) {
        const { data, error: paymentError } = await supabase
          .from('special_hire_payments')
          .select('*')
          .eq('quotation_id', document.quotation_id)
          .eq('payment_type', document.payment_type)
          .maybeSingle();

        if (!paymentError && data) {
          paymentData = data;
        }
      }

      // Fetch signatures
      const { data: signatures, error: sigError } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', document.id);

      if (sigError) {
        throw new Error('Failed to fetch signatures');
      }

      if (!signatures || signatures.length === 0) {
        toast.warning('No signatures found. Please add signatures first.');
        return;
      }

      // Prepare approval signatures
      const approvalSignatures: any = {};
      signatures.forEach(approval => {
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

      // Calculate total amount
      const totalAmount = quotationData.gross_revenue + 
        (quotationData.fuel_cost_fuel_only || 0) + 
        (quotationData.commission_pass_through_amount || 0) +
        (quotationData.total_additional_charges || 0) - 
        (quotationData.discount_amount_lkr || 0);

      // Create invoice data
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
        totalAmount,
        advanceAmount: quotationData.advance_paid || 0,
        paidAmount: paymentData?.amount || 0,
        vehicleNo: quotationData.assigned_bus_no,
        driverName: quotationData.assigned_driver_name,
        conductorName: quotationData.assigned_conductor_name,
        invoice_status: 'approved',
        document_type: document.document_type,
        preparedBy: approvalSignatures.prepared_by,
        approvedBy: approvalSignatures.approved_by,
        checkedBy: approvalSignatures.checked_by,
      };

      // Generate PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Update document in database
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
        throw updateError;
      }

      // Update local state
      const updatedDoc = {
        ...document,
        document_data: base64Data,
        file_name: newFileName,
        file_size: uint8Array.length,
      };
      setCurrentDocument(updatedDoc);

      toast.success('✓ PDF updated with signatures!');
      
      // Trigger callback
      if (onSignatureUpdated) {
        onSignatureUpdated();
      }
    } catch (error) {
      console.error('Error regenerating document:', error);
      toast.error('Failed to update PDF with signatures');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <DialogTitle>{getDocumentTitle()}</DialogTitle>
            {getStatusBadge()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isLoading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="preview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Document Preview</TabsTrigger>
              <TabsTrigger value="signatures">Signatures & Approval</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="flex-1 overflow-hidden border rounded-lg bg-gray-50 mt-2">
              {(() => {
                if (!document.document_data) {
                  return (
                    <div className="flex items-center justify-center h-[70vh] text-muted-foreground">
                      <div className="text-center">
                        <p>Document data not available</p>
                        <p className="text-sm">Please try regenerating the document</p>
                      </div>
                    </div>
                  );
                }

                // Use currentDocument state for updated PDF
                const displayDoc = currentDocument.document_data !== document.document_data ? currentDocument : document;
                const pdfUrl = (() => {
                  try {
                    if (!displayDoc.document_data) return '';
                    const arr = toUint8FromAny(displayDoc.document_data);
                    if (!arr) return '';
                    return createPdfBlobUrl(arr);
                  } catch (error) {
                    console.error('Error creating PDF URL:', error);
                    return '';
                  }
                })();
                const blobUrl = pdfUrl;
                
                if (!pdfUrl && !blobUrl) {
                  return (
                    <div className="flex items-center justify-center h-[70vh] text-muted-foreground">
                      <div className="text-center">
                        <p>Unable to display document</p>
                        <p className="text-sm">The document data appears to be corrupted</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={handleDownload}
                        >
                          Try Download Instead
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Use the enhanced PDF viewer with editing capabilities
                return (
                  <div className="h-[70vh]">
                    <EnhancedPDFViewer
                      pdfUrl={blobUrl || pdfUrl}
                      onDownloadReady={(downloadFn) => {
                        pdfViewerDownloadRef.current = downloadFn;
                      }}
                      onSave={(canvasData) => {
                        console.log('Canvas annotations saved:', canvasData);
                        // Here you could save the canvas data to your database
                        // for persistent annotations
                      }}
                    />
                  </div>
                );
              })()}
            </TabsContent>
            
            <TabsContent value="signatures" className="flex-1 mt-2">
              <div className="h-[70vh] overflow-y-auto p-4 space-y-4">
                {/* Update PDF Button */}
                {canManageSignatures && (
                  <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-primary mb-1">Update PDF with Signatures</h4>
                        <p className="text-sm text-muted-foreground">
                          Click to embed all signatures into the PDF document
                        </p>
                      </div>
                      <Button
                        onClick={regenerateDocumentWithSignatures}
                        disabled={isRegenerating}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? 'Updating PDF...' : 'Update PDF Now'}
                      </Button>
                    </div>
                  </div>
                )}
                
                <DocumentSignatureManager
                  documentId={document.id}
                  quotationId={document.quotation_id}
                  paymentId={document.payment_id}
                  documentStatus={document.document_status}
                  onSignatureUpdated={onSignatureUpdated}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-xs text-muted-foreground pt-2">
          Generated: {new Date(document.generated_at).toLocaleString()} | 
          Size: {document.file_size ? `${(document.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
        </div>
      </DialogContent>
    </Dialog>
  );
};