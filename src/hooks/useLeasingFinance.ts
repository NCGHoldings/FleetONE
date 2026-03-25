/**
 * Leasing Finance Hook
 * Provides automated finance integration for fleet leasing:
 * - Vendor creation from lenders
 * - AP Invoice generation from amortization schedule
 * - GL posting on payment (DR Interest Exp + DR Liability / CR Bank)
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

// NCG Holding ID for consolidated GL
export const NCG_HOLDING_ID = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';
export const BUSINESS_UNIT_CODE = 'FLEET';

export interface LeasingFinanceSettings {
  id: string;
  company_id: string;
  business_unit_code: string;
  auto_create_vendor: boolean;
  bank_account_id: string | null;
  leasing_liability_account_id: string | null;
  interest_expense_account_id: string | null;
  lease_asset_account_id: string | null;
  auto_create_ap_invoice: boolean;
  auto_post_gl_on_payment: boolean;
  ap_prefix: string;
  gl_prefix: string;
}

export interface LoanPaymentData {
  id: string;
  payment_number: number;
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  total_installment: number;
  balance_remaining: number;
  payment_status: string;
  actual_payment_date?: string;
}

/**
 * Fetch leasing finance settings
 */
export async function fetchLeasingFinanceSettings(): Promise<LeasingFinanceSettings | null> {
  try {
    const { data, error } = await supabase
      .from('leasing_finance_settings')
      .select('*')
      .eq('company_id', NCG_HOLDING_ID)
      .maybeSingle();

    if (error) {
      console.error('[Leasing Finance] Error fetching settings:', error);
      return null;
    }

    return data as LeasingFinanceSettings | null;
  } catch (error) {
    console.error('[Leasing Finance] Exception fetching settings:', error);
    return null;
  }
}

/**
 * Create or get a Finance Vendor for a lender
 */
