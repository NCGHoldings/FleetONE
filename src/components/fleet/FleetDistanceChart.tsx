import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Database, Route } from 'lucide-react';

export default function FleetDistanceChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['fleet-distance-chart-real'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Primary source: bus_daily_mileage (most accurate)
      const { data: mileageData } = await supabase
        .from('bus_daily_mileage')
        .select('date, daily_km, bus_id')
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: true });

      if (mileageData && mileageData.length > 0) {
        // Group by date and sum distance
        const grouped = mileageData.reduce((acc: Record<string, { date: string; distance: number; busCount: number }>, curr) => {
          const date = curr.date;
          if (!acc[date]) {
            acc[date] = { date, distance: 0, busCount: 0 };
          }
          acc[date].distance += curr.daily_km || 0;
          acc[date].busCount += 1;
          return acc;
        }, {});

        return {
          source: 'bus_daily_mileage',
          recordCount: mileageData.length,
          data: Object.values(grouped).map((item) => ({
            date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            distance: Math.round(item.distance),
            buses: item.busCount,
          }))
        };
      }

      // Fallback: Calculate from GPS waypoints using Haversine
      const { data: gpsData } = await supabase
        .from('gps_location_history')
        .select('bus_id, latitude, longitude, timestamp')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: true });

      if (gpsData && gpsData.length > 0) {
        // Calculate distances using Haversine formula
        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        // Group by bus and date, calculate cumulative distance
        const dailyDistances: Record<string, number> = {};
        const sortedByBus: Record<string, typeof gpsData> = {};
        
        gpsData.forEach(point => {
          if (!sortedByBus[point.bus_id]) {
            sortedByBus[point.bus_id] = [];
          }
          sortedByBus[point.bus_id].push(point);
        });

        Object.entries(sortedByBus).forEach(([busId, points]) => {
          for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const date = curr.timestamp.split('T')[0];
            const dist = haversine(
              prev.latitude, prev.longitude,
              curr.latitude, curr.longitude
            );
            // Filter out unrealistic jumps (> 100km in one reading)
            if (dist < 100) {
              dailyDistances[date] = (dailyDistances[date] || 0) + dist;
            }
          }
        });

        return {
          source: 'gps_location_history (calculated)',
          recordCount: gpsData.length,
          data: Object.entries(dailyDistances)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, distance]) => ({
              date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
              distance: Math.round(distance),
              buses: Object.keys(sortedByBus).length,
            }))
        };
      }

      return { source: 'none', recordCount: 0, data: [] };
    },
  });

  const totalDistance = chartData?.data?.reduce((sum, d) => sum + d.distance, 0) || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Fleet Distance - Last 7 Days
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              {chartData?.source || 'loading'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {chartData?.recordCount || 0} records
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{totalDistance.toLocaleString()} km</p>
          <p className="text-xs text-muted-foreground">Total distance</p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : !chartData?.data || chartData.data.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Route className="h-12 w-12 opacity-50" />
            <p>No distance data available for the last 7 days</p>
            <p className="text-xs">GPS tracking or daily mileage data required</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} km`,
                  'Distance'
                ]}
              />
              <Legend />
              <Bar 
                dataKey="distance" 
                fill="hsl(var(--primary))" 
                name="Total Distance (km)" 
                radius={[8, 8, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
