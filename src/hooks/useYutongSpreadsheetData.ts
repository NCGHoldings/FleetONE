import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SpreadsheetOrder {
  id: string;
  order_no: string;
  customer_name: string;
  company_name: string;
  bus_model: string;
  quantity: number;
  total_amount: number;
  status: string;
  current_phase: string;
  do_summary: string;
  cr_total: number;
  cheque_total: number;
  cash_total: number;
  total_paid: number;
  balance_due: number;
  payment_mode: string;
  progress_percentage: number;
  order_date: string;
  expected_delivery_date: string | null;
  notes: string | null;
}

export interface NewOrderData {
  customer_name: string;
  company_name: string;
  bus_model: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_mode: string;
  expected_delivery_date?: string;
  notes?: string;
}

export function useYutongSpreadsheetData() {
  const [orders, setOrders] = useState<SpreadsheetOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rawOrders, error: ordersError } = await supabase
        .from('yutong_orders')
        .select(`
          id, order_no, bus_model, quantity, total_amount, status, current_phase,
          total_paid, balance_due, payment_mode, progress_percentage, order_date,
          expected_delivery_date, notes,
          yutong_quotations(customer_name, company_name)
        `)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: deliveryOrders } = await supabase
        .from('yutong_delivery_orders')
        .select('order_id, do_no, status');

      const { data: cashReceipts } = await supabase
        .from('yutong_cash_receipts')
        .select('order_id, amount');

      const { data: payments } = await supabase
        .from('yutong_customer_payments')
        .select('order_id, payment_amount, payment_method, status')
        .in('status', ['received', 'verified']);

      const doMap = new Map<string, string>();
      (deliveryOrders || []).forEach((d: any) => {
        const existing = doMap.get(d.order_id) || '';
        doMap.set(d.order_id, existing ? `${existing}, ${d.do_no}` : (d.do_no || d.status));
      });

      const crMap = new Map<string, number>();
      (cashReceipts || []).forEach((cr: any) => {
        crMap.set(cr.order_id, (crMap.get(cr.order_id) || 0) + (cr.amount || 0));
      });

      const chequeMap = new Map<string, number>();
      const cashMap = new Map<string, number>();
      (payments || []).forEach((p: any) => {
        if (p.payment_method === 'cheque') {
          chequeMap.set(p.order_id, (chequeMap.get(p.order_id) || 0) + (p.payment_amount || 0));
        } else if (p.payment_method === 'cash') {
          cashMap.set(p.order_id, (cashMap.get(p.order_id) || 0) + (p.payment_amount || 0));
        }
      });

      const mapped: SpreadsheetOrder[] = (rawOrders || []).map((o: any) => ({
        id: o.id,
        order_no: o.order_no || '',
        customer_name: o.yutong_quotations?.customer_name || '',
        company_name: o.yutong_quotations?.company_name || '',
        bus_model: o.bus_model || '',
        quantity: o.quantity || 0,
        total_amount: o.total_amount || 0,
        status: o.status || '',
        current_phase: o.current_phase || '',
        do_summary: doMap.get(o.id) || '-',
        cr_total: crMap.get(o.id) || 0,
        cheque_total: chequeMap.get(o.id) || 0,
        cash_total: cashMap.get(o.id) || 0,
        total_paid: o.total_paid || 0,
        balance_due: o.balance_due || 0,
        payment_mode: o.payment_mode || '',
        progress_percentage: o.progress_percentage || 0,
        order_date: o.order_date || '',
        expected_delivery_date: o.expected_delivery_date,
        notes: o.notes,
      }));

      setOrders(mapped);
    } catch (err: any) {
      console.error('Error fetching spreadsheet data:', err);
      toast({ title: 'Error', description: 'Failed to load spreadsheet data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateOrderField = useCallback(async (orderId: string, field: string, value: any) => {
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [field]: value } : o));

      const { error } = await supabase
        .from('yutong_orders')
        .update({ [field]: value })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating order:', err);
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
      fetchData();
    }
  }, [toast, fetchData]);

  const addOrder = useCallback(async (data: NewOrderData) => {
    try {
      const orderNo = `YTO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { error } = await supabase
        .from('yutong_orders')
        .insert({
          order_no: orderNo,
          bus_model: data.bus_model,
          quantity: data.quantity,
          unit_price: data.unit_price,
          total_amount: data.total_amount,
          balance_due: data.total_amount,
          payment_mode: data.payment_mode as any,
          expected_delivery_date: data.expected_delivery_date || null,
          notes: data.notes || null,
          status: 'pending',
          order_date: new Date().toISOString().slice(0, 10),
        });

      if (error) throw error;
      toast({ title: 'Order Added', description: 'New order row created successfully' });
      await fetchData();
    } catch (err: any) {
      console.error('Error adding order:', err);
      toast({ title: 'Add Failed', description: err.message, variant: 'destructive' });
    }
  }, [toast, fetchData]);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('yutong_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      toast({ title: 'Order Deleted', description: 'Order removed successfully' });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      console.error('Error deleting order:', err);
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('yutong-orders-spreadsheet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yutong_orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  return { orders, loading, refetch: fetchData, updateOrderField, addOrder, deleteOrder };
}
