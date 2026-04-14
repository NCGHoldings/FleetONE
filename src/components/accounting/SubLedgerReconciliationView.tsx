import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useARInvoices, useAPInvoices, useCustomers, useVendors, useChartOfAccounts } from "@/hooks/useAccountingData";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";
import { Save, CheckCircle, AlertTriangle, Calculator } from "lucide-react";
import { toast } from "sonner";
import "./ReconciliationWorksheet.css";

const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SubLedgerReconciliationView = () => {
  const { data: arInvoices = [] } = useARInvoices();
  const { data: apInvoices = [] } = useAPInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: vendors = [] } = useVendors();
  const { data: accounts = [] } = useChartOfAccounts();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [reconType, setReconType] = useState<"ar" | "ap">("ar");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [glAccountId, setGlAccountId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const controlAccounts = useMemo(() => {
    return accounts.filter((a) =>
      a.account_type === "asset" && a.account_name?.toLowerCase().includes("receivable") ||
      a.account_type === "liability" && a.account_name?.toLowerCase().includes("payable")
    );
  }, [accounts]);

  const selectedGLAccount = accounts.find((a) => a.id === glAccountId);
  const glBalance = selectedGLAccount?.current_balance || 0;

  const breakdown = useMemo(() => {
    if (reconType === "ar") {
      const customerMap = new Map<string, { name: string; balance: number }>();
      arInvoices
        .filter((i) => i.status !== "cancelled" && new Date(i.invoice_date) <= new Date(asOfDate))
        .forEach((i) => {
          const name = customers.find((c) => c.id === i.customer_id)?.customer_name || "Unknown";
          const existing = customerMap.get(i.customer_id || "none") || { name, balance: 0 };
          existing.balance += i.balance || 0;
          customerMap.set(i.customer_id || "none", existing);
        });
      return Array.from(customerMap.entries()).map(([id, { name, balance }]) => ({ id, name, balance }));
    } else {
      const vendorMap = new Map<string, { name: string; balance: number }>();
      apInvoices
        .filter((i) => i.status !== "cancelled" && new Date(i.invoice_date) <= new Date(asOfDate))
        .forEach((i) => {
          const name = vendors.find((v) => v.id === i.vendor_id)?.vendor_name || "Unknown";
          const existing = vendorMap.get(i.vendor_id || "none") || { name, balance: 0 };
          existing.balance += i.balance || 0;
          vendorMap.set(i.vendor_id || "none", existing);
        });
      return Array.from(vendorMap.entries()).map(([id, { name, balance }]) => ({ id, name, balance }));
    }
  }, [reconType, arInvoices, apInvoices, customers, vendors, asOfDate]);

  const subledgerTotal = breakdown.reduce((sum, b) => sum + b.balance, 0);
  const difference = subledgerTotal - glBalance;

  const handleSave = async () => {
    if (!glAccountId) return toast.error("Select a GL control account");
    setSaving(true);
    try {
      await supabase.from("subledger_reconciliations").insert([{
        reconciliation_type: reconType,
        reconciliation_date: asOfDate,
        subledger_total: subledgerTotal,
        gl_balance: glBalance,
        gl_account_id: glAccountId,
        status: difference === 0 ? "completed" : "draft",
        details: breakdown,
        company_id: selectedCompanyId,
      }]);
      toast.success("Sub-Ledger Reconciliation saved");
      queryClient.invalidateQueries({ queryKey: ["subledger-reconciliations"] });
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="recon-ws-root">
      <CardHeader className="p-0">
        <div className="recon-ws-header">
          <div className="recon-ws-header-field">
            <label>Reconciliation Type</label>
            <Select value={reconType} onValueChange={(v) => setReconType(v as "ar" | "ap")}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">AR Sub-Ledger</SelectItem>
                <SelectItem value="ap">AP Sub-Ledger</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="recon-ws-header-field">
            <label>As-of Date</label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-[160px]" />
          </div>
          <div className="recon-ws-header-field">
            <label>GL Control Account</label>
            <Select value={glAccountId} onValueChange={setGlAccountId}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select GL Account" /></SelectTrigger>
              <SelectContent>
                {controlAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 recon-ws-table-wrap">
        {breakdown.length === 0 ? (
          <div className="recon-ws-empty"><Calculator /><p className="text-lg font-medium">No Data</p><p className="text-sm">Select type and date to view sub-ledger breakdown</p></div>
        ) : (
          <table className="recon-ws-table">
            <thead>
              <tr>
                <th className="w-[40px]">#</th>
                <th>{reconType === "ar" ? "Customer" : "Vendor"}</th>
                <th className="num-col">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b, idx) => (
                <tr key={b.id}>
                  <td>{idx + 1}</td>
                  <td>{b.name}</td>
                  <td className="num-col font-semibold">LKR {fmt(b.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <div className="recon-ws-summary">
        <div className="recon-ws-summary-left">
          <div className="recon-ws-summary-row"><span className="summary-label">{reconType === "ar" ? "Customers" : "Vendors"}</span><span className="summary-count">{breakdown.length}</span></div>
        </div>
        <div className="recon-ws-summary-right">
          <div className="recon-ws-balance-row"><span className="balance-label">Sub-Ledger Total</span><span className="balance-value neutral">LKR {fmt(subledgerTotal)}</span></div>
          <div className="recon-ws-balance-row"><span className="balance-label">GL Control Balance</span><span className="balance-value neutral">LKR {fmt(glBalance)}</span></div>
          <div className="recon-ws-balance-row difference-row">
            <span className="balance-label">Difference</span>
            <span className={`balance-value ${difference === 0 ? "match" : "negative"}`}>
              {difference === 0 ? (<><CheckCircle className="inline w-4 h-4 mr-1" />LKR 0.00</>) : (<><AlertTriangle className="inline w-4 h-4 mr-1" />LKR {fmt(Math.abs(difference))}</>)}
            </span>
          </div>
        </div>
      </div>

      <div className="recon-ws-actions">
        <Button onClick={handleSave} disabled={saving || !glAccountId}>
          <Save className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save Reconciliation"}
        </Button>
      </div>
    </Card>
  );
};
