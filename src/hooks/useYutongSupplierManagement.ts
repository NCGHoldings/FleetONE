import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface YutongSupplierOrder {
  id: string;
  order_id: string;
  yutong_order_reference?: string;
  supplier_order_date: string;
  production_start_date?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  chassis_number?: string;
  engine_number?: string;
  vin_number?: string;
  current_milestone: string;
  production_progress_percentage: number;
  supplier_notes?: string;
  quality_certificates: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionUpdate {
  id: string;
  supplier_order_id: string;
  milestone: string;
  update_date: string;
  update_time: string;
  milestone_completed: boolean;
  photos: any;
  videos: any;
  progress_notes?: string;
  quality_check_passed?: boolean;
  issues_identified?: string;
  estimated_next_milestone_date?: string;
  updated_by?: string;
  created_at: string;
}

const milestoneLabels = {
  'order_received': 'Order Received',
  'production_started': 'Production Started',
  'chassis_assembly': 'Chassis Assembly',
  'body_assembly': 'Body Assembly',
  'interior_installation': 'Interior Installation',
  'quality_inspection': 'Quality Inspection',
  'final_testing': 'Final Testing',
  'ready_for_shipment': 'Ready for Shipment'
};

export const useYutongSupplierManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Create supplier order from main order
  const createSupplierOrder = async (orderData: {
    order_id: string;
    yutong_order_reference?: string;
    production_start_date?: string;
    estimated_completion_date?: string;
    supplier_notes?: string;
  }) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('yutong_supplier_orders')
        .insert({
          ...orderData,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Supplier order created successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error creating supplier order:', error);
      toast.error('Failed to create supplier order');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Get all supplier orders with related data
  const getSupplierOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('yutong_supplier_orders')
        .select(`
          *,
          yutong_orders (
            order_no,
            bus_model,
            quantity,
            total_amount
          ),
          yutong_production_updates (
            id,
            milestone,
            update_date,
            milestone_completed,
            progress_notes
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching supplier orders:', error);
      return { success: false, error };
    }
  };

  // Update supplier order milestone and progress
  const updateSupplierOrderMilestone = async (
    supplierId: string, 
    milestone: string, 
    progressPercentage?: number,
    additionalData?: {
      chassis_number?: string;
      engine_number?: string;
      vin_number?: string;
      supplier_notes?: string;
    }
  ) => {
    try {
      setIsLoading(true);

      const milestones = Object.keys(milestoneLabels);
      const milestoneIndex = milestones.indexOf(milestone);
      const calculatedProgress = progressPercentage || Math.round(((milestoneIndex + 1) / milestones.length) * 100);

      const updateData: any = {
        current_milestone: milestone,
        production_progress_percentage: calculatedProgress,
        updated_at: new Date().toISOString()
      };

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const { error } = await supabase
        .from('yutong_supplier_orders')
        .update(updateData)
        .eq('id', supplierId);

      if (error) throw error;

      toast.success('Production milestone updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update production milestone');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Add production update with photos/videos
  const addProductionUpdate = async (updateData: {
    supplier_order_id: string;
    milestone: string;
    milestone_completed: boolean;
    photos?: any[];
    videos?: any[];
    progress_notes?: string;
    quality_check_passed?: boolean;
    issues_identified?: string;
    estimated_next_milestone_date?: string;
  }) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('yutong_production_updates')
        .insert({
          supplier_order_id: updateData.supplier_order_id,
          milestone: updateData.milestone as any,
          milestone_completed: updateData.milestone_completed,
          photos: updateData.photos || [],
          videos: updateData.videos || [],
          progress_notes: updateData.progress_notes,
          quality_check_passed: updateData.quality_check_passed,
          issues_identified: updateData.issues_identified,
          estimated_next_milestone_date: updateData.estimated_next_milestone_date,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // If milestone completed, update the supplier order
      if (updateData.milestone_completed) {
        await updateSupplierOrderMilestone(updateData.supplier_order_id, updateData.milestone);
      }

      toast.success('Production update added successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error adding production update:', error);
      toast.error('Failed to add production update');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Get production updates for a supplier order
  const getProductionUpdates = async (supplierOrderId: string) => {
    try {
      const { data, error } = await supabase
        .from('yutong_production_updates')
        .select('*')
        .eq('supplier_order_id', supplierOrderId)
        .order('update_time', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching production updates:', error);
      return { success: false, error };
    }
  };

  // Transmission to Yutong simulation
  const transmitOrderToYutong = async (supplierOrderId: string, orderDetails: any) => {
    try {
      setIsLoading(true);

      // Simulate API call to Yutong
      const yutongReference = `YT-${Date.now()}`;
      
      const { error } = await supabase
        .from('yutong_supplier_orders')
        .update({
          yutong_order_reference: yutongReference,
          status: 'transmitted',
          current_milestone: 'order_received',
          production_progress_percentage: 10,
          supplier_notes: 'Order transmitted to Yutong successfully'
        })
        .eq('id', supplierOrderId);

      if (error) throw error;

      toast.success(`Order transmitted to Yutong. Reference: ${yutongReference}`);
      return { success: true, yutongReference };
    } catch (error) {
      console.error('Error transmitting order:', error);
      toast.error('Failed to transmit order to Yutong');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createSupplierOrder,
    getSupplierOrders,
    updateSupplierOrderMilestone,
    addProductionUpdate,
    getProductionUpdates,
    transmitOrderToYutong,
    milestoneLabels,
  };
};