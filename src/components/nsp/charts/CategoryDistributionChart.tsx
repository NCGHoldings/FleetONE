import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CategoryDistributionChartProps {
  data: { [key: string]: number };
}

const COLORS = {
  'LSS Outside': '#3B82F6',
  'LSS Inside': '#A855F7',
  'Tyre Sale': '#14B8A6',
  'Breakdown Sales': '#EC4899',
  'Other Income': '#F97316'
};

export const CategoryDistributionChart = ({ data }: CategoryDistributionChartProps) => {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Distribution by Category</CardTitle>
        <CardDescription>Percentage breakdown of revenue sources</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(1)}%`}
              outerRadius={110}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6B7280'} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0];
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-1">{data.name}</p>
                    <p className="text-sm">Amount: LKR {data.value?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {((data.value as number / total) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold">LKR {total.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};
