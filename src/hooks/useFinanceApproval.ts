import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice-generator';

export const useFinanceApproval = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const approvePayment = async (paymentId: string, notes?: string) => {
    try {
      setIsLoading(true);

      // Update payment status to approved
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

      if (paymentError) throw paymentError;

      // Update all related invoices to approved status
      const { error: invoiceUpdateError } = await supabase
        .from('special_hire_invoices')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('quotation_id', paymentData.quotation.id);

      if (invoiceUpdateError) throw invoiceUpdateError;

      // Create approval notification
      const { error: notificationError } = await supabase
        .from('payment_notifications')
        .insert({
          payment_id: paymentId,
          quotation_id: paymentData.quotation.id,
          notification_type: 'payment_approved',
          target_role: 'admin',
          message: `Payment of LKR ${paymentData.amount.toLocaleString()} for quotation ${paymentData.quotation.quotation_no} has been approved by finance.`,
          created_by: user?.id,
        });

      if (notificationError) throw notificationError;

      // Approve all draft documents for this payment
      const { data: draftDocuments, error: docsError } = await supabase
        .from('document_storage')
        .select('*')
        .eq('payment_id', paymentId)
        .eq('document_status', 'draft');

      if (docsError) throw docsError;

      // Compute total approved payments for this quotation to show accurate Balance Due
      const { data: approvedPaymentsList, error: approvedPaymentsError } = await supabase
        .from('special_hire_payments')
        .select('amount')
        .eq('quotation_id', paymentData.quotation.id)
        .eq('status', 'approved');
      if (approvedPaymentsError) throw approvedPaymentsError;
      const totalApprovedPaid = (approvedPaymentsList || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Update draft documents to approved status
      for (const doc of draftDocuments || []) {
        // Generate final approved document without DRAFT watermark
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
        };

        // Generate approved PDF
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

        // Update document status and data
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

      // Auto-delete payment proof file after approval
      if (paymentData.payment_proof_url && paymentData.payment_proof_url.startsWith('payment-proofs/')) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('payment-proofs')
            .remove([paymentData.payment_proof_url]);
          if (deleteError) console.error('Failed to delete payment proof:', deleteError);
        } catch (error) {
          console.error('Error deleting payment proof:', error);
        }
      }

      toast.success('Payment approved successfully! Documents are now available for viewing and download.');
      return { success: true };
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment. Please try again.');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const rejectPayment = async (paymentId: string, reason: string) => {
    try {
      setIsLoading(true);

      // Update payment status to rejected
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
      const { error: notificationError } = await supabase
        .from('payment_notifications')
        .insert({
          payment_id: paymentId,
          quotation_id: paymentData.quotation.id,
          notification_type: 'payment_rejected',
          target_role: 'admin',
          message: `Payment of LKR ${paymentData.amount.toLocaleString()} for quotation ${paymentData.quotation.quotation_no} has been rejected by finance. Reason: ${reason}`,
          created_by: user?.id,
        });

      if (notificationError) throw notificationError;

      toast.success('Payment rejected successfully.');
      return { success: true };
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment. Please try again.');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    approvePayment,
    rejectPayment,
    isLoading,
    generateApprovedInvoice: async (quotation: any, paymentType: 'advance' | 'balance') => {
      try {
        const invoiceData: InvoiceData = {
          invoiceNo: `REGEN-${paymentType.toUpperCase()}-${Date.now()}`,
          invoiceType: paymentType,
          quotationNo: quotation.quotation_no,
          customerName: quotation.customer_name,
          customerPhone: quotation.customer_phone || '',
          customerEmail: quotation.customer_email,
          companyName: quotation.company_name,
          pickupLocation: quotation.pickup_location,
          dropLocation: quotation.drop_location,
          pickupDate: new Date(quotation.pickup_datetime),
          dropDate: new Date(quotation.drop_datetime || quotation.pickup_datetime),
          busType: 'Standard Bus',
          numberOfBuses: quotation.number_of_buses,
          numberOfPassengers: quotation.number_of_passengers,
          totalAmount: quotation.gross_revenue + 
                       (quotation.fuel_cost_fuel_only || 0) + 
                       (quotation.commission_pass_through_amount || 0) +
                       (quotation.total_additional_charges || 0) - 
                       (quotation.discount_amount_lkr || 0),
          advanceAmount: quotation.advance_paid || 0,
          paidAmount: paymentType === 'advance' ? (quotation.advance_paid || 0) : (quotation.total_paid || 0),
          vehicleNo: quotation.assigned_bus_no,
          driverName: quotation.assigned_driver_name,
          conductorName: quotation.assigned_conductor_name,
          invoice_status: 'approved',
          document_type: paymentType === 'advance' ? 'sales_receipt' : 'invoice',
        };

        const pdfBlob = await generateInvoicePDF(invoiceData);
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `REGENERATED-${paymentType}-${invoiceData.quotationNo}-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`${paymentType === 'advance' ? 'Sales Receipt' : 'Invoice'} regenerated successfully!`);
        return { success: true };
      } catch (error) {
        console.error('Error regenerating document:', error);
        toast.error(`Failed to regenerate ${paymentType === 'advance' ? 'sales receipt' : 'invoice'}`);
        return { success: false, error };
      }
    }
  };
};