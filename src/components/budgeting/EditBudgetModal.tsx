import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBudgets } from "@/hooks/useBudgets";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditBudgetModalProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditBudgetModal = ({
  budgetId,
  open,
  onOpenChange,
  onSuccess,
}: EditBudgetModalProps) => {
  const { getBudgetById, updateBudget, isLoading: updating } = useBudgets();
  const [formData, setFormData] = useState({
    budget_name: "",
    fiscal_year: new Date().getFullYear(),
    budget_period: "annual",
    start_date: "",
    end_date: "",
    description: "",
    total_budget_amount: 0,
    currency: "LKR",
    status: "draft",
  });

  const { data: budget, isLoading } = useQuery({
    queryKey: ["budget", budgetId],
    queryFn: () => getBudgetById(budgetId),
    enabled: open && !!budgetId,
  });

  useEffect(() => {
    if (budget) {
      setFormData({
        budget_name: budget.budget_name,
        fiscal_year: budget.fiscal_year,
        budget_period: budget.budget_period,
        start_date: budget.start_date,
        end_date: budget.end_date,
        description: (budget as any).description || "",
        total_budget_amount: Number(budget.total_budget_amount || 0),
        currency: budget.currency || "LKR",
        status: budget.status || "draft",
      });
    }
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.budget_name || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateBudget(budgetId, formData as any);
      toast.success("Budget updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_name">
                Budget Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="budget_name"
                value={formData.budget_name}
                onChange={(e) =>
                  setFormData({ ...formData, budget_name: e.target.value })
                }
                placeholder="e.g., Annual Operating Budget 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscal_year">
                Fiscal Year <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fiscal_year"
                type="number"
                value={formData.fiscal_year}
                onChange={(e) =>
                  setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })
                }
                min={2000}
                max={2100}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_period">
              Budget Period <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.budget_period}
              onValueChange={(value) =>
                setFormData({ ...formData, budget_period: value })
              }
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_budget_amount">Total Budget Amount</Label>
            <Input
              id="total_budget_amount"
              type="number"
              value={formData.total_budget_amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  total_budget_amount: parseFloat(e.target.value),
                })
              }
              min={0}
              step={0.01}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter budget description..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
