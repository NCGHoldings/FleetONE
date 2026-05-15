/**
 * useTransactionLineage
 * 
 * Traces a journal entry back through its full lifecycle:
 *   Quotation → Order → Invoice → Journal Entry → GL Lines → Related Transactions
 * 
 * Builds a dynamic Mermaid flowchart for visual audit.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LineageNode {
  id: string;
  type: "quotation" | "order" | "source_document" | "journal_entry" | "gl_line" | "related_je" | "allocation" | "payment";
  label: string;
  sublabel?: string;
  amount?: number;
  amountLabel?: string;
  date?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface LineageEdge {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed";
}

export interface UpstreamDocument {
  id: string;
  file_name: string;
  file_path: string;
  document_status?: string;
  invoice_no?: string;
  invoice_category?: string;
}

export interface UpstreamChain {
  quotation: any | null;
  order: any | null;
  payments: any[];
  documents: UpstreamDocument[];
  vehicleModule: string | null;
}

// ─── Downstream Chain Types (Invoice → Receipts / Credit Notes) ──────────────

export interface DownstreamReceipt {
  receipt: any;
  allocation: any;
  journalEntry: any | null;
}

export interface DownstreamCreditNote {
  creditNote: any;
  journalEntry: any | null;
}

export interface BalanceTracker {
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  receiptCount: number;
  creditNoteCount: number;
}

export interface DownstreamChain {
  receipts: DownstreamReceipt[];
  creditNotes: DownstreamCreditNote[];
  balanceTracker: BalanceTracker | null;
  sphBooking: any | null;
  bankTransactions: BankTransactionLink[];
}

export interface BankTransactionLink {
  bankTransaction: any;
  bankAccount: any | null;
  isReconciled: boolean;
}

export interface LineageData {
  journalEntry: any;
  journalLines: any[];
  sourceDocument: any | null;
  sourceType: string;
  relatedJEs: any[];
  upstream: UpstreamChain;
  downstream: DownstreamChain;
  nodes: LineageNode[];
  edges: LineageEdge[];
  mermaidCode: string;
  summary: {
    sourceDocType: string;
    sourceDocNumber: string;
    partyName: string;
    totalDebit: number;
    totalCredit: number;
    accountsAffected: number;
    relatedCount: number;
    chainDepth: number;
    paymentsCount: number;
    balanceStatus: string;
  };
}

// ─── Source module → table mapping ───────────────────────────────────────────

interface SourceTableConfig {
  table: string;
  matchColumn: string;
  displayName: string;
  partyField?: string;
  amountField?: string;
  numberField?: string;
}

const SOURCE_TABLE_MAP: Record<string, SourceTableConfig> = {
  ar_invoice: {
    table: "ar_invoices",
    matchColumn: "invoice_number",
    displayName: "AR Invoice",
    partyField: "customer_name",
    amountField: "total_amount",
    numberField: "invoice_number",
  },
  manual_ar: {
    table: "ar_invoices",
    matchColumn: "invoice_number",
    displayName: "AR Invoice",
    partyField: "customer_name",
    amountField: "total_amount",
    numberField: "invoice_number",
  },
  ar_receipt: {
    table: "ar_receipts",
    matchColumn: "receipt_number",
    displayName: "AR Receipt",
    partyField: "customer_name",
    amountField: "amount",
    numberField: "receipt_number",
  },
  ap_invoice: {
    table: "ap_invoices",
    matchColumn: "invoice_number",
    displayName: "AP Invoice / Bill",
    partyField: "vendor_name",
    amountField: "total_amount",
    numberField: "invoice_number",
  },
  ap_payment: {
    table: "ap_payments",
    matchColumn: "payment_number",
    displayName: "AP Payment",
    partyField: "vendor_name",
    amountField: "amount",
    numberField: "payment_number",
  },
  advance_payment: {
    table: "ap_payments",
    matchColumn: "payment_number",
    displayName: "Advance Payment",
    partyField: "vendor_name",
    amountField: "amount",
    numberField: "payment_number",
  },
  petty_cash: {
    table: "petty_cash_disbursements",
    matchColumn: "voucher_number",
    displayName: "Petty Cash Voucher",
    partyField: "payee",
    amountField: "amount",
    numberField: "voucher_number",
  },
  special_hire_payment: {
    table: "special_hire_payments",
    matchColumn: "receipt_number",
    displayName: "Special Hire Receipt",
    partyField: "customer_name",
    amountField: "amount",
    numberField: "receipt_number",
  },
};

// ─── Vehicle module detection ────────────────────────────────────────────────

type VehicleModule = "yutong" | "sinotruck" | "lightvehicle" | null;

function detectVehicleModule(sourceModule: string | null, reference: string | null, buCode: string | null): VehicleModule {
  if (sourceModule?.includes("yutong") || buCode === "YUT" || reference?.includes("NCGH-YT")) return "yutong";
  if (sourceModule?.includes("sinotruck") || buCode === "SNT" || reference?.includes("NCGH-SNT")) return "sinotruck";
  if (sourceModule?.includes("lightvehicle") || buCode === "LTV" || reference?.includes("NCGH-LTV")) return "lightvehicle";
  return null;
}

const VEHICLE_ORDER_TABLES: Record<string, string> = {
  yutong: "yutong_orders",
  sinotruck: "sinotruck_orders",
  lightvehicle: "lightvehicle_orders",
};

const VEHICLE_QUOTATION_TABLES: Record<string, string> = {
  yutong: "yutong_quotations",
  sinotruck: "sinotruck_quotations",
  lightvehicle: "lightvehicle_quotations",
};

const VEHICLE_PAYMENT_TABLES: Record<string, string> = {
  yutong: "yutong_customer_payments",
  sinotruck: "sinotruck_customer_payments",
  lightvehicle: "lightvehicle_customer_payments",
};

const VEHICLE_INVOICE_RECORD_TABLES: Record<string, string> = {
  yutong: "yutong_invoice_records",
  sinotruck: "sinotruck_invoice_records",
  lightvehicle: "lightvehicle_invoice_records",
};

const VEHICLE_INVOICE_DOC_TABLES: Record<string, string> = {
  yutong: "yutong_invoice_documents",
  sinotruck: "sinotruck_invoice_documents",
  lightvehicle: "lightvehicle_invoice_documents",
};

export const VEHICLE_STORAGE_BUCKETS: Record<string, string> = {
  yutong: "yutong-invoices",
  sinotruck: "sinotruck-invoices",
  lightvehicle: "lightvehicle-invoices",
};

// ─── Utility: detect source module from reference ────────────────────────────

function detectSourceModule(sourceModule: string | null, reference: string | null, entryNumber: string | null): string {
  if (sourceModule && sourceModule !== "general" && sourceModule !== "manual") {
    if (sourceModule.endsWith("_sales")) {
      if (reference?.includes("-CI-") || reference?.includes("-INV-")) return "ar_invoice";
      if (reference?.includes("-RCT-") || reference?.includes("-RCP-")) return "ar_receipt";
      return "vehicle_payment_je";
    }
    return sourceModule;
  }

  if (!reference) return "manual";

  if (reference.includes("-INV-") || reference.startsWith("INV-") || reference.includes("-CI-")) return "ar_invoice";
  if (reference.includes("-RCP-") || reference.startsWith("RCP-") || reference.includes("-RCT-")) return "ar_receipt";
  if (entryNumber?.startsWith("SBS-PAY-")) return "ar_receipt";
  if (reference.includes("-PAY-") || reference.startsWith("PAY-")) return "ap_payment";
  if (reference.includes("API-") || reference.startsWith("API-")) return "ap_invoice";
  if (reference.includes("PC-") || reference.startsWith("PC-")) return "petty_cash";
  if (reference.includes("-ADV-") || reference.includes("-BAL-") || reference.includes("-REV-")) return "vehicle_payment_je";

  return "manual";
}

// ─── Utility: sanitize label for Mermaid ─────────────────────────────────────

function mSafe(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/[<>{}|\\]/g, "")
    .replace(/&/g, "and")
    .substring(0, 80);
}

function formatAmount(amount: number): string {
  return `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Upstream chain fetcher ──────────────────────────────────────────────────

async function fetchUpstreamChain(
  sourceDoc: any | null,
  vehicleModule: VehicleModule,
  reference: string | null
): Promise<UpstreamChain> {
  const empty: UpstreamChain = { quotation: null, order: null, payments: [], documents: [], vehicleModule };
  if (!vehicleModule) return empty;

  const orderTable = VEHICLE_ORDER_TABLES[vehicleModule];
  const quotationTable = VEHICLE_QUOTATION_TABLES[vehicleModule];
  const paymentTable = VEHICLE_PAYMENT_TABLES[vehicleModule];
  const invoiceRecordTable = VEHICLE_INVOICE_RECORD_TABLES[vehicleModule];
  const invoiceDocTable = VEHICLE_INVOICE_DOC_TABLES[vehicleModule];
  if (!orderTable || !quotationTable) return empty;

  try {
    // Strategy 1: AR Invoice → yutong_orders via ar_invoice_id
    let order: any = null;
    let quotation: any = null;
    let payments: any[] = [];
    let documents: UpstreamDocument[] = [];

    if (sourceDoc?.id) {
      const { data: orderByAR } = await (supabase as any)
        .from(orderTable)
        .select("id, order_no, status, total_price, total_paid, created_at, quotation_id, customer_name, bus_model, quantity")
        .eq("ar_invoice_id", sourceDoc.id)
        .maybeSingle();
      if (orderByAR) order = orderByAR;
    }

    // Strategy 2: Reference-based matching (extract order_no from invoice ref)
    if (!order && reference) {
      const orderNoMatch = reference.match(/(?:NCGH-YT|NCGH-SNT|NCGH-LTV)-(?:CI-|TI-|INV-)?(.+)/);
      if (orderNoMatch) {
        const possibleOrderNo = orderNoMatch[1];
        const { data: orderByRef } = await (supabase as any)
          .from(orderTable)
          .select("id, order_no, status, total_price, total_paid, created_at, quotation_id, customer_name, bus_model, quantity")
          .eq("order_no", possibleOrderNo)
          .maybeSingle();
        if (orderByRef) order = orderByRef;
      }
    }

    // Fetch quotation from order
    if (order?.quotation_id) {
      const { data: quot } = await (supabase as any)
        .from(quotationTable)
        .select("id, quotation_number, customer_name, bus_model, quantity, total_price, status, created_at")
        .eq("id", order.quotation_id)
        .maybeSingle();
      if (quot) quotation = quot;
    }

    // Fetch customer payments for this order
    if (order?.id && paymentTable) {
      const { data: pmts } = await (supabase as any)
        .from(paymentTable)
        .select("id, payment_amount, payment_method, payment_date, status, payment_reference")
        .eq("order_id", order.id)
        .eq("status", "verified")
        .order("payment_date", { ascending: true })
        .limit(10);
      if (pmts) payments = pmts;
    }

    // Fetch invoice documents for this order
    if (order?.id && invoiceRecordTable && invoiceDocTable) {
      try {
        const { data: invoiceRecords } = await (supabase as any)
          .from(invoiceRecordTable)
          .select("id, invoice_no, invoice_category")
          .eq("order_id", order.id)
          .limit(10);

        if (invoiceRecords && invoiceRecords.length > 0) {
          for (const rec of invoiceRecords) {
            const { data: docs } = await (supabase as any)
              .from(invoiceDocTable)
              .select("id, file_name, file_path, document_status")
              .eq("invoice_record_id", rec.id);

            if (docs) {
              for (const doc of docs) {
                documents.push({
                  ...doc,
                  invoice_no: rec.invoice_no,
                  invoice_category: rec.invoice_category,
                });
              }
            }
          }
        }
      } catch {
        // Invoice documents may not exist — non-fatal
      }
    }

    return { quotation, order, payments, documents, vehicleModule };
  } catch (err) {
    console.warn("Lineage: Upstream chain fetch error (non-fatal):", err);
    return empty;
  }
}

// ─── Downstream chain fetcher (Invoice → Receipts / Credit Notes) ────────────

async function fetchDownstreamChain(
  sourceDoc: any | null,
  sourceType: string,
): Promise<DownstreamChain> {
  const empty: DownstreamChain = { receipts: [], creditNotes: [], balanceTracker: null, sphBooking: null, bankTransactions: [] };
  if (!sourceDoc?.id) return empty;

  try {
    const receipts: DownstreamReceipt[] = [];
    const creditNotes: DownstreamCreditNote[] = [];
    let sphBooking: any = null;

    // ── 1. AR Invoice → Receipts via allocations ──
    if (sourceType === 'ar_invoice' || sourceType === 'manual_ar') {
      const { data: allocations } = await supabase
        .from('ar_receipt_allocations' as any)
        .select('id, receipt_id, invoice_id, allocated_amount, write_off_amount')
        .eq('invoice_id', sourceDoc.id)
        .limit(20);

      if (allocations?.length) {
        for (const alloc of allocations) {
          const { data: receipt } = await supabase
            .from('ar_receipts')
            .select('id, receipt_number, receipt_date, amount, payment_method, status, reference, journal_entry_id, notes')
            .eq('id', alloc.receipt_id)
            .maybeSingle();

          let je: any = null;
          if (receipt?.journal_entry_id) {
            const { data: jeData } = await supabase
              .from('journal_entries')
              .select('id, entry_number, entry_date, description')
              .eq('id', receipt.journal_entry_id)
              .maybeSingle();
            je = jeData;
          }

          if (receipt) {
            receipts.push({ receipt, allocation: alloc, journalEntry: je });
          }
        }
      }

      // ── 2. AR Invoice → Credit Notes ──
      const { data: cns } = await supabase
        .from('ar_credit_notes' as any)
        .select('id, credit_note_number, credit_date, amount, reason, status, invoice_id, journal_entry_id')
        .eq('invoice_id', sourceDoc.id)
        .limit(10);

      if (cns?.length) {
        for (const cn of cns) {
          let je: any = null;
          if (cn.journal_entry_id) {
            const { data: jeData } = await supabase
              .from('journal_entries')
              .select('id, entry_number, entry_date, description')
              .eq('id', cn.journal_entry_id)
              .maybeSingle();
            je = jeData;
          }
          creditNotes.push({ creditNote: cn, journalEntry: je });
        }
      }

      // ── 3. SPH Booking link (if SPH invoice) ──
      if (sourceDoc.invoice_number?.startsWith('SPH-')) {
        try {
          const { data: sphQuot } = await (supabase as any)
            .from('special_hire_quotations')
            .select('id, quotation_number, customer_name, route_from, route_to, hire_date, total_amount, status')
            .eq('ar_invoice_id', sourceDoc.id)
            .maybeSingle();
          if (sphQuot) sphBooking = sphQuot;
        } catch { /* non-fatal */ }
      }
    }

    // ── 4. Balance Tracker ──
    const balanceTracker: BalanceTracker | null = (sourceType === 'ar_invoice' || sourceType === 'manual_ar') ? {
      totalAmount: sourceDoc.total_amount || 0,
      paidAmount: sourceDoc.paid_amount || 0,
      balance: sourceDoc.balance ?? (sourceDoc.total_amount - (sourceDoc.paid_amount || 0)),
      status: sourceDoc.status || 'unknown',
      receiptCount: receipts.length,
      creditNoteCount: creditNotes.length,
    } : null;

    return { receipts, creditNotes, balanceTracker, sphBooking, bankTransactions: [] };
  } catch (err) {
    console.warn("Lineage: Downstream chain fetch error (non-fatal):", err);
    return empty;
  }
}

