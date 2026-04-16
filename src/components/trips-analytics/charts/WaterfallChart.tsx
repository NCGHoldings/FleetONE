import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface WaterfallItem {
  label: string;
  value: number;
  type: 'positive' | 'negative' | 'total';
}

interface WaterfallChartProps {
  title?: string;
  description?: string;
  data: {
    totalIncome: number;
    fuelCost: number;
    tollCost: number;
    repairCost: number;
    salaries: number;
    permits: number;
    otherExpenses: number;
    netProfit: number;
  };
}

export default function WaterfallChart({ title = "Profit Waterfall Analysis", description = "Visual breakdown of income to profit", data }: WaterfallChartProps) {
  const items: WaterfallItem[] = [
    { label: 'Total Income', value: data.totalIncome ?? 0, type: 'total' },
    { label: 'Fuel Cost', value: -(data.fuelCost ?? 0), type: 'negative' },
    { label: 'Highway Charges', value: -(data.tollCost ?? 0), type: 'negative' },
    { label: 'Repairs & Tyre', value: -(data.repairCost ?? 0), type: 'negative' },
    { label: 'Salaries', value: -(data.salaries ?? 0), type: 'negative' },
    { label: 'Permits & Legal', value: -(data.permits ?? 0), type: 'negative' },
    { label: 'Other Expenses', value: -(data.otherExpenses ?? 0), type: 'negative' },
    { label: 'Net Profit', value: data.netProfit ?? 0, type: 'total' },
  ];

  // Calculate cumulative values for positioning
  let cumulative = 0;
  const chartData = items.map(item => {
    const start = cumulative;
    cumulative += item.value;
    const end = cumulative;
    
    return {
      ...item,
      start: Math.min(start, end),
      end: Math.max(start, end),
      height: Math.abs(item.value)
    };
  });

  const rawMax = Math.max(...chartData.map(d => Math.max(d.start, d.end)), 0);
  
  // Handle empty or zero data
  if (rawMax <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for waterfall analysis
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const maxValue = rawMax;
  const chartHeight = 500; // Increased from 400
  const barWidth = 80; // Increased from 60
  const gap = 50; // Increased from 40
  const totalWidth = chartData.length * (barWidth + gap);

  const getBarColor = (type: string) => {
    switch (type) {
      case 'positive':
        return '#3b82f6'; // Blue
      case 'negative':
        return '#a855f7'; // Purple
      case 'total':
        return '#10b981'; // Emerald
      default:
        return '#6b7280'; // Gray
    }
  };
  
  const getBarGradient = (type: string) => {
    switch (type) {
      case 'positive':
        return 'url(#blueGradient)';
      case 'negative':
        return 'url(#purpleGradient)';
      case 'total':
        return 'url(#emeraldGradient)';
      default:
        return '#6b7280';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg 
            width={totalWidth} 
            height={chartHeight + 100}
            className="mx-auto"
          >
            {/* Define Gradients */}
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
              </filter>
            </defs>
            
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <g key={i}>
                <line
                  x1={0}
                  y1={chartHeight - (chartHeight * ratio)}
                  x2={totalWidth}
                  y2={chartHeight - (chartHeight * ratio)}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  strokeDasharray="4"
                  opacity="0.3"
                />
                <text
                  x={-10}
                  y={chartHeight - (chartHeight * ratio) + 5}
                  fontSize="12"
                  fill="hsl(var(--muted-foreground))"
                  textAnchor="end"
                >
                  Rs {(maxValue * ratio / 1000).toFixed(0)}k
                </text>
              </g>
            ))}

            {chartData.map((item, index) => {
              const x = index * (barWidth + gap) + gap;
              const barHeight = (item.height / maxValue) * chartHeight;
              const y = chartHeight - ((item.end / maxValue) * chartHeight);

              return (
                <g key={index}>
                  {/* Connector line to previous bar */}
                  {index > 0 && item.type !== 'total' && (
                    <motion.line
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      x1={x - gap}
                      y1={chartHeight - ((chartData[index - 1].end / maxValue) * chartHeight)}
                      x2={x}
                      y2={chartHeight - ((item.start / maxValue) * chartHeight)}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  )}

                  {/* Bar */}
                  <motion.rect
                    initial={{ height: 0, y: chartHeight }}
                    animate={{ height: barHeight, y: y }}
                    transition={{ 
                      delay: index * 0.1,
                      duration: 0.5,
                      ease: "easeOut"
                    }}
                    x={x}
                    width={barWidth}
                    fill={getBarGradient(item.type)}
                    rx="8"
                    filter="url(#shadow)"
                    className="hover:opacity-90 transition-opacity cursor-pointer"
                  />

                  {/* Value label on bar */}
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    x={x + barWidth / 2}
                    y={y - 12}
                    fontSize="14"
                    fontWeight="700"
                    fill="hsl(var(--foreground))"
                    textAnchor="middle"
                  >
                    Rs {(Math.abs(item.value) / 1000).toFixed(0)}k
                  </motion.text>
                  
                  {/* Percentage label */}
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                    x={x + barWidth / 2}
                    y={y - 28}
                    fontSize="11"
                    fontWeight="600"
                    fill={getBarColor(item.type)}
                    textAnchor="middle"
                  >
                    {(((Math.abs(item.value) / (data.totalIncome || 1)) * 100)).toFixed(1)}%
                  </motion.text>

                  {/* Icon */}
                  {item.type !== 'total' && (
                    <motion.g
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.4 }}
                    >
                      {item.value > 0 ? (
                        <ArrowUp 
                          x={x + barWidth / 2 - 6} 
                          y={y - 30}
                          size={12}
                          className="text-green-600"
                        />
                      ) : (
                        <ArrowDown 
                          x={x + barWidth / 2 - 6} 
                          y={y - 30}
                          size={12}
                          className="text-red-600"
                        />
                      )}
                    </motion.g>
                  )}

                  {/* Label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 20}
                    fontSize="12"
                    fontWeight="600"
                    fill="hsl(var(--foreground))"
                    textAnchor="middle"
                    transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight + 20})`}
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getBarColor('positive') }} />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getBarColor('negative') }} />
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getBarColor('total') }} />
            <span className="text-muted-foreground">Total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
