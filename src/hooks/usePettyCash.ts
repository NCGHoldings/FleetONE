import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
export interface PettyCashFund {
  id: string;
  fund_name: string;
  fund_code: string | null;
  business_unit_code: string;
  company_id: string | null;
  custodian_id: string | null;
  opening_balance: number;
  current_balance: number;
  gl_account_id: string | null;
  is_active: boolean;
  last_replenished_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  custodian?: { staff_name: string } | null;
}

export interface PettyCashTransaction {
  id: string;
  petty_cash_fund_id: string;
  transaction_type: "disbursement" | "replenishment";
  expense_request_id: string | null;
  amount: number;
  balance_after: number;
  receipt_number: string | null;
  description: string | null;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface IOURecord {
  id: string;
  iou_number: string;
  business_unit_code: string;
  company_id: string | null;
  staff_id: string | null;
  amount: number;
  purpose: string | null;
  issued_date: string;
  due_date: string | null;
  settled_amount: number;
  balance: number;
  status: string;
  expense_request_ids: string[];
  journal_entry_id: string | null;
  issued_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  staff?: { staff_name: string } | null;
}

export const usePettyCashFunds = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["petty-cash-funds", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("petty_cash_funds")
        .select(`
          *,
          custodian:staff_registry(staff_name)
        `)
        .eq("is_active", true)
        .order("fund_name");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PettyCashFund[];
    },
  });
};

export const usePettyCashTransactions = (fundId?: string) => {
  return useQuery({
    queryKey: ["petty-cash-transactions", fundId],
    queryFn: async () => {
      let query = supabase
        .from("petty_cash_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (fundId) {
        query = query.eq("petty_cash_fund_id", fundId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PettyCashTransaction[];
    },
    enabled: !!fundId,
  });
};

export const useCreatePettyCashFund = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<PettyCashFund>) => {
      const insertData = {
        fund_name: data.fund_name || "New Fund",
        business_unit_code: data.business_unit_code || "SBO",
        company_id: selectedCompanyId,
        custodian_id: data.custodian_id,
        opening_balance: data.opening_balance || 0,
        current_balance: data.opening_balance || 0,
        gl_account_id: data.gl_account_id,
      };

      const { data: result, error } = await supabase
        .from("petty_cash_funds")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      toast({
        title: "Petty Cash Fund Created",
        description: "The petty cash fund has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreatePettyCashTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PettyCashTransaction>) => {
      const insertData = {
        petty_cash_fund_id: data.petty_cash_fund_id!,
        transaction_type: data.transaction_type || "disbursement",
        expense_request_id: data.expense_request_id,
        amount: data.amount || 0,
        balance_after: data.balance_after || 0,
        receipt_number: data.receipt_number,
        description: data.description,
      };

      const { data: result, error } = await supabase
        .from("petty_cash_transactions")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      toast({
        title: "Transaction Recorded",
        description: "The petty cash transaction has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// IOU Hooks
export const useIOURecords = (filters?: { status?: string }) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["iou-records", selectedCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("iou_records")
        .select(`
          *,
          staff:staff_registry(staff_name)
        `)
        .order("created_at", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as IOURecord[];
    },
  });
};

export const useCreateIOU = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<IOURecord>) => {
      const { data: result, error } = await supabase
        .from("iou_records")
        .insert([{
          iou_number: "", // Trigger will auto-generate
          business_unit_code: data.business_unit_code || "SBO",
          company_id: selectedCompanyId,
          staff_id: data.staff_id,
          amount: data.amount || 0,
          purpose: data.purpose,
          issued_date: data.issued_date || new Date().toISOString().split("T")[0],
          due_date: data.due_date,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iou-records"] });
      toast({
        title: "IOU Created",
        description: "The IOU record has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateIOU = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<IOURecord> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("iou_records")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iou-records"] });
      toast({
        title: "IOU Updated",
        description: "The IOU record has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
