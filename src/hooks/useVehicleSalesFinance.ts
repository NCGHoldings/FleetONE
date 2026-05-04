/**
 * Unified Vehicle Sales Finance Hook
 * Provides GL posting, AR Invoice creation, and Customer management
 * for Yutong, Sinotruck, and Light Vehicle modules
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VehicleModule = 'yutong' | 'sinotruck' | 'lightvehicle';

// Business unit codes for each module
export const BUSINESS_UNIT_CODES: Record<VehicleModule, string> = {
  yutong: 'YUT',
  sinotruck: 'SNT',
  lightvehicle: 'LTV',
};

// NCG Holding ID for consolidated GL
export const NCG_HOLDING_ID = 'a0000000-0000-0000-0000-000000000001';

export interface VehicleFinanceSettings {
  id: string;
  company_id: string;
  sales_revenue_account_id: string | null;
  spare_parts_revenue_account_id: string | null;
  trade_receivable_account_id: string | null;
  customer_advance_account_id: string | null;
  default_bank_account_id: string | null;
  lc_bank_account_id: string | null;
  discount_expense_account_id: string | null;
  commission_expense_account_id: string | null;
  vat_output_account_id: string | null;
  wht_payable_account_id: string | null;
  auto_post_on_verify: boolean;
  auto_create_customer: boolean;
  invoice_prefix: string;
  receipt_prefix: string;
  is_active: boolean;
}

// Helper to get the correct settings table name
function getSettingsTable(module: VehicleModule): string {
  const tables: Record<VehicleModule, string> = {
    yutong: 'yutong_finance_settings',
    sinotruck: 'sinotruck_finance_settings',
    lightvehicle: 'lightvehicle_finance_settings',
  };
  return tables[module];
}

/**
 * Fetch finance settings for a vehicle module
 */
export async function fetchVehicleFinanceSettings(
  module: VehicleModule,
  companyId?: string
): Promise<VehicleFinanceSettings | null> {
  try {
    const effectiveCompanyId = companyId || NCG_HOLDING_ID;
    const tableName = getSettingsTable(module);

    const { data, error } = await (supabase as any)
      .from(tableName)
      .select('*')
      .eq('company_id', effectiveCompanyId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error(`[${module.toUpperCase()} Finance] Error fetching settings:`, error);
      return null;
    }

    return data as VehicleFinanceSettings | null;
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Exception fetching settings:`, error);
    return null;
  }
}

/**
 * Save or update finance settings for a vehicle module
 */
export async function saveVehicleFinanceSettings(
  module: VehicleModule,
  settings: Partial<VehicleFinanceSettings>,
  companyId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const effectiveCompanyId = companyId || NCG_HOLDING_ID;
    const tableName = getSettingsTable(module);

    // Sanitize UUID fields (convert empty strings to null)
    const uuidFields = [
      'sales_revenue_account_id',
      'spare_parts_revenue_account_id',
      'trade_receivable_account_id',
      'customer_advance_account_id',
      'default_bank_account_id',
      'lc_bank_account_id',
      'discount_expense_account_id',
      'commission_expense_account_id',
      'vat_output_account_id',
      'wht_payable_account_id',
    ];

    const sanitized = { ...settings };
    uuidFields.forEach(field => {
      if ((sanitized as any)[field] === '' || (sanitized as any)[field] === undefined) {
        (sanitized as any)[field] = null;
      }
    });

    // Upsert settings
    const { error } = await supabase
      .from(tableName as any)
      .upsert({
        company_id: effectiveCompanyId,
        ...sanitized,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'company_id' });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error(`[${module.toUpperCase()} Finance] Error saving settings:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Create or get a Finance Customer for vehicle sales
 */
export async function createVehicleCustomer({
  module,
  customerName,
  customerPhone,
  customerEmail,
  customerCategoryId,
  companyId,
}: {
  module: VehicleModule;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCategoryId?: string;
  companyId: string;
}): Promise<string | null> {
  try {
    const businessUnitCode = BUSINESS_UNIT_CODES[module];

    console.log(`[${module.toUpperCase()} Finance] Creating/Getting customer:`, {
      customerName,
      customerPhone,
      customerEmail,
      businessUnitCode,
    });

    // Try to find existing customer by name first
    const { data: existingByName } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .ilike('customer_name', customerName)
      .limit(1)
      .maybeSingle();

    if (existingByName?.id) {
      console.log(`[${module.toUpperCase()} Finance] Found existing customer by name:`, existingByName.id);
      return existingByName.id;
    }

    // Try by phone or email
    if (customerPhone || customerEmail) {
      let query = supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId);

      if (customerPhone) {
        query = query.or(`phone.eq.${customerPhone}`);
      }
      if (customerEmail) {
        query = query.or(`email.eq.${customerEmail}`);
      }

      const { data: existingByContact } = await query.limit(1).maybeSingle();

      if (existingByContact?.id) {
        console.log(`[${module.toUpperCase()} Finance] Found existing customer by contact:`, existingByContact.id);
        return existingByContact.id;
      }
    }

    // Create new customer with auto-generated code
    const customerCode = `${businessUnitCode}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        customer_code: customerCode,
        customer_name: customerName,
        phone: customerPhone || null,
        email: customerEmail || null,
        customer_type: 'individual',
        customer_category_id: customerCategoryId || null,
        business_unit_code: businessUnitCode,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`[${module.toUpperCase()} Finance] Customer insert error:`, insertError);
      return null;
    }

    console.log(`[${module.toUpperCase()} Finance] Created new customer:`, newCustomer?.id);
    return newCustomer?.id || null;
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Exception creating customer:`, error);
    return null;
  }
}

