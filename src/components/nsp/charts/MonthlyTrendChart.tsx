import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MonthlyTrendChartProps {
  data: Array<{ month: string; total: number; label: string }>;
}

export const MonthlyTrendChart = ({ data }: MonthlyTrendChartProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Sales Trend</CardTitle>
        <CardDescription>Month-over-month performance comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-1">{payload[0].payload.label}</p>
                    <p className="text-sm">Total: LKR {payload[0].value?.toLocaleString()}</p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ r: 5, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
