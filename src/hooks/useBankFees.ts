import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export const useBankFees = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-fees", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("bank_fee_charges")
        .select("*")
        .order("fee_date", { ascending: false });

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

export const useBankFeesByPayment = (paymentId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-fees-by-payment", paymentId, selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_fee_charges")
        .select("*")
        .eq("ap_payment_id", paymentId!)
        .order("fee_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!paymentId && !!selectedCompanyId,
  });
};

export const useBankFeesByReceipt = (receiptId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-fees-by-receipt", receiptId, selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_fee_charges")
        .select("*")
        .eq("ar_receipt_id", receiptId!)
        .order("fee_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!receiptId && !!selectedCompanyId,
  });
};

export const useCreateBankFee = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (fee: {
      bank_account_id: string;
      fee_date: string;
      amount: number;
      fee_type: string;
      description?: string;
      ap_payment_id?: string;
      ar_receipt_id?: string;
      post_immediately?: boolean;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      const effectiveCompanyId = getEffectiveCompanyId();

      // 1. Insert bank fee record
      const { data: feeRecord, error: feeError } = await supabase
        .from("bank_fee_charges")
        .insert([{
          company_id: selectedCompanyId,
          bank_account_id: fee.bank_account_id,
          fee_date: fee.fee_date,
          amount: fee.amount,
          fee_type: fee.fee_type,
          description: fee.description,
          ap_payment_id: fee.ap_payment_id || null,
          ar_receipt_id: fee.ar_receipt_id || null,
          status: fee.post_immediately ? "posted" : "draft",
        }])
        .select()
        .single();

      if (feeError) throw feeError;

      // 2. Create bank transaction record
      const { data: bankTxn, error: txnError } = await supabase
        .from("bank_transactions")
        .insert([{
          bank_account_id: fee.bank_account_id,
          transaction_date: fee.fee_date,
          transaction_type: "bank_charge",
          description: `Bank Fee: ${fee.fee_type} - ${fee.description || ""}`.trim(),
          debit_amount: fee.amount,
          credit_amount: 0,
          reference: `FEE-${feeRecord.id.slice(0, 8)}`,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();

      if (!txnError && bankTxn) {
        await supabase
          .from("bank_fee_charges")
          .update({ bank_transaction_id: bankTxn.id })
          .eq("id", feeRecord.id);
      }

      // 3. Update bank balance
      const { data: bankAccount } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("id", fee.bank_account_id)
        .single();

      if (bankAccount) {
        await supabase
          .from("bank_accounts")
          .update({ current_balance: (bankAccount.current_balance || 0) - fee.amount })
          .eq("id", fee.bank_account_id);
      }

      // 4. Post to GL if requested
      if (fee.post_immediately) {
        // Find Bank Charges expense account
        const { data: expenseAccounts } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .eq("account_type", "expense")
          .eq("is_active", true)
          .ilike("account_name", "%bank charge%")
          .limit(1);

        // Find bank's GL account
        const { data: bankAccData } = await supabase
          .from("bank_accounts")
          .select("gl_account_id")
          .eq("id", fee.bank_account_id)
          .single();

        const expenseAccountId = expenseAccounts?.[0]?.id;
        const bankGLId = bankAccData?.gl_account_id;

        if (expenseAccountId && bankGLId) {
          const entryNumber = `BF-${Date.now()}`;

          const { data: journalEntry, error: jeError } = await supabase
            .from("journal_entries")
            .insert([{
              entry_number: entryNumber,
              entry_date: fee.fee_date,
              description: `Bank Fee: ${fee.description || fee.fee_type}`,
              total_debit: fee.amount,
              total_credit: fee.amount,
              status: "posted",
              posted_at: new Date().toISOString(),
              company_id: effectiveCompanyId,
            }])
            .select()
            .single();

          if (!jeError && journalEntry) {
            await supabase.from("journal_entry_lines").insert([
              {
                journal_entry_id: journalEntry.id,
                account_id: expenseAccountId,
                description: `Bank charge - ${fee.fee_type}`,
                debit: fee.amount,
                credit: 0,
                company_id: effectiveCompanyId,
              },
              {
                journal_entry_id: journalEntry.id,
                account_id: bankGLId,
                description: `Bank charge - ${fee.fee_type}`,
                debit: 0,
                credit: fee.amount,
                company_id: effectiveCompanyId,
              },
            ]);

            // Update COA balances
            for (const line of [
              { id: expenseAccountId, type: "expense", amount: fee.amount },
              { id: bankGLId, type: "asset", amount: -fee.amount },
            ]) {
              const { data: acc } = await supabase
                .from("chart_of_accounts")
                .select("current_balance")
                .eq("id", line.id)
                .single();
              if (acc) {
                await supabase
                  .from("chart_of_accounts")
                  .update({ current_balance: (acc.current_balance || 0) + line.amount })
                  .eq("id", line.id);
              }
            }

            await supabase
              .from("bank_fee_charges")
              .update({ journal_entry_id: journalEntry.id })
              .eq("id", feeRecord.id);
          }
        }
      }

      return feeRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-fees"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Bank fee recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record bank fee: ${error.message}`);
    },
  });
};

export const usePostBankFee = () => {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (feeId: string) => {
      const effectiveCompanyId = getEffectiveCompanyId();

      // Fetch the fee
      const { data: fee, error: fetchError } = await supabase
        .from("bank_fee_charges")
        .select("*")
        .eq("id", feeId)
        .single();

      if (fetchError) throw fetchError;
      if (fee.status === "posted") throw new Error("Fee is already posted");

      // Find accounts
      const { data: expenseAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", effectiveCompanyId)
        .eq("account_type", "expense")
        .eq("is_active", true)
        .ilike("account_name", "%bank charge%")
        .limit(1);

      const { data: bankAccData } = await supabase
        .from("bank_accounts")
        .select("gl_account_id")
        .eq("id", fee.bank_account_id)
        .single();

      const expenseAccountId = expenseAccounts?.[0]?.id;
      const bankGLId = bankAccData?.gl_account_id;

      if (!expenseAccountId || !bankGLId) {
        throw new Error("Missing GL account mapping for bank charges. Please configure a 'Bank Charges' expense account.");
      }

      const entryNumber = `BF-${Date.now()}`;
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_number: entryNumber,
          entry_date: fee.fee_date,
          description: `Bank Fee: ${fee.description || fee.fee_type}`,
          total_debit: fee.amount,
          total_credit: fee.amount,
          status: "posted",
          posted_at: new Date().toISOString(),
          company_id: effectiveCompanyId,
        }])
        .select()
        .single();

      if (jeError) throw jeError;

      await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: journalEntry.id,
          account_id: expenseAccountId,
          description: `Bank charge - ${fee.fee_type}`,
          debit: fee.amount,
          credit: 0,
          company_id: effectiveCompanyId,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: bankGLId,
          description: `Bank charge - ${fee.fee_type}`,
          debit: 0,
          credit: fee.amount,
          company_id: effectiveCompanyId,
        },
      ]);

      // Update balances
      for (const line of [
        { id: expenseAccountId, amount: fee.amount },
        { id: bankGLId, amount: -fee.amount },
      ]) {
        const { data: acc } = await supabase
          .from("chart_of_accounts")
          .select("current_balance")
          .eq("id", line.id)
          .single();
        if (acc) {
          await supabase
            .from("chart_of_accounts")
            .update({ current_balance: (acc.current_balance || 0) + line.amount })
            .eq("id", line.id);
        }
      }

      await supabase
        .from("bank_fee_charges")
        .update({ journal_entry_id: journalEntry.id, status: "posted" })
        .eq("id", feeId);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-fees"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Bank fee posted to GL");
    },
    onError: (error) => {
      toast.error(`Failed to post bank fee: ${error.message}`);
    },
  });
};
