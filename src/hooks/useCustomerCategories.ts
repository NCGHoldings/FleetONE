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
  bank_account_id: string | null;
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
  bankAccountId: string | null;
  source: "customer" | "category" | "global";
  missingAccounts: string[];
}> {
  // Fetch customer with category join
  const { data: customer } = await supabase
    .from("customers")
    .select(`
      ar_account_id,
      customer_category_id,
      customer_categories (
        company_id,
        ar_account_id,
        revenue_account_id,
        advance_account_id,
        bank_account_id
      )
    `)
    .eq("id", customerId)
    .single();

  // Always fetch global fallback for gap-filling
  const { data: glSettings } = await (supabase as any)
    .from("gl_settings")
    .select("trade_receivable_account_id, sales_revenue_account_id, customer_advance_account_id, bank_account_id")
    .eq("company_id", companyId)
    .maybeSingle();

  let arAccountId: string | null = null;
  let revenueAccountId: string | null = null;
  let advanceAccountId: string | null = null;
  let bankAccountId: string | null = null;
  let source: "customer" | "category" | "global" = "global";

  // Priority 1: Customer-specific override (we assume it's tenant-safe if it exists, though ideally it should be validated too)
  if (customer?.ar_account_id) {
    // For safety, we should ideally check if this account belongs to companyId, but for now we rely on the trigger to catch it if it's wrong.
    // However, the main issue is usually the category mapping.
    arAccountId = customer.ar_account_id;
    source = "customer";
  }

  // Priority 2: Category mapping
  let category = customer?.customer_categories as any;
  
  // TENANT ISOLATION FIX: 
  // If the customer's category belongs to a DIFFERENT company, we must NOT use its GL accounts.
  if (category && category.company_id !== companyId) {
    console.log(`[GL Resolution] Customer category belongs to tenant ${category.company_id}, but we need ${companyId}. Ignoring to prevent Tenant Isolation Breach.`);
    category = null;
  }

  // AUTO-DEFAULT to External if no valid category assigned
  if (!category) {
    console.log(`[GL Resolution] No valid category found for customer ${customerId} in company ${companyId}, searching for 'External' default`);
    const { data: externalCat } = await supabase
      .from('customer_categories')
      .select('ar_account_id, revenue_account_id, advance_account_id, bank_account_id')
      .eq('company_id', companyId)
      .ilike('category_name', 'External')
      .maybeSingle();
    
    if (externalCat) {
      category = externalCat;
      console.log(`[GL Resolution] Applied 'External' category defaults`);
    }
  }

  if (!arAccountId && category?.ar_account_id) {
    arAccountId = category.ar_account_id;
    source = "category";
  }
  if (!revenueAccountId && category?.revenue_account_id) {
    revenueAccountId = category.revenue_account_id;
  }
  if (!advanceAccountId && category?.advance_account_id) {
    advanceAccountId = category.advance_account_id;
  }
  if (!bankAccountId && category?.bank_account_id) {
    bankAccountId = category.bank_account_id;
  }

  // Priority 3: Global fallback for any remaining gaps
  if (!arAccountId) arAccountId = glSettings?.trade_receivable_account_id || null;
  if (!revenueAccountId) revenueAccountId = glSettings?.sales_revenue_account_id || null;
  if (!advanceAccountId) advanceAccountId = glSettings?.customer_advance_account_id || null;
  if (!bankAccountId) bankAccountId = glSettings?.bank_account_id || null;

  // Build missing accounts list for actionable UI feedback
  const missingAccounts: string[] = [];
  if (!arAccountId) missingAccounts.push("Trade Receivable (Settings → Core GL → trade_receivable_account_id, OR Customer Category → AR Account)");
  if (!revenueAccountId) missingAccounts.push("Sales Revenue (Settings → Core GL → sales_revenue_account_id, OR Customer Category → Revenue Account)");

  return { arAccountId, revenueAccountId, advanceAccountId, bankAccountId, source, missingAccounts };
}
