import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BusComparisonChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['bus-comparison'],
    queryFn: async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: mileage } = await supabase
        .from('bus_daily_mileage')
        .select('bus_id, daily_km, buses!inner(bus_no)')
        .gte('date', startDate);

      // Group by bus and sum mileage
      const busStats: Record<string, { busNo: string; totalKm: number; days: number }> = {};
      
      mileage?.forEach(record => {
        const busNo = record.buses.bus_no;
        if (!busStats[busNo]) {
          busStats[busNo] = { busNo, totalKm: 0, days: 0 };
        }
        busStats[busNo].totalKm += record.daily_km || 0;
        busStats[busNo].days++;
      });

      const results = Object.values(busStats)
        .map(bus => ({
          bus: bus.busNo,
          distance: Math.round(bus.totalKm),
          avgPerDay: Math.round(bus.totalKm / Math.max(bus.days, 1)),
        }))
        .sort((a, b) => b.distance - a.distance)
        .slice(0, 10);

      return results;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bus Distance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxDistance = Math.max(...(data?.map(d => d.distance) || [0]));
  const avgDistance = data?.length ? data.reduce((s, d) => s + d.distance, 0) / data.length : 0;

  const getBarColor = (distance: number) => {
    if (distance >= avgDistance * 1.2) return 'hsl(142, 76%, 36%)'; // Green - above average
    if (distance >= avgDistance * 0.8) return 'hsl(217, 91%, 60%)'; // Blue - average
    return 'hsl(0, 84%, 60%)'; // Red - below average
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            Bus Distance Comparison (7 Days)
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
              <TrendingUp className="h-3 w-3 mr-1" />
              Above Avg
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
              <TrendingDown className="h-3 w-3 mr-1" />
              Below Avg
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No mileage data available
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="bus" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  width={70}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} km`,
                    name === 'distance' ? 'Total Distance' : 'Avg/Day'
                  ]}
                />
                <Bar 
                  dataKey="distance" 
                  radius={[0, 8, 8, 0]}
                  maxBarSize={30}
                >
                  {data?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.distance)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Fleet Average</p>
                <p className="text-lg font-bold text-foreground">{Math.round(avgDistance)} km</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold text-green-600">{data?.[0]?.bus || '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Needs Attention</p>
                <p className="text-lg font-bold text-red-600">{data?.[data.length - 1]?.bus || '-'}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
