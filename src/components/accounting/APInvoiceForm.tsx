import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendors, useTaxCodes } from "@/hooks/useAccountingData";
import { useCreateAPInvoice } from "@/hooks/useAccountingMutations";
import { format, addDays } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Checkbox } from "@/components/ui/checkbox";

const invoiceSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  vendor_id: z.string().min(1, "Vendor is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  apply_wht: z.boolean().optional(),
  wht_rate: z.number().optional(),
  notes: z.string().optional(),
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
}

interface APInvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const APInvoiceForm = ({ open, onOpenChange }: APInvoiceFormProps) => {
  const { data: vendors } = useVendors();
  const { data: taxCodes } = useTaxCodes();
  const createInvoice = useCreateAPInvoice();

  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 },
  ]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: "",
      invoice_date: format(new Date(), "yyyy-MM-dd"),
      due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      apply_wht: false,
      wht_rate: 5,
      notes: "",
    },
  });

  const applyWht = form.watch("apply_wht");
  const whtRate = form.watch("wht_rate") || 5;

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
    const tax = taxCodes?.find((t) => t.tax_code === taxCode);
    if (tax) {
      updateLine(lineId, "tax_code", taxCode);
      updateLine(lineId, "tax_rate", tax.rate || 0);
    }
  };

  // Get vendor WHT rate when vendor changes
  const handleVendorChange = (vendorId: string) => {
    form.setValue("vendor_id", vendorId);
    const vendor = vendors?.find((v) => v.id === vendorId);
    if (vendor?.wht_rate) {
      form.setValue("wht_rate", vendor.wht_rate);
    }
  };

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const totalTax = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price * line.tax_rate) / 100, 0);
  const grossTotal = subtotal + totalTax;
  const whtAmount = applyWht ? (subtotal * whtRate) / 100 : 0;
  const netPayable = grossTotal - whtAmount;

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      await createInvoice.mutateAsync({
        invoice_number: data.invoice_number,
        vendor_id: data.vendor_id,
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        total_amount: grossTotal,
        tax_amount: totalTax,
        wht_amount: whtAmount,
        notes: data.notes,
      });
      onOpenChange(false);
      form.reset();
      setLines([{ id: "1", description: "", quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }]);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record AP Invoice (Vendor Bill)</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Invoice #</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Vendor's invoice number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select onValueChange={handleVendorChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
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

              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoice Lines */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Invoice Lines</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium">Description</th>
                      <th className="px-3 py-2 text-center text-sm font-medium w-20">Qty</th>
                      <th className="px-3 py-2 text-right text-sm font-medium w-28">Unit Price</th>
                      <th className="px-3 py-2 text-center text-sm font-medium w-28">Tax Code</th>
                      <th className="px-3 py-2 text-right text-sm font-medium w-28">Line Total</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="px-3 py-2">
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(line.id, "description", e.target.value)}
                            placeholder="Item/service description"
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-8 text-center"
                            min={1}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={line.unit_price}
                            onChange={(e) => updateLine(line.id, "unit_price", parseFloat(e.target.value) || 0)}
                            className="h-8 text-right"
                            min={0}
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={line.tax_code || ""}
                            onValueChange={(val) => handleTaxCodeChange(line.id, val)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {taxCodes?.map((tax) => (
                                <SelectItem key={tax.tax_code} value={tax.tax_code}>
                                  {tax.tax_code} ({tax.rate}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          <CurrencyDisplay amount={line.line_total} />
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* WHT Section */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <FormField
                  control={form.control}
                  name="apply_wht"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Apply Withholding Tax (WHT)</FormLabel>
                    </FormItem>
                  )}
                />
                {applyWht && (
                  <FormField
                    control={form.control}
                    name="wht_rate"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormLabel className="!mt-0">Rate:</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="w-20 h-8"
                            min={0}
                            max={100}
                            step="0.5"
                          />
                        </FormControl>
                        <span>%</span>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium"><CurrencyDisplay amount={subtotal} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (VAT):</span>
                    <span className="font-medium"><CurrencyDisplay amount={totalTax} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Total:</span>
                    <span className="font-medium"><CurrencyDisplay amount={grossTotal} /></span>
                  </div>
                  {applyWht && (
                    <div className="flex justify-between text-orange-600">
                      <span>Less: WHT ({whtRate}%):</span>
                      <span className="font-medium">-<CurrencyDisplay amount={whtAmount} /></span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Payable:</span>
                    <span className="font-bold text-lg"><CurrencyDisplay amount={netPayable} /></span>
                  </div>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "Recording..." : "Record Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
