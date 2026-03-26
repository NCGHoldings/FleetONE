import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Receipt, Bus, Building2, FileText, Loader2, Fuel, Camera, Landmark, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useCreateExpenseRequest, EXPENSE_CATEGORIES, BUSINESS_UNITS, PAYMENT_METHODS } from "@/hooks/useExpenseRequests";
import { usePettyCashFunds, useIOURecords } from "@/hooks/usePettyCash";
import { useVendors } from "@/hooks/useAccountingData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ReceiptOCRPreview, type OCRExtractedData } from "./ReceiptOCRPreview";

const expenseSchema = z.object({
  request_date: z.string().min(1, "Date is required"),
  business_unit_code: z.string().min(1, "Business unit is required"),
  expense_category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  bus_id: z.string().optional(),
  vendor_id: z.string().optional(),
  vendor_name_draft: z.string().optional(),
  payment_method: z.string().min(1, "Payment method is required"),
  petty_cash_fund_id: z.string().optional(),
  iou_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  fuel_liters: z.number().optional(),
  fuel_price_per_liter: z.number().optional(),
  notes: z.string().optional(),
  pass_to_finance: z.boolean().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBusinessUnit?: string;
  defaultSchoolRouteId?: string;
}

export const ExpenseRequestForm = ({ open, onOpenChange, defaultBusinessUnit, defaultSchoolRouteId }: ExpenseRequestFormProps) => {
  const createExpense = useCreateExpenseRequest();
  const { data: vendors } = useVendors();
  const { data: pettyCashFunds } = usePettyCashFunds();
  const { data: iouRecords } = useIOURecords({ status: "pending" });
  const { selectedCompanyId } = useCompany();
  const [passToFinance, setPassToFinance] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [ocrModifiedFields, setOcrModifiedFields] = useState<string[]>([]);
  const [ocrApplied, setOcrApplied] = useState(false);

  // Fetch buses
  const { data: buses } = useQuery({
    queryKey: ["buses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no, type")
        .eq("status", "active")
        .order("bus_no");
      if (error) throw error;
      return data;
    },
  });

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts-list", selectedCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("bank_accounts")
        .select("id, account_name, account_number, bank_name")
        .eq("status", "active")
        .order("account_name");
      if (selectedCompanyId) query = query.eq("company_id", selectedCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      request_date: format(new Date(), "yyyy-MM-dd"),
      business_unit_code: defaultBusinessUnit || "",
      expense_category: "",
      description: "",
      amount: 0,
      payment_method: "to_be_paid",
      notes: "",
      pass_to_finance: false,
    },
  });

  const paymentMethod = form.watch("payment_method");
  const expenseCategory = form.watch("expense_category");

  const onSubmit = async (data: ExpenseFormData) => {
    const status = passToFinance || !data.vendor_id ? "pending_finance" : "pending_approval";
    
    await createExpense.mutateAsync({
      ...data,
      status,
      receipt_attachment_url: receiptImageUrl || undefined,
      receipt_ocr_data: ocrApplied ? { modified_fields: ocrModifiedFields } : undefined,
      ocr_fields_modified: ocrModifiedFields.length > 0 ? ocrModifiedFields : undefined,
      additional_docs: defaultSchoolRouteId ? { school_route_id: defaultSchoolRouteId } : undefined,
    } as any);

    // Auto-create bank transaction when payment method is "bank" and bank account is selected
    if (data.payment_method === "bank" && data.bank_account_id) {
      try {
        await (supabase as any).from("bank_transactions").insert([{
          bank_account_id: data.bank_account_id,
          transaction_date: data.request_date,
          description: `Expense: ${data.description || data.expense_category}`,
          debit_amount: data.amount,
          credit_amount: 0,
          type: "payment",
          reference: `EXP-${format(new Date(), "yyyyMMdd")}`,
          status: "pending",
          company_id: selectedCompanyId,
        }]);
      } catch (e) {
        console.error("Auto bank transaction failed:", e);
      }
    }

    onOpenChange(false);
    form.reset();
    setPassToFinance(false);
    setShowOCR(false);
    setReceiptImageUrl("");
    setOcrModifiedFields([]);
    setOcrApplied(false);
  };

  // Handle OCR data extraction
  const handleOCRData = (data: OCRExtractedData, modifiedFields: string[]) => {
    form.setValue("amount", data.totalAmount);
    form.setValue("expense_category", data.category);
    if (data.vendorName) form.setValue("vendor_name_draft", data.vendorName);
    if (data.date) form.setValue("request_date", data.date);
    if (data.fuelLiters) form.setValue("fuel_liters", data.fuelLiters);
    if (data.fuelPricePerLiter) form.setValue("fuel_price_per_liter", data.fuelPricePerLiter);
    
    // Build description from items
    let desc = "";
    if (data.items.length > 0) {
      desc = data.items.map(i => `${i.name} x${i.qty}`).join(", ");
    }
    if (data.category === "fuel" && data.fuelLiters > 0) {
      desc = `Fuel: ${data.fuelLiters}L @ Rs ${data.fuelPricePerLiter}/L${data.fuelStation ? ` (${data.fuelStation})` : ""}`;
    }
    if (desc) form.setValue("description", desc);

    setOcrModifiedFields(modifiedFields);
    setOcrApplied(true);
    setShowOCR(false);
  };

  // Group categories for better UX
  const groupedCategories = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof EXPENSE_CATEGORIES>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            New Expense Request
          </DialogTitle>
        </DialogHeader>

        {/* ===== OCR SCANNER (shown when active) ===== */}
        {showOCR ? (
          <ReceiptOCRPreview
            onDataExtracted={handleOCRData}
            onImageUploaded={setReceiptImageUrl}
            onCancel={() => setShowOCR(false)}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* ===== RECEIPT SCAN BUTTON (Top Priority) ===== */}
              <Card 
                className="p-4 border-dashed border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer hover:shadow-md transition-all"
                onClick={() => setShowOCR(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2.5">
                    <Camera className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">📸 Scan Receipt / Bill</p>
                    <p className="text-xs text-blue-600">Upload photo → auto-extract vendor, amount, items, fuel liters</p>
                  </div>
                  {ocrApplied && (
                    <Badge className="bg-green-600 text-xs">✅ OCR Applied</Badge>
                  )}
                </div>
              </Card>

              {/* OCR Modified Fields Warning */}
              {ocrModifiedFields.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">User edited OCR data — Finance Review Required:</p>
                    <p className="text-yellow-700 mt-0.5">{ocrModifiedFields.join(", ")}</p>
                  </div>
                </div>
              )}

              {/* Header Section */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="request_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="business_unit_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUSINESS_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {unit.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category and Bus */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expense_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(groupedCategories).map(([group, cats]) => (
                            <SelectGroup key={group}>
                              <SelectLabel className="text-xs text-muted-foreground">{group}</SelectLabel>
                              {cats.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bus_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bus Number (Optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "_none" ? undefined : val)} value={field.value || "_none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">-- No Bus --</SelectItem>
                          {buses?.map((bus) => (
                            <SelectItem key={bus.id} value={bus.id}>
                              <div className="flex items-center gap-2">
                                <Bus className="h-4 w-4" />
                                {bus.bus_no} - {bus.type}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the expense..." 
                        {...field} 
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (LKR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="text-lg font-semibold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ===== FUEL SPECIFIC FIELDS ===== */}
              {expenseCategory === "fuel" && (
                <Card className="p-4 border-blue-200 bg-blue-50/50">
                  <h4 className="font-medium flex items-center gap-2 text-blue-700 mb-3">
                    <Fuel className="h-4 w-4" />
                    Fuel Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fuel_liters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">No. of Liters</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fuel_price_per_liter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Price per Liter (LKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              )}

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ===== BANK ACCOUNT SELECTION ===== */}
              {paymentMethod === "bank" && (
                <FormField
                  control={form.control}
                  name="bank_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-blue-600" />
                        Bank Account
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccounts?.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.account_name} — {acc.bank_name} ({acc.account_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Transaction will auto-appear in Bank Reconciliation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Petty Cash Fund Selection */}
              {paymentMethod === "petty_cash" && (
                <FormField
                  control={form.control}
                  name="petty_cash_fund_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Petty Cash Fund</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fund" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pettyCashFunds?.map((fund) => (
                            <SelectItem key={fund.id} value={fund.id}>
                              {fund.fund_name} (Balance: Rs {fund.current_balance.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* IOU Selection */}
              {paymentMethod === "iou" && (
                <FormField
                  control={form.control}
                  name="iou_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select IOU to Settle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select IOU" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iouRecords?.map((iou) => (
                            <SelectItem key={iou.id} value={iou.id}>
                              {iou.iou_number} - {iou.staff?.staff_name} (Balance: Rs {iou.balance.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Vendor Section */}
              <Card className="p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Vendor Information
                </h4>
                
                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor (if known)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "_none" ? undefined : val)} value={field.value || "_none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">-- Unknown Vendor --</SelectItem>
                          {vendors?.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Leave blank if you don't know the vendor details
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor_name_draft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name (Draft)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter vendor name if not in system..." 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Finance will match this to the correct vendor
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pass_to_finance"
                    checked={passToFinance}
                    onCheckedChange={(checked) => setPassToFinance(!!checked)}
                  />
                  <Label htmlFor="pass_to_finance" className="text-sm">
                    I don't know vendor details - Pass to Finance for completion
                  </Label>
                </div>
              </Card>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information..." 
                        {...field} 
                        value={field.value || ""}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Receipt Image Preview (if uploaded via OCR) */}
              {receiptImageUrl && (
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={receiptImageUrl} alt="Receipt" className="w-16 h-20 object-cover rounded border" />
                    <div>
                      <p className="text-sm font-medium">Receipt Attached ✅</p>
                      <p className="text-xs text-muted-foreground">Scanned via OCR</p>
                    </div>
                  </div>
                </Card>
              )}

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="secondary" disabled>
                  Save Draft
                </Button>
                <Button type="submit" disabled={createExpense.isPending}>
                  {createExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit to Finance
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
