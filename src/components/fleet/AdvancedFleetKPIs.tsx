import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, Activity, Gauge, Fuel, Clock, 
  Truck, AlertTriangle, Zap, Route 
} from 'lucide-react';
import { FleetKPIs } from '@/hooks/useFleetAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AdvancedFleetKPIsProps {
  kpis: FleetKPIs | undefined;
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient: string;
  iconBg: string;
}

function KPICard({ title, value, subtitle, icon, trend, gradient, iconBg }: KPICardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300",
      "bg-gradient-to-br",
      gradient
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className="w-full h-full bg-white rounded-full blur-3xl transform translate-x-8 -translate-y-8" />
      </div>
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-white">{value}</h3>
            {trend && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs font-semibold",
                  trend.isPositive 
                    ? "bg-green-500/20 text-green-100" 
                    : "bg-red-500/20 text-red-100"
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/70">{subtitle}</p>
        </div>
        <div className={cn("p-3 rounded-xl", iconBg)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function AdvancedFleetKPIs({ kpis, isLoading }: AdvancedFleetKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="p-6">
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const activePercentage = kpis?.totalVehicles
    ? Math.round((kpis.activeVehicles / kpis.totalVehicles) * 100)
    : 0;

  const utilizationRate = kpis?.totalVehicles 
    ? Math.round((kpis.activeVehicles / kpis.totalVehicles) * 100)
    : 0;

  const avgDistancePerBus = kpis?.totalDistance && kpis?.totalVehicles
    ? Math.round(kpis.totalDistance / kpis.totalVehicles)
    : 0;

  return (
    <div className="space-y-4">
      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <KPICard
          title="Total Distance"
          value={`${kpis?.totalDistance.toLocaleString() || 0}`}
          subtitle="km traveled this period"
          icon={<Route className="h-6 w-6 text-white" />}
          gradient="from-blue-600 to-blue-800"
          iconBg="bg-white/20"
          trend={{ value: 12, isPositive: true }}
        />
        
        <KPICard
          title="Average Speed"
          value={`${kpis?.avgSpeed || 0}`}
          subtitle={`km/h • Max: ${kpis?.maxSpeed || 0} km/h`}
          icon={<Gauge className="h-6 w-6 text-white" />}
          gradient="from-purple-600 to-purple-800"
          iconBg="bg-white/20"
        />
        
        <KPICard
          title="Fleet Utilization"
          value={`${utilizationRate}%`}
          subtitle={`${kpis?.activeVehicles || 0}/${kpis?.totalVehicles || 0} active`}
          icon={<Truck className="h-6 w-6 text-white" />}
          gradient="from-emerald-600 to-emerald-800"
          iconBg="bg-white/20"
          trend={{ value: 5, isPositive: true }}
        />
        
        <KPICard
          title="Fuel Efficiency"
          value={`${kpis?.fuelEfficiency || 0}`}
          subtitle="km/L fleet average"
          icon={<Fuel className="h-6 w-6 text-white" />}
          gradient="from-amber-600 to-amber-800"
          iconBg="bg-white/20"
          trend={{ value: 3, isPositive: true }}
        />
        
        <KPICard
          title="Idle Time"
          value={`${Math.round((kpis?.totalIdleTime || 0) / 60)}`}
          subtitle="hours total idle"
          icon={<Clock className="h-6 w-6 text-white" />}
          gradient="from-rose-600 to-rose-800"
          iconBg="bg-white/20"
          trend={{ value: 8, isPositive: false }}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg/Bus/Day</p>
              <p className="text-lg font-bold text-foreground">{avgDistancePerBus} km</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak Speed</p>
              <p className="text-lg font-bold text-foreground">{kpis?.maxSpeed || 0} km/h</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Now</p>
              <p className="text-lg font-bold text-foreground">{kpis?.activeVehicles || 0} buses</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Speed Alerts</p>
              <p className="text-lg font-bold text-foreground">0 incidents</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
