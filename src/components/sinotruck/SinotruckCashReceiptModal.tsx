import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SinotruckCashReceiptPreview } from './SinotruckCashReceiptPreview';
import { SinotruckCashReceiptSignatureModal } from './SinotruckCashReceiptSignatureModal';
import { SinotruckCashReceipt } from '@/hooks/useSinotruckCashReceipts';
import { Download, Eye, PenTool, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface SinotruckCashReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: SinotruckCashReceipt | null;
  onRefresh: () => void;
}

export const SinotruckCashReceiptModal = ({
  isOpen,
  onClose,
  receipt,
  onRefresh
}: SinotruckCashReceiptModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [selectedSignatureRole, setSelectedSignatureRole] = useState<'customer' | 'finance'>('customer');

  if (!receipt) return null;

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Cash-Receipt-${receipt.receipt_no}.pdf`);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const openSignatureModal = (role: 'customer' | 'finance') => {
    setSelectedSignatureRole(role);
    setIsSignatureModalOpen(true);
  };

  const handleSignatureSaved = () => {
    setIsSignatureModalOpen(false);
    onRefresh();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Cash Receipt - {receipt.receipt_no}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSignatureModal('customer')}
                >
                  <PenTool className="h-4 w-4 mr-1" />
                  Customer Sign
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSignatureModal('finance')}
                >
                  <PenTool className="h-4 w-4 mr-1" />
                  Finance Sign
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Download PDF
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div ref={printRef}>
                  <SinotruckCashReceiptPreview receipt={receipt} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <SinotruckCashReceiptSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        receiptId={receipt.id}
        defaultRole={selectedSignatureRole}
        onSignatureSaved={handleSignatureSaved}
      />
    </>
  );
};
