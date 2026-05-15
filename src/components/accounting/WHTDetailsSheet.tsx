import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, FileSpreadsheet, Building2 } from "lucide-react";
import { useVendors } from "@/hooks/useAccountingData";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/utils";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import XLSX from "xlsx-js-style";

// ===== WHT Payment Type Mapping =====
// Maps vendor categories to WHT payment types as per Sri Lanka IRD guidelines
const WHT_PAYMENT_TYPE_MAP: Record<string, string> = {
  "rent": "Rent",
  "vehicle rent": "Vehicle Rent",
  "vehicle_rent": "Vehicle Rent",
  "services": "Service Fee",
  "service": "Service Fee",
  "service fee": "Service Fee",
  "professional": "Service Fee",
  "consulting": "Service Fee",
  "contract": "Contract Payment",
  "contractor": "Contract Payment",
  "interest": "Interest",
  "commission": "Commission",
  "dividend": "Dividend",
  "royalty": "Royalty",
  "insurance": "Insurance Premium",
  "other": "Other",
};

// Maps wht_category DB values to display labels
const WHT_CATEGORY_LABEL_MAP: Record<string, string> = {
  "rent": "Rent",
  "service_fee": "Service Fee",
  "vehicle_rent": "Vehicle Rent",
  "interest": "Interest",
  "commission": "Commission",
  "other": "Other",
  "non_liable": "Non-Liable",
};

function resolvePaymentType(vendor: any, invoice: any): string {
  // 1. Prefer explicit wht_category from the invoice (set via dropdown)
  const cat = (invoice as any)?.wht_category;
  if (cat && WHT_CATEGORY_LABEL_MAP[cat]) return WHT_CATEGORY_LABEL_MAP[cat];

  // 2. Try vendor category name
  const catName = vendor?.vendor_categories?.category_name?.toLowerCase() || "";
  for (const [key, val] of Object.entries(WHT_PAYMENT_TYPE_MAP)) {
    if (catName.includes(key)) return val;
  }
  // 3. Try invoice description / notes
  const desc = (invoice?.notes || invoice?.description || "").toLowerCase();
  for (const [key, val] of Object.entries(WHT_PAYMENT_TYPE_MAP)) {
    if (desc.includes(key)) return val;
  }
  // 4. Fallback from WHT rate
  if (vendor?.wht_rate === 5) return "Rent";
  if (vendor?.wht_rate === 2) return "Service Fee";
  if (vendor?.wht_rate === 10) return "Interest";
  if (vendor?.wht_rate === 14) return "Contract Payment";
  return "Other";
}

interface WHTLineItem {
  serialNo: number;
  paymentType: string;
  withholdee_name: string;
  withholdee_address: string;
  withholdee_tin_nic: string;
  description: string;
  total_amount_paid: number;
  wht_rate: number;
  wht_amount: number;
  net_amount: number;
  special_notes: string;
  invoice_number: string;
  invoice_date: string;
  is_liable: boolean;
}

type PeriodOption = "current" | "previous" | "q1" | "q2" | "q3" | "q4";

