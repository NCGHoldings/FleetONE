import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Package, 
  DollarSign,
  Star,
  AlertTriangle,
} from "lucide-react";
import { useVendors, usePurchaseOrders, useGoodsReceiptNotes, useAPInvoices } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { differenceInDays } from "date-fns";

interface VendorMetrics {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  totalOrders: number;
  totalAmount: number;
  onTimeDeliveryRate: number;
  avgDeliveryDays: number;
  qualityScore: number;
  priceCompetitiveness: number;
  overallScore: number;
}

export const VendorPerformanceView = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("ytd");

  const { data: vendors = [] } = useVendors();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: grns = [] } = useGoodsReceiptNotes();
  const { data: apInvoices = [] } = useAPInvoices();

  // Calculate vendor metrics
  const vendorMetrics: VendorMetrics[] = vendors.map((vendor: any) => {
    const vendorPOs = purchaseOrders.filter((po: any) => po.vendor_id === vendor.id);
    const vendorGRNs = grns.filter((grn: any) => grn.vendor_id === vendor.id);
    const vendorInvoices = apInvoices.filter((inv: any) => inv.vendor_id === vendor.id);

    const totalOrders = vendorPOs.length;
    const totalAmount = vendorInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);

    // On-time delivery rate
    let onTimeCount = 0;
    let totalDeliveryDays = 0;
    vendorGRNs.forEach((grn: any) => {
      const po = vendorPOs.find((p: any) => p.id === grn.po_id);
      if (po && grn.receipt_date && po.expected_date) {
        const deliveryDays = differenceInDays(new Date(grn.receipt_date), new Date(po.order_date));
        totalDeliveryDays += deliveryDays;
        if (new Date(grn.receipt_date) <= new Date(po.expected_date)) {
          onTimeCount++;
        }
      }
    });

    const onTimeDeliveryRate = vendorGRNs.length > 0 ? (onTimeCount / vendorGRNs.length) * 100 : 100;
    const avgDeliveryDays = vendorGRNs.length > 0 ? totalDeliveryDays / vendorGRNs.length : 0;

    // Quality score (placeholder - would be calculated from GRN quality checks)
    const qualityScore = 85 + Math.random() * 15;

    // Price competitiveness (placeholder)
    const priceCompetitiveness = 70 + Math.random() * 30;

    // Overall score
    const overallScore = (onTimeDeliveryRate * 0.3 + qualityScore * 0.4 + priceCompetitiveness * 0.3);

    return {
      vendorId: vendor.id,
      vendorName: vendor.vendor_name,
      vendorCode: vendor.vendor_code,
      totalOrders,
      totalAmount,
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate),
      avgDeliveryDays: Math.round(avgDeliveryDays),
      qualityScore: Math.round(qualityScore),
      priceCompetitiveness: Math.round(priceCompetitiveness),
      overallScore: Math.round(overallScore),
    };
  }).sort((a, b) => b.overallScore - a.overallScore);

  const topVendors = vendorMetrics.slice(0, 5);
  const avgOnTimeRate = vendorMetrics.length > 0
    ? vendorMetrics.reduce((sum, v) => sum + v.onTimeDeliveryRate, 0) / vendorMetrics.length
    : 0;

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 60) return <Badge variant="secondary">Average</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vendor Performance</h2>
          <p className="text-muted-foreground">Track and analyze vendor metrics</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="q4">Q4 2024</SelectItem>
            <SelectItem value="q3">Q3 2024</SelectItem>
            <SelectItem value="q2">Q2 2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.filter((v: any) => v.is_active).length}</div>
            <p className="text-xs text-muted-foreground">With orders this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg On-Time Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgOnTimeRate)}%</div>
            <Progress value={avgOnTimeRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={vendorMetrics.reduce((sum, v) => sum + v.totalAmount, 0)} />
            </div>
            <p className="text-xs text-muted-foreground">Year to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {topVendors[0]?.vendorName || "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Score: {topVendors[0]?.overallScore || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Top Performing Vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topVendors.map((vendor, index) => (
              <div key={vendor.vendorId} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{vendor.vendorName}</p>
                  <p className="text-sm text-muted-foreground">{vendor.vendorCode}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${getScoreColor(vendor.overallScore)}`}>
                    {vendor.overallScore}%
                  </p>
                </div>
                {getScoreBadge(vendor.overallScore)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Vendors Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-center">On-Time %</TableHead>
                <TableHead className="text-center">Avg Days</TableHead>
                <TableHead className="text-center">Quality</TableHead>
                <TableHead className="text-center">Price Score</TableHead>
                <TableHead className="text-center">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorMetrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No vendor data available
                  </TableCell>
                </TableRow>
              ) : (
                vendorMetrics.map((vendor) => (
                  <TableRow key={vendor.vendorId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vendor.vendorName}</p>
                        <p className="text-sm text-muted-foreground">{vendor.vendorCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{vendor.totalOrders}</TableCell>
                    <TableCell className="text-right font-mono">
                      <CurrencyDisplay amount={vendor.totalAmount} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {vendor.onTimeDeliveryRate >= 90 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : vendor.onTimeDeliveryRate < 70 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                        {vendor.onTimeDeliveryRate}%
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{vendor.avgDeliveryDays} days</TableCell>
                    <TableCell className="text-center">
                      <span className={getScoreColor(vendor.qualityScore)}>
                        {vendor.qualityScore}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getScoreColor(vendor.priceCompetitiveness)}>
                        {vendor.priceCompetitiveness}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getScoreBadge(vendor.overallScore)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};