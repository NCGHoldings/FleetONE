import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DriverStats } from '@/hooks/useTripsAnalytics';

interface DriverComparisonChartProps {
  data: DriverStats[];
  limit?: number;
}

export default function DriverComparisonChart({ data, limit = 10 }: DriverComparisonChartProps) {
  const topDrivers = data.slice(0, limit);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Top {limit} Drivers by Net Income</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topDrivers} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            type="number"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `₨${(value / 1000).toFixed(0)}K`}
          />
          <YAxis 
            type="category"
            dataKey="driverName" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            width={100}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'netIncome') return [`₨${value.toLocaleString()}`, 'Net Income'];
              if (name === 'totalIncome') return [`₨${value.toLocaleString()}`, 'Total Income'];
              return [value, name];
            }}
          />
          <Legend />
          <Bar 
            dataKey="totalIncome" 
            fill="hsl(var(--primary))" 
            name="Total Income"
            radius={[0, 4, 4, 0]}
          />
          <Bar 
            dataKey="netIncome" 
            fill="hsl(var(--chart-2))" 
            name="Net Income"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