export const WHTDetailsSheet = () => {
  const [periodOption, setPeriodOption] = useState<PeriodOption>("current");
  const { selectedCompany, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const { data: vendors = [] } = useVendors();

  // Custom query: joins ap_invoice_lines to get line-level descriptions
  // (the standard useAPInvoices hook doesn't include line descriptions)
  const { data: apInvoices = [] } = useQuery({
    queryKey: ["ap-invoices-wht", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const query = supabase
        .from("ap_invoices")
        .select("*, vendors(vendor_name), ap_invoice_lines(description)")
        .eq("company_id", effectiveCompanyId)
        .order("invoice_date", { ascending: false });
      const data = await fetchAllRows(query);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  // ===== Period Logic =====
  const getPeriodDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    switch (periodOption) {
      case "current":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "previous":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "q1":
        return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
      case "q2":
        return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };
      case "q3":
        return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };
      case "q4":
        return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getPeriodDates();

  // ===== Build Vendor Lookup =====
  const vendorMap = useMemo(() => {
    const map: Record<string, any> = {};
    (vendors || []).forEach((v: any) => {
      map[v.id] = v;
    });
    return map;
  }, [vendors]);

  // ===== Build WHT Line Items =====
  // Include ALL AP invoices in the selected period.
  // Items with wht_amount > 0 are Section A (Liable).
  // All others go to Section B (Non-Liable).
  const allItems: WHTLineItem[] = useMemo(() => {
    if (!apInvoices || apInvoices.length === 0) return [];

    const filtered = (apInvoices as any[]).filter((inv) => {
      const invDate = new Date(inv.invoice_date);
      return invDate >= start && invDate <= end;
    });

    let serial = 0;
    return filtered.map((inv) => {
        serial++;
        const vendor = vendorMap[inv.vendor_id] || {};
        const whtAmt = Number(inv.wht_amount) || 0;
        const whtRate = whtAmt > 0 && inv.total_amount
          ? Math.round((whtAmt / inv.total_amount) * 100)
          : Number(inv.wht_rate) || vendor.wht_rate || 0;

        // If wht_category is explicitly 'non_liable', force into Section B
        const explicitNonLiable = (inv as any).wht_category === 'non_liable';
        // Liable = has actual WHT deducted, OR vendor is flagged as wht_applicable with a known rate (but not if forced non-liable)
        const isLiable = !explicitNonLiable && (whtAmt > 0 || (vendor.wht_applicable && whtRate > 0));

        return {
          serialNo: serial,
          paymentType: resolvePaymentType(vendor, inv),
          withholdee_name: vendor.vendor_name || inv.vendors?.vendor_name || "Unknown",
          withholdee_address: vendor.address || "-",
          withholdee_tin_nic: vendor.tax_id || "-",
          description: (inv as any).ap_invoice_lines?.map((l: any) => l.description).filter(Boolean).join(', ') || inv.notes || "",
          total_amount_paid: inv.total_amount || 0,
          wht_rate: whtRate,
          wht_amount: whtAmt,
          net_amount: (inv.total_amount || 0) - whtAmt,
          special_notes: inv.notes || "",
          invoice_number: inv.invoice_number || "",
          invoice_date: inv.invoice_date,
          is_liable: isLiable,
        };
      });
  }, [apInvoices, vendorMap, start, end]);

  // ===== Split into Liable and Non-Liable =====
  const liableItems = allItems.filter((i) => i.is_liable);
  const nonLiableItems = allItems.filter((i) => !i.is_liable);

  // ===== Group liable items by payment type =====
  const groupedLiable = useMemo(() => {
    const groups: Record<string, WHTLineItem[]> = {};
    liableItems.forEach((item) => {
      if (!groups[item.paymentType]) groups[item.paymentType] = [];
      groups[item.paymentType].push(item);
    });
    return groups;
  }, [liableItems]);

  // ===== Grand Totals =====
  const grandTotalPaid = liableItems.reduce((s, i) => s + i.total_amount_paid, 0);
  const grandTotalWHT = liableItems.reduce((s, i) => s + i.wht_amount, 0);
  const grandTotalNet = liableItems.reduce((s, i) => s + i.net_amount, 0);
  const nonLiableTotalAmount = nonLiableItems.reduce((s, i) => s + i.total_amount_paid, 0);

  // ===== Print Handler =====
  const handlePrint = () => {
    const printArea = document.getElementById("wht-details-sheet-print");
    if (!printArea) return;
    const w = window.open("", "_blank", "width=1200,height=800");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>WHT Details Sheet - ${format(start, "MMMM yyyy")}</title>
           <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 10px; color: #1a1a1a; margin: 0; padding: 10px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 12px; table-layout: fixed; }
            th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            th { background-color: #1e3a5f; color: white; font-weight: 600; font-size: 9px; text-transform: uppercase; }
            td.num { text-align: right; font-family: 'Courier New', monospace; }
            .section-title { background: #e8f0fe; font-weight: 700; padding: 6px 8px; margin: 12px 0 4px; border-left: 4px solid #1e3a5f; }
            .cat-hdr td { background-color: #f0f4f8; font-weight: 700; font-style: italic; border-bottom: 1px solid #ccc; }
            .sub-row td { background-color: #e2e8f0; font-weight: 700; }
            .grand td { background-color: #1e3a5f; color: white; font-weight: 700; }
            .footer { margin-top: 20px; font-size: 9px; color: #888; text-align: center; border-top: 1px solid #ccc; padding-top: 6px; }
          </style>
        </head>
        <body>${printArea.innerHTML}
          <div class="footer">System Generated — ${format(new Date(), "dd MMM yyyy HH:mm")} — This is a computer-generated document and does not require a signature.</div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  // ===== Excel Export Handler (Formatted .xlsx with IRD Template Styling) =====
  const handleExcelExport = () => {
    // Style definitions matching IRD WHT template
    const border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } as const;
    const titleStyle = { font: { bold: true, sz: 14 } };
    const labelStyle = { font: { bold: true, sz: 11 } };
    const valueStyle = { font: { sz: 11 } };
    const sectionStyle = { font: { bold: true, sz: 12, underline: true } };
    const hdrStyle = { font: { bold: true, sz: 10, color: { rgb: '000000' } }, fill: { fgColor: { rgb: 'FFFF00' } }, border, alignment: { horizontal: 'center', wrapText: true } } as any;
    const catStyle = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'F2F2F2' } }, border } as any;
    const cellStr = (v: string) => ({ v, t: 's' as const, s: { font: { sz: 10 }, border } });
    const cellNum = (v: number) => ({ v, t: 'n' as const, s: { font: { sz: 10 }, border, numFmt: '#,##0.00', alignment: { horizontal: 'right' } } });
    const cellPct = (v: number) => ({ v, t: 'n' as const, s: { font: { sz: 10 }, border, alignment: { horizontal: 'center' } } });
    const totalStr = (v: string) => ({ v, t: 's' as const, s: { font: { bold: true, sz: 10 }, border, alignment: { horizontal: 'right' } } });
    const totalNum = (v: number) => ({ v, t: 'n' as const, s: { font: { bold: true, sz: 10 }, border, numFmt: '#,##0.00', alignment: { horizontal: 'right' } } });
    const grandStr = (v: string) => ({ v, t: 's' as const, s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F4E79' } }, border, alignment: { horizontal: 'right' } } });
    const grandNum = (v: number) => ({ v, t: 'n' as const, s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F4E79' } }, border, numFmt: '#,##0.00', alignment: { horizontal: 'right' } } });
    const empty = { v: '', t: 's' as const, s: { border } };

    const data: any[][] = [];
    const COLS = 11;
    const emptyRow = () => new Array(COLS).fill(null);

    // === HEADER ===
    data.push([{ v: 'WHT Details Sheet', s: titleStyle }, ...new Array(COLS - 1).fill(null)]);
    data.push(emptyRow());
    data.push([{ v: 'Company Name:', s: labelStyle }, { v: companyName, s: valueStyle }, ...new Array(COLS - 2).fill(null)]);
    data.push([{ v: 'TIN Number:', s: labelStyle }, { v: (selectedCompany as any)?.tax_id || (selectedCompany as any)?.registration_number || '—', s: valueStyle }, ...new Array(COLS - 2).fill(null)]);
    data.push([{ v: 'Month:', s: labelStyle }, { v: periodLabel, s: valueStyle }, ...new Array(COLS - 2).fill(null)]);
    data.push(emptyRow());

    // === SECTION A: LIABLE LIST ===
    data.push([{ v: 'Liable List', s: sectionStyle }, ...new Array(COLS - 1).fill(null)]);
    data.push(emptyRow());
    // Column headers (yellow background)
    data.push(
      ['Serial No', 'Type of Payment', "Withholdee's Name", "Withholdee's Address", "Withholdee's TIN/NIC",
       'Description', 'Total Amount Paid (Rs.)', 'Rate of WHT (%)', 'Amount of WHT Deducted (Rs.)', 'Net Amount', 'Special notes'
      ].map(h => ({ v: h, t: 's' as const, s: hdrStyle }))
    );

    // Grouped by payment type
    Object.entries(groupedLiable).forEach(([paymentType, items]) => {
      // Category header row (grey background)
      const catRow = new Array(COLS).fill(null);
      catRow[0] = { v: paymentType, t: 's' as const, s: catStyle };
      for (let i = 1; i < COLS; i++) catRow[i] = { v: '', t: 's' as const, s: { fill: { fgColor: { rgb: 'F2F2F2' } }, border } };
      data.push(catRow);

      // Line items
      items.forEach((item, idx) => {
        data.push([
          cellStr(String(idx + 1)),
          cellStr(item.paymentType),
          cellStr(item.withholdee_name),
          cellStr(item.withholdee_address),
          cellStr(item.withholdee_tin_nic),
          cellStr(item.description),
          cellNum(item.total_amount_paid),
          cellPct(item.wht_rate),
          cellNum(item.wht_amount),
          cellNum(item.net_amount),
          cellStr(item.special_notes),
        ]);
      });
      // Empty row for manual entries
      data.push(new Array(COLS).fill(empty));

      // Sub-total
      const subtotalPaid = items.reduce((s, i) => s + i.total_amount_paid, 0);
      const subtotalWHT = items.reduce((s, i) => s + i.wht_amount, 0);
      const subtotalNet = items.reduce((s, i) => s + i.net_amount, 0);
      data.push([empty, empty, empty, empty, empty, totalStr('Total'), totalNum(subtotalPaid), empty, totalNum(subtotalWHT), totalNum(subtotalNet), empty]);
      data.push(emptyRow());
    });

    // Grand Total (dark blue background, white text)
    data.push([
      { v: '', s: { fill: { fgColor: { rgb: '1F4E79' } }, border } },
      { v: '', s: { fill: { fgColor: { rgb: '1F4E79' } }, border } },
      { v: '', s: { fill: { fgColor: { rgb: '1F4E79' } }, border } },
      { v: '', s: { fill: { fgColor: { rgb: '1F4E79' } }, border } },
      { v: '', s: { fill: { fgColor: { rgb: '1F4E79' } }, border } },
      grandStr('Grand Total'),
      grandNum(grandTotalPaid),
      { v: '', s: { fill: { fgColor: { rgb: '1F4E79' } }, border } },
      grandNum(grandTotalWHT),
      grandNum(grandTotalNet),
      { v: '', s: { fill: { fgColor: { rgb: '1F4E79' } }, border } },
    ]);
    data.push(emptyRow());
    data.push(emptyRow());

    // === SECTION B: NON-LIABLE LIST ===
    data.push([{ v: 'Non-Liable List', s: sectionStyle }, ...new Array(5).fill(null)]);
    data.push(new Array(6).fill(null));
    data.push(
      ['Serial No', 'Type of Payment', 'Name', 'Description', 'Total Amount Paid (Rs.)', 'Invoice #'
      ].map(h => ({ v: h, t: 's' as const, s: hdrStyle }))
    );
    nonLiableItems.forEach((item, idx) => {
      data.push([
        cellStr(String(idx + 1)),
        cellStr(item.paymentType),
        cellStr(item.withholdee_name),
        cellStr(item.description),
        cellNum(item.total_amount_paid),
        cellStr(item.invoice_number),
      ]);
    });
    // Non-liable total
    data.push([empty, empty, totalStr('Total Non-Liable'), empty, totalNum(nonLiableTotalAmount), empty]);

    // Build workbook
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Column widths
    ws['!cols'] = [
      { wch: 8 },  // Serial No
      { wch: 16 }, // Type of Payment
      { wch: 24 }, // Name
      { wch: 28 }, // Address
      { wch: 16 }, // TIN
      { wch: 22 }, // Description
      { wch: 20 }, // Amount Paid
      { wch: 12 }, // WHT %
      { wch: 22 }, // WHT Deducted
      { wch: 18 }, // Net Amount
      { wch: 16 }, // Notes
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `WHT_Details_${format(start, 'yyyy-MM')}`);
    XLSX.writeFile(wb, `WHT_Details_${format(start, 'yyyy-MM')}.xlsx`);
  };

  // ===== Format number for display =====
  const fmtNum = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const companyName = selectedCompany?.name || "Company Name";
  const periodLabel = format(start, "MMMM yyyy") + (periodOption.startsWith("q") ? ` (${periodOption.toUpperCase()})` : "");

  // ===== Shared inline styles for consistent alignment =====
  const cellStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', verticalAlign: 'middle' };
  const numCellStyle: React.CSSProperties = { ...cellStyle, textAlign: 'right', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' };
  const thStyle: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

  return (
    <div className="space-y-4">
      {/* ===== Controls Bar ===== */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Reporting Period</Label>
          <Select value={periodOption} onValueChange={(v) => setPeriodOption(v as PeriodOption)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month ({format(startOfMonth(new Date()), "MMM yyyy")})</SelectItem>
              <SelectItem value="previous">Previous Month ({format(subMonths(new Date(), 1), "MMM yyyy")})</SelectItem>
              <SelectItem value="q1">Q1 (Jan - Mar {new Date().getFullYear()})</SelectItem>
              <SelectItem value="q2">Q2 (Apr - Jun {new Date().getFullYear()})</SelectItem>
              <SelectItem value="q3">Q3 (Jul - Sep {new Date().getFullYear()})</SelectItem>
              <SelectItem value="q4">Q4 (Oct - Dec {new Date().getFullYear()})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* ===== KPI Summary Strip ===== */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="p-3 border-l-4 border-l-blue-500">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Liable Vendors</p>
          <p className="text-xl font-bold mt-1">{liableItems.length}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-orange-500">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total WHT Deducted</p>
          <p className="text-xl font-bold mt-1 text-orange-600"><CurrencyDisplay amount={grandTotalWHT} /></p>
        </Card>
        <Card className="p-3 border-l-4 border-l-emerald-500">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Amount Paid</p>
          <p className="text-xl font-bold mt-1"><CurrencyDisplay amount={grandTotalPaid} /></p>
        </Card>
        <Card className="p-3 border-l-4 border-l-slate-400">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Non-Liable Amount</p>
          <p className="text-xl font-bold mt-1 text-muted-foreground"><CurrencyDisplay amount={nonLiableTotalAmount} /></p>
        </Card>
      </div>

      {/* ===== Printable Sheet ===== */}
      <Card className="p-0 overflow-hidden" id="wht-details-sheet-print">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 opacity-80" />
            <div>
              <h1 className="text-lg font-bold tracking-wide">{companyName}</h1>
              <p className="text-xs text-slate-300 mt-0.5">TIN: {selectedCompany?.tax_id || selectedCompany?.registration_number || "—"}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">WHT Details Sheet</h2>
              <p className="text-xs text-slate-300">
                Period: {format(start, "dd MMM yyyy")} — {format(end, "dd MMM yyyy")}
              </p>
            </div>
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-xs">
              {periodLabel}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* ===== SECTION A: Liable List ===== */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">
                Section A — Liable List (WHT Deductible)
              </h3>
              <Badge variant="outline" className="ml-auto text-xs">
                {liableItems.length} entries
              </Badge>
            </div>

            {Object.keys(groupedLiable).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border rounded-md bg-muted/30">
                No WHT-liable transactions found for this period
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }} className="text-xs">
                  <colgroup>
                    <col style={{ width: '34px' }} />{/* S/N */}
                    <col style={{ width: '80px' }} />{/* Type of Payment */}
                    <col style={{ width: '12%' }} />{/* Withholdee Name */}
                    <col style={{ width: '10%' }} />{/* Address */}
                    <col style={{ width: '80px' }} />{/* TIN/NIC */}
                    <col style={{ width: '12%' }} />{/* Description */}
                    <col style={{ width: '11%' }} />{/* Total Amount Paid */}
                    <col style={{ width: '46px' }} />{/* WHT % */}
                    <col style={{ width: '10%' }} />{/* WHT Deducted */}
                    <col style={{ width: '10%' }} />{/* Net Amount */}
                    <col style={{ width: '70px' }} />{/* Notes */}
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th style={thStyle}>S/N</th>
                      <th style={thStyle}>Type of Payment</th>
                      <th style={thStyle}>Withholdee's Name</th>
                      <th style={thStyle}>Withholdee's Address</th>
                      <th style={thStyle}>TIN / NIC</th>
                      <th style={thStyle}>Description</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total Amount Paid (Rs.)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>WHT %</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>WHT Deducted (Rs.)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Net Amount (Rs.)</th>
                      <th style={thStyle}>Notes</th>
                    </tr>
                  </thead>
                  {Object.entries(groupedLiable).map(([paymentType, items]) => {
                    const subtotalPaid = items.reduce((s, i) => s + i.total_amount_paid, 0);
                    const subtotalWHT = items.reduce((s, i) => s + i.wht_amount, 0);
                    const subtotalNet = items.reduce((s, i) => s + i.net_amount, 0);

                    return (
                      <tbody key={paymentType}>
                        {/* Category Header */}
                        <tr style={{ background: '#eff6ff', borderTop: '2px solid #bfdbfe' }}>
                          <td colSpan={11} style={{ ...cellStyle, fontWeight: 700, color: '#1e40af', fontStyle: 'italic' }}>
                            ▸ {paymentType}
                          </td>
                        </tr>
                        {/* Line Items */}
                        {items.map((item, idx) => (
                          <tr
                            key={`${paymentType}-${idx}`}
                            style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td style={{ ...cellStyle, textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>{item.serialNo}</td>
                            <td style={{ ...cellStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.paymentType}</td>
                            <td style={{ ...cellStyle, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.withholdee_name}>{item.withholdee_name}</td>
                            <td style={{ ...cellStyle, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.withholdee_address}>{item.withholdee_address}</td>
                            <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '11px' }}>{item.withholdee_tin_nic}</td>
                            <td style={{ ...cellStyle, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>{item.description || '—'}</td>
                            <td style={numCellStyle}>{fmtNum(item.total_amount_paid)}</td>
                            <td style={{ ...cellStyle, textAlign: 'center', fontFamily: 'monospace' }}>{item.wht_rate}%</td>
                            <td style={{ ...numCellStyle, fontWeight: 600, color: '#c2410c' }}>{fmtNum(item.wht_amount)}</td>
                            <td style={numCellStyle}>{fmtNum(item.net_amount)}</td>
                            <td style={{ ...cellStyle, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.special_notes || ''}>{item.special_notes || '—'}</td>
                          </tr>
                        ))}
                        {/* Subtotal Row */}
                        <tr style={{ background: '#dbeafe', borderTop: '1px solid #93c5fd' }}>
                          <td colSpan={6} style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#1e40af', fontSize: '11px' }}>
                            Sub Total — {paymentType}
                          </td>
                          <td style={{ ...numCellStyle, fontWeight: 700 }}>{fmtNum(subtotalPaid)}</td>
                          <td style={cellStyle}></td>
                          <td style={{ ...numCellStyle, fontWeight: 700, color: '#c2410c' }}>{fmtNum(subtotalWHT)}</td>
                          <td style={{ ...numCellStyle, fontWeight: 700 }}>{fmtNum(subtotalNet)}</td>
                          <td style={cellStyle}></td>
                        </tr>
                      </tbody>
                    );
                  })}
                  {/* Grand Total */}
                  <tfoot>
                    <tr style={{ background: '#1e293b', color: '#fff' }}>
                      <td colSpan={6} style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>
                        Grand Total
                      </td>
                      <td style={{ ...numCellStyle, fontWeight: 700, color: '#fff' }}>{fmtNum(grandTotalPaid)}</td>
                      <td style={{ ...cellStyle, color: '#fff' }}></td>
                      <td style={{ ...numCellStyle, fontWeight: 700, color: '#fdba74' }}>{fmtNum(grandTotalWHT)}</td>
                      <td style={{ ...numCellStyle, fontWeight: 700, color: '#fff' }}>{fmtNum(grandTotalNet)}</td>
                      <td style={{ ...cellStyle, color: '#fff' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ===== SECTION B: Non-Liable List ===== */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="h-5 w-5 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                Section B — Non-Liable List (WHT Not Applicable)
              </h3>
              <Badge variant="outline" className="ml-auto text-xs">
                {nonLiableItems.length} entries
              </Badge>
            </div>

            {nonLiableItems.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm border rounded-md bg-muted/30">
                No non-liable transactions for this period
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }} className="text-xs">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '16%' }} />
                    <col />
                  </colgroup>
                  <thead>
                    <tr style={{ background: '#475569', color: '#fff' }}>
                      <th style={thStyle}>S/N</th>
                      <th style={thStyle}>Type of Payment</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Description</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Non-Liable Amount (Rs.)</th>
                      <th style={thStyle}>Invoice #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonLiableItems.map((item, idx) => (
                      <tr
                        key={`nl-${idx}`}
                        style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td style={{ ...cellStyle, textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ ...cellStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.paymentType}</td>
                        <td style={{ ...cellStyle, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.withholdee_name}>{item.withholdee_name}</td>
                        <td style={{ ...cellStyle, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>{item.description || '—'}</td>
                        <td style={numCellStyle}>{fmtNum(item.total_amount_paid)}</td>
                        <td style={{ ...cellStyle, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '11px' }} title={item.invoice_number}>{item.invoice_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#475569', color: '#fff' }}>
                      <td colSpan={4} style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: '#fff' }}>Total Non-Liable</td>
                      <td style={{ ...numCellStyle, fontWeight: 700, color: '#fff' }}>{fmtNum(nonLiableTotalAmount)}</td>
                      <td style={{ ...cellStyle, color: '#fff' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ===== Footer ===== */}
          <div className="border-t pt-3 mt-4">
            <p className="text-[10px] text-muted-foreground text-center italic">
              System Generated — {format(new Date(), "dd MMM yyyy HH:mm")} — This is a computer-generated document and does not require a signature.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