export async function createLenderVendor({
  lenderName,
  lenderContact,
  companyId = NCG_HOLDING_ID,
}: {
  lenderName: string;
  lenderContact?: string;
  companyId?: string;
}): Promise<string | null> {
  try {
    console.log('[Leasing Finance] Creating/Getting vendor for lender:', lenderName);

    // Try to find existing vendor by name
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('company_id', companyId)
      .ilike('vendor_name', lenderName)
      .limit(1)
      .maybeSingle();

    if (existingVendor?.id) {
      console.log('[Leasing Finance] Found existing vendor:', existingVendor.id);
      return existingVendor.id;
    }

    // Create new vendor with auto-generated code
    const vendorCode = `LEASE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const { data: newVendor, error: insertError } = await supabase
      .from('vendors')
      .insert([{
        company_id: companyId,
        vendor_code: vendorCode,
        vendor_name: lenderName,
        contact_person: lenderContact || null,
        vendor_type: 'financial_institution',
        business_unit_code: BUSINESS_UNIT_CODE,
        is_active: true,
        payment_terms: 30, // 30 days
      }])
      .select('id')
      .single();

    if (insertError) {
      console.error('[Leasing Finance] Vendor insert error:', insertError);
      return null;
    }

    console.log('[Leasing Finance] Created new vendor:', newVendor?.id);
    return newVendor?.id || null;
  } catch (error) {
    console.error('[Leasing Finance] Exception creating vendor:', error);
    return null;
  }
}

/**
 * Create AP Invoice from loan payment schedule
 */
export async function createLeasingAPInvoice({
  loanId,
  paymentData,
  vendorId,
  busNumber,
  lenderName,
  settings,
  companyId = NCG_HOLDING_ID,
}: {
  loanId: string;
  paymentData: LoanPaymentData;
  vendorId: string;
  busNumber: string;
  lenderName: string;
  settings: LeasingFinanceSettings;
  companyId?: string;
}): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  try {
    const prefix = settings.ap_prefix || 'LEASE-AP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const invoiceNumber = `${prefix}-${busNumber}-${paymentData.payment_number.toString().padStart(3, '0')}-${timestamp}`;

    // Due date is the scheduled payment date
    const dueDate = paymentData.payment_date;
    const invoiceDate = format(new Date(), 'yyyy-MM-dd');

    const { data: invoice, error: invoiceError } = await supabase
      .from('ap_invoices')
      .insert({
        company_id: companyId,
        vendor_id: vendorId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        total_amount: paymentData.total_installment,
        subtotal: paymentData.principal_amount,
        tax_amount: paymentData.interest_amount, // Interest treated as additional amount
        paid_amount: 0,
        balance: paymentData.total_installment,
        status: 'unpaid',
        reference: `Loan EMI #${paymentData.payment_number} for ${busNumber}`,
        business_unit_code: BUSINESS_UNIT_CODE,
        notes: `Principal: ${paymentData.principal_amount.toLocaleString()}, Interest: ${paymentData.interest_amount.toLocaleString()}`,
      })
      .select('id, invoice_number')
      .single();

    if (invoiceError) {
      console.error('[Leasing Finance] AP Invoice creation error:', invoiceError);
      return null;
    }

    // Create invoice lines for principal and interest
    const lines = [
      {
        invoice_id: invoice.id,
        company_id: companyId,
        description: `Principal Payment - EMI #${paymentData.payment_number}`,
        quantity: 1,
        unit_price: paymentData.principal_amount,
        line_total: paymentData.principal_amount,
        account_id: settings.leasing_liability_account_id,
      },
      {
        invoice_id: invoice.id,
        company_id: companyId,
        description: `Interest Payment - EMI #${paymentData.payment_number}`,
        quantity: 1,
        unit_price: paymentData.interest_amount,
        line_total: paymentData.interest_amount,
        account_id: settings.interest_expense_account_id,
      },
    ];

    await supabase.from('ap_invoice_lines').insert(lines);

    // ========== AUTO GL POSTING: DR Interest Expense + DR Lease Liability, CR Trade Payable ==========
    try {
      if (settings.leasing_liability_account_id && settings.interest_expense_account_id) {
        // Resolve trade payable from vendor category or global settings
        const { resolveVendorAPAccounts } = await import('@/hooks/useVendorCategories');
        const resolved = await resolveVendorAPAccounts(vendorId, companyId);
        const tradePayableId = resolved.apAccountId;

        if (tradePayableId) {
          const { postAPInvoiceToGL } = await import('@/lib/gl-posting-utils');
          const glResult = await postAPInvoiceToGL({
            invoiceNumber: invoiceNumber,
            invoiceDate: invoiceDate,
            totalAmount: paymentData.total_installment,
            expenseAccountId: settings.interest_expense_account_id,
            tradePayableId: tradePayableId,
            companyId: companyId,
            businessUnitCode: BUSINESS_UNIT_CODE,
            vendorName: lenderName,
            expenseLines: [
              { accountId: settings.leasing_liability_account_id, amount: paymentData.principal_amount, description: `Principal - EMI #${paymentData.payment_number}` },
              { accountId: settings.interest_expense_account_id, amount: paymentData.interest_amount, description: `Interest - EMI #${paymentData.payment_number}` },
            ],
            sourceModule: 'leasing',
          });
          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from('ap_invoices')
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq('id', invoice.id);
            console.log('[Leasing Finance] GL posted for AP Invoice:', invoiceNumber);
          } else {
            console.warn('[Leasing Finance] GL posting failed:', glResult.error);
          }
        } else {
          console.warn('[Leasing Finance] Missing Trade Payable account for GL posting');
        }
      }
    } catch (glErr) {
      console.warn('[Leasing Finance] GL posting error:', glErr);
    }

    console.log('[Leasing Finance] Created AP Invoice:', invoice.invoice_number);
    return { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };
  } catch (error) {
    console.error('[Leasing Finance] Exception creating AP Invoice:', error);
    return null;
  }
}

/**
 * Post leasing payment to GL
 * DR Interest Expense (interest portion)
 * DR Leasing Liability (principal portion)
 * CR Bank Account (total EMI)
 */
