import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { generateYutongInvoicePDF, type YutongInvoiceData } from '@/lib/yutong-invoice-generator';
import {
  fetchVehicleFinanceSettings,
  createVehicleCustomer,
  createVehicleARInvoice,
  postVehicleInvoiceToGL,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';

export interface YutongStoredInvoice {
  id: string;
  quotation_id: string;
  invoice_no: string;
  invoice_type: 'advance' | 'balance' | 'full';
  amount: number;
  status: 'draft' | 'approved';
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface YutongStoredDocument {
  id: string;
  quotation_id: string;
  document_type: string;
  document_status: string;
  document_data: string; // base64 encoded PDF
  file_name: string;
  file_size: number;
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
  updated_at: string;
  created_at: string;
}

export const useYutongInvoiceManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const generateAndStoreDraftInvoice = async (
    invoiceData: YutongInvoiceData, 
    quotationId: string
  ) => {
    try {
      setIsLoading(true);

      // First create the invoice record
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('yutong_invoices')
        .insert({
          quotation_id: quotationId,
          invoice_type: 'full',
          amount: invoiceData.totalPrice,
          status: 'draft',
          generated_by: user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate PDF with DRAFT status
      const draftInvoiceData = {
        ...invoiceData,
        invoice_status: 'draft' as const,
      };

      const pdfBlob = await generateYutongInvoicePDF(draftInvoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Store in document_storage
      const fileName = `DRAFT-Yutong-Invoice-${invoiceData.quotationNo}-${Date.now()}.pdf`;
      
      const { data: document, error: docError } = await supabase
        .from('document_storage')
        .insert({
          quotation_id: quotationId,
          payment_type: 'full',
          document_type: 'invoice',
          document_status: 'draft',
          document_data: base64Data,
          file_name: fileName,
          file_size: uint8Array.length,
          generated_by: user?.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast.success('Draft Yutong invoice generated and stored successfully');
      return { success: true, invoice: invoiceRecord, document };
    } catch (error) {
      console.error('Error generating draft invoice:', error);
      toast.error('Failed to generate draft invoice');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const approveInvoice = async (invoiceId: string, documentId: string) => {
    try {
      setIsLoading(true);

      // Get the invoice and related quotation data
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('yutong_invoices')
        .select(`
          *,
          yutong_quotations (
            id,
            quotation_no,
            customer_name,
            customer_phone,
            customer_email,
            company_name,
            bus_model,
            quantity,
            unit_price,
            discount_percentage,
            total_price,
            payment_terms,
            delivery_timeline,
            warranty_terms,
            special_features,
            valid_until,
            customer_category_id
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const quotation = (invoiceData as any).yutong_quotations;
      if (!quotation) throw new Error('Quotation data not found');

      // Prepare invoice data for regeneration
      const approvedInvoiceData: YutongInvoiceData = {
        invoiceNo: invoiceData.invoice_no,
        quotationNo: quotation.quotation_no,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone,
        customerEmail: quotation.customer_email,
        companyName: quotation.company_name,
        busModel: quotation.bus_model,
        quantity: quotation.quantity,
        unitPrice: quotation.unit_price,
        discountAmount: quotation.discount_amount,
        totalPrice: quotation.total_price,
        paymentTerms: quotation.payment_terms,
        deliveryTimeline: quotation.delivery_timeline,
        warrantyTerms: quotation.warranty_terms,
        specialFeatures: quotation.special_features,
        validUntil: new Date(quotation.valid_until),
        invoice_status: 'approved',
      };

      // Generate approved PDF (without DRAFT watermark)
      const pdfBlob = await generateYutongInvoicePDF(approvedInvoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Update invoice status
      const { error: updateInvoiceError } = await supabase
        .from('yutong_invoices')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (updateInvoiceError) throw updateInvoiceError;

      // Update document with approved PDF
      const approvedFileName = invoiceData.invoice_no + '-APPROVED.pdf';
      const { error: updateDocError } = await supabase
        .from('document_storage')
        .update({
          document_status: 'approved',
          document_data: base64Data,
          file_name: approvedFileName,
          file_size: uint8Array.length,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateDocError) throw updateDocError;

      // ==========================================
      // FINANCE INTEGRATION - AR & GL POSTING
      // ==========================================
      try {
        const settings = await fetchVehicleFinanceSettings('yutong', NCG_HOLDING_ID);
        
        if (settings && invoiceData.amount > 0) {
          // 1. Check if an order exists for this quotation
          const { data: existingOrder } = await supabase
            .from('yutong_orders')
            .select('id, order_no, finance_customer_id, total_paid')
            .eq('quotation_id', quotation.id)
            .maybeSingle();

          let financeCustomerId = existingOrder?.finance_customer_id;
          
          // 2. Create or find customer if not exists
          if (!financeCustomerId && quotation.customer_name) {
            financeCustomerId = await createVehicleCustomer({
              module: 'yutong',
              companyId: NCG_HOLDING_ID,
              customerName: quotation.customer_name,
              customerPhone: quotation.customer_phone || undefined,
              customerEmail: quotation.customer_email || undefined,
              customerCategoryId: quotation.customer_category_id || undefined,
            });
            
            // Link back to order if it exists
            if (financeCustomerId && existingOrder) {
              await supabase
                .from('yutong_orders')
                .update({ finance_customer_id: financeCustomerId })
                .eq('id', existingOrder.id);
            }
          }

          if (financeCustomerId) {
            const orderNo = existingOrder?.order_no || quotation.quotation_no;
            // Provide a dummy ID if no order exists, as createVehicleARInvoice expects one
            // AR_invoices itself doesn't strictly foreign-key to yutong_orders on orderId
            const orderId = existingOrder?.id || quotation.id; 
            const totalPaid = existingOrder?.total_paid || 0;
            const invoiceAmount = invoiceData.amount;
            
            // 3. Create AR Invoice
            const arResult = await createVehicleARInvoice({
              module: 'yutong',
              orderId: orderId,
              orderNo: orderNo,
              customerId: financeCustomerId,
              totalAmount: invoiceAmount,
              advanceAmount: totalPaid,
              companyId: NCG_HOLDING_ID,
              settings,
              customerCategoryId: quotation.customer_category_id,
              invoiceNo: invoiceData.invoice_no,
              // Calculate standard 18% VAT
              taxAmount: invoiceAmount - (invoiceAmount / 1.18),
            });

            if (arResult) {
              console.log('[Yutong Invoice] Created AR Invoice:', arResult.invoiceNumber);
              
              // 4. Post to GL — GUARD: Skip if AR invoice already has GL posted at creation time
              // createVehicleARInvoice auto-posts GL when status != 'draft', so we must check first
              let skipRevenueGL = false;
              const { data: arCheck } = await supabase
                .from('ar_invoices')
                .select('journal_entry_id')
                .eq('id', arResult.invoiceId)
                .single();
              if (arCheck?.journal_entry_id) {
                console.log('[Yutong Invoice] AR Invoice already has GL posted (journal_entry_id exists), skipping redundant revenue GL.');
                skipRevenueGL = true;
              }

              if (!skipRevenueGL && settings.trade_receivable_account_id && settings.sales_revenue_account_id) {
                const glResult = await postVehicleInvoiceToGL({
                  module: 'yutong',
                  orderNo: orderNo,
                  customerName: quotation.customer_name,
                  customerId: financeCustomerId,
                  invoiceAmount: invoiceAmount,
                  settings,
                  effectiveCompanyId: NCG_HOLDING_ID,
                  isTaxInvoice: true,
                  taxRate: 18,
                  invoiceNo: invoiceData.invoice_no,
                });

                if (glResult) {
                  console.log('[Yutong Invoice] Posted to GL:', glResult.entryNumber);
                  
                  // Update AR Invoice with JE ID
                  await supabase
                    .from('ar_invoices')
                    .update({ journal_entry_id: glResult.journalEntryId })
                    .eq('id', arResult.invoiceId);
                }
              }
            }
          }
        }
      } catch (financeError) {
        console.error('[Yutong Invoice] Finance integration failed:', financeError);
        toast.error('Invoice approved, but Finance integration encountered an issue.');
      }

      toast.success('Invoice approved successfully');
      return { success: true };
    } catch (error) {
      console.error('Error approving invoice:', error);
      toast.error('Failed to approve invoice');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const getInvoicesByQuotation = async (quotationId: string) => {
    try {
      const { data, error } = await supabase
        .from('yutong_invoices')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return { success: true, invoices: data };
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return { success: false, error };
    }
  };

  const getInvoiceDocuments = async (quotationId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_storage')
        .select('*')
        .eq('quotation_id', quotationId)
        .eq('document_type', 'invoice')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return { success: true, documents: data };
    } catch (error) {
      console.error('Error fetching invoice documents:', error);
      return { success: false, error };
    }
  };

  const regenerateInvoice = async (documentId: string) => {
    try {
      setIsLoading(true);

      // Get document and related data
      const { data: document, error: docError } = await supabase
        .from('document_storage')
        .select(`
          *,
          yutong_invoices!inner (
            *,
            yutong_quotations (
              quotation_no,
              customer_name,
              customer_phone,
              customer_email,
              company_name,
              bus_model,
              quantity,
              unit_price,
              discount_percentage,
              total_price,
              payment_terms,
              delivery_timeline,
              warranty_terms,
              special_features,
              valid_until
            )
          )
        `)
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      const invoice = (document as any).yutong_invoices;
      const quotation = invoice.yutong_quotations;

      // Prepare invoice data
      const invoiceData: YutongInvoiceData = {
        invoiceNo: invoice.invoice_no,
        quotationNo: quotation.quotation_no,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone,
        customerEmail: quotation.customer_email,
        companyName: quotation.company_name,
        busModel: quotation.bus_model,
        quantity: quotation.quantity,
        unitPrice: quotation.unit_price,
        discountAmount: quotation.discount_amount,
        totalPrice: quotation.total_price,
        paymentTerms: quotation.payment_terms,
        deliveryTimeline: quotation.delivery_timeline,
        warrantyTerms: quotation.warranty_terms,
        specialFeatures: quotation.special_features,
        validUntil: new Date(quotation.valid_until),
        invoice_status: document.document_status as 'draft' | 'approved',
      };

      // Generate new PDF
      const pdfBlob = await generateYutongInvoicePDF(invoiceData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let base64String = '';
      const chunkSize = 1024;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(base64String);

      // Update document
      const newFileName = `${invoice.invoice_no}-REGENERATED-${Date.now()}.pdf`;
      const { error: updateError } = await supabase
        .from('document_storage')
        .update({
          document_data: base64Data,
          file_name: newFileName,
          file_size: uint8Array.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      toast.success('Invoice regenerated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error regenerating invoice:', error);
      toast.error('Failed to regenerate invoice');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const syncInvoiceToFinanceHub = async (invoiceId: string) => {
    try {
      setIsLoading(true);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('yutong_invoices')
        .select(`
          *,
          yutong_quotations (
            id,
            quotation_no,
            customer_name,
            customer_phone,
            customer_email,
            company_name,
            bus_model,
            quantity,
            unit_price,
            discount_percentage,
            total_price,
            payment_terms,
            delivery_timeline,
            warranty_terms,
            special_features,
            valid_until,
            customer_category_id
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const quotation = (invoiceData as any).yutong_quotations;
      if (!quotation) throw new Error('Quotation data not found');

      if (invoiceData.status !== 'approved') {
         throw new Error('Only approved invoices can be synced.');
      }

      // ==========================================
      // FINANCE INTEGRATION - AR & GL POSTING
      // ==========================================
      const settings = await fetchVehicleFinanceSettings('yutong', NCG_HOLDING_ID);
      
      if (settings && invoiceData.amount > 0) {
        // 1. Check if an order exists for this quotation
        const { data: existingOrder } = await supabase
          .from('yutong_orders')
          .select('id, order_no, finance_customer_id, total_paid')
          .eq('quotation_id', quotation.id)
          .maybeSingle();

        let financeCustomerId = existingOrder?.finance_customer_id;
        
        // 2. Create or find customer if not exists
        if (!financeCustomerId && quotation.customer_name) {
          financeCustomerId = await createVehicleCustomer({
            module: 'yutong',
            companyId: NCG_HOLDING_ID,
            customerName: quotation.customer_name,
            customerPhone: quotation.customer_phone || undefined,
            customerEmail: quotation.customer_email || undefined,
            customerCategoryId: quotation.customer_category_id || undefined,
          });
          
          // Link back to order if it exists
          if (financeCustomerId && existingOrder) {
            await supabase
              .from('yutong_orders')
              .update({ finance_customer_id: financeCustomerId })
              .eq('id', existingOrder.id);
          }
        }

        if (financeCustomerId) {
          const orderNo = existingOrder?.order_no || quotation.quotation_no;
          const orderId = existingOrder?.id || quotation.id; 
          const totalPaid = existingOrder?.total_paid || 0;
          const invoiceAmount = invoiceData.amount;
          
          // 3. Create AR Invoice
          const arResult = await createVehicleARInvoice({
            module: 'yutong',
            orderId: orderId,
            orderNo: orderNo,
            customerId: financeCustomerId,
            totalAmount: invoiceAmount,
            advanceAmount: totalPaid,
            companyId: NCG_HOLDING_ID,
            settings,
            customerCategoryId: quotation.customer_category_id,
            invoiceNo: invoiceData.invoice_no,
            // Calculate standard 18% VAT
            taxAmount: invoiceAmount - (invoiceAmount / 1.18),
          });

          if (arResult) {
            console.log('[Yutong Sync] Created AR Invoice:', arResult.invoiceNumber);
            
            // 4. Post to GL — GUARD: Skip if AR invoice already has GL posted at creation time
            // createVehicleARInvoice auto-posts GL when status != 'draft', so we must check first
            let skipRevenueGL = false;
            const { data: arCheck } = await supabase
              .from('ar_invoices')
              .select('journal_entry_id')
              .eq('id', arResult.invoiceId)
              .single();
            if (arCheck?.journal_entry_id) {
              console.log('[Yutong Sync] AR Invoice already has GL posted (journal_entry_id exists), skipping redundant revenue GL.');
              skipRevenueGL = true;
            }

            if (!skipRevenueGL && settings.trade_receivable_account_id && settings.sales_revenue_account_id) {
              const glResult = await postVehicleInvoiceToGL({
                module: 'yutong',
                orderNo: orderNo,
                customerName: quotation.customer_name,
                customerId: financeCustomerId,
                invoiceAmount: invoiceAmount,
                settings,
                effectiveCompanyId: NCG_HOLDING_ID,
                isTaxInvoice: true,
                taxRate: 18,
                invoiceNo: invoiceData.invoice_no,
              });

              if (glResult) {
                console.log('[Yutong Sync] Posted to GL:', glResult.entryNumber);
                
                // Update AR Invoice with JE ID
                await supabase
                  .from('ar_invoices')
                  .update({ journal_entry_id: glResult.journalEntryId })
                  .eq('id', arResult.invoiceId);
              }
            }
          }
        }
      }

      toast.success('Invoice synced successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error syncing invoice:', error);
      toast.error('Failed to sync invoice: ' + error.message);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generateAndStoreDraftInvoice,
    approveInvoice,
    getInvoicesByQuotation,
    getInvoiceDocuments,
    regenerateInvoice,
    syncInvoiceToFinanceHub,
  };
};