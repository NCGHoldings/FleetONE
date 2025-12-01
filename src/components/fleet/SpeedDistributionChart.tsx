import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SpeedDistribution } from '@/hooks/useFleetAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge } from 'lucide-react';

interface SpeedDistributionChartProps {
  data: SpeedDistribution[] | undefined;
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--success))',    // 0-30: Green (safe)
  'hsl(var(--warning))',    // 30-60: Yellow (moderate)
  'hsl(var(--info))',       // 60-90: Blue (fast)
  'hsl(var(--destructive))', // 90+: Red (dangerous)
];

export default function SpeedDistributionChart({ data, isLoading }: SpeedDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Speed Distribution Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Speed Distribution Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No speed data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Speed Distribution Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">
              Percentage Distribution
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.range}: ${entry.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="percentage"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">
              Absolute Count
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="range" className="text-xs" angle={-15} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {data.map((item, index) => (
            <div
              key={item.range}
              className="p-4 rounded-lg border"
              style={{ backgroundColor: `${COLORS[index]}15` }}
            >
              <div className="text-xs text-muted-foreground mb-1">{item.range}</div>
              <div className="text-2xl font-bold" style={{ color: COLORS[index] }}>
                {item.percentage}%
              </div>
              <div className="text-xs text-muted-foreground">{item.count.toLocaleString()} records</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
