import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';
import { 
  fetchSpecialHireFinanceSettings, 
  postAdvancePaymentToGLStandalone,
  postBalancePaymentToGLStandalone,
  postFullPaymentToGLStandalone,
  createOrGetSPHCustomer,
  createSPHARInvoice,
  updateSPHARInvoiceOnPayment,
  createSPHARReceipt,
  checkPaymentDocument,
  applyAdvanceToInvoiceStandalone,
} from '@/hooks/useSpecialHireFinance';
import { NCG_HOLDING_ID } from '@/contexts/CompanyContext';

// Default to NCG_HOLDING_ID for backward compatibility, but callers should pass the effective company ID

export const useFinanceApproval = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Helper function to get approval signatures for a document
  const getDocumentApprovals = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', documentId);

      if (error) throw error;

      const approvals: any = {};
      data?.forEach(approval => {
        approvals[approval.approval_type] = {
          approver_name: approval.approver_name,
          signature_data: approval.signature_data,
          approval_date: approval.approval_date,
        };
      });

      return approvals;
    } catch (error) {
      console.error('Error fetching document approvals:', error);
      return {};
    }
  };

  const approvePayment = async (paymentId: string, notes?: string, signatures?: any, companyId?: string) => {
    try {
      setIsLoading(true);
      console.log('[SPH Finance] ========== APPROVAL START ==========');
      console.log('[SPH Finance] Payment ID:', paymentId);

      // ========================
      // STEP 1: Update payment status FIRST (critical path - must succeed)
      // ========================
      const { data: paymentData, error: paymentError } = await supabase
        .from('special_hire_payments')
        .update({
          status: 'approved',
          finance_approved_by: user?.id,
          finance_approved_at: new Date().toISOString(),
          notes: notes || undefined,
        })
        .eq('id', paymentId)
        .select(`
          *,
          quotation:special_hire_quotations(*)
        `)
        .single();

      if (paymentError) {
        console.error('[SPH Finance] ❌ Failed to update payment status:', paymentError);
        throw paymentError;
      }

      console.log('[SPH Finance] ✅ Payment status updated to approved');

      // Return success immediately - AR/GL integration runs in background
      setIsLoading(false);

      // Fire background integration (non-blocking)
      performBackgroundIntegration(paymentId, paymentData, signatures, companyId || NCG_HOLDING_ID).catch(err => {
        console.error('[SPH Finance] ❌ Background integration failed:', err);
        toast.warning('Payment approved but finance integration needs retry. Use "Retry AR Integration".');
      });

      console.log('[SPH Finance] ========== APPROVAL COMPLETE (background tasks running) ==========');
      return { success: true, arIntegrationSuccess: true };
    } catch (error) {
      console.error('[SPH Finance] ❌ APPROVAL FAILED:', error);
      toast.error('Failed to approve payment. Please try again.');
      setIsLoading(false);
      return { success: false, error };
    }
  };

  // Background function for AR/GL integration + document regeneration
  const performBackgroundIntegration = async (paymentId: string, paymentData: any, signatures?: any, companyId: string = NCG_HOLDING_ID) => {
    let journalEntry: any = null;
    let arInvoiceId: string | null = paymentData.quotation.ar_invoice_id;
    let customerId: string | null = paymentData.quotation.finance_customer_id;

    // Check if document exists (validation gate)
    const hasDocument = await checkPaymentDocument(paymentId);
    if (!hasDocument) {
      console.warn('[SPH Finance] ⚠️ No document found for payment. Proceeding anyway...');
    }

    const settings = await fetchSpecialHireFinanceSettings(companyId);
    
    if (!settings) {
      console.warn('[SPH Finance] ⚠️ Special Hire Finance settings not configured');
      toast.warning('Special Hire Finance settings not configured. Go to Settings > Special Hire Finance.');
      return;
    }

    console.log('[SPH Finance] Settings loaded');

    const paymentType = paymentData.payment_type || 'advance';
    const isAdvance = paymentType === 'advance';
    const isFullPayment = paymentType === 'full';
    const isBalance = paymentType === 'balance';

    // Step 2a: Create/Get Finance Customer
    if (!customerId) {
      console.log('[SPH Finance] Creating/getting customer...');
      customerId = await createOrGetSPHCustomer({
        customerName: paymentData.quotation.customer_name,
        customerPhone: paymentData.quotation.customer_phone,
        customerEmail: paymentData.quotation.customer_email,
        companyId: companyId,
      });

      if (!customerId) {
        console.error('[SPH Finance] ❌ CRITICAL: Failed to create customer');
        toast.error('CRITICAL: Failed to create Finance Customer. Check console for details.');
        return;
      }
      
      console.log('[SPH Finance] ✅ Customer ID:', customerId);
      toast.success(`Finance Customer linked: ${paymentData.quotation.customer_name}`);
      
      await supabase
        .from('special_hire_quotations')
        .update({ finance_customer_id: customerId })
        .eq('id', paymentData.quotation.id);
    }

    // Step 2b: Create AR Invoice if full or balance payment and customer exists
    // ADVANCE payments should NOT create an AR Invoice for the full amount yet.
    // The AR Invoice will be generated later when the trip is completed (Balance Invoice) or here if missing.
    if (customerId && (isFullPayment || isBalance) && !arInvoiceId) {
      console.log('[SPH Finance] Creating AR Invoice for Full/Balance Payment...');
      
      // Base quotation amount
      let totalAmount = (paymentData.quotation.gross_revenue || 0) +
        (paymentData.quotation.fuel_cost_fuel_only || 0) +
        (paymentData.quotation.commission_pass_through_amount || 0) +
        (paymentData.quotation.total_additional_charges || 0) -
        (paymentData.quotation.discount_amount_lkr || 0);

      // Include post-trip adjustment amounts if any
      try {
        const { data: adjustment } = await supabase
          .from('special_hire_trip_adjustments')
          .select('extra_km_total_charge, total_additional_expenses')
          .eq('quotation_id', paymentData.quotation.id)
          .maybeSingle();
        
        if (adjustment) {
          const adjustmentTotal = (adjustment.extra_km_total_charge || 0) + (adjustment.total_additional_expenses || 0);
          if (adjustmentTotal > 0) {
            totalAmount += adjustmentTotal;
            console.log('[SPH Finance] Including post-trip adjustment in AR Invoice:', adjustmentTotal, 'New total:', totalAmount);
          }
        }
      } catch (err) {
        console.warn('[SPH Finance] Could not fetch adjustment data:', err);
      }

      const dueDate = format(
        new Date(paymentData.quotation.pickup_datetime || new Date()),
        'yyyy-MM-dd'
      );

      // Query actual advance payments to pass correct advance amount (not balance payment amount)
      let actualAdvanceAmount = 0;
      try {
        const { data: advPmts } = await supabase
          .from('special_hire_payments')
          .select('amount')
          .eq('quotation_id', paymentData.quotation.id)
          .eq('payment_type', 'advance')
          .eq('status', 'approved');
        actualAdvanceAmount = (advPmts || []).reduce((s, p) => s + (p.amount || 0), 0);
      } catch (err) {
        console.warn('[SPH Finance] Could not fetch advance payments:', err);
      }

      const arResult = await createSPHARInvoice({
        quotationId: paymentData.quotation.id,
        quotationNo: paymentData.quotation.quotation_no,
        customerId,
        customerName: paymentData.quotation.customer_name,
        totalAmount,
        advanceAmount: actualAdvanceAmount,
        dueDate,
        companyId: companyId,
      });

      if (!arResult) {
        console.error('[SPH Finance] ❌ Failed to create AR Invoice');
        toast.error('Failed to create AR Invoice. Check Finance Settings.');
        // Don't return, allow advance processing to continue
      } else {
        arInvoiceId = arResult.invoiceId;
        console.log('[SPH Finance] ✅ AR Invoice created:', arResult.invoiceNumber);
        toast.success(`AR Invoice created: ${arResult.invoiceNumber}`);
      }
    }

    // Step 2c: Post GL Entry
    if (isAdvance && settings.auto_post_advance_payments) {
      journalEntry = await postAdvancePaymentToGLStandalone({
        quotationNo: paymentData.quotation.quotation_no,
        customerName: paymentData.quotation.customer_name,
        amount: paymentData.amount,
        settings,
        effectiveCompanyId: companyId,
      });
      if (journalEntry) {
        console.log('[SPH Finance] ✅ Advance GL posted:', journalEntry.entry_number);
        toast.success(`GL Entry created: ${journalEntry.entry_number}`);
      }
    } else if (isFullPayment && settings.auto_post_advance_payments) {
      journalEntry = await postFullPaymentToGLStandalone({
        quotationNo: paymentData.quotation.quotation_no,
        customerName: paymentData.quotation.customer_name,
        amount: paymentData.amount,
        settings,
        effectiveCompanyId: companyId,
      });
      if (journalEntry) {
        console.log('[SPH Finance] ✅ Full payment GL posted:', journalEntry.entry_number);
        toast.success(`GL Entry created: ${journalEntry.entry_number}`);
      }
    } else if (isBalance && settings.auto_post_balance_payments) {
      journalEntry = await postBalancePaymentToGLStandalone({
        quotationNo: paymentData.quotation.quotation_no,
        customerName: paymentData.quotation.customer_name,
        balanceAmount: paymentData.amount,
        settings,
        effectiveCompanyId: companyId,
      });
      if (journalEntry) {
        console.log('[SPH Finance] ✅ Balance GL posted:', journalEntry.entry_number);
        toast.success(`GL Entry created: ${journalEntry.entry_number}`);
      }
    }

    // Step 2d: Apply advance against AR Invoice (JE #4)
    if (isBalance && arInvoiceId) {
      try {
        const { data: advancePayments } = await supabase
          .from('special_hire_payments')
          .select('amount')
          .eq('quotation_id', paymentData.quotation.id)
          .eq('payment_type', 'advance')
          .eq('status', 'approved');
        
        const totalAdvance = (advancePayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        
        if (totalAdvance > 0) {
          const arInvoiceNo = `SPH-INV-${paymentData.quotation.quotation_no}`;
          const applyResult = await applyAdvanceToInvoiceStandalone({
            invoiceNo: arInvoiceNo,
            quotationNo: paymentData.quotation.quotation_no,
            customerName: paymentData.quotation.customer_name,
            advanceAmount: totalAdvance,
            settings,
            effectiveCompanyId: companyId,
          });
          if (applyResult) {
            console.log('[SPH Finance] ✅ Advance applied to invoice:', applyResult.entry_number);
            toast.success(`Advance Applied: ${applyResult.entry_number}`);
          }
        }
      } catch (err) {
        console.error('[SPH Finance] ⚠️ Advance application failed (non-critical):', err);
      }
    }

    // Step 2e: Create AR Receipt
    if (arInvoiceId && customerId) {
      if (isBalance) {
        await updateSPHARInvoiceOnPayment({
          arInvoiceId,
          paymentAmount: paymentData.amount,
          paymentId,
          journalEntryId: journalEntry?.id,
        });
      }

      const receiptResult = await createSPHARReceipt({
        customerId,
        arInvoiceId,
        paymentAmount: paymentData.amount,
        paymentMethod: paymentData.payment_method || 'cash',
        reference: paymentData.reference_no,
        paymentId,
        companyId: companyId,
        journalEntryId: journalEntry?.id,
      });

      if (receiptResult) {
        console.log('[SPH Finance] ✅ AR Receipt created:', receiptResult.receiptNumber);
        toast.success(`AR Receipt created: ${receiptResult.receiptNumber}`);
      }
    }

    // Step 2e: Link journal entry and AR invoice to payment
    if (journalEntry || arInvoiceId) {
      const updateData: any = {};
      if (journalEntry) updateData.journal_entry_id = journalEntry.id;
      if (arInvoiceId) updateData.ar_invoice_id = arInvoiceId;
      
      await supabase
        .from('special_hire_payments')
        .update(updateData)
        .eq('id', paymentId);
    }

    // STEP 3: Parallel non-critical operations (signatures, notifications, invoice updates)
    const parallelOperations: Promise<any>[] = [];

    parallelOperations.push((async () => {
      try {
        const { data: setting } = await supabase
          .from('special_hire_signature_settings')
          .select('default_user_id, is_enabled')
          .eq('signature_role', 'checked_by')
          .single();

        if (setting?.is_enabled && setting.default_user_id) {
          const { data: existingApproval } = await supabase
            .from('document_approvals')
            .select('id')
            .eq('document_id', paymentData.quotation.id)
            .eq('approval_type', 'checked_by')
            .maybeSingle();

          if (!existingApproval) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, signature_data, user_id')
              .eq('user_id', setting.default_user_id)
              .single();

            if (profile?.signature_data) {
              await supabase.from('document_approvals').insert({
                document_id: paymentData.quotation.id,
                approval_type: 'checked_by',
                approver_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                signature_data: profile.signature_data,
                approval_date: new Date().toISOString().split('T')[0],
                user_id: profile.user_id,
              });
            }
          }
        }
      } catch (sigError) {
        console.log('[SPH Finance] Auto-signature skipped:', sigError);
      }
    })());

    parallelOperations.push(
      supabase
        .from('special_hire_invoices')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('quotation_id', paymentData.quotation.id)
        .then(({ error }) => { if (error) console.warn('[SPH Finance] Invoice update warning:', error); }) as unknown as Promise<any>
    );

    parallelOperations.push(
      supabase
        .from('payment_notifications')
        .insert({
          payment_id: paymentId,
          quotation_id: paymentData.quotation.id,
          notification_type: 'payment_approved',
          target_role: 'admin',
          message: `Payment of LKR ${paymentData.amount.toLocaleString()} for quotation ${paymentData.quotation.quotation_no} has been approved by finance.`,
          created_by: user?.id,
        })
        .then(({ error }) => { if (error) console.warn('[SPH Finance] Notification warning:', error); }) as unknown as Promise<any>
    );

    await Promise.allSettled(parallelOperations);

    // STEP 4: Document regeneration — create if missing, then upgrade to approved
    try {
      let { data: draftDocuments } = await supabase
        .from('document_storage')
        .select('*')
        .eq('payment_id', paymentId)
        .eq('document_status', 'draft');

      // If no draft document exists (Issue 3 fix), create one now
      if (!draftDocuments || draftDocuments.length === 0) {
        console.log('[SPH Finance] ⚠️ No draft document found — creating one before approval...');
        const { uploadPdfToStorage: uploadPdf } = await import('@/lib/document-storage-helpers');
        const { generateInvoicePDF: genPdf } = await import('@/lib/invoice-generator');

        const calcTotal = (q: any) => (q.gross_revenue || 0) + (q.fuel_cost_fuel_only || 0) + (q.commission_pass_through_amount || 0) + (q.total_additional_charges || 0) - (q.discount_amount_lkr || 0);

        const fallbackData: InvoiceData = {
          invoiceNo: `DRAFT-${paymentId}`,
          invoiceType: paymentData.payment_type as 'advance' | 'balance',
          quotationNo: paymentData.quotation.quotation_no,
          customerName: paymentData.quotation.customer_name,
          customerPhone: paymentData.quotation.customer_phone || '',
          customerEmail: paymentData.quotation.customer_email,
          companyName: paymentData.quotation.company_name,
          pickupLocation: paymentData.quotation.pickup_location,
          dropLocation: paymentData.quotation.drop_location,
          pickupDate: new Date(paymentData.quotation.pickup_datetime),
          dropDate: new Date(paymentData.quotation.drop_datetime || paymentData.quotation.pickup_datetime),
          busType: (() => { try { const fd = typeof paymentData.quotation.bus_fleet_details === 'string' ? JSON.parse(paymentData.quotation.bus_fleet_details) : paymentData.quotation.bus_fleet_details; return fd?.buses?.[0]?.bus_type_name || 'Standard Bus'; } catch { return 'Standard Bus'; } })(),
          numberOfBuses: paymentData.quotation.number_of_buses,
          numberOfPassengers: paymentData.quotation.number_of_passengers,
          totalAmount: calcTotal(paymentData.quotation),
          advanceAmount: paymentData.quotation.advance_paid || 0,
          paidAmount: paymentData.amount,
          vehicleNo: paymentData.quotation.assigned_bus_no,
          driverName: paymentData.quotation.assigned_driver_name,
          conductorName: paymentData.quotation.assigned_conductor_name,
          invoice_status: 'draft',
          document_type: paymentData.payment_type === 'advance' ? 'sales_receipt' : 'invoice',
        };

        const pdfBlob = await genPdf(fallbackData);
        const fileName = `DRAFT-${fallbackData.document_type}-${paymentData.quotation.quotation_no}-${Date.now()}.pdf`;
        const { storagePath, fileSize } = await uploadPdf(pdfBlob, fileName);

        const { data: newDoc } = await supabase
          .from('document_storage')
          .insert({
            quotation_id: paymentData.quotation.id,
            payment_id: paymentId,
            document_type: fallbackData.document_type as 'sales_receipt' | 'invoice',
            payment_type: paymentData.payment_type as 'advance' | 'balance' | 'full',
            document_status: 'draft',
            document_data: '',
            file_name: fileName,
            file_size: fileSize,
            generated_by: user?.id,
            storage_path: storagePath,
          })
          .select()
          .single();

        if (newDoc) {
          draftDocuments = [newDoc];
          console.log('[SPH Finance] ✅ Fallback draft document created');
        }
      }

      const { data: approvedPaymentsList } = await supabase
        .from('special_hire_payments')
        .select('amount')
        .eq('quotation_id', paymentData.quotation.id)
        .eq('status', 'approved');
      
      const totalApprovedPaid = (approvedPaymentsList || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      for (const doc of draftDocuments || []) {
        let docApprovals = await getDocumentApprovals(paymentData.quotation.id);
        if (signatures) {
          docApprovals = { ...docApprovals, ...signatures };
        }

        const calculateTotalAmount = (quotation: any) => {
          return quotation.gross_revenue + 
                 (quotation.fuel_cost_fuel_only || 0) + 
                 (quotation.commission_pass_through_amount || 0) +
                 (quotation.total_additional_charges || 0) - 
                 (quotation.discount_amount_lkr || 0);
        };

        const invoiceData: InvoiceData = {
          invoiceNo: `APPROVED-${paymentData.id}`,
          invoiceType: doc.payment_type as 'advance' | 'balance',
          quotationNo: paymentData.quotation.quotation_no,
          customerName: paymentData.quotation.customer_name,
          customerPhone: paymentData.quotation.customer_phone || '',
          customerEmail: paymentData.quotation.customer_email,
          companyName: paymentData.quotation.company_name,
          pickupLocation: paymentData.quotation.pickup_location,
          dropLocation: paymentData.quotation.drop_location,
          pickupDate: new Date(paymentData.quotation.pickup_datetime),
          dropDate: new Date(paymentData.quotation.drop_datetime || paymentData.quotation.pickup_datetime),
          busType: (() => { try { const fd = typeof paymentData.quotation.bus_fleet_details === 'string' ? JSON.parse(paymentData.quotation.bus_fleet_details) : paymentData.quotation.bus_fleet_details; return fd?.buses?.[0]?.bus_type_name || 'Standard Bus'; } catch { return 'Standard Bus'; } })(),
          numberOfBuses: paymentData.quotation.number_of_buses,
          numberOfPassengers: paymentData.quotation.number_of_passengers,
          totalAmount: calculateTotalAmount(paymentData.quotation),
          advanceAmount: paymentData.quotation.advance_paid || 0,
          paidAmount: (doc.document_type === 'sales_receipt' || doc.payment_type === 'advance') ? paymentData.amount : totalApprovedPaid,
          vehicleNo: paymentData.quotation.assigned_bus_no,
          driverName: paymentData.quotation.assigned_driver_name,
          conductorName: paymentData.quotation.assigned_conductor_name,
          invoice_status: 'approved',
          document_type: doc.document_type as 'sales_receipt' | 'invoice',
          preparedBy: docApprovals.prepared_by,
          approvedBy: docApprovals.approved_by,
          checkedBy: docApprovals.checked_by,
        };

        const pdfBlob = await generateInvoicePDF(invoiceData);
        
        const { uploadPdfToStorage } = await import('@/lib/document-storage-helpers');
        const newFileName = doc.file_name.replace('DRAFT-', 'APPROVED-');
        const { storagePath, fileSize } = await uploadPdfToStorage(pdfBlob, newFileName);

        await supabase
          .from('document_storage')
          .update({
            document_status: 'approved',
            document_data: '',
            file_name: newFileName,
            file_size: fileSize,
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
            storage_path: storagePath,
          })
          .eq('id', doc.id);
      }
      console.log('[SPH Finance] ✅ Documents regenerated');
    } catch (docError) {
      console.error('[SPH Finance] Document regeneration error:', docError);
    }

    // Clean up payment proof
    if (paymentData.payment_proof_url && paymentData.payment_proof_url.startsWith('payment-proofs/')) {
      supabase.storage
        .from('payment-proofs')
        .remove([paymentData.payment_proof_url])
        .catch(err => console.log('Payment proof cleanup:', err));
    }

    console.log('[SPH Finance] ✅ Background integration complete');
    toast.success('Finance integration completed successfully!');
  };

  const rejectPayment = async (paymentId: string, reason: string) => {
    try {
      setIsLoading(true);

      const { data: paymentData, error: paymentError } = await supabase
        .from('special_hire_payments')
        .update({
          status: 'rejected',
          finance_approved_by: user?.id,
          finance_approved_at: new Date().toISOString(),
          notes: reason,
        })
        .eq('id', paymentId)
        .select(`
          *,
          quotation:special_hire_quotations(*)
        `)
        .single();

      if (paymentError) throw paymentError;

      // Create rejection notification
      await supabase
        .from('payment_notifications')
        .insert({
          payment_id: paymentId,
          quotation_id: paymentData.quotation.id,
          notification_type: 'payment_rejected',
          target_role: 'admin',
          message: `Payment of LKR ${paymentData.amount.toLocaleString()} for quotation ${paymentData.quotation.quotation_no} was rejected. Reason: ${reason}`,
          created_by: user?.id,
        });

      // Mark associated documents as rejected
      await supabase
        .from('document_storage')
        .update({
          document_status: 'rejected',
        })
        .eq('payment_id', paymentId);

      toast.success('Payment rejected.');
      return { success: true };
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment. Please try again.');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const generateApprovedInvoice = async (paymentId: string) => {
    try {
      setIsLoading(true);

      const { data: paymentData, error: paymentError } = await supabase
        .from('special_hire_payments')
        .select(`
          *,
          quotation:special_hire_quotations(*)
        `)
        .eq('id', paymentId)
        .single();

      if (paymentError) throw paymentError;

      const calculateTotalAmount = (quotation: any) => {
        return quotation.gross_revenue + 
               (quotation.fuel_cost_fuel_only || 0) + 
               (quotation.commission_pass_through_amount || 0) +
               (quotation.total_additional_charges || 0) - 
               (quotation.discount_amount_lkr || 0);
      };

      const invoiceData: InvoiceData = {
        invoiceNo: `APPROVED-${paymentData.id}`,
        invoiceType: paymentData.payment_type as 'advance' | 'balance',
        quotationNo: paymentData.quotation.quotation_no,
        customerName: paymentData.quotation.customer_name,
        customerPhone: paymentData.quotation.customer_phone || '',
        customerEmail: paymentData.quotation.customer_email,
        companyName: paymentData.quotation.company_name,
        pickupLocation: paymentData.quotation.pickup_location,
        dropLocation: paymentData.quotation.drop_location,
        pickupDate: new Date(paymentData.quotation.pickup_datetime),
        dropDate: new Date(paymentData.quotation.drop_datetime || paymentData.quotation.pickup_datetime),
        busType: (() => { try { const fd = typeof paymentData.quotation.bus_fleet_details === 'string' ? JSON.parse(paymentData.quotation.bus_fleet_details) : paymentData.quotation.bus_fleet_details; return fd?.buses?.[0]?.bus_type_name || 'Standard Bus'; } catch { return 'Standard Bus'; } })(),
        numberOfBuses: paymentData.quotation.number_of_buses,
        numberOfPassengers: paymentData.quotation.number_of_passengers,
        totalAmount: calculateTotalAmount(paymentData.quotation),
        advanceAmount: paymentData.quotation.advance_paid || 0,
        paidAmount: paymentData.amount,
        vehicleNo: paymentData.quotation.assigned_bus_no,
        driverName: paymentData.quotation.assigned_driver_name,
        conductorName: paymentData.quotation.assigned_conductor_name,
        invoice_status: 'approved',
        document_type: paymentData.payment_type === 'advance' ? 'sales_receipt' : 'invoice',
      };

      const pdfBlob = await generateInvoicePDF(invoiceData);

      // Store in document_storage if not already there (Issue 5 fix)
      const { data: existingDoc } = await supabase
        .from('document_storage')
        .select('id')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (!existingDoc) {
        const { uploadPdfToStorage } = await import('@/lib/document-storage-helpers');
        const fileName = `APPROVED-${paymentData.quotation.quotation_no}-${paymentData.payment_type}-${Date.now()}.pdf`;
        const { storagePath, fileSize } = await uploadPdfToStorage(pdfBlob, fileName);

        await supabase
          .from('document_storage')
          .insert({
            quotation_id: paymentData.quotation.id,
            payment_id: paymentId,
            document_type: invoiceData.document_type as 'sales_receipt' | 'invoice',
            payment_type: paymentData.payment_type as 'advance' | 'balance' | 'full',
            document_status: 'approved',
            document_data: '',
            file_name: fileName,
            file_size: fileSize,
            generated_by: user?.id,
            storage_path: storagePath,
          });
        console.log('[SPH Finance] ✅ Approved document stored in document_storage');
      }

      // Also download for user
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `APPROVED-${paymentData.quotation.quotation_no}-${paymentData.payment_type}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Invoice generated and stored successfully!');
      return { success: true };
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice. Please try again.');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Retry AR Integration for payments that missed AR creation
  const retryARIntegration = async (paymentId: string) => {
    try {
      setIsLoading(true);
      console.log('[SPH Finance] ========== RETRY AR INTEGRATION ==========');

      // Get payment and quotation data
      const { data: paymentData, error: paymentError } = await supabase
        .from('special_hire_payments')
        .select(`
          *,
          quotation:special_hire_quotations(*)
        `)
        .eq('id', paymentId)
        .single();

      if (paymentError || !paymentData) {
        throw new Error('Payment not found');
      }

      if (paymentData.status !== 'approved') {
        throw new Error('Only approved payments can have AR integration retried');
      }

      const settings = await fetchSpecialHireFinanceSettings(NCG_HOLDING_ID);
      if (!settings) {
        throw new Error('Special Hire Finance settings not configured');
      }

      let customerId = paymentData.quotation.finance_customer_id;
      let arInvoiceId = paymentData.quotation.ar_invoice_id;

      // Create customer if missing
      if (!customerId) {
        console.log('[SPH Finance] Creating customer...');
        customerId = await createOrGetSPHCustomer({
          customerName: paymentData.quotation.customer_name,
          customerPhone: paymentData.quotation.customer_phone,
          customerEmail: paymentData.quotation.customer_email,
          companyId: NCG_HOLDING_ID,
        });

        if (!customerId) {
          throw new Error('Failed to create customer');
        }

        await supabase
          .from('special_hire_quotations')
          .update({ finance_customer_id: customerId })
          .eq('id', paymentData.quotation.id);
        
        console.log('[SPH Finance] ✅ Customer created:', customerId);
      }

      // Create AR Invoice if missing
      if (!arInvoiceId && customerId) {
        console.log('[SPH Finance] Creating AR Invoice...');
        
        const totalAmount = (paymentData.quotation.gross_revenue || 0) +
          (paymentData.quotation.fuel_cost_fuel_only || 0) +
          (paymentData.quotation.commission_pass_through_amount || 0) +
          (paymentData.quotation.total_additional_charges || 0) -
          (paymentData.quotation.discount_amount_lkr || 0);

        const dueDate = format(
          new Date(paymentData.quotation.pickup_datetime || new Date()),
          'yyyy-MM-dd'
        );

        const arResult = await createSPHARInvoice({
          quotationId: paymentData.quotation.id,
          quotationNo: paymentData.quotation.quotation_no,
          customerId,
          customerName: paymentData.quotation.customer_name,
          totalAmount,
          advanceAmount: paymentData.amount,
          dueDate,
          companyId: NCG_HOLDING_ID,
          journalEntryId: paymentData.journal_entry_id,
        });

        if (!arResult) {
          throw new Error('Failed to create AR Invoice');
        }

        arInvoiceId = arResult.invoiceId;
        
        // Link to payment
        await supabase
          .from('special_hire_payments')
          .update({ ar_invoice_id: arInvoiceId })
          .eq('id', paymentId);

        console.log('[SPH Finance] ✅ AR Invoice created:', arResult.invoiceNumber);
        toast.success(`AR Invoice created: ${arResult.invoiceNumber}`);
      }

      console.log('[SPH Finance] ========== RETRY COMPLETE ==========');
      return { success: true, customerId, arInvoiceId };
    } catch (error: any) {
      console.error('[SPH Finance] Retry AR Integration failed:', error);
      toast.error(error.message || 'Failed to retry AR integration');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    approvePayment,
    rejectPayment,
    generateApprovedInvoice,
    retryARIntegration,
  };
};
