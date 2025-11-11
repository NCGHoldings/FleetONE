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
    { label: 'Total Income', value: data.totalIncome, type: 'total' },
    { label: 'Fuel Cost', value: -data.fuelCost, type: 'negative' },
    { label: 'Highway Charges', value: -data.tollCost, type: 'negative' },
    { label: 'Repairs & Tyre', value: -data.repairCost, type: 'negative' },
    { label: 'Salaries', value: -data.salaries, type: 'negative' },
    { label: 'Permits & Legal', value: -data.permits, type: 'negative' },
    { label: 'Other Expenses', value: -data.otherExpenses, type: 'negative' },
    { label: 'Net Profit', value: data.netProfit, type: 'total' },
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

  const maxValue = Math.max(...chartData.map(d => Math.max(d.start, d.end)));
  const chartHeight = 400;
  const barWidth = 60;
  const gap = 40;
  const totalWidth = chartData.length * (barWidth + gap);

  const getBarColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'hsl(var(--chart-1))';
      case 'negative':
        return 'hsl(var(--chart-5))';
      case 'total':
        return 'hsl(var(--primary))';
      default:
        return 'hsl(var(--muted))';
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
                  ₨{(maxValue * ratio / 1000).toFixed(0)}k
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
                    fill={getBarColor(item.type)}
                    rx="4"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />

                  {/* Value label on bar */}
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    x={x + barWidth / 2}
                    y={y - 10}
                    fontSize="12"
                    fontWeight="600"
                    fill="hsl(var(--foreground))"
                    textAnchor="middle"
                  >
                    ₨{(Math.abs(item.value) / 1000).toFixed(0)}k
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
                    fontSize="11"
                    fill="hsl(var(--muted-foreground))"
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
