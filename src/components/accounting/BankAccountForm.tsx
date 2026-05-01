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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateBankAccount, useUpdateBankAccount } from "@/hooks/useAccountingMutations";
import { useChartOfAccounts, useCurrencies } from "@/hooks/useAccountingData";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";

const bankAccountSchema = z.object({
  account_code: z.string().min(1, "Account code is required"),
  account_name: z.string().min(1, "Account name is required"),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  branch: z.string().optional(),
  account_type: z.string().optional(),
  currency: z.string().optional(),
  opening_balance: z.number().optional(),
  gl_account_id: z.string().optional(),
  business_unit_code: z.string().optional().nullable(),
  shared_business_units: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.account_type !== "petty_cash") {
    if (!data.bank_name || data.bank_name.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bank_name"], message: "Bank name is required" });
    }
    if (!data.account_number || data.account_number.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["account_number"], message: "Account number is required" });
    }
  }
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount?: any;
}

export const BankAccountForm = ({ open, onOpenChange, bankAccount }: BankAccountFormProps) => {
  const { data: accounts } = useChartOfAccounts();
  const { data: currencies = [] } = useCurrencies();
  const createBankAccount = useCreateBankAccount();
  const updateBankAccount = useUpdateBankAccount();
  const { selectedCompanyId, allCompanies, getSubCompaniesFor } = useCompany();
  const isEditing = !!bankAccount;

  // Always allow holding companies to see all other companies to share with
  const availableBusinessUnits = useMemo(() => {
    if (!selectedCompanyId || !allCompanies) return [];
    return allCompanies.filter(c => c.id !== selectedCompanyId && c.business_unit_type !== 'test');
  }, [selectedCompanyId, allCompanies]);

  const isHoldingCompany = true; // Always allow sharing for now, or check if they have subcompanies. user requested "should have all"

  const bankAccounts = accounts?.filter(a => 
    a.account_type === "asset" && 
    (a.account_name?.toLowerCase().includes("bank") || 
     a.account_name?.toLowerCase().includes("cash") ||
     a.account_name?.toLowerCase().includes("float"))
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
      business_unit_code: null,
      shared_business_units: [],
      is_active: true,
      is_default: false,
      notes: "",
    },
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (bankAccount && open) {
      form.reset({
        account_code: bankAccount.account_code || "",
        account_name: bankAccount.account_name || "",
        bank_name: bankAccount.bank_name || "",
        account_number: bankAccount.account_number || "",
        branch: bankAccount.branch || "",
        account_type: bankAccount.account_type || "current",
        currency: bankAccount.currency || "LKR",
        opening_balance: bankAccount.opening_balance || 0,
        gl_account_id: bankAccount.gl_account_id || undefined,
        business_unit_code: bankAccount.business_unit_code || null,
        shared_business_units: bankAccount.shared_business_units || [],
        is_active: bankAccount.is_active ?? true,
        is_default: bankAccount.is_default ?? false,
        notes: bankAccount.notes || "",
      });
    } else if (!bankAccount && open) {
      form.reset();
    }
  }, [bankAccount, open, form]);

  const watchedAccountType = form.watch("account_type");
  const isPettyCash = watchedAccountType === "petty_cash";

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      const payload = {
        account_code: data.account_code,
        account_name: data.account_name,
        bank_name: data.bank_name || "",
        account_number: data.account_number || "",
        branch: data.branch,
        account_type: data.account_type,
        currency: data.currency || "LKR",
        opening_balance: data.opening_balance || 0,
        gl_account_id: data.gl_account_id,
        business_unit_code: data.business_unit_code,
        shared_business_units: data.shared_business_units || [],
        is_active: data.is_active ?? true,
        is_default: data.is_default ?? false,
        notes: data.notes,
      };

      if (isEditing) {
        await updateBankAccount.mutateAsync({ id: bankAccount.id, ...payload });
      } else {
        await createBankAccount.mutateAsync({
          ...payload,
          current_balance: data.opening_balance || 0,
        });
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isPending = createBankAccount.isPending || updateBankAccount.isPending;

  // Filter active currencies and ensure LKR is always available
  const activeCurrencies = currencies.filter(c => c.is_active);
  const hasLKR = activeCurrencies.some(c => c.currency_code === "LKR");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
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
              <Label htmlFor="bank_name">Bank Name {!isPettyCash && "*"}</Label>
              <Input 
                id="bank_name" 
                {...form.register("bank_name")} 
                placeholder={isPettyCash ? "Optional" : "Commercial Bank"}
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
              <Label htmlFor="account_number">Account Number {!isPettyCash && "*"}</Label>
              <Input 
                id="account_number" 
                {...form.register("account_number")} 
                placeholder={isPettyCash ? "Optional" : "1234567890"}
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
                  {!hasLKR && (
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                  )}
                  {activeCurrencies.map((curr) => (
                    <SelectItem key={curr.currency_code} value={curr.currency_code}>
                      {curr.currency_code} - {curr.currency_name}
                    </SelectItem>
                  ))}
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

          {isHoldingCompany && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_unit_code">Primary Business Unit (Optional)</Label>
                <Select 
                  value={form.watch("business_unit_code") || "none"} 
                  onValueChange={(v) => form.setValue("business_unit_code", v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to Business Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Main Company Only)</SelectItem>
                    {availableBusinessUnits.map((bu) => {
                      const getBUCode = (name: string) => {
                        const n = name.toLowerCase();
                        if (n.includes("school bus")) return "SBO";
                        if (n.includes("special hire")) return "SPH";
                        if (n.includes("yutong")) return "YUT";
                        if (n.includes("sinotruck") || n.includes("sinotruk")) return "SNT";
                        if (n.includes("light vehicle")) return "LTV";
                        if (n.includes("stores")) return "STO";
                        return null;
                      };
                      const code = bu.short_code || getBUCode(bu.name);
                      return code ? (
                        <SelectItem key={bu.id} value={code}>
                          {bu.name}
                        </SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  The primary business unit that owns this bank account.
                </p>
              </div>

              <div className="space-y-2 border p-3 rounded-md bg-secondary/20">
                <Label>Share with Other Business Units</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select other business units that should be able to see and use this bank account.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableBusinessUnits.map((bu) => {
                    const getBUCode = (name: string) => {
                      const n = name.toLowerCase();
                      if (n.includes("school bus")) return "SBO";
                      if (n.includes("special hire")) return "SPH";
                      if (n.includes("yutong")) return "YUT";
                      if (n.includes("sinotruck") || n.includes("sinotruk")) return "SNT";
                      if (n.includes("light vehicle")) return "LTV";
                      if (n.includes("stores")) return "STO";
                      return null;
                    };
                    const code = bu.short_code || getBUCode(bu.name);
                    
                    if (!code) return null;
                    // Don't show the primary BU in the shared list to avoid confusion
                    if (code === form.watch("business_unit_code")) return null;
                    
                    const isShared = form.watch("shared_business_units")?.includes(code) || false;
                    
                    return (
                      <div key={bu.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`share-${code}`} 
                          checked={isShared}
                          onCheckedChange={(checked) => {
                            const current = form.watch("shared_business_units") || [];
                            if (checked) {
                              form.setValue("shared_business_units", [...current, code]);
                            } else {
                              form.setValue("shared_business_units", current.filter(c => c !== code));
                            }
                          }}
                        />
                        <Label htmlFor={`share-${code}`} className="text-sm font-normal cursor-pointer">
                          {bu.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Bank Account" : "Add Bank Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
