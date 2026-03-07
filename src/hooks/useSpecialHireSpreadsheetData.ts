import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SpreadsheetHire {
  id: string;
  row_num: number;
  // Hire Info
  quotation_no: string;
  status: string;
  trip_status: string;
  company_name: string;
  customer_name: string;
  customer_phone: string;
  route: string;
  bus_type_name: string;
  number_of_buses: number;
  km_trip: number;
  gross_revenue: number;
  total_paid: number;
  pickup_datetime: string;
  special_request: string;
  number_of_days: number;
  // Operations
  buses_deployed: number;
  assigned_bus_no: string;
  assigned_driver_name: string;
  assigned_conductor_name: string;
  pickup_location: string;
  drop_location: string;
  pickup_time: string;
  drop_time: string;
  operation_remark: string;
  // Invoice
  invoice_number: string;
  invoiced_km: number;
  invoice_amount: number;
  discount: number;
  price_after_discount: number;
  // Meter/KM
  check_in_meter: number;
  check_out_meter: number;
  actual_km: number;
  additional_distance_charge: number;
  additional_hours_charge: number;
  // Expenses (stored in other_expenses JSONB)
  fuel_cost_actual: number;
  driver_wages: number;
  assistant_wages: number;
  driver_meal_allowance: number;
  assistant_meal_allowance: number;
  wages_total: number;
  maintenance: number;
  other_permits_highway: number;
  // Summary
  net_income: number;
  per_day_total_buses: number;
  advance_payment: number;
  advance_payment_date: string;
  balance_payment: number;
  balance_payment_date: string;
  remark: string;
}

const getExpenseField = (other_expenses: any, field: string): number => {
  if (!other_expenses || typeof other_expenses !== 'object') return 0;
  return Number(other_expenses[field]) || 0;
};

