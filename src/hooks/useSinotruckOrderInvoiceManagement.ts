import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generateSinotruckOrderInvoiceHTML, 
  generateSinotruckOrderInvoicePDF,
  SinotruckOrderInvoiceData 
} from '@/lib/sinotruck-order-invoice-generator';

interface SinotruckStoredInvoice {
  id: string;
  invoice_no: string;
  order_id: string;
  quotation_id: string;
  invoice_date: string;
  invoice_amount: number;
  status: string;
  invoice_type: string;
  invoice_category: string;
  approved_by: string | null;
  approved_at: string | null;
  generated_by: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

interface SinotruckStoredDocument {
  id: string;
  invoice_record_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  document_status: string;
  invoice_data: any;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export function useSinotruckOrderInvoiceManagement() {
  const [isLoading, setIsLoading] = useState(false);

  const generateAndStoreDraftInvoice = async (
    invoiceData: SinotruckOrderInvoiceData,
    orderId: string,
    quotationId: string
  ): Promise<{ success: boolean; invoice?: any; document?: any; error?: any }> => {
    console.log('🚀 Starting Sinotruck invoice generation...');
    setIsLoading(true);
    
    try {
      // Fetch verified payments for this order
      const { data: verifiedPaymentsRaw, error: paymentsError } = await supabase
        .from('sinotruck_customer_payments' as any)
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'verified')
        .order('payment_date', { ascending: true });

      if (paymentsError) throw paymentsError;
      const verifiedPayments = verifiedPaymentsRaw as any[];

      // Calculate payment totals
      const totalPaid = verifiedPayments?.reduce((sum: number, p: any) => sum + p.payment_amount, 0) || 0;
      const balanceDue = invoiceData.total - totalPaid;

      // Enrich invoice data with payment information
      invoiceData = {
        ...invoiceData,
        paymentsReceived: verifiedPayments?.map((p: any) => ({
          payment_date: p.payment_date,
          amount: p.payment_amount,
          reference_no: p.payment_reference,
          payment_method: p.payment_method,
          verified_by: p.verified_by,
          verified_at: p.verified_at
        })) || [],
        totalPaid,
        balanceDue,
        lastPaymentDate: verifiedPayments?.[verifiedPayments.length - 1]?.payment_date
      };
      
      // Generate invoice number
      console.log('📝 Generating invoice number...');
      const { data: invoiceNoData, error: invoiceNoError } = await supabase
        .rpc('generate_sinotruck_invoice_no');
      
      if (invoiceNoError) {
        throw new Error(`Invoice number generation failed: ${invoiceNoError.message}`);
      }
      
      const invoiceNo = invoiceNoData as string;
      console.log('✅ Invoice number generated:', invoiceNo);
      
      // Update invoice data with generated number
      const fullInvoiceData = {
        ...invoiceData,
        invoice_no: invoiceNo,
        invoice_status: 'draft' as const
      };
      
      // Generate PDF
      console.log('📄 Generating PDF...');
      const pdfBlob = await generateSinotruckOrderInvoicePDF(fullInvoiceData);
      console.log('✅ PDF generated. Size:', pdfBlob.size, 'bytes');
      
      // Upload to storage
      const fileName = `${invoiceNo}_draft.pdf`;
      const filePath = `${orderId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sinotruck-invoices')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }
      console.log('✅ PDF uploaded successfully');
      
      // Create invoice record
      const { data: invoiceRaw, error: invoiceError } = await supabase
        .from('sinotruck_invoice_records' as any)
        .insert({
          invoice_no: invoiceNo,
          order_id: orderId,
          quotation_id: quotationId,
          invoice_date: fullInvoiceData.invoice_date,
          invoice_amount: fullInvoiceData.invoice_category === 'proforma_invoice' 
            ? fullInvoiceData.proforma_amount || fullInvoiceData.total 
            : fullInvoiceData.total,
          status: 'draft',
          invoice_category: fullInvoiceData.invoice_category || 'direct_invoice',
          proforma_amount_percentage: fullInvoiceData.proforma_amount_percentage,
          proforma_amount: fullInvoiceData.proforma_amount,
          finance_company_name: fullInvoiceData.finance_company_name,
          finance_company_address: fullInvoiceData.finance_company_address,
          proforma_purpose: fullInvoiceData.proforma_purpose
        })
        .select()
        .single();
      
      if (invoiceError) {
        throw new Error(`Failed to create invoice record: ${invoiceError.message}`);
      }
      const invoice = invoiceRaw as any;
      
      // Create document record
      const { data: documentRaw, error: docError } = await supabase
        .from('sinotruck_invoice_documents' as any)
        .insert({
          invoice_record_id: invoice.id,
          file_name: fileName,
          file_path: filePath,
          file_size: pdfBlob.size,
          document_status: 'draft',
          invoice_data: fullInvoiceData
        })
        .select()
        .single();
      
      if (docError) {
        throw new Error(`Failed to create document record: ${docError.message}`);
      }
      const document = documentRaw as any;
      
      toast.success('Draft invoice generated successfully');
      return { success: true, invoice, document };
    } catch (error: any) {
      console.error('❌ Invoice generation failed:', error);
      toast.error('Failed to generate invoice: ' + error.message);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const approveInvoice = async (
    invoiceId: string,
    documentId: string
  ): Promise<{ success: boolean; error?: any }> => {
    setIsLoading(true);
    
    try {
      // Get document with invoice data
      const { data: documentRaw, error: docError } = await supabase
        .from('sinotruck_invoice_documents' as any)
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      const document = documentRaw as any;
      
      // Get invoice record
      const { data: invoiceRaw, error: invError } = await supabase
        .from('sinotruck_invoice_records' as any)
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invError) throw invError;
      const invoice = invoiceRaw as any;
      
      // Regenerate PDF without draft watermark
      const invoiceData: SinotruckOrderInvoiceData = document.invoice_data as unknown as SinotruckOrderInvoiceData;
      invoiceData.invoice_status = 'approved' as const;
      
      const pdfBlob = await generateSinotruckOrderInvoicePDF(invoiceData);
      
      // Upload approved version
      const fileName = `${invoice.invoice_no}_approved.pdf`;
      const filePath = `${invoice.order_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sinotruck-invoices')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update invoice record
      const { error: updateInvError } = await supabase
        .from('sinotruck_invoice_records' as any)
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
      
      if (updateInvError) throw updateInvError;
      
      // Update document record
      const { error: updateDocError } = await supabase
        .from('sinotruck_invoice_documents' as any)
        .update({
          file_name: fileName,
          file_path: filePath,
          file_size: pdfBlob.size,
          document_status: 'approved',
          invoice_data: invoiceData as any
        })
        .eq('id', documentId);
      
      if (updateDocError) throw updateDocError;
      
      toast.success('Invoice approved successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      toast.error('Failed to approve invoice: ' + error.message);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const getInvoicesByOrder = async (
    orderId: string
  ): Promise<{ success: boolean; invoices?: SinotruckStoredInvoice[]; error?: any }> => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_invoice_records' as any)
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, invoices: data as unknown as SinotruckStoredInvoice[] };
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      return { success: false, error };
    }
  };

