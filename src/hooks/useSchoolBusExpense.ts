import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

// Helper function to update COA balances after journal entry creation
async function updateAccountBalancesFromJournalEntry(journalEntryId: string) {
  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit")
    .eq("journal_entry_id", journalEntryId);

  if (linesError) {
    console.error("Error fetching journal entry lines:", linesError);
    throw linesError;
  }

  if (!lines || lines.length === 0) return;

  for (const line of lines) {
    if (!line.account_id) continue;

    const { data: account, error: accountError } = await supabase
      .from("chart_of_accounts")
      .select("current_balance, account_type")
      .eq("id", line.account_id)
      .single();

    if (accountError || !account) {
      console.error("Error fetching account:", accountError);
      continue;
    }

    const netAmount = (line.debit || 0) - (line.credit || 0);
    const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
    const adjustment = isDebitNormal ? netAmount : -netAmount;

    const { error: updateError } = await supabase
      .from("chart_of_accounts")
      .update({
        current_balance: (account.current_balance || 0) + adjustment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.account_id);

    if (updateError) {
      console.error("Error updating account balance:", updateError);
    }
  }
}

// Fetch expense GL mappings for a branch
export function useExpenseGLMappings(branchId: string | null) {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["school-bus-expense-gl-mappings", selectedCompanyId, branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_bus_expense_gl_mappings")
        .select(`
          *,
          gl_account:chart_of_accounts(id, account_code, account_name)
        `)
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", branchId)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompanyId && !!branchId,
  });
}

// Update expense GL mappings
export function useUpdateExpenseGLMappings() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({
      branchId,
      expenseType,
      expenseCategory,
      glAccountId,
    }: {
      branchId: string;
      expenseType: string;
      expenseCategory?: string;
      glAccountId: string;
    }) => {
      const { data: existing } = await supabase
        .from("school_bus_expense_gl_mappings")
        .select("id")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", branchId)
        .eq("expense_type", expenseType)
        .eq("expense_category", expenseCategory || "")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("school_bus_expense_gl_mappings")
          .update({
            gl_account_id: glAccountId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("school_bus_expense_gl_mappings")
          .insert({
            company_id: selectedCompanyId,
            branch_id: branchId,
            expense_type: expenseType,
            expense_category: expenseCategory || null,
            gl_account_id: glAccountId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-bus-expense-gl-mappings"] });
      toast.success("Expense GL mapping updated");
    },
    onError: (error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });
}

// Fetch fleet buses for selection
export function useFleetBuses() {
  return useQuery({
    queryKey: ["fleet-buses-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no, model, type, capacity")
        .eq("status", "active")
        .order("bus_no");

      if (error) throw error;
      return data || [];
    },
  });
}

// Post expense to GL
export function usePostExpenseToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  // Use consolidated GL for NCG Holding hierarchy
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      expenseId,
      routeId,
      branchId,
      expenseType,
      description,
      amount,
      busNo,
      expenseDate,
    }: {
      expenseId: string;
      routeId: string;
      branchId: string;
      expenseType: string;
      description: string;
      amount: number;
      busNo?: string;
      expenseDate: string;
    }) => {
      // Get expense GL settings
      const { data: settings } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", branchId)
        .maybeSingle();

      // Fallback to default settings
      let effectiveSettings = settings;
      if (!settings) {
        const { data: defaultSettings } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .is("branch_id", null)
          .maybeSingle();
        effectiveSettings = defaultSettings;
      }

      if (!effectiveSettings?.auto_post_expenses) {
        // Auto-post disabled, skip GL posting
        return null;
      }

      // Get expense account based on type
      let expenseAccountId: string | null = null;

      // Check for branch-specific expense mapping first
      const { data: mapping } = await supabase
        .from("school_bus_expense_gl_mappings")
        .select("gl_account_id")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", branchId)
        .eq("expense_type", expenseType)
        .eq("is_active", true)
        .maybeSingle();

      if (mapping) {
        expenseAccountId = mapping.gl_account_id;
      } else {
        // Use default from settings based on expense type
        switch (expenseType) {
          case "fuel":
            expenseAccountId = effectiveSettings.fuel_expense_account_id;
            break;
          case "maintenance":
            expenseAccountId = effectiveSettings.maintenance_expense_account_id;
            break;
          case "salary":
            expenseAccountId = effectiveSettings.salary_expense_account_id;
            break;
          default:
            expenseAccountId = effectiveSettings.expense_account_id;
        }
      }

      if (!expenseAccountId) {
        throw new Error(`Expense account not configured for type: ${expenseType}`);
      }

      // Get cash/bank account for credit entry
      const cashAccountId = effectiveSettings.expense_cash_account_id || effectiveSettings.cash_account_id;
      if (!cashAccountId) {
        throw new Error("Cash/Bank account not configured for expenses");
      }

      // Create journal entry - use CONSOLIDATED GL for NCG Holding hierarchy
      const entryNumber = `SBS-EXP-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: expenseDate,
          description: `School Bus Expense - ${expenseType}: ${description}${busNo ? ` [${busNo}]` : ""}`,
          reference: `ROUTE-EXP-${expenseId}`,
          total_debit: amount,
          total_credit: amount,
          status: "posted",
          company_id: effectiveCompanyId, // Use NCG Holding for consolidated GL
          business_unit_code: "SBO", // Always tag School Bus as SBO
          business_unit_id: selectedCompanyId, // Original company for reference
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines - use consolidated company ID
      // DR: Expense Account (increases expense)
      // CR: Cash/Bank Account (decreases asset)
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: expenseAccountId,
            description: `${expenseType} - ${description}`,
            debit: amount,
            credit: 0,
            company_id: effectiveCompanyId, // Use consolidated GL company
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: cashAccountId,
            description: `Payment for ${expenseType}`,
            debit: 0,
            credit: amount,
            company_id: effectiveCompanyId, // Use consolidated GL company
          },
        ]);

      if (linesError) throw linesError;

      // Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // Update expense with GL reference
      await supabase
        .from("route_expenses")
        .update({
          journal_entry_id: journalEntry.id,
          posted_to_gl: true,
        })
        .eq("id", expenseId);

      return journalEntry;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
        queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
        toast.success("Expense posted to GL");
      }
    },
    onError: (error) => {
      console.error("GL posting error:", error);
      // Don't show error - expense was still recorded
    },
  });
}

// Enhanced expense creation with bus linkage and GL posting
export function useAddRouteExpenseWithGL() {
  const queryClient = useQueryClient();
  const postToGL = usePostExpenseToGL();

  return useMutation({
    mutationFn: async ({
      routeId,
      branchId,
      expense,
      busId,
      busNo,
    }: {
      routeId: string;
      branchId: string;
      expense: {
        expense_type: string;
        description: string;
        amount: number;
        expense_date?: string;
        expense_category?: string;
      };
      busId?: string;
      busNo?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create expense with bus linkage
      const { data: newExpense, error } = await supabase
        .from("route_expenses")
        .insert({
          route_id: routeId,
          branch_id: branchId,
          bus_id: busId || null,
          bus_no: busNo || null,
          ...expense,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Try to post to GL (async, non-blocking)
      try {
        await postToGL.mutateAsync({
          expenseId: newExpense.id,
          routeId,
          branchId,
          expenseType: expense.expense_type,
          description: expense.description,
          amount: expense.amount,
          busNo,
          expenseDate: expense.expense_date || format(new Date(), "yyyy-MM-dd"),
        });
      } catch (glError) {
        console.log("GL posting skipped or failed:", glError);
        // Continue - expense was still saved
      }

      return newExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-expenses"] });
      toast.success("Expense added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add expense: ${error.message}`);
    },
  });
}

