import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  fetchVehicleFinanceSettings,
  createVehicleCustomer,
  postVehiclePaymentToGL,
  updateOrderFinanceLinks,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';
import { useYutongCashReceipts } from '@/hooks/useYutongCashReceipts';

export interface PaymentRecord {
  id: string;
  payment_amount: number;
  payment_method: string;
  payment_date: string;
  payment_reference: string | null;
  status: string;
  notes: string | null;
}

export interface DORecord {
  id: string;
  do_no: string;
  status: string;
  do_amount: number;
  vehicle_count: number;
  issuing_bank: string;
}

export interface CRRecord {
  id: string;
  receipt_no: string;
  amount: number;
  status: string;
  receipt_date: string;
  payment_id: string;
}

export function useSpreadsheetQuickActions(refetch: () => void) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createCashReceipt } = useYutongCashReceipts();

  // Fetch payments for an order
  const fetchPayments = useCallback(async (orderId: string): Promise<PaymentRecord[]> => {
    const { data, error } = await supabase
      .from('yutong_customer_payments')
      .select('id, payment_amount, payment_method, payment_date, payment_reference, status, notes')
      .eq('order_id', orderId)
      .order('payment_date', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as PaymentRecord[];
  }, []);

  // Fetch DOs for an order
  const fetchDOs = useCallback(async (orderId: string): Promise<DORecord[]> => {
    const { data, error } = await supabase
      .from('yutong_delivery_orders')
      .select('id, do_no, status, do_amount, vehicle_count, issuing_bank')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as DORecord[];
  }, []);

  // Fetch cash receipts for an order
  const fetchCRs = useCallback(async (orderId: string): Promise<CRRecord[]> => {
    const { data, error } = await supabase
      .from('yutong_cash_receipts')
      .select('id, receipt_no, amount, status, receipt_date, payment_id')
      .eq('order_id', orderId)
      .order('receipt_date', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as CRRecord[];
  }, []);

  // Record a new payment
  const recordPayment = useCallback(async (
    orderId: string,
    amount: number,
    method: string,
    date: string,
    reference?: string,
    notes?: string,
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Auth required', variant: 'destructive' }); return false; }

      const { error } = await supabase
        .from('yutong_customer_payments')
        .insert({
          order_id: orderId,
          payment_amount: amount,
          payment_date: date,
          payment_method: method,
          payment_reference: reference || null,
          notes: notes || null,
          status: 'pending',
          created_by: user.id,
        });

      if (error) throw error;
      toast({ title: 'Payment Recorded', description: 'Payment is pending verification' });
      refetch();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, refetch]);

  // Verify payment → GL posting + cash receipt
  const verifyPayment = useCallback(async (paymentId: string, orderId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Auth required', variant: 'destructive' }); return false; }

      // Get payment details
      const { data: payment } = await supabase
        .from('yutong_customer_payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      if (!payment) throw new Error('Payment not found');

      // Get order details
      const { data: order } = await supabase
        .from('yutong_orders')
        .select('*, yutong_quotations(customer_name, quotation_no)')
        .eq('id', orderId)
        .single();
      if (!order) throw new Error('Order not found');

      // Fetch finance settings
      const settings = await fetchVehicleFinanceSettings('yutong', NCG_HOLDING_ID);
      if (!settings) {
        toast({ title: 'Finance settings not configured', variant: 'destructive' });
        return false;
      }

      if (!settings.default_bank_account_id || !settings.customer_advance_account_id) {
        toast({ title: 'Missing GL accounts', description: 'Configure Bank & Advance accounts in Finance Settings', variant: 'destructive' });
        return false;
      }

      const customerName = order.yutong_quotations?.customer_name || 'Unknown';
      const orderNo = order.order_no;

      // Auto-create customer if needed
      let customerId = order.finance_customer_id;
      if (!customerId && settings.auto_create_customer) {
        customerId = await createVehicleCustomer({ module: 'yutong', customerName, companyId: NCG_HOLDING_ID });
        if (customerId) {
          await updateOrderFinanceLinks({ module: 'yutong', orderId, financeCustomerId: customerId });
        }
      }

      // Post GL entry
      let journalEntryId: string | undefined;
      if (settings.auto_post_on_verify) {
        const glResult = await postVehiclePaymentToGL({
          module: 'yutong',
          orderNo,
          customerName,
          amount: payment.payment_amount,
          paymentType: 'advance',
          paymentMethod: payment.payment_method,
          settings,
          effectiveCompanyId: NCG_HOLDING_ID,
        });
        if (glResult) {
          journalEntryId = glResult.journalEntryId;
        } else {
          toast({ title: 'GL posting failed', variant: 'destructive' });
          return false;
        }
      }

      // Update payment status
      await supabase
        .from('yutong_customer_payments')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          journal_entry_id: journalEntryId,
        })
        .eq('id', paymentId);

      // Auto-create cash receipt
      await createCashReceipt(paymentId, orderId, payment.payment_amount, payment.payment_method, payment.payment_date);

      toast({ title: 'Payment Verified', description: 'GL posted & cash receipt generated' });
      refetch();
      return true;
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, refetch, createCashReceipt]);

  // Create delivery order
  const createDO = useCallback(async (
    orderId: string,
    doData: { issuing_bank: string; do_amount: number; vehicle_count: number; notes?: string }
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('yutong_delivery_orders')
        .insert({
          order_id: orderId,
          issuing_bank: doData.issuing_bank,
          do_amount: doData.do_amount,
          vehicle_count: doData.vehicle_count,
          notes: doData.notes || null,
          currency: 'USD',
          chassis_numbers: [],
          engine_numbers: [],
          created_by: user?.id,
        } as any);

      if (error) throw error;
      toast({ title: 'DO Created', description: 'Delivery Order created successfully' });
      refetch();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, refetch]);

  // Update DO status
  const updateDOStatus = useCallback(async (doId: string, status: string) => {
    setLoading(true);
    try {
      const updates: any = { status };
      if (status === 'released') updates.release_date = new Date().toISOString().slice(0, 10);
      if (status === 'collected') updates.collection_date = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from('yutong_delivery_orders')
        .update(updates)
        .eq('id', doId);

      if (error) throw error;
      toast({ title: 'DO Updated', description: `Status changed to ${status}` });
      refetch();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, refetch]);

  return {
    loading,
    fetchPayments,
    fetchDOs,
    fetchCRs,
    recordPayment,
    verifyPayment,
    createDO,
    updateDOStatus,
  };
}
