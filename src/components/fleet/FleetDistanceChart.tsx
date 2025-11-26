import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FleetDistanceChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['fleet-distance-chart'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fleet_analytics_daily')
        .select(`
          analytics_date,
          total_distance_km,
          buses!inner(bus_no)
        `)
        .gte('analytics_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('analytics_date', { ascending: true });

      // If no analytics data, show message
      if (!data || data.length === 0) {
        console.log('No fleet analytics data available. Please run aggregation function.');
        return [];
      }

      // Group by date and sum distance
      const grouped = data?.reduce((acc: any, curr: any) => {
        const date = curr.analytics_date;
        if (!acc[date]) {
          acc[date] = { date, distance: 0 };
        }
        acc[date].distance += curr.total_distance_km || 0;
        return acc;
      }, {});

      return Object.values(grouped || {}).map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        distance: Math.round(item.distance),
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Distance - Last 7 Days</CardTitle>
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
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Bar dataKey="distance" fill="hsl(var(--primary))" name="Total Distance (km)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
