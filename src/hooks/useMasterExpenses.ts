import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface MasterExpenseImport {
  id: string;
  file_name: string;
  upload_date: string;
  sector: string;
  expense_type: string;
  import_category?: string;
  mapping_config?: any;
  total_amount: number;
  status: string;
  company_id: string;
}

export interface MasterExpenseRecord {
  id: string;
  import_id: string;
  raw_data: any;
  expense_date: string | null;
  amount: number;
  document_number?: string | null;
  external_reference?: string | null;
  vendor_name?: string | null;
  customer_name?: string | null;
  business_unit?: string | null;
  chassis_no?: string | null;
  mapped_vehicle_id: string | null;
  mapped_quotation_id: string | null;
  mapped_vendor_id?: string | null;
  mapped_customer_id?: string | null;
  mapped_expense_account_id?: string | null;
  mapped_payment_account_id?: string | null;
  gl_journal_id?: string | null;
  is_confirmed: boolean;
  notes: string | null;
  
  // Joined fields for display
  buses?: { bus_no: string } | null;
  special_hire_quotations?: { quotation_no: string, customer_id: string } | null;
}

export const useMasterExpenses = () => {
  const { getEffectiveCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const companyId = getEffectiveCompanyId();

  const { data: imports = [], isLoading: isLoadingImports } = useQuery({
    queryKey: ["master_expense_imports", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from("master_expense_imports")
        .select("*")
        .eq("company_id", companyId)
        .order("upload_date", { ascending: false });
        
      if (error) {
        console.error("Failed to fetch imports:", error);
        throw error;
      }
      return (data || []) as MasterExpenseImport[];
    },
    enabled: !!companyId,
  });

  const getRecordsForImport = async (importId: string): Promise<MasterExpenseRecord[]> => {
    // First, fetch the raw records without joins (since these are new tables not in the type system)
    const { data, error } = await (supabase as any)
      .from("master_expense_records")
      .select("*")
      .eq("import_id", importId)
      .order("created_at", { ascending: true });
      
    if (error) {
      console.error("Failed to fetch records:", error);
      throw error;
    }
    
    return (data || []) as MasterExpenseRecord[];
  };

  const uploadExpenseSheet = useMutation({
    mutationFn: async ({
      fileName,
      sector,
      expenseType,
      importCategory = "Expense",
      mappingConfig = {},
      records
    }: {
      fileName: string;
      sector: string;
      expenseType: string;
      importCategory?: string;
      mappingConfig?: any;
      records: any[];
    }) => {
      if (!companyId) throw new Error("No active company");

      // 1. Create Import Record
      const totalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      
      const { data: importData, error: importError } = await (supabase as any)
        .from("master_expense_imports")
        .insert({
          company_id: companyId,
          file_name: fileName,
          sector,
          expense_type: expenseType,
          import_category: importCategory,
          mapping_config: mappingConfig,
          total_amount: totalAmount,
          status: "Pending Mapping"
        })
        .select()
        .single();

      if (importError) {
        console.error("Failed to create import:", importError);
        throw importError;
      }

      // 2. Insert Records
      const mappedRecords = records.map(r => ({
        import_id: importData.id,
        raw_data: r.raw_data,
        expense_date: r.expense_date,
        amount: r.amount || 0,
        document_number: r.document_number || null,
        external_reference: r.external_reference || null,
        vendor_name: r.vendor_name || null,
        customer_name: r.customer_name || null,
        business_unit: r.business_unit || null,
        chassis_no: r.chassis_no || null,
        mapped_vehicle_id: r.mapped_vehicle_id || null,
        mapped_quotation_id: r.mapped_quotation_id || null,
        mapped_vendor_id: r.mapped_vendor_id || null,
        mapped_customer_id: r.mapped_customer_id || null,
        is_confirmed: r.is_confirmed || false
      }));

      // Batch insert in chunks of 500 to avoid limits
      const CHUNK_SIZE = 500;
      for (let i = 0; i < mappedRecords.length; i += CHUNK_SIZE) {
        const chunk = mappedRecords.slice(i, i + CHUNK_SIZE);
        const { error: recordsError } = await (supabase as any)
          .from("master_expense_records")
          .insert(chunk);
          
        if (recordsError) {
          console.error("Failed to insert records chunk:", recordsError);
          throw recordsError;
        }
      }

      return importData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_expense_imports"] });
      toast.success("Expense sheet uploaded successfully");
    },
    onError: (error: any) => {
      toast.error("Upload failed", { description: error.message });
    }
  });
  
  const updateRecordMapping = useMutation({
    mutationFn: async ({ 
      recordId, 
      updates 
    }: { 
      recordId: string, 
      updates: Partial<MasterExpenseRecord> 
    }) => {
      const { error } = await (supabase as any)
        .from("master_expense_records")
        .update(updates)
        .eq("id", recordId);
        
      if (error) {
        console.error("Failed to update record:", error);
        throw error;
      }
      return true;
    },
    onSuccess: (_, variables) => {
       // Parent component handles refetching or local state updates.
    }
  });

  const deleteExpenseSheet = useMutation({
    mutationFn: async (importId: string) => {
      // Due to FK cascading, deleting the import should also delete associated records.
      // If no cascading is set up, we should delete records first.
      const { error: recordsError } = await (supabase as any)
        .from("master_expense_records")
        .delete()
        .eq("import_id", importId);
        
      if (recordsError) throw recordsError;

      const { error: importError } = await (supabase as any)
        .from("master_expense_imports")
        .delete()
        .eq("id", importId);

      if (importError) throw importError;
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_expense_imports"] });
      toast.success("Import deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete import", { description: error.message });
    }
  });

  return {
    imports,
    isLoadingImports,
    getRecordsForImport,
    uploadExpenseSheet,
    updateRecordMapping,
    deleteExpenseSheet
  };
};
