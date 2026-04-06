import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuotationWithPayments {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  company_name?: string;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime?: string;
  number_of_buses: number;
  number_of_passengers: number;
  bus_type: string;
  gross_revenue: number;
  fuel_cost_fuel_only?: number;
  commission_pass_through_amount?: number;
  discount_amount_lkr?: number;
  // Time-based charges
  fixed_rate?: number;
  overtime_charge?: number;
  overnight_charge?: number;
  exceeding_distance_charge?: number;
  additional_charges?: Array<{ type: string; amount: number; reason?: string }> | string;
  total_additional_charges?: number;
  status: string;
  trip_status?: string;
  status_changed_at?: string;
  status_changed_by?: string;
  refund_status?: string;
  refund_amount?: number;
  refund_reason?: string;
  status_change_reason?: string;
  advance_paid: number;
  balance_due: number;
  total_paid: number;
  assigned_driver_name?: string;
  assigned_conductor_name?: string;
  assigned_bus_no?: string;
  created_at: string;
  // Post-trip adjustment fields
  adjustment_amount?: number;
  has_finalized_adjustment?: boolean;
  // Finance integration fields
  ar_invoice_id?: string;
  finance_customer_id?: string;
  payments: Array<{
    id: string;
    payment_type: string;
    amount: number;
    payment_method: string;
    reference_no?: string;
    payment_proof_url?: string;
    notes?: string;
    status: string;
    finance_approved_by?: string;
    finance_approved_at?: string;
    paid_at: string;
    created_by?: string;
    created_at: string;
    quotation_id: string;
    ar_invoice_id?: string;
    ar_receipt_id?: string;
    journal_entry_id?: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_type: string;
    invoice_no: string;
    amount: number;
    status?: string;
    approved_by?: string;
    approved_at?: string;
    generated_by?: string;
    generated_at?: string;
    created_at: string;
    quotation_id: string;
  }>;
}

