import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Printer, Download, Mail, PenTool } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { YutongQuotationPreview } from './YutongQuotationPreview';
import { YutongSignatureManager } from './YutongSignatureManager';
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
  version_number?: string;
  edit_type?: string;
  edit_reason?: string;
  parent_quotation_id?: string;
}

interface YutongQuotationViewModalProps {
  quotation: YutongQuotation | null;
  open: boolean;
  onClose: () => void;
}

export function YutongQuotationViewModal({ quotation, open, onClose }: YutongQuotationViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [refreshKey, setRefreshKey] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (!quotation) return null;

  const handleSignaturesUpdated = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Success",
      description: "Quotation updated with new signatures. You can regenerate the PDF.",
    });
  };

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

  // Helper function to preload images as base64 for PDF generation
  const loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return '';
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', url, error);
      return '';
    }
  };

  const generatePDFBase64 = async (): Promise<string> => {
    if (!printRef.current) throw new Error('Print reference not found');

    // Find individual pages within the quotation preview
    const pages = printRef.current.querySelectorAll('.page');
    
    if (pages.length === 0) {
      throw new Error('No pages found in quotation preview');
    }

    // Pre-load ALL images (including signatures) as base64
    const allImages = printRef.current.querySelectorAll('img');
    const originalSrcs: Map<HTMLImageElement, string> = new Map();
    
    // Load unique image URLs (skip data URLs - already base64)
    const uniqueUrls = new Set<string>();
    allImages.forEach(img => {
      const imgEl = img as HTMLImageElement;
      if (!imgEl.src.startsWith('data:')) {
        uniqueUrls.add(imgEl.src);
      }
    });
    
    // Pre-load all unique images
    const base64Map: Map<string, string> = new Map();
    await Promise.all(
      Array.from(uniqueUrls).map(async (url) => {
        const base64 = await loadImageAsBase64(url);
        if (base64) {
          base64Map.set(url, base64);
        }
      })
    );
    
    // Replace image sources with base64
    allImages.forEach((img) => {
      const imgEl = img as HTMLImageElement;
      originalSrcs.set(imgEl, imgEl.src);
      const base64 = base64Map.get(imgEl.src);
      if (base64) {
        imgEl.src = base64;
      }
    });
    
    // Wait for images to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    
    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Store original styles
        const originalWidth = page.style.width;
        const originalMinHeight = page.style.minHeight;
        const originalMaxWidth = page.style.maxWidth;
        
        // Set A4 dimensions for accurate capture
        page.style.width = '210mm';
        page.style.minHeight = '297mm';
        page.style.maxWidth = '210mm';
        
        // Create canvas for each page individually
        const canvas = await html2canvas(page, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123, // Fixed A4 height at 96dpi
          scrollX: 0,
          scrollY: 0,
          foreignObjectRendering: false,
          removeContainer: true,
          logging: false
        });
        
        // Restore original styles
        page.style.width = originalWidth;
        page.style.minHeight = originalMinHeight;
        page.style.maxWidth = originalMaxWidth;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Add new page if not the first page
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculate dimensions to fit A4 width, position at TOP (not centered)
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;
        
        // If image height exceeds page height, scale it down
        if (imgHeight > pageHeight) {
          const scaledHeight = pageHeight;
          const scaledWidth = (canvas.width * pageHeight) / canvas.height;
          pdf.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
        } else {
          // Position at TOP of page (not centered)
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }
      }

      return pdf.output('datauristring').split(',')[1];
    } finally {
      // Restore original image sources
      originalSrcs.forEach((originalSrc, imgEl) => {
        imgEl.src = originalSrc;
      });
    }
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
        description: "Quotation PDF downloaded successfully with signatures included"
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
              {quotation.version_number && quotation.version_number !== '1.0' && (
                <Badge variant="outline">v{quotation.version_number}</Badge>
              )}
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

        {/* Version Info */}
        {(quotation.edit_type || quotation.edit_reason) && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Version Information</h4>
            {quotation.edit_type && (
              <p className="text-sm">
                <span className="font-medium">Edit Type:</span>{' '}
                {quotation.edit_type === 'staff_edit' ? 'Staff Edit' : 'Customer Request'}
              </p>
            )}
            {quotation.edit_reason && (
              <p className="text-sm">
                <span className="font-medium">Reason:</span> {quotation.edit_reason}
              </p>
            )}
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Quotation Preview</TabsTrigger>
            <TabsTrigger value="signatures">
              <PenTool className="h-4 w-4 mr-2" />
              Manage Signatures
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-6">
            <div ref={printRef}>
              <YutongQuotationPreview quotation={quotation} key={refreshKey} />
            </div>
          </TabsContent>

          <TabsContent value="signatures" className="mt-6">
            <YutongSignatureManager 
              quotationId={quotation.id}
              onSignaturesUpdated={handleSignaturesUpdated}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}