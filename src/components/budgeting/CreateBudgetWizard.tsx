import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBudgets } from "@/hooks/useBudgets";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ArrowRight, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CreateBudgetWizardProps {
  open: boolean;
  onClose: () => void;
}

export const CreateBudgetWizard = ({ open, onClose }: CreateBudgetWizardProps) => {
  const [step, setStep] = useState(1);
  const { createBudget, isLoading } = useBudgets();
  const { hasRole, isAuthenticated } = useAuth();
  
  const hasPermission = hasRole('super_admin') || hasRole('admin') || hasRole('finance');
  const [formData, setFormData] = useState<{
    budget_name: string;
    fiscal_year: number;
    budget_period: "annual" | "quarterly" | "monthly";
    start_date: string;
    end_date: string;
    currency: string;
    description: string;
  }>({
    budget_name: "",
    fiscal_year: new Date().getFullYear(),
    budget_period: "annual",
    start_date: "",
    end_date: "",
    currency: "LKR",
    description: "",
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.budget_name || !formData.start_date || !formData.end_date) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      await createBudget(formData);
      toast.success("Budget created successfully!");
      onClose();
    } catch (error) {
      console.error("Error creating budget:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Budget - Step {step} of 3</DialogTitle>
        </DialogHeader>

        {!isAuthenticated && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to create budgets. Please log in to continue.
            </AlertDescription>
          </Alert>
        )}

        {isAuthenticated && !hasPermission && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to create budgets. This action requires Finance, Admin, or Super Admin role. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="budget_name">Budget Name *</Label>
                <Input
                  id="budget_name"
                  value={formData.budget_name}
                  onChange={(e) =>
                    setFormData({ ...formData, budget_name: e.target.value })
                  }
                  placeholder="e.g., 2025 Annual Budget"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fiscal_year">Fiscal Year *</Label>
                  <Select
                    value={formData.fiscal_year.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, fiscal_year: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budget_period">Budget Period *</Label>
                  <Select
                    value={formData.budget_period}
                    onValueChange={(value: "annual" | "quarterly" | "monthly") =>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this budget"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-4">Select Template</h3>
              <p className="text-muted-foreground mb-6">
                Choose an industry template or start from scratch
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-6 hover:border-primary cursor-pointer">
                  <h4 className="font-semibold mb-2">Transport & Bus Company</h4>
                  <p className="text-sm text-muted-foreground">
                    Pre-configured for transport operations
                  </p>
                </div>
                <div className="border rounded-lg p-6 hover:border-primary cursor-pointer">
                  <h4 className="font-semibold mb-2">Start from Scratch</h4>
                  <p className="text-sm text-muted-foreground">
                    Create custom budget structure
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-4">Review & Create</h3>
              <div className="text-left space-y-2 bg-accent/50 p-6 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget Name:</span>
                  <span className="font-semibold">{formData.budget_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fiscal Year:</span>
                  <span className="font-semibold">{formData.fiscal_year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-semibold capitalize">{formData.budget_period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">
                    {formData.start_date} to {formData.end_date}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isLoading}
          >
            {step === 1 ? "Cancel" : <><ArrowLeft className="h-4 w-4 mr-2" />Back</>}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !isAuthenticated || !hasPermission}
            >
              <Check className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
