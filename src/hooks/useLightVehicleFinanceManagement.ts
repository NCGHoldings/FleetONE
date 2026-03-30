import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LetterOfCredit {
  id: string;
  lc_no: string;
  order_id: string;
  issuing_bank_name: string;
  issuing_bank_branch?: string;
  issuing_bank_contact?: string;
  beneficiary_bank: string;
  lc_amount: number;
  currency: string;
  lc_type: string;
  issue_date: string;
  expiry_date: string;
  latest_shipment_date?: string;
  required_documents?: any[];
  status: string;
  amendment_count: number;
  amendments?: any[];
  utilized_amount: number;
  remaining_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryOrder {
  id: string;
  do_no: string;
  order_id: string;
  lc_id?: string;
  issuing_bank: string;
  do_amount: number;
  currency: string;
  chassis_numbers?: string[];
  engine_numbers?: string[];
  vehicle_count: number;
  status: string;
  issue_date?: string;
  release_date?: string;
  collection_date?: string;
  commercial_invoice_no?: string;
  bill_of_lading_no?: string;
  packing_list_no?: string;
  notes?: string;
  collected_by?: string;
}

export const useLightVehicleFinanceManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Create Letter of Credit
  const createLetterOfCredit = async (lcData: {
    order_id: string;
    issuing_bank_name: string;
    issuing_bank_branch?: string;
    issuing_bank_contact?: string;
    lc_amount: number;
    currency?: string;
    lc_type?: string;
    issue_date: string;
    expiry_date: string;
    latest_shipment_date?: string;
    required_documents?: string[];
    notes?: string;
  }) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('lightvehicle_letter_of_credits')
        .insert({
          ...lcData,
          currency: lcData.currency || 'USD',
          lc_type: lcData.lc_type || 'Irrevocable Documentary Credit',
          required_documents: lcData.required_documents || [],
          remaining_amount: lcData.lc_amount,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update order phase to LC issuance
      await supabase
        .from('lightvehicle_orders')
        .update({ current_phase: 'lc_issuance' })
        .eq('id', lcData.order_id);

      toast.success('Letter of Credit created successfully');
      return { success: true, lc: data };
    } catch (error) {
      console.error('Error creating LC:', error);
      toast.error('Failed to create Letter of Credit');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Update LC status
  const updateLCStatus = async (lcId: string, status: string, utilizedAmount?: number) => {
    try {
      setIsLoading(true);

      const updates: any = { status };
      
      if (utilizedAmount !== undefined) {
        updates.utilized_amount = utilizedAmount;
        
        // Calculate remaining amount
        const { data: lc } = await supabase
          .from('lightvehicle_letter_of_credits')
          .select('lc_amount')
          .eq('id', lcId)
          .single();
          
        if (lc) {
          updates.remaining_amount = lc.lc_amount - utilizedAmount;
        }
      }

      const { error } = await supabase
        .from('lightvehicle_letter_of_credits')
        .update(updates)
        .eq('id', lcId);

      if (error) throw error;

      toast.success('LC status updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating LC status:', error);
      toast.error('Failed to update LC status');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Add LC amendment
  const addLCAmendment = async (lcId: string, amendmentData: {
    amendment_type: string;
    description: string;
    old_value?: string;
    new_value?: string;
    amendment_date: string;
  }) => {
    try {
      setIsLoading(true);

      // Get current LC data
      const { data: currentLC, error: fetchError } = await supabase
        .from('lightvehicle_letter_of_credits')
        .select('amendments, amendment_count')
        .eq('id', lcId)
        .single();

      if (fetchError) throw fetchError;

      const newAmendments = [
        ...((currentLC.amendments as any[]) || []),
        {
          ...amendmentData,
          amendment_no: (currentLC.amendment_count || 0) + 1,
          created_at: new Date().toISOString(),
          created_by: user?.id,
        }
      ];

      const { error } = await supabase
        .from('lightvehicle_letter_of_credits')
        .update({
          amendments: newAmendments,
          amendment_count: newAmendments.length,
          status: 'amended'
        })
        .eq('id', lcId);

      if (error) throw error;

      toast.success('LC amendment added successfully');
      return { success: true };
    } catch (error) {
      console.error('Error adding LC amendment:', error);
      toast.error('Failed to add LC amendment');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Create Delivery Order
  const createDeliveryOrder = async (doData: {
    order_id: string;
    lc_id?: string;
    issuing_bank: string;
    do_amount: number;
    currency?: string;
    chassis_numbers?: string[];
    engine_numbers?: string[];
    vehicle_count: number;
    commercial_invoice_no?: string;
    bill_of_lading_no?: string;
    packing_list_no?: string;
    notes?: string;
  }) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('lightvehicle_delivery_orders')
        .insert({
          ...doData,
          currency: doData.currency || 'USD',
          chassis_numbers: doData.chassis_numbers || [],
          engine_numbers: doData.engine_numbers || [],
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Delivery Order created successfully');
      return { success: true, deliveryOrder: data };
    } catch (error) {
      console.error('Error creating DO:', error);
      toast.error('Failed to create Delivery Order');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Update DO status
  const updateDOStatus = async (doId: string, status: string, additionalData?: {
    release_date?: string;
    collection_date?: string;
    collected_by?: string;
  }) => {
    try {
      setIsLoading(true);

      const updates: any = { status };
      
      if (additionalData) {
        Object.assign(updates, additionalData);
      }

      const { error } = await supabase
        .from('lightvehicle_delivery_orders')
        .update(updates)
        .eq('id', doId);

      if (error) throw error;

      toast.success('Delivery Order status updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating DO status:', error);
      toast.error('Failed to update DO status');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Get LCs for an order
  const getLetterOfCredits = async (orderId?: string) => {
    try {
      let query = supabase
        .from('lightvehicle_letter_of_credits')
        .select(`
          *,
          lightvehicle_orders (
            order_no,
            bus_model,
            quantity,
            total_amount
          )
        `)
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, lcs: data };
    } catch (error) {
      console.error('Error fetching LCs:', error);
      return { success: false, error };
    }
  };

  // Get Delivery Orders
  const getDeliveryOrders = async (orderId?: string) => {
    try {
      let query = supabase
        .from('lightvehicle_delivery_orders')
        .select(`
          *,
          lightvehicle_orders (
            order_no,
            bus_model,
            quantity
          ),
          lightvehicle_letter_of_credits (
            lc_no,
            lc_amount
          )
        `)
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, deliveryOrders: data };
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      return { success: false, error };
    }
  };

  // Get financial dashboard data
  const getFinancialDashboard = async () => {
    try {
      // Get LC summary
      const { data: lcSummary } = await supabase
        .from('lightvehicle_letter_of_credits')
        .select('status, lc_amount, utilized_amount');

      // Get payment summary
      const { data: paymentSummary } = await supabase
        .from('lightvehicle_customer_payments')
        .select('payment_amount, payment_date, status');

      // Get orders financial summary
      const { data: ordersSummary } = await supabase
        .from('lightvehicle_orders')
        .select('total_amount, total_paid, balance_due, current_phase');

      return {
        success: true,
        dashboard: {
          lcSummary: lcSummary || [],
          paymentSummary: paymentSummary || [],
          ordersSummary: ordersSummary || []
        }
      };
    } catch (error) {
      console.error('Error fetching financial dashboard:', error);
      return { success: false, error };
    }
  };

  return {
    isLoading,
    createLetterOfCredit,
    updateLCStatus,
    addLCAmendment,
    createDeliveryOrder,
    updateDOStatus,
    getLetterOfCredits,
    getDeliveryOrders,
    getFinancialDashboard,
  };
};