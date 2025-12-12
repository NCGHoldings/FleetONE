import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent, Bus, Route, Database } from "lucide-react";
import { TrendDataPoint } from "@/hooks/useCrossComparisonAnalytics";
import { formatLKR, formatLKRCompact } from "@/lib/currency";
import { format, parseISO } from "date-fns";

interface CrossComparisonTrendChartsProps {
  trendData: TrendDataPoint[];
  byBus: Record<string, TrendDataPoint[]>;
  byRoute: Record<string, TrendDataPoint[]>;
  totals: {
    totalRevenue: number;
    totalExpenses: number;
    totalNetProfit: number;
    avgProfitMargin: number;
    totalTrips: number;
    totalFuelCost: number;
    totalFuelLiters: number;
    avgEfficiency: number;
  };
  dataSourceInfo: {
    totalRecords: number;
    filteredRecords: number;
    dateRange: string;
  };
  selectedBuses: string[];
  selectedRoutes: string[];
}

const CHART_COLORS = {
  revenue: "hsl(221, 83%, 53%)",
  expenses: "hsl(0, 72%, 51%)",
  netProfit: "hsl(142, 71%, 45%)",
  profitMargin: "hsl(280, 68%, 50%)",
  trips: "hsl(45, 93%, 47%)",
};

