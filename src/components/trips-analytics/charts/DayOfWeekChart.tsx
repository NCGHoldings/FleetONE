import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface DayOfWeekData {
  day: number;
  dayName: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalTrips: number;
  avgEfficiency: number;
}

interface DayOfWeekChartProps {
  data: DayOfWeekData[];
}

export default function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  const activeData = data.filter(d => d.totalTrips > 0);

  if (activeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Day of Week Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available for day-of-week analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Day of Week Performance</CardTitle>
        <p className="text-sm text-muted-foreground">Income, expenses, and profit by day</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={activeData}>
            <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => `₹${value.toLocaleString()}`}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar 
              dataKey="totalIncome" 
              name="Income" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="totalExpenses" 
              name="Expenses" 
              fill="hsl(var(--destructive))" 
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="netProfit" 
              name="Net Profit" 
              fill="hsl(var(--chart-2))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
