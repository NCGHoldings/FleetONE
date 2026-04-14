import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightVehicleReportData, PeriodMetrics } from '@/hooks/useLightVehicleExecutiveReport';
import { ArrowUp, ArrowDown, Minus, GitCompare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: LightVehicleReportData;
}

const formatLKR = (val: number) => `LKR ${(val / 1000000).toFixed(1)}M`;

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  const color = isUp ? 'text-emerald-600' : 'text-red-600';
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function LightVehiclePeriodComparison({ data }: Props) {
  if (!data.previousPeriod) return null;

  const prev = data.previousPeriod;
  const curr = data.currentPeriod;

  const metrics = [
    { label: 'Revenue', current: curr.revenue, previous: prev.revenue, format: formatLKR },
    { label: 'Orders', current: curr.orders, previous: prev.orders, format: (v: number) => v.toString() },
    { label: 'Units', current: curr.units, previous: prev.units, format: (v: number) => v.toString() },
    { label: 'Conversion', current: curr.conversionRate, previous: prev.conversionRate, format: (v: number) => `${v.toFixed(1)}%` },
    { label: 'Collection', current: curr.collectionRate, previous: prev.collectionRate, format: (v: number) => `${v.toFixed(1)}%` },
    { label: 'Delivered', current: curr.delivered, previous: prev.delivered, format: (v: number) => v.toString() },
  ];

  const chartData = metrics.map(m => ({
    metric: m.label,
    Current: m.label.includes('Revenue') ? m.current / 1000000 : m.current,
    Previous: m.label.includes('Revenue') ? m.previous / 1000000 : m.previous,
  }));

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          Period Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {metrics.map(m => (
            <div key={m.label} className="rounded-xl p-3 bg-muted/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className="text-lg font-bold mt-1">{m.format(m.current)}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground">vs {m.format(m.previous)}</span>
                <ChangeIndicator current={m.current} previous={m.previous} />
              </div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Current" fill="hsl(215, 88%, 52%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Previous" fill="hsl(215, 30%, 75%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
