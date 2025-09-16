import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { generateInvoiceHTML, generateInvoicePDF, type ApprovalSignature, type InvoiceData } from '@/lib/invoice-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/ui/signature-canvas';

interface InvoiceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
  onDownload?: () => void; // kept for backward compatibility (not used)
}

const todayInputValue = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const InvoiceViewer = ({ isOpen, onClose, invoiceData }: InvoiceViewerProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // Local signature/name/date state
  const [preparedBy, setPreparedBy] = useState<ApprovalSignature>({ approver_name: '', approval_date: todayInputValue() });
  const [checkedBy, setCheckedBy] = useState<ApprovalSignature>({ approver_name: '', approval_date: todayInputValue() });
  const [approvedBy, setApprovedBy] = useState<ApprovalSignature>({ approver_name: '', approval_date: todayInputValue() });

  const preparedRef = useRef<SignatureCanvasRef>(null);
  const checkedRef = useRef<SignatureCanvasRef>(null);
  const approvedRef = useRef<SignatureCanvasRef>(null);

  // Data used for preview and download
  const displayData: InvoiceData = useMemo(() => ({
    ...invoiceData,
    preparedBy,
    checkedBy,
    approvedBy,
  }), [invoiceData, preparedBy, checkedBy, approvedBy]);

  useEffect(() => {
    // Reset signatures when a new invoice is opened
    if (!isOpen) return;
    setPreparedBy({ approver_name: '', approval_date: todayInputValue() });
    setCheckedBy({ approver_name: '', approval_date: todayInputValue() });
    setApprovedBy({ approver_name: '', approval_date: todayInputValue() });
    preparedRef.current?.clear();
    checkedRef.current?.clear();
    approvedRef.current?.clear();
  }, [isOpen, invoiceData.invoiceNo]);

  const captureSignatures = () => {
    const nextPrepared: ApprovalSignature = { ...preparedBy };
    const nextChecked: ApprovalSignature = { ...checkedBy };
    const nextApproved: ApprovalSignature = { ...approvedBy };

    if (preparedRef.current && !preparedRef.current.isEmpty()) {
      nextPrepared.signature_data = preparedRef.current.toDataURL('image/png');
    }
    if (checkedRef.current && !checkedRef.current.isEmpty()) {
      nextChecked.signature_data = checkedRef.current.toDataURL('image/png');
    }
    if (approvedRef.current && !approvedRef.current.isEmpty()) {
      nextApproved.signature_data = approvedRef.current.toDataURL('image/png');
    }

    setPreparedBy(nextPrepared);
    setCheckedBy(nextChecked);
    setApprovedBy(nextApproved);
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Ensure latest drawn signatures are captured before download
      captureSignatures();
      const pdfBlob = await generateInvoicePDF(displayData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${displayData.document_type === 'sales_receipt' ? 'receipt' : 'invoice'}-${displayData.quotationNo}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              className="text-foreground"
              style={{ minHeight: '800px', width: '100%', overflow: 'visible' }}
              dangerouslySetInnerHTML={{ __html: generateInvoiceHTML(displayData) }}
            />
          </TabsContent>

          <TabsContent value="signatures" className="flex-1 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Prepared By */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Prepared By</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="prepared-name">Name</Label>
                    <Input id="prepared-name" value={preparedBy.approver_name}
                      onChange={(e) => setPreparedBy(p => ({ ...p, approver_name: e.target.value }))}
                      placeholder="Enter name" />
                  </div>
                  <div>
                    <Label htmlFor="prepared-date">Date</Label>
                    <Input id="prepared-date" type="date" value={preparedBy.approval_date}
                      onChange={(e) => setPreparedBy(p => ({ ...p, approval_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Signature (optional)</Label>
                  <SignatureCanvas ref={preparedRef} className="h-28 w-full border rounded-md" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => preparedRef.current?.clear()}>Clear</Button>
                    <Button type="button" size="sm" onClick={captureSignatures}>Apply to Preview</Button>
                  </div>
                </div>
              </div>

              {/* Checked By */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Checked By</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="checked-name">Name</Label>
                    <Input id="checked-name" value={checkedBy.approver_name}
                      onChange={(e) => setCheckedBy(p => ({ ...p, approver_name: e.target.value }))}
                      placeholder="Enter name" />
                  </div>
                  <div>
                    <Label htmlFor="checked-date">Date</Label>
                    <Input id="checked-date" type="date" value={checkedBy.approval_date}
                      onChange={(e) => setCheckedBy(p => ({ ...p, approval_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Signature (optional)</Label>
                  <SignatureCanvas ref={checkedRef} className="h-28 w-full border rounded-md" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => checkedRef.current?.clear()}>Clear</Button>
                    <Button type="button" size="sm" onClick={captureSignatures}>Apply to Preview</Button>
                  </div>
                </div>
              </div>

              {/* Approved By */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Approved By</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="approved-name">Name</Label>
                    <Input id="approved-name" value={approvedBy.approver_name}
                      onChange={(e) => setApprovedBy(p => ({ ...p, approver_name: e.target.value }))}
                      placeholder="Enter name" />
                  </div>
                  <div>
                    <Label htmlFor="approved-date">Date</Label>
                    <Input id="approved-date" type="date" value={approvedBy.approval_date}
                      onChange={(e) => setApprovedBy(p => ({ ...p, approval_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Signature (optional)</Label>
                  <SignatureCanvas ref={approvedRef} className="h-28 w-full border rounded-md" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => approvedRef.current?.clear()}>Clear</Button>
                    <Button type="button" size="sm" onClick={captureSignatures}>Apply to Preview</Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};