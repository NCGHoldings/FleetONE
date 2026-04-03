import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, Printer, Mail, Loader2, MessageCircle } from 'lucide-react';
import { QuotationPreview } from './QuotationPreview';
import { toast } from 'sonner';
import { sectionBasedPDF } from '@/lib/pdf-multi-page';
import { supabase } from '@/integrations/supabase/client';

interface QuotationData {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  company_name?: string;
  contact_number?: string;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime?: string;
  number_of_buses: number;
  bus_type: string;
  seating_capacity?: number;
  total_distance_km?: number;
  gross_revenue: number;
  net_profit: number;
  fuel_cost_fuel_only?: number;
  hire_charge?: number;
  extra_charges?: number;
  commission_amount?: number;
  created_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  discount_percentage?: number;
}

interface Props {
  quotation: QuotationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationModal({ quotation, open, onOpenChange }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Quotation ${quotation?.quotation_no}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body { 
                  font-family: "Segoe UI", Arial, sans-serif; 
                  margin: 0; 
                  padding: 20px;
                  background: #f5f5f5;
                  color: #000;
                  line-height: 1.4;
                }
                
                .max-w-4xl {
                  max-width: 72rem;
                  margin: 0 auto;
                }
                
                .mx-auto { margin-left: auto; margin-right: auto; }
                .bg-white { background-color: #ffffff; }
                .p-10 { padding: 2.5rem; }
                .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-start { align-items: flex-start; }
                .items-center { align-items: center; }
                .mb-8 { margin-bottom: 2rem; }
                .mb-3 { margin-bottom: 0.75rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-5 { margin-top: 1.25rem; }
                .mt-6 { margin-top: 1.5rem; }
                .mt-8 { margin-top: 2rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .pt-1 { padding-top: 0.25rem; }
                .pt-3 { padding-top: 0.75rem; }
                
                .w-48 { width: 12rem; }
                .w-full { width: 100%; }
                .max-w-full { max-width: 100%; }
                .max-w-lg { max-width: 32rem; }
                .h-auto { height: auto; }
                
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .text-center { text-align: center; }
                
                .text-sm { font-size: 0.875rem; }
                .text-xs { font-size: 0.75rem; }
                .text-base { font-size: 1rem; }
                
                .font-semibold { font-weight: 600; }
                .font-sans { font-family: "Segoe UI", Arial, sans-serif; }
                
                .text-white { color: #ffffff; }
                .text-black { color: #000000; }
                .text-blue-600 { color: #2563eb; }
                .text-gray-700 { color: #374151; }
                .text-gray-800 { color: #1f2937; }
                .text-gray-500 { color: #6b7280; }
                
                .bg-blue-600 { background-color: #2563eb; }
                .bg-blue-50 { background-color: #eff6ff; }
                
                .px-4 { padding-left: 1rem; padding-right: 1rem; }
                .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                .p-2 { padding: 0.5rem; }
                
                .inline-block { display: inline-block; }
                .leading-relaxed { line-height: 1.6; }
                
                .gap-5 { gap: 1.25rem; }
                .flex-1 { flex: 1 1 0%; }
                
                /* Table Styling */
                table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 0;
                }
                
                .border-collapse { border-collapse: collapse; }
                
                .border {
                  border-width: 1px;
                  border-style: solid;
                  border-color: #d1d5db;
                }
                
                .border-gray-300 {
                  border-color: #d1d5db;
                }
                
                .border-gray-200 {
                  border-color: #e5e7eb;
                }
                
                .border-t {
                  border-top-width: 1px;
                  border-top-style: solid;
                  border-top-color: #d1d5db;
                }
                
                th, td {
                  border: 1px solid #d1d5db;
                  padding: 0.5rem;
                  text-align: left;
                  vertical-align: top;
                }
                
                th {
                  background-color: #eff6ff;
                  color: #2563eb;
                  font-weight: 600;
                }
                
                thead th {
                  background-color: #eff6ff;
                  color: #2563eb;
                  font-weight: 600;
                }
                
                tbody tr:nth-child(even) {
                  background-color: #fafafa;
                }
                
                  /* DRAFT Watermark Styles */
                  .draft-watermark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                    z-index: 10;
                    background: rgba(0, 0, 0, 0.05);
                  }
                  
                  .draft-text {
                    color: rgba(156, 163, 175, 0.3);
                    font-size: 120px;
                    font-weight: bold;
                    transform: rotate(-45deg);
                    letter-spacing: 20px;
                    text-shadow: 0 0 10px rgba(0,0,0,0.1);
                    font-family: Arial, sans-serif;
                    user-select: none;
                  }

                  /* Print Specific Styles */
                  @media print {
                    body { 
                      margin: 0; 
                      padding: 10px;
                      background: white !important;
                      -webkit-print-color-adjust: exact;
                      color-adjust: exact;
                    }
                    
                    .no-print { display: none !important; }
                    
                    .draft-watermark {
                      background: rgba(0, 0, 0, 0.05) !important;
                      -webkit-print-color-adjust: exact;
                    }
                    
                    .draft-text {
                      color: rgba(156, 163, 175, 0.3) !important;
                      -webkit-print-color-adjust: exact;
                    }
                  
                  table {
                    page-break-inside: avoid;
                    border-collapse: collapse !important;
                  }
                  
                  th, td {
                    border: 1px solid #d1d5db !important;
                    padding: 8px !important;
                  }
                  
                  th {
                    background-color: #eff6ff !important;
                    color: #2563eb !important;
                    font-weight: 600 !important;
                    -webkit-print-color-adjust: exact;
                  }
                  
                  .bg-blue-600 {
                    background-color: #2563eb !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact;
                  }
                  
                  .bg-blue-50 {
                    background-color: #eff6ff !important;
                    -webkit-print-color-adjust: exact;
                  }
                  
                  .text-blue-600 {
                    color: #2563eb !important;
                  }
                  
                  img {
                    max-width: 100% !important;
                    height: auto !important;
                  }
                  
                  .shadow-lg {
                    box-shadow: none !important;
                  }
                  
                  * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = async () => {
    if (!printRef.current || !quotation) return;

    setIsDownloading(true);
    try {
      const pdf = await sectionBasedPDF(printRef.current);

      // Generate filename with quotation number and date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Quotation_${quotation.quotation_no}_${date}.pdf`;
      
      // Download the PDF
      pdf.save(filename);
      
      toast.success('Quotation downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download quotation');
    } finally {
      setIsDownloading(false);
    }
  };

  const generatePDFBase64 = async (): Promise<string> => {
    if (!printRef.current || !quotation) throw new Error('No content to generate PDF');

    const pdf = await sectionBasedPDF(printRef.current);
    
    return pdf.output('datauristring').split(',')[1];
  };

  const handleEmail = async () => {
    console.log('📧 === EMAIL SEND STARTED (Modal) ===');
    console.log('Quotation:', quotation?.quotation_no);
    console.log('Customer Email:', quotation?.customer_email);

    if (!quotation?.customer_email) {
      toast.error("No email address", {
        description: "This customer doesn't have an email address configured."
      });
      return;
    }

    setIsEmailing(true);
    const loadingToast = toast.loading("Sending email...", {
      description: "Generating PDF and sending to customer"
    });

    try {
      // Step 1: Generate PDF
      toast.loading("Generating PDF document...", { id: loadingToast });
      console.log('📄 Generating PDF...');
      const pdfBase64 = await generatePDFBase64();
      console.log('✅ PDF generated, size:', pdfBase64.length);

      // Step 2: Prepare email data
      const date = new Date().toISOString().split('T')[0];
      const filename = `Quotation_${quotation.quotation_no}_${date}.pdf`;
      const subject = `Quotation ${quotation.quotation_no} - NCG Express`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">NCG Express</h2>
          <p>Dear ${quotation.customer_name},</p>
          <p>Please find your quotation details attached.</p>
          <p><strong>Quotation Number:</strong> ${quotation.quotation_no}</p>
          <p><strong>Route:</strong> ${quotation.pickup_location} → ${quotation.drop_location}</p>
          <p>Thank you for choosing NCG Express.</p>
          <br>
          <p>Best regards,<br>NCG Express Team</p>
        </div>
      `;

      // Step 3: Send email
      toast.loading("Sending email to customer...", { id: loadingToast });
      console.log('📨 Invoking edge function...');
      
      const { data, error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          to: quotation.customer_email,
          subject,
          html,
          attachment: {
            filename,
            contentBase64: pdfBase64,
            contentType: 'application/pdf'
          }
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      // Step 4: Update status to 'sent'
      console.log('✅ Updating status to sent...');
      await supabase
        .from('special_hire_quotations')
        .update({ status: 'sent' })
        .eq('id', quotation.id);

      console.log('✅ === EMAIL SEND COMPLETED ===');
      toast.success("Email sent successfully!", {
        id: loadingToast,
        description: `Quotation sent to ${quotation.customer_email}`
      });
      
      // Close modal after successful send
      setTimeout(() => onOpenChange(false), 1500);

    } catch (error: any) {
      console.error('❌ === EMAIL SEND FAILED ===');
      console.error('Error:', error);
      
      let errorDescription = error.message || 'Unknown error occurred';
      
      if (error.message?.includes('PDF')) {
        errorDescription = 'Failed to generate PDF. Please try again.';
      } else if (error.message?.includes('network')) {
        errorDescription = 'Network error. Check your connection.';
      } else if (error.message?.includes('Resend')) {
        errorDescription = 'Email service error. Contact support.';
      }
      
      toast.error("Failed to send email", {
        id: loadingToast,
        description: errorDescription
      });
    } finally {
      setIsEmailing(false);
    }
  };

  const handleWhatsApp = async () => {
    console.log('📱 === WHATSAPP SEND STARTED (Modal) ===');
    console.log('Quotation:', quotation?.quotation_no);
    console.log('Customer Phone:', quotation?.customer_phone);

    if (!quotation?.customer_phone) {
      toast.error("No phone number", {
        description: "This customer doesn't have a phone number configured."
      });
      return;
    }

    setIsSendingWhatsApp(true);
    const loadingToast = toast.loading("Sending via WhatsApp...", {
      description: "Preparing quotation for WhatsApp"
    });

    try {
      // Step 1: Generate PDF
      toast.loading("Generating PDF document...", { id: loadingToast });
      console.log('📄 Generating PDF...');
      const pdfBase64 = await generatePDFBase64();
      console.log('✅ PDF generated, size:', pdfBase64.length);

      // Step 2: Send via WhatsApp
      toast.loading("Sending to customer's WhatsApp...", { id: loadingToast });
      console.log('📱 Invoking WhatsApp edge function...');
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp-quotation', {
        body: {
          customerPhone: quotation.customer_phone,
          customerName: quotation.customer_name,
          quotationNo: quotation.quotation_no,
          pickupLocation: quotation.pickup_location,
          dropLocation: quotation.drop_location,
          numberOfBuses: quotation.number_of_buses,
          busType: quotation.bus_type,
          totalAmount: quotation.gross_revenue,
          pdfBase64
        }
      });

      console.log('WhatsApp edge function response:', { data, error });

      if (error) {
        console.error('❌ WhatsApp edge function error:', error);
        throw error;
      }

      // Step 3: Update status
      console.log('✅ Updating WhatsApp send status...');
      await supabase
        .from('special_hire_quotations')
        .update({ 
          status: 'sent',
          sent_via_whatsapp: true,
          whatsapp_sent_at: new Date().toISOString()
        })
        .eq('id', quotation.id);

      console.log('✅ === WHATSAPP SEND COMPLETED ===');
      toast.success("WhatsApp sent successfully!", {
        id: loadingToast,
        description: `Quotation sent to ${quotation.customer_phone}`
      });
      
      // Close modal after successful send
      setTimeout(() => onOpenChange(false), 1500);

    } catch (error: any) {
      console.error('❌ === WHATSAPP SEND FAILED ===');
      console.error('Error:', error);
      
      let errorDescription = error.message || 'Unknown error occurred';
      
      if (error.message?.includes('PDF')) {
        errorDescription = 'Failed to generate PDF. Please try again.';
      } else if (error.message?.includes('network')) {
        errorDescription = 'Network error. Check your connection.';
      } else if (error.message?.includes('WhatsApp')) {
        errorDescription = 'WhatsApp service error. Please try again.';
      } else if (error.message?.includes('phone')) {
        errorDescription = 'Invalid phone number format.';
      }
      
      toast.error("Failed to send WhatsApp", {
        id: loadingToast,
        description: errorDescription
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Quotation Preview - {quotation.quotation_no}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isSendingWhatsApp}>
                {isSendingWhatsApp ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                {isSendingWhatsApp ? 'Sending...' : 'WhatsApp'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmail} disabled={isEmailing}>
                {isEmailing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isEmailing ? 'Sending...' : 'Email'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloading ? 'Generating...' : 'Download'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div ref={printRef}>
          <QuotationPreview quotation={quotation} />
        </div>
      </DialogContent>
    </Dialog>
  );
}