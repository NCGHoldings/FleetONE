import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, TrendingUp, Activity, Gauge, RefreshCw, Loader2, 
  Truck, Fuel, Map, Zap, Clock, Target
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TrackPlayback from '@/components/fleet/TrackPlayback';
import FleetDistanceChart from '@/components/fleet/FleetDistanceChart';
import FleetEfficiencyChart from '@/components/fleet/FleetEfficiencyChart';
import FuelDashboard from '@/components/fleet/FuelDashboard';
import DriverLeaderboard from '@/components/fleet/DriverLeaderboard';
import FastestBusLeaderboard from '@/components/fleet/FastestBusLeaderboard';
import OdometerTrendsChart from '@/components/fleet/OdometerTrendsChart';
import DailyMileageChart from '@/components/fleet/DailyMileageChart';
import SpeedDistributionChart from '@/components/fleet/SpeedDistributionChart';
import { AdvancedFleetKPIs } from '@/components/fleet/AdvancedFleetKPIs';
import FleetUtilizationChart from '@/components/fleet/FleetUtilizationChart';
import FleetPerformanceRadar from '@/components/fleet/FleetPerformanceRadar';
import BusComparisonChart from '@/components/fleet/BusComparisonChart';
import HourlyActivityHeatmap from '@/components/fleet/HourlyActivityHeatmap';
import RealTimeFleetStatus from '@/components/fleet/RealTimeFleetStatus';
import { FleetMasterDataBreakdown } from '@/components/fleet/FleetMasterDataBreakdown';
import { useFleetAnalytics } from '@/hooks/useFleetAnalytics';
import { addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function FleetAnalytics() {
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);
  const [dateRangeDays, setDateRangeDays] = useState(7);
  
  const dateRange = {
    start: addDays(new Date(), -dateRangeDays),
    end: new Date(),
  };

  const {
    kpis,
    kpisLoading,
    fastestBuses,
    fastestLoading,
    odometerTrends,
    odometerLoading,
    speedDistribution,
    speedDistLoading,
    refetch,
  } = useFleetAnalytics(dateRange);

  const handleRefreshAnalytics = async () => {
    setIsAggregating(true);
    try {
      const { data, error } = await supabase.functions.invoke('aggregate-fleet-analytics', {
        body: {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        },
      });

      if (error) throw error;

      toast.success(`Analytics refreshed: ${data.records_created} records created`);
      refetch();
    } catch (error) {
      console.error('Aggregation error:', error);
      toast.error('Failed to refresh analytics');
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Fleet Analytics Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Real-time insights • Performance metrics • Comprehensive fleet data
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border bg-card p-1">
              {[7, 30, 90].map(days => (
                <Button
                  key={days}
                  onClick={() => setDateRangeDays(days)}
                  variant={dateRangeDays === days ? 'default' : 'ghost'}
                  size="sm"
                  className="px-4"
                >
                  {days} Days
                </Button>
              ))}
            </div>
            <Button
              onClick={handleRefreshAnalytics}
              disabled={isAggregating}
              className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              {isAggregating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aggregating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh Analytics
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced KPIs */}
        <AdvancedFleetKPIs kpis={kpis} isLoading={kpisLoading} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto bg-card border shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="live-status" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Truck className="h-4 w-4" />
              Live Status
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="speed-analysis" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Gauge className="h-4 w-4" />
              Speed Analysis
            </TabsTrigger>
            <TabsTrigger value="fuel" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Fuel className="h-4 w-4" />
              Fuel
            </TabsTrigger>
            <TabsTrigger value="playback" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map className="h-4 w-4" />
              Track Playback
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Enhanced */}
          <TabsContent value="overview" className="space-y-6">
            <FleetMasterDataBreakdown />
            
            <div className="grid gap-6 lg:grid-cols-2 mt-6">
              <FleetUtilizationChart />
              <FleetPerformanceRadar />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <FleetDistanceChart />
              <DailyMileageChart data={odometerTrends} isLoading={odometerLoading} />
            </div>
            <HourlyActivityHeatmap />
          </TabsContent>

          {/* Live Status Tab - NEW */}
          <TabsContent value="live-status" className="space-y-6">
            <RealTimeFleetStatus />
            <div className="grid gap-6 lg:grid-cols-2">
              <FleetUtilizationChart />
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Fleet Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-500/20">
                          <Zap className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="font-medium">Active Operations</span>
                      </div>
                      <Badge className="bg-green-500 text-white">{kpis?.activeVehicles || 0} Buses</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-500/20">
                          <Target className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium">Total Distance Today</span>
                      </div>
                      <span className="text-xl font-bold text-blue-600">{kpis?.totalDistance || 0} km</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-500/20">
                          <Gauge className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="font-medium">Average Fleet Speed</span>
                      </div>
                      <span className="text-xl font-bold text-purple-600">{kpis?.avgSpeed || 0} km/h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab - Enhanced */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FleetPerformanceRadar />
              <BusComparisonChart />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <FastestBusLeaderboard buses={fastestBuses} isLoading={fastestLoading} />
              <DriverLeaderboard />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <FleetEfficiencyChart />
              <OdometerTrendsChart data={odometerTrends} isLoading={odometerLoading} />
            </div>
          </TabsContent>

          {/* Speed Analysis Tab - Enhanced */}
          <TabsContent value="speed-analysis" className="space-y-6">
            <SpeedDistributionChart data={speedDistribution} isLoading={speedDistLoading} />
            <div className="grid gap-6 lg:grid-cols-2">
              <FastestBusLeaderboard buses={fastestBuses} isLoading={fastestLoading} />
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Speed Insights & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="font-semibold text-green-700 dark:text-green-400">Safe Driving (0-30 km/h)</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ideal for urban areas and congested routes. Represents controlled, safe operation.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <span className="font-semibold text-yellow-700 dark:text-yellow-400">Moderate Speed (30-60 km/h)</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Optimal for most routes. Balances efficiency with safety for passenger comfort.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Fast Driving (60-90 km/h)</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Highway speeds. Monitor fuel consumption and ensure driver alertness.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <span className="font-semibold text-red-700 dark:text-red-400">Excessive Speed (90+ km/h)</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Dangerous! Immediate driver coaching required. Review incidents and implement speed limits.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fuel Tab */}
          <TabsContent value="fuel" className="space-y-6">
            <FuelDashboard />
          </TabsContent>

          {/* Track Playback Tab */}
          <TabsContent value="playback" className="space-y-6">
            <TrackPlayback selectedBusId={selectedBus} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
