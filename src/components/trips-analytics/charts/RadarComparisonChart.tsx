import { ResponsiveRadar } from '@nivo/radar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface ComparisonItem {
  id: string;
  name: string;
  income: number;
  expenses: number;
  trips: number;
  efficiency: number;
}

interface RadarComparisonChartProps {
  title?: string;
  description?: string;
  items: ComparisonItem[];
  type: 'drivers' | 'routes' | 'buses';
}

export default function RadarComparisonChart({ 
  title = "Multi-Dimensional Comparison",
  description = "Performance across key metrics",
  items,
  type
}: RadarComparisonChartProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No data available for comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top 3-5 items for comparison
  const topItems = items.slice(0, Math.min(5, items.length));

  // Normalize data to 0-100 scale for radar chart
  const maxIncome = Math.max(...topItems.map(i => i.income ?? 0), 1);
  const maxExpenses = Math.max(...topItems.map(i => i.expenses ?? 0), 1);
  const maxTrips = Math.max(...topItems.map(i => i.trips ?? 0), 1);
  const maxEfficiency = Math.max(...topItems.map(i => i.efficiency ?? 0), 1);

  const data = [
    {
      metric: 'Income',
      ...Object.fromEntries(
        topItems.map(item => [
          item.name,
          maxIncome > 0 ? ((item.income ?? 0) / maxIncome) * 100 : 0
        ])
      )
    },
    {
      metric: 'Efficiency',
      ...Object.fromEntries(
        topItems.map(item => [
          item.name,
          maxEfficiency > 0 ? ((item.efficiency ?? 0) / maxEfficiency) * 100 : 0
        ])
      )
    },
    {
      metric: 'Trips',
      ...Object.fromEntries(
        topItems.map(item => [
          item.name,
          maxTrips > 0 ? ((item.trips ?? 0) / maxTrips) * 100 : 0
        ])
      )
    },
    {
      metric: 'Cost Control',
      ...Object.fromEntries(
        topItems.map(item => [
          item.name,
          maxExpenses > 0 ? Math.max(0, 100 - ((item.expenses ?? 0) / maxExpenses) * 100) : 0
        ])
      )
    },
    {
      metric: 'Profitability',
      ...Object.fromEntries(
        topItems.map(item => [
          item.name,
          maxIncome > 0 ? (((item.income ?? 0) - (item.expenses ?? 0)) / maxIncome) * 100 : 0
        ])
      )
    },
  ];

  const keys = topItems.map(item => item.name);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <ResponsiveRadar
              data={data}
              keys={keys}
              indexBy="metric"
              maxValue={100}
              margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
              curve="linearClosed"
              borderWidth={2}
              borderColor={{ from: 'color' }}
              gridLevels={5}
              gridShape="circular"
              gridLabelOffset={16}
              enableDots={true}
              dotSize={8}
              dotColor={{ theme: 'background' }}
              dotBorderWidth={2}
              dotBorderColor={{ from: 'color' }}
              enableDotLabel={false}
              colors={{ scheme: 'nivo' }}
              fillOpacity={0.15}
              blendMode="multiply"
              animate={true}
              motionConfig="gentle"
              isInteractive={true}
              theme={{
                text: {
                  fill: 'hsl(var(--foreground))',
                  fontSize: 11
                },
                grid: {
                  line: {
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 1
                  }
                },
                tooltip: {
                  container: {
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                    borderRadius: '6px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '8px 12px'
                  }
                }
              }}
              legends={[
                {
                  anchor: 'top-left',
                  direction: 'column',
                  translateX: -50,
                  translateY: -40,
                  itemWidth: 80,
                  itemHeight: 20,
                  itemTextColor: 'hsl(var(--foreground))',
                  symbolSize: 12,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemTextColor: 'hsl(var(--primary))'
                      }
                    }
                  ]
                }
              ]}
            />
          </div>

          {/* Explanation */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-2">How to read this chart:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Each axis represents a normalized metric (0-100 scale)</li>
              <li>Larger areas indicate better overall performance</li>
              <li>Compare shapes to identify strengths and weaknesses</li>
              <li>Cost Control is inverted: higher is better (lower expenses)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
