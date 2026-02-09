import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

// ============ Pick Lists ============
export const usePickLists = (status?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["pick-lists", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("pick_lists")
        .select(`
          *,
          sales_orders (
            so_number,
            customer_id,
            customers (
              customer_name
            )
          )
        `)
        .order("created_at", { ascending: false });
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const usePickListLines = (pickListId: string) => {
  return useQuery({
    queryKey: ["pick-list-lines", pickListId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pick_list_lines")
        .select(`
          *,
          items (
            item_code,
            item_name,
            unit_of_measure
          )
        `)
        .eq("pick_list_id", pickListId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!pickListId,
  });
};

export const useCreatePickList = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (pickList: {
      pick_number: string;
      sales_order_id: string;
      warehouse_id?: string;
      notes?: string;
      lines: {
        so_line_id: string;
        item_id: string;
        bin_location?: string;
        qty_to_pick: number;
      }[];
    }) => {
      const { lines, ...pickListData } = pickList;
      
      const { data: newPickList, error: pickListError } = await supabase
        .from("pick_lists")
        .insert({
          ...pickListData,
          company_id: selectedCompanyId,
          status: "draft",
        })
        .select()
        .single();
      
      if (pickListError) throw pickListError;
      
      const pickListLines = lines.map(line => ({
        pick_list_id: newPickList.id,
        so_line_id: line.so_line_id,
        item_id: line.item_id,
        bin_location: line.bin_location,
        qty_to_pick: line.qty_to_pick,
        qty_picked: 0,
      }));
      
      const { error: linesError } = await supabase
        .from("pick_list_lines")
        .insert(pickListLines);
      
      if (linesError) throw linesError;
      
      return newPickList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pick-lists"] });
      toast({ title: "Pick list created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create pick list", description: error.message, variant: "destructive" });
    },
  });
};

export const useCompletePicking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ pickListId, lines }: { 
      pickListId: string; 
      lines: { id: string; qty_picked: number; serial_numbers?: string[] }[] 
    }) => {
      // Update pick list lines
      for (const line of lines) {
        await supabase
          .from("pick_list_lines")
          .update({ 
            qty_picked: line.qty_picked,
            serial_numbers: line.serial_numbers,
          })
          .eq("id", line.id);
      }
      
      // Update pick list status
      await supabase
        .from("pick_lists")
        .update({ 
          status: "completed",
          picked_at: new Date().toISOString(),
        })
        .eq("id", pickListId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pick-lists"] });
      toast({ title: "Picking completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete picking", description: error.message, variant: "destructive" });
    },
  });
};

// ============ Landed Cost Vouchers ============
export const useLandedCostVouchers = (status?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["landed-cost-vouchers", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("landed_cost_vouchers")
        .select(`
          *,
          goods_receipt_notes (
            grn_number
          )
        `)
        .order("posting_date", { ascending: false });
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useLandedCostItems = (voucherId: string) => {
  return useQuery({
    queryKey: ["landed-cost-items", voucherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landed_cost_items")
        .select(`
          *,
          items (
            item_code,
            item_name
          )
        `)
        .eq("voucher_id", voucherId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!voucherId,
  });
};

export const useLandedCostCharges = (voucherId: string) => {
  return useQuery({
    queryKey: ["landed-cost-charges", voucherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landed_cost_charges")
        .select(`
          *,
          chart_of_accounts (
            account_code,
            account_name
          )
        `)
        .eq("voucher_id", voucherId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!voucherId,
  });
};

export const useCreateLandedCostVoucher = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (voucher: {
      voucher_number: string;
      grn_id: string;
      posting_date: string;
      allocation_method: "by_value" | "by_quantity" | "by_weight";
      notes?: string;
      items: {
        grn_line_id?: string;
        item_id: string;
        original_cost: number;
      }[];
      charges: {
        charge_type: string;
        description?: string;
        amount: number;
        expense_account_id?: string;
      }[];
    }) => {
      const { items, charges, ...voucherData } = voucher;
      
      const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
      const totalOriginalCost = items.reduce((sum, i) => sum + i.original_cost, 0);
      
      // Create voucher
      const { data: newVoucher, error: voucherError } = await supabase
        .from("landed_cost_vouchers")
        .insert({
          ...voucherData,
          company_id: selectedCompanyId,
          total_additional_cost: totalCharges,
          status: "draft",
        })
        .select()
        .single();
      
      if (voucherError) throw voucherError;
      
      // Calculate allocated costs based on method
      const voucherItems = items.map(item => {
        let allocatedCost = 0;
        
        if (voucher.allocation_method === "by_value") {
          allocatedCost = (item.original_cost / totalOriginalCost) * totalCharges;
        } else {
          allocatedCost = totalCharges / items.length;
        }
        
        return {
          voucher_id: newVoucher.id,
          grn_line_id: item.grn_line_id,
          item_id: item.item_id,
          original_cost: item.original_cost,
          allocated_cost: allocatedCost,
          final_cost: item.original_cost + allocatedCost,
        };
      });
      
      const { error: itemsError } = await supabase
        .from("landed_cost_items")
        .insert(voucherItems);
      
      if (itemsError) throw itemsError;
      
      // Create charges
      const voucherCharges = charges.map(charge => ({
        voucher_id: newVoucher.id,
        charge_type: charge.charge_type,
        description: charge.description,
        amount: charge.amount,
        expense_account_id: charge.expense_account_id,
      }));
      
      const { error: chargesError } = await supabase
        .from("landed_cost_charges")
        .insert(voucherCharges);
      
      if (chargesError) throw chargesError;
      
      return newVoucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landed-cost-vouchers"] });
      toast({ title: "Landed cost voucher created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create voucher", description: error.message, variant: "destructive" });
    },
  });
};

// ============ Unit of Measures ============
export const useUnitOfMeasures = () => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["unit-of-measures", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("unit_of_measures")
        .select("*")
        .order("uom_name");
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useUoMConversions = (itemId?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["uom-conversions", itemId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("uom_conversions")
        .select("*")
        .eq("is_active", true);
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      if (itemId) {
        query = query.eq("item_id", itemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useCreateUoM = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (uom: { uom_name: string; uom_symbol?: string }) => {
      const { data, error } = await supabase
        .from("unit_of_measures")
        .insert({ ...uom, company_id: selectedCompanyId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-of-measures"] });
      toast({ title: "Unit of measure created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create UoM", description: error.message, variant: "destructive" });
    },
  });
};

export const useCreateUoMConversion = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (conversion: {
      item_id?: string;
      from_uom: string;
      to_uom: string;
      conversion_factor: number;
    }) => {
      const { data, error } = await supabase
        .from("uom_conversions")
        .insert({ ...conversion, company_id: selectedCompanyId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uom-conversions"] });
      toast({ title: "UoM conversion created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create conversion", description: error.message, variant: "destructive" });
    },
  });
};