/**
 * Create AR Invoice for a vehicle order
 */
export async function createVehicleARInvoice({
  module,
  orderId,
  orderNo,
  customerId,
  totalAmount,
  advanceAmount,
  companyId,
  settings,
  customerCategoryId,
  invoiceNo,
  taxAmount,
  status,
}: {
  module: VehicleModule;
  orderId: string;
  orderNo: string;
  customerId: string;
  totalAmount: number;
  advanceAmount: number;
  companyId: string;
  settings: VehicleFinanceSettings;
  customerCategoryId?: string;
  invoiceNo?: string;
  taxAmount?: number;
  status?: string;
}): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  try {
    const businessUnitCode = BUSINESS_UNIT_CODES[module];
    const prefix = settings.invoice_prefix || `${businessUnitCode}-INV`;

    // Generate invoice number
    const timestamp = Date.now().toString(36).toUpperCase();
    const invoiceNumber = `${prefix}-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${timestamp}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30-day payment terms

    const arStatus = status || (advanceAmount >= totalAmount ? 'paid' : advanceAmount > 0 ? 'partial' : 'unpaid');

    const { data: invoice, error: invoiceError } = await supabase
      .from('ar_invoices')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        invoice_number: invoiceNo || invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: totalAmount,
        tax_amount: taxAmount || null,
        subtotal: taxAmount ? totalAmount - taxAmount : null,
        paid_amount: advanceAmount,
        balance: totalAmount - advanceAmount,
        status: arStatus,
        reference: invoiceNo || orderNo,
        business_unit_code: businessUnitCode,
        notes: `${module.charAt(0).toUpperCase() + module.slice(1)} vehicle order: ${orderNo}${invoiceNo ? ` | Invoice: ${invoiceNo}` : ''}`,
      })
      .select('id, invoice_number')
      .single();

    if (invoiceError) {
      console.error(`[${module.toUpperCase()} Finance] AR Invoice creation error:`, invoiceError);
      return null;
    }

    // ========== AUTO GL POSTING at creation: DR Trade Receivable, CR Sales Revenue ==========
    // We only post to GL if the invoice is NOT a draft. Draft invoices shouldn't hit the ledger yet.
    if (arStatus !== 'draft') {
      try {
        const { resolveCustomerARAccounts } = await import('@/hooks/useCustomerCategories');
        const resolved = await resolveCustomerARAccounts(customerId, companyId);
  
        if (resolved.arAccountId && resolved.revenueAccountId && totalAmount > 0) {
        const { postARInvoiceToGL } = await import('@/lib/gl-posting-utils');
        const glResult = await postARInvoiceToGL({
          invoiceNumber: invoice.invoice_number,
          invoiceDate: new Date().toISOString().split('T')[0],
          totalAmount: totalAmount,
          taxAmount: taxAmount && taxAmount > 0 ? taxAmount : undefined,
          tradeReceivableId: resolved.arAccountId,
          salesRevenueId: resolved.revenueAccountId,
          taxPayableId: settings.vat_output_account_id || undefined,
          companyId: companyId,
          businessUnitCode: businessUnitCode,
          sourceModule: `${module}_sales`,
        });
        if (glResult.success && glResult.journalEntryId) {
          await (supabase as any)
            .from('ar_invoices')
            .update({ journal_entry_id: glResult.journalEntryId })
            .eq('id', invoice.id);
          console.log(`[${module.toUpperCase()} Finance] GL posted for AR Invoice:`, invoice.invoice_number);
        } else {
          console.warn(`[${module.toUpperCase()} Finance] GL posting failed:`, glResult.error);
        }
      } else {
        console.warn(`[${module.toUpperCase()} Finance] Missing GL accounts for AR posting:`, resolved.missingAccounts);
      }
    } catch (glErr) {
      console.warn(`[${module.toUpperCase()} Finance] GL posting error:`, glErr);
    }
    } // End of arStatus !== 'draft' check

    console.log(`[${module.toUpperCase()} Finance] Created AR Invoice:`, invoice?.invoice_number);
    return invoice ? { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number } : null;
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Exception creating AR Invoice:`, error);
    return null;
  }
}

