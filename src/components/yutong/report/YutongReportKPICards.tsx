import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, TrendingUp, ShoppingCart, DollarSign, Banknote, AlertCircle, Truck, Star, ArrowUp, ArrowDown, Minus, Zap, BarChart3, Target, CreditCard } from 'lucide-react';
import { YutongReportData } from '@/hooks/useYutongExecutiveReport';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const formatLKR = (val: number) => `LKR ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const formatCompact = (val: number) => val >= 1000000 ? `LKR ${(val / 1000000).toFixed(1)}M` : formatLKR(val);

interface Props {
  data: YutongReportData;
}

function ChangeArrow({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const isUp = pct > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
      {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function MiniSparkline({ data: trendData, color }: { data: number[]; color: string }) {
  const chartData = trendData.map((v, i) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={24}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function YutongReportKPICards({ data }: Props) {
  const prev = data.previousPeriod;
  const trends = data.monthlyTrends;
  const revTrend = trends.map(t => t.revenue);
  const orderTrend = trends.map(t => t.orders);
  const delivTrend = trends.map(t => t.deliveries);
  const quoteTrend = trends.map(t => t.quotations);

  const kpis = [
    { label: 'Total Quotations', value: data.pipeline.totalQuotations.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', prevValue: prev?.orders, sparkData: quoteTrend, sparkColor: '#3b82f6' },
    { label: 'Conversion Rate', value: `${data.pipeline.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', prevValue: prev?.conversionRate, currentNum: data.pipeline.conversionRate },
    { label: 'Active Orders', value: data.orders.totalOrders.toString(), icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50', prevValue: prev?.orders, sparkData: orderTrend, sparkColor: '#9333ea' },
    { label: 'Total Revenue', value: formatCompact(data.orders.totalOrderValue), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', small: true, prevValue: prev?.revenue, currentNum: data.orders.totalOrderValue, sparkData: revTrend, sparkColor: '#d97706' },
    { label: 'Collected', value: formatCompact(data.orders.totalPaid), icon: Banknote, color: 'text-green-600', bg: 'bg-green-50', small: true },
    { label: 'Outstanding', value: formatCompact(data.orders.totalBalance), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', small: true },
    { label: 'Units Delivered', value: data.delivery.totalDelivered.toString(), icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', prevValue: prev?.delivered, sparkData: delivTrend, sparkColor: '#4f46e5' },
    { label: 'Customer Rating', value: data.afterSales.avgFeedbackRating > 0 ? `${data.afterSales.avgFeedbackRating}/5` : 'N/A', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Avg Deal Size', value: formatCompact(data.currentPeriod.avgDealSize), icon: Target, color: 'text-pink-600', bg: 'bg-pink-50', small: true, prevValue: prev?.avgDealSize, currentNum: data.currentPeriod.avgDealSize },
    { label: 'Pipeline Velocity', value: `${data.velocity.avgQuoteToOrderDays}d`, icon: Zap, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Collection Rate', value: `${data.payments.collectionRate.toFixed(0)}%`, icon: CreditCard, color: 'text-teal-600', bg: 'bg-teal-50', prevValue: prev?.collectionRate, currentNum: data.payments.collectionRate },
    { label: 'Health Score', value: `${data.healthScore}/100`, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 print:grid-cols-6">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-0 shadow-md">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded-lg ${kpi.bg} shrink-0`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                <div className="flex items-center gap-1">
                  <p className={`font-bold ${kpi.small ? 'text-xs' : 'text-sm'} truncate`}>{kpi.value}</p>
                  {kpi.prevValue !== undefined && kpi.currentNum !== undefined && (
                    <ChangeArrow current={kpi.currentNum} previous={kpi.prevValue} />
                  )}
                </div>
              </div>
            </div>
            {kpi.sparkData && (
              <div className="mt-1">
                <MiniSparkline data={kpi.sparkData} color={kpi.sparkColor!} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
