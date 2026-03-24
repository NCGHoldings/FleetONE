import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Mail, Edit, Trash2, X, Eye, PenTool } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SinotruckQuotationPreview } from './SinotruckQuotationPreview';
import { SinotruckSignatureManager } from './SinotruckSignatureManager';
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

interface SinotruckQuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: SinotruckQuotation | null;
  onEdit?: () => void;
  onGenerateInvoice?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export function SinotruckQuotationViewModal({
  isOpen,
  onClose,
  quotation,
  onEdit,
  onGenerateInvoice,
  onDelete,
  onRefresh
}: SinotruckQuotationViewModalProps) {
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!quotation) return null;

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      toast.error('Preview not ready');
      return;
    }

    setLoading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = 210;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Sinotruck_Quotation_${quotation.quotation_no}.pdf`);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = () => {
    toast.info('Email functionality coming soon');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              Quotation {quotation.quotation_no}
              {getStatusBadge(quotation.status)}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button
            onClick={handleSendEmail}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </Button>
          {onEdit && (
            <Button
              onClick={onEdit}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={onDelete}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="signatures" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Manage Signatures
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview">
            <div className="border rounded-lg overflow-auto" style={{ maxHeight: '70vh' }}>
              <SinotruckQuotationPreview ref={printRef} quotation={quotation} />
            </div>
          </TabsContent>

          <TabsContent value="signatures">
            <SinotruckSignatureManager
              quotationId={quotation.id}
              onSignaturesUpdated={onRefresh}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
