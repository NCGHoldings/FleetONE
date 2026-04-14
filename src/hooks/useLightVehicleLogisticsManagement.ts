// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LightVehicleShipment {
  id: string;
  order_id: string;
  supplier_order_id?: string;
  shipping_partner_id?: string;
  shipment_reference?: string;
  shipping_method: string;
  container_number?: string;
  vessel_name?: string;
  departure_port: string;
  arrival_port: string;
  scheduled_departure_date?: string;
  actual_departure_date?: string;
  scheduled_arrival_date?: string;
  actual_arrival_date?: string;
  estimated_arrival_date?: string;
  tracking_number?: string;
  current_status: string;
  shipping_cost?: number;
  insurance_amount?: number;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingPartner {
  id: string;
  partner_name: string;
  partner_code?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  supported_shipping_methods: string[];
  partner_rating?: number;
  is_active: boolean;
}

export interface ShippingDocument {
  id: string;
  shipment_id: string;
  document_type: string;
  document_number?: string;
  document_date?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  issued_by?: string;
  verified_by?: string;
  verification_date?: string;
  document_status: string;
  expiry_date?: string;
  notes?: string;
}

export interface ShipmentTracking {
  id: string;
  shipment_id: string;
  tracking_date: string;
  location?: string;
  status?: string;
  description?: string;
  milestone_reached?: string;
  estimated_arrival?: string;
  latitude?: number;
  longitude?: number;
}

const documentTypeLabels = {
  'commercial_invoice': 'Commercial Invoice',
  'packing_list': 'Packing List',
  'bill_of_lading': 'Bill of Lading',
  'certificate_of_origin': 'Certificate of Origin',
  'insurance_certificate': 'Insurance Certificate',
  'customs_declaration': 'Customs Declaration'
};

export const useLightVehicleLogisticsManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Get all shipping partners
  const getShippingPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_shipping_partners')
        .select('*')
        .eq('is_active', true)
        .order('partner_name', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching shipping partners:', error);
      return { success: false, error };
    }
  };

  // Create shipment
  const createShipment = async (shipmentData: {
    order_id: string;
    supplier_order_id?: string;
    shipping_partner_id: string;
    shipping_method: string;
    container_number?: string;
    vessel_name?: string;
    scheduled_departure_date?: string;
    scheduled_arrival_date?: string;
    shipping_cost?: number;
    insurance_amount?: number;
    special_instructions?: string;
  }) => {
    try {
      setIsLoading(true);

      // Generate shipment reference
      const shipmentRef = `SH-${Date.now()}`;

      const { data, error } = await supabase
        .from('lightvehicle_shipments')
        .insert({
          order_id: shipmentData.order_id,
          supplier_order_id: shipmentData.supplier_order_id,
          shipping_partner_id: shipmentData.shipping_partner_id,
          shipping_method: shipmentData.shipping_method as any,
          container_number: shipmentData.container_number,
          vessel_name: shipmentData.vessel_name,
          scheduled_departure_date: shipmentData.scheduled_departure_date,
          scheduled_arrival_date: shipmentData.scheduled_arrival_date,
          shipping_cost: shipmentData.shipping_cost,
          insurance_amount: shipmentData.insurance_amount,
          special_instructions: shipmentData.special_instructions,
          shipment_reference: shipmentRef,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Shipment created successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast.error('Failed to create shipment');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Get all shipments with related data
  const getShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_shipments')
        .select(`
          *,
          lightvehicle_orders (
            order_no,
            bus_model,
            quantity
          ),
          lightvehicle_shipping_partners (
            partner_name,
            contact_email,
            contact_phone
          ),
          lightvehicle_shipping_documents (
            id,
            document_type,
            document_status
          ),
          lightvehicle_shipment_tracking (
            id,
            tracking_date,
            location,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching shipments:', error);
      return { success: false, error };
    }
  };

  // Update shipment status and tracking
  const updateShipmentStatus = async (
    shipmentId: string, 
    status: string, 
    trackingData?: {
      location?: string;
      description?: string;
      milestone_reached?: string;
      estimated_arrival?: string;
    }
  ) => {
    try {
      setIsLoading(true);

      // Update shipment status
      const { error: shipmentError } = await supabase
        .from('lightvehicle_shipments')
        .update({
          current_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (shipmentError) throw shipmentError;

      // Add tracking record if tracking data provided
      if (trackingData) {
        const { error: trackingError } = await supabase
          .from('lightvehicle_shipment_tracking')
          .insert({
            shipment_id: shipmentId,
            status,
            ...trackingData,
          });

        if (trackingError) throw trackingError;
      }

      toast.success('Shipment status updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating shipment status:', error);
      toast.error('Failed to update shipment status');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Add shipping document
  const addShippingDocument = async (documentData: {
    shipment_id: string;
    document_type: string;
    document_number?: string;
    document_date?: string;
    file_path?: string;
    file_name?: string;
    file_size?: number;
    issued_by?: string;
    expiry_date?: string;
    notes?: string;
  }) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('lightvehicle_shipping_documents')
        .insert({
          shipment_id: documentData.shipment_id,
          document_type: documentData.document_type as any,
          document_number: documentData.document_number,
          document_date: documentData.document_date,
          file_path: documentData.file_path,
          file_name: documentData.file_name,
          file_size: documentData.file_size,
          issued_by: documentData.issued_by,
          expiry_date: documentData.expiry_date,
          notes: documentData.notes,
          verified_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Shipping document added successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error adding shipping document:', error);
      toast.error('Failed to add shipping document');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Get shipping documents for a shipment
  const getShippingDocuments = async (shipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_shipping_documents')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching shipping documents:', error);
      return { success: false, error };
    }
  };

  // Get shipment tracking history
  const getShipmentTracking = async (shipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_shipment_tracking')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('tracking_date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching shipment tracking:', error);
      return { success: false, error };
    }
  };

  // Book shipment with partner
  const bookShipmentWithPartner = async (shipmentId: string, bookingDetails: any) => {
    try {
      setIsLoading(true);

      // Simulate booking with shipping partner
      const trackingNumber = `TRK-${Date.now()}`;
      
      const { error } = await supabase
        .from('lightvehicle_shipments')
        .update({
          tracking_number: trackingNumber,
          current_status: 'booked',
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (error) throw error;

      // Add tracking record
      await supabase
        .from('lightvehicle_shipment_tracking')
        .insert({
          shipment_id: shipmentId,
          status: 'booked',
          description: 'Shipment booked with shipping partner',
          milestone_reached: 'Booking Confirmed'
        });

      toast.success(`Shipment booked successfully. Tracking: ${trackingNumber}`);
      return { success: true, trackingNumber };
    } catch (error) {
      console.error('Error booking shipment:', error);
      toast.error('Failed to book shipment');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    getShippingPartners,
    createShipment,
    getShipments,
    updateShipmentStatus,
    addShippingDocument,
    getShippingDocuments,
    getShipmentTracking,
    bookShipmentWithPartner,
    documentTypeLabels,
  };
};