import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, LayoutDashboard, Building2, ArrowDownCircle, ArrowUpCircle, BarChart3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PettyCashDashboardTab } from "./petty-cash/PettyCashDashboardTab";
import { PettyCashFundsTab } from "./petty-cash/PettyCashFundsTab";
import { PettyCashDisbursementsTab } from "./petty-cash/PettyCashDisbursementsTab";
import { PettyCashReplenishmentsTab } from "./petty-cash/PettyCashReplenishmentsTab";
import { PettyCashReportsTab } from "./petty-cash/PettyCashReportsTab";

export const PettyCashView = () => {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
    queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["petty-cash-all-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["petty-cash-dashboard"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Petty Cash Management
          </h2>
          <p className="text-muted-foreground">
            Advanced fund management with branch-wise & section-wise tracking
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="funds" className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Funds</span>
          </TabsTrigger>
          <TabsTrigger value="disbursements" className="flex items-center gap-1.5">
            <ArrowDownCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Disbursements</span>
          </TabsTrigger>
          <TabsTrigger value="replenishments" className="flex items-center gap-1.5">
            <ArrowUpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Replenishments</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PettyCashDashboardTab />
        </TabsContent>
        <TabsContent value="funds">
          <PettyCashFundsTab />
        </TabsContent>
        <TabsContent value="disbursements">
          <PettyCashDisbursementsTab />
        </TabsContent>
        <TabsContent value="replenishments">
          <PettyCashReplenishmentsTab />
        </TabsContent>
        <TabsContent value="reports">
          <PettyCashReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
