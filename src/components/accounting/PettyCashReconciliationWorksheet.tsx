import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Save, X, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import "./ReconciliationWorksheet.css";

interface ClearedState { [id: string]: { cleared: boolean; clearedAmount: number } }

const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PettyCashReconciliationWorksheet = () => {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: funds = [] } = useQuery({
    queryKey: ["petty-cash-funds", selectedCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from("petty_cash_funds").select("*").eq("company_id", selectedCompanyId!).order("fund_name");
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [physicalCount, setPhysicalCount] = useState<string>("");
  const [reconDate, setReconDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [clearedState, setClearedState] = useState<ClearedState>({});
  const [saving, setSaving] = useState(false);

  const selectedFund = useMemo(() => funds.find((f) => f.id === selectedFundId), [funds, selectedFundId]);

  const { data: transactions = [] } = useQuery({
    queryKey: ["petty-cash-transactions", selectedFundId],
    queryFn: async () => {
      const { data } = await supabase.from("petty_cash_transactions").select("*").eq("fund_id", selectedFundId!).order("transaction_date", { ascending: true });
      return data || [];
    },
    enabled: !!selectedFundId,
  });

  const summary = useMemo(() => {
    let disbursements = 0, replenishments = 0;

    transactions.forEach((t) => {
      if (t.transaction_type === "disbursement") disbursements += t.amount || 0;
      else if (t.transaction_type === "replenishment") replenishments += t.amount || 0;
    });

    const systemBalance = selectedFund?.current_balance || 0;
    const physicalAmt = parseFloat(physicalCount) || 0;
    const difference = physicalAmt - systemBalance;

    return { disbursements, replenishments, systemBalance, physicalAmt, difference };
  }, [transactions, selectedFund, physicalCount]);

  const toggleCleared = useCallback((id: string, amount: number) => {
    setClearedState((prev) => {
      if (prev[id]?.cleared) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: { cleared: true, clearedAmount: amount } };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedFundId) return toast.error("Select a petty cash fund");
    if (!physicalCount) return toast.error("Enter physical count amount");

    setSaving(true);
    try {
      const { data: recon, error } = await supabase.from("petty_cash_reconciliations").insert([{
        fund_id: selectedFundId,
        reconciliation_date: reconDate,
        system_balance: summary.systemBalance,
        physical_count: summary.physicalAmt,
        status: summary.difference === 0 ? "completed" : "draft",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;

      const clearedIds = Object.entries(clearedState).filter(([, v]) => v.cleared).map(([id]) => id);
      if (clearedIds.length > 0) {
        const itemRows = clearedIds.map((id) => ({
          reconciliation_id: recon.id,
          transaction_id: id,
          amount: clearedState[id].clearedAmount,
          cleared: true,
          company_id: selectedCompanyId,
        }));
        await supabase.from("petty_cash_reconciliation_items").insert(itemRows);
      }

      toast.success("Petty Cash Reconciliation saved");
      setClearedState({});
      setPhysicalCount("");
      queryClient.invalidateQueries({ queryKey: ["petty-cash-reconciliations"] });
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [selectedFundId, reconDate, physicalCount, summary, clearedState, selectedCompanyId, queryClient]);

  return (
    <Card className="recon-ws-root">
      <CardHeader className="p-0">
        <div className="recon-ws-header">
          <div className="recon-ws-header-field">
            <label>Petty Cash Fund</label>
            <Select value={selectedFundId || ""} onValueChange={(v) => { setSelectedFundId(v); setClearedState({}); }}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select Fund" /></SelectTrigger>
              <SelectContent>
                {funds.map((f) => (<SelectItem key={f.id} value={f.id}>{f.fund_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="recon-ws-header-field">
            <label>Reconciliation Date</label>
            <Input type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} className="w-[160px]" />
          </div>
          <div className="recon-ws-header-field">
            <label>Physical Cash Count</label>
            <Input type="number" step="0.01" value={physicalCount} onChange={(e) => setPhysicalCount(e.target.value)} placeholder="0.00" className="w-[160px]" />
          </div>
          {selectedFund && (
            <div className="recon-ws-header-field">
              <label>System Balance</label>
              <span className="value">LKR {fmt(selectedFund.current_balance || 0)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 recon-ws-table-wrap">
        {!selectedFundId ? (
          <div className="recon-ws-empty"><Wallet /><p className="text-lg font-medium">Select a Petty Cash Fund</p></div>
        ) : transactions.length === 0 ? (
          <div className="recon-ws-empty"><FileText /><p className="text-lg font-medium">No Transactions Found</p></div>
        ) : (
          <table className="recon-ws-table">
            <thead>
              <tr>
                <th className="w-[40px]">#</th>
                <th className="w-[50px]">✓</th>
                <th className="w-[60px]">Type</th>
                <th className="w-[100px]">Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th className="num-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => {
                const cs = clearedState[t.id];
                const isCleared = !!cs?.cleared;
                const isDisbursement = t.transaction_type === "disbursement";
                return (
                  <tr key={t.id} className={isCleared ? "row-cleared" : ""}>
                    <td>{idx + 1}</td>
                    <td><input type="checkbox" className="cleared-checkbox" checked={isCleared} onChange={() => toggleCleared(t.id, t.amount || 0)} /></td>
                    <td><span className={`type-badge ${isDisbursement ? "pc-disbursement" : "pc-replenishment"}`}>{isDisbursement ? "DIS" : "REP"}</span></td>
                    <td>{t.transaction_date ? format(new Date(t.transaction_date), "dd/MM/yyyy") : "—"}</td>
                    <td>{t.description || "—"}</td>
                    <td className="font-mono text-xs">{t.reference_number || "—"}</td>
                    <td className="num-col">{isDisbursement ? <span className="text-destructive">-LKR {fmt(t.amount || 0)}</span> : <span className="text-green-600">+LKR {fmt(t.amount || 0)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>

      {selectedFundId && (
        <div className="recon-ws-summary">
          <div className="recon-ws-summary-left">
            <div className="recon-ws-summary-row"><span className="summary-label">Disbursements</span><span className="summary-amount negative">LKR {fmt(summary.disbursements)}</span></div>
            <div className="recon-ws-summary-row"><span className="summary-label">Replenishments</span><span className="summary-amount positive">LKR {fmt(summary.replenishments)}</span></div>
          </div>
          <div className="recon-ws-summary-right">
            <div className="recon-ws-balance-row"><span className="balance-label">System Balance</span><span className="balance-value neutral">LKR {fmt(summary.systemBalance)}</span></div>
            <div className="recon-ws-balance-row"><span className="balance-label">Physical Count</span><span className="balance-value neutral">LKR {fmt(summary.physicalAmt)}</span></div>
            <div className="recon-ws-balance-row difference-row">
              <span className="balance-label">Difference</span>
              <span className={`balance-value ${summary.difference === 0 ? "match" : "negative"}`}>
                {summary.difference === 0 ? (<><CheckCircle className="inline w-4 h-4 mr-1" />LKR 0.00</>) : (<><AlertTriangle className="inline w-4 h-4 mr-1" />LKR {fmt(Math.abs(summary.difference))}</>)}
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedFundId && (
        <div className="recon-ws-actions">
          <Button variant="outline" onClick={() => { setClearedState({}); toast.info("Reset"); }}><X className="w-4 h-4 mr-2" />Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !physicalCount}><Save className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save Reconciliation"}</Button>
        </div>
      )}
    </Card>
  );
};
