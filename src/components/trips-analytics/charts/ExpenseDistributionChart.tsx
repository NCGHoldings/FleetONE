import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ExpenseDistributionChartProps {
  data: {
    fuel: number;
    toll: number;
    repair: number;
    driverSalary: number;
    conductorSalary: number;
    other: number;
  };
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))'
];

export default function ExpenseDistributionChart({ data }: ExpenseDistributionChartProps) {
  const chartData = [
    { name: 'Fuel', value: data.fuel },
    { name: 'Toll', value: data.toll },
    { name: 'Repairs', value: data.repair },
    { name: 'Driver Salaries', value: data.driverSalary },
    { name: 'Conductor Salaries', value: data.conductorSalary },
    { name: 'Other', value: data.other }
  ].filter(item => item.value > 0);

  const total = data.fuel + data.toll + data.repair + data.driverSalary + data.conductorSalary + data.other;

  if (total === 0 || chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="flex flex-col items-center justify-center h-[350px] text-center">
          <p className="text-muted-foreground text-sm">No expense data available</p>
          <p className="text-muted-foreground text-xs mt-2">Add expenses in Daily Bus Expenses to see the breakdown</p>
        </div>
      </Card>
    );
  }

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
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
        {chartData.map((item, index) => (
          <div key={item.name}>
            <p className="text-xs text-muted-foreground">{item.name}</p>
            <p className="text-lg font-bold text-foreground">₨{item.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{((item.value / total) * 100).toFixed(1)}%</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t text-center">
        <p className="text-sm text-muted-foreground">Total Expenses</p>
        <p className="text-2xl font-bold text-foreground">₨{total.toLocaleString()}</p>
      </div>
    </Card>
  );
}
