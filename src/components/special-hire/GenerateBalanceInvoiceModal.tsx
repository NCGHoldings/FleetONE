import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Download, FileText, CheckCircle, Clock, Send, Info } from 'lucide-react';
import { generateInvoiceHTML, generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sanitizeHTML } from '@/lib/sanitize';
import { 
  fetchSpecialHireFinanceSettings,
  postInvoiceToGLStandalone,
  applyAdvanceToInvoiceStandalone,
  postDiscountToGLStandalone,
  updateSPHARInvoiceOnInvoiceSent,
} from '@/hooks/useSpecialHireFinance';
import { NCG_HOLDING_ID } from '@/contexts/CompanyContext';

interface GenerateBalanceInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationData: {
    id: string;
    quotation_no: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    company_name?: string;
    pickup_location: string;
    drop_location: string;
    pickup_datetime: string;
    drop_datetime: string;
    bus_type: string;
    number_of_buses: number;
    number_of_passengers: number;
    original_quotation_amount: number;
    gross_revenue: number;
    fuel_cost_fuel_only?: number;
    commission_pass_through_amount?: number;
    discount_amount_lkr?: number;
    advance_paid: number;
    balance_due: number;
    driver_name?: string;
    conductor_name?: string;
    bus_no?: string;
  };
  adjustmentData: {
    id: string;
    extra_km?: number;
    extra_km_rate?: number;
    extra_km_total_charge?: number;
    additional_expenses?: Array<{
      description: string;
      amount: number;
      category: string;
    }>;
    total_additional_expenses?: number;
    adjustment_notes?: string;
  };
  onInvoiceGenerated?: () => void;
}