// ─── Reverse lookup: Receipt → Parent Invoice ────────────────────────────────

async function reverseResolveInvoice(
  sourceDoc: any | null,
  sourceType: string,
): Promise<{ parentInvoice: any | null; parentSourceType: string }> {
  if (!sourceDoc?.id || sourceType !== 'ar_receipt') return { parentInvoice: null, parentSourceType: sourceType };

  try {
    const { data: allocations } = await supabase
      .from('ar_receipt_allocations' as any)
      .select('invoice_id')
      .eq('receipt_id', sourceDoc.id)
      .limit(1);

    if (allocations?.[0]?.invoice_id) {
      const { data: invoice } = await supabase
        .from('ar_invoices')
        .select('*')
        .eq('id', allocations[0].invoice_id)
        .maybeSingle();
      if (invoice) return { parentInvoice: invoice, parentSourceType: 'ar_invoice' };
    }
  } catch { /* non-fatal */ }

  return { parentInvoice: null, parentSourceType: sourceType };
}

// ─── Bank Transaction Links: JE → bank_transactions ─────────────────────────

async function fetchBankTransactionLinks(
  je: any,
  jeLines: any[],
): Promise<BankTransactionLink[]> {
  try {
    if (!jeLines?.length) return [];

    // Detect which JE lines touch a bank account (CoA codes starting with 1300x)
    const bankAccountCodes: string[] = [];
    const bankLineAccountIds: string[] = [];
    for (const line of jeLines) {
      const coa = (line as any).chart_of_accounts;
      if (coa?.account_code?.startsWith('1300')) {
        bankAccountCodes.push(coa.account_code);
        bankLineAccountIds.push(line.account_id);
      }
    }

    if (bankAccountCodes.length === 0) return [];

    // Find bank_accounts linked to these GL accounts
    const { data: bankAccounts } = await supabase
      .from('bank_accounts')
      .select('id, account_name, bank_name, account_number, gl_account_id, current_balance')
      .in('gl_account_id', bankLineAccountIds);

    let bankTxns: any[] = [];

    // ═══════════════════════════════════════════════════════════════════
    // Strategy 0 (PRIMARY): Direct journal_entry_id link
    // This is the most reliable match — many bank_transactions store the
    // journal_entry_id they were created from. Manual JEs and system JEs
    // both use this FK.
    // ═══════════════════════════════════════════════════════════════════
    if (je.id) {
      const { data: directLinks } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('journal_entry_id', je.id)
        .limit(10);
      if (directLinks?.length) {
        bankTxns.push(...directLinks);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Strategy 0b: Match by source_id (some modules store JE id as source)
    // ═══════════════════════════════════════════════════════════════════
    if (bankTxns.length === 0 && je.id) {
      const { data: sourceLinks } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('source_id', je.id)
        .limit(10);
      if (sourceLinks?.length) {
        bankTxns.push(...sourceLinks);
      }
    }

    // For heuristic strategies below, we need bank accounts
    const bankAccountIds = bankAccounts?.map(ba => ba.id) || [];

    // ═══════════════════════════════════════════════════════════════════
    // Strategy 1: Match by reference or entry_number in bank_transactions
    // ═══════════════════════════════════════════════════════════════════
    if (bankTxns.length === 0 && bankAccountIds.length > 0) {
      const searchTerms = [je.reference, je.entry_number].filter(Boolean);
      for (const term of searchTerms) {
        if (!term) continue;
        const { data } = await supabase
          .from('bank_transactions')
          .select('*')
          .in('bank_account_id', bankAccountIds)
          .or(`reference.ilike.%${term}%,description.ilike.%${term}%`)
          .limit(5);
        if (data?.length) {
          bankTxns.push(...data);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Strategy 2: Match by date + exact amount (last resort heuristic)
    // ═══════════════════════════════════════════════════════════════════
    if (bankTxns.length === 0 && je.entry_date && bankAccountIds.length > 0) {
      for (const line of jeLines) {
        const coa = (line as any).chart_of_accounts;
        if (!coa?.account_code?.startsWith('1300')) continue;
        const amount = line.debit || line.credit || 0;
        if (amount <= 0) continue;
        const matchingBA = bankAccounts?.find(ba => ba.gl_account_id === line.account_id);
        if (!matchingBA) continue;

        const { data } = await supabase
          .from('bank_transactions')
          .select('*')
          .eq('bank_account_id', matchingBA.id)
          .eq('transaction_date', je.entry_date)
          .or(`debit_amount.eq.${amount},credit_amount.eq.${amount}`)
          .limit(3);
        if (data?.length) bankTxns.push(...data);
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueTxns = bankTxns.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    // Build result — enrich with bank account info
    // For direct-link matches we may need to fetch the bank account details
    // if the bankAccounts array doesn't cover all found transactions
    const missingBAIds = uniqueTxns
      .filter(bt => bt.bank_account_id && !bankAccounts?.find(a => a.id === bt.bank_account_id))
      .map(bt => bt.bank_account_id);

    let allBankAccounts = bankAccounts || [];
    if (missingBAIds.length > 0) {
      const uniqueMissing = [...new Set(missingBAIds)];
      const { data: extraBAs } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name, account_number, gl_account_id, current_balance')
        .in('id', uniqueMissing);
      if (extraBAs?.length) {
        allBankAccounts = [...allBankAccounts, ...extraBAs];
      }
    }

    return uniqueTxns.map(bt => {
      const ba = allBankAccounts.find(a => a.id === bt.bank_account_id) || null;
      return {
        bankTransaction: bt,
        bankAccount: ba,
        isReconciled: !!bt.is_reconciled,
      };
    });
  } catch (err) {
    console.warn('Lineage: Bank transaction link fetch error (non-fatal):', err);
    return [];
  }
}

// ─── Mermaid builder ─────────────────────────────────────────────────────────

function buildMermaidCode(data: {
  je: any;
  lines: any[];
  sourceDoc: any | null;
  sourceType: string;
  sourceConfig: SourceTableConfig | null;
  relatedJEs: any[];
  upstream: UpstreamChain;
  downstream: DownstreamChain;
}): string {
  const { je, lines, sourceDoc, sourceType, sourceConfig, relatedJEs, upstream, downstream } = data;

  const parts: string[] = ["graph TD"];

  // ── Theme / class definitions — professional audit palette
  parts.push("  classDef quotation fill:#0d9488,stroke:#2dd4bf,stroke-width:2px,color:#fff,rx:14");
  parts.push("  classDef order fill:#7c3aed,stroke:#a78bfa,stroke-width:2px,color:#fff,rx:14");
  parts.push("  classDef sourceDoc fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:12");
  parts.push("  classDef journalEntry fill:#6d28d9,stroke:#8b5cf6,stroke-width:2px,color:#fff,rx:12");
  parts.push("  classDef debitLine fill:#059669,stroke:#34d399,stroke-width:2px,color:#fff,rx:8");
  parts.push("  classDef creditLine fill:#dc2626,stroke:#f87171,stroke-width:2px,color:#fff,rx:8");
  parts.push("  classDef relatedJE fill:#d97706,stroke:#fbbf24,stroke-width:2px,color:#fff,rx:8");
  parts.push("  classDef payment fill:#0891b2,stroke:#22d3ee,stroke-width:2px,color:#fff,rx:8");
  parts.push("  classDef receipt fill:#0e7490,stroke:#06b6d4,stroke-width:2px,color:#fff,rx:10");
  parts.push("  classDef creditNote fill:#c2410c,stroke:#fb923c,stroke-width:2px,color:#fff,rx:10");
  parts.push("  classDef balanceNode fill:#4338ca,stroke:#818cf8,stroke-width:2px,color:#fff,rx:10");
  parts.push("  classDef sphBooking fill:#15803d,stroke:#4ade80,stroke-width:2px,color:#fff,rx:14");
  parts.push("");

  let hasUpstream = false;

  // ── Quotation Node (top of chain)
  if (upstream.quotation) {
    hasUpstream = true;
    const q = upstream.quotation;
    parts.push(`  subgraph SG_QUOT["🧾 Quotation"]`);
    parts.push(`    QUOT["${mSafe(q.quotation_number || 'Quotation')}<br/>${mSafe(q.customer_name || '')}<br/>${q.bus_model || ''} x${q.quantity || 1}<br/>${formatAmount(q.total_price || 0)}"]`);
    parts.push(`  end`);
    parts.push(`  class QUOT quotation`);
    parts.push("");
  }

  // ── Order Node
  if (upstream.order) {
    hasUpstream = true;
    const o = upstream.order;
    parts.push(`  subgraph SG_ORD["📦 Sales Order"]`);
    parts.push(`    ORD["${mSafe(o.order_no || 'Order')}<br/>Status: ${o.status || 'N/A'}<br/>${formatAmount(o.total_price || 0)}"]`);
    parts.push(`  end`);
    parts.push(`  class ORD order`);
    parts.push("");

    if (upstream.quotation) {
      parts.push(`  QUOT -->|"Confirmed"| ORD`);
      parts.push("");
    }
  }

  // ── Customer Payments
  if (upstream.payments.length > 0) {
    parts.push(`  subgraph SG_PAY["💳 Customer Payments"]`);
    upstream.payments.forEach((p, i) => {
      parts.push(`    PAY${i}["${mSafe(p.payment_reference || 'Payment')}<br/>${p.payment_method || ''}<br/>${formatAmount(p.payment_amount || 0)}"]`);
    });
    parts.push(`  end`);
    parts.push("");
    upstream.payments.forEach((_p, i) => {
      if (upstream.order) {
        parts.push(`  ORD -.-|"Payment ${i + 1}"| PAY${i}`);
      }
      parts.push(`  class PAY${i} payment`);
    });
    parts.push("");
  }

  // ── Source Document Node (AR Invoice / AP Invoice etc.)
  if (sourceDoc && sourceConfig) {
    const docNumber = sourceDoc[sourceConfig.numberField || "id"] || sourceType;
    const partyName = sourceDoc[sourceConfig.partyField || ""] || "";
    const docAmount = sourceDoc[sourceConfig.amountField || ""] || 0;

    parts.push(`  subgraph SG_SRC["📄 ${mSafe(sourceConfig.displayName)}"]`);
    parts.push(`    SRC["${mSafe(String(docNumber))}<br/>${partyName ? mSafe(partyName) + '<br/>' : ''}${formatAmount(docAmount)}<br/>Status: ${sourceDoc.status || 'N/A'}"]`);
    parts.push(`  end`);
    parts.push(`  class SRC sourceDoc`);
    parts.push("");

    // Edge from Order → Source Document
    if (upstream.order) {
      parts.push(`  ORD -->|"Invoiced"| SRC`);
    } else if (upstream.quotation) {
      parts.push(`  QUOT -->|"Invoiced"| SRC`);
    }
    parts.push("");
  } else if (sourceType === "manual" || sourceType === "vehicle_payment_je") {
    parts.push(`  subgraph SG_SRC["📄 Source"]`);
    parts.push(`    SRC["${sourceType === 'manual' ? 'Manual Journal Entry' : 'Vehicle Payment JE'}<br/>${mSafe(je.description || je.entry_number)}"]`);
    parts.push(`  end`);
    parts.push(`  class SRC sourceDoc`);
    parts.push("");

    if (upstream.order) {
      parts.push(`  ORD -->|"Payment Posted"| SRC`);
      parts.push("");
    }
  }

  // ── Journal Entry Node
  parts.push(`  subgraph SG_JE["📋 Journal Entry"]`);
  parts.push(`    JE["${mSafe(je.entry_number)}<br/>${je.entry_date || ''}<br/>${mSafe((je.description || '').substring(0, 60))}"]`);
  parts.push(`  end`);
  parts.push(`  class JE journalEntry`);
  parts.push("");

  // ── Edge: Source → JE
  parts.push(`  SRC -->|"Posted to GL"| JE`);
  parts.push("");

  // ── GL Impact Lines
  const debitLines = lines.filter(l => (l.debit || 0) > 0);
  const creditLines = lines.filter(l => (l.credit || 0) > 0);

  parts.push(`  subgraph SG_GL["📊 General Ledger Impact"]`);

  if (debitLines.length > 0) {
    parts.push(`    subgraph SG_DR["Debit Side"]`);
    debitLines.forEach((line, i) => {
      const acct = line.chart_of_accounts;
      const acctLabel = acct ? `${acct.account_code} - ${mSafe(acct.account_name)}` : "Unknown Account";
      parts.push(`      DR${i}["DR: ${acctLabel}<br/>${formatAmount(line.debit)}"]`);
    });
    parts.push(`    end`);
  }

  if (creditLines.length > 0) {
    parts.push(`    subgraph SG_CR["Credit Side"]`);
    creditLines.forEach((line, i) => {
      const acct = line.chart_of_accounts;
      const acctLabel = acct ? `${acct.account_code} - ${mSafe(acct.account_name)}` : "Unknown Account";
      parts.push(`      CR${i}["CR: ${acctLabel}<br/>${formatAmount(line.credit)}"]`);
    });
    parts.push(`    end`);
  }

  parts.push(`  end`);
  parts.push("");

  // ── Edges: JE → GL lines
  debitLines.forEach((_, i) => {
    parts.push(`  JE --> DR${i}`);
    parts.push(`  class DR${i} debitLine`);
  });
  creditLines.forEach((_, i) => {
    parts.push(`  JE --> CR${i}`);
    parts.push(`  class CR${i} creditLine`);
  });
  parts.push("");

  // ── Related JEs (same reference, different JE)
  if (relatedJEs.length > 0) {
    parts.push(`  subgraph SG_REL["🔗 Related Transactions"]`);
    relatedJEs.forEach((rje, i) => {
      const relTotalDebit = (rje.journal_entry_lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0);
      const relTotalCredit = (rje.journal_entry_lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0);
      const relAmount = Math.max(relTotalDebit, relTotalCredit);
      parts.push(`    REL${i}["${mSafe(rje.entry_number)}<br/>${rje.entry_date || ''}<br/>${mSafe((rje.description || '').substring(0, 50))}<br/>${formatAmount(relAmount)}"]`);
    });
    parts.push(`  end`);
    parts.push("");

    relatedJEs.forEach((_, i) => {
      parts.push(`  SRC -.-|"Same Reference"| REL${i}`);
      parts.push(`  class REL${i} relatedJE`);
    });
  }

  // ── Downstream: AR Receipts ──
  if (downstream.receipts.length > 0) {
    parts.push("");
    parts.push(`  subgraph SG_RCPT["💳 AR Receipts / Payments"]`);
    downstream.receipts.forEach((dr, i) => {
      const r = dr.receipt;
      const method = (r.payment_method || '').replace(/_/g, ' ').toUpperCase();
      parts.push(`    RCPT${i}["${mSafe(r.receipt_number || 'Receipt')}<br/>${method}<br/>${formatAmount(dr.allocation?.allocated_amount || r.amount || 0)}<br/>${r.receipt_date || ''}"]`);
    });
    parts.push(`  end`);
    parts.push("");
    downstream.receipts.forEach((dr, i) => {
      parts.push(`  SRC -.-|"Allocated: ${formatAmount(dr.allocation?.allocated_amount || 0)}"| RCPT${i}`);
      parts.push(`  class RCPT${i} receipt`);
      if (dr.journalEntry) {
        parts.push(`  RCPT${i} -.-|"Posted"| RCPT_JE${i}["${mSafe(dr.journalEntry.entry_number)}<br/>${dr.journalEntry.entry_date || ''}"]`);
        parts.push(`  class RCPT_JE${i} journalEntry`);
      }
    });
    parts.push("");
  }

  // ── Downstream: Credit Notes ──
  if (downstream.creditNotes.length > 0) {
    parts.push("");
    parts.push(`  subgraph SG_CN["📝 Credit Notes"]`);
    downstream.creditNotes.forEach((dc, i) => {
      const cn = dc.creditNote;
      parts.push(`    CN${i}["${mSafe(cn.credit_note_number || 'CN')}<br/>${formatAmount(cn.amount || 0)}<br/>${cn.credit_date || ''}<br/>Status: ${cn.status || 'N/A'}"]`);
    });
    parts.push(`  end`);
    parts.push("");
    downstream.creditNotes.forEach((dc, i) => {
      parts.push(`  SRC -.-|"Credit Note"| CN${i}`);
      parts.push(`  class CN${i} creditNote`);
      if (dc.journalEntry) {
        parts.push(`  CN${i} -.-|"Posted"| CN_JE${i}["${mSafe(dc.journalEntry.entry_number)}<br/>${dc.journalEntry.entry_date || ''}"]`);
        parts.push(`  class CN_JE${i} journalEntry`);
      }
    });
  }

  // ── Downstream: SPH Booking ──
  if (downstream.sphBooking) {
    const spb = downstream.sphBooking;
    parts.push("");
    parts.push(`  SPH_BOOK["🚌 SPH Booking<br/>${mSafe(spb.quotation_number || 'Booking')}<br/>${mSafe(spb.route_from || '')} → ${mSafe(spb.route_to || '')}<br/>${formatAmount(spb.total_amount || 0)}"]`);
    parts.push(`  SPH_BOOK -.-|"Linked"| SRC`);
    parts.push(`  class SPH_BOOK sphBooking`);
  }

  // ── Downstream: Balance Tracker ──
  if (downstream.balanceTracker) {
    const bt = downstream.balanceTracker;
    const pctPaid = bt.totalAmount > 0 ? Math.round((bt.paidAmount / bt.totalAmount) * 100) : 0;
    const statusEmoji = bt.status === 'paid' ? '✅' : bt.status === 'partial' ? '⏳' : '🔴';
    parts.push("");
    parts.push(`  BAL["${statusEmoji} Balance Tracker<br/>Total: ${formatAmount(bt.totalAmount)}<br/>Paid: ${formatAmount(bt.paidAmount)} (${pctPaid}%%)<br/>Balance: ${formatAmount(bt.balance)}<br/>Status: ${bt.status.toUpperCase()}"]`);
    parts.push(`  SRC -.-|"Tracking"| BAL`);
    parts.push(`  class BAL balanceNode`);
  }

  // ── Downstream: Bank Transactions & Reconciliation ──
  if (downstream.bankTransactions.length > 0) {
    parts.push("");
    parts.push(`  subgraph SG_BANK["🏦 Bank Transactions"]`);
    downstream.bankTransactions.forEach((btl, i) => {
      const bt = btl.bankTransaction;
      const ba = btl.bankAccount;
      const acctName = ba ? mSafe(ba.account_name || ba.bank_name || 'Bank') : 'Bank';
      const amount = bt.debit_amount || bt.credit_amount || 0;
      const txnType = (bt.transaction_type || 'txn').toUpperCase();
      const reconStatus = btl.isReconciled ? '✅ Reconciled' : '⏳ Unreconciled';
      parts.push(`    BANK${i}["${acctName}<br/>${txnType}: ${formatAmount(amount)}<br/>${bt.transaction_date || ''}<br/>${reconStatus}"]`);
    });
    parts.push(`  end`);
    parts.push("");
    downstream.bankTransactions.forEach((btl, i) => {
      parts.push(`  JE -.-|"Bank Impact"| BANK${i}`);
      parts.push(`  class BANK${i} ${btl.isReconciled ? 'receipt' : 'creditNote'}`);
    });
  }

  return parts.join("\n");
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export function useTransactionLineage(journalEntryId: string | null, enabled: boolean = true) {
  return useQuery<LineageData | null>({
    queryKey: ["transaction-lineage", journalEntryId],
    queryFn: async (): Promise<LineageData | null> => {
      if (!journalEntryId) return null;

      // 1. Fetch the Journal Entry
      const { data: je, error: jeError } = await supabase
        .from("journal_entries")
        .select("id, entry_number, entry_date, description, status, reference, source_module, business_unit_code, created_at")
        .eq("id", journalEntryId)
        .single();

      if (jeError || !je) {
        console.error("Lineage: JE not found", jeError);
        return null;
      }

      // 2. Fetch all JE Lines with account info
      const { data: lines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          id, debit, credit, description,
          account_id,
          chart_of_accounts:account_id(
            id, account_code, account_name, account_type
          )
        `)
        .eq("journal_entry_id", journalEntryId)
        .order("debit", { ascending: false });

      if (linesError) {
        console.error("Lineage: Lines fetch error", linesError);
        return null;
      }

      const jeLines = lines || [];

      // 3. Detect source type and fetch source document
      const detectedType = detectSourceModule(je.source_module, je.reference, je.entry_number);
      const sourceConfig = SOURCE_TABLE_MAP[detectedType] || null;
      let sourceDoc: any = null;

      if (sourceConfig && je.reference) {
        try {
          const { data } = await supabase
            .from(sourceConfig.table as any)
            .select("*")
            .eq(sourceConfig.matchColumn, je.reference)
            .maybeSingle();
          sourceDoc = data;
        } catch {
          // Source document may not exist for all types
        }
      }

      // 4. Find related JEs (same reference, different JE)
      let relatedJEs: any[] = [];
      if (je.reference) {
        const { data: related } = await supabase
          .from("journal_entries")
          .select(`
            id, entry_number, entry_date, description, source_module,
            journal_entry_lines(id, debit, credit)
          `)
          .eq("reference", je.reference)
          .eq("status", "posted")
          .neq("id", journalEntryId)
          .limit(10);

        relatedJEs = related || [];
      }

      // 5. Multi-hop upstream chain: AR Invoice → Order → Quotation → Payments
      const vehicleModule = detectVehicleModule(je.source_module, je.reference, je.business_unit_code);
      const upstream = await fetchUpstreamChain(sourceDoc, vehicleModule, je.reference);

      // 5b. Reverse lookup: if source is AR Receipt, trace back to the parent AR Invoice
      let effectiveSourceDoc = sourceDoc;
      let effectiveSourceType = detectedType;
      let effectiveSourceConfig = sourceConfig;
      if (detectedType === 'ar_receipt' && sourceDoc) {
        const { parentInvoice, parentSourceType } = await reverseResolveInvoice(sourceDoc, detectedType);
        if (parentInvoice) {
          effectiveSourceDoc = parentInvoice;
          effectiveSourceType = parentSourceType;
          effectiveSourceConfig = SOURCE_TABLE_MAP[parentSourceType] || sourceConfig;
        }
      }

      // 6. Downstream chain: Invoice → Receipts / Credit Notes / Balance
      const downstream = await fetchDownstreamChain(effectiveSourceDoc, effectiveSourceType);

      // 6b. Bank transaction links: detect bank CoA in JE lines → fetch bank_transactions
      const bankTxnLinks = await fetchBankTransactionLinks(je, jeLines);
      downstream.bankTransactions = bankTxnLinks;

      // 7. Build Mermaid code
      const mermaidCode = buildMermaidCode({
        je,
        lines: jeLines,
        sourceDoc: effectiveSourceDoc || sourceDoc,
        sourceType: effectiveSourceType,
        sourceConfig: effectiveSourceConfig,
        relatedJEs,
        upstream,
        downstream,
      });

      // 8. Build summary
      const totalDebit = jeLines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCredit = jeLines.reduce((s, l) => s + (l.credit || 0), 0);
      const uniqueAccounts = new Set(jeLines.map(l => l.account_id)).size;

      const partyName = upstream.quotation?.customer_name
        || upstream.order?.customer_name
        || (effectiveSourceDoc ? (effectiveSourceDoc[effectiveSourceConfig?.partyField || ""] || "") : "")
        || (sourceDoc ? (sourceDoc[sourceConfig?.partyField || ""] || "") : "")
        || extractPartyFromDescription(je.description);

      let chainDepth = 1; // JE always
      if (sourceDoc || effectiveSourceDoc) chainDepth++;
      if (upstream.order) chainDepth++;
      if (upstream.quotation) chainDepth++;
      if (downstream.receipts.length > 0) chainDepth++;
      if (downstream.creditNotes.length > 0) chainDepth++;
      if (downstream.balanceTracker) chainDepth++;
      if (downstream.bankTransactions.length > 0) chainDepth++;

      const summary = {
        sourceDocType: effectiveSourceConfig?.displayName || sourceConfig?.displayName || (detectedType === "manual" ? "Manual Entry" : detectedType),
        sourceDocNumber: effectiveSourceDoc?.[effectiveSourceConfig?.numberField || ""] || sourceDoc?.[sourceConfig?.numberField || ""] || je.reference || je.entry_number,
        partyName,
        totalDebit,
        totalCredit,
        accountsAffected: uniqueAccounts,
        relatedCount: relatedJEs.length,
        chainDepth,
        paymentsCount: downstream.receipts.length,
        balanceStatus: downstream.balanceTracker?.status || (detectedType === 'ar_receipt' ? 'receipt' : '—'),
      };

      return {
        journalEntry: je,
        journalLines: jeLines,
        sourceDocument: effectiveSourceDoc || sourceDoc,
        sourceType: effectiveSourceType,
        relatedJEs,
        upstream,
        downstream,
        nodes: [],
        edges: [],
        mermaidCode,
        summary,
      };
    },
    enabled: enabled && !!journalEntryId,
    staleTime: 60_000,
  });
}

// ─── Helper: extract party name from JE description ──────────────────────────

function extractPartyFromDescription(description: string | null): string {
  if (!description) return "";
  const dashMatch = description.match(/^(?:AR Invoice|AP Invoice|Advance Applied|Credit Note)[^-]*-\s*(.+)$/i);
  if (dashMatch) return dashMatch[1].trim();
  const fromMatch = description.match(/\bfrom\s+(.+)$/i);
  if (fromMatch) return fromMatch[1].trim();
  const toMatch = description.match(/\bto\s+(.+)$/i);
  if (toMatch) return toMatch[1].trim();
  const emDashMatch = description.match(/(?:revenue|sales)\s*[—–-]\s*(.+)$/i);
  if (emDashMatch) return emDashMatch[1].trim();
  return "";
}
