import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Plus, Building } from "lucide-react";
import { useBankAccounts, useFundTransfers } from "@/hooks/useAccountingData";
import { useCreateFundTransfer } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { format } from "date-fns";

export const FundTransferForm = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: transfers = [] } = useFundTransfers();
  const createTransfer = useCreateFundTransfer();
  const generateNumber = useGenerateNumber();

  useEffect(() => {
    if (dialogOpen && !reference) {
      generateNumber("fund_transfer").then((num) => setReference(num));
    }
  }, [dialogOpen]);
  const handleSubmit = async () => {
    if (!fromAccount || !toAccount || !amount || fromAccount === toAccount) {
      return;
    }

    await createTransfer.mutateAsync({
      from_account_id: fromAccount,
      to_account_id: toAccount,
      amount: parseFloat(amount),
      transfer_date: transferDate,
      reference,
    });

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFromAccount("");
    setToAccount("");
    setAmount("");
    setTransferDate(new Date().toISOString().split("T")[0]);
    setReference("");
    setNotes("");
  };

  const getAccountName = (id: string) => {
    const account = bankAccounts.find((a: any) => a.id === id);
    return account ? `${account.account_name} (${account.bank_name})` : "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fund Transfers</h2>
          <p className="text-muted-foreground">Transfer funds between bank accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Fund Transfer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>From Account</Label>
                <Select value={fromAccount} onValueChange={setFromAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id} disabled={acc.id === toAccount}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {acc.account_name} - {acc.bank_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label>To Account</Label>
                <Select value={toAccount} onValueChange={setToAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id} disabled={acc.id === fromAccount}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {acc.account_name} - {acc.bank_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label>Transfer Date</Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={reference}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!fromAccount || !toAccount || !amount || fromAccount === toAccount || createTransfer.isPending}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Funds
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From Account</TableHead>
                <TableHead>To Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No fund transfers recorded
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer: any) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{format(new Date(transfer.transfer_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{getAccountName(transfer.from_account_id)}</TableCell>
                    <TableCell>{getAccountName(transfer.to_account_id)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <CurrencyDisplay amount={transfer.amount} />
                    </TableCell>
                    <TableCell>{transfer.reference || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={transfer.status === "completed" ? "default" : "secondary"}>
                        {transfer.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};