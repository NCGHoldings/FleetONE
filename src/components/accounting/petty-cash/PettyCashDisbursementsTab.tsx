import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownCircle, Plus, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { 
  usePettyCashFunds, useAllPettyCashTransactions, useCreatePettyCashTransaction,
  PettyCashFund
} from "@/hooks/usePettyCash";
import { EXPENSE_CATEGORIES, BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { SearchableAccountSelector } from "../shared/SearchableAccountSelector";

export const PettyCashDisbursementsTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: funds } = usePettyCashFunds();
  const { data: transactions, isLoading } = useAllPettyCashTransactions({ 
    transactionType: "disbursement",
    category: filterCategory,
    status: filterStatus,
  });
  const createTransaction = useCreatePettyCashTransaction();

  // Form state
  const [form, setForm] = useState({
    petty_cash_fund_id: "",
    payee_name: "",
    expense_category: "",
    gl_account_id: "",
    amount: 0,
    description: "",
    reference_number: "",
    payment_method: "cash",
  });

  const selectedFund = funds?.find((f) => f.id === form.petty_cash_fund_id);

  const resetForm = () => {
    setForm({
      petty_cash_fund_id: "", payee_name: "", expense_category: "",
      gl_account_id: "", amount: 0, description: "", reference_number: "", payment_method: "cash",
    });
  };

  const handleSubmit = async () => {
    if (!form.petty_cash_fund_id || form.amount <= 0) return;

    const needsApproval = selectedFund && selectedFund.approval_required_above > 0 && form.amount > selectedFund.approval_required_above;

    await createTransaction.mutateAsync({
      petty_cash_fund_id: form.petty_cash_fund_id,
      transaction_type: "disbursement",
      amount: form.amount,
      description: form.description,
      payee_name: form.payee_name,
      expense_category: form.expense_category || undefined,
      gl_account_id: form.gl_account_id || undefined,
      reference_number: form.reference_number || undefined,
      payment_method: form.payment_method,
      status: needsApproval ? "pending" : "approved",
      branch_id: selectedFund?.branch_id || undefined,
    } as any);

    setShowForm(false);
    resetForm();
  };

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      case "void": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Disbursement
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
              </TableRow>
            ) : transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No disbursements found</TableCell>
              </TableRow>
            ) : (
              transactions?.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">{txn.voucher_number || "-"}</TableCell>
                  <TableCell>{format(new Date(txn.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{txn.fund?.fund_name || "-"}</TableCell>
                  <TableCell>{txn.payee_name || "-"}</TableCell>
                  <TableCell>{txn.expense_category ? getCategoryLabel(txn.expense_category) : "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    <CurrencyDisplay amount={txn.amount} />
                  </TableCell>
                  <TableCell><Badge variant="outline">{txn.payment_method || "cash"}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(txn.status || "approved") as any}>
                      {txn.status || "approved"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{txn.reference_number || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Disbursement Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-destructive" />
              Record Disbursement
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Select Fund *</Label>
              <Select value={form.petty_cash_fund_id} onValueChange={(v) => setForm({ ...form, petty_cash_fund_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select fund" /></SelectTrigger>
                <SelectContent>
                  {funds?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.fund_name} — Balance: Rs {f.current_balance.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFund && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current Balance: Rs {selectedFund.current_balance.toLocaleString()}
                  {selectedFund.approval_required_above > 0 && ` | Approval needed above Rs ${selectedFund.approval_required_above.toLocaleString()}`}
                </p>
              )}
            </div>
            <div>
              <Label>Voucher Number</Label>
              <Input value="Auto-generated" disabled className="text-muted-foreground" />
            </div>
            <div>
              <Label>Payee Name *</Label>
              <Input value={form.payee_name} onChange={(e) => setForm({ ...form, payee_name: e.target.value })} placeholder="Who received the money" />
            </div>
            <div>
              <Label>Expense Category</Label>
              <Select value={form.expense_category || "none"} onValueChange={(v) => setForm({ ...form, expense_category: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (LKR) *</Label>
              <Input 
                type="number" 
                value={form.amount} 
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="text-lg font-semibold"
              />
              {selectedFund && form.amount > selectedFund.current_balance && (
                <p className="text-xs text-destructive mt-1">Amount exceeds fund balance!</p>
              )}
              {selectedFund && selectedFund.approval_required_above > 0 && form.amount > selectedFund.approval_required_above && (
                <p className="text-xs text-amber-600 mt-1">⚠ This will require approval</p>
              )}
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="External ref" />
            </div>
            <div className="md:col-span-2">
              <Label>GL Account</Label>
              <SearchableAccountSelector value={form.gl_account_id} onValueChange={(v) => setForm({ ...form, gl_account_id: v })} placeholder="Select expense GL account" />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of disbursement..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!form.petty_cash_fund_id || !form.payee_name || form.amount <= 0 || createTransaction.isPending || (selectedFund ? form.amount > selectedFund.current_balance : false)}
              variant="destructive"
            >
              {createTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Disburse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
