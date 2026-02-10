import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { useCreateBankFee } from "@/hooks/useBankFees";
import { format } from "date-fns";

interface BankFeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apPaymentId?: string;
  arReceiptId?: string;
  defaultBankAccountId?: string;
}

const FEE_TYPES = [
  { value: "bank_charge", label: "Bank Charge" },
  { value: "stamp_duty", label: "Stamp Duty" },
  { value: "swift_fee", label: "SWIFT Fee" },
  { value: "commission", label: "Commission" },
  { value: "other", label: "Other" },
];

export const BankFeeForm = ({
  open,
  onOpenChange,
  apPaymentId,
  arReceiptId,
  defaultBankAccountId,
}: BankFeeFormProps) => {
  const { data: bankAccounts } = useBankAccounts();
  const createBankFee = useCreateBankFee();

  const [bankAccountId, setBankAccountId] = useState(defaultBankAccountId || "");
  const [feeDate, setFeeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [feeType, setFeeType] = useState("bank_charge");
  const [description, setDescription] = useState("");
  const [postImmediately, setPostImmediately] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountId || !amount || Number(amount) <= 0) return;

    await createBankFee.mutateAsync({
      bank_account_id: bankAccountId,
      fee_date: feeDate,
      amount: Number(amount),
      fee_type: feeType,
      description,
      ap_payment_id: apPaymentId,
      ar_receipt_id: arReceiptId,
      post_immediately: postImmediately,
    });

    // Reset & close
    setAmount("");
    setDescription("");
    setPostImmediately(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bank Fee / Charge</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Bank Account *</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.filter(a => a.is_active).map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fee Date *</Label>
              <Input type="date" value={feeDate} onChange={(e) => setFeeDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fee Type</Label>
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about the charge..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={postImmediately} onCheckedChange={setPostImmediately} />
            <Label>Post to GL immediately</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBankFee.isPending}>
              {createBankFee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Bank Fee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
