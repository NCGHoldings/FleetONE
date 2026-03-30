import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightVehicleReportData } from '@/hooks/useLightVehicleExecutiveReport';
import { Zap, Target, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: LightVehicleReportData;
}

export function LightVehicleSalesVelocity({ data }: Props) {
  const { velocity, pipeline, monthlyTrends } = data;

  // Win/Loss trend from monthly data (approximation)
  const winLossData = monthlyTrends.map(m => {
    const winRate = m.quotations > 0 ? (m.orders / m.quotations) * 100 : 0;
    return { month: m.month, winRate: Math.min(winRate, 100) };
  });

  // Conversion funnel
  const funnel = [
    { stage: 'Quotations', count: pipeline.totalQuotations, pct: 100 },
    { stage: 'Sent', count: pipeline.sent + pipeline.confirmed, pct: pipeline.totalQuotations > 0 ? ((pipeline.sent + pipeline.confirmed) / pipeline.totalQuotations) * 100 : 0 },
    { stage: 'Confirmed', count: pipeline.confirmed, pct: pipeline.totalQuotations > 0 ? (pipeline.confirmed / pipeline.totalQuotations) * 100 : 0 },
    { stage: 'Orders', count: data.orders.totalOrders, pct: pipeline.totalQuotations > 0 ? (data.orders.totalOrders / pipeline.totalQuotations) * 100 : 0 },
    { stage: 'Delivered', count: data.delivery.totalDelivered, pct: pipeline.totalQuotations > 0 ? (data.delivery.totalDelivered / pipeline.totalQuotations) * 100 : 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Velocity Metrics */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sales Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Quote → Order</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-primary">{velocity.avgQuoteToOrderDays}</span>
                  <span className="text-sm text-muted-foreground mb-1">days avg</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className="bg-primary rounded-full h-2" style={{ width: `${Math.min(100, (30 / Math.max(velocity.avgQuoteToOrderDays, 1)) * 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Order → Delivery</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-indigo-600">{velocity.avgOrderToDeliveryDays}</span>
                  <span className="text-sm text-muted-foreground mb-1">days avg</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className="bg-indigo-500 rounded-full h-2" style={{ width: `${Math.min(100, (90 / Math.max(velocity.avgOrderToDeliveryDays, 1)) * 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Avg Collection Time</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-emerald-600">{velocity.avgCollectionDays}</span>
                  <span className="text-sm text-muted-foreground mb-1">days avg</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className="bg-emerald-500 rounded-full h-2" style={{ width: `${Math.min(100, (30 / Math.max(velocity.avgCollectionDays, 1)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnel.map((step, i) => (
              <div key={step.stage} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{step.stage}</span>
                  <span className="text-sm">
                    <span className="font-bold">{step.count}</span>
                    <span className="text-muted-foreground ml-1">({step.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(step.pct, 2)}%`,
                      background: `hsl(${215 + i * 15}, 70%, ${55 + i * 5}%)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Win Rate Trend */}
      <Card className="border-0 shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Win Rate Trend (Monthly)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={winLossData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Area type="monotone" dataKey="winRate" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} name="Win Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
