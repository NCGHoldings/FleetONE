import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

interface EfficiencyChartProps {
  data: Array<{
    date: string;
    avgEfficiency: number;
  }>;
}

export default function EfficiencyChart({ data }: EfficiencyChartProps) {
  const chartData = data.map(d => ({
    ...d,
    date: format(new Date(d.date), 'MMM dd')
  }));

  const avgEfficiency = data.reduce((sum, d) => sum + d.avgEfficiency, 0) / data.length;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Fuel Efficiency Trend (km/L)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            domain={[0, 'auto']}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`${value.toFixed(2)} km/L`, 'Efficiency']}
          />
          <ReferenceLine 
            y={avgEfficiency} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3"
            label={{ value: `Avg: ${avgEfficiency.toFixed(2)} km/L`, position: 'right' }}
          />
          <Line 
            type="monotone" 
            dataKey="avgEfficiency" 
            stroke="hsl(var(--chart-3))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--chart-3))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
