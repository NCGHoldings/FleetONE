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
import { useBudgetDepartments } from "@/hooks/useBudgetDepartments";
import { useBudgetLineItems } from "@/hooks/useBudgetLineItems";
import { useAuth } from "@/hooks/useAuth";
import { BudgetTemplate } from "@/hooks/useBudgetTemplates";
import { ArrowLeft, ArrowRight, Check, AlertCircle, FileText, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateBudgetWizardProps {
  open: boolean;
  onClose: () => void;
  initialTemplate?: BudgetTemplate | null;
}

export const CreateBudgetWizard = ({ open, onClose, initialTemplate }: CreateBudgetWizardProps) => {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(initialTemplate || null);
  const { createBudget, isLoading } = useBudgets();
  const { addDepartment } = useBudgetDepartments();
  const { bulkImportLineItems } = useBudgetLineItems();
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
    template_id: string;
  }>({
    budget_name: "",
    fiscal_year: new Date().getFullYear(),
    budget_period: "annual",
    start_date: "",
    end_date: "",
    currency: "LKR",
    description: "",
    template_id: "",
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["budgetTemplates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_templates")
        .select("*")
        .eq("is_active", true)
        .order("template_name");
      
      if (error) throw error;
      return data;
    },
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
      const budget = await createBudget({
        ...formData,
        template_id: formData.template_id || null, // Convert empty string to null
      });
      
      // If template selected, create departments and line items
      if (selectedTemplate && budget) {
        const structure = selectedTemplate.template_structure;
        const departmentMap: Record<string, string> = {};
        
        // Step 1: Create all departments and build name->id map
        for (const dept of structure.departments || []) {
          const department = await addDepartment({
            budget_id: budget.id,
            department_name: dept.name,
            department_code: dept.code,
          });
          departmentMap[dept.name] = department.id;
        }
        
        // Step 2: Get line items from template
        const lineItems = structure.line_items || [];
        
        // Step 3: Create line items with correct department_id
        if (lineItems.length > 0) {
          const formattedLineItems = lineItems.map((item: any, index: number) => ({
            department_id: departmentMap[item.department] || null,
            line_item_name: item.name,
            category: item.category || item.type,
            subcategory: item.subcategory,
            display_order: item.display_order || index,
            is_active: true,
            budget_amount: item.default_amount || 0,
            actual_amount: 0,
            // variance_amount and variance_percentage are generated columns - database calculates them
            period_type: "monthly",
            account_id: item.account_code || null,
          }));
          
          await bulkImportLineItems(budget.id, formattedLineItems);
        }
      }
      
      toast.success("Budget created successfully!");
      onClose();
    } catch (error) {
      console.error("Error creating budget:", error);
      toast.error("Failed to create budget");
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
            <div className="space-y-4">
              <div className="text-center py-4">
                <FileText className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Choose Budget Template</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Select from industry-specific templates or start from scratch
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                <Button
                  variant={!selectedTemplate ? "default" : "outline"}
                  className="h-auto py-6 flex-col items-center"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setFormData({ ...formData, template_id: "" });
                  }}
                >
                  <FileText className="w-10 h-10 mb-2" />
                  <p className="font-medium">Start from Scratch</p>
                  <p className="text-xs opacity-70 mt-1">Build custom budget</p>
                </Button>
                
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                    className="h-auto py-6 flex-col items-center"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setFormData({ ...formData, template_id: template.id });
                    }}
                  >
                    <Building2 className="w-10 h-10 mb-2" />
                    <p className="font-medium text-sm">{template.template_name}</p>
                    <p className="text-xs opacity-70 mt-1 line-clamp-2">{template.description}</p>
                  </Button>
                ))}
              </div>
              
              {selectedTemplate && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-2">Template Preview</h4>
                  <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Includes {selectedTemplate.template_structure?.departments?.length || 0} departments:</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTemplate.template_structure?.departments || []).slice(0, 5).map((dept: any, idx: number) => (
                        <span key={idx} className="text-xs bg-background px-2 py-1 rounded-md border">
                          {dept.name}
                        </span>
                      ))}
                      {(selectedTemplate.template_structure?.departments?.length || 0) > 5 && (
                        <span className="text-xs text-muted-foreground">+{selectedTemplate.template_structure.departments.length - 5} more</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