export const GenerateBalanceInvoiceModal: React.FC<GenerateBalanceInvoiceModalProps> = ({
  open,
  onOpenChange,
  quotationData,
  adjustmentData,
  onInvoiceGenerated,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'sent_to_customer' | 'payment_pending' | 'paid'>('draft');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  
  // This modal is specifically for customer-facing balance invoices
  const isCustomerInvoice = true;

  const hasRealAdjustment = !!(adjustmentData.id && (
    (adjustmentData.extra_km_total_charge || 0) > 0 || 
    (adjustmentData.total_additional_expenses || 0) > 0
  ));

  useEffect(() => {
    fetchCompanyLogo();
    if (open && quotationData.id) {
      checkExistingInvoice();
    }
  }, [open, quotationData.id]);

  // Auto-save draft when modal opens (ensures document is always recorded)
  useEffect(() => {
    const autoSaveDraft = async () => {
      if (open && !documentId && !isAutoSaving) {
        setIsAutoSaving(true);
        await handleSaveDraft();
        setIsAutoSaving(false);
      }
    };
    
    if (open && quotationData.id) {
      const timer = setTimeout(autoSaveDraft, 300);
      return () => clearTimeout(timer);
    }
  }, [open, documentId, quotationData.id]);

  const fetchCompanyLogo = async () => {
    try {
      // Use default logo - company_logo column doesn't exist on profiles
      setCompanyLogo('/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png');
    } catch (error) {
      console.error('Error fetching company logo:', error);
    }
  };

  const checkExistingInvoice = async () => {
    try {
      // Check if invoice already exists for this adjustment
      const { data: existingInvoice, error } = await supabase
        .from('document_storage')
        .select('id, invoice_status, document_data')
        .eq('quotation_id', quotationData.id)
        .eq('document_type', 'invoice')
        .eq('payment_type', 'balance')
        .maybeSingle();

      if (existingInvoice && !error) {
        setDocumentId(existingInvoice.id);
        setInvoiceStatus((existingInvoice.invoice_status || 'draft') as typeof invoiceStatus);
      }
    } catch (error) {
      console.error('Error checking existing invoice:', error);
    }
  };

  // Compute the real total from line items (not stale original_quotation_amount)
  const computedTotalAmount = () => {
    return (quotationData.gross_revenue || 0) +
      (quotationData.fuel_cost_fuel_only || 0) +
      (quotationData.commission_pass_through_amount || 0) -
      (quotationData.discount_amount_lkr || 0);
  };

  const calculateFinalBalance = () => {
    const totalAmount = computedTotalAmount();
    const adjustmentTotal = (adjustmentData.extra_km_total_charge || 0) + (adjustmentData.total_additional_expenses || 0);
    // Use actual total_paid from quotation (sum of all approved payments) not just advance_paid
    const actualTotalPaid = (quotationData as any).total_paid ?? quotationData.advance_paid ?? 0;
    const balance = (totalAmount + adjustmentTotal) - actualTotalPaid;
    return balance <= 0 ? 0 : balance;
  };

  const generateInvoiceData = (options?: { forCustomer?: boolean }): InvoiceData => {
    const invoiceNo = `INV-${quotationData.quotation_no}-BAL`;
    const finalBalance = calculateFinalBalance();
    const totalAmount = computedTotalAmount();
    const actualTotalPaid = (quotationData as any).total_paid ?? quotationData.advance_paid ?? 0;

    return {
      invoiceNo,
      invoiceType: 'balance',
      quotationNo: quotationData.quotation_no,
      customerName: quotationData.customer_name,
      customerPhone: quotationData.customer_phone,
      customerEmail: quotationData.customer_email,
      companyName: quotationData.company_name,
      pickupLocation: quotationData.pickup_location,
      dropLocation: quotationData.drop_location,
      pickupDate: new Date(quotationData.pickup_datetime),
      dropDate: new Date(quotationData.drop_datetime),
      busType: quotationData.bus_type,
      numberOfBuses: quotationData.number_of_buses,
      numberOfPassengers: quotationData.number_of_passengers,
      totalAmount: totalAmount,
      advanceAmount: quotationData.advance_paid,
      balanceAmount: finalBalance,
      paidAmount: actualTotalPaid,
      companyLogo,
      vehicleNo: quotationData.bus_no,
      driverName: quotationData.driver_name,
      conductorName: quotationData.conductor_name,
      invoice_status: invoiceStatus === 'draft' ? 'draft' : 'approved',
      document_type: 'invoice',
      forCustomer: options?.forCustomer ?? isCustomerInvoice,
      hasAdjustments: hasRealAdjustment,
      extraKm: hasRealAdjustment ? adjustmentData.extra_km : undefined,
      extraKmChargePerKm: hasRealAdjustment ? adjustmentData.extra_km_rate : undefined,
      extraKmTotalCharge: hasRealAdjustment ? adjustmentData.extra_km_total_charge : undefined,
      additionalExpenses: hasRealAdjustment ? adjustmentData.additional_expenses : undefined,
      totalAdditionalExpenses: hasRealAdjustment ? adjustmentData.total_additional_expenses : undefined,
      adjustmentNotes: hasRealAdjustment ? adjustmentData.adjustment_notes : undefined,
    };
  };

  const handleSaveDraft = async () => {
    try {
      setIsLoading(true);
      const invoiceData = generateInvoiceData();
      
      // Generate PDF and convert to base64
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Convert to base64 (chunked approach for large files)
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);
      
      const invoiceRecord = {
        quotation_id: quotationData.id,
        payment_type: 'balance',
        document_type: 'invoice',
        document_data: base64Data,
        file_name: `${invoiceData.invoiceNo}.pdf`,
        file_size: uint8Array.length,
        document_status: 'draft',
        invoice_status: 'draft',
        generated_by: user?.id,
        generated_at: new Date().toISOString(),
      };

      if (documentId) {
        // Update existing
        await supabase
          .from('document_storage')
          .update(invoiceRecord)
          .eq('id', documentId);
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('document_storage')
          .insert(invoiceRecord)
          .select()
          .single();

        if (error) throw error;
        setDocumentId(data.id);

        if (adjustmentData.id) {
          // Link invoice to adjustment if adjustment exists
          await supabase
            .from('special_hire_trip_adjustments')
            .update({ balance_invoice_document_id: data.id })
            .eq('id', adjustmentData.id);
        }
      }

      setInvoiceStatus('draft');
      toast.success('Invoice draft saved successfully');
      
      // Database write is already awaited above, call refresh directly
      onInvoiceGenerated?.();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save invoice draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsLoading(true);
      
      // Ensure document is saved before downloading
      if (!documentId) {
        await handleSaveDraft();
      }
      
      const invoiceData = generateInvoiceData({ forCustomer: isCustomerInvoice });
      
      // Generate PDF blob
      const pdfBlob = await generateInvoicePDF(invoiceData);
      
      // Create blob URL and download
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${invoiceData.invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailToCustomer = async () => {
    if (!quotationData.customer_email) {
      toast.error('Customer email is not available');
      return;
    }

    try {
      setIsLoading(true);
      
      // First save the invoice if not already saved
      if (!documentId) {
        await handleSaveDraft();
      }

      // Generate PDF content with forCustomer flag (no signatures, no draft text)
      const invoiceData = {
        ...generateInvoiceData(),
        forCustomer: true,
      };
      const pdfBlob = await generateInvoicePDF(invoiceData);
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(pdfBlob);
      });
      
      const pdfBase64 = await base64Promise;

      // Call edge function to send email
      const { error } = await supabase.functions.invoke('send-balance-invoice-email', {
        body: {
          quotationNo: quotationData.quotation_no,
          customerEmail: quotationData.customer_email,
          customerName: quotationData.customer_name,
          balanceDue: calculateFinalBalance(),
          invoiceNo: invoiceData.invoiceNo,
          pdfBase64,
        },
      });

      if (error) throw error;

      // Update invoice status
      if (documentId) {
        await supabase
          .from('document_storage')
          .update({ 
            invoice_status: 'sent_to_customer',
            email_status: 'sent',
            email_sent_at: new Date().toISOString(),
            email_sent_by: user?.id,
          })
          .eq('id', documentId);

        setInvoiceStatus('sent_to_customer');
      }

      // ========================
      // GL & AR POSTING INTEGRATION - Post invoice to General Ledger and update AR
      // ========================
      try {
        console.log('[SPH GL] Invoice sent - attempting GL & AR update...');
        const settings = await fetchSpecialHireFinanceSettings(NCG_HOLDING_ID);
        
        if (settings?.auto_post_invoices) {
          // Post GROSS invoice amount (before discount) — discount is posted separately
          const fullInvoiceAmount = quotationData.original_quotation_amount + 
            (adjustmentData.extra_km_total_charge || 0) + 
            (adjustmentData.total_additional_expenses || 0);
          const discountAmount = quotationData.discount_amount_lkr || 0;
          
          const invoiceNo = `INV-${quotationData.quotation_no}-BAL`;
          const isInternal = quotationData.company_name?.toLowerCase().includes('internal') || false;
          
          console.log('[SPH GL] Posting invoice to GL:', {
            invoiceNo,
            amount: fullInvoiceAmount,
            isInternal,
          });

          // 1. Post invoice (Revenue recognition)
          // DR Trade Receivable | CR Special Hire Revenue
          const invoiceGLResult = await postInvoiceToGLStandalone({
            invoiceNo,
            quotationNo: quotationData.quotation_no,
            customerName: quotationData.customer_name,
            totalAmount: fullInvoiceAmount,
            isInternal,
            settings,
            effectiveCompanyId: NCG_HOLDING_ID,
          });
          
          if (invoiceGLResult) {
            console.log('[SPH GL] ✅ Invoice posted:', invoiceGLResult.entry_number);
            toast.success(`Invoice GL Entry: ${invoiceGLResult.entry_number}`);

            // Update or Create AR Invoice with full invoice amount
            const { data: quotationRecord } = await supabase
              .from('special_hire_quotations')
              .select('ar_invoice_id, finance_customer_id')
              .eq('id', quotationData.id)
              .single();

            let arInvoiceId = quotationRecord?.ar_invoice_id;
            const financeCustomerId = quotationRecord?.finance_customer_id;

            if (arInvoiceId) {
              await updateSPHARInvoiceOnInvoiceSent({
                arInvoiceId: arInvoiceId,
                quotationId: quotationData.id,
                totalAmount: fullInvoiceAmount,
                journalEntryId: invoiceGLResult.id,
              });
              console.log('[SPH AR] ✅ AR Invoice updated with invoice amount');
            } else {
              // Create the missing AR Invoice
              console.log('[SPH AR] Creating missing AR Invoice for Sent Invoice');
              const { createSPHARInvoice, createOrGetSPHCustomer } = await import('@/hooks/useSpecialHireFinance');
              
              let customerId = financeCustomerId;
              if (!customerId) {
                customerId = await createOrGetSPHCustomer({
                  customerName: quotationData.customer_name,
                  customerPhone: quotationData.customer_phone,
                  customerEmail: quotationData.customer_email,
                  companyId: NCG_HOLDING_ID,
                });
              }

              if (customerId) {
                const dueDate = format(new Date(), 'yyyy-MM-dd');
                const arResult = await createSPHARInvoice({
                  quotationId: quotationData.id,
                  quotationNo: quotationData.quotation_no,
                  customerId,
                  customerName: quotationData.customer_name,
                  totalAmount: fullInvoiceAmount,
                  advanceAmount: quotationData.advance_paid,
                  dueDate,
                  companyId: NCG_HOLDING_ID,
                  journalEntryId: invoiceGLResult.id, // Pass journalEntryId to skip double GL posting
                });
                
                if (arResult) {
                  console.log('[SPH AR] ✅ AR Invoice created:', arResult.invoiceNumber);
                }
              }
            }
          }
          
          // 2. Apply advance if customer paid advance
          // DR Customer Advance (Liability) | CR Trade Receivable
          if (quotationData.advance_paid > 0) {
            console.log('[SPH GL] Applying advance to invoice:', quotationData.advance_paid);
            
            const advanceGLResult = await applyAdvanceToInvoiceStandalone({
              invoiceNo,
              quotationNo: quotationData.quotation_no,
              customerName: quotationData.customer_name,
              advanceAmount: quotationData.advance_paid,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });
            
            if (advanceGLResult) {
              console.log('[SPH GL] ✅ Advance applied:', advanceGLResult.entry_number);
              toast.success(`Advance Applied: ${advanceGLResult.entry_number}`);
            }
          }

          // 3. Post discount if applicable
          // DR Discount Expense | CR Trade Receivable
          if (discountAmount > 0) {
            console.log('[SPH GL] Posting discount to GL:', discountAmount);
            const invoiceNo = `INV-${quotationData.quotation_no}-BAL`;

            const discountGLResult = await postDiscountToGLStandalone({
              invoiceNo,
              quotationNo: quotationData.quotation_no,
              customerName: quotationData.customer_name,
              discountAmount,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });

            if (discountGLResult) {
              console.log('[SPH GL] ✅ Discount posted:', discountGLResult.entry_number);
              toast.success(`Discount GL Entry: ${discountGLResult.entry_number}`);
            }
          }
        } else {
          console.log('[SPH GL] Auto-post invoices disabled or settings not found');
        }
      } catch (glError: any) {
        console.error('[SPH GL] ❌ Invoice GL/AR update failed:', glError?.message || glError);
        toast.warning(`Invoice sent but GL/AR update failed: ${glError?.message || 'Unknown error'}`);
      }
      // ========================
      // END GL & AR POSTING
      // ========================

      toast.success(`Invoice emailed successfully to ${quotationData.customer_email}`);
      
      // Database write is already awaited above, call refresh directly
      onInvoiceGenerated?.();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send invoice email');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, icon: FileText },
      sent_to_customer: { label: 'Sent to Customer', variant: 'default' as const, icon: Send },
      payment_pending: { label: 'Payment Pending', variant: 'outline' as const, icon: Clock },
      paid: { label: 'Paid', variant: 'default' as const, icon: CheckCircle },
    };

    const config = statusConfig[invoiceStatus];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const invoiceData = generateInvoiceData();
  const finalBalance = calculateFinalBalance();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Final Invoice - {quotationData.quotation_no}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {hasRealAdjustment 
                  ? 'Invoice with post-trip adjustments showing final balance due'
                  : 'Final invoice for completed trip (no adjustments)'}
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] space-y-4">
          {/* Auto-saving indicator */}
          {isAutoSaving && (
            <Alert>
              <Clock className="h-4 w-4 animate-spin" />
              <AlertTitle>Saving invoice...</AlertTitle>
              <AlertDescription>
                Your balance invoice is being saved to the database.
              </AlertDescription>
            </Alert>
          )}

          {/* Invoice Info Alert */}
          <Alert className="border-primary/50 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertTitle>Final Invoice</AlertTitle>
            <AlertDescription>
              {hasRealAdjustment 
                ? 'This invoice includes post-trip adjustments (extra KM, additional expenses) and shows the final balance due.'
                : 'This is the final invoice for the completed trip based on the original quotation amounts.'}
            </AlertDescription>
          </Alert>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Original Balance Due</div>
                  <div className="font-semibold">LKR {quotationData.balance_due.toLocaleString()}</div>
                </div>
                {adjustmentData.extra_km_total_charge && adjustmentData.extra_km_total_charge > 0 && (
                  <div>
                    <div className="text-muted-foreground">Extra Kilometers</div>
                    <div className="font-semibold text-orange-600">
                      + LKR {adjustmentData.extra_km_total_charge.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({adjustmentData.extra_km} km × LKR {adjustmentData.extra_km_rate})
                    </div>
                  </div>
                )}
                {adjustmentData.total_additional_expenses && adjustmentData.total_additional_expenses > 0 && (
                  <div>
                    <div className="text-muted-foreground">Additional Expenses</div>
                    <div className="font-semibold text-orange-600">
                      + LKR {adjustmentData.total_additional_expenses.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold">Final Balance Due</div>
                <div className="text-2xl font-bold text-primary">
                  LKR {finalBalance.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice HTML Preview */}
          <Card>
            <CardContent className="p-6">
              <div
                className="invoice-preview border rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(generateInvoiceHTML(invoiceData)) }}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading || isAutoSaving}
            >
              <FileText className="w-4 h-4 mr-2" />
              {documentId ? 'Update Draft' : 'Save Draft'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isLoading || isAutoSaving}
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={handleEmailToCustomer}
              disabled={isLoading || isAutoSaving || !quotationData.customer_email}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email to Customer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
