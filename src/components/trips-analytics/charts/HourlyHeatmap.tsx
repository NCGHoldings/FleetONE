import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";

interface HourlyData {
  hour: number;
  timeLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalTrips: number;
  avgEfficiency: number;
}

interface HourlyHeatmapProps {
  data: HourlyData[];
}

export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  // Filter out hours with no data
  const activeData = data.filter(d => d.totalTrips > 0);

  if (activeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hourly Profitability Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available for hourly analysis</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate color intensity based on profit
  const maxProfit = Math.max(...activeData.map(d => d.netProfit));
  const minProfit = Math.min(...activeData.map(d => d.netProfit));

  const getColor = (profit: number) => {
    if (profit < 0) return "hsl(var(--destructive))";
    const intensity = maxProfit > 0 ? (profit / maxProfit) : 0;
    // Gradient from light to dark primary color
    return `hsl(var(--primary) / ${0.3 + intensity * 0.7})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hourly Profitability Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">Profit distribution across 24 hours</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={activeData}>
            <XAxis 
              dataKey="timeLabel" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
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
            <Bar dataKey="netProfit" name="Net Profit" radius={[8, 8, 0, 0]}>
              {activeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.netProfit)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary) / 0.3)" }} />
            <span>Low Profit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
            <span>High Profit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--destructive))" }} />
            <span>Loss</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
