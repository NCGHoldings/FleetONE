import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, TrendingUp, DollarSign, Fuel, Bus, Users, Route, Calendar, AlertCircle } from 'lucide-react';
import { subDays } from 'date-fns';
import { useTripsAnalytics } from '@/hooks/useTripsAnalytics';
import AnimatedKPICard from '@/components/trips-analytics/AnimatedKPICard';
import AdvancedFilterPanel from '@/components/trips-analytics/AdvancedFilterPanel';
import InsightsPanel from '@/components/trips-analytics/InsightsPanel';
import ExportDialog from '@/components/trips-analytics/ExportDialog';
import RevenueTrendChart from '@/components/trips-analytics/charts/RevenueTrendChart';
import EfficiencyChart from '@/components/trips-analytics/charts/EfficiencyChart';
import DriverComparisonChart from '@/components/trips-analytics/charts/DriverComparisonChart';
import RoutePerformanceChart from '@/components/trips-analytics/charts/RoutePerformanceChart';
import ExpenseDistributionChart from '@/components/trips-analytics/charts/ExpenseDistributionChart';
import DataQualityAlert from '@/components/trips-analytics/DataQualityAlert';
import TimeBasedAnalysis from '@/components/trips-analytics/TimeBasedAnalysis';
import AIInsightsPanel from '@/components/trips-analytics/AIInsightsPanel';
import ComparisonDashboard from '@/components/trips-analytics/ComparisonDashboard';
import WaterfallChart from '@/components/trips-analytics/charts/WaterfallChart';
import RadarComparisonChart from '@/components/trips-analytics/charts/RadarComparisonChart';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export default function TripsAnalytics() {
  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
    routes?: string[];
    drivers?: string[];
    buses?: string[];
  }>({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const { data: analytics, isLoading, error } = useTripsAnalytics(dateRange);

  const handleFilterChange = (filters: any) => {
    setDateRange({
      startDate: filters.startDate,
      endDate: filters.endDate,
      routes: filters.routes,
      drivers: filters.drivers,
      buses: filters.buses
    });
  };

  // Extract unique values for filters
  const { availableRoutes, availableDrivers, availableBuses } = useMemo(() => {
    if (!analytics?.rawTrips) {
      return { availableRoutes: [], availableDrivers: [], availableBuses: [] };
    }
    
    return {
      availableRoutes: [...new Set(analytics.rawTrips.map(t => t.route_id).filter(Boolean))],
      availableDrivers: [...new Set(analytics.rawTrips.map(t => t.driver_id).filter(Boolean))],
      availableBuses: [...new Set(analytics.rawTrips.map(t => t.bus_id).filter(Boolean))]
    };
  }, [analytics]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Load Analytics</AlertTitle>
          <AlertDescription>
            {error.message || 'An error occurred while loading trip analytics data'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  // Show empty state if no trips found
  if (analytics.overview.totalTrips === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Trip Analytics</h1>
        </div>
        <AdvancedFilterPanel
          onFilterChange={handleFilterChange}
          availableRoutes={availableRoutes}
          availableDrivers={availableDrivers}
          availableBuses={availableBuses}
        />
        <Card className="mt-6 p-12">
          <div className="text-center space-y-4">
            <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold">No Trips Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No trip data available for the selected period. Try expanding your date range or adjusting your filters.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Advanced Trip Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Enterprise-grade insights with predictive analytics and visualizations
          </p>
        </div>
        <Button onClick={() => setExportDialogOpen(true)}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </motion.div>

      {/* Advanced Filter Panel */}
      <AdvancedFilterPanel 
        onFilterChange={handleFilterChange}
        availableRoutes={availableRoutes}
        availableDrivers={availableDrivers}
        availableBuses={availableBuses}
      />

      {/* Data Quality Alert */}
      <DataQualityAlert 
        tripsWithExpenses={analytics.tripsWithExpenses || 0}
        totalTrips={analytics.overview.totalTrips}
      />

      {/* Animated KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedKPICard
          title="Total Trips"
          value={analytics.overview.totalTrips}
          icon={Calendar}
          trend={analytics.overview.tripsChange}
          trendLabel="vs last period"
          color={analytics.overview.tripsChange > 0 ? 'success' : analytics.overview.tripsChange < 0 ? 'warning' : 'default'}
        />
        <AnimatedKPICard
          title="Total Distance"
          value={`${analytics.overview.totalDistance.toFixed(0)} km`}
          subtitle={`Avg ${analytics.overview.avgDistancePerTrip.toFixed(1)} km/trip`}
          icon={Route}
        />
        <AnimatedKPICard
          title="Total Revenue"
          value={analytics.overview.totalIncome}
          format="currency"
          icon={DollarSign}
          trend={analytics.overview.incomeChange}
          trendLabel="vs last period"
          color={analytics.overview.incomeChange > 0 ? 'success' : analytics.overview.incomeChange < 0 ? 'error' : 'default'}
        />
        <AnimatedKPICard
          title="Net Profit"
          value={analytics.overview.netProfit}
          format="currency"
          icon={TrendingUp}
          trend={analytics.overview.profitChange}
          trendLabel="vs last period"
          color={analytics.overview.netProfit > 0 ? 'success' : 'error'}
        />
        <AnimatedKPICard
          title="Total Expenses"
          value={analytics.overview.totalExpenses}
          format="currency"
          subtitle={`${analytics.overview.profitMargin.toFixed(1)}% profit margin`}
          icon={DollarSign}
        />
        <AnimatedKPICard
          title="Fuel Efficiency"
          value={`${analytics.overview.avgEfficiency.toFixed(2)} km/L`}
          subtitle="Fleet average"
          icon={Fuel}
          color={analytics.overview.avgEfficiency >= 12 ? 'success' : analytics.overview.avgEfficiency >= 10 ? 'default' : 'warning'}
        />
        <AnimatedKPICard
          title="Active Buses"
          value={analytics.overview.activeBuses}
          subtitle="In operation"
          icon={Bus}
        />
        <AnimatedKPICard
          title="Completion Rate"
          value={analytics.overview.completionRate}
          format="percentage"
          icon={Users}
          color="success"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="comparison">Compare</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="buses">Buses</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Time-Based Analysis Tab */}
        <TabsContent value="time" className="space-y-6">
          <TimeBasedAnalysis
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            branchId={undefined}
          />
        </TabsContent>

        {/* Comparison Dashboard Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid gap-6">
            {/* Radar Charts for Multi-Dimensional Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RadarComparisonChart
                title="Top Drivers Performance"
                description="Multi-dimensional comparison of top 5 drivers"
                items={analytics.driverStats.map(d => ({
                  id: d.driverId,
                  name: d.driverName,
                  income: d.totalIncome,
                  expenses: d.totalExpenses,
                  trips: d.totalTrips,
                  efficiency: d.avgEfficiency,
                }))}
                type="drivers"
              />
              <RadarComparisonChart
                title="Top Routes Performance"
                description="Multi-dimensional comparison of top 5 routes"
                items={analytics.routeStats.map(r => ({
                  id: r.routeNo,
                  name: r.routeName,
                  income: r.totalIncome,
                  expenses: r.totalExpenses,
                  trips: r.totalTrips,
                  efficiency: r.avgEfficiency,
                }))}
                type="routes"
              />
            </div>

            {/* Side-by-Side Comparison */}
            <ComparisonDashboard
              drivers={analytics.driverStats.map(d => ({
                id: d.driverId,
                name: d.driverName,
                income: d.totalIncome,
                expenses: d.totalExpenses,
                netProfit: d.netIncome,
                trips: d.totalTrips,
                efficiency: d.avgEfficiency,
              }))}
              routes={analytics.routeStats.map(r => ({
                id: r.routeNo,
                name: r.routeName,
                income: r.totalIncome,
                expenses: r.totalExpenses,
                netProfit: r.netIncome,
                trips: r.totalTrips,
                efficiency: 0,
              }))}
              buses={analytics.busStats.map(b => ({
                id: b.busNo,
                name: b.busNo,
                income: b.totalIncome,
                expenses: b.totalExpenses,
                netProfit: b.netIncome,
                trips: b.totalTrips,
                efficiency: b.avgEfficiency,
              }))}
            />
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <AIInsightsPanel analyticsData={analytics} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Waterfall Chart */}
          <WaterfallChart
            title="Profit Waterfall Analysis"
            description="Visual breakdown showing how income flows to net profit"
            data={{
              totalIncome: analytics.overview.totalIncome,
              fuelCost: analytics.expenseBreakdown.fuel,
              tollCost: analytics.expenseBreakdown.toll,
              repairCost: analytics.expenseBreakdown.repair,
              salaries: analytics.expenseBreakdown.salaries,
              permits: analytics.expenseBreakdown.permits,
              otherExpenses: analytics.expenseBreakdown.other,
              netProfit: analytics.overview.netProfit
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RevenueTrendChart data={analytics.dailyTrends} />
              <EfficiencyChart data={analytics.dailyTrends} />
            </div>
            <div>
              <InsightsPanel insights={analytics.insights} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseDistributionChart data={analytics.expenseBreakdown} />
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Avg Income per Trip</span>
                  <span className="text-lg font-bold">₨{analytics.overview.avgIncomePerTrip.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Fuel Cost Share</span>
                  <span className="text-lg font-bold">{analytics.expenseBreakdown.fuelPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Total Fuel Cost</span>
                  <span className="text-lg font-bold">₨{analytics.overview.totalFuelCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Other Expenses</span>
                  <span className="text-lg font-bold">₨{analytics.overview.totalOtherExpenses.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="routes" className="space-y-6">
          <RoutePerformanceChart data={analytics.routeStats} />
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Route Performance Details</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Distance (km)</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Income</TableHead>
                    <TableHead className="text-right">Profit Margin</TableHead>
                    <TableHead className="text-right">Avg km/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.routeStats.map((route) => (
                    <TableRow key={route.routeNo}>
                      <TableCell className="font-medium">{route.routeName}</TableCell>
                      <TableCell className="text-right">{route.totalTrips}</TableCell>
                      <TableCell className="text-right">{route.totalDistance.toFixed(1)}</TableCell>
                      <TableCell className="text-right">₨{route.totalIncome.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₨{route.totalExpenses.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">₨{route.netIncome.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={route.profitMargin >= 30 ? 'text-green-600' : route.profitMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}>
                          {route.profitMargin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{route.avgEfficiency.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-6">
          <DriverComparisonChart data={analytics.driverStats} />
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Driver Leaderboard</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Distance (km)</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Income</TableHead>
                    <TableHead className="text-right">Avg km/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.driverStats.map((driver) => (
                    <TableRow key={driver.driverId}>
                      <TableCell>
                        <span className={`font-bold ${driver.rank <= 3 ? 'text-primary' : ''}`}>
                          {driver.rank <= 3 ? ['🥇', '🥈', '🥉'][driver.rank - 1] : `#${driver.rank}`}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{driver.driverName}</TableCell>
                      <TableCell className="text-right">{driver.totalTrips}</TableCell>
                      <TableCell className="text-right">{driver.totalDistance.toFixed(1)}</TableCell>
                      <TableCell className="text-right">₨{driver.totalIncome.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₨{driver.totalExpenses.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">₨{driver.netIncome.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={driver.avgEfficiency >= 12 ? 'text-green-600' : driver.avgEfficiency >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                          {driver.avgEfficiency.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Buses Tab */}
        <TabsContent value="buses" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Fleet Performance</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bus No</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Distance (km)</TableHead>
                    <TableHead className="text-right">Current Odo</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Avg km/L</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                    <TableHead className="text-right">Last Trip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.busStats.map((bus) => (
                    <TableRow key={bus.busNo}>
                      <TableCell className="font-medium">{bus.busNo}</TableCell>
                      <TableCell className="text-right">{bus.totalTrips}</TableCell>
                      <TableCell className="text-right">{bus.totalDistance.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{bus.currentOdo.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₨{bus.totalIncome.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{bus.avgEfficiency.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{bus.utilizationRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{bus.lastTripDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseDistributionChart data={analytics.expenseBreakdown} />
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Expense Summary</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Total Fuel Cost</span>
                    <span className="font-bold">₨{analytics.overview.totalFuelCost.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full" 
                      style={{ width: `${analytics.expenseBreakdown.fuelPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.expenseBreakdown.fuelPercentage.toFixed(1)}% of total expenses
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Other Expenses</span>
                    <span className="font-bold">₨{analytics.overview.totalOtherExpenses.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-chart-2 h-full" 
                      style={{ width: `${analytics.expenseBreakdown.otherPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.expenseBreakdown.otherPercentage.toFixed(1)}% of total expenses
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Total Expenses</span>
                    <span className="text-xl font-bold">₨{analytics.overview.totalExpenses.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost per Trip</span>
                    <span className="font-semibold">
                      ₨{analytics.overview.totalTrips > 0 ? (analytics.overview.totalExpenses / analytics.overview.totalTrips).toFixed(0) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Cost per Kilometer</span>
                    <span className="font-semibold">
                      ₨{analytics.overview.totalDistance > 0 ? (analytics.overview.totalExpenses / analytics.overview.totalDistance).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <RevenueTrendChart data={analytics.dailyTrends} />
          <EfficiencyChart data={analytics.dailyTrends} />
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Performance Data</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Distance (km)</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Income</TableHead>
                    <TableHead className="text-right">Avg km/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.dailyTrends.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{day.date}</TableCell>
                      <TableCell className="text-right">{day.trips}</TableCell>
                      <TableCell className="text-right">{day.distance.toFixed(1)}</TableCell>
                      <TableCell className="text-right">₨{day.income.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₨{day.expenses.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={day.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ₨{day.netIncome.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{day.avgEfficiency.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        data={analytics}
        dateRange={{ from: dateRange.startDate, to: dateRange.endDate }}
      />
    </div>
  );
}
