import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

interface SalesTrendChartProps {
  data: Array<{
    date: string;
    total: number;
    lssOutside?: number;
    lssInside?: number;
    tyre?: number;
    pepiliyana?: number;
    other?: number;
    isPrediction?: boolean;
  }>;
  showCategories?: boolean;
}

export const SalesTrendChart = ({ data, showCategories = false }: SalesTrendChartProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Trend Analysis</CardTitle>
        <CardDescription>
          {showCategories ? "Category-wise sales breakdown over time" : "Total daily sales trend with future predictions"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="lssOutsideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="lssInsideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="tyreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.1} />
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
                    {payload.map((entry: any, index: number) => (
                      <div key={index} className="flex justify-between gap-4 text-sm">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <span className="font-medium">LKR {entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {showCategories ? (
              <>
                <Area
                  type="monotone"
                  dataKey="lssOutside"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="url(#lssOutsideGradient)"
                  name="LSS Outside"
                />
                <Area
                  type="monotone"
                  dataKey="lssInside"
                  stackId="1"
                  stroke="#A855F7"
                  fill="url(#lssInsideGradient)"
                  name="LSS Inside"
                />
                <Area
                  type="monotone"
                  dataKey="tyre"
                  stackId="1"
                  stroke="#14B8A6"
                  fill="url(#tyreGradient)"
                  name="Tyre Sale"
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                fill="url(#totalGradient)"
                strokeWidth={2}
                name="Total Sales"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
