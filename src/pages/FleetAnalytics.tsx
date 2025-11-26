import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Activity, PieChart } from 'lucide-react';
import TrackPlayback from '@/components/fleet/TrackPlayback';
import FleetDistanceChart from '@/components/fleet/FleetDistanceChart';
import FleetEfficiencyChart from '@/components/fleet/FleetEfficiencyChart';
import FuelDashboard from '@/components/fleet/FuelDashboard';
import DriverLeaderboard from '@/components/fleet/DriverLeaderboard';

export default function FleetAnalytics() {
  const [selectedBus, setSelectedBus] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fleet Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics, historical data, and performance insights
          </p>
        </div>

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
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="fuel" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Fuel
            </TabsTrigger>
            <TabsTrigger value="playback">Track Playback</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Distance</p>
                    <h3 className="text-2xl font-bold">12,450 km</h3>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-success/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Speed</p>
                    <h3 className="text-2xl font-bold">45 km/h</h3>
                    <p className="text-xs text-success">+5% vs last month</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <Activity className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Time</p>
                    <h3 className="text-2xl font-bold">85%</h3>
                    <p className="text-xs text-muted-foreground">15% idle time</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-info/10 rounded-lg">
                    <PieChart className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
                    <h3 className="text-2xl font-bold">8.2 km/L</h3>
                    <p className="text-xs text-muted-foreground">Fleet average</p>
                  </div>
                </div>
              </Card>
            </div>

            <FleetDistanceChart />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FleetEfficiencyChart />
              <DriverLeaderboard />
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <FleetEfficiencyChart />
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
