import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building, Calculator, FileText, Play } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useFixedAssets, useAssetCategories, useDepreciationSchedule } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FixedAssetForm } from "./FixedAssetForm";
import { AssetCategoryForm } from "./AssetCategoryForm";

export const FixedAssetsView = () => {
  const [activeTab, setActiveTab] = useState("register");
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  
  const { data: assets, isLoading } = useFixedAssets();
  const { data: categories } = useAssetCategories();
  const { data: depreciation } = useDepreciationSchedule();

  const handleRunDepreciation = () => {
    // Switch to depreciation tab where period selection is available
    setActiveTab("depreciation");
  };

  const handleAssetReport = () => {
    window.print();
  };

  const assetColumns = [
    {
      accessorKey: "asset_code",
      header: "Asset Code",
      cell: ({ row }: any) => <span className="font-mono font-medium">{row.original.asset_code}</span>,
    },
    {
      accessorKey: "asset_name",
      header: "Asset Name",
    },
    {
      accessorKey: "asset_categories.category_name",
      header: "Category",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.asset_categories?.category_name || "N/A"}</Badge>
      ),
    },
    {
      accessorKey: "purchase_date",
      header: "Purchase Date",
      cell: ({ row }: any) => format(new Date(row.original.purchase_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "purchase_cost",
      header: "Cost",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.purchase_cost || 0} />,
    },
    {
      accessorKey: "accumulated_depreciation",
      header: "Accum. Depr.",
      cell: ({ row }: any) => (
        <span className="text-muted-foreground">
          <CurrencyDisplay amount={row.original.accumulated_depreciation || 0} />
        </span>
      ),
    },
    {
      accessorKey: "net_book_value",
      header: "Net Book Value",
      cell: ({ row }: any) => {
        const nbv = (row.original.purchase_cost || 0) - (row.original.accumulated_depreciation || 0);
        return (
          <span className="font-semibold">
            <CurrencyDisplay amount={nbv} />
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status || "active";
        const variants: Record<string, "default" | "secondary" | "destructive"> = {
          active: "default",
          disposed: "destructive",
          fully_depreciated: "secondary",
        };
        return <Badge variant={variants[status] || "default"}>{status.replace("_", " ").toUpperCase()}</Badge>;
      },
    },
  ];

  const categoryColumns = [
    {
      accessorKey: "category_code",
      header: "Code",
      cell: ({ row }: any) => <span className="font-mono">{row.original.category_code}</span>,
    },
    {
      accessorKey: "category_name",
      header: "Category Name",
    },
    {
      accessorKey: "depreciation_method",
      header: "Depreciation Method",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.depreciation_method || "Straight Line"}</Badge>
      ),
    },
    {
      accessorKey: "depreciation_rate",
      header: "Rate",
      cell: ({ row }: any) => <span>{row.original.depreciation_rate || 0}%</span>,
    },
    {
      accessorKey: "useful_life_years",
      header: "Useful Life",
      cell: ({ row }: any) => <span>{row.original.useful_life_years || 0} years</span>,
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

  const depreciationColumns = [
    {
      accessorKey: "depreciation_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.depreciation_date), "MMM yyyy"),
    },
    {
      accessorKey: "depreciation_amount",
      header: "Depreciation",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.depreciation_amount || 0} />,
    },
    {
      accessorKey: "accumulated_depreciation",
      header: "Accumulated",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.accumulated_depreciation || 0} />,
    },
    {
      accessorKey: "net_book_value",
      header: "Net Book Value",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.net_book_value || 0} />
        </span>
      ),
    },
    {
      accessorKey: "is_posted",
      header: "Posted",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_posted ? "default" : "outline"}>
          {row.original.is_posted ? "Posted" : "Pending"}
        </Badge>
      ),
    },
  ];

  const totalCost = assets?.reduce((sum, a) => sum + (a.purchase_cost || 0), 0) || 0;
  const totalAccumDepr = assets?.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0) || 0;
  const totalNBV = totalCost - totalAccumDepr;
  const depreciationPercentage = totalCost > 0 ? (totalAccumDepr / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Assets</p>
          <h3 className="text-2xl font-bold mt-1">{assets?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <h3 className="text-2xl font-bold mt-1">
            <CurrencyDisplay amount={totalCost} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Accumulated Depreciation</p>
          <h3 className="text-2xl font-bold text-muted-foreground mt-1">
            <CurrencyDisplay amount={totalAccumDepr} />
          </h3>
          <Progress value={depreciationPercentage} className="mt-2 h-2" />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Net Book Value</p>
          <h3 className="text-2xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalNBV} />
          </h3>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Fixed Asset Register</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage all fixed assets and their values
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleAssetReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Asset Report
                </Button>
                <Button onClick={() => setShowAssetForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              </div>
            </div>

            <DataTable variant="professional" enableColumnFilters columns={assetColumns} data={assets || []} searchKey="asset_name" />
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Asset Categories</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure depreciation methods and rates by category
                </p>
              </div>
              <Button onClick={() => setShowCategoryForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>

            <DataTable variant="professional" enableColumnFilters columns={categoryColumns} data={categories || []} searchKey="category_name" />
          </Card>
        </TabsContent>

        <TabsContent value="depreciation">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Depreciation Schedule</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  View and run monthly depreciation
                </p>
              </div>
              <Button onClick={handleRunDepreciation}>
                <Play className="h-4 w-4 mr-2" />
                Run Depreciation
              </Button>
            </div>

            <DataTable variant="professional" enableColumnFilters columns={depreciationColumns} data={depreciation || []} searchKey="depreciation_date" />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <FixedAssetForm open={showAssetForm} onOpenChange={setShowAssetForm} />
      <AssetCategoryForm open={showCategoryForm} onOpenChange={setShowCategoryForm} />
    </div>
  );
};
