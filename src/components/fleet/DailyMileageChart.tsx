import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { OdometerTrendData } from '@/hooks/useFleetAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyMileageChartProps {
  data: OdometerTrendData[] | undefined;
  isLoading: boolean;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  '#8b5cf6',
  '#ec4899',
  '#10b981',
  '#f59e0b',
];

export default function DailyMileageChart({ data, isLoading }: DailyMileageChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Mileage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Mileage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No mileage data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get all bus columns (exclude 'date')
  const busColumns = Object.keys(data[0]).filter(key => key !== 'date');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Mileage Breakdown - Stacked by Bus</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            />
            <YAxis className="text-xs" label={{ value: 'Total KM', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short',
                year: 'numeric'
              })}
            />
            <Legend />
            {busColumns.map((busNo, index) => (
              <Bar
                key={busNo}
                dataKey={busNo}
                stackId="a"
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                name={busNo}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
