import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ShipmentGroup {
  id: string;
  shipment_no: string;
  shipment_name: string;
  status: 'planning' | 'confirmed' | 'in_transit' | 'customs' | 'delivered' | 'cancelled';
  expected_departure_date?: string;
  actual_departure_date?: string;
  expected_arrival_date?: string;
  actual_arrival_date?: string;
  vessel_name?: string;
  container_numbers?: string[];
  bill_of_lading_no?: string;
  current_phase?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  orders?: ShipmentGroupOrder[];
}

export interface ShipmentGroupOrder {
  id: string;
  shipment_group_id: string;
  order_id: string;
  sequence_order: number;
  added_at: string;
  order?: any; // YutongOrder with relations
}

export interface CreateShipmentGroupData {
  shipment_name: string;
  expected_departure_date?: string;
  expected_arrival_date?: string;
  vessel_name?: string;
  container_numbers?: string[];
  bill_of_lading_no?: string;
  notes?: string;
}

export const useYutongShipmentGroupManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Get all shipment groups with their orders
  const getShipmentGroups = async () => {
    try {
      setIsLoading(true);
      
      const { data: groups, error } = await supabase
        .from('yutong_shipment_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each group, fetch its orders
      const groupsWithOrders = await Promise.all(
        (groups || []).map(async (group) => {
          const { data: orderLinks } = await supabase
            .from('yutong_shipment_group_orders')
            .select(`
              *,
              yutong_orders (
                *,
                yutong_quotations (
                  quotation_no,
                  customer_name,
                  company_name
                )
              )
            `)
            .eq('shipment_group_id', group.id)
            .order('sequence_order', { ascending: true });

          return {
            ...group,
            orders: orderLinks || []
          };
        })
      );

      return { success: true, data: groupsWithOrders as ShipmentGroup[] };
    } catch (error) {
      console.error('Error fetching shipment groups:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new shipment group
  const createShipmentGroup = async (data: CreateShipmentGroupData) => {
    try {
      setIsLoading(true);

      const { data: group, error } = await (supabase
        .from('yutong_shipment_groups') as any)
        .insert({
          shipment_name: data.shipment_name,
          expected_departure_date: data.expected_departure_date || null,
          expected_arrival_date: data.expected_arrival_date || null,
          vessel_name: data.vessel_name || null,
          container_numbers: data.container_numbers || null,
          bill_of_lading_no: data.bill_of_lading_no || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Shipment group created successfully');
      return { success: true, data: group };
    } catch (error) {
      console.error('Error creating shipment group:', error);
      toast.error('Failed to create shipment group');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Update shipment group
  const updateShipmentGroup = async (id: string, data: Partial<CreateShipmentGroupData & { status: string }>) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('yutong_shipment_groups')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Shipment group updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating shipment group:', error);
      toast.error('Failed to update shipment group');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete shipment group
  const deleteShipmentGroup = async (id: string) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('yutong_shipment_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Shipment group deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting shipment group:', error);
      toast.error('Failed to delete shipment group');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Add orders to shipment group
  const addOrdersToGroup = async (shipmentGroupId: string, orderIds: string[]) => {
    try {
      setIsLoading(true);

      // Get current max sequence order
      const { data: existing } = await supabase
        .from('yutong_shipment_group_orders')
        .select('sequence_order')
        .eq('shipment_group_id', shipmentGroupId)
        .order('sequence_order', { ascending: false })
        .limit(1);

      let nextOrder = (existing?.[0]?.sequence_order || 0) + 1;

      const insertData = orderIds.map((orderId) => ({
        shipment_group_id: shipmentGroupId,
        order_id: orderId,
        sequence_order: nextOrder++,
        added_by: user?.id
      }));

      const { error } = await supabase
        .from('yutong_shipment_group_orders')
        .insert(insertData);

      if (error) throw error;

      toast.success(`${orderIds.length} order(s) added to shipment group`);
      return { success: true };
    } catch (error) {
      console.error('Error adding orders to group:', error);
      toast.error('Failed to add orders to shipment group');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Remove order from shipment group
  const removeOrderFromGroup = async (orderId: string) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('yutong_shipment_group_orders')
        .delete()
        .eq('order_id', orderId);

      if (error) throw error;

      toast.success('Order removed from shipment group');
      return { success: true };
    } catch (error) {
      console.error('Error removing order from group:', error);
      toast.error('Failed to remove order from shipment group');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Get unassigned orders (not in any shipment group)
  const getUnassignedOrders = async () => {
    try {
      // Get all order IDs that are in shipment groups
      const { data: assignedOrders } = await supabase
        .from('yutong_shipment_group_orders')
        .select('order_id');

      const assignedIds = (assignedOrders || []).map(o => o.order_id);

      // Get all orders
      const { data: allOrders, error } = await supabase
        .from('yutong_orders')
        .select(`
          *,
          yutong_quotations (
            quotation_no,
            customer_name,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out assigned orders
      const unassigned = (allOrders || []).filter(o => !assignedIds.includes(o.id));

      return { success: true, data: unassigned };
    } catch (error) {
      console.error('Error fetching unassigned orders:', error);
      return { success: false, error };
    }
  };

  // Bulk update orders phase
  const bulkUpdateOrdersPhase = async (orderIds: string[], newPhase: string, progressPercentage: number) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('yutong_orders')
        .update({
          current_phase: newPhase as any,
          progress_percentage: progressPercentage,
          updated_at: new Date().toISOString()
        })
        .in('id', orderIds);

      if (error) throw error;

      toast.success(`${orderIds.length} order(s) updated to ${newPhase.replace('_', ' ')}`);
      return { success: true };
    } catch (error) {
      console.error('Error bulk updating orders:', error);
      toast.error('Failed to bulk update orders');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    getShipmentGroups,
    createShipmentGroup,
    updateShipmentGroup,
    deleteShipmentGroup,
    addOrdersToGroup,
    removeOrderFromGroup,
    getUnassignedOrders,
    bulkUpdateOrdersPhase,
  };
};
