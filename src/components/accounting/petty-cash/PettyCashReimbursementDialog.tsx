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
import { usePettyCashTransactions, useCreatePettyCashReimbursement } from "@/hooks/usePettyCash";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { usePettyCashFunds } from "@/hooks/usePettyCash";

interface PettyCashReimbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PettyCashReimbursementDialog = ({ open, onOpenChange }: PettyCashReimbursementDialogProps) => {
  const [fundId, setFundId] = useState<string>("");
  const { data: funds } = usePettyCashFunds();
  const { data: transactions, isLoading } = usePettyCashTransactions(fundId);
  const { data: bankAccounts } = useBankAccounts();
  const reimburseMutation = useCreatePettyCashReimbursement();

  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

  // Only show approved disbursements and specific replenishments (like IOU returns) that haven't been reimbursed yet
  const eligibleVouchers = transactions?.filter(
    (t: any) => 
      ((t.transaction_type === "disbursement") || 
       (t.transaction_type === "replenishment" && t.expense_category === "IOU Cash Return")) &&
      t.status === "approved" && 
      !t.reimbursement_ap_payment_id
  ) || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVoucherIds(eligibleVouchers.map(v => v.id));
    } else {
      setSelectedVoucherIds([]);
    }
  };

  const handleSelectVoucher = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedVoucherIds(prev => [...prev, id]);
    } else {
      setSelectedVoucherIds(prev => prev.filter(vId => vId !== id));
    }
  };

  const totalAmount = eligibleVouchers
    .filter((v: any) => selectedVoucherIds.includes(v.id))
    .reduce((sum: number, v: any) => {
      // Disbursements ADD to reimbursement total, Replenishments (returns) SUBTRACT from it
      const amount = v.transaction_type === "disbursement" ? Number(v.amount) : -Number(v.amount);
      return sum + amount;
    }, 0);

  const handleReimburse = async () => {
    if (selectedVoucherIds.length === 0 || !selectedBankAccountId) return;

    await reimburseMutation.mutateAsync({
      voucher_ids: selectedVoucherIds,
      bank_account_id: selectedBankAccountId,
      total_amount: totalAmount,
      reimbursement_date: new Date().toISOString().split("T")[0],
      petty_cash_fund_id: fundId,
    });

    onOpenChange(false);
    setSelectedVoucherIds([]);
    setSelectedBankAccountId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Reimburse Petty Cash Float</DialogTitle>
          <DialogDescription>
            Select the specific expense vouchers you are reimbursing. This will generate an Accounts Payable payment for the total amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Fund</label>
              <Select value={fundId} onValueChange={(val) => { setFundId(val); setSelectedVoucherIds([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select petty cash fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds?.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.fund_name} (Bal: <CurrencyDisplay amount={f.current_balance} />)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reimbursing Bank Account</label>
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
          </div>

          {fundId && (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedVoucherIds.length === eligibleVouchers.length && eligibleVouchers.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Voucher #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Loading...</TableCell>
                      </TableRow>
                    ) : eligibleVouchers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No eligible vouchers found.</TableCell>
                      </TableRow>
                    ) : (
                      eligibleVouchers.map((voucher: any) => (
                        <TableRow key={voucher.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedVoucherIds.includes(voucher.id)}
                              onCheckedChange={(checked) => handleSelectVoucher(!!checked, voucher.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{voucher.voucher_number || "-"}</TableCell>
                          <TableCell>{format(new Date(voucher.created_at), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={voucher.description || ""}>
                            {voucher.description}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={voucher.transaction_type === "replenishment" ? "text-green-600" : ""}>
                              {voucher.transaction_type === "replenishment" ? "-" : ""}
                              <CurrencyDisplay amount={voucher.amount} />
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border">
                <span className="font-medium">Total Reimbursement Amount</span>
                <span className="text-xl font-bold">
                  <CurrencyDisplay amount={totalAmount} />
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleReimburse} 
            disabled={selectedVoucherIds.length === 0 || !selectedBankAccountId || reimburseMutation.isPending}
          >
            {reimburseMutation.isPending ? "Processing..." : "Generate AP Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
