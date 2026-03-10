import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAPInvoices, useAPPayments, useVendors } from "@/hooks/useAccountingData";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Save, X, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import "./ReconciliationWorksheet.css";

type DisplayFilter = "all" | "not_cleared" | "cleared";
interface ClearedState { [id: string]: { cleared: boolean; clearedAmount: number } }

const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const APReconciliationWorksheet = () => {
  const { data: vendors = [] } = useVendors();
  const { data: invoices = [] } = useAPInvoices();
  const { data: payments = [] } = useAPPayments();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [statementBalance, setStatementBalance] = useState<string>("");
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>("all");
  const [clearedState, setClearedState] = useState<ClearedState>({});
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => {
    if (!selectedVendorId) return [];
    const docs: Array<{
      id: string; type: string; typeLabel: string; typeClass: string;
      date: string; docNo: string; reference: string;
      debit: number; credit: number;
    }> = [];

    invoices
      .filter((i) => i.vendor_id === selectedVendorId && i.status !== "cancelled")
      .forEach((i) => {
        docs.push({
          id: `inv-${i.id}`, type: "invoice", typeLabel: "INV", typeClass: "ap-invoice",
          date: i.invoice_date, docNo: i.invoice_number, reference: i.reference || "—",
          debit: i.total_amount || 0, credit: 0,
        });
      });

    payments
      .filter((p) => p.vendor_id === selectedVendorId && p.status !== "cancelled")
      .forEach((p) => {
        docs.push({
          id: `pmt-${p.id}`, type: "payment", typeLabel: "PMT", typeClass: "ap-payment",
          date: p.payment_date, docNo: p.payment_number, reference: p.reference || "—",
          debit: 0, credit: p.amount || 0,
        });
      });

    docs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return docs;
  }, [selectedVendorId, invoices, payments]);

  const filteredItems = useMemo(() => {
    if (displayFilter === "cleared") return items.filter((i) => clearedState[i.id]?.cleared);
    if (displayFilter === "not_cleared") return items.filter((i) => !clearedState[i.id]?.cleared);
    return items;
  }, [items, displayFilter, clearedState]);

  const summary = useMemo(() => {
    let invCount = 0, invTotal = 0, pmtCount = 0, pmtTotal = 0;
    let clearedDebit = 0, clearedCredit = 0;

    items.forEach((i) => {
      if (i.debit > 0) { invCount++; invTotal += i.debit; }
      if (i.credit > 0) { pmtCount++; pmtTotal += i.credit; }
      const cs = clearedState[i.id];
      if (cs?.cleared) {
        if (i.debit > 0) clearedDebit += cs.clearedAmount;
        if (i.credit > 0) clearedCredit += cs.clearedAmount;
      }
    });

    const bookBalance = invTotal - pmtTotal;
    const clearedBookBalance = clearedDebit - clearedCredit;
    const stmtBal = parseFloat(statementBalance) || 0;
    const difference = clearedBookBalance - stmtBal;

    return { invCount, invTotal, pmtCount, pmtTotal, bookBalance, clearedBookBalance, stmtBal, difference };
  }, [items, clearedState, statementBalance]);

  const toggleCleared = useCallback((id: string, amount: number) => {
    setClearedState((prev) => {
      if (prev[id]?.cleared) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: { cleared: true, clearedAmount: amount } };
    });
  }, []);

  const updateClearedAmount = useCallback((id: string, amount: number) => {
    setClearedState((prev) => ({ ...prev, [id]: { ...prev[id], cleared: true, clearedAmount: amount } }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const allCleared = filteredItems.every((i) => clearedState[i.id]?.cleared);
    if (allCleared) {
      const next: ClearedState = {};
      Object.keys(clearedState).forEach((id) => { if (!filteredItems.find((i) => i.id === id)) next[id] = clearedState[id]; });
      setClearedState(next);
    } else {
      const next = { ...clearedState };
      filteredItems.forEach((i) => { if (!next[i.id]) next[i.id] = { cleared: true, clearedAmount: i.debit > 0 ? i.debit : i.credit }; });
      setClearedState(next);
    }
  }, [filteredItems, clearedState]);

  const handleSave = useCallback(async () => {
    if (!selectedVendorId) return toast.error("Select a vendor");
    if (!statementBalance) return toast.error("Enter vendor statement balance");
    const clearedIds = Object.entries(clearedState).filter(([, v]) => v.cleared).map(([id]) => id);
    if (clearedIds.length === 0) return toast.error("No items cleared");

    setSaving(true);
    try {
      const { data: recon, error } = await supabase.from("ap_reconciliations").insert([{
        vendor_id: selectedVendorId,
        reconciliation_date: new Date().toISOString().split("T")[0],
        vendor_statement_balance: summary.stmtBal,
        opening_balance: 0,
        closing_balance: summary.clearedBookBalance,
        discrepancy_amount: summary.difference,
        status: summary.difference === 0 ? "completed" : "draft",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;

      const itemRows = clearedIds.map((id) => {
        const item = items.find((i) => i.id === id);
        const cs = clearedState[id];
        return {
          reconciliation_id: recon.id,
          source_type: item?.type || "unknown",
          source_id: id.split("-").slice(1).join("-"),
          doc_number: item?.docNo || "",
          doc_date: item?.date || null,
          debit_amount: item?.debit || 0,
          credit_amount: item?.credit || 0,
          cleared: true,
          cleared_amount: cs.clearedAmount,
          company_id: selectedCompanyId,
        };
      });
      await supabase.from("ap_reconciliation_items").insert(itemRows);

      toast.success("AP Reconciliation saved");
      setClearedState({});
      setStatementBalance("");
      queryClient.invalidateQueries({ queryKey: ["ap-reconciliations"] });
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [selectedVendorId, statementBalance, clearedState, summary, items, selectedCompanyId, queryClient]);

  return (
    <Card className="recon-ws-root">
      <CardHeader className="p-0">
        <div className="recon-ws-header">
          <div className="recon-ws-header-field">
            <label>Vendor</label>
            <Select value={selectedVendorId || ""} onValueChange={(v) => { setSelectedVendorId(v); setClearedState({}); }}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (<SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="recon-ws-header-field">
            <label>Vendor Statement Balance</label>
            <Input type="number" step="0.01" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} placeholder="0.00" className="w-[160px]" />
          </div>
          <div className="recon-ws-header-field">
            <label>Display</label>
            <Select value={displayFilter} onValueChange={(v) => setDisplayFilter(v as DisplayFilter)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="not_cleared">Not Cleared</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 recon-ws-table-wrap">
        {!selectedVendorId ? (
          <div className="recon-ws-empty"><Building2 /><p className="text-lg font-medium">Select a Vendor</p><p className="text-sm">Choose a vendor above to begin AP reconciliation</p></div>
        ) : filteredItems.length === 0 ? (
          <div className="recon-ws-empty"><FileText /><p className="text-lg font-medium">No Documents Found</p></div>
        ) : (
          <table className="recon-ws-table">
            <thead>
              <tr>
                <th className="w-[40px]">#</th>
                <th className="w-[50px]"><input type="checkbox" className="cleared-checkbox" checked={filteredItems.length > 0 && filteredItems.every((i) => clearedState[i.id]?.cleared)} onChange={handleSelectAll} /></th>
                <th className="w-[60px]">Type</th>
                <th className="w-[100px]">Date</th>
                <th>Doc No.</th>
                <th>Reference</th>
                <th className="num-col">Debit</th>
                <th className="num-col">Credit</th>
                <th className="num-col w-[120px]">Cleared Amt</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const cs = clearedState[item.id];
                const isCleared = !!cs?.cleared;
                const amount = item.debit > 0 ? item.debit : item.credit;
                return (
                  <tr key={item.id} className={isCleared ? "row-cleared" : ""}>
                    <td>{idx + 1}</td>
                    <td><input type="checkbox" className="cleared-checkbox" checked={isCleared} onChange={() => toggleCleared(item.id, amount)} /></td>
                    <td><span className={`type-badge ${item.typeClass}`}>{item.typeLabel}</span></td>
                    <td>{format(new Date(item.date), "dd/MM/yyyy")}</td>
                    <td className="font-mono text-xs">{item.docNo}</td>
                    <td>{item.reference}</td>
                    <td className="num-col">{item.debit > 0 ? `LKR ${fmt(item.debit)}` : "—"}</td>
                    <td className="num-col">{item.credit > 0 ? `LKR ${fmt(item.credit)}` : "—"}</td>
                    <td className="num-col">
                      {isCleared ? (
                        <input type="number" step="0.01" className="cleared-amount-input" value={cs?.clearedAmount ?? ""} onChange={(e) => updateClearedAmount(item.id, parseFloat(e.target.value) || 0)} />
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>

      {selectedVendorId && (
        <div className="recon-ws-summary">
          <div className="recon-ws-summary-left">
            <div className="recon-ws-summary-row"><span className="summary-label">Invoices</span><span className="summary-count">{summary.invCount}</span><span className="summary-amount negative">LKR {fmt(summary.invTotal)}</span></div>
            <div className="recon-ws-summary-row"><span className="summary-label">Payments</span><span className="summary-count">{summary.pmtCount}</span><span className="summary-amount positive">LKR {fmt(summary.pmtTotal)}</span></div>
          </div>
          <div className="recon-ws-summary-right">
            <div className="recon-ws-balance-row"><span className="balance-label">Cleared Book Balance</span><span className={`balance-value ${summary.clearedBookBalance >= 0 ? "positive" : "negative"}`}>LKR {fmt(summary.clearedBookBalance)}</span></div>
            <div className="recon-ws-balance-row"><span className="balance-label">Vendor Statement Balance</span><span className="balance-value neutral">LKR {fmt(summary.stmtBal)}</span></div>
            <div className="recon-ws-balance-row difference-row">
              <span className="balance-label">Difference</span>
              <span className={`balance-value ${summary.difference === 0 ? "match" : "negative"}`}>
                {summary.difference === 0 ? (<><CheckCircle className="inline w-4 h-4 mr-1" />LKR 0.00</>) : (<><AlertTriangle className="inline w-4 h-4 mr-1" />LKR {fmt(Math.abs(summary.difference))}</>)}
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedVendorId && (
        <div className="recon-ws-actions">
          <Button variant="outline" onClick={() => { setClearedState({}); toast.info("Cleared selections reset"); }}><X className="w-4 h-4 mr-2" />Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !statementBalance || Object.keys(clearedState).length === 0}><Save className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save Reconciliation"}</Button>
        </div>
      )}
    </Card>
  );
};
