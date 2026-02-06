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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePostFuelExpenseToGL } from "@/hooks/useFuelExpenseFinance";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSchoolBusFinanceSettings } from "@/hooks/useSchoolBusFinance";

const formSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  busId: z.string().optional(),
  expenseDate: z.string().min(1, "Date is required"),
  fuelStation: z.string().optional(),
  vendorId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  fuelLiters: z.coerce.number().optional(),
  billNumber: z.string().optional(),
  paymentMethod: z.enum(["direct", "credit"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FuelExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FuelExpenseForm({ open, onOpenChange }: FuelExpenseFormProps) {
  const { selectedCompanyId } = useCompany();
  const postFuelExpense = usePostFuelExpenseToGL();
  const { data: financeSettings } = useSchoolBusFinanceSettings();

  // Get default settings
  const defaultSettings = financeSettings?.find((s: any) => !s.branch_id);
  const hasFuelBankConfigured = !!defaultSettings?.fuel_bank_account_id;
  const hasFuelExpenseConfigured = !!defaultSettings?.fuel_expense_account_id;

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ["school-branches", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_branches")
        .select("id, branch_name, branch_code")
        .eq("is_active", true)
        .order("branch_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });

  // Fetch buses from buses table
  const { data: buses } = useQuery({
    queryKey: ["buses-for-fuel", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no, model")
        .eq("status", "active")
        .order("bus_no");
      if (error) throw error;
      return data as { id: string; bus_no: string; model: string | null }[];
    },
    enabled: !!selectedCompanyId,
  });

  // Fetch vendors (fuel stations)
  const { data: vendors } = useQuery({
    queryKey: ["vendors-fuel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, vendor_name, vendor_code")
        .eq("is_active", true)
        .order("vendor_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: "",
      busId: "",
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      fuelStation: "",
      vendorId: "",
      amount: 0,
      fuelLiters: undefined,
      billNumber: "",
      paymentMethod: "direct",
      notes: "",
    },
  });

  const watchPaymentMethod = form.watch("paymentMethod");
  const watchAmount = form.watch("amount");
  const watchBranchId = form.watch("branchId");

  const onSubmit = async (values: FormValues) => {
    const selectedVendor = vendors?.find(v => v.id === values.vendorId);
    
    await postFuelExpense.mutateAsync({
      branchId: values.branchId,
      busId: values.busId || undefined,
      expenseDate: values.expenseDate,
      fuelStation: values.fuelStation || selectedVendor?.vendor_name,
      vendorId: values.vendorId || undefined,
      vendorName: selectedVendor?.vendor_name,
      amount: values.amount,
      fuelLiters: values.fuelLiters,
      billNumber: values.billNumber,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
    });
    
    form.reset();
    onOpenChange(false);
  };

  const canSubmit = hasFuelExpenseConfigured && 
                    (watchPaymentMethod === 'credit' || hasFuelBankConfigured);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Add Fuel Expense
          </DialogTitle>
          <DialogDescription>
            Record fuel expense with automatic GL posting
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Warnings */}
        {!hasFuelExpenseConfigured && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Fuel Expense Account not configured. Go to Settings → School Bus Finance to configure.
            </AlertDescription>
          </Alert>
        )}

        {!hasFuelBankConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Fuel Bank Account not configured. Direct payments from fuel bank are disabled. Configure in Settings → School Bus Finance.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Branch and Bus */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch_name}
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
                name="busId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bus (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bus" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No specific bus</SelectItem>
                        {buses?.map((bus) => (
                          <SelectItem key={bus.id} value={bus.id}>
                            {bus.bus_no} {bus.model ? `- ${bus.model}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Station */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fuelStation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Station</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CEYPETCO Nugegoda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Amount and Liters */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (LKR) *</FormLabel>
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
                name="fuelLiters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liters (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 50"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      For cost-per-liter tracking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bill Number */}
            <FormField
              control={form.control}
              name="billNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill/Receipt Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FUE-123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="direct" 
                          id="direct"
                          disabled={!hasFuelBankConfigured}
                        />
                        <label 
                          htmlFor="direct" 
                          className={`text-sm ${!hasFuelBankConfigured ? 'text-muted-foreground' : ''}`}
                        >
                          Direct from Fuel Bank
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="credit" id="credit" />
                        <label htmlFor="credit" className="text-sm">
                          Credit (Create AP Invoice)
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription className="text-xs">
                    {watchPaymentMethod === 'direct' 
                      ? 'Amount will be deducted from Fuel Bank account immediately'
                      : 'AP Invoice will be created for later payment'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vendor (for credit purchases) */}
            {watchPaymentMethod === 'credit' && (
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GL Preview */}
            {watchBranchId && watchAmount > 0 && canSubmit && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">GL Entry Preview</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>DR: Fuel Expense (Expense)</span>
                    <span className="font-mono"><CurrencyDisplay amount={watchAmount} /></span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      CR: {watchPaymentMethod === 'direct' ? 'Fuel Bank (Asset)' : 'Trade Payable (Liability)'}
                    </span>
                    <span className="font-mono"><CurrencyDisplay amount={watchAmount} /></span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={postFuelExpense.isPending || !canSubmit}
              >
                {postFuelExpense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Post to GL
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
