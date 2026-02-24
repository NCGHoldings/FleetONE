import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBudget } from "@/hooks/useAccountingMutations";
import { useCostCenters } from "@/hooks/useAccountingData";
import { Loader2 } from "lucide-react";

const budgetSchema = z.object({
  budget_code: z.string().min(1, "Code is required"),
  budget_name: z.string().min(1, "Name is required"),
  fiscal_year: z.string().min(1, "Fiscal year is required"),
  budget_period: z.string().optional(),
  cost_center_id: z.string().optional(),
  total_budget_amount: z.number().min(0, "Amount must be positive"),
  description: z.string().optional(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BudgetForm = ({ open, onOpenChange }: BudgetFormProps) => {
  const { data: costCenters } = useCostCenters();
  const createBudget = useCreateBudget();

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      budget_code: `BUD-${currentYear}-${Date.now().toString().slice(-4)}`,
      budget_name: "",
      fiscal_year: currentYear.toString(),
      budget_period: "annual",
      total_budget_amount: 0,
      description: "",
    },
  });

  const onSubmit = async (data: BudgetFormData) => {
    try {
      await createBudget.mutateAsync({
        budget_code: data.budget_code,
        budget_name: data.budget_name,
        fiscal_year: data.fiscal_year,
        budget_period: data.budget_period || "annual",
        total_budget_amount: data.total_budget_amount,
        status: "draft",
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_code">Budget Code *</Label>
              <Input 
                id="budget_code" 
                {...form.register("budget_code")} 
              />
              {form.formState.errors.budget_code && (
                <p className="text-xs text-destructive">{form.formState.errors.budget_code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal_year">Fiscal Year *</Label>
              <Select 
                value={form.watch("fiscal_year")} 
                onValueChange={(v) => form.setValue("fiscal_year", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_name">Budget Name *</Label>
            <Input 
              id="budget_name" 
              {...form.register("budget_name")} 
              placeholder="Operating Budget 2024"
            />
            {form.formState.errors.budget_name && (
              <p className="text-xs text-destructive">{form.formState.errors.budget_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_period">Period</Label>
              <Select 
                value={form.watch("budget_period")} 
                onValueChange={(v) => form.setValue("budget_period", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_budget_amount">Budget Amount *</Label>
              <Input 
                id="total_budget_amount" 
                type="number"
                step="0.01"
                {...form.register("total_budget_amount", { valueAsNumber: true })} 
              />
              {form.formState.errors.total_budget_amount && (
                <p className="text-xs text-destructive">{form.formState.errors.total_budget_amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_center_id">Cost Center</Label>
            <Select 
              value={form.watch("cost_center_id") || "_all"} 
              onValueChange={(v) => form.setValue("cost_center_id", v === "_all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Cost Centers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Cost Centers</SelectItem>
                {costCenters?.filter(cc => cc.is_active).map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.center_code} - {cc.center_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              {...form.register("description")} 
              placeholder="Budget objectives and notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBudget.isPending}>
              {createBudget.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Budget
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
