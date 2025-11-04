import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';

interface RevenueTrendChartProps {
  data: Array<{
    date: string;
    income: number;
    expenses: number;
    netIncome: number;
  }>;
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const chartData = data.map(d => ({
    ...d,
    date: format(new Date(d.date), 'MMM dd')
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses Trend</h3>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
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
            formatter={(value: number) => [`₨${value.toLocaleString()}`, '']}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="income" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorIncome)"
            name="Income"
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="expenses" 
            stroke="hsl(var(--destructive))" 
            fillOpacity={1} 
            fill="url(#colorExpenses)"
            name="Expenses"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
