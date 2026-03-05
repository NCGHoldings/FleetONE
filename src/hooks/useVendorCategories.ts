import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface VendorCategory {
  id: string;
  company_id: string;
  category_code: string;
  category_name: string;
  description: string | null;
  ap_account_id: string | null;
  expense_account_id: string | null;
  advance_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useVendorCategories() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["vendor-categories", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("vendor_categories")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("category_code");
      if (error) throw error;
      return data as VendorCategory[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useActiveVendorCategories() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["vendor-categories", effectiveCompanyId, "active"],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("vendor_categories")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("is_active", true)
        .order("category_name");
      if (error) throw error;
      return data as VendorCategory[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useCreateVendorCategory() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (category: {
      category_code: string;
      category_name: string;
      description?: string;
      ap_account_id?: string | null;
      expense_account_id?: string | null;
      advance_account_id?: string | null;
      is_active?: boolean;
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      if (!effectiveCompanyId) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("vendor_categories")
        .insert([{ ...category, company_id: effectiveCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-categories"] });
      toast.success("Vendor category created");
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateVendorCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<VendorCategory>) => {
      const { data, error } = await supabase
        .from("vendor_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-categories"] });
      toast.success("Vendor category updated");
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeleteVendorCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vendor_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-categories"] });
      toast.success("Vendor category deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

/**
 * Resolves the correct AP GL accounts for a vendor based on priority:
 * 1. Vendor's category ap_account_id
 * 2. Global gl_settings trade_payable_account_id (fallback)
 */
export async function resolveVendorAPAccounts(
  vendorId: string,
  companyId: string
): Promise<{
  apAccountId: string | null;
  expenseAccountId: string | null;
  advanceAccountId: string | null;
  source: "category" | "global";
}> {
  const { data: vendor } = await supabase
    .from("vendors")
    .select(`
      vendor_category_id,
      vendor_categories (
        ap_account_id,
        expense_account_id,
        advance_account_id
      )
    `)
    .eq("id", vendorId)
    .single();

  const category = vendor?.vendor_categories as any;
  if (category?.ap_account_id) {
    return {
      apAccountId: category.ap_account_id,
      expenseAccountId: category.expense_account_id || null,
      advanceAccountId: category.advance_account_id || null,
      source: "category",
    };
  }

  // Global fallback
  const { data: glSettings } = await (supabase as any)
    .from("gl_settings")
    .select("trade_payable_account_id, default_expense_account_id")
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    apAccountId: glSettings?.trade_payable_account_id || null,
    expenseAccountId: glSettings?.default_expense_account_id || null,
    advanceAccountId: null,
    source: "global",
  };
}