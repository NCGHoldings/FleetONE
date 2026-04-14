import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateAssetCategory } from "@/hooks/useAccountingMutations";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { Loader2 } from "lucide-react";

const categorySchema = z.object({
  category_code: z.string().min(1, "Code is required"),
  category_name: z.string().min(1, "Name is required"),
  depreciation_method: z.string().optional(),
  depreciation_rate: z.number().optional(),
  useful_life_years: z.number().optional(),
  asset_account_id: z.string().optional(),
  accumulated_dep_account_id: z.string().optional(),
  depreciation_expense_account_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  gain_loss_disposal_account_id: z.string().optional(),
  revaluation_surplus_account_id: z.string().optional(),
  is_active: z.boolean().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AssetCategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssetCategoryForm = ({ open, onOpenChange }: AssetCategoryFormProps) => {
  const { data: accounts } = useChartOfAccounts();
  const createCategory = useCreateAssetCategory();

  const assetAccounts = accounts?.filter(a => a.account_type === "asset");
  const expenseAccounts = accounts?.filter(a => a.account_type === "expense");
  const equityAccounts = accounts?.filter(a => a.account_type === "equity");
  const revenueExpenseAccounts = accounts?.filter(a => a.account_type === "revenue" || a.account_type === "expense");

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      category_code: "",
      category_name: "",
      depreciation_method: "straight_line",
      depreciation_rate: 20,
      useful_life_years: 5,
      is_active: true,
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      await createCategory.mutateAsync({
        category_code: data.category_code,
        category_name: data.category_name,
        depreciation_method: data.depreciation_method || "straight_line",
        depreciation_rate: data.depreciation_rate || 20,
        useful_life_years: data.useful_life_years || 5,
        asset_account_id: data.asset_account_id,
        accumulated_dep_account_id: data.accumulated_dep_account_id,
        depreciation_expense_account_id: data.depreciation_expense_account_id,
        bank_account_id: data.bank_account_id,
        gain_loss_disposal_account_id: data.gain_loss_disposal_account_id,
        revaluation_surplus_account_id: data.revaluation_surplus_account_id,
        is_active: data.is_active ?? true,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Asset Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_code">Category Code <span className="text-destructive">*</span></Label>
              <Input 
                id="category_code" 
                {...form.register("category_code")} 
                placeholder="VEH, OFF, IT"
              />
              {form.formState.errors.category_code && (
                <p className="text-xs text-destructive">{form.formState.errors.category_code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="depreciation_method">Depreciation Method</Label>
              <Select 
                value={form.watch("depreciation_method")} 
                onValueChange={(v) => form.setValue("depreciation_method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight Line</SelectItem>
                  <SelectItem value="reducing_balance">Reducing Balance</SelectItem>
                  <SelectItem value="units_of_production">Units of Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_name">Category Name <span className="text-destructive">*</span></Label>
            <Input 
              id="category_name" 
              {...form.register("category_name")} 
              placeholder="Motor Vehicles, Office Equipment"
            />
            {form.formState.errors.category_name && (
              <p className="text-xs text-destructive">{form.formState.errors.category_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depreciation_rate">Depreciation Rate (%)</Label>
              <Input 
                id="depreciation_rate" 
                type="number"
                step="0.01"
                {...form.register("depreciation_rate", { valueAsNumber: true })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="useful_life_years">Useful Life (Years)</Label>
              <Input 
                id="useful_life_years" 
                type="number"
                {...form.register("useful_life_years", { valueAsNumber: true })} 
              />
            </div>
          </div>

          {/* GL Account Mappings */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">GL Account Mappings</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Account <span className="text-destructive">*</span></Label>
              <Select 
                value={form.watch("asset_account_id")} 
                onValueChange={(v) => form.setValue("asset_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset account" />
                </SelectTrigger>
                <SelectContent>
                  {assetAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Accumulated Depreciation Account <span className="text-destructive">*</span></Label>
              <Select 
                value={form.watch("accumulated_dep_account_id")} 
                onValueChange={(v) => form.setValue("accumulated_dep_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contra-asset account" />
                </SelectTrigger>
                <SelectContent>
                  {assetAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Depreciation Expense Account <span className="text-destructive">*</span></Label>
              <Select 
                value={form.watch("depreciation_expense_account_id")} 
                onValueChange={(v) => form.setValue("depreciation_expense_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expense account" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bank/Cash Account (Acquisition) <span className="text-destructive">*</span></Label>
              <Select 
                value={form.watch("bank_account_id")} 
                onValueChange={(v) => form.setValue("bank_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank/cash account" />
                </SelectTrigger>
                <SelectContent>
                  {assetAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gain/Loss on Disposal Account <span className="text-destructive">*</span></Label>
              <Select 
                value={form.watch("gain_loss_disposal_account_id")} 
                onValueChange={(v) => form.setValue("gain_loss_disposal_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gain/loss account" />
                </SelectTrigger>
                <SelectContent>
                  {revenueExpenseAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Revaluation Surplus Account <span className="text-destructive">*</span></Label>
              <Select 
                value={form.watch("revaluation_surplus_account_id")} 
                onValueChange={(v) => form.setValue("revaluation_surplus_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equity account" />
                </SelectTrigger>
                <SelectContent>
                  {equityAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch 
              id="is_active" 
              checked={form.watch("is_active")}
              onCheckedChange={(v) => form.setValue("is_active", v)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Category
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};