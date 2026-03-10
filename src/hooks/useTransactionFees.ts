/**
 * Transaction Fee System Hook
 * 
 * Handles automated commission/fee charging on payment transactions.
 * Posts to GL: DR Fee Receivable | CR Fee Revenue
 * 
 * Following the same pattern as useCommissionFinance.ts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionFeeSettings {
    is_enabled: boolean;
    fee_percentage: number;
    fee_revenue_account_id: string | null;
    fee_receivable_account_id: string | null;
    auto_post_to_gl: boolean;
    gl_prefix: string;
    applicable_modules: string[];
}

export interface ChargeTransactionFeeInput {
    sourceModule: string;
    sourceTransactionId?: string;
    sourceReference?: string;
    transactionAmount: number;
    notes?: string;
}

export interface TransactionFeeRecord {
    id: string;
    company_id: string;
    source_module: string;
    source_transaction_id: string | null;
    source_reference: string | null;
    transaction_amount: number;
    fee_percentage: number;
    fee_amount: number;
    journal_entry_id: string | null;
    status: string;
    notes: string | null;
    created_at: string;
}

const DEFAULT_SETTINGS: TransactionFeeSettings = {
    is_enabled: false,
    fee_percentage: 0.5,
    fee_revenue_account_id: null,
    fee_receivable_account_id: null,
    auto_post_to_gl: true,
    gl_prefix: 'TXFEE',
    applicable_modules: ['all'],
};

// ─── Helper: Update COA balances from journal entry ───────────────────────────

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

        if (accountError || !account) continue;

        const netAmount = (line.debit || 0) - (line.credit || 0);
        const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
        const adjustment = isDebitNormal ? netAmount : -netAmount;

        await supabase
            .from("chart_of_accounts")
            .update({
                current_balance: (account.current_balance || 0) + adjustment,
                updated_at: new Date().toISOString(),
            })
            .eq("id", line.account_id);
    }
}

// ─── Fetch Settings ───────────────────────────────────────────────────────────

export function useTransactionFeeSettings() {
    const { getEffectiveCompanyId } = useCompany();
    const effectiveCompanyId = getEffectiveCompanyId();

    return useQuery({
        queryKey: ["transaction-fee-settings", effectiveCompanyId],
        queryFn: async (): Promise<TransactionFeeSettings> => {
            // Try dedicated table first
            const { data, error } = await supabase
                .from("transaction_fee_settings")
                .select("*")
                .eq("company_id", effectiveCompanyId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
                console.error("Error fetching transaction fee settings:", error);
            }

            if (data) {
                return {
                    is_enabled: data.is_enabled ?? false,
                    fee_percentage: data.fee_percentage ?? 0.5,
                    fee_revenue_account_id: data.fee_revenue_account_id,
                    fee_receivable_account_id: data.fee_receivable_account_id,
                    auto_post_to_gl: data.auto_post_to_gl ?? true,
                    gl_prefix: data.gl_prefix || 'TXFEE',
                    applicable_modules: data.applicable_modules || ['all'],
                };
            }

            return { ...DEFAULT_SETTINGS };
        },
    });
}

// ─── Save Settings ────────────────────────────────────────────────────────────

export function useSaveTransactionFeeSettings() {
    const queryClient = useQueryClient();
    const { getEffectiveCompanyId } = useCompany();
    const effectiveCompanyId = getEffectiveCompanyId();

    return useMutation({
        mutationFn: async (settings: TransactionFeeSettings) => {
            const { data, error } = await supabase
                .from("transaction_fee_settings")
                .upsert({
                    company_id: effectiveCompanyId,
                    is_enabled: settings.is_enabled,
                    fee_percentage: settings.fee_percentage,
                    fee_revenue_account_id: settings.fee_revenue_account_id,
                    fee_receivable_account_id: settings.fee_receivable_account_id,
                    auto_post_to_gl: settings.auto_post_to_gl,
                    gl_prefix: settings.gl_prefix,
                    applicable_modules: settings.applicable_modules,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "company_id",
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transaction-fee-settings"] });
            toast.success("Transaction fee settings saved successfully");
        },
        onError: (error) => {
            toast.error(`Failed to save settings: ${error.message}`);
        },
    });
}

// ─── Charge Transaction Fee ───────────────────────────────────────────────────

export function useChargeTransactionFee() {
    const queryClient = useQueryClient();
    const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
    const effectiveCompanyId = getEffectiveCompanyId();
    const businessUnitCode = getBusinessUnitCode();

    return useMutation({
        mutationFn: async ({
            input,
            settings,
        }: {
            input: ChargeTransactionFeeInput;
            settings: TransactionFeeSettings;
        }) => {
            // Validation
            if (!settings.is_enabled) {
                throw new Error("Transaction fees are not enabled");
            }
            if (input.transactionAmount <= 0) {
                throw new Error("Transaction amount must be greater than zero");
            }

            // Check if module is applicable
            const isApplicable = settings.applicable_modules.includes('all') ||
                settings.applicable_modules.includes(input.sourceModule);
            if (!isApplicable) {
                return null; // Skip — this module is not charged
            }

            // Calculate fee
            const feeAmount = Math.round((input.transactionAmount * settings.fee_percentage / 100) * 100) / 100;
            if (feeAmount <= 0) return null;

            // 1. Record the fee
            const { data: feeRecord, error: feeError } = await supabase
                .from("transaction_fees")
                .insert({
                    company_id: effectiveCompanyId,
                    source_module: input.sourceModule,
                    source_transaction_id: input.sourceTransactionId || null,
                    source_reference: input.sourceReference || null,
                    transaction_amount: input.transactionAmount,
                    fee_percentage: settings.fee_percentage,
                    fee_amount: feeAmount,
                    status: settings.auto_post_to_gl ? 'posted' : 'pending',
                    notes: input.notes || null,
                })
                .select()
                .single();

            if (feeError) throw feeError;

            // 2. Auto-post to GL if enabled and accounts are configured
            let journalEntryId: string | null = null;

            if (settings.auto_post_to_gl && settings.fee_receivable_account_id && settings.fee_revenue_account_id) {
                const prefix = settings.gl_prefix || 'TXFEE';
                const entryNumber = `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;
                const moduleLabel = input.sourceModule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                // Create Journal Entry
                const { data: journalEntry, error: jeError } = await supabase
                    .from("journal_entries")
                    .insert({
                        entry_number: entryNumber,
                        entry_date: format(new Date(), "yyyy-MM-dd"),
                        description: `Transaction Fee (${settings.fee_percentage}%) — ${moduleLabel}${input.sourceReference ? ` [${input.sourceReference}]` : ''}`,
                        reference: `TXFEE-${input.sourceModule}-${feeRecord.id.slice(0, 8)}`,
                        total_debit: feeAmount,
                        total_credit: feeAmount,
                        status: "posted",
                        company_id: effectiveCompanyId,
                        business_unit_code: businessUnitCode || "HQ",
                        business_unit_id: selectedCompanyId,
                        posted_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (jeError) throw jeError;
                journalEntryId = journalEntry.id;

                // Create journal entry lines: DR Fee Receivable | CR Fee Revenue
                const { error: linesError } = await supabase
                    .from("journal_entry_lines")
                    .insert([
                        {
                            journal_entry_id: journalEntry.id,
                            account_id: settings.fee_receivable_account_id,
                            description: `Transaction Fee Receivable — ${moduleLabel}`,
                            debit: feeAmount,
                            credit: 0,
                            company_id: effectiveCompanyId,
                        },
                        {
                            journal_entry_id: journalEntry.id,
                            account_id: settings.fee_revenue_account_id,
                            description: `Transaction Fee Revenue — ${moduleLabel}`,
                            debit: 0,
                            credit: feeAmount,
                            company_id: effectiveCompanyId,
                        },
                    ]);

                if (linesError) throw linesError;

                // Update COA balances
                await updateAccountBalancesFromJournalEntry(journalEntry.id);

                // Link journal entry to fee record
                await supabase
                    .from("transaction_fees")
                    .update({ journal_entry_id: journalEntry.id })
                    .eq("id", feeRecord.id);
            }

            return {
                feeId: feeRecord.id,
                feeAmount,
                journalEntryId,
                sourceModule: input.sourceModule,
            };
        },
        onSuccess: (data) => {
            if (data) {
                queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
                queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
                queryClient.invalidateQueries({ queryKey: ["transaction-fees-log"] });
            }
        },
        onError: (error) => {
            console.error("Transaction fee charge failed:", error);
        },
    });
}

// ─── Fee Log Query ────────────────────────────────────────────────────────────

export function useTransactionFeeLog(limit = 50) {
    const { getEffectiveCompanyId } = useCompany();
    const effectiveCompanyId = getEffectiveCompanyId();

    return useQuery({
        queryKey: ["transaction-fees-log", effectiveCompanyId, limit],
        queryFn: async (): Promise<TransactionFeeRecord[]> => {
            const { data, error } = await supabase
                .from("transaction_fees")
                .select("*")
                .eq("company_id", effectiveCompanyId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error && error.code !== '42P01') {
                console.error("Error fetching transaction fee log:", error);
                return [];
            }

            return (data || []) as TransactionFeeRecord[];
        },
    });
}

// ─── Fee Summary Stats ────────────────────────────────────────────────────────

export function useTransactionFeeSummary() {
    const { getEffectiveCompanyId } = useCompany();
    const effectiveCompanyId = getEffectiveCompanyId();

    return useQuery({
        queryKey: ["transaction-fees-summary", effectiveCompanyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("transaction_fees")
                .select("fee_amount, status, source_module, created_at")
                .eq("company_id", effectiveCompanyId);

            if (error && error.code !== '42P01') {
                console.error("Error fetching fee summary:", error);
                return { totalFees: 0, postedFees: 0, pendingFees: 0, transactionCount: 0, byModule: {} };
            }

            const records = data || [];
            const totalFees = records.reduce((s, r) => s + (r.fee_amount || 0), 0);
            const postedFees = records.filter(r => r.status === 'posted').reduce((s, r) => s + (r.fee_amount || 0), 0);
            const pendingFees = records.filter(r => r.status === 'pending').reduce((s, r) => s + (r.fee_amount || 0), 0);

            const byModule: Record<string, number> = {};
            records.forEach(r => {
                byModule[r.source_module] = (byModule[r.source_module] || 0) + (r.fee_amount || 0);
            });

            return { totalFees, postedFees, pendingFees, transactionCount: records.length, byModule };
        },
    });
}
