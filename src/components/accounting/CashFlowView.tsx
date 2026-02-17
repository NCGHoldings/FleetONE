import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Landmark,
  Building2,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Wallet,
  BarChart3,
  PieChart,
  Layers,
  RefreshCw,
  Info,
  ChevronRight,
} from "lucide-react";
import { useCashFlowData, CashFlowLineItem } from "@/hooks/useCashFlowData";
import { DateRangePicker } from "@/components/ui/date-range-picker";

// ────────── Helpers ──────────

const formatCurrency = (num: number): string => {
  if (Math.abs(num) < 0.01) return "—";
  const negative = num < 0;
  const formatted = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return negative ? `(${formatted})` : formatted;
};

const formatCompact = (num: number): string => {
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
};

const AmountCell = ({ amount, bold }: { amount: number; bold?: boolean }) => (
  <span
    className={`font-mono text-sm ${bold ? "font-bold text-base" : ""} ${
      amount < -0.01
        ? "text-red-600 dark:text-red-400"
        : amount > 0.01
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-muted-foreground"
    }`}
  >
    {formatCurrency(amount)}
  </span>
);

// ────────── KPI Card ──────────

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color: string;
}

const KPICard = ({ title, value, subtitle, icon, trend, color }: KPICardProps) => (
  <Card className="relative overflow-hidden">
    <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-xl font-bold font-mono ${value < 0 ? "text-red-600" : "text-foreground"}`}>
            {formatCompact(value)}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-muted/50`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-2 text-xs">
          {trend === "up" ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
          ) : trend === "down" ? (
            <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
          ) : null}
          <span className={trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}>
            {trend === "up" ? "Positive" : trend === "down" ? "Negative" : "Neutral"} cash flow
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

// ────────── Section Renderer ──────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  items: CashFlowLineItem[];
  color: string;
}

