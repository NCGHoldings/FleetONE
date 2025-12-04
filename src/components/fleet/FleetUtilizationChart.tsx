import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Truck } from 'lucide-react';

const COLORS = {
  active: 'hsl(142, 76%, 36%)',    // Green
  idle: 'hsl(48, 96%, 53%)',       // Yellow
  maintenance: 'hsl(0, 84%, 60%)', // Red
  offline: 'hsl(215, 14%, 34%)',   // Gray
};

export default function FleetUtilizationChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['fleet-utilization'],
    queryFn: async () => {
      const { data: buses } = await supabase
        .from('buses')
        .select('id, bus_no, status');

      const { data: tracking } = await supabase
        .from('real_time_tracking')
        .select('bus_id, status, speed_kmh, last_update');

      const statusCounts = {
        active: 0,
        idle: 0,
        maintenance: 0,
        offline: 0,
      };

      buses?.forEach(bus => {
        const trackingData = tracking?.find(t => t.bus_id === bus.id);
        if (bus.status === 'maintenance') {
          statusCounts.maintenance++;
        } else if (trackingData) {
          if (trackingData.speed_kmh && trackingData.speed_kmh > 0) {
            statusCounts.active++;
          } else if (trackingData.status === 'active') {
            statusCounts.idle++;
          } else {
            statusCounts.offline++;
          }
        } else {
          statusCounts.offline++;
        }
      });

      return [
        { name: 'Active (Moving)', value: statusCounts.active, color: COLORS.active },
        { name: 'Idle (Stationary)', value: statusCounts.idle, color: COLORS.idle },
        { name: 'Maintenance', value: statusCounts.maintenance, color: COLORS.maintenance },
        { name: 'Offline', value: statusCounts.offline, color: COLORS.offline },
      ].filter(item => item.value > 0);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fleet Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalVehicles = data?.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          Fleet Utilization Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {data?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                formatter={(value: number) => [`${value} buses`, '']}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col justify-center space-y-3">
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-foreground">{totalVehicles}</p>
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
            </div>
            {data?.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: `${item.color}15` }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: item.color }}>
                    {item.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((item.value / totalVehicles) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
