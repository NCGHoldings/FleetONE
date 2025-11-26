import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, ShoppingCart, Download, TrendingUp, BarChart3, LineChart } from "lucide-react";
import { SalesSummaryTable } from "@/components/nsp/SalesSummaryTable";
import { EnhancedExportModal } from "@/components/nsp/EnhancedExportModal";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { useNSPSalesAnalytics } from "@/hooks/useNSPSalesAnalytics";
import { SalesTrendChart } from "@/components/nsp/charts/SalesTrendChart";
import { CategoryDistributionChart } from "@/components/nsp/charts/CategoryDistributionChart";
import { CategoryComparisonChart } from "@/components/nsp/charts/CategoryComparisonChart";
import { DayOfWeekChart } from "@/components/nsp/charts/DayOfWeekChart";
import { MonthlyTrendChart } from "@/components/nsp/charts/MonthlyTrendChart";
import { TyreSalesBreakdown } from "@/components/nsp/charts/TyreSalesBreakdown";
import { InsightsPanel } from "@/components/nsp/InsightsPanel";
import { KPICard } from "@/components/dashboard/KPICard";

const NSPSalesSummary = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [showExportModal, setShowExportModal] = useState(false);

  const { data: analytics, isLoading } = useNSPSalesAnalytics(dateRange);

  const combinedTrendData = analytics 
    ? [...analytics.dailyTrend, ...analytics.predictions] 
    : [];

  const formatCurrency = (value: number) => `LKR ${value.toLocaleString()}`;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg">
            <FileSpreadsheet className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">NSP Sales Analytics & Reports</h1>
            <p className="text-muted-foreground">Comprehensive sales insights and trend analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/nsp-daily-sales')}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Daily Sales Entry
          </Button>
          <Button onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <DateRangePicker
          onDateRangeChange={(range) => {
            if (range?.from && range?.to) {
              setDateRange({ from: range.from, to: range.to });
            }
          }}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Detailed Analytics
          </TabsTrigger>
          <TabsTrigger value="performance">
            <LineChart className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="data">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Data Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">Loading analytics...</div>
          ) : analytics ? (
            <>
              {/* Enhanced KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Total Sales"
                  value={formatCurrency(analytics.totalSales)}
                  icon={<FileSpreadsheet className="h-5 w-5" />}
                  change={`${analytics.growthRate > 0 ? '+' : ''}${analytics.growthRate.toFixed(1)}%`}
                  changeType={analytics.growthRate > 0 ? 'positive' : analytics.growthRate < 0 ? 'negative' : 'neutral'}
                  description="vs. previous period"
                />
                <KPICard
                  title="Average Daily Sales"
                  value={formatCurrency(analytics.avgDailySales)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  description={`${analytics.daysRecorded} days recorded`}
                />
                <KPICard
                  title="7-Day Forecast"
                  value={formatCurrency(analytics.movingAverage7)}
                  icon={<LineChart className="h-5 w-5" />}
                  description="Predicted avg daily sales"
                />
                <KPICard
                  title="Top Category"
                  value={analytics.topCategory ? analytics.topCategory[0] : 'N/A'}
                  icon={<BarChart3 className="h-5 w-5" />}
                  description={analytics.topCategory ? formatCurrency(analytics.topCategory[1]) : ''}
                />
              </div>

              {/* Insights Panel */}
              <InsightsPanel insights={analytics.insights} />

              {/* Main Charts */}
              <SalesTrendChart data={combinedTrendData} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryDistributionChart data={analytics.categoryTotals} />
                <CategoryComparisonChart data={analytics.categoryTotals} />
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">Loading analytics...</div>
          ) : analytics ? (
            <>
              <SalesTrendChart data={analytics.dailyTrend} showCategories />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyTrendChart data={analytics.monthlyTrend} />
                <DayOfWeekChart data={analytics.dayOfWeekAnalysis} />
              </div>

              <TyreSalesBreakdown data={analytics.tyreBreakdown} />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">Loading performance data...</div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Best Performing Day</CardTitle>
                    <CardDescription>Highest single-day sales</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.bestDay ? (
                      <div className="space-y-2">
                        <p className="text-3xl font-bold text-green-600">
                          {formatCurrency(analytics.bestDay.total_sale)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(analytics.bestDay.sale_date).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No data</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lowest Performing Day</CardTitle>
                    <CardDescription>Needs attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.worstDay ? (
                      <div className="space-y-2">
                        <p className="text-3xl font-bold text-red-600">
                          {formatCurrency(analytics.worstDay.total_sale)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(analytics.worstDay.sale_date).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No data</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <DayOfWeekChart data={analytics.dayOfWeekAnalysis} />
              <CategoryComparisonChart data={analytics.categoryTotals} />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Sales Data Records</CardTitle>
              <CardDescription>Detailed daily sales breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesSummaryTable dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EnhancedExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        dateRange={dateRange}
        analytics={analytics}
      />
    </div>
  );
};

export default NSPSalesSummary;
