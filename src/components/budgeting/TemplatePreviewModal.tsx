import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BudgetTemplate } from "@/hooks/useBudgetTemplates";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplatePreviewModalProps {
  template: BudgetTemplate | null;
  open: boolean;
  onClose: () => void;
  onUseTemplate: (template: BudgetTemplate) => void;
}

export const TemplatePreviewModal = ({ 
  template, 
  open, 
  onClose,
  onUseTemplate 
}: TemplatePreviewModalProps) => {
  if (!template) return null;

  const structure = template.template_structure as any;
  const departments = structure?.departments || [];
  const categories = structure?.categories || {};

  const revenueCategories = categories.revenue || [];
  const expenseCategories = Object.entries(categories)
    .filter(([key]) => key !== 'revenue')
    .flatMap(([_, items]) => items as string[]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            {template.template_name}
          </DialogTitle>
          <div className="flex gap-2 items-center mt-2">
            <Badge variant="secondary" className="capitalize">
              {template.industry_type}
            </Badge>
            {template.is_system_template && (
              <Badge variant="outline" className="text-blue-600">
                System Template
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {template.description}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Departments</div>
                <div className="text-2xl font-semibold">{departments.length}</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Revenue Items</div>
                <div className="text-2xl font-semibold text-green-600">{revenueCategories.length}</div>
              </div>
              <div className="bg-orange-500/10 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Expense Items</div>
                <div className="text-2xl font-semibold text-orange-600">{expenseCategories.length}</div>
              </div>
            </div>

            {/* Departments */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Departments Structure
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {departments.map((dept: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 hover:border-primary transition-colors">
                    <div className="font-medium">{dept.name}</div>
                    <div className="text-xs text-muted-foreground">Code: {dept.code}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Categories */}
            {revenueCategories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Categories
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {revenueCategories.map((item: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm p-2 bg-green-500/5 rounded border border-green-500/20">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expense Categories */}
            {Object.entries(categories)
              .filter(([key]) => key !== 'revenue')
              .map(([categoryName, items]) => (
                <div key={categoryName}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-orange-600 capitalize">
                    <TrendingDown className="h-5 w-5" />
                    {categoryName.replace(/_/g, ' ')}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(items as string[]).map((item: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 bg-orange-500/5 rounded border border-orange-500/20">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Total of {departments.length} departments, {revenueCategories.length + expenseCategories.length} line items
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onUseTemplate(template)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
