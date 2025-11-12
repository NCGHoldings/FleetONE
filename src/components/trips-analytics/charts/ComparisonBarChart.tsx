import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ComparisonBarChartProps {
  name1: string;
  name2: string;
  data1: {
    income: number;
    expenses: number;
    netProfit: number;
  };
  data2: {
    income: number;
    expenses: number;
    netProfit: number;
  };
}

export default function ComparisonBarChart({
  name1,
  name2,
  data1,
  data2,
}: ComparisonBarChartProps) {
  const chartData = [
    {
      category: "Income",
      [name1]: data1.income,
      [name2]: data2.income,
    },
    {
      category: "Expenses",
      [name1]: data1.expenses,
      [name2]: data2.expenses,
    },
    {
      category: "Net Profit",
      [name1]: data1.netProfit,
      [name2]: data2.netProfit,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="category" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
            />
            <Legend />
            <Bar dataKey={name1} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey={name2} fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
