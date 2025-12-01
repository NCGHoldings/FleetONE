import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Activity, Gauge } from 'lucide-react';
import { FleetKPIs } from '@/hooks/useFleetAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface FleetAnalyticsKPIsProps {
  kpis: FleetKPIs | undefined;
  isLoading: boolean;
}

export function FleetAnalyticsKPIs({ kpis, isLoading }: FleetAnalyticsKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-6">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const activePercentage = kpis?.totalVehicles
    ? Math.round((kpis.activeVehicles / kpis.totalVehicles) * 100)
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Distance</p>
            <h3 className="text-2xl font-bold">{kpis?.totalDistance.toLocaleString() || 0} km</h3>
            <p className="text-xs text-muted-foreground">This period</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-success/10 via-background to-background border-success/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-success/10 rounded-lg">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Speed</p>
            <h3 className="text-2xl font-bold">{kpis?.avgSpeed || 0} km/h</h3>
            <p className="text-xs text-success">Max: {kpis?.maxSpeed || 0} km/h</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-warning/10 via-background to-background border-warning/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-warning/10 rounded-lg">
            <Activity className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Fleet</p>
            <h3 className="text-2xl font-bold">{activePercentage}%</h3>
            <p className="text-xs text-muted-foreground">
              {kpis?.activeVehicles || 0} of {kpis?.totalVehicles || 0} buses
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-info/10 via-background to-background border-info/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-info/10 rounded-lg">
            <Gauge className="h-6 w-6 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
            <h3 className="text-2xl font-bold">{kpis?.fuelEfficiency || 0} km/L</h3>
            <p className="text-xs text-muted-foreground">Fleet average</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