export async function postLeasingPaymentToGL({
  paymentData,
  busNumber,
  lenderName,
  settings,
  busId,
  companyId = NCG_HOLDING_ID,
  apInvoiceId,
}: {
  paymentData: LoanPaymentData;
  busNumber: string;
  lenderName: string;
  settings: LeasingFinanceSettings;
  busId?: string;
  companyId?: string;
  apInvoiceId?: string;
}): Promise<{ journalEntryId: string; entryNumber: string } | null> {
  try {
    // Validate required accounts
    if (!settings.bank_account_id) {
      console.error('[Leasing Finance] Missing bank account');
      toast.error('Missing GL account configuration for bank');
      return null;
    }

    if (!settings.leasing_liability_account_id) {
      console.error('[Leasing Finance] Missing leasing liability account');
      toast.error('Missing GL account configuration for leasing liability');
      return null;
    }

    if (!settings.interest_expense_account_id) {
      console.error('[Leasing Finance] Missing interest expense account');
      toast.error('Missing GL account configuration for interest expense');
      return null;
    }

    const prefix = settings.gl_prefix || 'LEASE-GL';
    const description = `${BUSINESS_UNIT_CODE} EMI #${paymentData.payment_number} - ${busNumber} - ${lenderName}`;
    const reference = `${prefix}-${busNumber}-${paymentData.payment_number.toString().padStart(3, '0')}`;
    const entryNumber = `${prefix}-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create journal entry
    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert([{
        company_id: companyId,
        entry_number: entryNumber,
        entry_date: paymentData.actual_payment_date || format(new Date(), 'yyyy-MM-dd'),
        description,
        reference,
        status: 'posted',
        posted_at: new Date().toISOString(),
        total_debit: paymentData.total_installment,
        total_credit: paymentData.total_installment,
        business_unit_code: BUSINESS_UNIT_CODE,
      }])
      .select('id, entry_number')
      .single();

    if (jeError) {
      console.error('[Leasing Finance] Journal entry creation error:', jeError);
      toast.error('Failed to create GL entry');
      return null;
    }

    // Create journal entry lines
    const lines = [
      // DR Interest Expense
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.interest_expense_account_id,
        description: `Interest Expense - EMI #${paymentData.payment_number} - ${busNumber}`,
        debit: paymentData.interest_amount,
        credit: 0,
        company_id: companyId,
        bus_id: busId || null,
      },
      // DR Leasing Liability (reduce principal)
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.leasing_liability_account_id,
        description: `Principal Payment - EMI #${paymentData.payment_number} - ${busNumber}`,
        debit: paymentData.principal_amount,
        credit: 0,
        company_id: companyId,
        bus_id: busId || null,
      },
      // CR Bank Account
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.bank_account_id,
        description: `EMI Payment - ${busNumber} - ${lenderName}`,
        debit: 0,
        credit: paymentData.total_installment,
        company_id: companyId,
        bus_id: busId || null,
      },
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) {
      console.error('[Leasing Finance] Journal lines error:', linesError);
      // Cleanup: delete the journal entry
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      toast.error('Failed to create GL entry lines');
      return null;
    }

    // Update COA balances
    await updateCOABalances(lines);

    console.log('[Leasing Finance] Posted GL entry:', journalEntry.entry_number);
    return { journalEntryId: journalEntry.id, entryNumber: journalEntry.entry_number };
  } catch (error) {
    console.error('[Leasing Finance] Exception posting to GL:', error);
    toast.error('Failed to post to GL');
    return null;
  }
}

/**
 * Post initial loan recognition (Finance Lease)
 * DR Leased Asset
 * CR Leasing Liability
 */
