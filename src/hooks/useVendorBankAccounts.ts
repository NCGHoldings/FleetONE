import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface VendorBankAccount {
  id: string;
  vendor_id: string;
  company_id: string | null;
  account_label: string;
  bank_name: string;
  bank_branch: string | null;
  account_number: string;
  account_holder_name: string | null;
  is_default: boolean;
  created_at: string;
}

export function useVendorBankAccounts(vendorId: string | undefined) {
  return useQuery({
    queryKey: ["vendor-bank-accounts", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from("vendor_bank_accounts")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data as VendorBankAccount[];
    },
    enabled: !!vendorId,
  });
}

export function useSaveVendorBankAccounts() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      vendorId: string;
      accounts: Omit<VendorBankAccount, "id" | "vendor_id" | "company_id" | "created_at">[];
    }) => {
      // Delete existing accounts for this vendor
      await supabase
        .from("vendor_bank_accounts")
        .delete()
        .eq("vendor_id", params.vendorId);

      if (params.accounts.length === 0) return [];

      // Insert new accounts
      const { data, error } = await supabase
        .from("vendor_bank_accounts")
        .insert(
          params.accounts.map((acc) => ({
            vendor_id: params.vendorId,
            company_id: selectedCompanyId,
            account_label: acc.account_label,
            bank_name: acc.bank_name,
            bank_branch: acc.bank_branch,
            account_number: acc.account_number,
            account_holder_name: acc.account_holder_name,
            is_default: acc.is_default,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-bank-accounts", vars.vendorId] });
      toast.success("Bank accounts saved");
    },
    onError: (error) => {
      toast.error(`Failed to save bank accounts: ${error.message}`);
    },
  });
}
