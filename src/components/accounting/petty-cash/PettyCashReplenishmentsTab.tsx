import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpCircle, Plus, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { 
  usePettyCashFunds, useAllPettyCashTransactions, useCreatePettyCashTransaction 
} from "@/hooks/usePettyCash";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { useBankAccounts } from "@/hooks/useAccountingData";

export const PettyCashReplenishmentsTab = () => {
  const [showForm, setShowForm] = useState(false);

  const { data: funds } = usePettyCashFunds();
  const { data: transactions, isLoading } = useAllPettyCashTransactions({ transactionType: "replenishment" });
  const { data: allTransactions } = useAllPettyCashTransactions();
  const { data: bankAccounts } = useBankAccounts();
  const createTransaction = useCreatePettyCashTransaction();

  const [form, setForm] = useState({
    petty_cash_fund_id: "",
    amount: 0,
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
    reference_number: "",
    payment_method: "cash",
  });

  const selectedFund = funds?.find((f) => f.id === form.petty_cash_fund_id);

  // Calculate spent since last replenishment (imprest system)
  const spentSinceLastReplenishment = useMemo(() => {
    if (!selectedFund || !allTransactions) return 0;
    
    // Find the last replenishment date for this fund
    const fundReplenishments = (transactions || [])
      .filter((t) => t.petty_cash_fund_id === selectedFund.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const lastReplenishmentDate = fundReplenishments.length > 0
      ? new Date(fundReplenishments[0].created_at)
      : new Date(0); // If no prior replenishment, count all disbursements

    // Sum disbursements since last replenishment
    const disbursedAmount = (allTransactions || [])
      .filter((t) => 
        t.petty_cash_fund_id === selectedFund.id &&
        t.transaction_type === "disbursement" &&
        new Date(t.created_at) > lastReplenishmentDate
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return disbursedAmount;
  }, [selectedFund, allTransactions, transactions]);

  // Auto-suggest replenishment amount
  const suggestedAmount = useMemo(() => {
    if (!selectedFund) return 0;
    // Imprest system: replenish what was spent
    if (spentSinceLastReplenishment > 0) {
      return spentSinceLastReplenishment;
    }
    // If fund has a limit and balance is below, suggest top-up to limit
    if (selectedFund.fund_limit > 0) {
      return Math.max(0, selectedFund.fund_limit - selectedFund.current_balance);
    }
    return 0;
  }, [selectedFund, spentSinceLastReplenishment]);

  // When fund is selected, auto-fill the suggested amount
  const handleFundChange = (fundId: string) => {
    setForm((prev) => ({ ...prev, petty_cash_fund_id: fundId }));
    // We'll update amount after suggestedAmount recomputes via effect
    setTimeout(() => {
      const fund = funds?.find((f) => f.id === fundId);
      if (fund) {
        // Calculate immediately for this fund
        const fundReplenishments = (transactions || [])
          .filter((t) => t.petty_cash_fund_id === fundId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastDate = fundReplenishments.length > 0 ? new Date(fundReplenishments[0].created_at) : new Date(0);
        const spent = (allTransactions || [])
          .filter((t) => t.petty_cash_fund_id === fundId && t.transaction_type === "disbursement" && new Date(t.created_at) > lastDate)
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        
        const suggested = spent > 0 ? spent : (fund.fund_limit > 0 ? Math.max(0, fund.fund_limit - fund.current_balance) : 0);
        if (suggested > 0) {
          setForm((prev) => ({ ...prev, amount: suggested }));
        }
      }
    }, 0);
  };

  // Balance after replenishment preview
  const balanceAfter = selectedFund ? selectedFund.current_balance + form.amount : 0;

  const resetForm = () => {
    setForm({ petty_cash_fund_id: "", amount: 0, transaction_date: new Date().toISOString().split("T")[0], description: "", reference_number: "", payment_method: "cash" });
  };

  const handleSubmit = async () => {
    if (!form.petty_cash_fund_id || form.amount <= 0) return;

    await createTransaction.mutateAsync({
      petty_cash_fund_id: form.petty_cash_fund_id,
      transaction_type: "replenishment",
      amount: form.amount,
      description: form.description,
      reference_number: form.reference_number || undefined,
      payment_method: form.payment_method,
      status: "approved",
      branch_id: selectedFund?.branch_id || undefined,
      created_at: new Date(form.transaction_date).toISOString(),
    } as any);

    setShowForm(false);
    resetForm();
  };

  // Extract AP Ref from description (format: "... [AP: PC-REPL-xxxx]")
  const extractAPRef = (description: string | null) => {
    if (!description) return null;
    const match = description.match(/\[AP:\s*(PC-REPL-\d+)\]/);
    return match ? match[1] : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Reimbursement History</h3>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Reimburse Fund
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>AP Ref</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
              </TableRow>
            ) : transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No reimbursements found</TableCell>
              </TableRow>
            ) : (
              transactions?.map((txn) => {
                const apRef = extractAPRef(txn.description);
                return (
                  <TableRow key={txn.id}>
                    <TableCell>{format(new Date(txn.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{txn.fund?.fund_name || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      +<CurrencyDisplay amount={txn.amount} />
                    </TableCell>
                    <TableCell className="text-right"><CurrencyDisplay amount={txn.balance_after} /></TableCell>
                    <TableCell><Badge variant="outline">{txn.payment_method || "cash"}</Badge></TableCell>
                    <TableCell className="text-sm">{txn.reference_number || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {apRef ? (
                        <Badge variant="secondary" className="text-xs font-mono">{apRef}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {txn.description?.replace(/\s*\[AP:.*?\]/, "") || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Replenishment Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); setShowForm(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              Fund Reimbursement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Fund *</Label>
              <Select value={form.petty_cash_fund_id} onValueChange={handleFundChange}>
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
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Current Balance: Rs {selectedFund.current_balance.toLocaleString()}
                    {selectedFund.fund_limit > 0 && ` | Limit: Rs ${selectedFund.fund_limit.toLocaleString()}`}
                  </p>
                  {spentSinceLastReplenishment > 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Spent since last reimbursement: Rs {spentSinceLastReplenishment.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
            <div>
              <Label>Amount (LKR) *</Label>
              <Input 
                type="number" 
                value={form.amount} 
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="text-lg font-semibold"
              />
              {suggestedAmount > 0 && form.amount !== suggestedAmount && (
                <button 
                  type="button"
                  className="text-xs text-blue-600 hover:underline mt-1"
                  onClick={() => setForm({ ...form, amount: suggestedAmount })}
                >
                  💡 Use suggested amount: Rs {suggestedAmount.toLocaleString()}
                </button>
              )}
              {selectedFund && form.amount > 0 && (
                <div className="mt-2 p-2 rounded bg-muted/50 border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span>Rs {selectedFund.current_balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>+ Reimbursement:</span>
                    <span>Rs {form.amount.toLocaleString()}</span>
                  </div>
                  <hr className="my-1" />
                  <div className="flex justify-between font-bold">
                    <span>Balance After:</span>
                    <span>Rs {balanceAfter.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {selectedFund && selectedFund.fund_limit > 0 && balanceAfter > selectedFund.fund_limit && (
                <p className="text-xs text-amber-600 mt-1">⚠ This will exceed the fund limit of Rs {selectedFund.fund_limit.toLocaleString()}</p>
              )}
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="Cheque/Transfer ref" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Reimbursement details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!form.petty_cash_fund_id || form.amount <= 0 || createTransaction.isPending}
            >
              {createTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Reimburse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
