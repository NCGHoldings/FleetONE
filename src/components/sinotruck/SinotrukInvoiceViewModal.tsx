import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Mail, Printer, RefreshCw, CheckCircle, Eye } from 'lucide-react';
import { generateSinotrukInvoiceHTML, type SinotrukInvoiceData } from '@/lib/sinotruck-invoice-generator';
import { useSinotrukInvoiceManagement, type SinotrukStoredDocument } from '@/hooks/useSinotrukInvoiceManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';

interface SinotrukInvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceDocument: SinotrukStoredDocument;
  invoiceData: SinotrukInvoiceData;
  onRefresh?: () => void;
}

export const SinotrukInvoiceViewModal: React.FC<SinotrukInvoiceViewModalProps> = ({
  isOpen,
  onClose,
  invoiceDocument,
  invoiceData,
  onRefresh
}) => {
  const { approveInvoice, regenerateInvoice, isLoading } = useSinotrukInvoiceManagement();
  const [activeTab, setActiveTab] = useState('preview');
  
  // Signature states
  const [preparedBy, setPreparedBy] = useState({ name: '', date: new Date(), signature: '' });
  const [approvedBy, setApprovedBy] = useState({ name: '', date: new Date(), signature: '' });
  const [receivedBy, setReceivedBy] = useState({ name: '', date: new Date(), signature: '' });
  
  const preparedSignatureRef = useRef<SignatureCanvas>(null);
  const approvedSignatureRef = useRef<SignatureCanvas>(null);
  const receivedSignatureRef = useRef<SignatureCanvas>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const captureSignatures = () => {
    const preparedSignature = preparedSignatureRef.current?.toDataURL() || '';
    const approvedSignature = approvedSignatureRef.current?.toDataURL() || '';
    const receivedSignature = receivedSignatureRef.current?.toDataURL() || '';
    
    setPreparedBy(prev => ({ ...prev, signature: preparedSignature }));
    setApprovedBy(prev => ({ ...prev, signature: approvedSignature }));
    setReceivedBy(prev => ({ ...prev, signature: receivedSignature }));
  };

  const displayData: SinotrukInvoiceData = {
    ...invoiceData,
    preparedBy: preparedBy.name ? {
      approver_name: preparedBy.name,
      signature_data: preparedBy.signature,
      approval_date: preparedBy.date.toISOString(),
    } : undefined,
    approvedBy: approvedBy.name ? {
      approver_name: approvedBy.name,
      signature_data: approvedBy.signature,
      approval_date: approvedBy.date.toISOString(),
    } : undefined,
    receivedBy: receivedBy.name ? {
      approver_name: receivedBy.name,
      signature_data: receivedBy.signature,
      approval_date: receivedBy.date.toISOString(),
    } : undefined,
  };

  const handleDownload = async () => {
    try {
      // Use the stored PDF data if available
      if (invoiceDocument.document_data) {
        const binaryString = atob(invoiceDocument.document_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = invoiceDocument.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Invoice downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handleEmail = async () => {
    try {
      if (!invoiceDocument.document_data) {
        toast.error('No document data available');
        return;
      }

      const { error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          to: invoiceData.customerEmail,
          subject: `Sinotruk Bus Invoice - ${invoiceData.invoiceNo}`,
          customerName: invoiceData.customerName,
          quotationNo: invoiceData.quotationNo,
          pdfData: invoiceDocument.document_data,
          fileName: invoiceDocument.file_name,
          documentType: 'Sinotruk Bus Invoice'
        }
      });

      if (error) throw error;
      toast.success('Invoice emailed successfully');
    } catch (error) {
      console.error('Error emailing invoice:', error);
      toast.error('Failed to email invoice');
    }
  };

  const handlePrint = () => {
    const htmlContent = generateSinotrukInvoiceHTML(displayData);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleApprove = async () => {
    const result = await approveInvoice(invoiceDocument.id, invoiceDocument.id);
    if (result.success) {
      onRefresh?.();
      onClose();
    }
  };

  const handleRegenerate = async () => {
    const result = await regenerateInvoice(invoiceDocument.id);
    if (result.success) {
      onRefresh?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-xl font-semibold">
              Sinotruk Invoice - {invoiceData.invoiceNo}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(invoiceDocument.document_status)}
              <span className="text-sm text-muted-foreground">
                Generated: {format(new Date(invoiceDocument.generated_at), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoiceData.customerEmail && (
              <Button onClick={handleEmail} variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleRegenerate} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            {invoiceDocument.document_status === 'draft' && (
              <Button onClick={handleApprove} disabled={isLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <div className="border rounded-lg overflow-hidden bg-white" style={{ height: 'calc(90vh - 300px)' }}>
              <iframe
                srcDoc={generateSinotrukInvoiceHTML(displayData)}
                title="Invoice Preview"
                className="w-full h-full border-0"
                style={{ minHeight: '500px', background: 'white' }}
              />
            </div>
          </TabsContent>

          <TabsContent value="signatures" className="flex-1 overflow-auto">
            <div className="space-y-6">
              {/* Prepared By */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Prepared By</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="prepared-name">Name</Label>
                    <Input
                      id="prepared-name"
                      value={preparedBy.name}
                      onChange={(e) => setPreparedBy(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !preparedBy.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {preparedBy.date ? format(preparedBy.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={preparedBy.date}
                          onSelect={(date) => date && setPreparedBy(prev => ({ ...prev, date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label>Signature</Label>
                  <div className="border rounded mt-2">
                    <SignatureCanvas
                      ref={preparedSignatureRef}
                      canvasProps={{
                        width: 400,
                        height: 150,
                        className: 'signature-canvas'
                      }}
                    />
                  </div>
                  <Button 
                    onClick={() => preparedSignatureRef.current?.clear()} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Approved By */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Approved By</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="approved-name">Name</Label>
                    <Input
                      id="approved-name"
                      value={approvedBy.name}
                      onChange={(e) => setApprovedBy(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !approvedBy.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {approvedBy.date ? format(approvedBy.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={approvedBy.date}
                          onSelect={(date) => date && setApprovedBy(prev => ({ ...prev, date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label>Signature</Label>
                  <div className="border rounded mt-2">
                    <SignatureCanvas
                      ref={approvedSignatureRef}
                      canvasProps={{
                        width: 400,
                        height: 150,
                        className: 'signature-canvas'
                      }}
                    />
                  </div>
                  <Button 
                    onClick={() => approvedSignatureRef.current?.clear()} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Received By */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Customer Received</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="received-name">Name</Label>
                    <Input
                      id="received-name"
                      value={receivedBy.name}
                      onChange={(e) => setReceivedBy(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !receivedBy.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {receivedBy.date ? format(receivedBy.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={receivedBy.date}
                          onSelect={(date) => date && setReceivedBy(prev => ({ ...prev, date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label>Signature</Label>
                  <div className="border rounded mt-2">
                    <SignatureCanvas
                      ref={receivedSignatureRef}
                      canvasProps={{
                        width: 400,
                        height: 150,
                        className: 'signature-canvas'
                      }}
                    />
                  </div>
                  <Button 
                    onClick={() => receivedSignatureRef.current?.clear()} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={captureSignatures}>
                  Apply Signatures to Preview
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};