import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useItemCategories } from "@/hooks/useAccountingData";
import { useCreateItem } from "@/hooks/useAccountingMutations";

const itemSchema = z.object({
  item_code: z.string().min(1, "Item code is required"),
  item_name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  unit_of_measure: z.string().min(1, "Unit of measure is required"),
  unit_cost: z.coerce.number().min(0, "Unit cost must be positive"),
  selling_price: z.coerce.number().min(0, "Selling price must be positive"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be positive"),
  reorder_quantity: z.coerce.number().min(0, "Reorder quantity must be positive"),
  is_active: z.boolean().default(true),
  is_stockable: z.boolean().default(true),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ItemForm = ({ open, onOpenChange }: ItemFormProps) => {
  const { data: categories } = useItemCategories();
  const createItem = useCreateItem();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      item_code: "",
      item_name: "",
      description: "",
      unit_of_measure: "EA",
      unit_cost: 0,
      selling_price: 0,
      reorder_level: 10,
      reorder_quantity: 50,
      is_active: true,
      is_stockable: true,
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    await createItem.mutateAsync(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="item_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Code</FormLabel>
                    <FormControl>
                      <Input placeholder="ITM-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.category_name}
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
              name="item_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter item name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Item description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unit_of_measure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EA">Each (EA)</SelectItem>
                        <SelectItem value="KG">Kilogram (KG)</SelectItem>
                        <SelectItem value="L">Liter (L)</SelectItem>
                        <SelectItem value="M">Meter (M)</SelectItem>
                        <SelectItem value="BOX">Box</SelectItem>
                        <SelectItem value="SET">Set</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (LKR)</FormLabel>
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
                name="reorder_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorder_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_stockable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Track Stock</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createItem.isPending}>
                {createItem.isPending ? "Creating..." : "Create Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
