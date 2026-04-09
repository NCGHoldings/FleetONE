import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBankTransaction } from "@/hooks/useAccountingMutations";
import { useBankAccounts, useChartOfAccounts } from "@/hooks/useAccountingData";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { Loader2 } from "lucide-react";

const transactionSchema = z.object({
  bank_account_id: z.string().min(1, "Bank account is required"),
  transaction_date: z.string().min(1, "Date is required"),
  transaction_type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  contra_account_id: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface BankTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBankId?: string;
}

export const BankTransactionForm = ({ open, onOpenChange, preselectedBankId }: BankTransactionFormProps) => {
  const { data: bankAccounts } = useBankAccounts();
  const { data: accounts } = useChartOfAccounts();
  const createTransaction = useCreateBankTransaction();
  const generateNumber = useGenerateNumber();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      bank_account_id: preselectedBankId || "",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      transaction_type: "deposit",
      description: "",
      reference: "",
      amount: 0,
      notes: "",
    },
  });

  const transactionType = form.watch("transaction_type");

  // Auto-generate reference when dialog opens
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);
  useEffect(() => {
    if (open && !form.getValues("reference")) {
      setIsGeneratingRef(true);
      generateNumber("bank_transaction").then((num) => {
        form.setValue("reference", num);
        setIsGeneratingRef(false);
      });
    }
  }, [open]);

  const onSubmit = async (data: TransactionFormData) => {
    const isDebit = ["withdrawal", "payment", "transfer_out", "bank_charge"].includes(data.transaction_type);
    
    try {
      await createTransaction.mutateAsync({
        bank_account_id: data.bank_account_id,
        transaction_date: data.transaction_date,
        transaction_type: data.transaction_type,
        description: data.description,
        reference: data.reference,
        debit_amount: isDebit ? data.amount : 0,
        credit_amount: !isDebit ? data.amount : 0,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Bank Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank_account_id">Bank Account *</Label>
            <Select 
              value={form.watch("bank_account_id")} 
              onValueChange={(v) => form.setValue("bank_account_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.filter(a => a.is_active).map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.account_name} - {bank.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.bank_account_id && (
              <p className="text-xs text-destructive">{form.formState.errors.bank_account_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date *</Label>
              <Input 
                id="transaction_date" 
                type="date"
                {...form.register("transaction_date")} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Type *</Label>
              <Select 
                value={form.watch("transaction_type")} 
                onValueChange={(v) => form.setValue("transaction_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="transfer_in">Transfer In</SelectItem>
                  <SelectItem value="transfer_out">Transfer Out</SelectItem>
                  <SelectItem value="bank_charge">Bank Charge</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input 
              id="description" 
              {...form.register("description")} 
              placeholder="Transaction description"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input 
                id="amount" 
                type="number"
                step="0.01"
                {...form.register("amount", { valueAsNumber: true })} 
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input 
                id="reference" 
                {...form.register("reference")} 
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contra_account_id">Contra Account</Label>
            <Select 
              value={form.watch("contra_account_id")} 
              onValueChange={(v) => form.setValue("contra_account_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contra account (optional)" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.filter(a => a.is_active).map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              {...form.register("notes")} 
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransaction.isPending}>
              {createTransaction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
