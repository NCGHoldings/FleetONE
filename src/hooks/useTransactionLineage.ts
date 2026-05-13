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

export interface LineageData {
  journalEntry: any;
  journalLines: any[];
  sourceDocument: any | null;
  sourceType: string;
  relatedJEs: any[];
  upstream: UpstreamChain;
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

// ─── Mermaid builder ─────────────────────────────────────────────────────────

function buildMermaidCode(data: {
  je: any;
  lines: any[];
  sourceDoc: any | null;
  sourceType: string;
  sourceConfig: SourceTableConfig | null;
  relatedJEs: any[];
  upstream: UpstreamChain;
}): string {
  const { je, lines, sourceDoc, sourceType, sourceConfig, relatedJEs, upstream } = data;

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

      // 6. Build Mermaid code
      const mermaidCode = buildMermaidCode({
        je,
        lines: jeLines,
        sourceDoc,
        sourceType: detectedType,
        sourceConfig,
        relatedJEs,
        upstream,
      });

      // 7. Build summary
      const totalDebit = jeLines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCredit = jeLines.reduce((s, l) => s + (l.credit || 0), 0);
      const uniqueAccounts = new Set(jeLines.map(l => l.account_id)).size;

      const partyName = upstream.quotation?.customer_name
        || upstream.order?.customer_name
        || (sourceDoc ? (sourceDoc[sourceConfig?.partyField || ""] || "") : "")
        || extractPartyFromDescription(je.description);

      let chainDepth = 1; // JE always
      if (sourceDoc) chainDepth++;
      if (upstream.order) chainDepth++;
      if (upstream.quotation) chainDepth++;

      const summary = {
        sourceDocType: sourceConfig?.displayName || (detectedType === "manual" ? "Manual Entry" : detectedType),
        sourceDocNumber: sourceDoc?.[sourceConfig?.numberField || ""] || je.reference || je.entry_number,
        partyName,
        totalDebit,
        totalCredit,
        accountsAffected: uniqueAccounts,
        relatedCount: relatedJEs.length,
        chainDepth,
      };

      return {
        journalEntry: je,
        journalLines: jeLines,
        sourceDocument: sourceDoc,
        sourceType: detectedType,
        relatedJEs,
        upstream,
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
