import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVendor, useUpdateVendor } from "@/hooks/useAccountingMutations";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { useVendorBankAccounts, useSaveVendorBankAccounts } from "@/hooks/useVendorBankAccounts";
import { Loader2, Plus, Trash2, Star } from "lucide-react";

const formSchema = z.object({
  vendor_code: z.string().min(1, "Vendor code is required"),
  vendor_name: z.string().min(1, "Vendor name is required"),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  payment_terms: z.number().optional(),
  tax_id: z.string().optional(),
  wht_applicable: z.boolean(),
  wht_rate: z.number().min(0).max(100).optional(),
  is_active: z.boolean(),
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  bank_account: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BankAccountRow {
  account_label: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  account_holder_name: string;
  is_default: boolean;
}

interface VendorFormProps {
  vendor?: any;
  onSuccess?: () => void;
}

export const VendorForm = ({ vendor, onSuccess }: VendorFormProps) => {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const generateNumber = useGenerateNumber();
  const saveBankAccounts = useSaveVendorBankAccounts();
  const { data: existingBankAccounts } = useVendorBankAccounts(vendor?.id);
  const isEditing = !!vendor;
  const [isGenerating, setIsGenerating] = useState(!isEditing);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);

  // Initialize bank accounts from existing data
  useEffect(() => {
    if (isEditing && existingBankAccounts && existingBankAccounts.length > 0) {
      setBankAccounts(
        existingBankAccounts.map((acc) => ({
          account_label: acc.account_label || "Primary",
          bank_name: acc.bank_name,
          bank_branch: acc.bank_branch || "",
          account_number: acc.account_number,
          account_holder_name: acc.account_holder_name || "",
          is_default: acc.is_default,
        }))
      );
    } else if (isEditing && vendor?.bank_name) {
      setBankAccounts([{
        account_label: "Primary",
        bank_name: vendor.bank_name || "",
        bank_branch: vendor.bank_branch || "",
        account_number: vendor.bank_account || "",
        account_holder_name: "",
        is_default: true,
      }]);
    }
  }, [isEditing, existingBankAccounts, vendor]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendor_code: vendor?.vendor_code || "",
      vendor_name: vendor?.vendor_name || "",
      contact_email: vendor?.contact_email || "",
      contact_phone: vendor?.contact_phone || "",
      address: vendor?.address || "",
      payment_terms: vendor?.payment_terms || "net_30",
      tax_id: vendor?.tax_id || "",
      wht_applicable: vendor?.wht_applicable ?? false,
      wht_rate: vendor?.wht_rate || 0,
      is_active: vendor?.is_active ?? true,
      bank_name: vendor?.bank_name || "",
      bank_branch: vendor?.bank_branch || "",
      bank_account: vendor?.bank_account || "",
    },
  });

  const whtApplicable = form.watch("wht_applicable");

  useEffect(() => {
    if (!isEditing && isGenerating) {
      generateNumber("vendor").then((code) => {
        form.setValue("vendor_code", code);
        setIsGenerating(false);
      });
    }
  }, [isEditing, generateNumber, form, isGenerating]);

  const addBankAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      {
        account_label: bankAccounts.length === 0 ? "Primary" : "",
        bank_name: "",
        bank_branch: "",
        account_number: "",
        account_holder_name: "",
        is_default: bankAccounts.length === 0,
      },
    ]);
  };

  const removeBankAccount = (index: number) => {
    const updated = bankAccounts.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((a) => a.is_default)) {
      updated[0].is_default = true;
    }
    setBankAccounts(updated);
  };

  const updateBankAccount = (index: number, field: keyof BankAccountRow, value: string | boolean) => {
    const updated = [...bankAccounts];
    if (field === "is_default" && value === true) {
      updated.forEach((a) => (a.is_default = false));
    }
    (updated[index] as any)[field] = value;
    setBankAccounts(updated);
  };

  const onSubmit = async (data: FormValues) => {
    const defaultBank = bankAccounts.find((a) => a.is_default) || bankAccounts[0];
    const payload = {
      vendor_code: data.vendor_code,
      vendor_name: data.vendor_name,
      contact_email: data.contact_email || undefined,
      contact_phone: data.contact_phone,
      address: data.address,
      payment_terms: data.payment_terms,
      tax_id: data.tax_id,
      wht_applicable: data.wht_applicable,
      wht_rate: data.wht_rate,
      is_active: data.is_active,
      bank_name: defaultBank?.bank_name || data.bank_name || undefined,
      bank_branch: defaultBank?.bank_branch || data.bank_branch || undefined,
      bank_account: defaultBank?.account_number || data.bank_account || undefined,
    };

    let vendorId = vendor?.id;
    if (isEditing) {
      await updateVendor.mutateAsync({ id: vendor.id, ...payload });
    } else {
      const result = await createVendor.mutateAsync(payload);
      vendorId = result?.id;
    }

    if (vendorId && bankAccounts.length > 0) {
      await saveBankAccounts.mutateAsync({
        vendorId,
        accounts: bankAccounts.filter((a) => a.bank_name && a.account_number),
      });
    }

    onSuccess?.();
  };

  const paymentTermsOptions = [
    { value: "immediate", label: "Immediate" },
    { value: "net_7", label: "Net 7 Days" },
    { value: "net_14", label: "Net 14 Days" },
    { value: "net_30", label: "Net 30 Days" },
    { value: "net_45", label: "Net 45 Days" },
    { value: "net_60", label: "Net 60 Days" },
    { value: "net_90", label: "Net 90 Days" },
  ];

  const whtRateOptions = [
    { value: 2, label: "2% - Professional Services" },
    { value: 5, label: "5% - Rent & Other" },
    { value: 10, label: "10% - Interest" },
    { value: 14, label: "14% - Contract Payments" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vendor_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Code</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="Auto-generated" 
                      {...field} 
                      disabled={isEditing || isGenerating}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-muted" : ""}
                    />
                    {isGenerating && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </FormControl>
                {!isEditing && <FormDescription>Auto-generated from Settings</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vendor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Name</FormLabel>
                <FormControl>
                  <Input placeholder="XYZ Supplies Ltd" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="vendor@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+94 11 234 5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Street, City, Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms (Days)</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentTermsOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tax_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ID (TIN)</FormLabel>
                <FormControl>
                  <Input placeholder="123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <h4 className="font-medium">Withholding Tax (WHT) Settings</h4>
          
          <FormField
            control={form.control}
            name="wht_applicable"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel>WHT Applicable</FormLabel>
                  <FormDescription>
                    Enable if withholding tax should be deducted from payments
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {whtApplicable && (
            <FormField
              control={form.control}
              name="wht_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WHT Rate</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(parseFloat(v))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select WHT rate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {whtRateOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Multiple Bank Accounts Section */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Banking Details</h4>
            <Button type="button" variant="outline" size="sm" onClick={addBankAccount}>
              <Plus className="h-4 w-4 mr-1" />
              Add Account
            </Button>
          </div>

          {bankAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bank accounts added. Click &quot;Add Account&quot; to add vendor payment details.
            </p>
          )}

          {bankAccounts.map((acc, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input
                    value={acc.account_label}
                    onChange={(e) => updateBankAccount(idx, "account_label", e.target.value)}
                    placeholder="Account Label (e.g., Primary, USD)"
                    className="w-48 h-8 text-sm"
                  />
                  {acc.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!acc.is_default && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateBankAccount(idx, "is_default", true)}
                      title="Set as default"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBankAccount(idx)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Bank Name *</label>
                  <Input
                    value={acc.bank_name}
                    onChange={(e) => updateBankAccount(idx, "bank_name", e.target.value)}
                    placeholder="Commercial Bank"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Branch</label>
                  <Input
                    value={acc.bank_branch}
                    onChange={(e) => updateBankAccount(idx, "bank_branch", e.target.value)}
                    placeholder="Main Branch"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Account Number *</label>
                  <Input
                    value={acc.account_number}
                    onChange={(e) => updateBankAccount(idx, "account_number", e.target.value)}
                    placeholder="1234567890"
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Account Holder</label>
                  <Input
                    value={acc.account_holder_name}
                    onChange={(e) => updateBankAccount(idx, "account_holder_name", e.target.value)}
                    placeholder="Account holder name"
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Inactive vendors won't appear in transaction dropdowns
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createVendor.isPending || updateVendor.isPending || saveBankAccounts.isPending}
          >
            {createVendor.isPending || updateVendor.isPending || saveBankAccounts.isPending
              ? "Saving..." 
              : isEditing ? "Update Vendor" : "Create Vendor"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
};
