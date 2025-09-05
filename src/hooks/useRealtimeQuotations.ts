import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface QuotationWithPayments {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  company_name?: string;
  status: string;
  hire_type: string;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime: string;
  number_of_passengers: number;
  number_of_buses: number;
  hire_charge: number;
  fuel_cost_fuel_only: number;
  driver_charge: number;
  extra_charges: number;
  commission_amount: number;
  gross_revenue: number;
  total_expenses: number;
  net_profit: number;
  discount_amount_lkr: number;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  status_changed_at?: string;
  trip_status?: string;
  refund_amount: number;
  refund_status: string;
  bus_no?: string;
  driver_name?: string;
  conductor_name?: string;
  payments: Array<{
    id: string;
    payment_type: string;
    amount: number;
    payment_method: string;
    reference_no?: string;
    paid_at: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_type: string;
    invoice_no: string;
    amount: number;
    generated_at: string;
  }>;
  total_paid: number;
  balance_due: number;
}

export const useRealtimeQuotations = () => {
  const [quotations, setQuotations] = useState<QuotationWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      
      // Fetch quotations with payments and invoices
      const { data: quotationsData, error: quotationsError } = await supabase
        .from('special_hire_quotations')
        .select(`
          *,
          special_hire_payments (
            id,
            payment_type,
            amount,
            payment_method,
            reference_no,
            paid_at
          ),
          special_hire_invoices (
            id,
            invoice_type,
            invoice_no,
            amount,
            generated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (quotationsError) {
        console.error('Error fetching quotations:', quotationsError);
        toast({
          title: "Error",
          description: "Failed to fetch quotations",
          variant: "destructive",
        });
        return;
      }

      // Transform data to include calculated fields
      const transformedData = quotationsData?.map(quotation => {
        const payments = quotation.special_hire_payments || [];
        const invoices = quotation.special_hire_invoices || [];
        
        const total_paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const finalTotal = Number(quotation.hire_charge) + Number(quotation.fuel_cost_fuel_only) + 
                         Number(quotation.driver_charge) + Number(quotation.extra_charges) - 
                         Number(quotation.discount_amount_lkr || 0);
        const balance_due = finalTotal - total_paid;

        return {
          ...quotation,
          payments,
          invoices,
          total_paid,
          balance_due,
        };
      }) || [];

      setQuotations(transformedData);
    } catch (error) {
      console.error('Error in fetchQuotations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quotations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();

    // Set up real-time subscriptions
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
          console.log('Quotations change:', payload);
          fetchQuotations(); // Refetch to get complete data with relations
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_hire_payments'
        },
        (payload) => {
          console.log('Payments change:', payload);
          fetchQuotations(); // Refetch to get updated payment data
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_hire_invoices'
        },
        (payload) => {
          console.log('Invoices change:', payload);
          fetchQuotations(); // Refetch to get updated invoice data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(quotationsChannel);
    };
  }, []);

  const refreshQuotations = () => {
    fetchQuotations();
  };

  return {
    quotations,
    loading,
    refreshQuotations,
  };
};