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
  custodian_name: string | null;
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
      // Helper: convert empty strings to null for UUID columns
      const uuidOrNull = (val: any): string | null => (val && typeof val === 'string' && val.trim().length > 0) ? val.trim() : null;

      const { data: result, error } = await supabase
        .from("petty_cash_funds")
        .insert({
          fund_name: data.fund_name || "New Fund",
          business_unit_code: data.business_unit_code || "SBO",
          company_id: selectedCompanyId,
          custodian_id: uuidOrNull(data.custodian_id),
          custodian_name: data.custodian_name || null,
          opening_balance: data.opening_balance || 0,
          current_balance: data.opening_balance || 0,
          gl_account_id: uuidOrNull(data.gl_account_id),
          branch_id: uuidOrNull(data.branch_id as string),
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
      // Helper: convert empty strings to null for UUID columns (PostgreSQL rejects '' for uuid type)
      const uuidOrNull = (val: any): string | null => (val && typeof val === 'string' && val.trim().length > 0) ? val.trim() : null;

      const updatePayload: any = {
        fund_name: data.fund_name,
        business_unit_code: data.business_unit_code || null,
        custodian_id: uuidOrNull(data.custodian_id),
        custodian_name: data.custodian_name || null,
        gl_account_id: uuidOrNull(data.gl_account_id),
        branch_id: uuidOrNull(data.branch_id as string),
        fund_limit: data.fund_limit,
        low_balance_threshold: data.low_balance_threshold,
        fund_type: data.fund_type,
        approval_required_above: data.approval_required_above,
        notes: data.notes || null,
      };

      // Allow company_id reassignment (for moving fund between sections)
      if (uuidOrNull(data.company_id)) {
        updatePayload.company_id = uuidOrNull(data.company_id);
      }

      const { data: result, error } = await supabase
        .from("petty_cash_funds")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // If company_id is being reassigned, forcefully update all historical transactions 
      // so they move with the fund to the new company dashboard.
      if (updatePayload.company_id) {
        await supabase
          .from("petty_cash_transactions")
          .update({ company_id: updatePayload.company_id })
          .eq("petty_cash_fund_id", id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
      toast({ title: "Fund Updated", description: "The petty cash fund and its linked transactions have been updated." });
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
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<PettyCashTransaction>) => {
      const amount = data.amount || 0;
      const txnType = data.transaction_type || "disbursement";

      // 1. DEFENSIVE RE-READ: Always fetch the fund's LIVE current_balance right before computing
      const { data: fund, error: fundError } = await supabase
        .from("petty_cash_funds")
        .select("gl_account_id, current_balance, fund_name, business_unit_code, company_id, fund_limit")
        .eq("id", data.petty_cash_fund_id!)
        .single();

      if (fundError || !fund) {
        throw new Error(`Failed to read fund balance: ${fundError?.message || "Fund not found"}`);
      }

      // 2. Calculate balance_after from LIVE balance (not cached/stale value)
      const liveBalance = fund.current_balance || 0;
      const newBalance = txnType === "disbursement"
        ? liveBalance - amount
        : liveBalance + amount;

      // Guard: prevent negative balance on disbursement
      if (txnType === "disbursement" && newBalance < 0) {
        throw new Error(`Insufficient fund balance. Available: LKR ${liveBalance.toLocaleString()}, Requested: LKR ${amount.toLocaleString()}`);
      }

      // 3. Insert the transaction with the accurate balance_after
      const { data: result, error } = await supabase
        .from("petty_cash_transactions")
        .insert({
          petty_cash_fund_id: data.petty_cash_fund_id!,
          transaction_type: txnType,
          expense_request_id: data.expense_request_id || null,
          amount,
          balance_after: newBalance,
          receipt_number: data.receipt_number || null,
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

      // 4. Update the fund's main balance + last_replenished_at for replenishments
      const fundUpdate: any = { current_balance: newBalance, updated_at: new Date().toISOString() };
      if (txnType === "replenishment") {
        fundUpdate.last_replenished_at = new Date().toISOString();
      }
      await supabase
        .from("petty_cash_funds")
        .update(fundUpdate)
        .eq("id", data.petty_cash_fund_id!);

      // 5. AUTO-CREATE AP PAYMENT for replenishments (audit-grade visibility)
      if (txnType === "replenishment" && amount > 0) {
        try {
          const effectiveCompanyId = getEffectiveCompanyId() || selectedCompanyId;
          const businessUnitCode = getBusinessUnitCode() || fund.business_unit_code || null;
          const paymentNumber = `PC-REPL-${Date.now().toString().slice(-8)}`;

          const { data: apPayment } = await supabase
            .from("ap_payments")
            .insert([{
              payment_number: paymentNumber,
              payment_date: new Date().toISOString().split("T")[0],
              amount: amount,
              payment_method: data.payment_method || "cash",
              reference: data.reference_number || null,
              notes: `Petty Cash Replenishment: ${fund.fund_name} | Ref: ${data.reference_number || "N/A"} | Balance After: LKR ${newBalance.toLocaleString()}`,
              status: "posted",
              company_id: effectiveCompanyId,
              business_unit_code: businessUnitCode,
              is_advance: false,
              is_direct_payment: true,
            } as any])
            .select()
            .single();

          if (apPayment) {
            // Link AP payment reference back to petty cash transaction description
            await supabase
              .from("petty_cash_transactions")
              .update({ description: `${data.description || "Replenishment"} [AP: ${paymentNumber}]` })
              .eq("id", result.id);
          }
        } catch (apErr) {
          console.error("AP Payment auto-creation failed (replenishment still saved):", apErr);
        }
      }

      // 6. Auto-create GL Journal Entry if fund has a GL account linked
      if (fund.gl_account_id && amount > 0) {
        try {
          const fundGLAccountId = fund.gl_account_id;
          let debitAccountId: string;
          let creditAccountId: string;
          let jeDescription: string;

          if (txnType === "disbursement") {
            // DR: Expense account (from transaction or fallback to a general expense)
            debitAccountId = data.gl_account_id || "";
            creditAccountId = fundGLAccountId;
            jeDescription = `Petty Cash Disbursement: ${data.description || data.expense_category || "Expense"} (${fund.fund_name})`;

            // If no specific GL account on the transaction, try to find one by expense category
            if (!debitAccountId && data.expense_category) {
              const { data: catAccount } = await supabase
                .from("chart_of_accounts")
                .select("id")
                .eq("company_id", selectedCompanyId!)
                .eq("account_type", "expense")
                .ilike("account_name", `%${data.expense_category}%`)
                .limit(1)
                .maybeSingle();
              debitAccountId = catAccount?.id || "";
            }

            // Final fallback: use gl_settings default_expense_account_id
            if (!debitAccountId) {
              const { data: glSettings } = await supabase
                .from("gl_settings" as any)
                .select("default_expense_account_id")
                .eq("company_id", selectedCompanyId!)
                .maybeSingle();
              debitAccountId = (glSettings as any)?.default_expense_account_id || "";
            }
          } else {
            // Replenishment: DR Petty Cash Fund / CR Bank
            debitAccountId = fundGLAccountId;
            jeDescription = `Petty Cash Replenishment: ${fund.fund_name}`;

            // Try to find bank account from gl_settings
            const { data: glSettings } = await supabase
              .from("gl_settings" as any)
              .select("bank_account_id")
              .eq("company_id", selectedCompanyId!)
              .maybeSingle();
            creditAccountId = (glSettings as any)?.bank_account_id || "";

            // Fallback: find any bank account in COA
            if (!creditAccountId) {
              const { data: bankAcct } = await supabase
                .from("chart_of_accounts")
                .select("id")
                .eq("company_id", selectedCompanyId!)
                .eq("account_type", "asset")
                .ilike("account_name", "%bank%")
                .limit(1)
                .maybeSingle();
              creditAccountId = bankAcct?.id || "";
            }
          }

          // Only create JE if we have both accounts
          if (debitAccountId && creditAccountId) {
            const entryNumber = `PC-${Date.now()}`;

            const { data: je, error: jeError } = await supabase
              .from("journal_entries")
              .insert({
                entry_number: entryNumber,
                entry_date: new Date().toISOString().split("T")[0],
                description: jeDescription,
                reference: result.receipt_number || result.voucher_number || `PC-TXN-${result.id?.slice(0, 8)}`,
                total_debit: amount,
                total_credit: amount,
                status: "posted",
                company_id: selectedCompanyId,
                posted_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!jeError && je) {
              // Create journal lines
              await supabase.from("journal_entry_lines").insert([
                {
                  journal_entry_id: je.id,
                  account_id: debitAccountId,
                  description: `${txnType === "disbursement" ? "Expense" : "Fund top-up"}: ${data.description || data.expense_category || fund.fund_name}`,
                  debit: amount,
                  credit: 0,
                  company_id: selectedCompanyId,
                },
                {
                  journal_entry_id: je.id,
                  account_id: creditAccountId,
                  description: `${txnType === "disbursement" ? "Petty cash payment" : "Bank transfer"}: ${fund.fund_name}`,
                  debit: 0,
                  credit: amount,
                  company_id: selectedCompanyId,
                },
              ]);

              // Update COA balances
              for (const acctId of [debitAccountId, creditAccountId]) {
                const { data: acct } = await supabase
                  .from("chart_of_accounts")
                  .select("current_balance, account_type")
                  .eq("id", acctId)
                  .single();

                if (acct) {
                  const isDebit = acctId === debitAccountId;
                  const isDebitNormal = ["asset", "expense"].includes(acct.account_type || "");
                  const adjustment = isDebit
                    ? (isDebitNormal ? amount : -amount)
                    : (isDebitNormal ? -amount : amount);

                  await supabase
                    .from("chart_of_accounts")
                    .update({ current_balance: (acct.current_balance || 0) + adjustment, updated_at: new Date().toISOString() })
                    .eq("id", acctId);
                }
              }

              // Link JE to transaction
              await supabase
                .from("petty_cash_transactions")
                .update({ journal_entry_id: je.id })
                .eq("id", result.id);
            }
          } else {
            console.warn("Petty cash GL posting skipped: missing debit or credit account", { debitAccountId, creditAccountId });
          }
        } catch (glErr) {
          console.error("Petty cash GL auto-post failed (transaction still saved):", glErr);
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
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      toast({ title: "Transaction Recorded", description: "The petty cash transaction has been recorded and posted to GL." });
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
      // Generate IOU number
      const { data: numData } = await supabase.rpc("generate_entity_number", {
        p_entity_type: "iou",
        p_company_id: selectedCompanyId,
      });
      const iouNumber = numData || `IOU-${Date.now().toString().slice(-6)}`;

      const { data: result, error } = await supabase
        .from("iou_records")
        .insert([{
          iou_number: iouNumber,
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

      // Auto-create GL Journal Entry: DR Staff Advance / CR Cash or Bank
      const amount = data.amount || 0;
      if (amount > 0 && selectedCompanyId) {
        try {
          // Find a staff advance / cash advance account
          let debitAccountId = "";
          const { data: advanceAcct } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", selectedCompanyId)
            .eq("account_type", "asset")
            .or("account_name.ilike.%advance%,account_name.ilike.%iou%,account_name.ilike.%staff receivable%")
            .limit(1)
            .maybeSingle();
          debitAccountId = advanceAcct?.id || "";

          // Fallback: use customer_advance_account_id from gl_settings
          if (!debitAccountId) {
            const { data: glSettings } = await supabase
              .from("gl_settings" as any)
              .select("customer_advance_account_id")
              .eq("company_id", selectedCompanyId)
              .maybeSingle();
            debitAccountId = (glSettings as any)?.customer_advance_account_id || "";
          }

          // Find credit account (cash or bank)
          let creditAccountId = "";
          const { data: glSettings2 } = await supabase
            .from("gl_settings" as any)
            .select("bank_account_id")
            .eq("company_id", selectedCompanyId)
            .maybeSingle();
          creditAccountId = (glSettings2 as any)?.bank_account_id || "";

          if (!creditAccountId) {
            const { data: cashAcct } = await supabase
              .from("chart_of_accounts")
              .select("id")
              .eq("company_id", selectedCompanyId)
              .eq("account_type", "asset")
              .or("account_name.ilike.%cash%,account_name.ilike.%bank%")
              .limit(1)
              .maybeSingle();
            creditAccountId = cashAcct?.id || "";
          }

          if (debitAccountId && creditAccountId) {
            const entryNumber = `IOU-${Date.now()}`;
            const { data: je, error: jeError } = await supabase
              .from("journal_entries")
              .insert({
                entry_number: entryNumber,
                entry_date: data.issued_date || new Date().toISOString().split("T")[0],
                description: `IOU Issued: ${data.purpose || "Staff Advance"} (${result.iou_number || result.id?.slice(0, 8)})`,
                reference: result.iou_number || `IOU-${result.id?.slice(0, 8)}`,
                total_debit: amount,
                total_credit: amount,
                status: "posted",
                company_id: selectedCompanyId,
                posted_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!jeError && je) {
              await supabase.from("journal_entry_lines").insert([
                {
                  journal_entry_id: je.id,
                  account_id: debitAccountId,
                  description: `Staff advance: ${data.purpose || "IOU"}`,
                  debit: amount,
                  credit: 0,
                  company_id: selectedCompanyId,
                },
                {
                  journal_entry_id: je.id,
                  account_id: creditAccountId,
                  description: `Cash/Bank disbursement for IOU`,
                  debit: 0,
                  credit: amount,
                  company_id: selectedCompanyId,
                },
              ]);

              // Update COA balances
              for (const acctId of [debitAccountId, creditAccountId]) {
                const { data: acct } = await supabase
                  .from("chart_of_accounts")
                  .select("current_balance, account_type")
                  .eq("id", acctId)
                  .single();
                if (acct) {
                  const isDebit = acctId === debitAccountId;
                  const isDebitNormal = ["asset", "expense"].includes(acct.account_type || "");
                  const adjustment = isDebit
                    ? (isDebitNormal ? amount : -amount)
                    : (isDebitNormal ? -amount : amount);
                  await supabase
                    .from("chart_of_accounts")
                    .update({ current_balance: (acct.current_balance || 0) + adjustment, updated_at: new Date().toISOString() })
                    .eq("id", acctId);
                }
              }

              // Link JE to IOU
              await supabase
                .from("iou_records")
                .update({ journal_entry_id: je.id })
                .eq("id", result.id);
            }
          } else {
            console.warn("IOU GL posting skipped: missing advance or cash/bank account");
          }
        } catch (glErr) {
          console.error("IOU GL auto-post failed (IOU still saved):", glErr);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iou-records"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: "IOU Created", description: "The IOU record has been created and posted to GL." });
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
      // Calculate balance if settling partially
      const updateData: any = { ...data };
      if (data.settled_amount !== undefined && data.status !== undefined) {
        // Get original IOU for proper balance calc
        const { data: origIou } = await supabase
          .from("iou_records")
          .select("amount")
          .eq("id", id)
          .single();
        if (origIou) {
          updateData.balance = Math.max(0, (origIou.amount || 0) - (data.settled_amount || 0));
        }
      }

      const { data: result, error } = await supabase
        .from("iou_records")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Auto-create GL reversal when IOU is settled or partially settled
      const shouldPostGL = (data.status === "settled" || data.status === "partially_settled") && selectedCompanyId;
      if (shouldPostGL) {
        try {
          // Get the original IOU to know the amount
          const settledAmount = (result as any).amount || data.settled_amount || 0;

          if (settledAmount > 0) {
            // Find staff advance account (same resolution as creation)
            let advanceAccountId = "";
            
            // Try gl_settings first (most reliable)
            const { data: glSettings } = await supabase
              .from("gl_settings" as any)
              .select("customer_advance_account_id, bank_account_id")
              .eq("company_id", selectedCompanyId)
              .maybeSingle();
            
            advanceAccountId = (glSettings as any)?.customer_advance_account_id || "";
            
            // Fallback: search COA
            if (!advanceAccountId) {
              const { data: advAcct } = await supabase
                .from("chart_of_accounts")
                .select("id")
                .eq("company_id", selectedCompanyId)
                .eq("account_type", "asset")
                .or("account_name.ilike.%advance%,account_name.ilike.%iou%,account_name.ilike.%receivable%,account_name.ilike.%prepaid%")
                .limit(1)
                .maybeSingle();
              advanceAccountId = advAcct?.id || "";
            }

            // Find cash/bank account
            let cashAccountId = (glSettings as any)?.bank_account_id || "";
            if (!cashAccountId) {
              const { data: cashAcct } = await supabase
                .from("chart_of_accounts")
                .select("id")
                .eq("company_id", selectedCompanyId)
                .eq("account_type", "asset")
                .or("account_name.ilike.%cash%,account_name.ilike.%bank%")
                .limit(1)
                .maybeSingle();
              cashAccountId = cashAcct?.id || "";
            }

            if (advanceAccountId && cashAccountId) {
              const entryNumber = `IOU-SETTLE-${Date.now()}`;
              const iouRef = (result as any).iou_number || `IOU-${id.slice(0, 8)}`;

              const { data: je, error: jeError } = await supabase
                .from("journal_entries")
                .insert({
                  entry_number: entryNumber,
                  entry_date: new Date().toISOString().split("T")[0],
                  description: `IOU Settlement: ${(result as any).purpose || "Staff Advance"} (${iouRef})`,
                  reference: iouRef,
                  total_debit: settledAmount,
                  total_credit: settledAmount,
                  status: "posted",
                  company_id: selectedCompanyId,
                  posted_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (!jeError && je) {
                // Settlement reversal: DR Cash/Bank (money comes back), CR Staff Advance (clear the advance)
                await supabase.from("journal_entry_lines").insert([
                  {
                    journal_entry_id: je.id,
                    account_id: cashAccountId,
                    description: `IOU settlement received: ${iouRef}`,
                    debit: settledAmount,
                    credit: 0,
                    company_id: selectedCompanyId,
                  },
                  {
                    journal_entry_id: je.id,
                    account_id: advanceAccountId,
                    description: `Staff advance cleared: ${iouRef}`,
                    debit: 0,
                    credit: settledAmount,
                    company_id: selectedCompanyId,
                  },
                ]);

                // Update COA balances
                for (const acctId of [cashAccountId, advanceAccountId]) {
                  const { data: acct } = await supabase
                    .from("chart_of_accounts")
                    .select("current_balance, account_type")
                    .eq("id", acctId)
                    .single();
                  if (acct) {
                    const isDebit = acctId === cashAccountId;
                    const isDebitNormal = ["asset", "expense"].includes(acct.account_type || "");
                    const adjustment = isDebit
                      ? (isDebitNormal ? settledAmount : -settledAmount)
                      : (isDebitNormal ? -settledAmount : settledAmount);
                    await supabase
                      .from("chart_of_accounts")
                      .update({ current_balance: (acct.current_balance || 0) + adjustment, updated_at: new Date().toISOString() })
                      .eq("id", acctId);
                  }
                }

                // Update IOU with journal entry link
                await supabase
                  .from("iou_records")
                  .update({ journal_entry_id: je.id })
                  .eq("id", id);
              }
            } else {
              console.warn("IOU settlement GL posting skipped: missing advance or cash/bank account", { advanceAccountId, cashAccountId });
            }
          }
        } catch (glErr) {
          console.error("IOU settlement GL auto-post failed (IOU still updated):", glErr);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iou-records"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: "IOU Updated", description: "The IOU record has been updated and posted to GL." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};
