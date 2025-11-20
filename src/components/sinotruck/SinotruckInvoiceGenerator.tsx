import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SinotruckQuotationPreview } from './SinotruckQuotationPreview';
import { toast } from 'sonner';

interface SinotruckQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  truck_model_name: string;
  quantity: number;
  unit_price: number;
  charger_price?: number;
  total_price: number;
  payment_terms?: string;
  terms_conditions?: any;
  status: string;
  quotation_date: string;
  valid_until: string;
}

interface SinotruckInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: SinotruckQuotation | null;
}

export const SinotruckInvoiceGenerator: React.FC<SinotruckInvoiceGeneratorProps> = ({
  isOpen,
  onClose,
  quotation
}) => {
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!quotation) return null;

  const handleGeneratePDF = async () => {
    if (!printRef.current) {
      toast.error('Preview not ready');
      return;
    }

    setLoading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Sinotruck_Quotation_${quotation.quotation_no}.pdf`);
      
      toast.success('PDF generated and downloaded successfully');
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Generate PDF - {quotation.quotation_no}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg overflow-auto" style={{ maxHeight: '60vh' }}>
            <SinotruckQuotationPreview ref={printRef} quotation={quotation} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePDF} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
