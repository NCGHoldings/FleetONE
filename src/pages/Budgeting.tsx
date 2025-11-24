import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetDashboard } from "@/components/budgeting/BudgetDashboard";
import { BudgetListView } from "@/components/budgeting/BudgetListView";
import { CreateBudgetWizard } from "@/components/budgeting/CreateBudgetWizard";
import { TemplateLibrary } from "@/components/budgeting/TemplateLibrary";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Budgeting = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCreateWizard, setShowCreateWizard] = useState(false);

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
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </div>

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
          <TemplateLibrary />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="text-center p-12 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground">Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {showCreateWizard && (
        <CreateBudgetWizard
          open={showCreateWizard}
          onClose={() => setShowCreateWizard(false)}
        />
      )}
    </div>
  );
};

export default Budgeting;