/**
 * Post a vehicle payment to GL (Journal Entry)
 */
export async function postVehiclePaymentToGL({
  module,
  orderNo,
  customerName,
  amount,
  paymentType,
  paymentMethod,
  settings,
  effectiveCompanyId,
  customBankAccountId,
}: {
  module: VehicleModule;
  orderNo: string;
  customerName: string;
  amount: number;
  paymentType: 'advance' | 'balance' | 'full';
  paymentMethod?: string;
  settings: VehicleFinanceSettings;
  effectiveCompanyId: string;
  customBankAccountId?: string;
}): Promise<{ journalEntryId: string; entryNumber: string } | null> {
  try {
    const businessUnitCode = BUSINESS_UNIT_CODES[module];

    // Validate required accounts based on payment type
    if (paymentType === 'advance' && !settings.customer_advance_account_id) {
      console.error(`[${module.toUpperCase()} Finance] Missing customer advance account`);
      toast.error('Missing GL account configuration for customer advance');
      return null;
    }

    if ((paymentType === 'balance' || paymentType === 'full') && !settings.sales_revenue_account_id) {
      console.error(`[${module.toUpperCase()} Finance] Missing sales revenue account`);
      toast.error('Missing GL account configuration for sales revenue');
      return null;
    }

    const bankAccountId = customBankAccountId || settings.default_bank_account_id;
    if (!bankAccountId) {
      console.error(`[${module.toUpperCase()} Finance] Missing bank account`);
      toast.error('Missing GL account configuration for bank');
      return null;
    }

    // Build entry description
    const entryPrefix = paymentType === 'advance' ? 'ADV' : paymentType === 'balance' ? 'BAL' : 'REV';
    const entryNumber = `${businessUnitCode}-${entryPrefix}-${orderNo}-${Date.now().toString(36).toUpperCase()}`;
    const description = `${businessUnitCode} ${paymentType.toUpperCase()} - ${orderNo} - ${customerName}`;

    // Create journal entry
    const { data: journalEntry, error: jeError } = await (supabase as any)
      .from('journal_entries')
      .insert({
        company_id: effectiveCompanyId,
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        description,
        reference: `${businessUnitCode}-${entryPrefix}-${orderNo}`,
        source_module: `${module}_sales`,
        status: 'posted',
        total_debit: amount,
        total_credit: amount,
        business_unit_code: businessUnitCode,
        posted_at: new Date().toISOString(),
      })
      .select('id, entry_number')
      .single();

    if (jeError) {
      console.error(`[${module.toUpperCase()} Finance] Journal entry creation error:`, jeError);
      toast.error('Failed to create GL entry');
      return null;
    }

    // Create journal entry lines based on payment type
    const lines = [];

    // DEBIT: Bank/Cash Account
    lines.push({
      journal_entry_id: journalEntry.id,
      account_id: bankAccountId,
      description: `${businessUnitCode} ${paymentMethod || 'Payment'} received - ${orderNo}`,
      debit: amount,
      credit: 0,
      company_id: effectiveCompanyId,
    });

    // CREDIT: Based on payment type
    if (paymentType === 'advance') {
      // CR Customer Advance Receipt (Liability)
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: settings.customer_advance_account_id,
        description: `${businessUnitCode} Advance from ${customerName} - ${orderNo}`,
        debit: 0,
        credit: amount,
        company_id: effectiveCompanyId,
      });
    } else if (paymentType === 'balance') {
      // CR Trade Receivable
      if (settings.trade_receivable_account_id) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.trade_receivable_account_id,
          description: `${businessUnitCode} Balance payment from ${customerName} - ${orderNo}`,
          debit: 0,
          credit: amount,
          company_id: effectiveCompanyId,
        });
      } else {
        // Fallback to revenue
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.sales_revenue_account_id,
          description: `${businessUnitCode} Balance payment from ${customerName} - ${orderNo}`,
          debit: 0,
          credit: amount,
          company_id: effectiveCompanyId,
        });
      }
    } else {
      // Full payment: CR Revenue directly
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: settings.sales_revenue_account_id,
        description: `${businessUnitCode} Full payment from ${customerName} - ${orderNo}`,
        debit: 0,
        credit: amount,
        company_id: effectiveCompanyId,
      });
    }

    // Insert journal entry lines
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) {
      console.error(`[${module.toUpperCase()} Finance] Journal lines error:`, linesError);
      // Cleanup: delete the journal entry
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      toast.error('Failed to create GL entry lines');
      return null;
    }

    // Update COA balances
    await updateCOABalances(lines);

    console.log(`[${module.toUpperCase()} Finance] Posted GL entry:`, journalEntry.entry_number);
    return { journalEntryId: journalEntry.id, entryNumber: journalEntry.entry_number };
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Exception posting to GL:`, error);
    toast.error('Failed to post to GL');
    return null;
  }
}

/**
 * Resolve the sales_account_id from item_categories by category name and company.
 * Returns the linked COA account ID, or null if not found/not linked.
 */
export async function resolveItemCategoryRevenueAccount(
  categoryName: string,
  companyId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('item_categories')
      .select('sales_account_id')
      .eq('category_name', categoryName)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.warn('[CategoryRevenue] Lookup error:', error.message);
      return null;
    }
    return data?.sales_account_id || null;
  } catch (err) {
    console.warn('[CategoryRevenue] Exception:', err);
    return null;
  }
}

// Map module to default item category name
const MODULE_CATEGORY_MAP: Record<VehicleModule, string> = {
  yutong: 'Yutong Sales',
  sinotruck: 'Sinotruk Sales',
  lightvehicle: 'Light Vehicle Sales',
};

/**
 * Post invoice to GL (Revenue Recognition)
 * Now supports dynamic item-category-based revenue routing.
 */
export async function postVehicleInvoiceToGL({
  module,
  orderNo,
  customerName,
  customerId,
  invoiceAmount,
  settings,
  effectiveCompanyId,
  isTaxInvoice,
  taxRate,
  invoiceNo,
  itemCategoryName,
}: {
  module: VehicleModule;
  orderNo: string;
  customerName: string;
  customerId?: string;
  invoiceAmount: number;
  settings: VehicleFinanceSettings;
  effectiveCompanyId: string;
  isTaxInvoice?: boolean;
  taxRate?: number;
  invoiceNo?: string;
  itemCategoryName?: string;
}): Promise<{ journalEntryId: string; entryNumber: string } | null> {
  try {
    const businessUnitCode = BUSINESS_UNIT_CODES[module];

    // Resolve GL accounts via 4-tier hierarchy:
    // 1. Item Category → 2. Customer Category → 3. Customer Direct → 4. Global Settings
    let tradeReceivableId = settings.trade_receivable_account_id;
    let salesRevenueId = settings.sales_revenue_account_id;

    // Tier 1: Item Category Resolution (highest priority for revenue)
    const effectiveCategoryName = itemCategoryName || MODULE_CATEGORY_MAP[module];
    if (effectiveCategoryName) {
      const categoryRevenueId = await resolveItemCategoryRevenueAccount(
        effectiveCategoryName,
        effectiveCompanyId
      );
      if (categoryRevenueId) {
        salesRevenueId = categoryRevenueId;
        console.log(`[${module.toUpperCase()} Finance] Revenue resolved via item category: ${effectiveCategoryName}`);
      }
    }

    // Tier 2/3: Customer Category/Direct Resolution (for trade receivable)
    if (customerId) {
      try {
        const { resolveCustomerARAccounts } = await import('@/hooks/useCustomerCategories');
        const resolved = await resolveCustomerARAccounts(customerId, effectiveCompanyId);
        if (resolved.arAccountId) tradeReceivableId = resolved.arAccountId;
        // Only override revenue if item category didn't resolve it
        if (!effectiveCategoryName && resolved.revenueAccountId) salesRevenueId = resolved.revenueAccountId;
        console.log(`[${module.toUpperCase()} Finance] GL resolution complete`, {
          tradeReceivableId, salesRevenueId, source: resolved.source
        });
      } catch (err) {
        console.warn(`[${module.toUpperCase()} Finance] Customer resolution failed, using current fallback`, err);
      }
    }

    if (!tradeReceivableId || !salesRevenueId) {
      console.error(`[${module.toUpperCase()} Finance] Missing required accounts for invoice posting`);
      toast.error('Missing GL account configuration for invoice posting');
      return null;
    }

    const refLabel = invoiceNo || orderNo;
    const entryNumber = `${businessUnitCode}-INV-${refLabel}-${Date.now().toString(36).toUpperCase()}`;
    const description = `${businessUnitCode} INVOICE - ${refLabel} - ${customerName}`;

    // Calculate VAT split if tax invoice
    const shouldSplitVAT = isTaxInvoice && settings.vat_output_account_id;
    const effectiveTaxRate = taxRate || 18;
    const baseAmountExclVAT = shouldSplitVAT ? invoiceAmount / (1 + effectiveTaxRate / 100) : invoiceAmount;
    const vatAmountCalc = shouldSplitVAT ? invoiceAmount - baseAmountExclVAT : 0;

    // Create journal entry
    const { data: journalEntry, error: jeError } = await (supabase as any)
      .from('journal_entries')
      .insert({
        company_id: effectiveCompanyId,
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        description,
        reference: invoiceNo || `${businessUnitCode}-INV-${orderNo}`,
        source_module: `${module}_sales`,
        status: 'posted',
        total_debit: invoiceAmount,
        total_credit: invoiceAmount,
        business_unit_code: businessUnitCode,
        posted_at: new Date().toISOString(),
        notes: invoiceNo ? `Invoice: ${invoiceNo}` : undefined,
      })
      .select('id, entry_number')
      .single();

    if (jeError) {
      console.error(`[${module.toUpperCase()} Finance] Invoice journal entry error:`, jeError);
      return null;
    }

    // DR Trade Receivable (full amount)
    const lines: any[] = [
      {
        journal_entry_id: journalEntry.id,
        account_id: tradeReceivableId,
        description: `${businessUnitCode} Invoice to ${customerName} - ${refLabel}`,
        debit: invoiceAmount,
        credit: 0,
        company_id: effectiveCompanyId,
      },
    ];

    if (shouldSplitVAT) {
      // CR Sales Revenue (base amount excl VAT)
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: salesRevenueId,
        description: `${businessUnitCode} Sales revenue (excl. VAT) - ${refLabel}`,
        debit: 0,
        credit: Math.round(baseAmountExclVAT * 100) / 100,
        company_id: effectiveCompanyId,
      });
      // CR VAT Output
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: settings.vat_output_account_id,
        description: `${businessUnitCode} VAT Output ${effectiveTaxRate}% - ${refLabel}`,
        debit: 0,
        credit: Math.round(vatAmountCalc * 100) / 100,
        company_id: effectiveCompanyId,
      });
    } else {
      // CR Sales Revenue (full amount)
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: salesRevenueId,
        description: `${businessUnitCode} Sales revenue - ${refLabel}`,
        debit: 0,
        credit: invoiceAmount,
        company_id: effectiveCompanyId,
      });
    }

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      return null;
    }

    await updateCOABalances(lines);

    return { journalEntryId: journalEntry.id, entryNumber: journalEntry.entry_number };
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Exception posting invoice to GL:`, error);
    return null;
  }
}

