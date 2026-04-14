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
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useAccountingMutations";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { useActiveCustomerCategories } from "@/hooks/useCustomerCategories";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  customer_code: z.string().min(1, "Customer code is required"),
  customer_name: z.string().min(1, "Customer name is required"),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  billing_address: z.string().optional(),
  credit_limit: z.number().min(0).optional(),
  payment_terms: z.number().optional(),
  tax_id: z.string().optional(),
  is_active: z.boolean(),
  customer_category_id: z.string().min(1, "Customer category is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: any;
  onSuccess?: () => void;
}

export const CustomerForm = ({ customer, onSuccess }: CustomerFormProps) => {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const generateNumber = useGenerateNumber();
  const { data: categories } = useActiveCustomerCategories();
  const isEditing = !!customer;
  const [isGenerating, setIsGenerating] = useState(!isEditing);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_code: customer?.customer_code || "",
      customer_name: customer?.customer_name || "",
      contact_email: customer?.contact_email || "",
      contact_phone: customer?.contact_phone || "",
      billing_address: customer?.billing_address || "",
      credit_limit: customer?.credit_limit || 0,
      payment_terms: customer?.payment_terms || "net_30",
      tax_id: customer?.tax_id || "",
      is_active: customer?.is_active ?? true,
      customer_category_id: customer?.customer_category_id || "",
    },
  });

  // Auto-generate customer code for new customers
  useEffect(() => {
    if (!isEditing && isGenerating) {
      generateNumber("customer").then((code) => {
        form.setValue("customer_code", code);
        setIsGenerating(false);
      });
    }
  }, [isEditing, generateNumber, form, isGenerating]);

  const onSubmit = async (data: FormValues) => {
    const payload = {
      customer_code: data.customer_code,
      customer_name: data.customer_name,
      contact_email: data.contact_email || undefined,
      contact_phone: data.contact_phone,
      billing_address: data.billing_address,
      credit_limit: data.credit_limit,
      payment_terms: data.payment_terms,
      tax_id: data.tax_id,
      is_active: data.is_active,
      customer_category_id: data.customer_category_id || null,
    };
    if (isEditing) {
      await updateCustomer.mutateAsync({ id: customer.id, ...payload });
    } else {
      await createCustomer.mutateAsync(payload);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customer_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Code</FormLabel>
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
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="ABC Company Ltd" {...field} />
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
                  <Input type="email" placeholder="contact@company.com" {...field} />
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
          name="billing_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Street, City, Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customer_category_id"
          render={({ field }) => {
            const selectedCategory = categories?.find(c => c.id === field.value);
            return (
            <FormItem>
              <FormLabel>Customer Category <span className="text-red-500">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.category_code} - {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {selectedCategory ? (
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-foreground">AR Account:</span>
                      {selectedCategory.ar_account_id ? <span className="text-emerald-600">Mapped ✅</span> : <span className="text-amber-600">Global Default ⚠️</span>}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-foreground">Revenue Account:</span>
                      {selectedCategory.revenue_account_id ? <span className="text-emerald-600">Mapped ✅</span> : <span className="text-amber-600">Global Default ⚠️</span>}
                    </span>
                  </div>
                ) : (
                  "Determines which GL accounts are used for this customer's AR postings"
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="credit_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Limit (LKR)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Inactive customers won't appear in transaction dropdowns
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
            disabled={createCustomer.isPending || updateCustomer.isPending}
          >
            {createCustomer.isPending || updateCustomer.isPending 
              ? "Saving..." 
              : isEditing ? "Update Customer" : "Create Customer"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
};
