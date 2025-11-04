import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ExpenseDistributionChartProps {
  data: {
    fuel: number;
    other: number;
  };
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export default function ExpenseDistributionChart({ data }: ExpenseDistributionChartProps) {
  const chartData = [
    { name: 'Fuel Cost', value: data.fuel },
    { name: 'Other Expenses', value: data.other }
  ];

  const total = data.fuel + data.other;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.name}: ${((entry.value / total) * 100).toFixed(1)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number) => `₨${value.toLocaleString()}`}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Fuel Cost</p>
          <p className="text-2xl font-bold text-foreground">₨{data.fuel.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{((data.fuel / total) * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Other Expenses</p>
          <p className="text-2xl font-bold text-foreground">₨{data.other.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{((data.other / total) * 100).toFixed(1)}%</p>
        </div>
      </div>
    </Card>
  );
}