export function useRealtimeSpecialHire() {
  const [quotations, setQuotations] = useState<QuotationWithPayments[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotationsWithPayments = async () => {
    try {
      console.log('Fetching quotations with payments and invoices...');
      
      // Fetch confirmed quotations using cursor-based pagination to bypass offset limits
      const batchSize = 1000;
      let allQuotationsData: any[] = [];
      let lastCreatedAt: string | null = null;
      let lastId: string | null = null;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('special_hire_quotations')
          .select(`
            *,
            bus_types!bus_type_id (
              name,
              capacity
            )
          `)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(batchSize);

        if (lastCreatedAt && lastId) {
          query = query.or(`created_at.lt.${lastCreatedAt},and(created_at.eq.${lastCreatedAt},id.lt.${lastId})`);
        }

        const { data, error: batchError } = await query;
        if (batchError) throw batchError;
        const batch = data || [];
        allQuotationsData = allQuotationsData.concat(batch);
        hasMore = batch.length === batchSize;

        if (batch.length > 0) {
          const lastItem = batch[batch.length - 1];
          lastCreatedAt = lastItem.created_at;
          lastId = lastItem.id;
        }
      }

      const quotationsData = allQuotationsData;

      // Fetch all payments for these quotations
      const quotationIds = quotationsData?.map(q => q.id) || [];
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('special_hire_payments')
        .select(`
          id,
          payment_type,
          amount,
          payment_method,
          reference_no,
          payment_proof_url,
          notes,
          status,
          finance_approved_by,
          finance_approved_at,
          paid_at,
          created_by,
          created_at,
          quotation_id
        `)
        .in('quotation_id', quotationIds);

      if (paymentsError) throw paymentsError;

      // Fetch all invoices for these quotations
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('special_hire_invoices')
        .select(`
          id,
          invoice_type,
          invoice_no,
          amount,
          status,
          approved_by,
          approved_at,
          generated_by,
          generated_at,
          created_at,
          quotation_id
        `)
        .in('quotation_id', quotationIds);

      if (invoicesError) throw invoicesError;

      // Fetch all finalized post-trip adjustments for these quotations
      const { data: adjustmentsData, error: adjustmentsError } = await supabase
        .from('special_hire_trip_adjustments')
        .select(`
          quotation_id,
          adjustment_amount,
          extra_km_total_charge,
          total_additional_expenses,
          total_time_adjustment,
          adjustment_status,
          final_trip_amount,
          balance_due
        `)
        .in('quotation_id', quotationIds)
        .eq('adjustment_status', 'finalized');

      if (adjustmentsError) {
        console.warn('Error fetching adjustments (non-blocking):', adjustmentsError);
      }

      // Build adjustment lookup map (latest finalized adjustment per quotation)
      const adjustmentMap: Record<string, any> = {};
      (adjustmentsData || []).forEach(adj => {
        adjustmentMap[adj.quotation_id] = adj;
      });

      // Combine the data
      const enrichedQuotations: QuotationWithPayments[] = quotationsData?.map(quotation => {
        const quotationPayments = paymentsData?.filter(p => p.quotation_id === quotation.id) || [];
        const quotationInvoices = invoicesData?.filter(i => i.quotation_id === quotation.id) || [];
        const adjustment = adjustmentMap[quotation.id];

        // Calculate total amounts from actual database records
        const approvedPayments = quotationPayments.filter(p => p.status === 'approved');
        const calculatedTotalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Base quotation total (without adjustments)
        const baseTotal = (quotation.gross_revenue || 0) + 
                          (quotation.fuel_cost_fuel_only || 0) + 
                          (quotation.commission_pass_through_amount || 0) + 
                          (quotation.total_additional_charges || 0) - 
                          (quotation.discount_amount_lkr || 0);
        
        // Add post-trip adjustment amounts if finalized
        const adjustmentAmount = adjustment?.adjustment_amount || 0;
        const finalTotal = baseTotal + adjustmentAmount;
        
        const calculatedBalance = Math.max(finalTotal - calculatedTotalPaid, 0);

        return {
          ...quotation,
          bus_type: quotation.bus_types?.name || 'Unknown',
          // Transform additional_charges to match interface
          additional_charges: typeof quotation.additional_charges === 'string' 
            ? quotation.additional_charges 
            : JSON.stringify(quotation.additional_charges || []),
          // Use calculated values that include adjustments
          total_paid: calculatedTotalPaid,
          balance_due: calculatedBalance,
          advance_paid: Math.max(
            quotation.advance_paid || 0,
            approvedPayments.filter(p => p.payment_type === 'advance').reduce((sum, p) => sum + (p.amount || 0), 0)
          ),
          // Include adjustment data for the Financial column
          adjustment_amount: adjustmentAmount,
          has_finalized_adjustment: !!adjustment,
          payments: quotationPayments.map(p => ({
            id: p.id,
            payment_type: p.payment_type,
            amount: p.amount,
            payment_method: p.payment_method,
            reference_no: p.reference_no,
            payment_proof_url: p.payment_proof_url,
            notes: p.notes,
            status: p.status || 'pending_operations',
            finance_approved_by: p.finance_approved_by,
            finance_approved_at: p.finance_approved_at,
            paid_at: p.paid_at,
            created_by: p.created_by,
            created_at: p.created_at,
            quotation_id: p.quotation_id
          })),
          invoices: quotationInvoices.map(i => ({
            id: i.id,
            invoice_type: i.invoice_type,
            invoice_no: i.invoice_no,
            amount: i.amount,
            status: i.status,
            approved_by: i.approved_by,
            approved_at: i.approved_at,
            generated_by: i.generated_by,
            generated_at: i.generated_at,
            created_at: i.created_at,
            quotation_id: i.quotation_id
          }))
        };
      }) || [];

      console.log('Fetched quotations:', enrichedQuotations.length);
      setQuotations(enrichedQuotations);
    } catch (error: any) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to load special hire data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationsWithPayments();
  }, []);

  useEffect(() => {
    console.log('Setting up real-time subscriptions...');
    
    // Subscribe to quotations changes
    const quotationsChannel = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_hire_quotations'
        },
        (payload) => {
          console.log('Quotation change detected:', payload);
          fetchQuotationsWithPayments();
        }
      )
      .subscribe();

    // Subscribe to payments changes
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_hire_payments'
        },
        (payload) => {
          console.log('Payment change detected:', payload);
          fetchQuotationsWithPayments();
        }
      )
      .subscribe();

    // Subscribe to invoices changes
    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_hire_invoices'
        },
        (payload) => {
          console.log('Invoice change detected:', payload);
          fetchQuotationsWithPayments();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions...');
      supabase.removeChannel(quotationsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, []);

  return {
    quotations,
    loading,
    refetch: fetchQuotationsWithPayments
  };
}