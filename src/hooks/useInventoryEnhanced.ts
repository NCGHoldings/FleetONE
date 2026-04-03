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

// ============ Landed Cost GL Posting ============
export const usePostLandedCostToGL = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (voucherId: string) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      if (!effectiveCompanyId) throw new Error("No company selected");

      // 1. Fetch voucher
      const { data: voucher, error: vErr } = await supabase
        .from("landed_cost_vouchers")
        .select("*")
        .eq("id", voucherId)
        .single();
      if (vErr) throw vErr;
      if (voucher.status !== "draft") throw new Error("Only draft vouchers can be posted");
      if (voucher.journal_entry_id) throw new Error("Voucher already has a journal entry (double-post guard)");

      // 2. Fetch charges with expense accounts
      const { data: charges, error: cErr } = await supabase
        .from("landed_cost_charges")
        .select("*, chart_of_accounts(account_code, account_name)")
        .eq("voucher_id", voucherId);
      if (cErr) throw cErr;
      if (!charges || charges.length === 0) throw new Error("No charges found on this voucher");

      // Validate all charges have expense_account_id
      const missingAccounts = charges.filter(c => !c.expense_account_id);
      if (missingAccounts.length > 0) {
        throw new Error(`${missingAccounts.length} charge(s) missing expense account. Please assign GL accounts to all charges before posting.`);
      }

      // 3. Fetch items with their categories to get inventory_account_id
      const { data: lcItems, error: iErr } = await supabase
        .from("landed_cost_items")
        .select("*, items(item_code, item_name, category_id)")
        .eq("voucher_id", voucherId);
      if (iErr) throw iErr;
      if (!lcItems || lcItems.length === 0) throw new Error("No items found on this voucher");

      // Get unique category IDs to resolve inventory accounts
      const categoryIds = [...new Set(lcItems.map(i => i.items?.category_id).filter(Boolean))];
      let inventoryAccountId: string | null = null;

      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from("item_categories")
          .select("id, inventory_account_id")
          .in("id", categoryIds);
        
        // Use first category's inventory account (all items in same LCV typically share category)
        inventoryAccountId = categories?.[0]?.inventory_account_id || null;
      }

      // Fallback: try gl_settings for default inventory account
      if (!inventoryAccountId) {
        const { data: glSettings } = await supabase
          .from("gl_settings")
          .select("setting_value")
          .eq("company_id", effectiveCompanyId)
          .eq("setting_key", "inventory_account_id")
          .maybeSingle();
        inventoryAccountId = glSettings?.setting_value || null;
      }

      if (!inventoryAccountId) {
        throw new Error("No Inventory Account found. Please configure inventory_account_id in Item Categories or GL Settings.");
      }

      // 4. Build JE lines: DR Inventory / CR Expense per charge
      const { createAndPostJournalEntry, generateEntryNumber } = await import("@/lib/gl-posting-utils");
      
      const totalCharges = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
      const businessUnitCode = (selectedCompany as any)?.business_unit_code || voucher.business_unit_code || undefined;

      const jeLines: Array<{ account_id: string; description: string; debit: number; credit: number }> = [];

      for (const charge of charges) {
        const chargeName = charge.chart_of_accounts?.account_name || charge.charge_type || "Landed Cost";
        
        // DR Inventory Account (increase item valuation)
        jeLines.push({
          account_id: inventoryAccountId,
          description: `Landed Cost - ${chargeName} (${voucher.voucher_number})`,
          debit: charge.amount,
          credit: 0,
        });

        // CR Expense/Payable Account (source of the charge)
        jeLines.push({
          account_id: charge.expense_account_id!,
          description: `Landed Cost - ${chargeName} (${voucher.voucher_number})`,
          debit: 0,
          credit: charge.amount,
        });
      }

      // 5. Create and post JE
      const glResult = await createAndPostJournalEntry({
        entry_date: voucher.posting_date,
        description: `Landed Cost Voucher: ${voucher.voucher_number}`,
        reference: voucher.voucher_number,
        lines: jeLines,
        company_id: effectiveCompanyId,
        business_unit_code: businessUnitCode,
        source_module: "landed_cost",
      });

      if (!glResult.success) {
        throw new Error(glResult.error || "Failed to create journal entry");
      }

      // 6. Link JE to voucher and update status
      const { error: updateErr } = await supabase
        .from("landed_cost_vouchers")
        .update({
          journal_entry_id: glResult.journalEntryId,
          business_unit_code: businessUnitCode,
          status: "posted",
        })
        .eq("id", voucherId);
      if (updateErr) throw updateErr;

      // 7. Update items.standard_cost with final_cost
      for (const lcItem of lcItems) {
        if (lcItem.item_id && lcItem.final_cost) {
          await supabase
            .from("items")
            .update({ standard_cost: lcItem.final_cost })
            .eq("id", lcItem.item_id);
        }
      }

      return { journalEntryId: glResult.journalEntryId, voucherId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landed-cost-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: "Landed Cost posted to GL", description: "Journal entry created and item costs updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to post to GL", description: error.message, variant: "destructive" });
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