export async function postInitialLoanToGL({
  loanAmount,
  busNumber,
  lenderName,
  settings,
  busId,
  companyId = NCG_HOLDING_ID,
}: {
  loanAmount: number;
  busNumber: string;
  lenderName: string;
  settings: LeasingFinanceSettings;
  busId?: string;
  companyId?: string;
}): Promise<{ journalEntryId: string; entryNumber: string } | null> {
  try {
    // Need both asset and liability accounts for initial recognition
    if (!settings.lease_asset_account_id) {
      console.log('[Leasing Finance] No asset account configured - skipping initial recognition');
      return null;
    }

    if (!settings.leasing_liability_account_id) {
      console.error('[Leasing Finance] Missing leasing liability account');
      toast.error('Missing GL account configuration for leasing liability');
      return null;
    }

    const prefix = settings.gl_prefix || 'LEASE-GL';
    const description = `${BUSINESS_UNIT_CODE} Loan Recognition - ${busNumber} - ${lenderName}`;
    const reference = `${prefix}-INIT-${busNumber}`;
    const entryNumber = `${prefix}-INIT-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create journal entry
    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert([{
        company_id: companyId,
        entry_number: entryNumber,
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        description,
        reference,
        status: 'posted',
        posted_at: new Date().toISOString(),
        total_debit: loanAmount,
        total_credit: loanAmount,
        business_unit_code: BUSINESS_UNIT_CODE,
      }])
      .select('id, entry_number')
      .single();

    if (jeError) {
      console.error('[Leasing Finance] Initial loan JE error:', jeError);
      return null;
    }

    // DR Asset / CR Liability
    const lines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.lease_asset_account_id,
        description: `Leased Asset - ${busNumber}`,
        debit: loanAmount,
        credit: 0,
        company_id: companyId,
        bus_id: busId || null,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.leasing_liability_account_id,
        description: `Lease Liability - ${busNumber} - ${lenderName}`,
        debit: 0,
        credit: loanAmount,
        company_id: companyId,
        bus_id: busId || null,
      },
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      return null;
    }

    await updateCOABalances(lines);

    console.log('[Leasing Finance] Posted initial loan recognition:', journalEntry.entry_number);
    return { journalEntryId: journalEntry.id, entryNumber: journalEntry.entry_number };
  } catch (error) {
    console.error('[Leasing Finance] Exception posting initial loan:', error);
    return null;
  }
}

/**
 * Update COA balances based on journal entry lines
 */
async function updateCOABalances(lines: Array<{
  account_id: string;
  debit: number;
  credit: number;
}>): Promise<void> {
  for (const line of lines) {
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .select('current_balance, account_type')
      .eq('id', line.account_id)
      .single();

    if (account) {
      const netAmount = line.debit - line.credit;
      // Debit normal accounts: Assets, Expenses
      // Credit normal accounts: Liabilities, Revenue, Equity
      const isDebitNormal = ['asset', 'expense'].includes(account.account_type);
      const adjustment = isDebitNormal ? netAmount : -netAmount;

      await supabase
        .from('chart_of_accounts')
        .update({ current_balance: (account.current_balance || 0) + adjustment })
        .eq('id', line.account_id);
    }
  }
}

/**
 * Process leasing payment with full finance integration
 * - Create AP Payment (if AP Invoice exists)
 * - Post GL entry
 * - Update loan payment record with finance links
 */
export async function processLeasingPaymentWithFinance({
  paymentId,
  loanId,
  paymentData,
  busId,
  busNumber,
  lenderName,
  vendorId,
  apInvoiceId,
}: {
  paymentId: string;
  loanId: string;
  paymentData: LoanPaymentData;
  busId: string;
  busNumber: string;
  lenderName: string;
  vendorId?: string;
  apInvoiceId?: string;
}): Promise<{ success: boolean; journalEntryId?: string; apPaymentId?: string; error?: string }> {
  try {
    // Fetch settings
    const settings = await fetchLeasingFinanceSettings();
    if (!settings) {
      return { success: false, error: 'Leasing finance settings not configured' };
    }

    if (!settings.auto_post_gl_on_payment) {
      console.log('[Leasing Finance] Auto GL posting disabled');
      return { success: true };
    }

    let journalEntryId: string | undefined;
    let apPaymentId: string | undefined;

    // Post to GL
    const glResult = await postLeasingPaymentToGL({
      paymentData,
      busNumber,
      lenderName,
      settings,
      busId,
    });

    if (glResult) {
      journalEntryId = glResult.journalEntryId;
    }

    // Create AP Payment if invoice exists and vendor is set
    if (apInvoiceId && vendorId && settings.bank_account_id) {
      const paymentNumber = `LEASE-PAY-${busNumber}-${paymentData.payment_number.toString().padStart(3, '0')}`;
      
      const { data: apPayment, error: apError } = await supabase
        .from('ap_payments')
        .insert({
          company_id: NCG_HOLDING_ID,
          vendor_id: vendorId,
          payment_number: paymentNumber,
          payment_date: paymentData.actual_payment_date || format(new Date(), 'yyyy-MM-dd'),
          amount: paymentData.total_installment,
          payment_method: 'bank_transfer',
          bank_account_id: settings.bank_account_id,
          journal_entry_id: journalEntryId,
          status: 'completed',
          business_unit_code: BUSINESS_UNIT_CODE,
          reference: `EMI #${paymentData.payment_number} for ${busNumber}`,
        })
        .select('id')
        .single();

      if (!apError && apPayment) {
        apPaymentId = apPayment.id;

        // Create allocation
        await supabase.from('ap_payment_allocations').insert({
          payment_id: apPaymentId,
          invoice_id: apInvoiceId,
          allocated_amount: paymentData.total_installment,
          company_id: NCG_HOLDING_ID,
        });

        // Update AP Invoice status
        await supabase
          .from('ap_invoices')
          .update({
            paid_amount: paymentData.total_installment,
            balance: 0,
            status: 'paid',
          })
          .eq('id', apInvoiceId);
      }
    }

    // Update loan payment with finance links
    await supabase
      .from('bus_loan_payments')
      .update({
        journal_entry_id: journalEntryId,
        ap_payment_id: apPaymentId,
        gl_posted: !!journalEntryId,
      })
      .eq('id', paymentId);

    return { success: true, journalEntryId, apPaymentId };
  } catch (error: any) {
    console.error('[Leasing Finance] Exception processing payment:', error);
    return { success: false, error: error.message };
  }
}
