import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Interface definitions
export interface YutongDeliveryInspection {
  id: string;
  order_id: string;
  inspection_date: string;
  inspector_name: string;
  inspector_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'approved';
  checklist_items: any[];
  defects_found: any[];
  overall_rating?: number;
  notes?: string;
  photos: any[];
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface YutongCustomerHandover {
  id: string;
  order_id: string;
  customer_id: string;
  handover_date: string;
  handover_time?: string;
  location: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  handover_officer_name: string;
  handover_officer_id?: string;
  customer_representative_name?: string;
  customer_representative_contact?: string;
  documents_provided: any[];
  training_provided: boolean;
  training_duration_hours?: number;
  training_notes?: string;
  customer_signature?: string;
  officer_signature?: string;
  handover_photos: any[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface YutongDeliveryConfirmation {
  id: string;
  order_id: string;
  delivery_date: string;
  delivery_time?: string;
  delivery_location: string;
  status: 'pending' | 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  driver_name?: string;
  driver_contact?: string;
  vehicle_condition_on_delivery?: string;
  delivery_photos: any[];
  customer_signature?: string;
  delivery_receipt_url?: string;
  special_instructions?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export function useYutongDeliveryManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Delivery Inspections
  const createDeliveryInspection = async (inspectionData: Partial<YutongDeliveryInspection>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('yutong_delivery_inspections')
        .insert(inspectionData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery inspection created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating delivery inspection:', error);
      toast({
        title: "Error",
        description: "Failed to create delivery inspection",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateInspectionStatus = async (inspectionId: string, status: string, additionalData?: any) => {
    setIsLoading(true);
    try {
      const updateData = { status, ...additionalData };
      
      if (status === 'approved') {
        updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('yutong_delivery_inspections')
        .update(updateData)
        .eq('id', inspectionId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Inspection status updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating inspection status:', error);
      toast({
        title: "Error",
        description: "Failed to update inspection status",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getDeliveryInspections = async (orderId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('yutong_delivery_inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching delivery inspections:', error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery inspections",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Customer Handovers
  const createCustomerHandover = async (handoverData: Partial<YutongCustomerHandover>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('yutong_customer_handovers')
        .insert(handoverData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer handover scheduled successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating customer handover:', error);
      toast({
        title: "Error",
        description: "Failed to schedule customer handover",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateHandoverStatus = async (handoverId: string, status: string, additionalData?: any) => {
    setIsLoading(true);
    try {
      const updateData = { status, ...additionalData };

      const { data, error } = await supabase
        .from('yutong_customer_handovers')
        .update(updateData)
        .eq('id', handoverId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Handover status updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating handover status:', error);
      toast({
        title: "Error",
        description: "Failed to update handover status",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerHandovers = async (orderId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('yutong_customer_handovers')
        .select(`
          *,
          yutong_orders!inner(
            order_no,
            yutong_customers!inner(
              customer_name,
              contact_person,
              email,
              phone
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching customer handovers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer handovers",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delivery Confirmations
  const createDeliveryConfirmation = async (confirmationData: Partial<YutongDeliveryConfirmation>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('yutong_delivery_confirmations')
        .insert(confirmationData as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery confirmation created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating delivery confirmation:', error);
      toast({
        title: "Error",
        description: "Failed to create delivery confirmation",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelivery = async (confirmationId: string, confirmationData: any) => {
    setIsLoading(true);
    try {
      const updateData = {
        ...confirmationData,
        status: 'delivered',
        confirmed_by: (await supabase.auth.getUser()).data.user?.id,
        confirmed_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('yutong_delivery_confirmations')
        .update(updateData)
        .eq('id', confirmationId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery confirmed successfully",
      });

      return data;
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast({
        title: "Error",
        description: "Failed to confirm delivery",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getDeliveryConfirmations = async (orderId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('yutong_delivery_confirmations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching delivery confirmations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery confirmations",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    // Delivery Inspections
    createDeliveryInspection,
    updateInspectionStatus,
    getDeliveryInspections,
    // Customer Handovers
    createCustomerHandover,
    updateHandoverStatus,
    getCustomerHandovers,
    // Delivery Confirmations
    createDeliveryConfirmation,
    confirmDelivery,
    getDeliveryConfirmations,
  };
}