/**
 * Apply advance against receivable (when delivery happens)
 */
export async function applyAdvanceToReceivable({
  module,
  orderNo,
  customerName,
  advanceAmount,
  settings,
  effectiveCompanyId,
}: {
  module: VehicleModule;
  orderNo: string;
  customerName: string;
  advanceAmount: number;
  settings: VehicleFinanceSettings;
  effectiveCompanyId: string;
}): Promise<{ journalEntryId: string; entryNumber: string } | null> {
  try {
    const businessUnitCode = BUSINESS_UNIT_CODES[module];

    if (!settings.customer_advance_account_id || !settings.trade_receivable_account_id) {
      console.error(`[${module.toUpperCase()} Finance] Missing accounts for advance application`);
      return null;
    }

    const entryNumber = `${businessUnitCode}-ADV-APPLY-${orderNo}-${Date.now().toString(36).toUpperCase()}`;
    const description = `${businessUnitCode} ADVANCE APPLIED - ${orderNo} - ${customerName}`;

    const { data: journalEntry, error: jeError } = await (supabase as any)
      .from('journal_entries')
      .insert({
        company_id: effectiveCompanyId,
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        description,
        reference: `${businessUnitCode}-ADV-APPLY-${orderNo}`,
        source_module: `${module}_sales`,
        status: 'posted',
        total_debit: advanceAmount,
        total_credit: advanceAmount,
        business_unit_code: businessUnitCode,
        posted_at: new Date().toISOString(),
      })
      .select('id, entry_number')
      .single();

    if (jeError) return null;

    // DR Customer Advance Receipt | CR Trade Receivable
    const lines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.customer_advance_account_id,
        description: `${businessUnitCode} Advance applied - ${customerName}`,
        debit: advanceAmount,
        credit: 0,
        company_id: effectiveCompanyId,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.trade_receivable_account_id,
        description: `${businessUnitCode} Advance applied - ${customerName}`,
        debit: 0,
        credit: advanceAmount,
        company_id: effectiveCompanyId,
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

    return { journalEntryId: journalEntry.id, entryNumber: journalEntry.entry_number };
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Exception applying advance:`, error);
    return null;
  }
}

/**
 * Create AR Receipt for a payment
 */
export async function createVehicleARReceipt({
  module,
  paymentId,
  invoiceId,
  customerId,
  amount,
  paymentMethod,
  paymentDate,
  settings,
  effectiveCompanyId,
}: {
  module: VehicleModule;
  paymentId: string;
  invoiceId?: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  settings: VehicleFinanceSettings;
  effectiveCompanyId: string;
}): Promise<{ receiptId: string; receiptNumber: string } | null> {
  try {
    const businessUnitCode = BUSINESS_UNIT_CODES[module];
    const prefix = settings.receipt_prefix || `${businessUnitCode}-RCT`;

    const timestamp = Date.now().toString(36).toUpperCase();
    const receiptNumber = `${prefix}-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${timestamp}`;

    const { data: receipt, error: receiptError } = await supabase
      .from('ar_receipts')
      .insert({
        company_id: effectiveCompanyId,
        customer_id: customerId,
        receipt_number: receiptNumber,
        receipt_date: paymentDate,
        amount,
        payment_method: paymentMethod,
        status: 'completed',
        business_unit_code: businessUnitCode,
      })
      .select('id, receipt_number')
      .single();

    if (receiptError) {
      console.error(`[${module.toUpperCase()} Finance] AR Receipt creation error:`, receiptError);
      return null;
    }

    // If there's an invoice, create allocation and update invoice balance
    if (invoiceId && receipt) {
      const { error: allocError } = await supabase
        .from('ar_receipt_allocations')
        .insert({
          receipt_id: receipt.id,
          invoice_id: invoiceId,
          allocated_amount: amount,
          company_id: effectiveCompanyId,
        });

      if (allocError) {
        console.error(`[${module.toUpperCase()} Finance] AR allocation failed:`, allocError);
        toast.error('AR Receipt created but allocation failed. Contact admin.');
        return { receiptId: receipt.id, receiptNumber: receipt.receipt_number };
      }

      // Update invoice paid amount
      const { data: invoice, error: invFetchError } = await supabase
        .from('ar_invoices')
        .select('paid_amount, total_amount')
        .eq('id', invoiceId)
        .single();

      if (invFetchError || !invoice) {
        console.error(`[${module.toUpperCase()} Finance] Could not fetch AR invoice for balance update:`, invFetchError);
        toast.error('AR allocation created but invoice balance not updated. Contact admin.');
        return { receiptId: receipt.id, receiptNumber: receipt.receipt_number };
      }

      const newPaidAmount = (invoice.paid_amount || 0) + amount;
      const newBalance = invoice.total_amount - newPaidAmount;
      const { error: invUpdateError } = await supabase
        .from('ar_invoices')
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid',
        })
        .eq('id', invoiceId);

      if (invUpdateError) {
        console.error(`[${module.toUpperCase()} Finance] AR invoice balance update failed:`, invUpdateError);
        toast.error('AR Receipt allocated but invoice balance update failed.');
      } else {
        console.log(`[${module.toUpperCase()} Finance] AR Invoice updated: paid=${newPaidAmount}, balance=${newBalance}`);
      }
    }

    return receipt ? { receiptId: receipt.id, receiptNumber: receipt.receipt_number } : null;
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Exception creating AR Receipt:`, error);
    return null;
  }
}

