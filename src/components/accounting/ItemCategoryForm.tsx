import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { useCreateItemCategory } from "@/hooks/useAccountingMutations";

const categorySchema = z.object({
  category_code: z.string().min(1, "Category code is required"),
  category_name: z.string().min(1, "Category name is required"),
  inventory_account_id: z.string().optional(),
  cogs_account_id: z.string().optional(),
  sales_account_id: z.string().optional(),
  valuation_method: z.string().default("weighted_average"),
  is_active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface ItemCategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ItemCategoryForm = ({ open, onOpenChange }: ItemCategoryFormProps) => {
  const { data: accounts } = useChartOfAccounts();
  const createCategory = useCreateItemCategory();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      category_code: "",
      category_name: "",
      valuation_method: "weighted_average",
      is_active: true,
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    await createCategory.mutateAsync({
      category_code: data.category_code,
      category_name: data.category_name,
      inventory_account_id: data.inventory_account_id,
      cogs_account_id: data.cogs_account_id,
      sales_account_id: data.sales_account_id,
      valuation_method: data.valuation_method,
      is_active: data.is_active,
    });
    onOpenChange(false);
    form.reset();
  };

  const assetAccounts = accounts?.filter((a) => a.account_type === "asset") || [];
  const expenseAccounts = accounts?.filter((a) => a.account_type === "expense") || [];
  const revenueAccounts = accounts?.filter((a) => a.account_type === "revenue") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Item Category</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Code</FormLabel>
                    <FormControl>
                      <Input placeholder="SPARE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Spare Parts" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="valuation_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valuation Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="weighted_average">Weighted Average</SelectItem>
                      <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                      <SelectItem value="lifo">LIFO (Last In, First Out)</SelectItem>
                      <SelectItem value="standard_cost">Standard Cost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inventory_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inventory Account (Asset)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inventory account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_code} - {acc.account_name}
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
              name="cogs_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>COGS Account (Expense)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select COGS account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_code} - {acc.account_name}
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
              name="sales_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales Account (Revenue)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {revenueAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_code} - {acc.account_name}
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
