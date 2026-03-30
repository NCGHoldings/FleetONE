import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface OldSalesRecord {
  id?: string;
  row_number?: number;
  quotation_no?: string;
  quoted_date?: string;
  entered_by?: string;
  customer_name: string;
  company_name?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  bus_model?: string;
  optional_specifications?: string;
  quantity?: number;
  base_price?: number;
  total_before_discount?: number;
  discount_amount?: number;
  subtotal_price?: number;
  vat_amount?: number;
  advance_payment?: number;
  final_price?: number;
  sales_person?: string;
  quotation_status?: string;
  import_batch_id?: string;
  imported_at?: string;
  converted_to_quotation_id?: string;
  converted_to_order_id?: string;
  notes?: string;
  raw_data?: Json;
}

export interface ImportBatch {
  id: string;
  file_name: string;
  total_records: number;
  imported_by?: string;
  imported_at: string;
  status: string;
}

export interface OldSalesFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  importBatchId?: string;
}

export const useSinotrukOldSalesManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<OldSalesRecord[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);

  // Fetch old sales records with filters
  const fetchOldSales = useCallback(async (filters?: OldSalesFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('sinotruck_old_sales')
        .select('*')
        .order('row_number', { ascending: true });

      if (filters?.search) {
        query = query.or(`customer_name.ilike.%${filters.search}%,quotation_no.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,bus_model.ilike.%${filters.search}%`);
      }

      if (filters?.status) {
        query = query.eq('quotation_status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('quoted_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('quoted_date', filters.dateTo);
      }

      if (filters?.importBatchId) {
        query = query.eq('import_batch_id', filters.importBatchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords((data || []) as OldSalesRecord[]);
      return (data || []) as OldSalesRecord[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch old sales';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch import batches
  const fetchImportBatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sinotruck_old_sales_imports')
        .select('*')
        .order('imported_at', { ascending: false });

      if (error) throw error;
      setImportBatches(data || []);
      return data || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch import batches';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    }
  }, [toast]);

  // Create import batch and import records
  const importOldSales = useCallback(async (fileName: string, records: OldSalesRecord[]) => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create import batch first
      const { data: batchData, error: batchError } = await supabase
        .from('sinotruck_old_sales_imports')
        .insert({
          file_name: fileName,
          total_records: records.length,
          imported_by: user?.id,
          status: 'processing'
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Add batch ID and raw data to each record - map to database format
      const recordsWithBatch = records.map((record, index) => ({
        row_number: index + 1,
        quotation_no: record.quotation_no || null,
        quoted_date: record.quoted_date || null,
        entered_by: record.entered_by || null,
        customer_name: record.customer_name,
        company_name: record.company_name || null,
        customer_address: record.customer_address || null,
        customer_phone: record.customer_phone || null,
        customer_email: record.customer_email || null,
        bus_model: record.bus_model || null,
        optional_specifications: record.optional_specifications || null,
        quantity: record.quantity || 1,
        base_price: record.base_price || 0,
        total_before_discount: record.total_before_discount || 0,
        discount_amount: record.discount_amount || 0,
        subtotal_price: record.subtotal_price || 0,
        vat_amount: record.vat_amount || 0,
        advance_payment: record.advance_payment || 0,
        final_price: record.final_price || 0,
        sales_person: record.sales_person || null,
        quotation_status: record.quotation_status || null,
        import_batch_id: batchData.id,
        raw_data: record as unknown as Json
      }));

      // Insert records in batches of 100
      const batchSize = 100;
      for (let i = 0; i < recordsWithBatch.length; i += batchSize) {
        const batch = recordsWithBatch.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('sinotruck_old_sales')
          .insert(batch);

        if (insertError) throw insertError;
      }

      // Update batch status to completed
      await supabase
        .from('sinotruck_old_sales_imports')
        .update({ status: 'completed' })
        .eq('id', batchData.id);

      toast({
        title: 'Import Successful',
        description: `Successfully imported ${records.length} records from ${fileName}`,
      });

      return batchData;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import records';
      toast({
        title: 'Import Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Helper to check if a value is empty
  const isFieldEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && (value.trim() === '' || value.trim() === '-')) return true;
    if (typeof value === 'number' && (value === 0 || isNaN(value))) return true;
    return false;
  };

  // Get list of missing required fields for a record
  const getMissingFields = useCallback((record: OldSalesRecord): string[] => {
    const missing: string[] = [];
    if (isFieldEmpty(record.customer_phone)) missing.push('customer_phone');
    if (isFieldEmpty(record.bus_model)) missing.push('bus_model');
    if (isFieldEmpty(record.base_price)) missing.push('base_price');
    if (isFieldEmpty(record.quantity)) missing.push('quantity');
    return missing;
  }, []);

  // Convert old sale to quotation with optional additional data
  const convertToQuotation = useCallback(async (oldSaleId: string, additionalData?: Partial<OldSalesRecord>) => {
    setLoading(true);
    try {
      // Fetch the old sale record
      const { data: oldSale, error: fetchError } = await supabase
        .from('sinotruck_old_sales')
        .select('*')
        .eq('id', oldSaleId)
        .single();

      if (fetchError) throw fetchError;

      // Merge with additional data provided from modal
      const mergedData = { ...oldSale, ...additionalData };

      // Validate required fields after merge
      const missingFields = getMissingFields(mergedData as OldSalesRecord);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Generate quotation number
      const now = new Date();
      const quotationNo = `YQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
      
      // Set valid_until to 30 days from now
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      // Create quotation from merged data
      const quotationData = {
        quotation_no: quotationNo,
        customer_name: mergedData.customer_name || 'Unknown Customer',
        valid_until: validUntil.toISOString().split('T')[0],
        bus_model: mergedData.bus_model || 'Unknown Model',
        quantity: mergedData.quantity || 1,
        unit_price: mergedData.base_price || 0,
        discount_amount: mergedData.discount_amount || 0,
        vat_amount: mergedData.vat_amount || 0,
        total_price: mergedData.final_price || 0,
        advance_payment: mergedData.advance_payment || 0,
        responsible_person: mergedData.sales_person || null,
        status: 'draft' as const,
        notes: `Converted from old sale: ${mergedData.quotation_no || 'N/A'}`,
        company_name: mergedData.company_name || null,
        customer_address: mergedData.customer_address || null,
        customer_phone: mergedData.customer_phone || null,
        customer_email: mergedData.customer_email || null,
        special_features: mergedData.optional_specifications || null,
      };

      const { data: quotation, error: quotationError } = await supabase
        .from('sinotruck_quotations')
        .insert([quotationData])
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Update old sale with reference
      await supabase
        .from('sinotruck_old_sales')
        .update({ converted_to_quotation_id: quotation.id })
        .eq('id', oldSaleId);

      toast({
        title: 'Converted Successfully',
        description: 'Old sale has been converted to a new quotation',
      });

      return quotation;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert to quotation';
      toast({
        title: 'Conversion Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, getMissingFields]);

  // Create order from old sale with optional additional data
  const createOrderFromOldSale = useCallback(async (oldSaleId: string, additionalData?: Partial<OldSalesRecord>) => {
    setLoading(true);
    try {
      // First convert to quotation if not already
      const { data: oldSale } = await supabase
        .from('sinotruck_old_sales')
        .select('converted_to_quotation_id')
        .eq('id', oldSaleId)
        .single();

      let quotationId = oldSale?.converted_to_quotation_id;

      if (!quotationId) {
        const quotation = await convertToQuotation(oldSaleId, additionalData);
        if (!quotation) throw new Error('Failed to create quotation');
        quotationId = quotation.id;
      }

      // Get quotation details for order
      const { data: quotation, error: quotationError } = await supabase
        .from('sinotruck_quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      // Generate order number
      const now = new Date();
      const orderNo = `YO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;

      // Create order from quotation
      const orderData = {
        order_no: orderNo,
        quotation_id: quotationId,
        bus_model: quotation.bus_model,
        quantity: quotation.quantity || 1,
        unit_price: quotation.unit_price || 0,
        total_price: quotation.total_price || 0,
        total_amount: quotation.total_price || 0,
        order_status: 'confirmed' as const,
      };

      const { data: order, error: orderError } = await supabase
        .from('sinotruck_orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Update old sale with order reference
      await supabase
        .from('sinotruck_old_sales')
        .update({ converted_to_order_id: order.id })
        .eq('id', oldSaleId);

      toast({
        title: 'Order Created',
        description: 'Order has been created from old sale',
      });

      return order;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      toast({
        title: 'Order Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, convertToQuotation]);

  // Delete old sale record
  const deleteOldSale = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('sinotruck_old_sales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Record has been deleted',
      });

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete record';
      toast({
        title: 'Delete Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Delete import batch and all its records
  const deleteImportBatch = useCallback(async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('sinotruck_old_sales_imports')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Import batch and all its records have been deleted',
      });

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete import batch';
      toast({
        title: 'Delete Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    loading,
    records,
    importBatches,
    fetchOldSales,
    fetchImportBatches,
    importOldSales,
    convertToQuotation,
    createOrderFromOldSale,
    deleteOldSale,
    deleteImportBatch,
    getMissingFields,
  };
};
