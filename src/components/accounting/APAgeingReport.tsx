import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useAPInvoices, useVendors } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { differenceInDays } from "date-fns";

interface AgeingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

interface VendorAgeing {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  buckets: AgeingBucket;
}

export const APAgeingReport = () => {
  const { data: invoices, isLoading } = useAPInvoices();
  const { data: vendors } = useVendors();

  const ageingData = useMemo(() => {
    if (!invoices) return { vendorAgeing: [], totals: null };

    const today = new Date();
    const vendorMap = new Map<string, VendorAgeing>();

    invoices
      .filter(inv => inv.status !== "paid" && inv.status !== "cancelled" && inv.balance > 0)
      .forEach(inv => {
        const daysOverdue = differenceInDays(today, new Date(inv.due_date));
        const vendorId = inv.vendor_id || "unknown";
        
        if (!vendorMap.has(vendorId)) {
          const vendor = vendors?.find(v => v.id === vendorId);
          vendorMap.set(vendorId, {
            vendorId,
            vendorName: vendor?.vendor_name || inv.vendors?.vendor_name || "Unknown",
            vendorCode: vendor?.vendor_code || inv.vendors?.vendor_code || "",
            buckets: { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 },
          });
        }

        const entry = vendorMap.get(vendorId)!;
        const balance = inv.balance || 0;

        if (daysOverdue <= 0) {
          entry.buckets.current += balance;
        } else if (daysOverdue <= 30) {
          entry.buckets.days1to30 += balance;
        } else if (daysOverdue <= 60) {
          entry.buckets.days31to60 += balance;
        } else if (daysOverdue <= 90) {
          entry.buckets.days61to90 += balance;
        } else {
          entry.buckets.over90 += balance;
        }
        entry.buckets.total += balance;
      });

    const vendorAgeing = Array.from(vendorMap.values()).sort((a, b) => 
      b.buckets.total - a.buckets.total
    );

    const totals: AgeingBucket = vendorAgeing.reduce(
      (acc, curr) => ({
        current: acc.current + curr.buckets.current,
        days1to30: acc.days1to30 + curr.buckets.days1to30,
        days31to60: acc.days31to60 + curr.buckets.days31to60,
        days61to90: acc.days61to90 + curr.buckets.days61to90,
        over90: acc.over90 + curr.buckets.over90,
        total: acc.total + curr.buckets.total,
      }),
      { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 }
    );

    return { vendorAgeing, totals };
  }, [invoices, vendors]);

  const { vendorAgeing, totals } = ageingData;

  if (isLoading) {
    return <div className="p-4">Loading ageing report...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AP Ageing Report</h2>
          <p className="text-sm text-muted-foreground">
            Accounts payable by ageing bucket as of {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Current</p>
          <h3 className="text-lg font-bold text-green-600 mt-1">
            <CurrencyDisplay amount={totals?.current || 0} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">1-30 Days</p>
          <h3 className="text-lg font-bold text-yellow-600 mt-1">
            <CurrencyDisplay amount={totals?.days1to30 || 0} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">31-60 Days</p>
          <h3 className="text-lg font-bold text-orange-600 mt-1">
            <CurrencyDisplay amount={totals?.days31to60 || 0} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">61-90 Days</p>
          <h3 className="text-lg font-bold text-red-500 mt-1">
            <CurrencyDisplay amount={totals?.days61to90 || 0} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">90+ Days</p>
          <h3 className="text-lg font-bold text-destructive mt-1">
            <CurrencyDisplay amount={totals?.over90 || 0} />
          </h3>
        </Card>
        <Card className="p-4 bg-destructive/5">
          <p className="text-xs text-muted-foreground">Total Payable</p>
          <h3 className="text-lg font-bold text-destructive mt-1">
            <CurrencyDisplay amount={totals?.total || 0} />
          </h3>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Vendor</th>
                <th className="text-right py-3 px-2 font-semibold">Current</th>
                <th className="text-right py-3 px-2 font-semibold">1-30 Days</th>
                <th className="text-right py-3 px-2 font-semibold">31-60 Days</th>
                <th className="text-right py-3 px-2 font-semibold">61-90 Days</th>
                <th className="text-right py-3 px-2 font-semibold">90+ Days</th>
                <th className="text-right py-3 px-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {vendorAgeing.map((vendor) => (
                <tr key={vendor.vendorId} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium">{vendor.vendorName}</p>
                      <p className="text-xs text-muted-foreground">{vendor.vendorCode}</p>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 text-green-600">
                    <CurrencyDisplay amount={vendor.buckets.current} />
                  </td>
                  <td className="text-right py-3 px-2 text-yellow-600">
                    <CurrencyDisplay amount={vendor.buckets.days1to30} />
                  </td>
                  <td className="text-right py-3 px-2 text-orange-600">
                    <CurrencyDisplay amount={vendor.buckets.days31to60} />
                  </td>
                  <td className="text-right py-3 px-2 text-red-500">
                    <CurrencyDisplay amount={vendor.buckets.days61to90} />
                  </td>
                  <td className="text-right py-3 px-2 text-destructive">
                    <CurrencyDisplay amount={vendor.buckets.over90} />
                  </td>
                  <td className="text-right py-3 px-2 font-semibold">
                    <CurrencyDisplay amount={vendor.buckets.total} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td className="py-3 px-2">Total</td>
                <td className="text-right py-3 px-2 text-green-600">
                  <CurrencyDisplay amount={totals?.current || 0} />
                </td>
                <td className="text-right py-3 px-2 text-yellow-600">
                  <CurrencyDisplay amount={totals?.days1to30 || 0} />
                </td>
                <td className="text-right py-3 px-2 text-orange-600">
                  <CurrencyDisplay amount={totals?.days31to60 || 0} />
                </td>
                <td className="text-right py-3 px-2 text-red-500">
                  <CurrencyDisplay amount={totals?.days61to90 || 0} />
                </td>
                <td className="text-right py-3 px-2 text-destructive">
                  <CurrencyDisplay amount={totals?.over90 || 0} />
                </td>
                <td className="text-right py-3 px-2">
                  <CurrencyDisplay amount={totals?.total || 0} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
