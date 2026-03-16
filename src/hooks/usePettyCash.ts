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
  branch_id: string | null;
  fund_limit: number;
  low_balance_threshold: number;
  fund_type: string;
  approval_required_above: number;
  notes: string | null;
  // Joined
  custodian?: { staff_name: string } | null;
  branch?: { branch_name: string } | null;
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
  payee_name: string | null;
  expense_category: string | null;
  payment_method: string | null;
  reference_number: string | null;
  approved_by: string | null;
  status: string | null;
  voucher_number: string | null;
  attachment_url: string | null;
  branch_id: string | null;
  company_id: string | null;
  gl_account_id: string | null;
  // Joined
  fund?: { fund_name: string; business_unit_code: string } | null;
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
  staff?: { staff_name: string } | null;
}

// ============ Petty Cash Funds ============

export const usePettyCashFunds = (filters?: { branchId?: string; fundType?: string; businessUnit?: string }) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["petty-cash-funds", selectedCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("petty_cash_funds")
        .select(`
          *,
          custodian:staff_registry(staff_name),
          branch:school_branches(branch_name)
        `)
        .eq("is_active", true)
        .order("fund_name");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      if (filters?.branchId) {
        query = query.eq("branch_id", filters.branchId);
      }
      if (filters?.fundType && filters.fundType !== "all") {
        query = query.eq("fund_type", filters.fundType);
      }
      if (filters?.businessUnit && filters.businessUnit !== "all") {
        query = query.eq("business_unit_code", filters.businessUnit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PettyCashFund[];
    },
  });
};

