import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Activity, Gauge, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TrackPlayback from '@/components/fleet/TrackPlayback';
import FleetDistanceChart from '@/components/fleet/FleetDistanceChart';
import FleetEfficiencyChart from '@/components/fleet/FleetEfficiencyChart';
import FuelDashboard from '@/components/fleet/FuelDashboard';
import DriverLeaderboard from '@/components/fleet/DriverLeaderboard';
import { FleetAnalyticsKPIs } from '@/components/fleet/FleetAnalyticsKPIs';
import FastestBusLeaderboard from '@/components/fleet/FastestBusLeaderboard';
import OdometerTrendsChart from '@/components/fleet/OdometerTrendsChart';
import DailyMileageChart from '@/components/fleet/DailyMileageChart';
import SpeedDistributionChart from '@/components/fleet/SpeedDistributionChart';
import { useFleetAnalytics } from '@/hooks/useFleetAnalytics';
import { addDays } from 'date-fns';

export default function FleetAnalytics() {
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);
  const [dateRangeDays, setDateRangeDays] = useState(7);
  
  // Calculate date range based on selected days
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
      
      // Refetch all analytics data
      refetch();
    } catch (error) {
      console.error('Aggregation error:', error);
      toast.error('Failed to refresh analytics');
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Fleet Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time analytics, performance insights, and comprehensive fleet data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button
                onClick={() => setDateRangeDays(7)}
                variant={dateRangeDays === 7 ? 'default' : 'outline'}
                size="sm"
              >
                7 Days
              </Button>
              <Button
                onClick={() => setDateRangeDays(30)}
                variant={dateRangeDays === 30 ? 'default' : 'outline'}
                size="sm"
              >
                30 Days
              </Button>
              <Button
                onClick={() => setDateRangeDays(90)}
                variant={dateRangeDays === 90 ? 'default' : 'outline'}
                size="sm"
              >
                90 Days
              </Button>
            </div>
            <Button
              onClick={handleRefreshAnalytics}
              disabled={isAggregating}
              variant="outline"
              className="gap-2"
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

        {/* Real KPIs */}
        <FleetAnalyticsKPIs kpis={kpis} isLoading={kpisLoading} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="speed-analysis" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Speed Analysis
            </TabsTrigger>
            <TabsTrigger value="fuel" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Fuel
            </TabsTrigger>
            <TabsTrigger value="playback">Track Playback</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FleetDistanceChart />
              <DailyMileageChart data={odometerTrends} isLoading={odometerLoading} />
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FastestBusLeaderboard buses={fastestBuses} isLoading={fastestLoading} />
              <DriverLeaderboard />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <FleetEfficiencyChart />
              <OdometerTrendsChart data={odometerTrends} isLoading={odometerLoading} />
            </div>
          </TabsContent>

          {/* Speed Analysis Tab (NEW) */}
          <TabsContent value="speed-analysis" className="space-y-6">
            <SpeedDistributionChart data={speedDistribution} isLoading={speedDistLoading} />
            <Card>
              <CardHeader>
                <CardTitle>Speed Insights & Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-success"></div>
                      <span className="font-medium">Safe Driving (0-30 km/h)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ideal for urban areas and congested routes. Represents controlled, safe operation.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-warning"></div>
                      <span className="font-medium">Moderate Speed (30-60 km/h)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Optimal for most routes. Balances efficiency with safety for passenger comfort.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-info"></div>
                      <span className="font-medium">Fast Driving (60-90 km/h)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Highway speeds. Monitor fuel consumption and ensure driver alertness.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-destructive"></div>
                      <span className="font-medium">Excessive Speed (90+ km/h)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dangerous! Immediate driver coaching required. Review incidents and implement speed limits.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