/**
 * Update Chart of Accounts balances after journal entry
 */
async function updateCOABalances(lines: Array<{
  account_id: string | null;
  debit: number;
  credit: number;
}>) {
  try {
    for (const line of lines) {
      if (!line.account_id) continue;

      // Get account type to determine balance direction
      const { data: account } = await supabase
        .from('chart_of_accounts')
        .select('account_type, current_balance')
        .eq('id', line.account_id)
        .single();

      if (!account) continue;

      let balanceChange = 0;
      const isDebitNormal = ['asset', 'expense'].includes(account.account_type);

      if (isDebitNormal) {
        balanceChange = line.debit - line.credit;
      } else {
        balanceChange = line.credit - line.debit;
      }

      await supabase
        .from('chart_of_accounts')
        .update({
          current_balance: (account.current_balance || 0) + balanceChange,
          updated_at: new Date().toISOString(),
        })
        .eq('id', line.account_id);
    }
  } catch (error) {
    console.error('[Vehicle Finance] Error updating COA balances:', error);
  }
}

/**
 * Update order with finance links
 */
export async function updateOrderFinanceLinks({
  module,
  orderId,
  financeCustomerId,
  arInvoiceId,
}: {
  module: VehicleModule;
  orderId: string;
  financeCustomerId?: string;
  arInvoiceId?: string;
}): Promise<boolean> {
  try {
    const orderTable = `${module}_orders`;
    const updates: Record<string, any> = {};

    if (financeCustomerId) updates.finance_customer_id = financeCustomerId;
    if (arInvoiceId) updates.ar_invoice_id = arInvoiceId;

    if (Object.keys(updates).length === 0) return true;

    const { error } = await supabase
      .from(orderTable as any)
      .update(updates)
      .eq('id', orderId);

    return !error;
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Error updating order finance links:`, error);
    return false;
  }
}

/**
 * Update payment with journal entry link
 */
export async function updatePaymentJournalLink({
  module,
  paymentId,
  journalEntryId,
  arReceiptId,
}: {
  module: VehicleModule;
  paymentId: string;
  journalEntryId?: string;
  arReceiptId?: string;
}): Promise<boolean> {
  try {
    const paymentTable = `${module}_customer_payments`;
    const updates: Record<string, any> = {};

    if (journalEntryId) updates.journal_entry_id = journalEntryId;
    if (arReceiptId) updates.ar_receipt_id = arReceiptId;

    if (Object.keys(updates).length === 0) return true;

    const { error } = await supabase
      .from(paymentTable as any)
      .update(updates)
      .eq('id', paymentId);

    return !error;
  } catch (error) {
    console.error(`[${module.toUpperCase()} Finance] Error updating payment journal link:`, error);
    return false;
  }
}
