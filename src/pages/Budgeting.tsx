import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BudgetDashboard } from "@/components/budgeting/BudgetDashboard";
import { BudgetListView } from "@/components/budgeting/BudgetListView";
import { CreateBudgetWizard } from "@/components/budgeting/CreateBudgetWizard";
import { TemplateLibrary } from "@/components/budgeting/TemplateLibrary";
import { BudgetAnalytics } from "@/components/budgeting/BudgetAnalytics";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Plus, AlertCircle, Lock } from "lucide-react";
import { BudgetTemplate } from "@/hooks/useBudgetTemplates";

const Budgeting = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [preSelectedTemplate, setPreSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const { hasRole, isAuthenticated } = useAuth();
  
  const hasPermission = hasRole('super_admin') || hasRole('admin') || hasRole('finance');

  const handleUseTemplate = (template: BudgetTemplate) => {
    setPreSelectedTemplate(template);
    setActiveTab("budgets");
    setShowCreateWizard(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Budget Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive budgeting & financial planning
          </p>
        </div>
        <Button
          onClick={() => setShowCreateWizard(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600"
          disabled={!isAuthenticated || !hasPermission}
        >
          {!hasPermission && <Lock className="h-4 w-4 mr-2" />}
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </div>

      {!isAuthenticated && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access budgeting features. Please log in to continue.
          </AlertDescription>
        </Alert>
      )}

      {isAuthenticated && !hasPermission && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            You have view-only access to budgets. To create or edit budgets, you need Finance, Admin, or Super Admin role. Please contact your administrator for access.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="budgets">All Budgets</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <BudgetDashboard />
        </TabsContent>

        <TabsContent value="budgets" className="mt-6">
          <BudgetListView />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateLibrary onUseTemplate={handleUseTemplate} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <BudgetAnalytics />
        </TabsContent>
      </Tabs>

      {showCreateWizard && (
        <CreateBudgetWizard
          open={showCreateWizard}
          onClose={() => {
            setShowCreateWizard(false);
            setPreSelectedTemplate(null);
          }}
          initialTemplate={preSelectedTemplate}
        />
      )}
    </div>
  );
};

export default Budgeting;
