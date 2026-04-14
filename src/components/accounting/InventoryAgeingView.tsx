import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { useItems, useBatchNumbers } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface AgeingBucket {
  days0to30: number;
  days31to60: number;
  days61to90: number;
  days91to180: number;
  over180: number;
  total: number;
}

interface ItemAgeing {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  buckets: AgeingBucket;
  classification: "fast" | "slow" | "non-moving";
  totalQty: number;
  totalValue: number;
}

export const InventoryAgeingView = () => {
  const { data: items, isLoading } = useItems();
  const { data: batches } = useBatchNumbers();

  const ageingData = useMemo(() => {
    if (!items || !batches) return { itemAgeing: [], totals: null, summary: null };

    const today = new Date();
    const itemMap = new Map<string, ItemAgeing>();

    batches
      .filter(batch => batch.quantity_available > 0)
      .forEach(batch => {
        const createdDate = new Date(batch.created_at || today);
        const daysOld = differenceInDays(today, createdDate);
        const itemId = batch.item_id;
        const item = items.find(i => i.id === itemId);
        
        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            itemId,
            itemCode: item?.item_code || "",
            itemName: item?.item_name || "Unknown",
            category: item?.item_categories?.category_name || "General",
            buckets: { days0to30: 0, days31to60: 0, days61to90: 0, days91to180: 0, over180: 0, total: 0 },
            classification: "fast",
            totalQty: 0,
            totalValue: 0,
          });
        }

        const entry = itemMap.get(itemId)!;
        const value = (batch.quantity_available || 0) * (batch.unit_cost || 0);

        if (daysOld <= 30) {
          entry.buckets.days0to30 += value;
        } else if (daysOld <= 60) {
          entry.buckets.days31to60 += value;
        } else if (daysOld <= 90) {
          entry.buckets.days61to90 += value;
        } else if (daysOld <= 180) {
          entry.buckets.days91to180 += value;
        } else {
          entry.buckets.over180 += value;
        }
        entry.buckets.total += value;
        entry.totalQty += batch.quantity_available || 0;
        entry.totalValue += value;
      });

    // Classify items based on age distribution
    itemMap.forEach(item => {
      const oldStock = item.buckets.days91to180 + item.buckets.over180;
      const oldPercentage = item.buckets.total > 0 ? (oldStock / item.buckets.total) * 100 : 0;
      
      if (oldPercentage > 50) {
        item.classification = "non-moving";
      } else if (oldPercentage > 20) {
        item.classification = "slow";
      } else {
        item.classification = "fast";
      }
    });

    const itemAgeing = Array.from(itemMap.values()).sort((a, b) => b.buckets.total - a.buckets.total);

    const totals: AgeingBucket = itemAgeing.reduce(
      (acc, curr) => ({
        days0to30: acc.days0to30 + curr.buckets.days0to30,
        days31to60: acc.days31to60 + curr.buckets.days31to60,
        days61to90: acc.days61to90 + curr.buckets.days61to90,
        days91to180: acc.days91to180 + curr.buckets.days91to180,
        over180: acc.over180 + curr.buckets.over180,
        total: acc.total + curr.buckets.total,
      }),
      { days0to30: 0, days31to60: 0, days61to90: 0, days91to180: 0, over180: 0, total: 0 }
    );

    const summary = {
      fastMoving: itemAgeing.filter(i => i.classification === "fast").length,
      slowMoving: itemAgeing.filter(i => i.classification === "slow").length,
      nonMoving: itemAgeing.filter(i => i.classification === "non-moving").length,
    };

    return { itemAgeing, totals, summary };
  }, [items, batches]);

  const { itemAgeing, totals, summary } = ageingData;

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case "fast": return <Badge className="bg-green-100 text-green-700">Fast Moving</Badge>;
      case "slow": return <Badge className="bg-yellow-100 text-yellow-700">Slow Moving</Badge>;
      case "non-moving": return <Badge className="bg-red-100 text-red-700">Non-Moving</Badge>;
      default: return <Badge variant="secondary">{classification}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading inventory ageing...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Ageing Report</h2>
          <p className="text-sm text-muted-foreground">
            Stock age analysis with movement classification as of {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Classification Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Fast Moving Items</p>
              <h3 className="text-2xl font-bold text-green-600">{summary?.fastMoving || 0}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">Slow Moving Items</p>
              <h3 className="text-2xl font-bold text-yellow-600">{summary?.slowMoving || 0}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Non-Moving Items</p>
              <h3 className="text-2xl font-bold text-red-600">{summary?.nonMoving || 0}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Ageing Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">0-30 Days</p>
          <h3 className="text-lg font-bold text-green-600 mt-1"><CurrencyDisplay amount={totals?.days0to30 || 0} /></h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">31-60 Days</p>
          <h3 className="text-lg font-bold text-blue-600 mt-1"><CurrencyDisplay amount={totals?.days31to60 || 0} /></h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">61-90 Days</p>
          <h3 className="text-lg font-bold text-yellow-600 mt-1"><CurrencyDisplay amount={totals?.days61to90 || 0} /></h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">91-180 Days</p>
          <h3 className="text-lg font-bold text-orange-600 mt-1"><CurrencyDisplay amount={totals?.days91to180 || 0} /></h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">180+ Days</p>
          <h3 className="text-lg font-bold text-red-600 mt-1"><CurrencyDisplay amount={totals?.over180 || 0} /></h3>
        </Card>
        <Card className="p-4 bg-primary/5">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <h3 className="text-lg font-bold text-primary mt-1"><CurrencyDisplay amount={totals?.total || 0} /></h3>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Item</th>
                <th className="text-left py-3 px-2 font-semibold">Category</th>
                <th className="text-left py-3 px-2 font-semibold">Classification</th>
                <th className="text-right py-3 px-2 font-semibold">0-30 Days</th>
                <th className="text-right py-3 px-2 font-semibold">31-60 Days</th>
                <th className="text-right py-3 px-2 font-semibold">61-90 Days</th>
                <th className="text-right py-3 px-2 font-semibold">91-180 Days</th>
                <th className="text-right py-3 px-2 font-semibold">180+ Days</th>
                <th className="text-right py-3 px-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {itemAgeing.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No inventory data available</td></tr>
              ) : (
                itemAgeing.map(item => (
                  <tr key={item.itemId} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">{item.category}</td>
                    <td className="py-3 px-2">{getClassificationBadge(item.classification)}</td>
                    <td className="text-right py-3 px-2 text-green-600"><CurrencyDisplay amount={item.buckets.days0to30} /></td>
                    <td className="text-right py-3 px-2 text-blue-600"><CurrencyDisplay amount={item.buckets.days31to60} /></td>
                    <td className="text-right py-3 px-2 text-yellow-600"><CurrencyDisplay amount={item.buckets.days61to90} /></td>
                    <td className="text-right py-3 px-2 text-orange-600"><CurrencyDisplay amount={item.buckets.days91to180} /></td>
                    <td className="text-right py-3 px-2 text-red-600"><CurrencyDisplay amount={item.buckets.over180} /></td>
                    <td className="text-right py-3 px-2 font-semibold"><CurrencyDisplay amount={item.buckets.total} /></td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td className="py-3 px-2" colSpan={3}>Total</td>
                <td className="text-right py-3 px-2 text-green-600"><CurrencyDisplay amount={totals?.days0to30 || 0} /></td>
                <td className="text-right py-3 px-2 text-blue-600"><CurrencyDisplay amount={totals?.days31to60 || 0} /></td>
                <td className="text-right py-3 px-2 text-yellow-600"><CurrencyDisplay amount={totals?.days61to90 || 0} /></td>
                <td className="text-right py-3 px-2 text-orange-600"><CurrencyDisplay amount={totals?.days91to180 || 0} /></td>
                <td className="text-right py-3 px-2 text-red-600"><CurrencyDisplay amount={totals?.over180 || 0} /></td>
                <td className="text-right py-3 px-2"><CurrencyDisplay amount={totals?.total || 0} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
