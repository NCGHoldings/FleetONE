import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useFixedAssets, useDepreciationSchedule, useFinancialPeriods } from "@/hooks/useAccountingData";
import { useRunDepreciationWithGL } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const DepreciationRunView = () => {
  const { data: assets, isLoading } = useFixedAssets();
  const { data: schedule } = useDepreciationSchedule();
  const { data: periods } = useFinancialPeriods();
  const runDepreciation = useRunDepreciationWithGL();

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const activeAssets = assets?.filter(a => a.status === "active") || [];
  
  // Calculate totals
  const totalCost = activeAssets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);
  const totalAccumulated = activeAssets.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0);
  const totalNBV = activeAssets.reduce((sum, a) => sum + (a.current_value || 0), 0);

  // Estimate monthly depreciation
  const estimatedMonthly = activeAssets.reduce((sum, asset) => {
    const category = asset.asset_categories;
    if (!category) return sum;
    const usefulLife = category.useful_life_years || 5;
    const salvage = asset.salvage_value || 0;
    const monthlyDep = (asset.purchase_cost - salvage) / (usefulLife * 12);
    return sum + monthlyDep;
  }, 0);

  const assetColumns = [
    {
      accessorKey: "asset_code",
      header: "Asset Code",
      cell: ({ row }: any) => (
        <span className="font-mono font-medium">{row.original.asset_code}</span>
      ),
    },
    {
      accessorKey: "asset_name",
      header: "Asset Name",
      cell: ({ row }: any) => row.original.asset_name,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }: any) => row.original.asset_categories?.category_name || "N/A",
    },
    {
      accessorKey: "purchase_cost",
      header: "Cost",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.purchase_cost || 0} />,
    },
    {
      accessorKey: "accumulated_depreciation",
      header: "Accumulated Dep.",
      cell: ({ row }: any) => (
        <span className="text-orange-600">
          <CurrencyDisplay amount={row.original.accumulated_depreciation || 0} />
        </span>
      ),
    },
    {
      accessorKey: "current_value",
      header: "Net Book Value",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.current_value || 0} />
        </span>
      ),
    },
    {
      accessorKey: "monthly_dep",
      header: "Monthly Dep.",
      cell: ({ row }: any) => {
        const category = row.original.asset_categories;
        if (!category) return "-";
        const usefulLife = category.useful_life_years || 5;
        const salvage = row.original.salvage_value || 0;
        const monthly = (row.original.purchase_cost - salvage) / (usefulLife * 12);
        return <CurrencyDisplay amount={monthly} />;
      },
    },
  ];

  const scheduleColumns = [
    {
      accessorKey: "depreciation_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.depreciation_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "asset_id",
      header: "Asset",
      cell: ({ row }: any) => {
        const asset = assets?.find(a => a.id === row.original.asset_id);
        return asset?.asset_code || "N/A";
      },
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
      header: "NBV After",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.net_book_value || 0} />,
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

  const handleRunDepreciation = async () => {
    if (!selectedPeriod) {
      toast.error("Please select a period");
      return;
    }

    try {
      await runDepreciation.mutateAsync(selectedPeriod);
      setShowConfirmDialog(false);
      setSelectedPeriod("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const openPeriods = periods?.filter(p => !p.is_closed) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Depreciation Management</h2>
          <p className="text-sm text-muted-foreground">
            Run monthly depreciation and manage asset values
          </p>
        </div>
        <Button onClick={() => setShowConfirmDialog(true)}>
          <Play className="h-4 w-4 mr-2" />
          Run Depreciation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Assets</p>
          <h3 className="text-2xl font-bold mt-1">{activeAssets.length}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Asset Cost</p>
          <h3 className="text-xl font-bold mt-1">
            <CurrencyDisplay amount={totalCost} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Accumulated Depreciation</p>
          <h3 className="text-xl font-bold text-orange-600 mt-1">
            <CurrencyDisplay amount={totalAccumulated} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Net Book Value</p>
          <h3 className="text-xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalNBV} />
          </h3>
        </Card>
      </div>

      {/* Estimated Depreciation */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Estimated Monthly Depreciation</p>
              <p className="text-sm text-muted-foreground">
                Based on {activeAssets.length} active assets using straight-line method
              </p>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-primary">
            <CurrencyDisplay amount={estimatedMonthly} />
          </h3>
        </div>
      </Card>

      {/* Assets & Schedule */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Depreciable Assets</h3>
          <DataTable
            columns={assetColumns}
            data={activeAssets}
            searchKey="asset_name"
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Depreciation Schedule</h3>
          <DataTable
            columns={scheduleColumns}
            data={schedule?.slice(0, 20) || []}
            searchKey="depreciation_date"
          />
        </Card>
      </div>

      {/* Run Depreciation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Monthly Depreciation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium">This will calculate depreciation for all active assets</p>
                <p className="text-muted-foreground">
                  Estimated amount: <CurrencyDisplay amount={estimatedMonthly} />
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Select Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select financial period" />
                </SelectTrigger>
                <SelectContent>
                  {openPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.period_name || `${format(new Date(period.start_date), "MMM yyyy")}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>• {activeAssets.length} assets will be processed</p>
              <p>• Journal entries will be created (draft)</p>
              <p>• Asset values will be updated</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRunDepreciation}
              disabled={!selectedPeriod || runDepreciation.isPending}
            >
              {runDepreciation.isPending ? "Processing..." : "Run Depreciation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
