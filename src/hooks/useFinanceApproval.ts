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
} from '@/hooks/useSpecialHireFinance';
import { NCG_HOLDING_ID } from '@/contexts/CompanyContext';

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

  const approvePayment = async (paymentId: string, notes?: string, signatures?: any) => {
    try {
      setIsLoading(true);
      console.log('[SPH Finance] ========== APPROVAL START ==========');
      console.log('[SPH Finance] Payment ID:', paymentId);

      // ========================
      // STEP 1: Update payment status FIRST (critical path)
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

      // ========================
      // STEP 2: AR & GL INTEGRATION (with proper error handling)
      // ========================
      let journalEntry: any = null;
      let arInvoiceId: string | null = paymentData.quotation.ar_invoice_id;
      let customerId: string | null = paymentData.quotation.finance_customer_id;
      let arIntegrationSuccess = true;

      // Check if document exists (validation gate)
      const hasDocument = await checkPaymentDocument(paymentId);
      if (!hasDocument) {
        console.warn('[SPH Finance] ⚠️ No document found for payment. Proceeding anyway...');
      }

      try {
        console.log('[SPH Finance] Starting AR & GL integration...');
        const settings = await fetchSpecialHireFinanceSettings(NCG_HOLDING_ID);
        
        if (!settings) {
          console.warn('[SPH Finance] ⚠️ Special Hire Finance settings not configured');
          toast.warning('Special Hire Finance settings not configured. Go to Settings > Special Hire Finance.');
          arIntegrationSuccess = false;
        } else {
          console.log('[SPH Finance] Settings loaded:', {
            auto_post_advance: settings.auto_post_advance_payments,
            auto_post_balance: settings.auto_post_balance_payments,
            bank_account: settings.default_bank_account_id ? '✓' : '✗',
            advance_account: settings.customer_advance_account_id ? '✓' : '✗',
            receivable_account: settings.trade_receivable_account_id ? '✓' : '✗',
            revenue_account: settings.revenue_external_account_id ? '✓' : '✗',
          });

          // Determine payment type
          const paymentType = paymentData.payment_type || 'advance';
          const isAdvance = paymentType === 'advance';
          const isFullPayment = paymentType === 'full';
          const isBalance = paymentType === 'balance';

          console.log('[SPH Finance] Payment analysis:', {
            paymentType,
            isAdvance,
            isFullPayment,
            isBalance,
            amount: paymentData.amount,
            existingCustomerId: customerId,
            existingArInvoiceId: arInvoiceId,
          });

          // Step 2a: Create/Get Finance Customer
          if (!customerId) {
            console.log('[SPH Finance] Creating/getting customer...');
            customerId = await createOrGetSPHCustomer({
              customerName: paymentData.quotation.customer_name,
              customerPhone: paymentData.quotation.customer_phone,
              customerEmail: paymentData.quotation.customer_email,
              companyId: NCG_HOLDING_ID,
            });

            if (!customerId) {
              console.error('[SPH Finance] ❌ CRITICAL: Failed to create customer');
              toast.error('Failed to create customer record. AR Invoice not created.');
              arIntegrationSuccess = false;
            } else {
              console.log('[SPH Finance] ✅ Customer ID:', customerId);
              // Update quotation with customer ID
              const { error: custLinkError } = await supabase
                .from('special_hire_quotations')
                .update({ finance_customer_id: customerId })
                .eq('id', paymentData.quotation.id);
              
              if (custLinkError) {
                console.error('[SPH Finance] ⚠️ Failed to link customer to quotation:', custLinkError);
              }
            }
          }

          // Step 2b: Create AR Invoice if advance/full payment and customer exists
          if (customerId && (isAdvance || isFullPayment) && !arInvoiceId) {
            console.log('[SPH Finance] Creating AR Invoice...');
            
            // Calculate total amount
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
              advanceAmount: isFullPayment ? paymentData.amount : paymentData.amount, // For full payment, all is paid
              dueDate,
              companyId: NCG_HOLDING_ID,
            });

            if (!arResult) {
              console.error('[SPH Finance] ❌ Failed to create AR Invoice');
              toast.error('Failed to create AR Invoice. Check Finance Settings.');
              arIntegrationSuccess = false;
            } else {
              arInvoiceId = arResult.invoiceId;
              console.log('[SPH Finance] ✅ AR Invoice created:', arResult.invoiceNumber);
              toast.success(`AR Invoice created: ${arResult.invoiceNumber}`);
            }
          }

          // Step 2c: Post GL Entry
          if (isAdvance && settings.auto_post_advance_payments) {
            console.log('[SPH Finance] Posting advance payment to GL...');
            journalEntry = await postAdvancePaymentToGLStandalone({
              quotationNo: paymentData.quotation.quotation_no,
              customerName: paymentData.quotation.customer_name,
              amount: paymentData.amount,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });
            
            if (journalEntry) {
              console.log('[SPH Finance] ✅ Advance payment posted:', journalEntry.entry_number);
              toast.success(`GL Entry created: ${journalEntry.entry_number}`);
            } else {
              console.warn('[SPH Finance] ⚠️ GL posting returned null');
            }
          } else if (isFullPayment && settings.auto_post_advance_payments) {
            console.log('[SPH Finance] Posting full payment to GL...');
            journalEntry = await postFullPaymentToGLStandalone({
              quotationNo: paymentData.quotation.quotation_no,
              customerName: paymentData.quotation.customer_name,
              amount: paymentData.amount,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });
            
            if (journalEntry) {
              console.log('[SPH Finance] ✅ Full payment posted:', journalEntry.entry_number);
              toast.success(`GL Entry created: ${journalEntry.entry_number}`);
            }
          } else if (isBalance && settings.auto_post_balance_payments) {
            console.log('[SPH Finance] Posting balance payment to GL...');
            journalEntry = await postBalancePaymentToGLStandalone({
              quotationNo: paymentData.quotation.quotation_no,
              customerName: paymentData.quotation.customer_name,
              balanceAmount: paymentData.amount,
              settings,
              effectiveCompanyId: NCG_HOLDING_ID,
            });
            
            if (journalEntry) {
              console.log('[SPH Finance] ✅ Balance payment posted:', journalEntry.entry_number);
              toast.success(`GL Entry created: ${journalEntry.entry_number}`);
            }

            // Step 2d: Update AR Invoice and create Receipt for balance payment
            if (arInvoiceId && customerId) {
              console.log('[SPH Finance] Updating AR Invoice on balance payment...');
              const arUpdateResult = await updateSPHARInvoiceOnPayment({
                arInvoiceId,
                paymentAmount: paymentData.amount,
                paymentId,
                journalEntryId: journalEntry?.id,
              });

              if (arUpdateResult) {
                console.log('[SPH Finance] ✅ AR Invoice updated');
              }

              console.log('[SPH Finance] Creating AR Receipt...');
              const receiptResult = await createSPHARReceipt({
                customerId,
                arInvoiceId,
                paymentAmount: paymentData.amount,
                paymentMethod: paymentData.payment_method || 'cash',
                reference: paymentData.reference_no,
                paymentId,
                companyId: NCG_HOLDING_ID,
                journalEntryId: journalEntry?.id,
              });

              if (receiptResult) {
                console.log('[SPH Finance] ✅ AR Receipt created:', receiptResult.receiptNumber);
              }
            }
          }

          // Step 2e: Link journal entry and AR invoice to payment
          if (journalEntry || arInvoiceId) {
            const updateData: any = {};
            if (journalEntry) updateData.journal_entry_id = journalEntry.id;
            if (arInvoiceId) updateData.ar_invoice_id = arInvoiceId;
            
            const { error: linkError } = await supabase
              .from('special_hire_payments')
              .update(updateData)
              .eq('id', paymentId);
            
            if (linkError) {
              console.error('[SPH Finance] ⚠️ Failed to link journal/AR to payment:', linkError);
            } else {
              console.log('[SPH Finance] ✅ Journal/AR linked to payment');
            }
          }
        }
      } catch (glError: any) {
        console.error('[SPH Finance] ❌ AR/GL integration failed:', glError?.message || glError);
        toast.warning(`Payment approved but AR/GL integration failed: ${glError?.message || 'Unknown error'}`);
        arIntegrationSuccess = false;
      }

      console.log('[SPH Finance] AR Integration Success:', arIntegrationSuccess);

      // ========================
      // STEP 3: Parallel non-critical operations
      // ========================
      const parallelOperations = [];

      // Auto-add checked_by signature
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
                console.log('[SPH Finance] ✅ Checked By signature added');
              }
            }
          }
        } catch (sigError) {
          console.log('[SPH Finance] Auto-signature skipped:', sigError);
        }
      })());

      // Update related invoices
      parallelOperations.push(
        supabase
          .from('special_hire_invoices')
          .update({
            status: 'approved',
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          })
          .eq('quotation_id', paymentData.quotation.id)
          .then(({ error }) => {
            if (error) console.warn('[SPH Finance] Invoice update warning:', error);
          })
      );

      // Create notification
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
          .then(({ error }) => {
            if (error) console.warn('[SPH Finance] Notification warning:', error);
          })
      );

      // Wait for parallel operations (with timeout)
      await Promise.race([
        Promise.allSettled(parallelOperations),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);

      // ========================
      // STEP 4: Document regeneration (can be slow, handle separately)
      // ========================
      try {
        const { data: draftDocuments } = await supabase
          .from('document_storage')
          .select('*')
          .eq('payment_id', paymentId)
          .eq('document_status', 'draft');

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
            busType: 'Standard Bus',
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
          const arrayBuffer = await pdfBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          let base64String = '';
          const chunkSize = 1024;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            base64String += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64Data = btoa(base64String);

          await supabase
            .from('document_storage')
            .update({
              document_status: 'approved',
              document_data: base64Data,
              file_name: doc.file_name.replace('DRAFT-', 'APPROVED-'),
              file_size: uint8Array.length,
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
            })
            .eq('id', doc.id);
        }
        console.log('[SPH Finance] ✅ Documents regenerated');
      } catch (docError) {
        console.error('[SPH Finance] Document regeneration error:', docError);
        // Don't fail the approval for document issues
      }

      // Clean up payment proof
      if (paymentData.payment_proof_url && paymentData.payment_proof_url.startsWith('payment-proofs/')) {
        supabase.storage
          .from('payment-proofs')
          .remove([paymentData.payment_proof_url])
          .catch(err => console.log('Payment proof cleanup:', err));
      }

      console.log('[SPH Finance] ========== APPROVAL COMPLETE ==========');
      toast.success('Payment approved successfully!');
      return { success: true, arIntegrationSuccess };
    } catch (error) {
      console.error('[SPH Finance] ❌ APPROVAL FAILED:', error);
      toast.error('Failed to approve payment. Please try again.');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
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
        busType: 'Standard Bus',
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
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `APPROVED-${paymentData.quotation.quotation_no}-${paymentData.payment_type}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully!');
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