const calculateDays = (pickup: string, drop: string): number => {
  if (!pickup || !drop) return 1;
  const diff = new Date(drop).getTime() - new Date(pickup).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export function useSpecialHireSpreadsheetData() {
  const [hires, setHires] = useState<SpreadsheetHire[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: quotations, error } = await supabase
        .from('special_hire_quotations')
        .select(`
          id, quotation_no, status, trip_status, company_name, customer_name, customer_phone,
          pickup_location, drop_location, pickup_datetime, drop_datetime,
          number_of_buses, km_trip, gross_revenue, total_paid, advance_paid, balance_due,
          special_request, assigned_bus_no, assigned_driver_name, assigned_conductor_name,
          other_expenses, discount_amount_lkr, bus_type_id, exceeding_distance_charge,
          overtime_charge, overnight_charge,
          bus_types:bus_type_id(name)
        `)
        .eq('is_active_version', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch payments
      const quotationIds = (quotations || []).map(q => q.id);
      
      let paymentsMap = new Map<string, { advance: number; advanceDate: string; balance: number; balanceDate: string }>();
      if (quotationIds.length > 0) {
        const { data: payments } = await supabase
          .from('special_hire_payments')
          .select('quotation_id, amount, payment_type, payment_date, status')
          .in('quotation_id', quotationIds)
          .eq('status', 'approved');

        (payments || []).forEach((p: any) => {
          const existing = paymentsMap.get(p.quotation_id) || { advance: 0, advanceDate: '', balance: 0, balanceDate: '' };
          if (p.payment_type === 'advance') {
            existing.advance += p.amount || 0;
            if (!existing.advanceDate || p.payment_date > existing.advanceDate) existing.advanceDate = p.payment_date;
          } else {
            existing.balance += p.amount || 0;
            if (!existing.balanceDate || p.payment_date > existing.balanceDate) existing.balanceDate = p.payment_date;
          }
          paymentsMap.set(p.quotation_id, existing);
        });
      }

      // Fetch invoices
      let invoiceMap = new Map<string, { number: string; amount: number }>();
      if (quotationIds.length > 0) {
        const { data: invoices } = await supabase
          .from('special_hire_invoices')
          .select('quotation_id, invoice_number, total_amount')
          .in('quotation_id', quotationIds);

        (invoices || []).forEach((inv: any) => {
          invoiceMap.set(inv.quotation_id, { number: inv.invoice_number || '', amount: inv.total_amount || 0 });
        });
      }

      // Fetch trip adjustments
      let adjustmentMap = new Map<string, any>();
      if (quotationIds.length > 0) {
        const { data: adjustments } = await supabase
          .from('special_hire_trip_adjustments')
          .select('quotation_id, actual_km, check_in_meter, check_out_meter, additional_distance_charge, additional_hours_charge')
          .in('quotation_id', quotationIds);

        (adjustments || []).forEach((adj: any) => {
          adjustmentMap.set(adj.quotation_id, adj);
        });
      }

      const mapped: SpreadsheetHire[] = (quotations || []).map((q: any, idx: number) => {
        const expenses = q.other_expenses || {};
        const payment = paymentsMap.get(q.id) || { advance: 0, advanceDate: '', balance: 0, balanceDate: '' };
        const invoice = invoiceMap.get(q.id) || { number: '', amount: 0 };
        const adj = adjustmentMap.get(q.id) || {};
        const busType = q.bus_types as any;
        const days = calculateDays(q.pickup_datetime, q.drop_datetime);

        const fuelActual = getExpenseField(expenses, 'fuel_cost_actual');
        const driverWages = getExpenseField(expenses, 'driver_wages');
        const assistantWages = getExpenseField(expenses, 'assistant_wages');
        const driverMeal = getExpenseField(expenses, 'driver_meal_allowance');
        const assistantMeal = getExpenseField(expenses, 'assistant_meal_allowance');
        const wagesTotal = getExpenseField(expenses, 'wages_total');
        const maint = getExpenseField(expenses, 'maintenance');
        const otherPermits = getExpenseField(expenses, 'other_permits_highway');
        const totalExpenses = fuelActual + driverWages + assistantWages + driverMeal + assistantMeal + wagesTotal + maint + otherPermits;
        
        const invoiceAmt = invoice.amount || (q.gross_revenue || 0);
        const discount = q.discount_amount_lkr || 0;

        return {
          id: q.id,
          row_num: idx + 1,
          quotation_no: q.quotation_no || '',
          status: q.status || 'pending',
          trip_status: q.trip_status || '',
          company_name: q.company_name || '',
          customer_name: q.customer_name || '',
          customer_phone: q.customer_phone || '',
          route: `${q.pickup_location || ''} → ${q.drop_location || ''}`,
          bus_type_name: busType?.name || '',
          number_of_buses: q.number_of_buses || 1,
          km_trip: q.km_trip || 0,
          gross_revenue: q.gross_revenue || 0,
          total_paid: q.total_paid || 0,
          pickup_datetime: q.pickup_datetime || '',
          special_request: q.special_request || '',
          number_of_days: days,
          buses_deployed: getExpenseField(expenses, 'buses_deployed') || q.number_of_buses || 1,
          assigned_bus_no: q.assigned_bus_no || '',
          assigned_driver_name: q.assigned_driver_name || '',
          assigned_conductor_name: q.assigned_conductor_name || '',
          pickup_location: q.pickup_location || '',
          drop_location: q.drop_location || '',
          pickup_time: q.pickup_datetime ? new Date(q.pickup_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          drop_time: q.drop_datetime ? new Date(q.drop_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          operation_remark: (expenses as any)?.operation_remark || '',
          invoice_number: invoice.number,
          invoiced_km: adj.actual_km || q.km_trip || 0,
          invoice_amount: invoiceAmt,
          discount: discount,
          price_after_discount: invoiceAmt - discount,
          check_in_meter: adj.check_in_meter || 0,
          check_out_meter: adj.check_out_meter || 0,
          actual_km: adj.actual_km || 0,
          additional_distance_charge: adj.additional_distance_charge || q.exceeding_distance_charge || 0,
          additional_hours_charge: adj.additional_hours_charge || q.overtime_charge || 0,
          fuel_cost_actual: fuelActual,
          driver_wages: driverWages,
          assistant_wages: assistantWages,
          driver_meal_allowance: driverMeal,
          assistant_meal_allowance: assistantMeal,
          wages_total: wagesTotal,
          maintenance: maint,
          other_permits_highway: otherPermits,
          net_income: invoiceAmt - discount - totalExpenses,
          per_day_total_buses: Math.ceil((q.number_of_buses || 1) / Math.max(1, days)),
          advance_payment: payment.advance,
          advance_payment_date: payment.advanceDate,
          balance_payment: payment.balance,
          balance_payment_date: payment.balanceDate,
          remark: (expenses as any)?.remark || '',
        };
      });

      setHires(mapped);
    } catch (err: any) {
      console.error('Error fetching special hire spreadsheet data:', err);
      toast({ title: 'Error', description: 'Failed to load spreadsheet data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateField = useCallback(async (hireId: string, field: string, value: any) => {
    try {
      // Optimistic update
      setHires(prev => prev.map(h => h.id === hireId ? { ...h, [field]: value } : h));

      // Determine which table/column to update
      const expenseFields = [
        'fuel_cost_actual', 'driver_wages', 'assistant_wages', 'driver_meal_allowance',
        'assistant_meal_allowance', 'wages_total', 'maintenance', 'other_permits_highway',
        'buses_deployed', 'operation_remark', 'remark'
      ];

      const quotationDirectFields = [
        'assigned_bus_no', 'assigned_driver_name', 'assigned_conductor_name',
        'special_request', 'company_name', 'customer_name', 'customer_phone',
        'status', 'trip_status', 'km_trip', 'pickup_location', 'drop_location',
        'discount_amount_lkr'
      ];

      const meterFields = ['check_in_meter', 'check_out_meter', 'actual_km', 'additional_distance_charge', 'additional_hours_charge'];
      const invoiceFields = ['invoice_number', 'invoice_amount', 'invoiced_km'];

      if (expenseFields.includes(field)) {
        // Update via other_expenses JSONB
        const { data: current } = await supabase
          .from('special_hire_quotations')
          .select('other_expenses')
          .eq('id', hireId)
          .single();

        const currentExpenses = (current?.other_expenses as any) || {};
        const updated = { ...currentExpenses, [field]: value };

        const { error } = await supabase
          .from('special_hire_quotations')
          .update({ other_expenses: updated })
          .eq('id', hireId);

        if (error) throw error;
      } else if (quotationDirectFields.includes(field)) {
        const dbField = field === 'discount' ? 'discount_amount_lkr' : field;
        const { error } = await supabase
          .from('special_hire_quotations')
          .update({ [dbField]: value })
          .eq('id', hireId);

        if (error) throw error;
      } else if (meterFields.includes(field)) {
        // Upsert into special_hire_trip_adjustments
        const { data: existing } = await supabase
          .from('special_hire_trip_adjustments')
          .select('id')
          .eq('quotation_id', hireId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('special_hire_trip_adjustments')
            .update({ [field]: value })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('special_hire_trip_adjustments')
            .insert({ quotation_id: hireId, [field]: value });
          if (error) throw error;
        }
      } else if (invoiceFields.includes(field)) {
        // Upsert into special_hire_invoices
        const dbField = field === 'invoice_amount' ? 'amount' : field === 'invoice_number' ? 'invoice_no' : field;
        const { data: existing } = await supabase
          .from('special_hire_invoices')
          .select('id')
          .eq('quotation_id', hireId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('special_hire_invoices')
            .update({ [dbField]: value })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const insertData: any = { 
            quotation_id: hireId, 
            invoice_type: 'standard',
            invoice_no: field === 'invoice_number' ? String(value) : `INV-${Date.now()}`,
            amount: field === 'invoice_amount' ? Number(value) : 0,
          };
          if (field === 'invoice_number') insertData.invoice_no = String(value);
          if (field === 'invoiced_km') insertData.amount = 0; // placeholder
          const { error } = await supabase
            .from('special_hire_invoices')
            .insert(insertData);
          if (error) throw error;
        }
      }
    } catch (err: any) {
      console.error('Error updating field:', err);
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
      fetchData();
    }
  }, [toast, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('special-hire-spreadsheet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_quotations' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  return { hires, loading, refetch: fetchData, updateField };
}
