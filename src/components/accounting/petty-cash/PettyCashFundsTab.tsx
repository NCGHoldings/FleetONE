import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Pencil, Trash2, User, Building2, Loader2, MapPin, AlertTriangle
} from "lucide-react";
import { 
  usePettyCashFunds, useCreatePettyCashFund, useUpdatePettyCashFund, useDeactivatePettyCashFund,
  PettyCashFund
} from "@/hooks/usePettyCash";
import { BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { SearchableAccountSelector } from "../shared/SearchableAccountSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUND_TYPES = [
  { value: "main", label: "Main Fund" },
  { value: "branch", label: "Branch Fund" },
  { value: "department", label: "Department Fund" },
];

export const PettyCashFundsTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingFund, setEditingFund] = useState<PettyCashFund | null>(null);
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");

  const { data: funds, isLoading } = usePettyCashFunds({ 
    branchId: filterBranch !== "all" ? filterBranch : undefined,
    businessUnit: filterUnit !== "all" ? filterUnit : undefined,
  });
  const createFund = useCreatePettyCashFund();
  const updateFund = useUpdatePettyCashFund();
  const deactivateFund = useDeactivatePettyCashFund();

  const { data: staff } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_registry").select("id, staff_name").eq("is_active", true).order("staff_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["school-branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_branches").select("id, branch_name").eq("is_active", true).order("branch_name");
      if (error) throw error;
      return data;
    },
  });

  // Form state
  const [form, setForm] = useState({
    fund_name: "",
    business_unit_code: "",
    opening_balance: 0,
    custodian_id: "",
    gl_account_id: "",
    branch_id: "",
    fund_limit: 0,
    low_balance_threshold: 0,
    fund_type: "main",
    approval_required_above: 0,
    notes: "",
  });

  const resetForm = () => {
    setForm({
      fund_name: "", business_unit_code: "", opening_balance: 0, custodian_id: "",
      gl_account_id: "", branch_id: "", fund_limit: 0, low_balance_threshold: 0,
      fund_type: "main", approval_required_above: 0, notes: "",
    });
    setEditingFund(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (fund: PettyCashFund) => {
    setEditingFund(fund);
    setForm({
      fund_name: fund.fund_name,
      business_unit_code: fund.business_unit_code,
      opening_balance: fund.opening_balance,
      custodian_id: fund.custodian_id || "",
      gl_account_id: fund.gl_account_id || "",
      branch_id: fund.branch_id || "",
      fund_limit: fund.fund_limit || 0,
      low_balance_threshold: fund.low_balance_threshold || 0,
      fund_type: fund.fund_type || "main",
      approval_required_above: fund.approval_required_above || 0,
      notes: fund.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (editingFund) {
      await updateFund.mutateAsync({ id: editingFund.id, ...form } as any);
    } else {
      await createFund.mutateAsync(form as any);
    }
    setShowForm(false);
    resetForm();
  };

  const handleDeactivate = async (fundId: string) => {
    if (confirm("Are you sure you want to deactivate this fund?")) {
      await deactivateFund.mutateAsync(fundId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Units" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {BUSINESS_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Fund
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fund Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Custodian</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Limit</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
              </TableRow>
            ) : funds?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No funds found</TableCell>
              </TableRow>
            ) : (
              funds?.map((fund) => (
                <TableRow key={fund.id}>
                  <TableCell className="font-medium">{fund.fund_name}</TableCell>
                  <TableCell><Badge variant="outline">{fund.fund_type || "main"}</Badge></TableCell>
                  <TableCell>
                    {fund.branch ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" /> {fund.branch.branch_name}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{fund.business_unit_code}</Badge></TableCell>
                  <TableCell>
                    {fund.custodian ? (
                      <span className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" /> {fund.custodian.staff_name}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right"><CurrencyDisplay amount={fund.opening_balance} /></TableCell>
                  <TableCell className="text-right">
                    <span className={fund.low_balance_threshold > 0 && fund.current_balance <= fund.low_balance_threshold ? "text-destructive font-semibold" : ""}>
                      <CurrencyDisplay amount={fund.current_balance} />
                    </span>
                    {fund.low_balance_threshold > 0 && fund.current_balance <= fund.low_balance_threshold && (
                      <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">{fund.fund_limit > 0 ? <CurrencyDisplay amount={fund.fund_limit} /> : "-"}</TableCell>
                  <TableCell className="text-right">{fund.low_balance_threshold > 0 ? <CurrencyDisplay amount={fund.low_balance_threshold} /> : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(fund)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeactivate(fund.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFund ? "Edit Fund" : "Create Petty Cash Fund"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Fund Name *</Label>
              <Input value={form.fund_name} onChange={(e) => setForm({ ...form, fund_name: e.target.value })} placeholder="e.g., Main Office Petty Cash" />
            </div>
            <div>
              <Label>Fund Type</Label>
              <Select value={form.fund_type} onValueChange={(v) => setForm({ ...form, fund_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUND_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Business Unit *</Label>
              <Select value={form.business_unit_code} onValueChange={(v) => setForm({ ...form, business_unit_code: v })}>
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_UNITS.map((u) => (<SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch_id || "none"} onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Branch</SelectItem>
                  {branches?.map((b) => (<SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custodian</Label>
              <Select value={form.custodian_id || "none"} onValueChange={(v) => setForm({ ...form, custodian_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select custodian" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Custodian</SelectItem>
                  {staff?.map((s) => (<SelectItem key={s.id} value={s.id}>{s.staff_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {!editingFund && (
              <div>
                <Label>Opening Balance (LKR)</Label>
                <Input type="number" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <div>
              <Label>Fund Limit (LKR)</Label>
              <Input type="number" value={form.fund_limit} onChange={(e) => setForm({ ...form, fund_limit: parseFloat(e.target.value) || 0 })} placeholder="0 = no limit" />
            </div>
            <div>
              <Label>Low Balance Threshold (LKR)</Label>
              <Input type="number" value={form.low_balance_threshold} onChange={(e) => setForm({ ...form, low_balance_threshold: parseFloat(e.target.value) || 0 })} placeholder="Alert when below" />
            </div>
            <div>
              <Label>Approval Required Above (LKR)</Label>
              <Input type="number" value={form.approval_required_above} onChange={(e) => setForm({ ...form, approval_required_above: parseFloat(e.target.value) || 0 })} placeholder="0 = no approval needed" />
            </div>
            <div className="md:col-span-2">
              <Label>GL Account</Label>
              <SearchableAccountSelector value={form.gl_account_id} onValueChange={(v) => setForm({ ...form, gl_account_id: v })} placeholder="Select GL account" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Fund description / notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.fund_name || !form.business_unit_code || createFund.isPending || updateFund.isPending}>
              {(createFund.isPending || updateFund.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingFund ? "Update Fund" : "Create Fund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
