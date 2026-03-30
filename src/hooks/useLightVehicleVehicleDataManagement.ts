// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VehicleDataSheet {
  id: string;
  sheet_name: string;
  shipment_group_id: string | null;
  file_name: string;
  upload_date: string;
  total_vehicles: number;
  matched_vehicles: number;
  pending_vehicles: number;
  status: 'pending' | 'processed' | 'completed';
  column_mapping: Record<string, string> | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  shipment_group?: {
    shipment_number: string;
    shipment_name: string;
  };
}

export interface VehicleRecord {
  id: string;
  data_sheet_id: string | null;
  shipment_group_id: string | null;
  order_id: string | null;
  vehicle_no: string | null;
  model: string;
  engine_no: string | null;
  chassis_no: string | null;
  seat_config: string | null;
  color: string | null;
  customer_name: string | null;
  year_of_manufacture: number | null;
  country_of_origin: string;
  vehicle_condition: string;
  fuel_type: string;
  engine_capacity: number | null;
  is_matched: boolean;
  match_status: 'pending' | 'auto_matched' | 'manually_matched' | 'unmatched';
  raw_data: Record<string, any> | null;
  created_at: string;
  data_sheet?: VehicleDataSheet;
  order?: {
    order_no: string;
    customer_name: string;
  };
  shipment_group?: {
    shipment_number: string;
    shipment_name: string;
  };
}

export interface ColumnMapping {
  excelColumn: string;
  mappedTo: string | null;
  confidence: number;
  autoDetected: boolean;
}

// Auto-detect column mappings based on common patterns
const COLUMN_PATTERNS: Record<string, string[]> = {
  vehicle_no: ['no', 'no.', 'number', 'sl', 's.no', 'sno', 'sr', 'serial', '#', 'item', 'item no', 'item number', 'item no.'],
  model: ['model', 'bus model', 'vehicle model', 'type'],
  engine_no: ['engine', 'engine no', 'engine number', 'engine_no', 'eng no', 'eng'],
  chassis_no: ['chassis', 'chassis no', 'chassis number', 'chassis_no', 'chasis', 'vin', 'vin no', 'vin number', 'vin no.'],
  seat_config: ['seat', 'seats', 'seating', 'capacity', 'seat config', 'seater'],
  color: ['color', 'colour', 'paint', 'shade'],
  customer_name: ['customer', 'customer name', 'buyer', 'client', 'owner', 'name'],
  year_of_manufacture: ['year', 'year of manufacture', 'yom', 'mfg year'],
  order_no: ['order', 'order no', 'order number', 'order no.', 'order_no'],
};

