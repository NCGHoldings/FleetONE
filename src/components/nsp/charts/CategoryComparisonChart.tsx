import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CategoryComparisonChartProps {
  data: { [key: string]: number };
}

const COLORS: { [key: string]: string } = {
  'LSS Outside': '#3B82F6',
  'LSS Inside': '#A855F7',
  'Tyre Sale': '#14B8A6',
  'Pepiliyana': '#EC4899',
  'Other Income': '#F97316'
};

export const CategoryComparisonChart = ({ data }: CategoryComparisonChartProps) => {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value, fill: COLORS[name] || '#6B7280' }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Performance Comparison</CardTitle>
        <CardDescription>Total sales by category (sorted by highest revenue)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              height={80}
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
                    <p className="font-medium mb-1">{payload[0].payload.name}</p>
                    <p className="text-sm">LKR {payload[0].value?.toLocaleString()}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
