import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { useEditARReceipt } from "@/hooks/useEditAccountingMutations";
import { CurrencyInput } from "@/components/ui/currency-input";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ARReceiptEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: any;
}

export const ARReceiptEditDialog = ({ open, onOpenChange, receipt }: ARReceiptEditDialogProps) => {
  const { data: bankAccounts } = useBankAccounts();
  const editReceipt = useEditARReceipt();

  const [amount, setAmount] = useState(0);
  const [receiptDate, setReceiptDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (receipt && open) {
      setAmount(receipt.amount || 0);
      setReceiptDate(receipt.receipt_date || format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod(receipt.payment_method || "bank_transfer");
      setBankAccountId(receipt.bank_account_id || "");
      setReference(receipt.reference || "");
      setNotes(receipt.notes || "");
    }
  }, [receipt, open]);

  const handleSubmit = () => {
    if (!receipt?.id) return;
    editReceipt.mutate(
      {
        id: receipt.id,
        updates: {
          amount,
          receipt_date: receiptDate,
          payment_method: paymentMethod,
          bank_account_id: bankAccountId || undefined,
          reference: reference || undefined,
          notes: notes || undefined,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Receipt — {receipt?.receipt_number}</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive" className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Editing will auto-reverse the existing GL journal entry and create a new one with updated values. Full history is preserved.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount</Label>
              <CurrencyInput value={amount} onValueChange={setAmount} />
            </div>
            <div>
              <Label>Receipt Date</Label>
              <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map(ba => (
                    <SelectItem key={ba.id} value={ba.id}>{ba.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Reference</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={editReceipt.isPending}>
            {editReceipt.isPending ? "Updating..." : "Update Receipt (Auto GL Reversal)"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
