import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { usePettyCashFunds, useCreatePettyCashTopUp } from "@/hooks/usePettyCash";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";

interface PettyCashTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PettyCashTopUpDialog = ({ open, onOpenChange }: PettyCashTopUpDialogProps) => {
  const [fundId, setFundId] = useState<string>("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const { data: funds } = usePettyCashFunds();
  const { data: bankAccounts } = useBankAccounts();
  const topUpMutation = useCreatePettyCashTopUp();

  const handleTopUp = async () => {
    if (!fundId || !selectedBankAccountId || amount <= 0) return;

    await topUpMutation.mutateAsync({
      petty_cash_fund_id: fundId,
      bank_account_id: selectedBankAccountId,
      amount,
      reference,
      description,
      top_up_date: new Date().toISOString().split("T")[0],
    });

    onOpenChange(false);
    setFundId("");
    setSelectedBankAccountId("");
    setAmount(0);
    setReference("");
    setDescription("");
  };

  const isFormValid = fundId && selectedBankAccountId && amount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Direct Float Top-Up</DialogTitle>
          <DialogDescription>
            Transfer money directly from a bank account into a petty cash float without requiring past expense vouchers. This will generate the necessary AP Payment and GL Journal Entry automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Target Fund</label>
              <Select value={fundId} onValueChange={setFundId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select petty cash fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds?.filter(f => f.is_active).map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.fund_name} (Bal: <CurrencyDisplay amount={f.current_balance} />)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source Bank Account</label>
              <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.filter(b => b.is_active).map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bank_name} - {bank.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Top-Up Amount (LKR)</label>
              <Input 
                type="number" 
                min="0"
                value={amount || ""} 
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} 
                placeholder="Enter amount to transfer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reference (Optional)</label>
              <Input 
                value={reference} 
                onChange={(e) => setReference(e.target.value)} 
                placeholder="Cheque number or transfer reference"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Initial float funding, monthly top-up, etc."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleTopUp} 
            disabled={!isFormValid || topUpMutation.isPending}
          >
            {topUpMutation.isPending ? "Processing..." : "Top-Up Float"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