// Post staff cost to GL
export function usePostStaffCostToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      staffCostId,
      branchId,
      staffName,
      role,
      amount,
      costDate,
    }: {
      staffCostId: string;
      branchId: string;
      staffName: string;
      role: string;
      amount: number;
      costDate: string;
    }) => {
      // Get finance settings for salary account
      const { data: settings } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", branchId)
        .maybeSingle();

      let effectiveSettings = settings;
      if (!settings) {
        const { data: defaultSettings } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .is("branch_id", null)
          .maybeSingle();
        effectiveSettings = defaultSettings;
      }

      if (!effectiveSettings?.salary_expense_account_id) {
        console.log("Salary expense account not configured, skipping GL posting");
        return null;
      }

      const cashAccountId = effectiveSettings.expense_cash_account_id || effectiveSettings.cash_account_id;
      if (!cashAccountId) {
        console.log("Cash account not configured for staff costs, skipping GL posting");
        return null;
      }

      const entryNumber = `SBS-SAL-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: costDate,
          description: `School Bus Staff Cost - ${staffName} (${role})`,
          reference: `STAFF-${staffCostId}`,
          total_debit: amount,
          total_credit: amount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode || "SBO",
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // DR: Salary Expense, CR: Cash/Bank
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: effectiveSettings.salary_expense_account_id,
            description: `Salary - ${staffName} (${role})`,
            debit: amount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: cashAccountId,
            description: `Payment for staff salary - ${staffName}`,
            debit: 0,
            credit: amount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // Update staff cost record with GL reference
      await supabase
        .from("route_staff_costs")
        .update({
          journal_entry_id: journalEntry.id,
          posted_to_gl: true,
        } as any)
        .eq("id", staffCostId);

      return journalEntry;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
        queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
        toast.success("Staff cost posted to GL");
      }
    },
    onError: (error) => {
      console.error("Staff cost GL posting error:", error);
    },
  });
}
