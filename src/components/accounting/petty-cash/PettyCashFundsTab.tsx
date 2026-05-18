import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Pencil, User, Building2, Loader2, MapPin, AlertTriangle
} from "lucide-react";
import { 
  usePettyCashFunds, useCreatePettyCashFund, useUpdatePettyCashFund,
  PettyCashFund
} from "@/hooks/usePettyCash";
import { BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { SearchableAccountSelector } from "../shared/SearchableAccountSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { PettyCashTopUpDialog } from "./PettyCashTopUpDialog";
import { ArrowUpCircle } from "lucide-react";

const FUND_TYPES = [
  { value: "main", label: "Main Fund" },
  { value: "branch", label: "Branch Fund" },
  { value: "department", label: "Department Fund" },
];

export const PettyCashFundsTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [editingFund, setEditingFund] = useState<PettyCashFund | null>(null);
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");

  const { data: funds, isLoading } = usePettyCashFunds({ 
    branchId: filterBranch !== "all" ? filterBranch : undefined,
    businessUnit: filterUnit !== "all" ? filterUnit : undefined,
  });
  const createFund = useCreatePettyCashFund();
  const updateFund = useUpdatePettyCashFund();

  const { allCompanies } = useCompany();

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
    custodian_name: "",
    gl_account_id: "",
    branch_id: "",
    fund_limit: 0,
    low_balance_threshold: 0,
    fund_type: "main",
    approval_required_above: 0,
    notes: "",
    company_id: "",
  });

  const resetForm = () => {
    setForm({
      fund_name: "", business_unit_code: "", opening_balance: 0, custodian_name: "",
      gl_account_id: "", branch_id: "", fund_limit: 0, low_balance_threshold: 0,
      fund_type: "main", approval_required_above: 0, notes: "", company_id: "",
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
      custodian_name: fund.custodian_name || "",
      gl_account_id: fund.gl_account_id || "",
      branch_id: fund.branch_id || "",
      fund_limit: fund.fund_limit || 0,
      low_balance_threshold: fund.low_balance_threshold || 0,
      fund_type: fund.fund_type || "main",
      approval_required_above: fund.approval_required_above || 0,
      notes: fund.notes || "",
      company_id: fund.company_id || "",
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
    // Fund deactivation is disabled to protect financial data integrity
    toast({ title: "Action Blocked", description: "Funds cannot be deleted. Edit the fund to reassign or update details.", variant: "destructive" });
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "fund_name",
      header: "Fund Name",
      cell: ({ row }) => <span className="font-medium">{row.original.fund_name}</span>,
    },
    {
      id: "company",
      accessorFn: (row) => row.company?.short_code || row.company?.name || "-",
      header: "Section",
      cell: ({ row }) => {
        const company = row.original.company;
        return company ? <Badge variant="secondary" className="text-xs">{company.short_code || company.name}</Badge> : <span>-</span>;
      },
    },
    {
      accessorKey: "fund_type",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{row.original.fund_type || "main"}</Badge>,
    },
    {
      id: "branch",
      accessorFn: (row) => row.branch?.branch_name || "-",
      header: "Branch",
      cell: ({ row }) => {
        const branch = row.original.branch;
        return branch ? (
          <span className="flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3" /> {branch.branch_name}
          </span>
        ) : <span>-</span>;
      },
    },
    {
      accessorKey: "business_unit_code",
      header: "Unit",
      cell: ({ row }) => <Badge variant="secondary">{row.original.business_unit_code}</Badge>,
    },
    {
      accessorKey: "custodian_name",
      header: "Custodian",
      cell: ({ row }) => {
        const custodian_name = row.original.custodian_name;
        return custodian_name ? (
          <span className="flex items-center gap-1 text-sm">
            <User className="h-3 w-3" /> {custodian_name}
          </span>
        ) : <span>-</span>;
      },
    },
    {
      accessorKey: "opening_balance",
      header: "Opening",
      cell: ({ row }) => <div className="text-right"><CurrencyDisplay amount={row.original.opening_balance} /></div>,
    },
    {
      accessorKey: "current_balance",
      header: "Current",
      cell: ({ row }) => {
        const fund = row.original;
        const isLow = fund.low_balance_threshold > 0 && fund.current_balance <= fund.low_balance_threshold;
        return (
          <div className="text-right">
            <span className={isLow ? "text-destructive font-semibold" : ""}>
              <CurrencyDisplay amount={fund.current_balance} />
            </span>
            {isLow && (
              <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "fund_limit",
      header: "Limit",
      cell: ({ row }) => <div className="text-right">{row.original.fund_limit > 0 ? <CurrencyDisplay amount={row.original.fund_limit} /> : "-"}</div>,
    },
    {
      accessorKey: "low_balance_threshold",
      header: "Threshold",
      cell: ({ row }) => <div className="text-right">{row.original.low_balance_threshold > 0 ? <CurrencyDisplay amount={row.original.low_balance_threshold} /> : "-"}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []);

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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowTopUpForm(true)}>
            <ArrowUpCircle className="h-4 w-4 mr-2" /> Direct Top-Up
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Fund
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="p-4 border-none shadow-none">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={funds || []}
            searchKey="fund_name"
            enableColumnFilters={true}
          />
        )}
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
              <Input value={form.custodian_name} onChange={(e) => setForm({ ...form, custodian_name: e.target.value })} placeholder="Enter custodian name" />
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
            {editingFund && (
              <div className="md:col-span-2">
                <Label>Company / Section</Label>
                <Select value={form.company_id || "none"} onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select company section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Change</SelectItem>
                    {allCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.short_code ? ` (${c.short_code})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">⚠ Changing the company section will move this fund and all its data to the selected section.</p>
              </div>
            )}
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
      
      {/* Direct Top-Up Dialog */}
      <PettyCashTopUpDialog 
        open={showTopUpForm} 
        onOpenChange={setShowTopUpForm} 
      />
    </div>
  );
};
