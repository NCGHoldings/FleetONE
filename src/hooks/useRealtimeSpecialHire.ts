import { useState, useEffect, useRef, useCallback } from 'react';
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
  // Route details
  intermediate_stops?: string;
  hire_type?: string;
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

// Unique per browser tab — prevents duplicate WS subscriptions accumulating
// when the component remounts on page reload (old subscription not yet GC'd)
const SESSION_ID = crypto.randomUUID().slice(0, 8);

export function useRealtimeSpecialHire() {
  const [quotations, setQuotations] = useState<QuotationWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuotationsWithPayments = useCallback(async () => {
    try {
      console.log('Fetching quotations with payments and invoices...');
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Special hire data load timeout')), 5000)
      );

      const fetchPromise = (async () => {
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
        const quotationIds = quotationsData?.map(q => q.id) || [];
        
        if (quotationIds.length === 0) return [];

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

        const adjustmentMap: Record<string, any> = {};
        (adjustmentsData || []).forEach(adj => {
          adjustmentMap[adj.quotation_id] = adj;
        });

        return quotationsData?.map(quotation => {
          const quotationPayments = paymentsData?.filter(p => p.quotation_id === quotation.id) || [];
          const quotationInvoices = invoicesData?.filter(i => i.quotation_id === quotation.id) || [];
          const adjustment = adjustmentMap[quotation.id];

          const approvedPayments = quotationPayments.filter(p => p.status === 'approved');
          const calculatedTotalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          
          const baseTotal = (quotation.gross_revenue || 0) + 
                            (quotation.fuel_cost_fuel_only || 0) + 
                            (quotation.commission_pass_through_amount || 0) + 
                            (quotation.total_additional_charges || 0) - 
                            (quotation.discount_amount_lkr || 0);
          
          const adjustmentAmount = adjustment?.adjustment_amount || 0;
          const finalTotal = baseTotal + adjustmentAmount;
          const calculatedBalance = Math.max(finalTotal - calculatedTotalPaid, 0);

          return {
            ...quotation,
            bus_type: quotation.bus_types?.name || 'Unknown',
            additional_charges: typeof quotation.additional_charges === 'string' 
              ? quotation.additional_charges 
              : JSON.stringify(quotation.additional_charges || []),
            total_paid: calculatedTotalPaid,
            balance_due: calculatedBalance,
            advance_paid: Math.max(
              quotation.advance_paid || 0,
              approvedPayments.filter(p => p.payment_type === 'advance').reduce((sum, p) => sum + (p.amount || 0), 0)
            ),
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
      })();

      const enrichedQuotations = await Promise.race([fetchPromise, timeoutPromise]);
      console.log('Fetched quotations:', enrichedQuotations.length);
      setQuotations(enrichedQuotations);
      
      try {
        localStorage.setItem('cached_special_hire_quotations', JSON.stringify(enrichedQuotations));
      } catch (e) {
        console.warn('Failed to cache quotations (possibly quota exceeded):', e);
      }
    } catch (error: any) {
      console.warn('Network timeout or error during quotations fetch. Retaining cached data.', error);
      
      try {
        const cached = localStorage.getItem('cached_special_hire_quotations');
        if (cached) {
          setQuotations(JSON.parse(cached));
          toast.info('Viewing cached data (Offline mode)', { id: 'offline-toast' });
        } else {
          toast.error('Failed to load special hire data', { id: 'error-toast' });
        }
      } catch (e) {
        toast.error('Failed to load special hire data', { id: 'error-toast' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce realtime callbacks — rapid successive DB events (e.g. payment +
  // invoice created together) only trigger ONE full reload after 1.5s of quiet
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuotationsWithPayments(), 1500);
  }, [fetchQuotationsWithPayments]);

  useEffect(() => {
    fetchQuotationsWithPayments();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchQuotationsWithPayments]);

  useEffect(() => {
    console.log('Setting up real-time subscriptions...');

    // SESSION_ID suffix ensures each browser tab gets a unique channel name.
    // Generic names like 'quotations-changes' caused orphaned subscriptions to
    // stack up on every page reload — each one triggering a full 5-query refetch.
    const quotationsChannel = supabase
      .channel(`quotations-changes-${SESSION_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_quotations' },
        (payload) => { console.log('Quotation change:', payload.eventType); debouncedRefetch(); }
      ).subscribe();

    const paymentsChannel = supabase
      .channel(`payments-changes-${SESSION_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_payments' },
        (payload) => { console.log('Payment change:', payload.eventType); debouncedRefetch(); }
      ).subscribe();

    const invoicesChannel = supabase
      .channel(`invoices-changes-${SESSION_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_invoices' },
        (payload) => { console.log('Invoice change:', payload.eventType); debouncedRefetch(); }
      ).subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions...');
      supabase.removeChannel(quotationsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(invoicesChannel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [debouncedRefetch]);

  return { quotations, loading, refetch: fetchQuotationsWithPayments };
}