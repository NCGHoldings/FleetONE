import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generateYutongOrderInvoiceHTML, 
  generateYutongOrderInvoicePDF,
  YutongOrderInvoiceData 
} from '@/lib/yutong-order-invoice-generator';

interface YutongStoredInvoice {
  id: string;
  invoice_no: string;
  order_id: string;
  quotation_id: string;
  invoice_date: string;
  invoice_amount: number;
  status: string;
  invoice_type: string;
  approved_by: string | null;
  approved_at: string | null;
  generated_by: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

interface YutongStoredDocument {
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

export function useYutongOrderInvoiceManagement() {
  const [isLoading, setIsLoading] = useState(false);

  const generateAndStoreDraftInvoice = async (
    invoiceData: YutongOrderInvoiceData,
    orderId: string,
    quotationId: string
  ): Promise<{ success: boolean; invoice?: any; document?: any; error?: any }> => {
    console.log('🚀 Starting invoice generation process...');
    console.log('📋 Invoice Data:', invoiceData);
    console.log('🔑 Order ID:', orderId, 'Quotation ID:', quotationId);
    
    setIsLoading(true);
    
    try {
      // Generate invoice number
      console.log('📝 Step 1: Generating invoice number...');
      const { data: invoiceNoData, error: invoiceNoError } = await supabase
        .rpc('generate_yutong_invoice_no');
      
      if (invoiceNoError) {
        console.error('❌ Failed to generate invoice number:', invoiceNoError);
        throw new Error(`Invoice number generation failed: ${invoiceNoError.message}`);
      }
      
      const invoiceNo = invoiceNoData as string;
      console.log('✅ Invoice number generated:', invoiceNo);
      
      // Fetch signature data from quotation approvals
      console.log('📝 Step 1.5: Fetching signature data from quotation...');
      let signatureData = {};
      if (quotationId) {
        const { data: approvals } = await supabase
          .from('document_approvals')
          .select('*')
          .eq('document_id', quotationId)
          .order('created_at', { ascending: true });
        
        if (approvals && approvals.length > 0) {
          console.log('✅ Found', approvals.length, 'approval signatures');
          const prepared = approvals.find(a => a.approval_type === 'prepared_by');
          const approved = approvals.find(a => a.approval_type === 'approved_by');
          const customer = approvals.find(a => a.approval_type === 'received_by');
          
          signatureData = {
            preparedBy: prepared ? {
              approver_name: prepared.approver_name,
              signature_data: prepared.signature_data,
              approval_date: prepared.approval_date
            } : undefined,
            approvedBy: approved ? {
              approver_name: approved.approver_name,
              signature_data: approved.signature_data,
              approval_date: approved.approval_date
            } : undefined,
            receivedBy: customer ? {
              approver_name: customer.approver_name,
              signature_data: customer.signature_data,
              approval_date: customer.approval_date
            } : undefined
          };
        } else {
          console.log('⚠️ No signature approvals found for quotation');
        }
      }
      
      // Update invoice data with generated number and signatures
      const fullInvoiceData = {
        ...invoiceData,
        ...signatureData,
        invoice_no: invoiceNo,
        invoice_status: 'draft' as const
      };
      
      // Generate PDF
      console.log('📄 Step 2: Generating PDF...');
      const pdfBlob = await generateYutongOrderInvoicePDF(fullInvoiceData);
      console.log('✅ PDF generated successfully. Size:', pdfBlob.size, 'bytes');
      
      // Upload to storage
      console.log('☁️ Step 3: Uploading to storage...');
      const fileName = `${invoiceNo}_draft.pdf`;
      const filePath = `yutong-invoices/${orderId}/${fileName}`;
      console.log('📁 Upload path:', filePath);
      console.log('📦 File size:', pdfBlob.size, 'bytes (', (pdfBlob.size / 1024 / 1024).toFixed(2), 'MB)');
      
      // Add timeout to storage upload
      const uploadPromise = supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Storage upload timeout after 30 seconds')), 30000)
      );
      
      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      console.log('📤 Upload completed, checking result...');
      
      if (uploadResult.error) {
        console.error('❌ Storage upload failed:', uploadResult.error);
        throw new Error(`Failed to upload PDF to storage: ${uploadResult.error.message}`);
      }
      console.log('✅ PDF uploaded successfully to:', uploadResult.data?.path || filePath);
      
      // Create invoice record
      console.log('💾 Step 4: Creating invoice record...');
      const { data: invoice, error: invoiceError } = await supabase
        .from('yutong_invoice_records')
        .insert({
          invoice_no: invoiceNo,
          order_id: orderId,
          quotation_id: quotationId,
          invoice_date: fullInvoiceData.invoice_date,
          invoice_amount: fullInvoiceData.total,
          status: 'draft'
        })
        .select()
        .single();
      
      if (invoiceError) {
        console.error('❌ Failed to create invoice record:', invoiceError);
        throw new Error(`Failed to create invoice record: ${invoiceError.message}`);
      }
      console.log('✅ Invoice record created:', invoice.id);
      
      // Create document record
      console.log('📑 Step 5: Creating document record...');
      const { data: document, error: docError } = await supabase
        .from('yutong_invoice_documents')
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
        console.error('❌ Failed to create document record:', docError);
        throw new Error(`Failed to create document record: ${docError.message}`);
      }
      console.log('✅ Document record created:', document.id);
      
      console.log('🎉 Invoice generation completed successfully!');
      toast.success('Draft invoice generated successfully');
      
      return { success: true, invoice, document };
    } catch (error: any) {
      console.error('❌ INVOICE GENERATION FAILED:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error('Failed to generate invoice: ' + errorMessage);
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
      const { data: document, error: docError } = await supabase
        .from('yutong_invoice_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      
      // Get invoice record
      const { data: invoice, error: invError } = await supabase
        .from('yutong_invoice_records')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invError) throw invError;
      
      // Regenerate PDF without draft watermark
      const invoiceData: YutongOrderInvoiceData = document.invoice_data as unknown as YutongOrderInvoiceData;
      invoiceData.invoice_status = 'approved' as const;
      
      const pdfBlob = await generateYutongOrderInvoicePDF(invoiceData);
      
      // Upload approved version
      const fileName = `${invoice.invoice_no}_approved.pdf`;
      const filePath = `yutong-invoices/${invoice.order_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update invoice record
      const { error: updateInvError } = await supabase
        .from('yutong_invoice_records')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
      
      if (updateInvError) throw updateInvError;
      
      // Update document record
      const { error: updateDocError } = await supabase
        .from('yutong_invoice_documents')
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
  ): Promise<{ success: boolean; invoices?: YutongStoredInvoice[]; error?: any }> => {
    try {
      const { data, error } = await supabase
        .from('yutong_invoice_records')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, invoices: data as YutongStoredInvoice[] };
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      return { success: false, error };
    }
  };

  const getInvoiceDocuments = async (
    orderId: string
  ): Promise<{ success: boolean; documents?: YutongStoredDocument[]; error?: any }> => {
    try {
      // Fetch documents with their related invoice records
      const { data, error } = await supabase
        .from('yutong_invoice_documents')
        .select(`
          *,
          yutong_invoice_records!invoice_record_id (
            order_id,
            quotation_id
          )
        `)
        .eq('yutong_invoice_records.order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, documents: data as any };
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
      const { data: document, error: docError } = await supabase
        .from('yutong_invoice_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      
      // Regenerate PDF
      const pdfBlob = await generateYutongOrderInvoicePDF(document.invoice_data as unknown as YutongOrderInvoiceData);
      
      // Re-upload with same path
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(document.file_path, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Update document record
      const { error: updateError } = await supabase
        .from('yutong_invoice_documents')
        .update({
          file_size: pdfBlob.size,
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
