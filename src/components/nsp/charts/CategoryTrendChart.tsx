import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

interface CategoryTrendChartProps {
  data: Array<{
    date: string;
    total: number;
    lssOutside?: number;
    lssInside?: number;
    tyre?: number;
    isPrediction?: boolean;
  }>;
  category: 'lssOutside' | 'lssInside' | 'tyre';
  title: string;
  color: string;
}

export const CategoryTrendChart = ({ data, category, title, color }: CategoryTrendChartProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Sales trend analysis for {title.split(' ')[0]} category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`${category}Gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), "MMM dd")}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-2">
                      {format(new Date(data.date), "MMM dd, yyyy")}
                      {data.isPrediction && <span className="text-primary ml-2 text-xs">(Predicted)</span>}
                    </p>
                    <div className="flex justify-between gap-4 text-sm">
                      <span style={{ color }}>{title}:</span>
                      <span className="font-medium">LKR {(data[category] || 0).toLocaleString()}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={category}
              stroke={color}
              fill={`url(#${category}Gradient)`}
              strokeWidth={2}
              name={title}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
