import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface CustomerCategory {
  id: string;
  company_id: string;
  category_code: string;
  category_name: string;
  description: string | null;
  ar_account_id: string | null;
  revenue_account_id: string | null;
  advance_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomerCategories() {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["customer-categories", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("customer_categories")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("category_code");
      if (error) throw error;
      return data as CustomerCategory[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useActiveCustomerCategories() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["customer-categories", effectiveCompanyId, "active"],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("customer_categories")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("is_active", true)
        .order("category_name");
      if (error) throw error;
      return data as CustomerCategory[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useCreateCustomerCategory() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (category: {
      category_code: string;
      category_name: string;
      description?: string;
      ar_account_id?: string | null;
      revenue_account_id?: string | null;
      advance_account_id?: string | null;
      is_active?: boolean;
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      if (!effectiveCompanyId) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("customer_categories")
        .insert([{ ...category, company_id: effectiveCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
      toast.success("Customer category created");
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateCustomerCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CustomerCategory>) => {
      const { data, error } = await supabase
        .from("customer_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
      toast.success("Customer category updated");
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeleteCustomerCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
      toast.success("Customer category deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

/**
 * Resolves the correct AR GL accounts for a customer based on priority:
 * 1. Customer's own ar_account_id (individual override)
 * 2. Customer's category ar_account_id
 * 3. Global gl_settings trade_receivable_account_id (fallback)
 */
export async function resolveCustomerARAccounts(
  customerId: string,
  companyId: string
): Promise<{
  arAccountId: string | null;
  revenueAccountId: string | null;
  advanceAccountId: string | null;
  source: "customer" | "category" | "global";
}> {
  // Fetch customer with category join
  const { data: customer } = await supabase
    .from("customers")
    .select(`
      ar_account_id,
      customer_category_id,
      customer_categories (
        ar_account_id,
        revenue_account_id,
        advance_account_id
      )
    `)
    .eq("id", customerId)
    .single();

  // Priority 1: Customer-specific override
  if (customer?.ar_account_id) {
    return {
      arAccountId: customer.ar_account_id,
      revenueAccountId: null, // no customer-level revenue override
      advanceAccountId: null,
      source: "customer",
    };
  }

  // Priority 2: Category mapping
  const category = customer?.customer_categories as any;
  if (category?.ar_account_id) {
    return {
      arAccountId: category.ar_account_id,
      revenueAccountId: category.revenue_account_id || null,
      advanceAccountId: category.advance_account_id || null,
      source: "category",
    };
  }

  // Priority 3: Global fallback
  const { data: glSettings } = await (supabase as any)
    .from("gl_settings")
    .select("trade_receivable_account_id, sales_revenue_account_id, customer_advance_account_id")
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    arAccountId: glSettings?.trade_receivable_account_id || null,
    revenueAccountId: glSettings?.sales_revenue_account_id || null,
    advanceAccountId: glSettings?.customer_advance_account_id || null,
    source: "global",
  };
}