  const getInvoiceDocuments = async (
    orderId: string
  ): Promise<{ success: boolean; documents?: SinotruckStoredDocument[]; error?: any }> => {
    try {
      // First get invoice records for this order
      const { data: invoiceRecordsRaw, error: recordsError } = await supabase
        .from('sinotruck_invoice_records' as any)
        .select('id')
        .eq('order_id', orderId);

      if (recordsError) throw recordsError;
      const invoiceRecords = invoiceRecordsRaw as any[];

      if (!invoiceRecords || invoiceRecords.length === 0) {
        return { success: true, documents: [] };
      }

      // Get documents for those invoice records
      const recordIds = invoiceRecords.map((r: any) => r.id);
      const { data, error } = await supabase
        .from('sinotruck_invoice_documents' as any)
        .select('*')
        .in('invoice_record_id', recordIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, documents: data as unknown as SinotruckStoredDocument[] };
    } catch (error: any) {
      console.error('Error fetching invoice documents:', error);
      return { success: false, error };
    }
  };

  const regenerateInvoice = async (
    documentId: string
  ): Promise<{ success: boolean; error?: any }> => {
    setIsLoading(true);
    
    try {
      // Get document with invoice data
      const { data: documentRaw, error: docError } = await supabase
        .from('sinotruck_invoice_documents' as any)
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      const document = documentRaw as any;

      // Get order_id from the invoice record
      const { data: invoiceRecordRaw } = await supabase
        .from('sinotruck_invoice_records' as any)
        .select('order_id')
        .eq('id', document.invoice_record_id)
        .single();
      const invoiceRecord = invoiceRecordRaw as any;
      
      // Fetch latest signatures
      let signatureData = {};
      if (document.invoice_record_id) {
        const { data: signaturesRaw } = await supabase
          .from('sinotruck_invoice_signatures' as any)
          .select('*')
          .eq('invoice_record_id', document.invoice_record_id);
        const signatures = signaturesRaw as any[];
        
        if (signatures && signatures.length > 0) {
          const prepared = signatures.find((s: any) => s.signature_role === 'prepared_by');
          const approved = signatures.find((s: any) => s.signature_role === 'approved_by');
          const customer = signatures.find((s: any) => s.signature_role === 'received_by');
          
          signatureData = {
            preparedBy: prepared ? {
              approver_name: prepared.signer_name,
              signature_data: prepared.signature_data,
              approval_date: prepared.signed_at
            } : undefined,
            approvedBy: approved ? {
              approver_name: approved.signer_name,
              signature_data: approved.signature_data,
              approval_date: approved.signed_at
            } : undefined,
            receivedBy: customer ? {
              approver_name: customer.signer_name,
              signature_data: customer.signature_data,
              approval_date: customer.signed_at
            } : undefined
          };
        }
      }

      // Fetch latest verified payments
      const orderId = invoiceRecord?.order_id;
      let paymentData = {};
      
      if (orderId) {
        const { data: verifiedPaymentsRaw } = await supabase
          .from('sinotruck_customer_payments' as any)
          .select('*')
          .eq('order_id', orderId)
          .eq('status', 'verified')
          .order('payment_date', { ascending: true });
        const verifiedPayments = verifiedPaymentsRaw as any[];

        if (verifiedPayments) {
          const invoiceTotal = document.invoice_data?.total || 0;
          const totalPaid = verifiedPayments.reduce((sum: number, p: any) => sum + p.payment_amount, 0);
          const balanceDue = invoiceTotal - totalPaid;

          paymentData = {
            paymentsReceived: verifiedPayments.map((p: any) => ({
              payment_date: p.payment_date,
              amount: p.payment_amount,
              reference_no: p.payment_reference,
              payment_method: p.payment_method
            })),
            totalPaid,
            balanceDue,
            lastPaymentDate: verifiedPayments[verifiedPayments.length - 1]?.payment_date
          };
        }
      }
      
      // Merge invoice data with latest signatures and payments
      const updatedInvoiceData = {
        ...(document.invoice_data as unknown as SinotruckOrderInvoiceData),
        ...signatureData,
        ...paymentData
      };
      
      // Regenerate PDF
      const pdfBlob = await generateSinotruckOrderInvoicePDF(updatedInvoiceData);
      
      // Re-upload
      const { error: uploadError } = await supabase.storage
        .from('sinotruck-invoices')
        .upload(document.file_path, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Update document record
      const { error: updateError } = await supabase
        .from('sinotruck_invoice_documents' as any)
        .update({
          file_size: pdfBlob.size,
          invoice_data: updatedInvoiceData as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      if (updateError) throw updateError;
      
      toast.success('Invoice regenerated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error regenerating invoice:', error);
      toast.error('Failed to regenerate invoice: ' + error.message);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generateAndStoreDraftInvoice,
    approveInvoice,
    getInvoicesByOrder,
    getInvoiceDocuments,
    regenerateInvoice
  };
}
