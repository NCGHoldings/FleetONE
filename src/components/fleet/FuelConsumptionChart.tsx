import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FuelConsumptionChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['fuel-consumption-chart'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fleet_analytics_daily')
        .select(`
          analytics_date,
          fuel_efficiency_kmpl,
          buses!inner(bus_no)
        `)
        .gte('analytics_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('analytics_date', { ascending: true });

      // Group by date and calculate average efficiency
      const grouped = data?.reduce((acc: any, curr: any) => {
        const date = curr.analytics_date;
        if (!acc[date]) {
          acc[date] = { date, total: 0, count: 0 };
        }
        acc[date].total += curr.fuel_efficiency_kmpl || 0;
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.values(grouped || {}).map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        efficiency: (item.total / item.count).toFixed(2),
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Fuel Efficiency Trends</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" label={{ value: 'km/L', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="efficiency"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Fuel Efficiency (km/L)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
