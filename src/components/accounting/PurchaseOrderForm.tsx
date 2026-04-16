import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2 } from "lucide-react";
import { useVendors, useItems } from "@/hooks/useAccountingData";
import { useCreatePurchaseOrder } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useGenerateNumber } from "@/hooks/useNumbering";

const poSchema = z.object({
  po_number: z.string().min(1, "PO number is required"),
  vendor_id: z.string().min(1, "Vendor is required"),
  po_date: z.string().min(1, "PO date is required"),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
});

type POFormData = z.infer<typeof poSchema>;

interface POLine {
  id: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PurchaseOrderForm = ({ open, onOpenChange }: PurchaseOrderFormProps) => {
  const { data: vendors } = useVendors();
  const { data: items } = useItems();
  const createPO = useCreatePurchaseOrder();
  const generateNumber = useGenerateNumber();
  const numberGenerated = useRef(false);

  const [lines, setLines] = useState<POLine[]>([
    { id: "1", item_id: "", description: "", quantity: 1, unit_price: 0, line_total: 0 },
  ]);

  const form = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      po_number: "",
      po_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (open && !numberGenerated.current) {
      numberGenerated.current = true;
      generateNumber("po").then(num => form.setValue("po_number", num));
    }
    if (!open) numberGenerated.current = false;
  }, [open]);

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), item_id: "", description: "", quantity: 1, unit_price: 0, line_total: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof POLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      updated.line_total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const handleItemSelect = (lineId: string, itemId: string) => {
    const item = items?.find(i => i.id === itemId);
    if (item) {
      setLines(lines.map(line => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          item_id: itemId,
          description: item.item_name,
          unit_price: item.last_purchase_price || 0,
          line_total: line.quantity * (item.last_purchase_price || 0),
        };
      }));
    }
  };

  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);

  const onSubmit = async (data: POFormData) => {
    await createPO.mutateAsync({
      ...data,
      total_amount: subtotal,
      lines: lines.filter(l => l.item_id),
    });
    onOpenChange(false);
    form.reset();
    setLines([{ id: "1", item_id: "", description: "", quantity: 1, unit_price: 0, line_total: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="po_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_code} - {vendor.vendor_name}
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
                name="po_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Line Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Item</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2 w-24">Qty</th>
                      <th className="text-right p-2 w-40">Unit Price</th>
                      <th className="text-right p-2 w-32">Total</th>
                      <th className="p-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="p-2">
                          <Select
                            value={line.item_id}
                            onValueChange={(value) => handleItemSelect(line.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items?.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item_code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Textarea
                            value={line.description}
                            onChange={(e) => updateLine(line.id, "description", e.target.value)}
                            className="min-h-[36px] resize-none overflow-hidden py-2"
                            rows={1}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="text-right"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-2">
                          <CurrencyInput
                            value={line.unit_price}
                            onValueChange={(val) => updateLine(line.id, "unit_price", val)}
                            placeholder="0"
                            compact
                          />
                        </td>
                        <td className="p-2 text-right font-semibold">
                          <CurrencyDisplay amount={line.line_total} />
                        </td>
                        <td className="p-2">
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

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <CurrencyDisplay amount={subtotal} />
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
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPO.isPending}>
                {createPO.isPending ? "Creating..." : "Create PO"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
