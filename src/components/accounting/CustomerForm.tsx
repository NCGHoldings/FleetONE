import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useAccountingMutations";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { useActiveCustomerCategories } from "@/hooks/useCustomerCategories";
import { useCustomerBridge, normalizePhone, type DuplicateCheckResult } from "@/hooks/useCustomerBridge";
import { Loader2, AlertTriangle, CheckCircle, Shield } from "lucide-react";

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
  // New identity verification fields
  customer_type: z.enum(["individual", "business", "government"]).default("individual"),
  nic_passport: z.string().optional(),
  business_registration_no: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: any;
  onSuccess?: () => void;
}

// Source module display labels
const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  yutong: { label: "Yutong Bus Sales", color: "bg-blue-100 text-blue-800" },
  sinotruck: { label: "Sinotruck Sales", color: "bg-emerald-100 text-emerald-800" },
  special_hire: { label: "Special Hire", color: "bg-amber-100 text-amber-800" },
  school_bus: { label: "School Bus", color: "bg-purple-100 text-purple-800" },
  light_vehicle: { label: "Light Vehicle", color: "bg-cyan-100 text-cyan-800" },
  accounting: { label: "Accounting", color: "bg-gray-100 text-gray-800" },
};

export const CustomerForm = ({ customer, onSuccess }: CustomerFormProps) => {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const generateNumber = useGenerateNumber();
  const { data: categories } = useActiveCustomerCategories();
  const { checkDuplicate } = useCustomerBridge();
  const isEditing = !!customer;
  const [isGenerating, setIsGenerating] = useState(!isEditing);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<FormValues | null>(null);

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
      customer_type: customer?.customer_type || "individual",
      nic_passport: customer?.nic_passport || "",
      business_registration_no: customer?.business_registration_no || "",
    },
  });

  const customerType = form.watch("customer_type");

  // Auto-generate customer code for new customers
  useEffect(() => {
    if (!isEditing && isGenerating) {
      generateNumber("customer").then((code) => {
        form.setValue("customer_code", code);
        setIsGenerating(false);
      });
    }
  }, [isEditing, generateNumber, form, isGenerating]);

  // Debounced duplicate check on phone number change
  const phoneValue = form.watch("contact_phone");
  useEffect(() => {
    if (isEditing) return; // Skip for editing
    const timer = setTimeout(async () => {
      const normalized = normalizePhone(phoneValue);
      if (normalized && normalized.length >= 9) {
        setIsCheckingDuplicate(true);
        const result = await checkDuplicate(phoneValue);
        setDuplicateWarning(result.isDuplicate ? result : null);
        setIsCheckingDuplicate(false);
      } else {
        setDuplicateWarning(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phoneValue, isEditing, checkDuplicate]);

  const onSubmit = async (data: FormValues) => {
    // Pre-submit duplicate check
    if (!isEditing) {
      const result = await checkDuplicate(data.contact_phone, data.contact_email, data.nic_passport);
      if (result.isDuplicate) {
        if (result.duplicateType === 'nic') {
          // Hard block for NIC duplicates
          setDuplicateWarning(result);
          setShowDuplicateDialog(true);
          setPendingSubmitData(null); // Don't allow proceeding
          return;
        }
        // Soft warning for phone duplicates — allow user to confirm
        setDuplicateWarning(result);
        setShowDuplicateDialog(true);
        setPendingSubmitData(data);
        return;
      }
    }

    await doSubmit(data);
  };

  const doSubmit = async (data: FormValues) => {
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
      customer_type: data.customer_type,
      nic_passport: data.nic_passport || null,
      business_registration_no: data.business_registration_no || null,
    };
    if (isEditing) {
      await updateCustomer.mutateAsync({ id: customer.id, ...payload });
    } else {
      await createCustomer.mutateAsync(payload);
    }
    onSuccess?.();
  };

  const handleForceCreate = async () => {
    if (pendingSubmitData) {
      setShowDuplicateDialog(false);
      await doSubmit(pendingSubmitData);
      setPendingSubmitData(null);
    }
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

  const sourceInfo = customer?.source_module ? SOURCE_LABELS[customer.source_module] : null;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Source module badge (read-only, only for existing customers) */}
          {sourceInfo && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Source:</span>
              <Badge className={sourceInfo.color}>{sourceInfo.label}</Badge>
            </div>
          )}

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

          {/* Customer Type + Identity Verification */}
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="customer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Type <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* NIC/Passport — shown for Individual customers */}
            {(customerType === "individual" || customerType === "government") && (
              <FormField
                control={form.control}
                name="nic_passport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIC / Passport <span className="text-orange-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="200012345678 or 912345678V" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Identity verification</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Business Registration — shown for Business customers */}
            {customerType === "business" && (
              <FormField
                control={form.control}
                name="business_registration_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Reg. No <span className="text-orange-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="PV 12345" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Company registration</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
                    <div className="relative">
                      <Input placeholder="+94 11 234 5678" {...field} />
                      {isCheckingDuplicate && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {duplicateWarning && !isCheckingDuplicate && (
                        <AlertTriangle className="absolute right-3 top-2.5 h-4 w-4 text-amber-500" />
                      )}
                      {!duplicateWarning && !isCheckingDuplicate && normalizePhone(field.value).length >= 9 && (
                        <CheckCircle className="absolute right-3 top-2.5 h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </FormControl>
                  {duplicateWarning && (
                    <FormDescription className="text-amber-600 font-medium text-xs">
                      ⚠️ {duplicateWarning.message}
                    </FormDescription>
                  )}
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

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {duplicateWarning?.duplicateType === 'nic' ? 'Duplicate NIC — Blocked' : 'Possible Duplicate Customer'}
            </DialogTitle>
            <DialogDescription>
              {duplicateWarning?.message}
            </DialogDescription>
          </DialogHeader>

          {duplicateWarning?.existingCustomer && (
            <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
              <div className="font-semibold">{duplicateWarning.existingCustomer.customer_name}</div>
              <div className="text-sm text-muted-foreground">
                Code: {duplicateWarning.existingCustomer.customer_code}
              </div>
              {duplicateWarning.existingCustomer.contact_phone && (
                <div className="text-sm text-muted-foreground">
                  Phone: {duplicateWarning.existingCustomer.contact_phone}
                </div>
              )}
              {duplicateWarning.existingCustomer.source_module && (
                <Badge className={SOURCE_LABELS[duplicateWarning.existingCustomer.source_module]?.color || "bg-gray-100"}>
                  {SOURCE_LABELS[duplicateWarning.existingCustomer.source_module]?.label || duplicateWarning.existingCustomer.source_module}
                </Badge>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDuplicateDialog(false); setPendingSubmitData(null); }}>
              Cancel
            </Button>
            {duplicateWarning?.duplicateType === 'nic' ? (
              <Button variant="destructive" disabled>
                Cannot Create — NIC Already Exists
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleForceCreate}>
                Create Anyway
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
