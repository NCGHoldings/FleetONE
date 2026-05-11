import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, TrendingUp, DollarSign, Fuel, Bus, Users, Route, Calendar, AlertCircle } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import EnhancedTimeAnalysis from '@/components/trips-analytics/EnhancedTimeAnalysis';
import AIInsightsPanel from '@/components/trips-analytics/AIInsightsPanel';
import ComparisonDashboard from '@/components/trips-analytics/ComparisonDashboard';
import WaterfallChart from '@/components/trips-analytics/charts/WaterfallChart';
import RadarComparisonChart from '@/components/trips-analytics/charts/RadarComparisonChart';
import SankeyFlowChart from '@/components/trips-analytics/charts/SankeyFlowChart';
import CircularRevenueChart from '@/components/trips-analytics/charts/CircularRevenueChart';
import DriverPerformanceSection from '@/components/trips-analytics/DriverPerformanceSection';
import BusFleetSection from '@/components/trips-analytics/BusFleetSection';
import ExpenseAnalyticsSection from '@/components/trips-analytics/ExpenseAnalyticsSection';
import FuelAnalyticsSection from '@/components/trips-analytics/FuelAnalyticsSection';
import AnalyticsErrorBoundary from '@/components/trips-analytics/AnalyticsErrorBoundary';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

