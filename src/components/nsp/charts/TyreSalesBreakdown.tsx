import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

interface TyreSalesBreakdownProps {
  data: Array<{ type: string; quantity: number; amount: number }>;
}

export const TyreSalesBreakdown = ({ data }: TyreSalesBreakdownProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tyre Sales Breakdown</CardTitle>
          <CardDescription>Sales by tyre type</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No tyre sales data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tyre Sales Breakdown</CardTitle>
        <CardDescription>Quantity and revenue by tyre type</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="type"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Amount (LKR)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Quantity', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-1">{payload[0].payload.type}</p>
                    <p className="text-sm">Amount: LKR {payload[0].payload.amount.toLocaleString()}</p>
                    <p className="text-sm">Quantity: {payload[0].payload.quantity}</p>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="amount" fill="#3B82F6" name="Amount (LKR)" radius={[8, 8, 0, 0]} />
            <Bar yAxisId="right" dataKey="quantity" fill="#14B8A6" name="Quantity" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
