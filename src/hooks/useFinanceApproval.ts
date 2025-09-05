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

      // Generate final approved documents
      const calculateTotalAmount = (quotation: any) => {
        return quotation.gross_revenue + 
               (quotation.fuel_cost_fuel_only || 0) + 
               (quotation.commission_pass_through_amount || 0) - 
               (quotation.discount_amount_lkr || 0);
      };

      const invoiceData: InvoiceData = {
        invoiceNo: `APPROVED-${paymentData.id}`,
        invoiceType: paymentData.payment_type === 'advance' ? 'advance' : 'final',
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
        // Remove DRAFT status
        invoice_status: 'approved',
        document_type: paymentData.payment_type === 'advance' ? 'sales_receipt' : 'invoice',
      };

      // Auto-generate and download approved PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `APPROVED-${invoiceData.invoiceType}-${invoiceData.quotationNo}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Payment approved successfully! Final invoice generated.');
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
  };
};