function TripsAnalyticsContent() {
  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
    routes?: string[];
    drivers?: string[];
    buses?: string[];
    times?: string[];
    odometerOnly?: boolean;
  }>({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const { session, loading: authLoading } = useAuth();
  // Grace period: auth force-timeout fires at 3s, but session may arrive slightly later
  // Wait 6s before concluding session is truly missing
  const [sessionGraceExpired, setSessionGraceExpired] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSessionGraceExpired(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  const authReady = !authLoading && !!session;

  const { data: analytics, isLoading, error } = useTripsAnalytics(dateRange, authReady);

  // Loading timeout: If loading takes more than 20s, show error with retry
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  useEffect(() => {
    if (isLoading || authLoading) {
      const timer = setTimeout(() => setLoadingTooLong(true), 35000); // 35s — slightly above 30s query timeout
      return () => clearTimeout(timer);
    } else {
      setLoadingTooLong(false);
    }
  }, [isLoading, authLoading]);

  // Debug logging to trace white screen issues
  console.log('[TripsAnalytics] Render state:', { authLoading, hasSession: !!session, authReady, isLoading, hasError: !!error, hasAnalytics: !!analytics, totalTrips: analytics?.overview?.totalTrips });

  // Fetch trips for cascading filter options (past 90 days)
  // Deferred: fires AFTER the main analytics query completes to avoid overloading Supabase
  const { data: allTripsForCascading } = useQuery({
    queryKey: ['all-trips-for-cascading'],
    queryFn: async () => {
      const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('daily_trips')
        .select(`
          trip_date,
          start_time,
          route_id,
          bus_id,
          driver_id,
          buses(bus_no, registration_number),
          routes(route_no, route_name),
          notes
        `)
        .gte('trip_date', ninetyDaysAgo)
        .order('trip_date', { ascending: false })
        .limit(3000);
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false,
    enabled: authReady && !isLoading, // Fire AFTER main query completes
  });

const handleFilterChange = useCallback((filters: any) => {
    setDateRange((prev) => {
      const prevStart = prev.startDate instanceof Date ? prev.startDate.getTime() : 0;
      const prevEnd = prev.endDate instanceof Date ? prev.endDate.getTime() : 0;
      const nextStart = filters.startDate instanceof Date ? filters.startDate.getTime() : 0;
      const nextEnd = filters.endDate instanceof Date ? filters.endDate.getTime() : 0;

      const sameDates = prevStart === nextStart && prevEnd === nextEnd;
      const eq = (a?: string[], b?: string[]) => {
        if (!a && !b) return true;
        if (!a || !b) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      };

      if (
        sameDates &&
        eq(prev.routes, filters.routes) &&
        eq(prev.drivers, filters.drivers) &&
        eq(prev.buses, filters.buses) &&
        eq(prev.times, filters.times) &&
        (prev.odometerOnly ?? false) === (filters.odometerOnly ?? false)
      ) {
        return prev;
      }

      return {
        startDate: filters.startDate,
        endDate: filters.endDate,
        routes: filters.routes,
        drivers: filters.drivers,
        buses: filters.buses,
        times: filters.times,
        odometerOnly: filters.odometerOnly,
      };
    });
  }, []);

  // Extract unique values for filters with readable names
  const { availableRoutes, availableDrivers, availableBuses, availableTimes, routeNameToIdMap, busNameToIdMap, driverNameToIdMap } = useMemo(() => {
    if (!analytics?.rawTrips) {
      return { 
        availableRoutes: [], 
        availableDrivers: [], 
        availableBuses: [],
        availableTimes: [],
        routeNameToIdMap: new Map<string, string>(),
        busNameToIdMap: new Map<string, string>(),
        driverNameToIdMap: new Map<string, string>()
      };
    }
    
    // Create maps for name to ID lookup
    const routeNameToId = new Map<string, string>();
    const busNameToId = new Map<string, string>();
    const driverNameToId = new Map<string, string>();
    
    // Extract route names (e.g., "101 - Jaffna to Moratuwa")
    const routeNames = new Set<string>();
    analytics.rawTrips.forEach(t => {
      if (t.routes) {
        const routeName = `${t.routes.route_no} - ${t.routes.route_name}`;
        routeNames.add(routeName);
        routeNameToId.set(routeName, t.route_id);
      }
    });
    
    // Extract bus numbers (e.g., "NE 2520")
    const busNumbers = new Set<string>();
    analytics.rawTrips.forEach(t => {
      if (t.buses) {
        const busName = t.buses.bus_no || t.buses.registration_number || '';
        if (busName) {
          busNumbers.add(busName);
          busNameToId.set(busName, t.bus_id);
        }
      }
    });
    
    // Safe JSON parse helper to prevent crashes on empty strings
    const safeParseJSON = <T,>(value: any, fallback: T): T => {
      if (value === null || value === undefined || value === '') return fallback;
      if (typeof value === 'object') return value as T;
      try { return JSON.parse(value); } 
      catch { return fallback; }
    };

    // Extract driver names from notes JSON
    const driverNames = new Set<string>();
    analytics.rawTrips.forEach(t => {
      let driverName = '';
      if (t.notes) {
        const notes: Record<string, any> = safeParseJSON(t.notes, {});
        driverName = notes.driver || '';
      }
      if (!driverName && t.profiles) {
        driverName = `${t.profiles.first_name} ${t.profiles.last_name}`.trim();
      }
      if (driverName && driverName !== 'Unknown Driver') {
        driverNames.add(driverName);
        driverNameToId.set(driverName, t.driver_id || driverName);
      }
    });

    // Extract exact start times (e.g., "10:30", "17:00", "19:15")
    const startTimes = new Set<string>();
    analytics.rawTrips.forEach(t => {
      if (t.start_time) {
        // Extract HH:MM from start_time (handles both "HH:MM" and "HH:MM:SS" formats)
        const time = t.start_time.substring(0, 5);
        startTimes.add(time);
      }
    });
    
    // Sort times chronologically
    const sortedTimes = Array.from(startTimes).sort((a, b) => {
      const [aHours, aMinutes] = a.split(':').map(Number);
      const [bHours, bMinutes] = b.split(':').map(Number);
      return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
    });
    
    return {
      availableRoutes: Array.from(routeNames).sort(),
      availableDrivers: Array.from(driverNames).sort(),
      availableBuses: Array.from(busNumbers).sort(),
      availableTimes: sortedTimes,
      routeNameToIdMap: routeNameToId,
      busNameToIdMap: busNameToId,
      driverNameToIdMap: driverNameToId
    };
  }, [analytics]);

  if (error) {
    const isPermissionError = error.message?.includes('permission') || 
                              error.message?.includes('policy') ||
                              error.message?.includes('denied') ||
                              error.message?.includes('RLS');
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{isPermissionError ? 'Access Denied' : 'Failed to Load Analytics'}</AlertTitle>
          <AlertDescription>
            {isPermissionError 
              ? 'You do not have permission to view trip analytics data. Please contact your administrator to request access.'
              : (error.message || 'An error occurred while loading trip analytics data')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If auth finished loading, grace period passed, and still no session → user is not authenticated
  if (!authLoading && !session && sessionGraceExpired) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Expired</AlertTitle>
          <AlertDescription className="flex items-center gap-4">
            <span>Your session has expired or could not be verified. Please refresh to reconnect.</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if ((isLoading || authLoading) && loadingTooLong) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Loading Timeout</AlertTitle>
          <AlertDescription className="flex items-center gap-4">
            <span>Analytics data is taking too long to load. This is usually caused by a network issue.</span>
            <Button variant="outline" size="sm" onClick={() => { setLoadingTooLong(false); window.location.reload(); }}>
              Refresh Page
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || authLoading) {
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

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Analytics Data</AlertTitle>
          <AlertDescription>
            Unable to load analytics data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
          availableTimes={availableTimes}
          rawTrips={allTripsForCascading || []}
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
        availableTimes={availableTimes}
        rawTrips={allTripsForCascading || []}
      />

      {/* Data Quality Alert with Verification */}
      <DataQualityAlert 
        tripsWithExpenses={analytics.tripsWithExpenses || 0}
        totalTrips={analytics.overview.totalTrips}
        totalExpenses={analytics.overview.totalExpenses}
        totalRevenue={analytics.overview.totalIncome}
        netProfit={analytics.overview.netProfit}
        dateRange={dateRange.startDate && dateRange.endDate ? {
          from: dateRange.startDate,
          to: dateRange.endDate
        } : undefined}
        activeFilters={{
          routes: dateRange.routes,
          drivers: dateRange.drivers,
          buses: dateRange.buses,
          times: dateRange.times
        }}
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
          value={`${(analytics.overview.totalDistance ?? 0).toFixed(0)} km`}
          subtitle={`Avg ${(analytics.overview.avgDistancePerTrip ?? 0).toFixed(1)} km/trip`}
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
          value={analytics.overview.totalExpenses ?? 0}
          format="currency"
          subtitle={`${(analytics.overview.profitMargin ?? 0).toFixed(1)}% profit margin`}
          icon={DollarSign}
        />
        <AnimatedKPICard
          title="Fuel Efficiency"
          value={`${(analytics.overview.avgEfficiency ?? 0).toFixed(2)} km/L`}
          subtitle="Fleet average"
          icon={Fuel}
          color={(analytics.overview.avgEfficiency ?? 0) >= 12 ? 'success' : (analytics.overview.avgEfficiency ?? 0) >= 10 ? 'default' : 'warning'}
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="comparison">Compare</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="buses">Buses</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="fuel">Fuel</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Time-Based Analysis Tab */}
        <TabsContent value="time" className="space-y-6">
          <EnhancedTimeAnalysis
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
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <AIInsightsPanel analyticsData={analytics} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Sankey Flow Diagram - Full Width */}
          <SankeyFlowChart
            title="Financial Flow Visualization"
            description="Complete flow from total revenue through all expense categories to net profit"
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

          {/* Waterfall & Circular Revenue in 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WaterfallChart
              title="Profit Waterfall Analysis"
              description="Step-by-step breakdown from income to profit"
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
            
            <CircularRevenueChart
              title="Top Routes Revenue"
              description="Revenue distribution by route performance"
              data={analytics.routeStats.map(r => ({
                name: r.routeName,
                value: r.totalIncome,
                id: r.routeNo
              }))}
              type="routes"
            />
          </div>

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
                  <span className="text-lg font-bold">Rs {(analytics.overview.avgIncomePerTrip ?? 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Fuel Cost Share</span>
                  <span className="text-lg font-bold">{(analytics.expenseBreakdown.fuelPercentage ?? 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Total Fuel Cost</span>
                  <span className="text-lg font-bold">Rs {analytics.overview.totalFuelCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Other Expenses</span>
                  <span className="text-lg font-bold">Rs {analytics.overview.totalOtherExpenses.toLocaleString()}</span>
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
                      <TableCell className="text-right">{(route.totalDistance ?? 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right">Rs {(route.totalIncome ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">Rs {(route.totalExpenses ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">Rs {(route.netIncome ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={(route.profitMargin ?? 0) >= 30 ? 'text-green-600' : (route.profitMargin ?? 0) >= 20 ? 'text-yellow-600' : 'text-red-600'}>
                          {(route.profitMargin ?? 0).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{(route.avgEfficiency ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-6">
          <DriverPerformanceSection driverStats={analytics.driverStats} />
        </TabsContent>

        {/* Buses Tab */}
        <TabsContent value="buses" className="space-y-6">
          <BusFleetSection busStats={analytics.busStats} />
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <ExpenseAnalyticsSection 
            expenseBreakdown={analytics.expenseBreakdown}
            overview={analytics.overview}
            dailyTrends={analytics.dailyTrends}
          />
        </TabsContent>

        {/* Fuel Tab */}
        <TabsContent value="fuel" className="space-y-6">
          <FuelAnalyticsSection rawTrips={analytics.rawTrips} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <RevenueTrendChart data={analytics.dailyTrends} />
          <EfficiencyChart data={analytics.dailyTrends} />
          <Card className="p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Daily Performance Data</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Income</TableHead>
                    <TableHead className="text-right">Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.dailyTrends.map((day) => (
                    <TableRow key={day.date} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell className="text-right">{day.trips}</TableCell>
                      <TableCell className="text-right">{(day.distance ?? 0).toFixed(1)} km</TableCell>
                      <TableCell className="text-right">Rs {(day.income ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">Rs {(day.expenses ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${(day.netIncome ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Rs {(day.netIncome ?? 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{(day.avgEfficiency ?? 0).toFixed(2)} km/L</TableCell>
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

export default function TripsAnalytics() {
  return (
    <AnalyticsErrorBoundary fallbackMessage="Failed to render the Trip Analytics dashboard. Please try refreshing the page.">
      <React.Suspense fallback={
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
      }>
        <TripsAnalyticsContent />
      </React.Suspense>
    </AnalyticsErrorBoundary>
  );
}
