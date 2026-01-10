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

export const useYutongOldSalesManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<OldSalesRecord[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);

  // Fetch old sales records with filters
  const fetchOldSales = useCallback(async (filters?: OldSalesFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('yutong_old_sales')
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
        .from('yutong_old_sales_imports')
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
        .from('yutong_old_sales_imports')
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
          .from('yutong_old_sales')
          .insert(batch);

        if (insertError) throw insertError;
      }

      // Update batch status to completed
      await supabase
        .from('yutong_old_sales_imports')
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

  // Convert old sale to quotation
  const convertToQuotation = useCallback(async (oldSaleId: string) => {
    setLoading(true);
    try {
      // Fetch the old sale record
      const { data: oldSale, error: fetchError } = await supabase
        .from('yutong_old_sales')
        .select('*')
        .eq('id', oldSaleId)
        .single();

      if (fetchError) throw fetchError;

      // Create quotation from old sale data
      const quotationData = {
        bus_model: oldSale.bus_model || 'Unknown Model',
        quantity: oldSale.quantity || 1,
        unit_price: oldSale.base_price || 0,
        discount_amount: oldSale.discount_amount || 0,
        vat_amount: oldSale.vat_amount || 0,
        total_price: oldSale.final_price || 0,
        advance_payment: oldSale.advance_payment || 0,
        responsible_person: oldSale.sales_person || null,
        status: 'draft' as const,
        notes: `Converted from old sale: ${oldSale.quotation_no || 'N/A'}`,
        company_name: oldSale.company_name || null,
        customer_address: oldSale.customer_address || null,
        customer_phone: oldSale.customer_phone || null,
        customer_email: oldSale.customer_email || null,
        special_features: oldSale.optional_specifications || null,
      };

      const { data: quotation, error: quotationError } = await supabase
        .from('yutong_quotations')
        .insert(quotationData)
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Update old sale with reference
      await supabase
        .from('yutong_old_sales')
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
  }, [toast]);

  // Create order from old sale
  const createOrderFromOldSale = useCallback(async (oldSaleId: string) => {
    setLoading(true);
    try {
      // First convert to quotation if not already
      const { data: oldSale } = await supabase
        .from('yutong_old_sales')
        .select('converted_to_quotation_id')
        .eq('id', oldSaleId)
        .single();

      let quotationId = oldSale?.converted_to_quotation_id;

      if (!quotationId) {
        const quotation = await convertToQuotation(oldSaleId);
        if (!quotation) throw new Error('Failed to create quotation');
        quotationId = quotation.id;
      }

      // Get quotation details for order
      const { data: quotation, error: quotationError } = await supabase
        .from('yutong_quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      // Create order from quotation
      const orderData = {
        bus_model: quotation.bus_model,
        quantity: quotation.quantity || 1,
        unit_price: quotation.unit_price || 0,
        total_price: quotation.total_price || 0,
        order_status: 'confirmed' as const,
      };

      const { data: order, error: orderError } = await supabase
        .from('yutong_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Update old sale with order reference
      await supabase
        .from('yutong_old_sales')
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
        .from('yutong_old_sales')
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
        .from('yutong_old_sales_imports')
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
  };
};