const CashFlowSection = ({ title, icon, items, color }: SectionProps) => (
  <Card className="overflow-hidden">
    <div className={`h-1 ${color}`} />
    <CardHeader className="py-3 px-4">
      <div className="flex items-center gap-2">
        {icon}
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow
              key={idx}
              className={`${
                item.isSubtotal || item.isTotal
                  ? "bg-muted/40 border-t-2"
                  : ""
              } hover:bg-muted/20 transition-colors`}
            >
              <TableCell
                className={`py-2 ${item.isSubtotal || item.isTotal ? "font-semibold" : ""}`}
                style={{ paddingLeft: `${(item.indent || 0) * 20 + 16}px` }}
              >
                {item.isSubtotal || item.isTotal ? (
                  <div className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    {item.label}
                  </div>
                ) : (
                  item.label
                )}
              </TableCell>
              <TableCell className="text-right py-2 pr-4 w-40">
                {Math.abs(item.amount) > 0.001 ? (
                  <AmountCell amount={item.amount} bold={item.isSubtotal || item.isTotal} />
                ) : item.isSubtotal || item.isTotal ? (
                  <AmountCell amount={0} bold />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

// ────────── Component ──────────

export const CashFlowView = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [customDateRange, setCustomDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [method, setMethod] = useState<string>("indirect");

  // Compute effective dates from state (not from hook results)
  const effectiveDates = useMemo(() => {
    if (customDateRange.from && customDateRange.to) {
      return { start: customDateRange.from, end: customDateRange.to };
    }
    return { start: null as Date | null, end: null as Date | null };
  }, [customDateRange]);

  // Fetch data — pass dates only when we have them
  const { cashFlowData: data, periods, isLoading } = useCashFlowData(
    effectiveDates.start,
    effectiveDates.end
  );

  // When a period is selected, set the dates from the period
  const handlePeriodChange = (value: string) => {
    setSelectedPeriodId(value);
    const period = (periods as any[]).find((p: any) => p.id === value);
    if (period) {
      setCustomDateRange({
        from: new Date(period.start_date),
        to: new Date(period.end_date),
      });
    }
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    setCustomDateRange(range || {});
    if (range?.from && range?.to) {
      setSelectedPeriodId(""); // clear period when custom range is set
    }
  };

  // Reconciliation check
  const isReconciled = useMemo(() => {
    if (!data) return false;
    return Math.abs(data.openingCash + data.netCashChange - data.closingCash) < 0.01;
  }, [data]);

  // CSV Export
  const handleExport = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Cash Flow Statement", `"${data.periodLabel}"`],
      [],
      ["Section", "Item", "Amount"],
    ];

    const addSection = (title: string, items: CashFlowLineItem[]) => {
      rows.push([title, "", ""]);
      items.forEach((item) => {
        rows.push(["", item.label, item.amount.toFixed(2)]);
      });
      rows.push([]);
    };

    if (method === "direct") {
      addSection("Operating Activities (Direct)", data.directOperating);
    } else {
      addSection("Operating Activities (Indirect)", data.indirectOperating);
    }
    addSection("Investing Activities", data.investingItems);
    addSection("Financing Activities", data.financingItems);

    rows.push(["Net Cash Change", "", data.netCashChange.toFixed(2)]);
    rows.push(["Opening Cash", "", data.openingCash.toFixed(2)]);
    rows.push(["Closing Cash", "", data.closingCash.toFixed(2)]);
    rows.push([]);
    rows.push(["Working Capital Changes"]);
    rows.push(["Item", "Opening", "Closing", "Change"]);
    data.workingCapital.forEach((wc) => {
      rows.push([
        wc.label,
        wc.opening.toFixed(2),
        wc.closing.toFixed(2),
        wc.change.toFixed(2),
      ]);
    });

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${data.periodLabel.replace(/[^a-zA-Z0-9]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ────────── Render ──────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cash Flow Statement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            IAS 7 — Statement of Cash Flows • Direct & Indirect Method
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Parameters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Financial Period */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Financial Period</Label>
              {(periods as any[]).length > 0 ? (
                <Select value={selectedPeriodId} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {(periods as any[]).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.period_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 flex items-center px-3 border rounded-md bg-muted/30 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  No periods — use date range →
                </div>
              )}
            </div>

            {/* Custom Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Or Custom Date Range</Label>
              <DateRangePicker onDateRangeChange={handleDateRangeChange} />
            </div>

            {/* Method Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Reporting Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indirect">Indirect Method</SelectItem>
                  <SelectItem value="direct">Direct Method</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reconciliation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Reconciliation</Label>
              <div className="h-9 flex items-center gap-2">
                {data ? (
                  isReconciled ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600 gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Balanced
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Unbalanced
                    </Badge>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">Select dates to verify</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading cash flow data...</p>
          </div>
        </Card>
      )}

      {/* No Date Selected */}
      {!isLoading && !data && (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-4 rounded-full bg-muted/50">
              <CalendarDays className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Select a Reporting Period</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Choose a financial period or set a custom date range above to generate the Cash Flow Statement.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Data Ready */}
      {data && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KPICard
              title="Operating"
              value={method === "indirect" ? data.netIndirectOperating : data.netDirectOperating}
              icon={<Activity className="h-4 w-4 text-blue-500" />}
              trend={
                (method === "indirect" ? data.netIndirectOperating : data.netDirectOperating) > 0
                  ? "up" : "down"
              }
              color="bg-blue-500"
            />
            <KPICard
              title="Investing"
              value={data.netInvesting}
              icon={<Building2 className="h-4 w-4 text-amber-500" />}
              trend={data.netInvesting > 0 ? "up" : data.netInvesting < 0 ? "down" : "neutral"}
              color="bg-amber-500"
            />
            <KPICard
              title="Financing"
              value={data.netFinancing}
              icon={<Landmark className="h-4 w-4 text-purple-500" />}
              trend={data.netFinancing > 0 ? "up" : data.netFinancing < 0 ? "down" : "neutral"}
              color="bg-purple-500"
            />
            <KPICard
              title="Net Change"
              value={data.netCashChange}
              subtitle={data.periodLabel}
              icon={<TrendingUp className="h-4 w-4 text-teal-500" />}
              trend={data.netCashChange > 0 ? "up" : "down"}
              color="bg-teal-500"
            />
            <KPICard
              title="Opening Cash"
              value={data.openingCash}
              icon={<Wallet className="h-4 w-4 text-slate-500" />}
              color="bg-slate-400"
            />
            <KPICard
              title="Closing Cash"
              value={data.closingCash}
              icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
              trend={data.closingCash > data.openingCash ? "up" : "down"}
              color="bg-emerald-500"
            />
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="statement" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="statement" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Statement
              </TabsTrigger>
              <TabsTrigger value="working-capital" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Working Capital
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="gap-1.5">
                <PieChart className="h-3.5 w-3.5" />
                Breakdown
              </TabsTrigger>
              <TabsTrigger value="reconciliation" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Reconciliation
              </TabsTrigger>
            </TabsList>

            {/* Statement Tab */}
            <TabsContent value="statement" className="space-y-4">
              {/* Period Header */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{data.periodLabel}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {method === "indirect" ? "Indirect Method (IAS 7.18b)" : "Direct Method (IAS 7.18a)"}
                </Badge>
              </div>

              {/* Cash Flow Sections */}
              <CashFlowSection
                title="A. Cash Flows from Operating Activities"
                icon={<Activity className="h-4 w-4 text-blue-500" />}
                items={method === "indirect" ? data.indirectOperating : data.directOperating}
                color="bg-blue-500"
              />

              <CashFlowSection
                title="B. Cash Flows from Investing Activities"
                icon={<Building2 className="h-4 w-4 text-amber-500" />}
                items={data.investingItems}
                color="bg-amber-500"
              />

              <CashFlowSection
                title="C. Cash Flows from Financing Activities"
                icon={<Landmark className="h-4 w-4 text-purple-500" />}
                items={data.financingItems}
                color="bg-purple-500"
              />

              {/* Net Change & Closing Cash */}
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 via-amber-500 to-purple-500" />
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      <TableRow className="bg-muted/30 border-b-2">
                        <TableCell className="font-bold py-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-teal-500" />
                            Net Increase / (Decrease) in Cash (A + B + C)
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4 w-40">
                          <AmountCell amount={data.netCashChange} bold />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-2.5">Cash and Cash Equivalents at Beginning of Period</TableCell>
                        <TableCell className="text-right pr-4 w-40">
                          <AmountCell amount={data.openingCash} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-emerald-50 dark:bg-emerald-950/20 border-t-2">
                        <TableCell className="font-bold py-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            Cash and Cash Equivalents at End of Period
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4 w-40">
                          <AmountCell amount={data.closingCash} bold />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Working Capital Tab */}
            <TabsContent value="working-capital" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Working Capital Analysis</CardTitle>
                    <Badge variant="outline" className="text-xs">{data.periodLabel}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="font-semibold">Component</TableHead>
                        <TableHead className="text-right font-semibold">Opening</TableHead>
                        <TableHead className="text-right font-semibold">Closing</TableHead>
                        <TableHead className="text-right font-semibold">Change</TableHead>
                        <TableHead className="text-right font-semibold">Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.workingCapital.map((wc, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium py-2.5">{wc.label}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-sm">{formatCurrency(wc.opening)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-sm">{formatCurrency(wc.closing)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-mono text-sm font-medium ${
                              wc.change > 0 ? "text-emerald-600" : wc.change < 0 ? "text-red-600" : ""
                            }`}>
                              {formatCurrency(wc.change)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {wc.change > 0 ? (
                              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" /> Inflow
                              </Badge>
                            ) : wc.change < 0 ? (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                <ArrowDownRight className="h-3 w-3 mr-0.5" /> Outflow
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/40 border-t-2 font-bold">
                        <TableCell className="font-bold">Total Working Capital Changes</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">
                          <AmountCell amount={data.workingCapital.reduce((s, w) => s + w.change, 0)} bold />
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Breakdown Tab */}
            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Revenue vs Expense */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Income Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium">Total Revenue</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600">{formatCurrency(data.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Total Expenses</span>
                      </div>
                      <span className="font-mono font-bold text-red-600">{formatCurrency(data.totalExpenses)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm font-bold">Net Income</span>
                      </div>
                      <AmountCell amount={data.netIncome} bold />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Depreciation & Amortization</span>
                      </div>
                      <span className="font-mono text-sm">{formatCurrency(data.depreciation)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Direct Method Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cash Flow Composition (Direct)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Cash from Customers</span>
                      </div>
                      <span className="font-mono font-bold text-blue-600">{formatCurrency(data.cashFromCustomers)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">Cash to Suppliers</span>
                      </div>
                      <span className="font-mono font-bold text-orange-600">{formatCurrency(data.cashToSuppliers)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-violet-600" />
                        <span className="text-sm font-medium">Cash to Employees</span>
                      </div>
                      <span className="font-mono font-bold text-violet-600">{formatCurrency(data.cashToEmployees)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Other Operating Cash Flows</span>
                      </div>
                      <span className="font-mono text-sm">{formatCurrency(data.otherOperatingCash)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cash Position */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cash Position Movement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 overflow-x-auto">
                      <div className="flex-1 text-center p-4 bg-muted/30 rounded-lg min-w-[120px]">
                        <p className="text-xs text-muted-foreground mb-1">Opening Cash</p>
                        <p className="font-mono font-bold text-lg">{formatCompact(data.openingCash)}</p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <span className="text-xs">+</span>
                      </div>
                      <div className="flex-1 text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg min-w-[100px]">
                        <p className="text-xs text-blue-600 mb-1">Operating</p>
                        <p className={`font-mono font-bold ${(method === "indirect" ? data.netIndirectOperating : data.netDirectOperating) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                          {formatCompact(method === "indirect" ? data.netIndirectOperating : data.netDirectOperating)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <span className="text-xs">+</span>
                      </div>
                      <div className="flex-1 text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg min-w-[100px]">
                        <p className="text-xs text-amber-600 mb-1">Investing</p>
                        <p className={`font-mono font-bold ${data.netInvesting >= 0 ? "text-amber-600" : "text-red-600"}`}>
                          {formatCompact(data.netInvesting)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <span className="text-xs">+</span>
                      </div>
                      <div className="flex-1 text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg min-w-[100px]">
                        <p className="text-xs text-purple-600 mb-1">Financing</p>
                        <p className={`font-mono font-bold ${data.netFinancing >= 0 ? "text-purple-600" : "text-red-600"}`}>
                          {formatCompact(data.netFinancing)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <span className="text-xs">=</span>
                      </div>
                      <div className="flex-1 text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-2 border-emerald-300 min-w-[120px]">
                        <p className="text-xs text-emerald-600 mb-1">Closing Cash</p>
                        <p className="font-mono font-bold text-lg text-emerald-600">{formatCompact(data.closingCash)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reconciliation Tab */}
            <TabsContent value="reconciliation" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Cash Reconciliation</CardTitle>
                    {isReconciled ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Reconciled
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Discrepancy Detected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="py-3 font-medium">Opening Cash Balance</TableCell>
                        <TableCell className="text-right pr-4">
                          <AmountCell amount={data.openingCash} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-3 pl-8">+ Net Operating Cash Flow</TableCell>
                        <TableCell className="text-right pr-4">
                          <AmountCell amount={method === "indirect" ? data.netIndirectOperating : data.netDirectOperating} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-3 pl-8">+ Net Investing Cash Flow</TableCell>
                        <TableCell className="text-right pr-4">
                          <AmountCell amount={data.netInvesting} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-3 pl-8">+ Net Financing Cash Flow</TableCell>
                        <TableCell className="text-right pr-4">
                          <AmountCell amount={data.netFinancing} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-t-2 bg-muted/40">
                        <TableCell className="py-3 font-bold">Computed Closing Cash</TableCell>
                        <TableCell className="text-right pr-4">
                          <AmountCell amount={data.openingCash + data.netCashChange} bold />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-3 font-medium">Actual Closing Cash (GL)</TableCell>
                        <TableCell className="text-right pr-4">
                          <AmountCell amount={data.closingCash} />
                        </TableCell>
                      </TableRow>
                      <TableRow className={`border-t-2 ${isReconciled ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                        <TableCell className="py-3 font-bold">
                          Difference (Variance)
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <AmountCell
                            amount={data.closingCash - (data.openingCash + data.netCashChange)}
                            bold
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Method Comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Method Comparison — Operating Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Direct Method (IAS 7.18a)</span>
                      </div>
                      <p className="font-mono text-2xl font-bold">
                        <AmountCell amount={data.netDirectOperating} bold />
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Analyzes actual cash receipts and payments
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Indirect Method (IAS 7.18b)</span>
                      </div>
                      <p className="font-mono text-2xl font-bold">
                        <AmountCell amount={data.netIndirectOperating} bold />
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adjusts net income for non-cash items
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> Minor differences between methods may occur due to timing of classification.
                      The Direct Method shows actual cash movements while the Indirect Method derives operating cash flow
                      from accrual-based net income.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};
