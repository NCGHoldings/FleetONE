import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RouteStats } from '@/hooks/useTripsAnalytics';

interface RoutePerformanceChartProps {
  data: RouteStats[];
  limit?: number;
}

export default function RoutePerformanceChart({ data, limit = 10 }: RoutePerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top {limit} Routes by Performance</h3>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground text-sm">No route data available</p>
        </div>
      </Card>
    );
  }

  const topRoutes = data.slice(0, limit);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Top {limit} Routes by Performance</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topRoutes}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="routeNo" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `₨${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'totalIncome' || name === 'totalExpenses' || name === 'netIncome') {
                return [`₨${value.toLocaleString()}`, name === 'totalIncome' ? 'Income' : name === 'totalExpenses' ? 'Expenses' : 'Net Income'];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Bar dataKey="totalIncome" fill="hsl(var(--primary))" name="Income" radius={[4, 4, 0, 0]} />
          <Bar dataKey="totalExpenses" fill="hsl(var(--destructive))" name="Expenses" radius={[4, 4, 0, 0]} />
          <Bar dataKey="netIncome" fill="hsl(var(--chart-2))" name="Net Income" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
