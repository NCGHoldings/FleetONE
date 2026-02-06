import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface InterBankTransfer {
  id: string;
  company_id: string;
  transfer_number: string;
  transfer_date: string;
  from_bank_account_id: string;
  from_gl_account_id: string;
  to_bank_account_id: string;
  to_gl_account_id: string;
  amount: number;
  reference: string | null;
  notes: string | null;
  journal_entry_id: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterBankTransferInput {
  fromBankAccountId: string;
  toBankAccountId: string;
  amount: number;
  transferDate: string;
  reference?: string;
  notes?: string;
}

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

// Fetch inter-bank transfers
export function useInterBankTransfers() {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["inter-bank-transfers", effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inter_bank_transfers")
        .select(`
          *,
          from_bank:bank_accounts!inter_bank_transfers_from_bank_account_id_fkey(id, account_name, account_number, current_balance),
          to_bank:bank_accounts!inter_bank_transfers_to_bank_account_id_fkey(id, account_name, account_number, current_balance),
          from_gl:chart_of_accounts!inter_bank_transfers_from_gl_account_id_fkey(id, account_code, account_name),
          to_gl:chart_of_accounts!inter_bank_transfers_to_gl_account_id_fkey(id, account_code, account_name),
          journal_entry:journal_entries(id, entry_number, status)
        `)
        .eq("company_id", effectiveCompanyId)
        .order("transfer_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
}

// Generate transfer number
async function generateTransferNumber(): Promise<string> {
  const prefix = "IBT";
  const dateStr = format(new Date(), "yyyyMM");
  
  const { data: existing } = await supabase
    .from("inter_bank_transfers")
    .select("transfer_number")
    .ilike("transfer_number", `${prefix}-${dateStr}%`)
    .order("transfer_number", { ascending: false })
    .limit(1);

  let sequence = 1;
  if (existing && existing.length > 0) {
    const lastNumber = existing[0].transfer_number;
    const lastSequence = parseInt(lastNumber.split("-").pop() || "0", 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${dateStr}-${String(sequence).padStart(4, "0")}`;
}

// Create inter-bank transfer with GL posting
export function useCreateInterBankTransfer() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async (input: InterBankTransferInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Get bank account details with GL mappings
      const { data: fromBank, error: fromError } = await supabase
        .from("bank_accounts")
        .select("id, account_name, gl_account_id, current_balance")
        .eq("id", input.fromBankAccountId)
        .single();

      if (fromError || !fromBank) throw new Error("Source bank account not found");
      if (!fromBank.gl_account_id) throw new Error("Source bank has no GL account mapping");

      const { data: toBank, error: toError } = await supabase
        .from("bank_accounts")
        .select("id, account_name, gl_account_id, current_balance")
        .eq("id", input.toBankAccountId)
        .single();

      if (toError || !toBank) throw new Error("Destination bank account not found");
      if (!toBank.gl_account_id) throw new Error("Destination bank has no GL account mapping");

      // 2. Validate sufficient balance
      if ((fromBank.current_balance || 0) < input.amount) {
        throw new Error(`Insufficient balance in ${fromBank.account_name}. Available: ${fromBank.current_balance}`);
      }

      // 3. Generate transfer number
      const transferNumber = await generateTransferNumber();

      // 4. Create Journal Entry (DR To Bank / CR From Bank)
      const entryNumber = `IBT-JE-${format(new Date(), "yyyyMMddHHmmss")}`;
      
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: input.transferDate,
          description: `Inter-bank transfer: ${fromBank.account_name} → ${toBank.account_name}`,
          reference: transferNumber,
          total_debit: input.amount,
          total_credit: input.amount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // 5. Create journal entry lines
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: toBank.gl_account_id, // DR: To Bank (increase)
            description: `Transfer In from ${fromBank.account_name}`,
            debit: input.amount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: fromBank.gl_account_id, // CR: From Bank (decrease)
            description: `Transfer Out to ${toBank.account_name}`,
            debit: 0,
            credit: input.amount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // 6. Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // 7. Update bank account balances
      await supabase
        .from("bank_accounts")
        .update({ 
          current_balance: (fromBank.current_balance || 0) - input.amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.fromBankAccountId);

      await supabase
        .from("bank_accounts")
        .update({ 
          current_balance: (toBank.current_balance || 0) + input.amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.toBankAccountId);

      // 8. Create bank transactions for both accounts
      await supabase
        .from("bank_transactions")
        .insert([
          {
            bank_account_id: input.fromBankAccountId,
            company_id: effectiveCompanyId,
            transaction_date: input.transferDate,
            transaction_type: "transfer_out",
            description: `Transfer to ${toBank.account_name}`,
            reference: transferNumber,
            debit_amount: input.amount,
            credit_amount: 0,
            running_balance: (fromBank.current_balance || 0) - input.amount,
            journal_entry_id: journalEntry.id,
          },
          {
            bank_account_id: input.toBankAccountId,
            company_id: effectiveCompanyId,
            transaction_date: input.transferDate,
            transaction_type: "transfer_in",
            description: `Transfer from ${fromBank.account_name}`,
            reference: transferNumber,
            debit_amount: 0,
            credit_amount: input.amount,
            running_balance: (toBank.current_balance || 0) + input.amount,
            journal_entry_id: journalEntry.id,
          },
        ]);

      // 9. Create transfer record
      const { data: transfer, error: transferError } = await supabase
        .from("inter_bank_transfers")
        .insert({
          company_id: effectiveCompanyId,
          transfer_number: transferNumber,
          transfer_date: input.transferDate,
          from_bank_account_id: input.fromBankAccountId,
          from_gl_account_id: fromBank.gl_account_id,
          to_bank_account_id: input.toBankAccountId,
          to_gl_account_id: toBank.gl_account_id,
          amount: input.amount,
          reference: input.reference || null,
          notes: input.notes || null,
          journal_entry_id: journalEntry.id,
          status: "completed",
          created_by: user?.id,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inter-bank-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Inter-bank transfer completed successfully with GL posting");
    },
    onError: (error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });
}
