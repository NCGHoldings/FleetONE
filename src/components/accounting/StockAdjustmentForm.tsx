import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useItems } from "@/hooks/useAccountingData";
import { useCreateStockAdjustment } from "@/hooks/useAccountingMutations";

const adjustmentSchema = z.object({
  item_id: z.string().min(1, "Item is required"),
  adjustment_type: z.enum(["increase", "decrease", "count"]),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
  adjustment_date: z.string().min(1, "Date is required"),
  location: z.string().optional(),
  reference: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StockAdjustmentForm = ({ open, onOpenChange }: StockAdjustmentFormProps) => {
  const { data: items } = useItems();
  const createAdjustment = useCreateStockAdjustment();

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustment_type: "increase",
      quantity: 0,
      reason: "",
      adjustment_date: new Date().toISOString().split("T")[0],
      location: "Main Warehouse",
    },
  });

  const onSubmit = async (data: AdjustmentFormData) => {
    await createAdjustment.mutateAsync(data);
    onOpenChange(false);
    form.reset();
  };

  const selectedItemId = form.watch("item_id");
  const selectedItem = items?.find(item => item.id === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item_code} - {item.item_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedItem && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>Item: <span className="font-semibold">{selectedItem.item_name}</span></p>
                <p>Last Purchase Price: <span className="font-semibold">LKR {selectedItem.last_purchase_price?.toLocaleString()}</span></p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="adjustment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="increase">Increase (+)</SelectItem>
                        <SelectItem value="decrease">Decrease (-)</SelectItem>
                        <SelectItem value="count">Physical Count</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="adjustment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Main Warehouse">Main Warehouse</SelectItem>
                        <SelectItem value="Branch A">Branch A</SelectItem>
                        <SelectItem value="Branch B">Branch B</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Physical Count">Physical Count</SelectItem>
                      <SelectItem value="Damaged">Damaged/Expired</SelectItem>
                      <SelectItem value="Theft/Loss">Theft/Loss</SelectItem>
                      <SelectItem value="Return to Vendor">Return to Vendor</SelectItem>
                      <SelectItem value="Production">Production Usage</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference/Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAdjustment.isPending}>
                {createAdjustment.isPending ? "Processing..." : "Submit Adjustment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
