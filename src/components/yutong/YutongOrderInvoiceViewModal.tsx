import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Mail, Printer, CheckCircle, RefreshCw, FileText, PenTool } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useYutongOrderInvoiceManagement } from '@/hooks/useYutongOrderInvoiceManagement';
import { generateYutongOrderInvoiceHTML, generateYutongOrderInvoicePDF } from '@/lib/yutong-order-invoice-generator';
import { YutongInvoiceSignatureManager } from './YutongInvoiceSignatureManager';
import { YutongOrderInvoicePreview } from './YutongOrderInvoicePreview';

interface YutongOrderInvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  onRefresh?: () => void;
}

export function YutongOrderInvoiceViewModal({
  isOpen,
  onClose,
  document,
  onRefresh
}: YutongOrderInvoiceViewModalProps) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isLoading, approveInvoice, regenerateInvoice } = useYutongOrderInvoiceManagement();

  const invoiceHTML = generateYutongOrderInvoiceHTML(document.invoice_data);
  const isDraft = document.document_status === 'draft';

  const handleSignaturesUpdated = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Signatures updated. Invoice preview refreshed automatically.');
  };

  const handleDownload = async () => {
    try {
      toast.info('Generating invoice with latest signatures...');
      
      const { data: signatures } = await supabase
        .from('yutong_invoice_signatures')
        .select('*')
        .eq('invoice_record_id', document.invoice_record_id)
        .order('created_at', { ascending: true });
      
      const preparedSig = signatures?.find(s => s.signature_role === 'prepared_by');
      const approvedSig = signatures?.find(s => s.signature_role === 'approved_by');
      const receivedSig = signatures?.find(s => s.signature_role === 'customer');
      
      const mergedData = {
        ...document.invoice_data,
        preparedBy: preparedSig ? {
          approver_name: preparedSig.signer_name,
          signature_data: preparedSig.signature_data,
          signature_type: preparedSig.signature_type,
          approval_date: preparedSig.signed_at
        } : undefined,
        approvedBy: approvedSig ? {
          approver_name: approvedSig.signer_name,
          signature_data: approvedSig.signature_data,
          signature_type: approvedSig.signature_type,
          approval_date: approvedSig.signed_at
        } : undefined,
        receivedBy: receivedSig ? {
          approver_name: receivedSig.signer_name,
          signature_data: receivedSig.signature_data,
          signature_type: receivedSig.signature_type,
          approval_date: receivedSig.signed_at
        } : undefined
      };
      
      const pdfBlob = await generateYutongOrderInvoicePDF(mergedData);
      
      const url = URL.createObjectURL(pdfBlob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.invoice_data.invoice_no}_with_signatures.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded with latest signatures!');
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handleEmail = async () => {
    setIsSendingEmail(true);
    
    try {
      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(document.file_path);
      
      const { error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          to: document.invoice_data.contact || 'customer@example.com',
          subject: `Yutong Invoice - ${document.invoice_data.invoice_no}`,
          customerName: document.invoice_data.customer_name,
          quotationNo: document.invoice_data.invoice_no,
          pdfUrl: publicUrlData.publicUrl
        }
      });
      
      if (error) throw error;
      
      toast.success('Invoice sent via email successfully');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = async () => {
    try {
      const { data: signatures } = await supabase
        .from('yutong_invoice_signatures')
        .select('*')
        .eq('invoice_record_id', document.invoice_record_id)
        .order('created_at', { ascending: true });
      
      const preparedSig = signatures?.find(s => s.signature_role === 'prepared_by');
      const approvedSig = signatures?.find(s => s.signature_role === 'approved_by');
      const receivedSig = signatures?.find(s => s.signature_role === 'customer');
      
      const mergedData = {
        ...document.invoice_data,
        preparedBy: preparedSig ? {
          approver_name: preparedSig.signer_name,
          signature_data: preparedSig.signature_data,
          signature_type: preparedSig.signature_type,
          approval_date: preparedSig.signed_at
        } : undefined,
        approvedBy: approvedSig ? {
          approver_name: approvedSig.signer_name,
          signature_data: approvedSig.signature_data,
          signature_type: approvedSig.signature_type,
          approval_date: approvedSig.signed_at
        } : undefined,
        receivedBy: receivedSig ? {
          approver_name: receivedSig.signer_name,
          signature_data: receivedSig.signature_data,
          signature_type: receivedSig.signature_type,
          approval_date: receivedSig.signed_at
        } : undefined
      };
      
      const invoiceHTML = generateYutongOrderInvoiceHTML(mergedData);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to print invoice');
    }
  };

  const handleApprove = async () => {
    const result = await approveInvoice(document.invoice_record_id, document.id);
    
    if (result.success) {
      if (onRefresh) onRefresh();
      onClose();
    }
  };

  const handleRegenerate = async () => {
    const result = await regenerateInvoice(document.id);
    
    if (result.success && onRefresh) {
      onRefresh();
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-success">Approved</Badge>;
    }
    return <Badge variant="destructive">Draft</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>
                Invoice: {document.invoice_data.invoice_no}
              </DialogTitle>
              {getStatusBadge(document.document_status)}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleEmail}
                disabled={isSendingEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              
              {isDraft && (
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoice Preview
            </TabsTrigger>
            <TabsTrigger value="signatures" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Manage Signatures
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            {isDraft && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-3 text-center">
                <p className="text-destructive font-semibold">DRAFT INVOICE - NOT APPROVED</p>
              </div>
            )}
            
            <YutongOrderInvoicePreview
              key={refreshKey}
              invoiceRecordId={document.invoice_record_id}
              invoiceData={document.invoice_data}
            />
          </TabsContent>

          <TabsContent value="signatures" className="space-y-4 max-h-[calc(90vh-280px)] overflow-auto">
            <YutongInvoiceSignatureManager
              invoiceRecordId={document.invoice_record_id}
              onSignaturesUpdated={() => {
                handleSignaturesUpdated();
                if (onRefresh) onRefresh();
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
