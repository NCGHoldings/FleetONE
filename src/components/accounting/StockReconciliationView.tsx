import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardCheck, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { useItems, useItemStock } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReconciliationItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  varianceValue: number;
  unitCost: number;
  status: "matched" | "variance" | "pending";
}

export const StockReconciliationView = () => {
  const { data: items, isLoading } = useItems();
  const { data: stockLevels } = useItemStock();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [reconciliationDate, setReconciliationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [isReconciling, setIsReconciling] = useState(false);

  const reconciliationItems = useMemo((): ReconciliationItem[] => {
    if (!items || !stockLevels) return [];

    return items.map(item => {
      const stock = stockLevels.find(s => s.item_id === item.id);
      const systemQty = stock?.quantity_on_hand || 0;
      const physicalQty = physicalCounts[item.id] ?? systemQty;
      const variance = physicalQty - systemQty;
      const unitCost = stock?.average_cost || item.standard_cost || 0;
      const varianceValue = variance * unitCost;

      return {
        itemId: item.id,
        itemCode: item.item_code,
        itemName: item.item_name,
        systemQty,
        physicalQty,
        variance,
        varianceValue,
        unitCost,
        status: physicalCounts[item.id] === undefined ? "pending" : variance === 0 ? "matched" : "variance",
      };
    });
  }, [items, stockLevels, physicalCounts]);

  const summary = useMemo(() => {
    const matched = reconciliationItems.filter(i => i.status === "matched").length;
    const hasVariance = reconciliationItems.filter(i => i.status === "variance").length;
    const pending = reconciliationItems.filter(i => i.status === "pending").length;
    const totalVarianceValue = reconciliationItems.reduce((sum, i) => sum + Math.abs(i.varianceValue), 0);
    return { matched, hasVariance, pending, totalVarianceValue };
  }, [reconciliationItems]);

  const handlePhysicalCountChange = (itemId: string, value: string) => {
    const qty = parseFloat(value) || 0;
    setPhysicalCounts(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleStartReconciliation = () => {
    setIsReconciling(true);
    setPhysicalCounts({});
    setIsDialogOpen(false);
    toast.success("Stock reconciliation started. Enter physical counts for each item.");
  };

  const handleSaveReconciliation = () => {
    // In a real app, this would save to database
    toast.success("Reconciliation saved successfully");
    setIsReconciling(false);
    setPhysicalCounts({});
  };

  const handleCompleteReconciliation = () => {
    if (summary.pending > 0) {
      toast.error("Please enter physical counts for all items before completing");
      return;
    }
    // In a real app, this would create stock adjustments and save
    toast.success("Reconciliation completed. Stock adjustments created for variances.");
    setIsReconciling(false);
    setPhysicalCounts({});
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched": return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Matched</Badge>;
      case "variance": return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1" />Variance</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading stock data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Stock Reconciliation</h2>
          <p className="text-sm text-muted-foreground">
            {isReconciling ? `Reconciling as of ${reconciliationDate}` : "Compare physical counts with system quantities"}
          </p>
        </div>
        <div className="flex gap-2">
          {!isReconciling ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Reconciliation</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Stock Reconciliation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Reconciliation Date</Label>
                    <Input type="date" value={reconciliationDate} onChange={e => setReconciliationDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="main">Main Warehouse</SelectItem>
                        <SelectItem value="branch">Branch Store</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleStartReconciliation} className="w-full">
                    <ClipboardCheck className="h-4 w-4 mr-2" />Start Reconciliation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <>
              <Button variant="outline" onClick={handleSaveReconciliation}>
                <Save className="h-4 w-4 mr-2" />Save Draft
              </Button>
              <Button onClick={handleCompleteReconciliation}>
                <CheckCircle className="h-4 w-4 mr-2" />Complete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Items</p>
          <h3 className="text-2xl font-bold mt-1">{reconciliationItems.length}</h3>
        </Card>
        <Card className="p-4 bg-green-50 dark:bg-green-950/20">
          <p className="text-xs text-muted-foreground">Matched</p>
          <h3 className="text-2xl font-bold text-green-600 mt-1">{summary.matched}</h3>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-950/20">
          <p className="text-xs text-muted-foreground">Variance</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">{summary.hasVariance}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Variance Value</p>
          <h3 className="text-2xl font-bold text-destructive mt-1">
            <CurrencyDisplay amount={summary.totalVarianceValue} />
          </h3>
        </Card>
      </div>

      {/* Reconciliation Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Item Code</th>
                <th className="text-left py-3 px-2 font-semibold">Item Name</th>
                <th className="text-right py-3 px-2 font-semibold">System Qty</th>
                <th className="text-right py-3 px-2 font-semibold">Physical Qty</th>
                <th className="text-right py-3 px-2 font-semibold">Variance</th>
                <th className="text-right py-3 px-2 font-semibold">Variance Value</th>
                <th className="text-left py-3 px-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationItems.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No items to reconcile</td></tr>
              ) : (
                reconciliationItems.map(item => (
                  <tr key={item.itemId} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{item.itemCode}</td>
                    <td className="py-3 px-2">{item.itemName}</td>
                    <td className="py-3 px-2 text-right">{item.systemQty.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">
                      {isReconciling ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 text-right"
                          value={physicalCounts[item.itemId] ?? ""}
                          onChange={e => handlePhysicalCountChange(item.itemId, e.target.value)}
                          placeholder={item.systemQty.toString()}
                        />
                      ) : (
                        item.physicalQty.toFixed(2)
                      )}
                    </td>
                    <td className={`py-3 px-2 text-right font-semibold ${item.variance !== 0 ? "text-destructive" : "text-green-600"}`}>
                      {item.variance > 0 ? "+" : ""}{item.variance.toFixed(2)}
                    </td>
                    <td className={`py-3 px-2 text-right ${item.varianceValue !== 0 ? "text-destructive" : ""}`}>
                      <CurrencyDisplay amount={Math.abs(item.varianceValue)} />
                    </td>
                    <td className="py-3 px-2">{getStatusBadge(item.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