const ENTITY_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(280, 68%, 50%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 72%, 51%)",
  "hsl(180, 68%, 45%)",
  "hsl(330, 68%, 50%)",
  "hsl(60, 68%, 45%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  // Get the original ISO date from payload data, fallback to label
  const originalDate = payload[0]?.payload?.date;
  let formattedDate = label;
  
  if (originalDate) {
    try {
      formattedDate = format(parseISO(originalDate), 'MMM dd, yyyy');
    } catch {
      formattedDate = label;
    }
  }

  return (
    <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-medium text-sm mb-2">{formattedDate}</p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-medium">
              {entry.name.includes('Margin') || entry.name.includes('%') 
                ? `${entry.value?.toFixed(1)}%`
                : entry.name.includes('Trips')
                ? entry.value
                : formatLKR(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CrossComparisonTrendCharts({
  trendData,
  byBus,
  byRoute,
  totals,
  dataSourceInfo,
  selectedBuses,
  selectedRoutes,
}: CrossComparisonTrendChartsProps) {
  // Prepare chart data with formatted dates
  const chartData = useMemo(() => {
    return trendData.map(point => ({
      ...point,
      dateLabel: format(parseISO(point.date), 'MMM dd'),
    }));
  }, [trendData]);

  // Prepare multi-entity comparison data
  const multiEntityData = useMemo(() => {
    if (selectedBuses.length === 0 && selectedRoutes.length === 0) {
      return chartData;
    }

    // Get all unique dates
    const allDates = new Set<string>();
    Object.values(byBus).forEach(data => data.forEach(d => allDates.add(d.date)));
    Object.values(byRoute).forEach(data => data.forEach(d => allDates.add(d.date)));
    
    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(date => {
      const result: any = { 
        date, 
        dateLabel: format(parseISO(date), 'MMM dd') 
      };

      // Add bus data
      selectedBuses.forEach(busName => {
        const busData = byBus[busName]?.find(d => d.date === date);
        result[`${busName}_revenue`] = busData?.revenue || 0;
        result[`${busName}_netProfit`] = busData?.netProfit || 0;
        result[`${busName}_trips`] = busData?.tripCount || 0;
      });

      // Add route data
      selectedRoutes.forEach(routeName => {
        const routeData = byRoute[routeName]?.find(d => d.date === date);
        const shortName = routeName.split(' - ')[0];
        result[`${shortName}_revenue`] = routeData?.revenue || 0;
        result[`${shortName}_netProfit`] = routeData?.netProfit || 0;
        result[`${shortName}_trips`] = routeData?.tripCount || 0;
      });

      return result;
    });
  }, [chartData, byBus, byRoute, selectedBuses, selectedRoutes]);

  const hasMultipleEntities = selectedBuses.length > 0 || selectedRoutes.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatLKRCompact(totals.totalRevenue)}
                </p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatLKRCompact(totals.totalExpenses)}
                </p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${totals.totalNetProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>
                  {formatLKRCompact(totals.totalNetProfit)}
                </p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totals.avgProfitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-full">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Source Info */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700">
          <Database className="h-3 w-3 mr-1" />
          {dataSourceInfo.filteredRecords} trips from daily_trips table
        </Badge>
        <span className="text-xs text-muted-foreground">{dataSourceInfo.dateRange}</span>
      </div>

      {/* Chart Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="margin">Margin %</TabsTrigger>
          <TabsTrigger value="comparison">Compare</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Combined Chart */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Revenue, Expenses & Profit Trends</CardTitle>
              <CardDescription>Daily breakdown of all key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="dateLabel" 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => formatLKRCompact(v)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue"
                      fill="url(#revenueGradient)" 
                      stroke={CHART_COLORS.revenue}
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="expenses" 
                      name="Expenses"
                      stroke={CHART_COLORS.expenses}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="netProfit" 
                      name="Net Profit"
                      stroke={CHART_COLORS.netProfit}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="tripCount" 
                      name="Trips"
                      fill={CHART_COLORS.trips}
                      opacity={0.5}
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue with area visualization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatLKRCompact(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue"
                      fill="url(#revenueAreaGradient)" 
                      stroke={CHART_COLORS.revenue}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit Tab */}
        <TabsContent value="profit">
          <Card>
            <CardHeader>
              <CardTitle>Net Profit Trend</CardTitle>
              <CardDescription>Daily net profit with positive/negative zones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="profitPosGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.netProfit} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={CHART_COLORS.netProfit} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatLKRCompact(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="netProfit" 
                      name="Net Profit"
                      fill="url(#profitPosGradient)" 
                      stroke={CHART_COLORS.netProfit}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Margin Tab */}
        <TabsContent value="margin">
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin % Trend</CardTitle>
              <CardDescription>Daily profit margin percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="profitMargin" 
                      name="Profit Margin %"
                      stroke={CHART_COLORS.profitMargin}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.profitMargin, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab - Multi Entity */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5 text-blue-500" />
                <Route className="h-5 w-5 text-green-500" />
                Multi-Entity Comparison
              </CardTitle>
              <CardDescription>
                {hasMultipleEntities 
                  ? `Comparing ${selectedBuses.length} buses and ${selectedRoutes.length} routes`
                  : 'Select buses or routes from filters to compare'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasMultipleEntities ? (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Bus className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Select buses or routes from the filter panel above to see comparison charts</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Revenue Comparison */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Revenue Comparison</h4>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={multiEntityData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatLKRCompact(v)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          {selectedBuses.map((bus, index) => (
                            <Line 
                              key={bus}
                              type="monotone" 
                              dataKey={`${bus}_revenue`} 
                              name={`${bus} Revenue`}
                              stroke={ENTITY_COLORS[index % ENTITY_COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                            />
                          ))}
                          {selectedRoutes.map((route, index) => {
                            const shortName = route.split(' - ')[0];
                            return (
                              <Line 
                                key={route}
                                type="monotone" 
                                dataKey={`${shortName}_revenue`} 
                                name={`${shortName} Revenue`}
                                stroke={ENTITY_COLORS[(selectedBuses.length + index) % ENTITY_COLORS.length]}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Net Profit Comparison */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Net Profit Comparison</h4>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={multiEntityData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatLKRCompact(v)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                          {selectedBuses.map((bus, index) => (
                            <Line 
                              key={bus}
                              type="monotone" 
                              dataKey={`${bus}_netProfit`} 
                              name={`${bus} Profit`}
                              stroke={ENTITY_COLORS[index % ENTITY_COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                            />
                          ))}
                          {selectedRoutes.map((route, index) => {
                            const shortName = route.split(' - ')[0];
                            return (
                              <Line 
                                key={route}
                                type="monotone" 
                                dataKey={`${shortName}_netProfit`} 
                                name={`${shortName} Profit`}
                                stroke={ENTITY_COLORS[(selectedBuses.length + index) % ENTITY_COLORS.length]}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
