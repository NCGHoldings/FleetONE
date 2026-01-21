import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useCostCenters, useBudgets } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export const CostingBudgetView = () => {
  const { data: costCenters } = useCostCenters();
  const { data: budgets } = useBudgets();

  const costCenterColumns = [
    {
      accessorKey: "cost_center_code",
      header: "Code",
      cell: ({ row }: any) => <span className="font-mono font-medium">{row.original.cost_center_code}</span>,
    },
    {
      accessorKey: "cost_center_name",
      header: "Cost Center Name",
    },
    {
      accessorKey: "cost_center_type",
      header: "Type",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.cost_center_type || "Cost Center"}</Badge>
      ),
    },
    {
      accessorKey: "manager_id",
      header: "Manager",
      cell: ({ row }: any) => <span className="text-muted-foreground">{row.original.manager_id ? "Assigned" : "-"}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const budgetColumns = [
    {
      accessorKey: "budget_code",
      header: "Code",
      cell: ({ row }: any) => <span className="font-mono font-medium">{row.original.budget_code}</span>,
    },
    {
      accessorKey: "budget_name",
      header: "Budget Name",
    },
    {
      accessorKey: "fiscal_year",
      header: "Fiscal Year",
    },
    {
      accessorKey: "budget_period",
      header: "Period",
      cell: ({ row }: any) => <Badge variant="outline">{row.original.budget_period}</Badge>,
    },
    {
      accessorKey: "total_budget_amount",
      header: "Budget Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.total_budget_amount || 0} />
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status || "draft";
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          draft: "outline",
          pending_approval: "secondary",
          approved: "default",
          active: "default",
          closed: "destructive",
        };
        return <Badge variant={variants[status] || "default"}>{status.replace("_", " ").toUpperCase()}</Badge>;
      },
    },
  ];

  // Mock variance data - in production, this would come from actual vs budget comparison
  const varianceData = budgets?.map(budget => ({
    id: budget.id,
    name: budget.budget_name,
    budgeted: budget.total_budget_amount || 0,
    actual: (budget.total_budget_amount || 0) * 0.75, // Mock 75% spent
    variance: (budget.total_budget_amount || 0) * 0.25,
    percentUsed: 75,
  })) || [];

  const totalBudget = budgets?.reduce((sum, b) => sum + (b.total_budget_amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Cost Centers</p>
          <h3 className="text-2xl font-bold mt-1">{costCenters?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Budgets</p>
          <h3 className="text-2xl font-bold mt-1">
            {budgets?.filter((b) => b.status === "active" || b.status === "approved").length || 0}
          </h3>
        </Card>
        <Card className="p-4 col-span-2">
          <p className="text-sm text-muted-foreground">Total Budget Allocation</p>
          <h3 className="text-2xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalBudget} />
          </h3>
        </Card>
      </div>

      <Tabs defaultValue="costcenters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="costcenters">Cost Centers</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="variance">Budget vs Actual</TabsTrigger>
        </TabsList>

        <TabsContent value="costcenters">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Cost Centers</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage cost centers and profit centers for tracking
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Cost Center
              </Button>
            </div>

            <DataTable columns={costCenterColumns} data={costCenters || []} searchKey="cost_center_name" />
          </Card>
        </TabsContent>

        <TabsContent value="budgets">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Budget Management</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage annual and periodic budgets
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Budget
              </Button>
            </div>

            <DataTable columns={budgetColumns} data={budgets || []} searchKey="budget_name" />
          </Card>
        </TabsContent>

        <TabsContent value="variance">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Budget vs Actual Analysis</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Compare actual spending against budgeted amounts
                </p>
              </div>
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            <div className="space-y-4">
              {varianceData.length > 0 ? (
                varianceData.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{item.name}</h4>
                      <span className="text-sm text-muted-foreground">{item.percentUsed}% used</span>
                    </div>
                    <Progress value={item.percentUsed} className="h-2 mb-3" />
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Budgeted</p>
                        <p className="font-semibold"><CurrencyDisplay amount={item.budgeted} /></p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actual</p>
                        <p className="font-semibold"><CurrencyDisplay amount={item.actual} /></p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variance</p>
                        <p className={`font-semibold ${item.variance >= 0 ? "text-green-600" : "text-destructive"}`}>
                          <CurrencyDisplay amount={item.variance} />
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No budget data available</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
