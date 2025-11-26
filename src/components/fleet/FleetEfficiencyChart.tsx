import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FleetEfficiencyChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['fleet-efficiency-chart'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fleet_analytics_daily')
        .select(`
          analytics_date,
          fuel_efficiency_kmpl,
          avg_speed_kmh,
          buses!inner(bus_no)
        `)
        .gte('analytics_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('analytics_date', { ascending: true });

      // If no analytics data, show message
      if (!data || data.length === 0) {
        console.log('No fleet analytics data available. Please run aggregation function.');
        return [];
      }

      // Group by date and calculate averages
      const grouped = data?.reduce((acc: any, curr: any) => {
        const date = curr.analytics_date;
        if (!acc[date]) {
          acc[date] = { date, fuelTotal: 0, speedTotal: 0, count: 0 };
        }
        acc[date].fuelTotal += curr.fuel_efficiency_kmpl || 0;
        acc[date].speedTotal += curr.avg_speed_kmh || 0;
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.values(grouped || {}).map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        efficiency: (item.fuelTotal / item.count).toFixed(2),
        avgSpeed: (item.speedTotal / item.count).toFixed(1),
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Performance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No analytics data available. Fleet analytics aggregation needs to run.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" label={{ value: 'km/L', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" className="text-xs" label={{ value: 'km/h', angle: 90, position: 'insideRight' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="efficiency"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Fuel Efficiency (km/L)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgSpeed"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))' }}
                name="Avg Speed (km/h)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
