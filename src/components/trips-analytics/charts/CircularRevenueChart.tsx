import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FINANCIAL_COLORS } from '@/lib/comparison-colors';

interface CircularRevenueChartProps {
  title?: string;
  description?: string;
  data: Array<{
    name: string;
    value: number;
    id: string;
  }>;
  type: 'routes' | 'drivers' | 'buses';
}

const ROUTE_COLORS = [
  '#3b82f6', // blue
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#6b7280', // gray (others)
];

export default function CircularRevenueChart({ 
  title = "Revenue Distribution", 
  description = "Top revenue contributors",
  data,
  type 
}: CircularRevenueChartProps) {
  // Take top 5 and group the rest as "Others"
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const top5 = sortedData.slice(0, 5);
  const others = sortedData.slice(5);
  
  const chartData = [
    ...top5.map((item, index) => ({
      ...item,
      color: ROUTE_COLORS[index]
    })),
    ...(others.length > 0 ? [{
      name: 'Others',
      value: others.reduce((sum, item) => sum + item.value, 0),
      id: 'others',
      color: ROUTE_COLORS[7]
    }] : [])
  ];

  const totalRevenue = chartData.reduce((sum, item) => sum + item.value, 0);

  // Handle empty data
  if (totalRevenue <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalRevenue) * 100).toFixed(1);
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <div className="font-semibold text-foreground">{data.name}</div>
          <div className="text-sm text-muted-foreground">
            Rs {data.value.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {percentage}% of total
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-foreground">
                Rs {(totalRevenue / 1000).toFixed(0)}k
              </div>
            </div>
          </div>
        </div>

        {/* Custom Legend */}
        <div className="mt-6 space-y-2">
          {chartData.map((item, index) => {
            const percentage = ((item.value / totalRevenue) * 100).toFixed(1);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-foreground">
                    Rs {(item.value / 1000).toFixed(0)}k
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
