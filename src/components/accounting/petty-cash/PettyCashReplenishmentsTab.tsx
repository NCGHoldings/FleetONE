import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpCircle, Plus, Loader2 } from "lucide-react";
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
  const { data: bankAccounts } = useBankAccounts();
  const createTransaction = useCreatePettyCashTransaction();

  const [form, setForm] = useState({
    petty_cash_fund_id: "",
    amount: 0,
    description: "",
    reference_number: "",
    payment_method: "cash",
  });

  const selectedFund = funds?.find((f) => f.id === form.petty_cash_fund_id);

  const resetForm = () => {
    setForm({ petty_cash_fund_id: "", amount: 0, description: "", reference_number: "", payment_method: "cash" });
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
    } as any);

    setShowForm(false);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Replenishment History</h3>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Replenish Fund
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
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
              </TableRow>
            ) : transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No replenishments found</TableCell>
              </TableRow>
            ) : (
              transactions?.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>{format(new Date(txn.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{txn.fund?.fund_name || "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    +<CurrencyDisplay amount={txn.amount} />
                  </TableCell>
                  <TableCell className="text-right"><CurrencyDisplay amount={txn.balance_after} /></TableCell>
                  <TableCell><Badge variant="outline">{txn.payment_method || "cash"}</Badge></TableCell>
                  <TableCell className="text-sm">{txn.reference_number || "-"}</TableCell>
                  <TableCell className="text-sm">{txn.description || "-"}</TableCell>
                </TableRow>
              ))
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
              Replenish Fund
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
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
                  {selectedFund.fund_limit > 0 && ` | Limit: Rs ${selectedFund.fund_limit.toLocaleString()}`}
                </p>
              )}
            </div>
            <div>
              <Label>Amount (LKR) *</Label>
              <Input 
                type="number" 
                value={form.amount} 
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="text-lg font-semibold"
              />
              {selectedFund && selectedFund.fund_limit > 0 && (form.amount + selectedFund.current_balance) > selectedFund.fund_limit && (
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
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Replenishment details..." />
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
              Replenish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
