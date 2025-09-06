import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Printer, Download, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { YutongQuotationPreview } from './YutongQuotationPreview';
import { useToast } from '@/hooks/use-toast';

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name: string;
  bus_model: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  valid_until: string;
  created_at: string;
  special_features?: string;
  delivery_timeline?: string;
  payment_terms?: string;
  warranty_terms?: string;
  discount_percentage?: number;
}

interface YutongQuotationViewModalProps {
  quotation: YutongQuotation | null;
  open: boolean;
  onClose: () => void;
}

export function YutongQuotationViewModal({ quotation, open, onClose }: YutongQuotationViewModalProps) {
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (!quotation) return null;

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Yutong Quotation</title></head><body>');
        printWindow.document.write(printRef.current.outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const generatePDFBase64 = async (): Promise<string> => {
    if (!printRef.current) throw new Error('Print reference not found');

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('datauristring').split(',')[1];
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const pdfBase64 = await generatePDFBase64();
      
      // Convert base64 to blob and download
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Yutong-Quotation-${quotation.quotation_no}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Quotation PDF downloaded successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    try {
      setLoading(true);
      const pdfBase64 = await generatePDFBase64();
      
      // Call Supabase function to send email
      const response = await fetch('/functions/v1/send-quotation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: quotation.customer_email,
          subject: `Yutong Bus Quotation - ${quotation.quotation_no}`,
          html: `
            <p>Dear ${quotation.customer_name},</p>
            <p>Please find attached your Yutong bus quotation for ${quotation.bus_model}.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br/>NCG Express Sales Team</p>
          `,
          attachment: {
            filename: `Yutong-Quotation-${quotation.quotation_no}.pdf`,
            contentBase64: pdfBase64,
            contentType: 'application/pdf'
          }
        })
      });

      if (!response.ok) throw new Error('Failed to send email');
      
      toast({
        title: "Success",
        description: `Quotation emailed to ${quotation.customer_email}`
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DialogTitle>Quotation - {quotation.quotation_no}</DialogTitle>
              {getStatusBadge(quotation.status)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEmail} disabled={loading}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Generating...' : 'PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          <YutongQuotationPreview ref={printRef} quotation={quotation} />
        </div>
      </DialogContent>
    </Dialog>
  );
}