import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { useCreateInterBankTransfer } from "@/hooks/useInterBankTransfer";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  fromBankAccountId: z.string().min(1, "Source bank account is required"),
  toBankAccountId: z.string().min(1, "Destination bank account is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  transferDate: z.string().min(1, "Transfer date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.fromBankAccountId !== data.toBankAccountId, {
  message: "Source and destination banks must be different",
  path: ["toBankAccountId"],
});

type FormValues = z.infer<typeof formSchema>;

interface InterBankTransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterBankTransferForm({ open, onOpenChange }: InterBankTransferFormProps) {
  const { data: bankAccounts } = useBankAccounts();
  const createTransfer = useCreateInterBankTransfer();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromBankAccountId: "",
      toBankAccountId: "",
      amount: 0,
      transferDate: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      notes: "",
    },
  });

  const watchFromBank = form.watch("fromBankAccountId");
  const watchToBank = form.watch("toBankAccountId");
  const watchAmount = form.watch("amount");

  const fromBankAccount = bankAccounts?.find(b => b.id === watchFromBank);
  const toBankAccount = bankAccounts?.find(b => b.id === watchToBank);

  const insufficientBalance = fromBankAccount && watchAmount > (fromBankAccount.current_balance || 0);
  const noGLMapping = (fromBankAccount && !fromBankAccount.gl_account_id) || 
                       (toBankAccount && !toBankAccount.gl_account_id);

  const onSubmit = async (values: FormValues) => {
    await createTransfer.mutateAsync({
      fromBankAccountId: values.fromBankAccountId,
      toBankAccountId: values.toBankAccountId,
      amount: values.amount,
      transferDate: values.transferDate,
      reference: values.reference,
      notes: values.notes,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inter-Bank Fund Transfer</DialogTitle>
          <DialogDescription>
            Transfer funds between bank accounts with automatic GL posting
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Bank Selection Row */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
              {/* From Bank */}
              <FormField
                control={form.control}
                name="fromBankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source bank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts?.filter(b => b.is_active).map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fromBankAccount && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Balance: <CurrencyDisplay amount={fromBankAccount.current_balance || 0} />
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Arrow */}
              <div className="flex items-center justify-center pb-6">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>

              {/* To Bank */}
              <FormField
                control={form.control}
                name="toBankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination bank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts?.filter(b => b.is_active && b.id !== watchFromBank).map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {toBankAccount && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Balance: <CurrencyDisplay amount={toBankAccount.current_balance || 0} />
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Warnings */}
            {insufficientBalance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient balance. Available: <CurrencyDisplay amount={fromBankAccount?.current_balance || 0} />
                </AlertDescription>
              </Alert>
            )}

            {noGLMapping && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  One or both selected banks do not have GL account mappings. Please configure GL accounts in Bank Account settings.
                </AlertDescription>
              </Alert>
            )}

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (LKR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transferDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reference and Notes */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FUEL-TOPUP-JAN" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes for this transfer..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GL Preview */}
            {watchFromBank && watchToBank && watchAmount > 0 && fromBankAccount && toBankAccount && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">GL Entry Preview</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>DR: {toBankAccount.account_name} (Asset)</span>
                    <span className="font-mono"><CurrencyDisplay amount={watchAmount} /></span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CR: {fromBankAccount.account_name} (Asset)</span>
                    <span className="font-mono"><CurrencyDisplay amount={watchAmount} /></span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTransfer.isPending || insufficientBalance || noGLMapping}
              >
                {createTransfer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Process Transfer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
