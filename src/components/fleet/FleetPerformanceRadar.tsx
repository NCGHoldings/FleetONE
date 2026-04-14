import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Target } from 'lucide-react';

export default function FleetPerformanceRadar() {
  const { data, isLoading } = useQuery({
    queryKey: ['fleet-performance-radar'],
    queryFn: async () => {
      // Get various performance metrics
      const { data: mileage } = await supabase
        .from('bus_daily_mileage')
        .select('daily_km')
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const { data: speed } = await supabase
        .from('gps_location_history')
        .select('speed_kmh')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .gt('speed_kmh', 0);

      const { data: tracking } = await supabase
        .from('real_time_tracking')
        .select('status, battery_voltage, gsm_signal_strength');

      const { data: analytics } = await supabase
        .from('fleet_analytics_daily')
        .select('fuel_efficiency_kmpl, total_idle_time_minutes')
        .gte('analytics_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      // Calculate performance scores (0-100)
      const avgSpeed = speed?.length ? speed.reduce((s, r) => s + (r.speed_kmh || 0), 0) / speed.length : 0;
      const speedScore = Math.min(100, (avgSpeed / 60) * 100);

      const totalMileage = mileage?.reduce((s, r) => s + (r.daily_km || 0), 0) || 0;
      const mileageScore = Math.min(100, (totalMileage / 1000) * 100);

      const activeVehicles = tracking?.filter(t => t.status === 'active').length || 0;
      const totalVehicles = tracking?.length || 1;
      const utilizationScore = (activeVehicles / totalVehicles) * 100;

      const avgEfficiency = analytics?.length 
        ? analytics.reduce((s, r) => s + (r.fuel_efficiency_kmpl || 0), 0) / analytics.length 
        : 0;
      const efficiencyScore = Math.min(100, (avgEfficiency / 12) * 100);

      const avgIdleTime = analytics?.length 
        ? analytics.reduce((s, r) => s + (r.total_idle_time_minutes || 0), 0) / analytics.length 
        : 0;
      const idleScore = Math.max(0, 100 - (avgIdleTime / 60) * 10);

      const avgBattery = tracking?.length 
        ? tracking.reduce((s, r) => s + (r.battery_voltage || 0), 0) / tracking.length 
        : 0;
      const healthScore = avgBattery > 12 ? 90 : avgBattery > 11 ? 70 : 50;

      return [
        { metric: 'Speed', value: Math.round(speedScore), fullMark: 100 },
        { metric: 'Distance', value: Math.round(mileageScore), fullMark: 100 },
        { metric: 'Utilization', value: Math.round(utilizationScore), fullMark: 100 },
        { metric: 'Fuel Efficiency', value: Math.round(efficiencyScore), fullMark: 100 },
        { metric: 'Low Idle', value: Math.round(idleScore), fullMark: 100 },
        { metric: 'Vehicle Health', value: Math.round(healthScore), fullMark: 100 },
      ];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const overallScore = data ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length) : 0;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            Fleet Performance Score
          </div>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-primary">{overallScore}</div>
            <div className="text-sm text-muted-foreground">/100</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar
              name="Performance"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value}/100`, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {data?.map((item, index) => (
            <div 
              key={index} 
              className="p-2 rounded-lg bg-muted/50 text-center"
            >
              <div className="text-xs text-muted-foreground">{item.metric}</div>
              <div className="text-lg font-bold text-foreground">{item.value}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
