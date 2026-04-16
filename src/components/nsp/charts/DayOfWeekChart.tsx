import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DayOfWeekChartProps {
  data: Array<{ day: string; average: number; count: number }>;
}

export const DayOfWeekChart = ({ data }: DayOfWeekChartProps) => {
  const maxAverage = Math.max(...data.map(d => d.average));
  const minAverage = Math.min(...data.filter(d => d.count > 0).map(d => d.average));

  const getBarColor = (average: number) => {
    if (average === maxAverage) return '#10B981'; // Success green
    if (average === minAverage) return '#EF4444'; // Danger red
    return 'hsl(var(--primary))';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Day-of-Week Performance</CardTitle>
        <CardDescription>Average sales per weekday</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-1">{data.day}</p>
                    <p className="text-sm">Avg: LKR {data.average.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{data.count} days recorded</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="average" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.average)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