export function useLightVehicleVehicleDataManagement() {
  const [isLoading, setIsLoading] = useState(false);

  const autoDetectColumnMapping = useCallback((headers: string[]): ColumnMapping[] => {
    return headers.map(header => {
      const normalizedHeader = header.toLowerCase().trim();
      let bestMatch: { field: string; confidence: number } | null = null;

      for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
        for (const pattern of patterns) {
          if (normalizedHeader === pattern) {
            bestMatch = { field, confidence: 100 };
            break;
          } else if (normalizedHeader.includes(pattern) || pattern.includes(normalizedHeader)) {
            const confidence = Math.round((pattern.length / Math.max(normalizedHeader.length, pattern.length)) * 90);
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { field, confidence };
            }
          }
        }
        if (bestMatch?.confidence === 100) break;
      }

      return {
        excelColumn: header,
        mappedTo: bestMatch?.field || null,
        confidence: bestMatch?.confidence || 0,
        autoDetected: bestMatch !== null,
      };
    });
  }, []);

  const createDataSheet = useCallback(async (
    sheetName: string,
    fileName: string,
    columnMapping: Record<string, string>,
    shipmentGroupId?: string,
    notes?: string
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('lightvehicle_vehicle_data_sheets')
        .insert({
          sheet_name: sheetName,
          file_name: fileName,
          column_mapping: columnMapping,
          shipment_group_id: shipmentGroupId || null,
          notes: notes || null,
          uploaded_by: userData.user?.id,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      console.error('Error creating data sheet:', error);
      toast.error(error.message || 'Failed to create data sheet');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const insertVehicleRecords = useCallback(async (
    dataSheetId: string,
    records: Partial<VehicleRecord>[],
    shipmentGroupId?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const insertData = records.map(record => ({
        data_sheet_id: dataSheetId,
        shipment_group_id: shipmentGroupId || null,
        vehicle_no: record.vehicle_no || null,
        model: record.model || 'Unknown',
        engine_no: record.engine_no || null,
        chassis_no: record.chassis_no || null,
        seat_config: record.seat_config || null,
        color: record.color || null,
        customer_name: record.customer_name || null,
        year_of_manufacture: record.year_of_manufacture || null,
        country_of_origin: record.country_of_origin || 'CHINA',
        vehicle_condition: record.vehicle_condition || 'BRAND NEW',
        fuel_type: record.fuel_type || 'DIESEL',
        engine_capacity: record.engine_capacity || null,
        raw_data: record.raw_data || null,
        is_matched: false,
        match_status: 'pending' as const
      }));

      const { error } = await supabase
        .from('lightvehicle_vehicle_records')
        .insert(insertData);

      if (error) throw error;

      // Update sheet status
      await supabase
        .from('lightvehicle_vehicle_data_sheets')
        .update({ status: 'processed' })
        .eq('id', dataSheetId);

      toast.success(`${records.length} vehicle records imported successfully`);
      return true;
    } catch (error: any) {
      console.error('Error inserting vehicle records:', error);
      toast.error(error.message || 'Failed to import vehicle records');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDataSheets = useCallback(async (): Promise<VehicleDataSheet[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lightvehicle_vehicle_data_sheets')
        .select(`
          *,
          shipment_group:lightvehicle_shipment_groups(shipment_no, shipment_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        shipment_group: d.shipment_group ? { shipment_number: (d.shipment_group as any).shipment_no, shipment_name: (d.shipment_group as any).shipment_name } : undefined
      })) as VehicleDataSheet[];
    } catch (error: any) {
      console.error('Error fetching data sheets:', error);
      toast.error(error.message || 'Failed to fetch data sheets');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchVehicleRecords = useCallback(async (
    filters?: {
      dataSheetId?: string;
      shipmentGroupId?: string;
      matchStatus?: string;
      model?: string;
    }
  ): Promise<VehicleRecord[]> => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('lightvehicle_vehicle_records')
        .select(`*`)
        .order('created_at', { ascending: false });

      if (filters?.dataSheetId) {
        query = query.eq('data_sheet_id', filters.dataSheetId);
      }
      if (filters?.shipmentGroupId) {
        query = query.eq('shipment_group_id', filters.shipmentGroupId);
      }
      if (filters?.matchStatus) {
        query = query.eq('match_status', filters.matchStatus);
      }
      if (filters?.model) {
        query = query.ilike('model', `%${filters.model}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as VehicleRecord[];
    } catch (error: any) {
      console.error('Error fetching vehicle records:', error);
      toast.error(error.message || 'Failed to fetch vehicle records');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const matchVehicleToOrder = useCallback(async (
    vehicleId: string,
    orderId: string,
    isAutoMatch: boolean = false,
    vehicleData?: VehicleRecord
  ): Promise<boolean> => {
    try {
      // Update vehicle record match status
      const { error } = await supabase
        .from('lightvehicle_vehicle_records')
        .update({
          order_id: orderId,
          is_matched: true,
          match_status: isAutoMatch ? 'auto_matched' : 'manually_matched'
        })
        .eq('id', vehicleId);

      if (error) throw error;

      // Auto-populate vehicle details into the order
      if (vehicleData) {
        const orderUpdate: Record<string, any> = {};
        if (vehicleData.engine_no) orderUpdate.engine_number = vehicleData.engine_no;
        if (vehicleData.chassis_no) orderUpdate.chassis_number = vehicleData.chassis_no;
        if (vehicleData.year_of_manufacture) orderUpdate.year_of_manufacture = vehicleData.year_of_manufacture;
        if (vehicleData.country_of_origin) orderUpdate.country_of_origin = vehicleData.country_of_origin;
        if (vehicleData.fuel_type) orderUpdate.fuel_type = vehicleData.fuel_type;
        if (vehicleData.engine_capacity) orderUpdate.engine_capacity = vehicleData.engine_capacity;
        if (vehicleData.color) orderUpdate.color_scheme = vehicleData.color;

        if (Object.keys(orderUpdate).length > 0) {
          const { error: orderError } = await supabase
            .from('lightvehicle_orders')
            .update(orderUpdate)
            .eq('id', orderId);

          if (orderError) {
            console.error('Error syncing vehicle details to order:', orderError);
            toast.warning('Vehicle matched but some details could not be synced to order');
          } else {
            console.log('✅ Vehicle details synced to order:', orderUpdate);
          }
        }
      }

      toast.success('Vehicle matched to order successfully');
      return true;
    } catch (error: any) {
      console.error('Error matching vehicle:', error);
      toast.error(error.message || 'Failed to match vehicle');
      return false;
    }
  }, []);

  const unmatchVehicle = useCallback(async (vehicleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lightvehicle_vehicle_records')
        .update({
          order_id: null,
          is_matched: false,
          match_status: 'unmatched'
        })
        .eq('id', vehicleId);

      if (error) throw error;
      toast.success('Vehicle unmatched successfully');
      return true;
    } catch (error: any) {
      console.error('Error unmatching vehicle:', error);
      toast.error(error.message || 'Failed to unmatch vehicle');
      return false;
    }
  }, []);

  const deleteDataSheet = useCallback(async (sheetId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lightvehicle_vehicle_data_sheets')
        .delete()
        .eq('id', sheetId);

      if (error) throw error;
      toast.success('Data sheet deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting data sheet:', error);
      toast.error(error.message || 'Failed to delete data sheet');
      return false;
    }
  }, []);

  const fetchVehicleByOrderId = useCallback(async (orderId: string): Promise<VehicleRecord | null> => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_vehicle_records')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as VehicleRecord | null;
    } catch (error: any) {
      console.error('Error fetching vehicle by order:', error);
      return null;
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      const [sheetsRes, vehiclesRes] = await Promise.all([
        supabase.from('lightvehicle_vehicle_data_sheets').select('id, status'),
        supabase.from('lightvehicle_vehicle_records').select('id, is_matched, match_status')
      ]);

      const sheets = sheetsRes.data || [];
      const vehicles = vehiclesRes.data || [];

      return {
        totalSheets: sheets.length,
        totalVehicles: vehicles.length,
        matchedVehicles: vehicles.filter(v => v.is_matched).length,
        pendingVehicles: vehicles.filter(v => !v.is_matched).length,
        completedSheets: sheets.filter(s => s.status === 'completed').length
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        totalSheets: 0,
        totalVehicles: 0,
        matchedVehicles: 0,
        pendingVehicles: 0,
        completedSheets: 0
      };
    }
  }, []);

  return {
    isLoading,
    autoDetectColumnMapping,
    createDataSheet,
    insertVehicleRecords,
    fetchDataSheets,
    fetchVehicleRecords,
    matchVehicleToOrder,
    unmatchVehicle,
    deleteDataSheet,
    fetchVehicleByOrderId,
    getStats
  };
}
