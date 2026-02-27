import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, CheckCircle, AlertTriangle, Building2 } from "lucide-react";
import { toast } from "sonner";
import "./ReconciliationWorksheet.css";

const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const IntercompanyReconciliationView = () => {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, company_name, business_unit_code").order("company_name");
      return data || [];
    },
  });

  const [unitAId, setUnitAId] = useState<string>("");
  const [unitBId, setUnitBId] = useState<string>("");
  const [unitABalance, setUnitABalance] = useState<string>("");
  const [unitBBalance, setUnitBBalance] = useState<string>("");
  const [reconDate, setReconDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const unitABal = parseFloat(unitABalance) || 0;
  const unitBBal = parseFloat(unitBBalance) || 0;
  const difference = unitABal - unitBBal;

  const unitA = companies.find((c) => c.id === unitAId);
  const unitB = companies.find((c) => c.id === unitBId);

  const handleSave = async () => {
    if (!unitAId || !unitBId) return toast.error("Select both business units");
    if (unitAId === unitBId) return toast.error("Select different business units");
    if (!unitABalance || !unitBBalance) return toast.error("Enter both balances");

    setSaving(true);
    try {
      await supabase.from("intercompany_reconciliations").insert([{
        unit_a_id: unitAId,
        unit_b_id: unitBId,
        reconciliation_date: reconDate,
        unit_a_balance: unitABal,
        unit_b_balance: unitBBal,
        status: difference === 0 ? "completed" : "draft",
        notes,
        company_id: selectedCompanyId,
      }]);
      toast.success("Intercompany Reconciliation saved");
      queryClient.invalidateQueries({ queryKey: ["intercompany-reconciliations"] });
      setUnitABalance("");
      setUnitBBalance("");
      setNotes("");
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
            <label>Business Unit A</label>
            <Select value={unitAId} onValueChange={setUnitAId}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select Unit A" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.business_unit_code || c.company_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="recon-ws-header-field">
            <label>Unit A Balance</label>
            <Input type="number" step="0.01" value={unitABalance} onChange={(e) => setUnitABalance(e.target.value)} placeholder="0.00" className="w-[160px]" />
          </div>
          <div className="recon-ws-header-field">
            <label>Business Unit B</label>
            <Select value={unitBId} onValueChange={setUnitBId}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select Unit B" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.business_unit_code || c.company_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="recon-ws-header-field">
            <label>Unit B Balance</label>
            <Input type="number" step="0.01" value={unitBBalance} onChange={(e) => setUnitBBalance(e.target.value)} placeholder="0.00" className="w-[160px]" />
          </div>
          <div className="recon-ws-header-field">
            <label>Reconciliation Date</label>
            <Input type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} className="w-[160px]" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 recon-ws-table-wrap">
        <div className="recon-ws-empty" style={{ padding: "40px 24px" }}>
          <Building2 />
          <p className="text-lg font-medium">Intercompany Balance Reconciliation</p>
          <p className="text-sm">Enter the intercompany balances for both units to identify discrepancies</p>
          {unitA && unitB && (
            <div className="mt-4 w-full max-w-md">
              <table className="recon-ws-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th className="num-col">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">{unitA.business_unit_code || unitA.company_name}</td>
                    <td className="num-col">LKR {fmt(unitABal)}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">{unitB.business_unit_code || unitB.company_name}</td>
                    <td className="num-col">LKR {fmt(unitBBal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>

      <div className="recon-ws-summary">
        <div className="recon-ws-summary-left">
          <div className="recon-ws-summary-row"><span className="summary-label">Unit A</span><span className="summary-amount neutral">LKR {fmt(unitABal)}</span></div>
          <div className="recon-ws-summary-row"><span className="summary-label">Unit B</span><span className="summary-amount neutral">LKR {fmt(unitBBal)}</span></div>
        </div>
        <div className="recon-ws-summary-right">
          <div className="recon-ws-balance-row difference-row">
            <span className="balance-label">Net Difference</span>
            <span className={`balance-value ${difference === 0 ? "match" : "negative"}`}>
              {difference === 0 ? (<><CheckCircle className="inline w-4 h-4 mr-1" />LKR 0.00</>) : (<><AlertTriangle className="inline w-4 h-4 mr-1" />LKR {fmt(Math.abs(difference))}</>)}
            </span>
          </div>
        </div>
      </div>

      <div className="recon-ws-actions">
        <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="max-w-xs" />
        <Button onClick={handleSave} disabled={saving || !unitAId || !unitBId || !unitABalance || !unitBBalance}>
          <Save className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save Reconciliation"}
        </Button>
      </div>
    </Card>
  );
};
