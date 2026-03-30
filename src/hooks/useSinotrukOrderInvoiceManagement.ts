// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generateSinotruckOrderInvoiceHTML, 
  generateSinotruckOrderInvoicePDF,
  SinotruckOrderInvoiceData 
} from '@/lib/sinotruck-order-invoice-generator';
import {
  fetchVehicleFinanceSettings,
  createVehicleARInvoice,
  postVehicleInvoiceToGL,
  applyAdvanceToReceivable,
  updateOrderFinanceLinks,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';

interface SinotrukStoredInvoice {
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

interface SinotrukStoredDocument {
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

export function useSinotrukOrderInvoiceManagement() {
  const [isLoading, setIsLoading] = useState(false);

  const generateAndStoreDraftInvoice = async (
    invoiceData: SinotruckOrderInvoiceData,
    orderId: string,
    quotationId: string | null
  ): Promise<{ success: boolean; invoice?: any; document?: any; error?: any }> => {
    console.log('🚀 Starting invoice generation process...');
    console.log('📋 Invoice Data:', invoiceData);
    console.log('🔑 Order ID:', orderId, 'Quotation ID:', quotationId);
    
    setIsLoading(true);
    
    try {
      // Fetch verified payments for this order
      const { data: verifiedPayments, error: paymentsError } = await supabase
        .from('sinotruck_customer_payments')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'verified')
        .order('payment_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Calculate payment totals
      const totalPaid = verifiedPayments?.reduce((sum, p) => sum + p.payment_amount, 0) || 0;
      const balanceDue = invoiceData.total - totalPaid;

      // Enrich invoice data with payment information
      invoiceData = {
        ...invoiceData,
        paymentsReceived: verifiedPayments?.map(p => ({
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
      console.log('📝 Step 1: Generating invoice number...');
      const { data: invoiceNoData, error: invoiceNoError } = await supabase
        .rpc('generate_sinotruck_invoice_no');
      
      if (invoiceNoError) {
        console.error('❌ Failed to generate invoice number:', invoiceNoError);
        throw new Error(`Invoice number generation failed: ${invoiceNoError.message}`);
      }
      
      let invoiceNo = invoiceNoData as string;
      
      // Add type prefix based on invoice category
      const invoiceCat = invoiceData.invoice_category || 'direct_invoice';
      const typePrefix = invoiceCat === 'proforma_invoice' ? 'PI-' 
        : invoiceCat === 'tax_invoice' ? 'TI-' 
        : 'CI-';
      // Insert prefix after "NCGH-ST-" or at start
      if (invoiceNo.includes('NCGH-ST-')) {
        invoiceNo = invoiceNo.replace('NCGH-ST-', `NCGH-ST-${typePrefix}`);
      } else {
        invoiceNo = `${typePrefix}${invoiceNo}`;
      }
      console.log('✅ Invoice number generated with prefix:', invoiceNo);
      
      // For draft invoices, signatures will be added later via signature manager
      console.log('📝 Step 1.5: Invoice signatures will be managed separately');
      const signatureData = {};
      
      // Update invoice data with generated number and signatures
      const fullInvoiceData = {
        ...invoiceData,
        ...signatureData,
        invoice_no: invoiceNo,
        invoice_status: 'draft' as const,
        // Ensure customer_commitment and leasing_amount are passed through
        customer_commitment: invoiceData.customer_commitment,
        leasing_amount: invoiceData.leasing_amount,
      };
      
      // Generate PDF
      console.log('📄 Step 2: Generating PDF...');
      const pdfBlob = await generateSinotruckOrderInvoicePDF(fullInvoiceData);
      console.log('✅ PDF generated successfully. Size:', pdfBlob.size, 'bytes');
      
      // Upload to storage - use sinotruck-invoices bucket
      console.log('☁️ Step 3: Uploading to storage...');
      const fileName = `${invoiceNo}_draft.pdf`;
      const filePath = `${orderId}/${fileName}`;
      console.log('📁 Upload path:', filePath);
      console.log('📦 File size:', pdfBlob.size, 'bytes (', (pdfBlob.size / 1024 / 1024).toFixed(2), 'MB)');
      
      // Add timeout to storage upload - use sinotruck-invoices bucket
      const uploadPromise = supabase.storage
        .from('sinotruck-invoices')
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
      
      // Create invoice record with proforma fields
      console.log('💾 Step 4: Creating invoice record...');
      const insertData: any = {
        invoice_no: invoiceNo,
        order_id: orderId,
        invoice_date: fullInvoiceData.invoice_date,
        invoice_amount: fullInvoiceData.invoice_category === 'proforma_invoice' 
          ? fullInvoiceData.proforma_amount || fullInvoiceData.total 
          : fullInvoiceData.total,
        status: 'draft',
        // Proforma invoice fields
        invoice_category: fullInvoiceData.invoice_category || 'direct_invoice',
        proforma_amount_percentage: fullInvoiceData.proforma_amount_percentage,
        proforma_amount: fullInvoiceData.proforma_amount,
        finance_company_name: fullInvoiceData.finance_company_name,
        finance_company_address: fullInvoiceData.finance_company_address,
        proforma_purpose: fullInvoiceData.proforma_purpose
      };
      
      if (quotationId) {
        insertData.quotation_id = quotationId;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('sinotruck_invoice_records')
        .insert(insertData)
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
        .from('sinotruck_invoice_documents')
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
      
      // Step 6: Auto-create AR Invoice (draft) at generation time
      console.log('💰 Step 6: Creating draft AR Invoice...');
      try {
        const settings = await fetchVehicleFinanceSettings('sinotruck', NCG_HOLDING_ID);
        
        // Get order details for customer info
        const { data: orderDetails } = await supabase
          .from('sinotruck_orders')
          .select('*, sinotruck_quotations(customer_name, customer_category_id, contact_number)')
          .eq('id', orderId)
          .single();
        
        if (settings && orderDetails?.finance_customer_id) {
          const invoiceAmount = fullInvoiceData.invoice_category === 'proforma_invoice'
            ? fullInvoiceData.proforma_amount || fullInvoiceData.total
            : fullInvoiceData.total;
          
          const isTax = fullInvoiceData.invoice_category === 'tax_invoice' || fullInvoiceData.is_tax_invoice;
          const taxAmt = isTax ? (fullInvoiceData.vat_amount || invoiceAmount - invoiceAmount / 1.18) : undefined;
          
          const arResult = await createVehicleARInvoice({
            module: 'sinotruck',
            orderId,
            orderNo: orderDetails.order_no,
            customerId: orderDetails.finance_customer_id,
            totalAmount: invoiceAmount,
            advanceAmount: 0,
            companyId: NCG_HOLDING_ID,
            settings,
            customerCategoryId: (orderDetails as any)?.customer_category_id
              || orderDetails?.sinotruck_quotations?.customer_category_id,
            invoiceNo,
            taxAmount: taxAmt,
            status: 'draft',
          });
          
          if (arResult) {
            await updateOrderFinanceLinks({
              module: 'sinotruck',
              orderId,
              arInvoiceId: arResult.invoiceId,
            });
            console.log(`✅ Draft AR Invoice created: ${arResult.invoiceNumber}`);
          }
        } else {
          console.warn('⚠️ Skipping AR auto-creation: missing settings or finance customer');
        }
      } catch (arError) {
        console.warn('⚠️ AR Invoice auto-creation failed (non-blocking):', arError);
      }
      
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

  /**
   * PROPER ACCOUNTING FLOW:
   * When invoice is APPROVED:
   * 1. Create AR Invoice in Finance module
   * 2. Post Revenue Recognition GL: DR Trade Receivable | CR Sales Revenue
   * 3. Apply advances against receivable: DR Customer Advance | CR Trade Receivable
   */
  const approveInvoice = async (
    invoiceId: string,
    documentId: string
  ): Promise<{ success: boolean; error?: any }> => {
    setIsLoading(true);
    
    try {
      // Get document with invoice data
      const { data: document, error: docError } = await supabase
        .from('sinotruck_invoice_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      
      // Get invoice record with order details
      const { data: invoice, error: invError } = await supabase
        .from('sinotruck_invoice_records')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invError) throw invError;

      // Get order details for finance integration
      const { data: orderDetails, error: orderError } = await supabase
        .from('sinotruck_orders')
        .select('*, sinotruck_quotations(customer_name, customer_category_id, contact_number)')
        .eq('id', invoice.order_id)
        .single();

      if (orderError) throw orderError;
      
      // Regenerate PDF without draft watermark
      const invoiceData: SinotruckOrderInvoiceData = document.invoice_data as unknown as SinotruckOrderInvoiceData;
      invoiceData.invoice_status = 'approved' as const;
      
      const pdfBlob = await generateSinotruckOrderInvoicePDF(invoiceData);
      
      // Upload approved version - use sinotruck-invoices bucket
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
        .from('sinotruck_invoice_records')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
      
      if (updateInvError) throw updateInvError;
      
      // Update document record
      const { error: updateDocError } = await supabase
        .from('sinotruck_invoice_documents')
        .update({
          file_name: fileName,
          file_path: filePath,
          file_size: pdfBlob.size,
          document_status: 'approved',
          invoice_data: invoiceData as any
        })
        .eq('id', documentId);
      
      if (updateDocError) throw updateDocError;

      // ==========================================
      // FINANCE INTEGRATION - PROPER ACCOUNTING
      // ==========================================
      const settings = await fetchVehicleFinanceSettings('sinotruck', NCG_HOLDING_ID);

      // Ensure finance_customer_id exists before proceeding
      if (settings && !orderDetails?.finance_customer_id && orderDetails?.sinotruck_quotations?.customer_name) {
        console.log('[Sinotruk] Resolving finance customer prior to GL posting...');
        const { createVehicleCustomer } = await import('@/hooks/useVehicleSalesFinance');
        const newCustomerId = await createVehicleCustomer({
          module: 'sinotruck',
          companyId: NCG_HOLDING_ID,
          customerName: orderDetails.sinotruck_quotations.customer_name,
          customerPhone: orderDetails.sinotruck_quotations.contact_number || undefined,
          customerEmail: undefined,
          customerCategoryId: orderDetails.sinotruck_quotations.customer_category_id || undefined,
        });

        if (newCustomerId) {
          await supabase
            .from('sinotruck_orders')
            .update({ finance_customer_id: newCustomerId })
            .eq('id', invoice.order_id);
            
          orderDetails.finance_customer_id = newCustomerId;
          console.log('[Sinotruk] Resolved and linked finance customer:', newCustomerId);
        }
      }
      
      if (settings && orderDetails?.finance_customer_id) {
        const customerName = orderDetails?.sinotruck_quotations?.customer_name || 'Unknown';
        const orderNo = orderDetails?.order_no;
        const invoiceAmount = invoice.invoice_amount;
        const totalPaid = orderDetails?.total_paid || 0;

        // Check if AR Invoice already exists
        let arInvoiceId = orderDetails?.ar_invoice_id;
        
        const isTax = invoiceData.invoice_category === 'tax_invoice' || 
                      invoiceData.is_tax_invoice || 
                      (invoiceData.tax_rate && invoiceData.tax_rate > 0) || 
                      (invoiceData.vat_amount && invoiceData.vat_amount > 0);
        const taxRateVal = invoiceData.tax_rate || 18;
        const taxAmt = isTax ? (invoiceData.vat_amount || invoiceAmount - invoiceAmount / (1 + taxRateVal / 100)) : undefined;
        
        if (arInvoiceId) {
          // Update existing draft AR invoice to approved status
          await supabase
            .from('ar_invoices')
            .update({
              status: totalPaid >= invoiceAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid',
              paid_amount: totalPaid,
              balance: invoiceAmount - totalPaid,
              tax_amount: taxAmt || null,
              subtotal: taxAmt ? invoiceAmount - taxAmt : null,
            })
            .eq('id', arInvoiceId);
          console.log('[Sinotruk] Updated existing AR Invoice to approved status');
        } else if (settings.trade_receivable_account_id && settings.sales_revenue_account_id) {
          // Create AR Invoice if none exists
          const arResult = await createVehicleARInvoice({
            module: 'sinotruck',
            orderId: invoice.order_id,
            orderNo,
            customerId: orderDetails.finance_customer_id,
            totalAmount: invoiceAmount,
            advanceAmount: totalPaid,
            companyId: NCG_HOLDING_ID,
            settings,
            customerCategoryId: (orderDetails as any)?.customer_category_id 
              || orderDetails?.sinotruck_quotations?.customer_category_id,
            invoiceNo: invoice.invoice_no,
            taxAmount: taxAmt,
          });

          if (arResult) {
            arInvoiceId = arResult.invoiceId;
            await updateOrderFinanceLinks({
              module: 'sinotruck',
              orderId: invoice.order_id,
              arInvoiceId: arResult.invoiceId,
            });
            toast.success(`AR Invoice created: ${arResult.invoiceNumber}`);
          }
        }

        // Post Revenue Recognition GL (with VAT split for tax invoices)
        // GUARD: Skip if AR invoice already has GL posted at creation time
        let skipRevenueGL = false;
        if (arInvoiceId) {
          const { data: arCheck } = await (supabase as any)
            .from('ar_invoices')
            .select('journal_entry_id')
            .eq('id', arInvoiceId)
            .single();
          if (arCheck?.journal_entry_id) {
            console.log('[Sinotruk] AR Invoice already has GL posted (journal_entry_id exists), skipping revenue GL on approval.');
            skipRevenueGL = true;
          }
        }

        if (!skipRevenueGL && settings.trade_receivable_account_id && settings.sales_revenue_account_id) {
          const revenueGLResult = await postVehicleInvoiceToGL({
            module: 'sinotruck',
            orderNo,
            customerName,
            customerId: orderDetails.finance_customer_id,
            invoiceAmount,
            settings,
            effectiveCompanyId: NCG_HOLDING_ID,
            isTaxInvoice: isTax,
            taxRate: taxRateVal,
            invoiceNo: invoice.invoice_no,
          });

          if (revenueGLResult) {
            console.log(`[Sinotruk] Revenue GL posted: ${revenueGLResult.entryNumber}`);
          }

          // Apply advances against receivable
          if (totalPaid > 0 && settings.customer_advance_account_id) {
            const advanceResult = await applyAdvanceToReceivable({
              module: 'sinotruck',
              orderNo,
              customerName,
              advanceAmount: totalPaid,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });

            if (advanceResult) {
              console.log(`[Sinotruk] Advance applied GL: ${advanceResult.entryNumber}`);
            }
          }
        }
      } else if (!settings) {
        console.warn('[Sinotruk] Finance settings not configured - skipping AR/GL integration');
      } else if (!orderDetails?.finance_customer_id) {
        console.warn('[Sinotruk] No finance customer linked - skipping AR/GL integration');
      }
      
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
  ): Promise<{ success: boolean; invoices?: SinotrukStoredInvoice[]; error?: any }> => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_invoice_records')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, invoices: data as SinotrukStoredInvoice[] };
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      return { success: false, error };
    }
  };

  const getInvoiceDocuments = async (
    orderId: string
  ): Promise<{ success: boolean; documents?: SinotrukStoredDocument[]; error?: any }> => {
    try {
      // First get invoice records for this specific order
      const { data: invoiceRecords, error: recordsError } = await supabase
        .from('sinotruck_invoice_records')
        .select('id')
        .eq('order_id', orderId);

      if (recordsError) throw recordsError;

      if (!invoiceRecords || invoiceRecords.length === 0) {
        return { success: true, documents: [] };
      }

      // Then get documents for those specific invoice records
      const recordIds = invoiceRecords.map(r => r.id);
      const { data, error } = await supabase
        .from('sinotruck_invoice_documents')
        .select(`
          *,
          sinotruck_invoice_records!invoice_record_id (
            order_id,
            quotation_id,
            invoice_no,
            status
          )
        `)
        .in('invoice_record_id', recordIds)
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
        .from('sinotruck_invoice_documents')
        .select(`
          *,
          sinotruck_invoice_records (
            order_id
          )
        `)
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      
      // Fetch latest signatures from sinotruck_invoice_signatures table
      let signatureData = {};
      if (document.invoice_record_id) {
        const { data: signatures } = await supabase
          .from('sinotruck_invoice_signatures')
          .select('*')
          .eq('invoice_record_id', document.invoice_record_id)
          .order('created_at', { ascending: true });
        
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
      const orderId = (document.sinotruck_invoice_records as any)?.order_id;
      let paymentData = {};
      
      if (orderId) {
        const { data: verifiedPayments, error: paymentsError } = await supabase
          .from('sinotruck_customer_payments')
          .select('*')
          .eq('order_id', orderId)
          .eq('status', 'verified')
          .order('payment_date', { ascending: true });

        if (!paymentsError && verifiedPayments) {
          const invoiceTotal = (document.invoice_data as any)?.total || 0;
          const totalPaid = verifiedPayments.reduce((sum, p) => sum + p.payment_amount, 0);
          const balanceDue = invoiceTotal - totalPaid;

          paymentData = {
            paymentsReceived: verifiedPayments.map(p => ({
              payment_date: p.payment_date,
              amount: p.payment_amount,
              reference_no: p.payment_reference,
              payment_method: p.payment_method,
              verified_by: p.verified_by,
              verified_at: p.verified_at
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
      
      // Regenerate PDF with updated data
      const pdfBlob = await generateSinotruckOrderInvoicePDF(updatedInvoiceData);
      
      // Re-upload with same path - use sinotruck-invoices bucket
      const { error: uploadError } = await supabase.storage
        .from('sinotruck-invoices')
        .upload(document.file_path, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Update document record with new data and file size
      const { error: updateError } = await supabase
        .from('sinotruck_invoice_documents')
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
