import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePurchaseOrders, useVendors } from "@/hooks/useAccountingData";
import { useCreateGoodsReceipt } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";

const grnSchema = z.object({
  grn_number: z.string().min(1, "GRN number is required"),
  purchase_order_id: z.string().optional(),
  vendor_id: z.string().min(1, "Vendor is required"),
  receipt_date: z.string().min(1, "Receipt date is required"),
  delivery_note: z.string().optional(),
  notes: z.string().optional(),
});

type GRNFormData = z.infer<typeof grnSchema>;

interface GRNLine {
  id: string;
  item_name: string;
  ordered_qty: number;
  received_qty: number;
  unit_price: number;
  line_total: number;
}

interface GoodsReceiptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId?: string | null;
}

export const GoodsReceiptForm = ({ open, onOpenChange, purchaseOrderId }: GoodsReceiptFormProps) => {
  const { data: purchaseOrders } = usePurchaseOrders();
  const { data: vendors } = useVendors();
  const createGRN = useCreateGoodsReceipt();

  const [lines, setLines] = useState<GRNLine[]>([]);

  const form = useForm<GRNFormData>({
    resolver: zodResolver(grnSchema),
    defaultValues: {
      grn_number: `GRN-${Date.now().toString().slice(-6)}`,
      receipt_date: new Date().toISOString().split("T")[0],
      purchase_order_id: purchaseOrderId || undefined,
    },
  });

  // When PO is selected, load its lines
  const selectedPOId = form.watch("purchase_order_id");
  useEffect(() => {
    if (selectedPOId) {
      const po = purchaseOrders?.find(p => p.id === selectedPOId);
      if (po) {
        form.setValue("vendor_id", po.vendor_id || "");
        // In a real app, we'd fetch PO lines here
        setLines([
          { id: "1", item_name: "Sample Item", ordered_qty: 10, received_qty: 10, unit_price: 1000, line_total: 10000 },
        ]);
      }
    }
  }, [selectedPOId, purchaseOrders, form]);

  useEffect(() => {
    if (purchaseOrderId) {
      form.setValue("purchase_order_id", purchaseOrderId);
    }
  }, [purchaseOrderId, form]);

  const updateReceivedQty = (id: string, qty: number) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      return {
        ...line,
        received_qty: qty,
        line_total: qty * line.unit_price,
      };
    }));
  };

  const totalValue = lines.reduce((sum, line) => sum + line.line_total, 0);

  const onSubmit = async (data: GRNFormData) => {
    await createGRN.mutateAsync({
      ...data,
      total_value: totalValue,
      lines: lines.map(l => ({
        item_name: l.item_name,
        quantity: l.received_qty,
        unit_price: l.unit_price,
        line_total: l.line_total,
      })),
    });
    onOpenChange(false);
    form.reset();
    setLines([]);
  };

  const openPOs = purchaseOrders?.filter(po => 
    po.status === "approved" || po.status === "partially_received"
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Goods Receipt</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="grn_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GRN Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Note #</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor's delivery note" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Order</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PO (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {openPOs.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.po_number} - {po.vendors?.vendor_name}
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
            </div>

            {/* Items to Receive */}
            {lines.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Items to Receive</h4>
                <div className="border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-right p-2">Ordered</th>
                        <th className="text-right p-2">Received</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={line.id} className="border-t">
                          <td className="p-2 font-medium">{line.item_name}</td>
                          <td className="p-2 text-right">{line.ordered_qty}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="w-24 text-right ml-auto"
                              value={line.received_qty}
                              max={line.ordered_qty}
                              onChange={(e) => updateReceivedQty(line.id, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <CurrencyDisplay amount={line.unit_price} />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            <CurrencyDisplay amount={line.line_total} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Value:</span>
                      <CurrencyDisplay amount={totalValue} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lines.length === 0 && !selectedPOId && (
              <div className="text-center py-8 text-muted-foreground">
                Select a Purchase Order to load items, or manually add items for non-PO receipts.
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any observations or notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGRN.isPending}>
                {createGRN.isPending ? "Processing..." : "Record GRN"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