export const usePettyCashTransactions = (fundId?: string, filters?: { status?: string; category?: string; dateFrom?: string; dateTo?: string }) => {
  return useQuery({
    queryKey: ["petty-cash-transactions", fundId, filters],
    queryFn: async () => {
      let query = supabase
        .from("petty_cash_transactions")
        .select(`
          *,
          fund:petty_cash_funds(fund_name, business_unit_code)
        `)
        .order("created_at", { ascending: false });

      if (fundId) {
        query = query.eq("petty_cash_fund_id", fundId);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.category && filters.category !== "all") {
        query = query.eq("expense_category", filters.category);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PettyCashTransaction[];
    },
    enabled: fundId ? true : false,
  });
};

export const useAllPettyCashTransactions = (filters?: {
  transactionType?: string; status?: string; category?: string;
  dateFrom?: string; dateTo?: string; branchId?: string;
}) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["petty-cash-all-transactions", selectedCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("petty_cash_transactions")
        .select(`
          *,
          fund:petty_cash_funds(fund_name, business_unit_code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      if (filters?.transactionType && filters.transactionType !== "all") {
        query = query.eq("transaction_type", filters.transactionType);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.category && filters.category !== "all") {
        query = query.eq("expense_category", filters.category);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }
      if (filters?.branchId) {
        query = query.eq("branch_id", filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PettyCashTransaction[];
    },
  });
};

export const useCreatePettyCashFund = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<PettyCashFund>) => {
      const { data: result, error } = await supabase
        .from("petty_cash_funds")
        .insert({
          fund_name: data.fund_name || "New Fund",
          business_unit_code: data.business_unit_code || "SBO",
          company_id: selectedCompanyId,
          custodian_id: data.custodian_id,
          opening_balance: data.opening_balance || 0,
          current_balance: data.opening_balance || 0,
          gl_account_id: data.gl_account_id,
          branch_id: data.branch_id || null,
          fund_limit: data.fund_limit || 0,
          low_balance_threshold: data.low_balance_threshold || 0,
          fund_type: data.fund_type || "main",
          approval_required_above: data.approval_required_above || 0,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      toast({ title: "Petty Cash Fund Created", description: "The petty cash fund has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdatePettyCashFund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PettyCashFund> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("petty_cash_funds")
        .update({
          fund_name: data.fund_name,
          business_unit_code: data.business_unit_code,
          custodian_id: data.custodian_id,
          gl_account_id: data.gl_account_id,
          branch_id: data.branch_id as string | undefined,
          fund_limit: data.fund_limit,
          low_balance_threshold: data.low_balance_threshold,
          fund_type: data.fund_type,
          approval_required_above: data.approval_required_above,
          notes: data.notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      toast({ title: "Fund Updated", description: "The petty cash fund has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeactivatePettyCashFund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fundId: string) => {
      const { error } = await supabase
        .from("petty_cash_funds")
        .update({ is_active: false })
        .eq("id", fundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      toast({ title: "Fund Deactivated", description: "The petty cash fund has been deactivated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useCreatePettyCashTransaction = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<PettyCashTransaction>) => {
      const { data: result, error } = await supabase
        .from("petty_cash_transactions")
        .insert({
          petty_cash_fund_id: data.petty_cash_fund_id!,
          transaction_type: data.transaction_type || "disbursement",
          expense_request_id: data.expense_request_id,
          amount: data.amount || 0,
          balance_after: 0,
          receipt_number: data.receipt_number,
          description: data.description,
          payee_name: data.payee_name || null,
          expense_category: data.expense_category || null,
          payment_method: data.payment_method || "cash",
          reference_number: data.reference_number || null,
          status: data.status || "approved",
          attachment_url: data.attachment_url || null,
          branch_id: data.branch_id || null,
          company_id: selectedCompanyId,
          gl_account_id: data.gl_account_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // ========== AUTO GL POSTING ==========
      if (selectedCompanyId && data.amount && data.amount > 0) {
        try {
          // Get the fund's GL account
          const { data: fund } = await supabase
            .from("petty_cash_funds")
            .select("gl_account_id, fund_name")
            .eq("id", data.petty_cash_fund_id!)
            .single();

          const fundGLAccountId = fund?.gl_account_id;
          const expenseGLAccountId = data.gl_account_id; // transaction-level expense account

          if (fundGLAccountId && data.transaction_type === "disbursement" && expenseGLAccountId) {
            // Disbursement: DR Expense → CR Petty Cash Fund
            const { postPettyCashDisbursementToGL } = await import("@/lib/gl-posting-utils");
            const glResult = await postPettyCashDisbursementToGL({
              voucherNumber: data.voucher_number || data.receipt_number || result.id.substring(0, 8),
              transactionDate: new Date().toISOString().split("T")[0],
              amount: data.amount,
              expenseAccountId: expenseGLAccountId,
              pettyCashFundAccountId: fundGLAccountId,
              companyId: selectedCompanyId,
              description: data.description || undefined,
              payeeName: data.payee_name || undefined,
            });

            if (glResult.success && glResult.journalEntryId) {
              await supabase
                .from("petty_cash_transactions")
                .update({ journal_entry_id: glResult.journalEntryId })
                .eq("id", result.id);
            } else if (!glResult.success) {
              console.warn("[Petty Cash GL] Disbursement GL posting failed:", glResult.error);
            }
          } else if (fundGLAccountId && data.transaction_type === "replenishment") {
            // Replenishment: DR Petty Cash Fund → CR Bank
            // Look for a default bank GL account
            const { data: glSettings } = await (supabase as any)
              .from("gl_settings")
              .select("bank_account_id")
              .eq("company_id", selectedCompanyId)
              .maybeSingle();

            let bankGLAccountId = glSettings?.bank_account_id;

            // If no GL setting, try the first active bank account's GL link
            if (!bankGLAccountId) {
              const { data: bankAcct } = await supabase
                .from("bank_accounts")
                .select("gl_account_id")
                .eq("company_id", selectedCompanyId)
                .eq("is_active", true)
                .limit(1)
                .single();
              bankGLAccountId = bankAcct?.gl_account_id;
            }

            if (bankGLAccountId) {
              const { postPettyCashReplenishmentToGL } = await import("@/lib/gl-posting-utils");
              const glResult = await postPettyCashReplenishmentToGL({
                referenceNumber: data.reference_number || result.id.substring(0, 8),
                transactionDate: new Date().toISOString().split("T")[0],
                amount: data.amount,
                pettyCashFundAccountId: fundGLAccountId,
                bankAccountId: bankGLAccountId,
                companyId: selectedCompanyId,
                fundName: fund?.fund_name || undefined,
              });

              if (glResult.success && glResult.journalEntryId) {
                await supabase
                  .from("petty_cash_transactions")
                  .update({ journal_entry_id: glResult.journalEntryId })
                  .eq("id", result.id);
              } else if (!glResult.success) {
                console.warn("[Petty Cash GL] Replenishment GL posting failed:", glResult.error);
              }
            }
          }
        } catch (glError) {
          // Non-blocking: transaction is saved, GL posting is best-effort
          console.error("[Petty Cash GL] Auto GL posting error:", glError);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-all-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: "Transaction Recorded", description: "The petty cash transaction has been recorded with GL posting." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const usePettyCashDashboard = () => {
  const { selectedCompanyId } = useCompany();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return useQuery({
    queryKey: ["petty-cash-dashboard", selectedCompanyId],
    queryFn: async () => {
      // Fetch funds
      let fundsQuery = supabase
        .from("petty_cash_funds")
        .select(`*, branch:school_branches(branch_name)`)
        .eq("is_active", true);
      if (selectedCompanyId) fundsQuery = fundsQuery.eq("company_id", selectedCompanyId);
      const { data: funds, error: fundsErr } = await fundsQuery;
      if (fundsErr) throw fundsErr;

      // Fetch this month's transactions
      let txnQuery = supabase
        .from("petty_cash_transactions")
        .select("*")
        .gte("created_at", monthStart);
      if (selectedCompanyId) txnQuery = txnQuery.eq("company_id", selectedCompanyId);
      const { data: transactions, error: txnErr } = await txnQuery;
      if (txnErr) throw txnErr;

      const totalBalance = (funds || []).reduce((s, f: any) => s + (f.current_balance || 0), 0);
      const activeFunds = (funds || []).length;
      const disbursedThisMonth = (transactions || [])
        .filter((t: any) => t.transaction_type === "disbursement")
        .reduce((s, t: any) => s + (t.amount || 0), 0);
      const replenishedThisMonth = (transactions || [])
        .filter((t: any) => t.transaction_type === "replenishment")
        .reduce((s, t: any) => s + (t.amount || 0), 0);

      const lowBalanceFunds = (funds || []).filter(
        (f: any) => f.low_balance_threshold > 0 && f.current_balance <= f.low_balance_threshold
      );

      // Branch-wise breakdown
      const branchMap = new Map<string, { name: string; balance: number; funds: number }>();
      for (const f of (funds || []) as any[]) {
        const branchName = f.branch?.branch_name || "Unassigned";
        const branchId = f.branch_id || "none";
        const existing = branchMap.get(branchId) || { name: branchName, balance: 0, funds: 0 };
        existing.balance += f.current_balance || 0;
        existing.funds += 1;
        branchMap.set(branchId, existing);
      }

      // Category-wise spending
      const categoryMap = new Map<string, number>();
      for (const t of (transactions || []) as any[]) {
        if (t.transaction_type === "disbursement" && t.expense_category) {
          categoryMap.set(t.expense_category, (categoryMap.get(t.expense_category) || 0) + t.amount);
        }
      }

      return {
        totalBalance,
        activeFunds,
        disbursedThisMonth,
        replenishedThisMonth,
        lowBalanceFunds: lowBalanceFunds as any[],
        branchBreakdown: Array.from(branchMap.entries()).map(([id, v]) => ({ id, ...v })),
        categoryBreakdown: Array.from(categoryMap.entries()).map(([cat, amount]) => ({ category: cat, amount })),
        recentTransactions: ((transactions || []) as any[]).slice(0, 10),
      };
    },
  });
};

// ============ IOU Hooks (unchanged) ============

export const useIOURecords = (filters?: { status?: string }) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["iou-records", selectedCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("iou_records")
        .select(`*, staff:staff_registry(staff_name)`)
        .order("created_at", { ascending: false });

      if (selectedCompanyId) query = query.eq("company_id", selectedCompanyId);
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);

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
          iou_number: "",
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

      // ========== AUTO GL POSTING (IOU Issuance) ==========
      // DR Staff Advance (Asset) → CR Cash/Petty Cash
      if (selectedCompanyId && data.amount && data.amount > 0) {
        try {
          // Find Staff Advance account
          const { data: advanceAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", selectedCompanyId)
            .eq("account_type", "asset")
            .eq("is_active", true)
            .or("account_name.ilike.%staff advance%,account_name.ilike.%employee advance%,account_name.ilike.%iou%")
            .limit(1);

          // Find Cash/Petty Cash account
          const { data: cashAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", selectedCompanyId)
            .eq("account_type", "asset")
            .eq("is_active", true)
            .or("account_name.ilike.%cash%,account_name.ilike.%petty cash%")
            .limit(1);

          const staffAdvanceId = advanceAccounts?.[0]?.id;
          const cashAccountId = cashAccounts?.[0]?.id;

          // Get staff name for description
          let staffName: string | undefined;
          if (data.staff_id) {
            const { data: staffData } = await supabase
              .from("staff_registry")
              .select("staff_name")
              .eq("id", data.staff_id)
              .single();
            staffName = staffData?.staff_name;
          }

          if (staffAdvanceId && cashAccountId) {
            const { postIOUIssuanceToGL } = await import("@/lib/gl-posting-utils");
            const glResult = await postIOUIssuanceToGL({
              iouNumber: (result as any).iou_number || result.id.substring(0, 8),
              issuedDate: data.issued_date || new Date().toISOString().split("T")[0],
              amount: data.amount,
              staffAdvanceAccountId: staffAdvanceId,
              cashAccountId: cashAccountId,
              companyId: selectedCompanyId,
              businessUnitCode: data.business_unit_code || undefined,
              staffName,
              purpose: data.purpose || undefined,
            });

            if (glResult.success && glResult.journalEntryId) {
              await supabase
                .from("iou_records")
                .update({ journal_entry_id: glResult.journalEntryId })
                .eq("id", result.id);
            } else if (!glResult.success) {
              console.warn("[IOU GL] Issuance GL posting failed:", glResult.error);
            }
          } else {
            console.warn("[IOU GL] Staff Advance or Cash account not found in COA, skipping GL posting");
          }
        } catch (glError) {
          console.error("[IOU GL] Auto GL posting error:", glError);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iou-records"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: "IOU Created", description: "The IOU record has been created with GL posting." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateIOU = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<IOURecord> & { id: string }) => {
      // Fetch current record to detect status change
      const { data: currentRecord } = await supabase
        .from("iou_records")
        .select("status, amount, iou_number, staff_id, company_id, business_unit_code, journal_entry_id")
        .eq("id", id)
        .single();

      const { data: result, error } = await supabase
        .from("iou_records")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // ========== AUTO GL POSTING (IOU Settlement) ==========
      // Only post GL when status changes to "settled"
      const companyId = selectedCompanyId || currentRecord?.company_id;
      const isBeingSettled = data.status === "settled" && currentRecord?.status !== "settled";

      if (isBeingSettled && companyId && currentRecord?.amount && currentRecord.amount > 0) {
        try {
          // Find Staff Advance account
          const { data: advanceAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", companyId)
            .eq("account_type", "asset")
            .eq("is_active", true)
            .or("account_name.ilike.%staff advance%,account_name.ilike.%employee advance%,account_name.ilike.%iou%")
            .limit(1);

          // Find a general expense account
          const { data: expenseAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", companyId)
            .eq("account_type", "expense")
            .eq("is_active", true)
            .limit(1);

          const staffAdvanceId = advanceAccounts?.[0]?.id;
          const expenseAccountId = expenseAccounts?.[0]?.id;

          // Get staff name
          let staffName: string | undefined;
          if (currentRecord.staff_id) {
            const { data: staffData } = await supabase
              .from("staff_registry")
              .select("staff_name")
              .eq("id", currentRecord.staff_id)
              .single();
            staffName = staffData?.staff_name;
          }

          if (staffAdvanceId && expenseAccountId) {
            const { postIOUSettlementToGL } = await import("@/lib/gl-posting-utils");
            const settledAmount = data.settled_amount || currentRecord.amount;

            const glResult = await postIOUSettlementToGL({
              iouNumber: currentRecord.iou_number || id.substring(0, 8),
              settlementDate: new Date().toISOString().split("T")[0],
              settledAmount,
              expenseAccountId,
              staffAdvanceAccountId: staffAdvanceId,
              companyId,
              businessUnitCode: currentRecord.business_unit_code || undefined,
              staffName,
            });

            if (glResult.success && glResult.journalEntryId) {
              // Update journal_entry_id only if not already set (don't override issuance JE)
              if (!currentRecord.journal_entry_id) {
                await supabase
                  .from("iou_records")
                  .update({ journal_entry_id: glResult.journalEntryId })
                  .eq("id", id);
              }
            } else if (!glResult.success) {
              console.warn("[IOU GL] Settlement GL posting failed:", glResult.error);
            }
          }
        } catch (glError) {
          console.error("[IOU GL] Settlement auto GL posting error:", glError);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iou-records"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: "IOU Updated", description: "The IOU record has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};
