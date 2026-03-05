import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCreateCheque } from "@/hooks/useAccountingMutations";
import { useBankAccounts, useVendors, useCustomers } from "@/hooks/useAccountingData";
import { useNextChequeNumber, useActiveChequeBook } from "@/hooks/useChequeBooks";
import { Loader2, BookOpen, AlertTriangle, AlertCircle } from "lucide-react";

const chequeSchema = z.object({
  cheque_number: z.string().min(1, "Cheque number is required"),
  bank_account_id: z.string().min(1, "Bank account is required"),
  cheque_date: z.string().min(1, "Date is required"),
  payee_name: z.string().min(1, "Payee is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  is_post_dated: z.boolean().optional(),
  cheque_type: z.string().default("outgoing"),
  vendor_id: z.string().optional(),
  customer_id: z.string().optional(),
  reference: z.string().optional(),
  memo: z.string().optional(),
});

type ChequeFormData = z.infer<typeof chequeSchema>;

interface ChequeIssueFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChequeIssueForm = ({ open, onOpenChange }: ChequeIssueFormProps) => {
  const { data: bankAccounts } = useBankAccounts();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();
  const createCheque = useCreateCheque();

  const form = useForm<ChequeFormData>({
    resolver: zodResolver(chequeSchema),
    defaultValues: {
      cheque_number: "",
      bank_account_id: "",
      cheque_date: format(new Date(), "yyyy-MM-dd"),
      payee_name: "",
      amount: 0,
      is_post_dated: false,
      cheque_type: "outgoing",
      reference: "",
      memo: "",
    },
  });

  const isPostDated = form.watch("is_post_dated");
  const chequeType = form.watch("cheque_type");
  const watchedBankAccountId = form.watch("bank_account_id");
  const nextChequeNumber = useNextChequeNumber();
  const { data: activeChequeBook } = useActiveChequeBook(
    chequeType === "outgoing" ? watchedBankAccountId : undefined
  );

  // Auto-fetch cheque number when bank account changes for outgoing cheques
  useEffect(() => {
    if (chequeType === "outgoing" && watchedBankAccountId && open) {
      const currentCheque = form.getValues("cheque_number");
      if (!currentCheque) {
        nextChequeNumber.mutate(watchedBankAccountId, {
          onSuccess: (result) => {
            if (result.cheque_number) {
              form.setValue("cheque_number", result.cheque_number);
            }
          },
        });
      }
    }
  }, [chequeType, watchedBankAccountId, open]);

  const handleVendorSelect = (vendorId: string) => {
    form.setValue("vendor_id", vendorId);
    const vendor = vendors?.find(v => v.id === vendorId);
    if (vendor) {
      form.setValue("payee_name", vendor.vendor_name);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    form.setValue("customer_id", customerId);
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      form.setValue("payee_name", customer.customer_name);
    }
  };

  const onSubmit = async (data: ChequeFormData) => {
    const chequeDate = new Date(data.cheque_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const status = data.is_post_dated || chequeDate > today ? "post_dated" : "draft";

    try {
      await createCheque.mutateAsync({
        cheque_number: data.cheque_number,
        bank_account_id: data.bank_account_id,
        cheque_date: data.cheque_date,
        payee_name: data.payee_name,
        amount: data.amount,
        status,
        reference: data.reference,
        cheque_type: data.cheque_type,
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
          <DialogTitle>{chequeType === "incoming" ? "Record Incoming Cheque" : "Issue Outgoing Cheque"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Cheque Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={chequeType === "outgoing" ? "default" : "outline"}
              size="sm"
              onClick={() => form.setValue("cheque_type", "outgoing")}
            >
              Outgoing (AP)
            </Button>
            <Button
              type="button"
              variant={chequeType === "incoming" ? "default" : "outline"}
              size="sm"
              onClick={() => form.setValue("cheque_type", "incoming")}
            >
              Incoming (AR)
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cheque_number" className="flex items-center gap-1">
                Cheque Number *
                {chequeType === "outgoing" && activeChequeBook && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Auto
                  </Badge>
                )}
              </Label>
              <Input 
                id="cheque_number" 
                {...form.register("cheque_number")} 
                placeholder={chequeType === "outgoing" && activeChequeBook ? "Auto-assigned" : "000001"}
              />
              {chequeType === "outgoing" && activeChequeBook && (() => {
                const remaining = activeChequeBook.end_number - activeChequeBook.next_number + 1;
                if (remaining <= 10 && remaining > 0) {
                  return (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {remaining} cheque leaves remaining
                    </p>
                  );
                }
                if (remaining <= 0) {
                  return (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Cheque book exhausted
                    </p>
                  );
                }
                return null;
              })()}
              {form.formState.errors.cheque_number && (
                <p className="text-xs text-destructive">{form.formState.errors.cheque_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_id">Bank Account *</Label>
              <Select 
                value={form.watch("bank_account_id")} 
                onValueChange={(v) => form.setValue("bank_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.filter(a => a.is_active).map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.bank_account_id && (
                <p className="text-xs text-destructive">{form.formState.errors.bank_account_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cheque_date">Cheque Date *</Label>
              <Input 
                id="cheque_date" 
                type="date"
                {...form.register("cheque_date")} 
              />
            </div>
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
          </div>

          {/* Show vendor or customer selector based on type */}
          {chequeType === "outgoing" ? (
            <div className="space-y-2">
              <Label>Select Vendor (Optional)</Label>
              <Select 
                value={form.watch("vendor_id") || undefined} 
                onValueChange={handleVendorSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Search vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.filter(v => v.is_active).map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Customer (Optional)</Label>
              <Select
                value={form.watch("customer_id") || undefined}
                onValueChange={handleCustomerSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Search customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payee_name">{chequeType === "incoming" ? "Payer Name *" : "Payee Name *"}</Label>
            <Input 
              id="payee_name" 
              {...form.register("payee_name")} 
              placeholder={chequeType === "incoming" ? "Customer / payer name" : "Payee or vendor name"}
            />
            {form.formState.errors.payee_name && (
              <p className="text-xs text-destructive">{form.formState.errors.payee_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input 
              id="reference" 
              {...form.register("reference")} 
              placeholder="Invoice #, PO #, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">Memo</Label>
            <Textarea 
              id="memo" 
              {...form.register("memo")} 
              placeholder="Payment description..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch 
              id="is_post_dated" 
              checked={form.watch("is_post_dated")}
              onCheckedChange={(v) => form.setValue("is_post_dated", v)}
            />
            <Label htmlFor="is_post_dated">Post-Dated Cheque</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCheque.isPending}>
              {createCheque.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {chequeType === "incoming" ? "Record Cheque" : "Save as Draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
