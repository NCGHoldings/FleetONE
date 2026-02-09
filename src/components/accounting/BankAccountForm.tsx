import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateBankAccount } from "@/hooks/useAccountingMutations";
import { useChartOfAccounts, useCurrencies } from "@/hooks/useAccountingData";
import { Loader2 } from "lucide-react";

const bankAccountSchema = z.object({
  account_code: z.string().min(1, "Account code is required"),
  account_name: z.string().min(1, "Account name is required"),
  bank_name: z.string().min(1, "Bank name is required"),
  account_number: z.string().min(1, "Account number is required"),
  branch: z.string().optional(),
  account_type: z.string().optional(),
  currency: z.string().optional(),
  opening_balance: z.number().optional(),
  gl_account_id: z.string().optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  notes: z.string().optional(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BankAccountForm = ({ open, onOpenChange }: BankAccountFormProps) => {
  const { data: accounts } = useChartOfAccounts();
  const { data: currencies = [] } = useCurrencies();
  const createBankAccount = useCreateBankAccount();

  const bankAccounts = accounts?.filter(a => 
    a.account_type === "asset" && 
    (a.account_name?.toLowerCase().includes("bank") || a.account_name?.toLowerCase().includes("cash"))
  );

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      account_code: "",
      account_name: "",
      bank_name: "",
      account_number: "",
      branch: "",
      account_type: "current",
      currency: "LKR",
      opening_balance: 0,
      is_active: true,
      is_default: false,
      notes: "",
    },
  });

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      await createBankAccount.mutateAsync({
        account_code: data.account_code,
        account_name: data.account_name,
        bank_name: data.bank_name,
        account_number: data.account_number,
        branch: data.branch,
        account_type: data.account_type,
        currency: data.currency || "LKR",
        opening_balance: data.opening_balance || 0,
        current_balance: data.opening_balance || 0,
        gl_account_id: data.gl_account_id,
        is_active: data.is_active ?? true,
        is_default: data.is_default ?? false,
        notes: data.notes,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Filter active currencies and ensure LKR is always available
  const activeCurrencies = currencies.filter(c => c.is_active);
  const hasLKR = activeCurrencies.some(c => c.currency_code === "LKR");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_code">Account Code *</Label>
              <Input 
                id="account_code" 
                {...form.register("account_code")} 
                placeholder="BANK-001"
              />
              {form.formState.errors.account_code && (
                <p className="text-xs text-destructive">{form.formState.errors.account_code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type</Label>
              <Select 
                value={form.watch("account_type")} 
                onValueChange={(v) => form.setValue("account_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Account</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  <SelectItem value="money_market">Money Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name *</Label>
            <Input 
              id="account_name" 
              {...form.register("account_name")} 
              placeholder="Main Operating Account"
            />
            {form.formState.errors.account_name && (
              <p className="text-xs text-destructive">{form.formState.errors.account_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input 
                id="bank_name" 
                {...form.register("bank_name")} 
                placeholder="Commercial Bank"
              />
              {form.formState.errors.bank_name && (
                <p className="text-xs text-destructive">{form.formState.errors.bank_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input 
                id="branch" 
                {...form.register("branch")} 
                placeholder="Main Branch"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input 
                id="account_number" 
                {...form.register("account_number")} 
                placeholder="1234567890"
              />
              {form.formState.errors.account_number && (
                <p className="text-xs text-destructive">{form.formState.errors.account_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={form.watch("currency")} 
                onValueChange={(v) => form.setValue("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {/* Always show LKR first if not in database */}
                  {!hasLKR && (
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                  )}
                  {/* Show currencies from database */}
                  {activeCurrencies.map((curr) => (
                    <SelectItem key={curr.currency_code} value={curr.currency_code}>
                      {curr.currency_code} - {curr.currency_name}
                    </SelectItem>
                  ))}
                  {/* Fallback if no currencies in database */}
                  {activeCurrencies.length === 0 && (
                    <>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opening_balance">Opening Balance</Label>
              <Input 
                id="opening_balance" 
                type="number"
                step="0.01"
                {...form.register("opening_balance", { valueAsNumber: true })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gl_account_id">GL Account</Label>
              <Select 
                value={form.watch("gl_account_id")} 
                onValueChange={(v) => form.setValue("gl_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to GL" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch 
                id="is_active" 
                checked={form.watch("is_active")}
                onCheckedChange={(v) => form.setValue("is_active", v)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id="is_default" 
                checked={form.watch("is_default")}
                onCheckedChange={(v) => form.setValue("is_default", v)}
              />
              <Label htmlFor="is_default">Default Account</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBankAccount.isPending}>
              {createBankAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Bank Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};