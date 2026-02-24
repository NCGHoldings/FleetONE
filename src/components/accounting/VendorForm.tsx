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
import { Loader2 } from "lucide-react";

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
});

type FormValues = z.infer<typeof formSchema>;

interface VendorFormProps {
  vendor?: any;
  onSuccess?: () => void;
}

export const VendorForm = ({ vendor, onSuccess }: VendorFormProps) => {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const generateNumber = useGenerateNumber();
  const isEditing = !!vendor;
  const [isGenerating, setIsGenerating] = useState(!isEditing);

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
    },
  });

  const whtApplicable = form.watch("wht_applicable");

  // Auto-generate vendor code for new vendors
  useEffect(() => {
    if (!isEditing && isGenerating) {
      generateNumber("vendor").then((code) => {
        form.setValue("vendor_code", code);
        setIsGenerating(false);
      });
    }
  }, [isEditing, generateNumber, form, isGenerating]);

  const onSubmit = async (data: FormValues) => {
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
    };
    if (isEditing) {
      await updateVendor.mutateAsync({ id: vendor.id, ...payload });
    } else {
      await createVendor.mutateAsync(payload);
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
            disabled={createVendor.isPending || updateVendor.isPending}
          >
            {createVendor.isPending || updateVendor.isPending 
              ? "Saving..." 
              : isEditing ? "Update Vendor" : "Create Vendor"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
};
