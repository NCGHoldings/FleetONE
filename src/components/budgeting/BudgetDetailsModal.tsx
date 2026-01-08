import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Edit, Copy, Download, FileText } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { useBudgetDepartments } from "@/hooks/useBudgetDepartments";
import { useBudgetLineItems } from "@/hooks/useBudgetLineItems";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BudgetPnLView } from "./BudgetPnLView";

interface BudgetDetailsModalProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

export const BudgetDetailsModal = ({
  budgetId,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
}: BudgetDetailsModalProps) => {
  const { getBudgetById } = useBudgets();
  const { fetchDepartments } = useBudgetDepartments();
  const { fetchLineItems } = useBudgetLineItems();

  const { data: budget, isLoading: loadingBudget } = useQuery({
    queryKey: ["budget", budgetId],
    queryFn: () => getBudgetById(budgetId),
    enabled: open && !!budgetId,
  });

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ["budget-departments", budgetId],
    queryFn: () => fetchDepartments(budgetId),
    enabled: open && !!budgetId,
  });

  const { data: lineItems, isLoading: loadingItems } = useQuery({
    queryKey: ["budget-line-items", budgetId],
    queryFn: () => fetchLineItems(budgetId),
    enabled: open && !!budgetId,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      pending_approval: "bg-yellow-500/20 text-yellow-700",
      approved: "bg-green-500/20 text-green-700",
      active: "bg-primary/20 text-primary",
      rejected: "bg-destructive/20 text-destructive",
      closed: "bg-muted text-muted-foreground",
    };
    return <Badge className={variants[status] || ""}>{status.replace("_", " ")}</Badge>;
  };

  if (loadingBudget) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!budget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{budget.budget_name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {budget.budget_code} • FY {budget.fiscal_year}
              </p>
            </div>
            {getStatusBadge(budget.status || "draft")}
          </div>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={onEdit} size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={onDuplicate} size="sm" variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>

        <Tabs defaultValue="pnl" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pnl">Budget vs Actual</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="line-items">Line Items</TabsTrigger>
          </TabsList>

          {/* P&L View Tab */}
          <TabsContent value="pnl" className="space-y-4 mt-6">
            <BudgetPnLView budgetId={budgetId} />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Budget Period</label>
                <p className="text-sm capitalize">{budget.budget_period}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <p className="text-sm">
                  {format(new Date(budget.start_date), "MMM dd, yyyy")} -{" "}
                  {format(new Date(budget.end_date), "MMM dd, yyyy")}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Budget Amount</label>
                <p className="text-2xl font-bold">
                  LKR {Number(budget.total_budget_amount || 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <p className="text-sm">{budget.currency || "LKR"}</p>
              </div>
            </div>

            {(budget as any).description && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{(budget as any).description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Created At</label>
                <p className="text-sm">
                  {budget.created_at
                    ? format(new Date(budget.created_at), "MMM dd, yyyy HH:mm")
                    : "N/A"}
                </p>
              </div>
              {budget.approved_at && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Approved At</label>
                  <p className="text-sm">
                    {format(new Date(budget.approved_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              )}
            </div>

            {budget.approval_notes && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Approval Notes</label>
                <p className="text-sm text-muted-foreground">{budget.approval_notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            {loadingDepts ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : departments && departments.length > 0 ? (
              <div className="space-y-2">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{dept.department_name}</p>
                      {dept.department_code && (
                        <p className="text-sm text-muted-foreground">{dept.department_code}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        LKR {Number(dept.allocated_amount || 0).toLocaleString()}
                      </p>
                      {dept.spent_amount !== null && (
                        <p className="text-sm text-muted-foreground">
                          Spent: LKR {Number(dept.spent_amount).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No departments added yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="line-items" className="space-y-4">
            {loadingItems ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : lineItems && lineItems.length > 0 ? (
              <div className="space-y-4">
                {departments?.map((dept) => {
                  const deptItems = lineItems.filter((item) => item.department_id === dept.id);
                  if (deptItems.length === 0) return null;

                  return (
                    <div key={dept.id} className="space-y-2">
                      <h4 className="font-semibold text-sm">{dept.department_name}</h4>
                      <div className="space-y-1">
                        {deptItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 border rounded text-sm"
                          >
                            <div>
                              <p className="font-medium">{item.line_item_name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                LKR {Number(item.budget_amount || 0).toLocaleString()}
                              </p>
                              {item.actual_amount !== null && (
                                <p className="text-xs text-muted-foreground">
                                  Actual: LKR {Number(item.actual_amount).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No line items added yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
