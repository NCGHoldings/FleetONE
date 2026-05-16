import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers, useTaxCodes } from "@/hooks/useAccountingData";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useCreateARInvoice, useUpdateARInvoice } from "@/hooks/useAccountingMutations";
import { useGenerateNumber } from "@/hooks/useNumbering";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Receipt, MapPin, AlignLeft, FileText, Bus } from "lucide-react";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { SearchableAccountSelector } from "./shared/SearchableAccountSelector";
import { SearchableCustomerSelector } from "./shared/SearchableCustomerSelector";
import { BusSelector } from "./BusSelector";

const invoiceSchema = z.object({
  invoice_number: z.string().optional(),
  customer_id: z.string().min(1, "Customer is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  billing_address: z.string().optional(),
  notes: z.string().optional(),
  business_unit_code: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_code?: string;
  tax_rate: number;
  line_total: number;
  account_id?: string;
  item_category_id?: string;
}

interface ARInvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInvoice?: any;
}

export const ARInvoiceForm = ({ open, onOpenChange, editingInvoice }: ARInvoiceFormProps) => {
  const { data: customers } = useCustomers();
  const { data: taxCodes } = useTaxCodes();
  const { getEffectiveCompanyId, getBusinessUnitCode, isSubCompany, selectedCompany } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const defaultBusinessUnit = getBusinessUnitCode();
  const createInvoice = useCreateARInvoice();
  const updateInvoice = useUpdateARInvoice();
  const generateNumber = useGenerateNumber();

  const isParentView = selectedCompany && !isSubCompany(selectedCompany.id);

  const BUSINESS_UNITS = [
    { code: "SBO", label: "School Bus Operations" },
    { code: "YUT", label: "Yutong" },
    { code: "SPH", label: "Special Hire" },
    { code: "LTV", label: "Light Vehicle" },
    { code: "SNT", label: "Sinotruck" },
  ];

  // Fetch item categories with their sales_account_id for revenue mapping
  const { data: itemCategories } = useQuery({
    queryKey: ["item-categories-for-ar", effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("id, category_name, category_code, sales_account_id")
        .eq("company_id", effectiveCompanyId)
        .eq("is_active", true)
        .order("category_name");
      if (error) throw error;
      // Deduplicate by category_name — take the first of each
      const seen = new Map<string, typeof data[0]>();
      for (const cat of data || []) {
        if (!seen.has(cat.category_name)) seen.set(cat.category_name, cat);
      }
      return Array.from(seen.values());
    },
    enabled: !!effectiveCompanyId,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [busData, setBusData] = useState<{
    bus_id?: string;
    bus_no?: string;
    bus_type?: string;
    bus_category_id?: string;
    bus_sub_category_id?: string;
  }>({});

  const isEditing = !!editingInvoice;

  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 },
  ]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: "",
      invoice_date: format(new Date(), "yyyy-MM-dd"),
      due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      billing_address: "",
      notes: "",
      business_unit_code: editingInvoice?.business_unit_code || defaultBusinessUnit || "HQ",
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (!open) return;
    if (editingInvoice) {
      form.reset({
        invoice_number: editingInvoice.invoice_number || "",
        customer_id: editingInvoice.customer_id || "",
        invoice_date: editingInvoice.invoice_date || format(new Date(), "yyyy-MM-dd"),
        due_date: editingInvoice.due_date || format(addDays(new Date(), 30), "yyyy-MM-dd"),
        billing_address: editingInvoice.billing_address || "",
        notes: editingInvoice.notes || "",
        business_unit_code: editingInvoice.business_unit_code || "",
      });

      // Pre-fill bus data
      setBusData({
        bus_id: editingInvoice.bus_id || undefined,
        bus_no: editingInvoice.bus_no || undefined,
        bus_type: editingInvoice.bus_type || undefined,
        bus_category_id: editingInvoice.bus_category_id || undefined,
        bus_sub_category_id: editingInvoice.bus_sub_category_id || undefined,
      });

      // Fetch existing lines
      const fetchLines = async () => {
        const { data: existingLines } = await supabase
          .from("ar_invoice_lines")
          .select("*")
          .eq("invoice_id", editingInvoice.id);
        if (existingLines && existingLines.length > 0) {
          setLines(existingLines.map((l: any) => ({
            id: l.id,
            description: l.description || "",
            quantity: l.quantity || 1,
            unit_price: l.unit_price || 0,
            tax_code: l.tax_code || undefined,
            tax_rate: l.tax_rate || 0,
            line_total: l.line_total || 0,
            account_id: l.account_id || undefined,
          })));
        }
      };
      fetchLines();
    } else {
      setLines([{ id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }]);
      setBusData({});
    }
  }, [open, editingInvoice]);

  // Note: Auto-generate invoice number exactly on save to prevent skipped sequences on cancel.

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          const updated = { ...line, [field]: value };
          if (field === "quantity" || field === "unit_price" || field === "tax_rate") {
            const subtotal = updated.quantity * updated.unit_price;
            const tax = subtotal * (updated.tax_rate / 100);
            updated.line_total = subtotal + tax;
          }
          return updated;
        }
        return line;
      })
    );
  };

  const handleTaxCodeChange = (lineId: string, taxCode: string) => {
    if (!taxCode) {
      updateLine(lineId, "tax_code", undefined);
      updateLine(lineId, "tax_rate", 0);
      return;
    }
    const tax = taxCodes?.find((t) => t.tax_code === taxCode);
    if (tax) {
      updateLine(lineId, "tax_code", taxCode);
      updateLine(lineId, "tax_rate", tax.rate || 0);
    }
  };

  const handleCategoryChange = (lineId: string, categoryId: string) => {
    if (!categoryId || categoryId === "_none") {
      setLines(lines.map(l => l.id === lineId ? { ...l, item_category_id: undefined, account_id: undefined } : l));
      return;
    }
    const cat = itemCategories?.find(c => c.id === categoryId);
    if (cat) {
      setLines(lines.map(l => l.id === lineId ? { ...l, item_category_id: categoryId, account_id: cat.sales_account_id || undefined } : l));
    }
  };

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const totalTax = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price * line.tax_rate) / 100, 0);
  const grandTotal = subtotal + totalTax;

  const onSubmit = async (data: InvoiceFormData) => {
    // Validate: warn if any line is missing a revenue account
    const linesWithoutAccount = lines.filter(l => !l.account_id && l.unit_price > 0);
    if (linesWithoutAccount.length > 0) {
      toast.warning("Some invoice lines are missing a Revenue Account. Select an Item Category for each line to ensure correct GL posting.", { duration: 6000 });
    }

    const lineData = lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.line_total,
      tax_code: line.tax_code,
      account_id: line.account_id,
    }));

    try {
      const busFields = {
        bus_id: busData.bus_id,
        bus_no: busData.bus_no,
        bus_type: busData.bus_type,
        bus_category_id: busData.bus_category_id,
        bus_sub_category_id: busData.bus_sub_category_id,
      };

      if (isEditing) {
        await updateInvoice.mutateAsync({
          id: editingInvoice.id,
          data: {
            invoice_number: data.invoice_number!,
            customer_id: data.customer_id,
            invoice_date: data.invoice_date,
            due_date: data.due_date,
            total_amount: grandTotal,
            tax_amount: totalTax,
            notes: data.billing_address ? `${data.billing_address ? `Billing: ${data.billing_address}\n` : ''}${data.notes || ''}`.trim() : data.notes,
            business_unit_code: data.business_unit_code,
            ...busFields,
          },
          lines: lineData,
        });
      } else {
        const finalInvoiceNumber = await generateNumber("ar_invoice");
        await createInvoice.mutateAsync({
          invoice_number: finalInvoiceNumber,
          customer_id: data.customer_id,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          total_amount: grandTotal,
          tax_amount: totalTax,
          notes: data.billing_address ? `${data.billing_address ? `Billing: ${data.billing_address}\n` : ''}${data.notes || ''}`.trim() : data.notes,
          business_unit_code: data.business_unit_code || defaultBusinessUnit,
          ...busFields,
          lines: lineData,
        });
      }
      onOpenChange(false);
      form.reset();
      setBusData({});
      setLines([{ id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }]);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = isEditing ? updateInvoice.isPending : createInvoice.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-slate-50/95 backdrop-blur border-slate-200 shadow-2xl">
        <DialogHeader className="pb-2 border-b border-slate-200/60 mb-2 flex flex-row items-center justify-between pr-8">
          <DialogTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {isEditing ? "Edit AR Invoice" : "Create AR Invoice"}
          </DialogTitle>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-bold ${isEditing ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
            {isEditing ? "Editing" : "New Draft"}
          </span>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Header Fields - Organized in a modern card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-medium">Customer</FormLabel>
                      <SearchableCustomerSelector
                        value={field.value}
                        onValueChange={field.onChange}
                        showQuickAdd={true}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-medium">Invoice #</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            className="font-mono bg-slate-50" 
                            readOnly
                            placeholder={isEditing ? editingInvoice?.invoice_number : "Auto-generated on save"}
                          />
                           {isGenerating && (
                            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-medium">Invoice Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-medium">Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isParentView && (
                  <FormField
                    control={form.control}
                    name="business_unit_code"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-4 mt-2">
                        <FormLabel className="text-slate-600 font-medium">Business Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full md:w-1/4">
                              <SelectValue placeholder="Select Unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="HQ">HQ / Central</SelectItem>
                            {BUSINESS_UNITS.map(bu => (
                              <SelectItem key={bu.code} value={bu.code}>{bu.code} — {bu.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Bus Selection - Encapsulated */}
            <div className="bg-blue-50/40 p-5 rounded-xl border border-blue-100/60 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-blue-50/60">
              <h3 className="font-medium text-blue-900 text-sm mb-3 flex items-center gap-2">
                <Bus className="w-4 h-4 text-blue-700" />
                Fleet Details (Optional Context)
              </h3>
              <BusSelector value={busData} onChange={setBusData} />
            </div>

            {/* Invoice Lines - Sleek Table */}
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  Invoice Lines
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] table-fixed text-sm">
                  <colgroup>
                    <col style={{ width: 160 }} />
                    <col />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 180 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 50 }} />
                  </colgroup>
                  <thead className="bg-white border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Item Category</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Description</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-500">Qty</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-500">Unit Price</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-500">Tax</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Revenue Account</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-500">Line Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line) => (
                      <tr key={line.id} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="px-4 py-3">
                          <Select
                            value={line.item_category_id || "_none"}
                            onValueChange={(val) => handleCategoryChange(line.id, val)}
                          >
                            <SelectTrigger className="h-9 bg-white">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">— None —</SelectItem>
                              {itemCategories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.category_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Textarea
                            value={line.description}
                            onChange={(e) => updateLine(line.id, "description", e.target.value)}
                            placeholder="Detailed description..."
                            rows={1}
                            className="min-h-[36px] resize-none bg-white border-slate-200 focus:border-blue-300 transition-colors"
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-9 text-center bg-white"
                            min={1}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <CurrencyInput
                            value={line.unit_price}
                            onValueChange={(val) => updateLine(line.id, "unit_price", val)}
                            placeholder="0.00"
                            compact
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={line.tax_code || "_none"}
                            onValueChange={(val) => handleTaxCodeChange(line.id, val === "_none" ? "" : val)}
                          >
                            <SelectTrigger className="h-9 bg-white">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">None</SelectItem>
                              {taxCodes?.map((tax) => (
                                <SelectItem key={tax.tax_code} value={tax.tax_code}>
                                  {tax.tax_code} ({tax.rate}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <SearchableAccountSelector
                            value={line.account_id || ""}
                            onValueChange={(val) => updateLine(line.id, "account_id", val)}
                            placeholder="Auto from category"
                            accountTypes={["revenue", "income", "equity"]}
                            className="h-9 bg-white"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          <CurrencyDisplay amount={line.line_total} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <Button type="button" variant="ghost" size="sm" onClick={addLine} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line Item
                </Button>
              </div>
            </div>

            {/* Bottom Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left side - Notes & Address */}
              <div className="col-span-1 lg:col-span-7 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                  <FormField
                    control={form.control}
                    name="billing_address"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel className="text-slate-600 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Billing Address (Override)
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Leave blank to use default customer address..." rows={2} className="resize-none bg-slate-50 focus-visible:ring-blue-500" />
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
                        <FormLabel className="text-slate-600 font-medium flex items-center gap-1.5">
                          <AlignLeft className="w-3.5 h-3.5 text-slate-400" /> Internal Notes & Remarks
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Optional notes for internal reference..." rows={3} className="resize-none bg-slate-50 focus-visible:ring-blue-500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Right side - Totals Card */}
              <div className="col-span-1 lg:col-span-5">
                <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-blue-900 mb-4 border-b border-blue-200/60 pb-2">Invoice Totals</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-800"><CurrencyDisplay amount={subtotal} /></span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Tax Amount</span>
                      <span className="font-medium text-slate-800"><CurrencyDisplay amount={totalTax} /></span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-blue-200/60 flex justify-between items-center">
                      <span className="font-semibold text-slate-900 text-base">Total Amount</span>
                      <span className="font-bold text-xl text-blue-700 tracking-tight"><CurrencyDisplay amount={grandTotal} /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/60 mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-white">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6">
                {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Invoice" : "Create & Send Invoice")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};