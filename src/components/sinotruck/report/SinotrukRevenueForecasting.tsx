import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SinotrukReportData } from '@/hooks/useSinotrukExecutiveReport';
import { TrendingUp, PieChart as PieIcon, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';

interface Props {
  data: SinotrukReportData;
}

const formatLKR = (val: number) => `LKR ${(val / 1000000).toFixed(1)}M`;

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];

export function SinotrukRevenueForecasting({ data }: Props) {
  // Revenue trend with 3-month forecast
  const trends = data.monthlyTrends;
  const last3 = trends.slice(-3);
  const avgGrowth = last3.length >= 2 ? (last3[last3.length - 1].revenue - last3[0].revenue) / (last3.length - 1) : 0;
  const lastRevenue = last3[last3.length - 1]?.revenue || 0;

  const forecastData = trends.map(t => ({ month: t.month, revenue: t.revenue / 1000000, forecast: null as number | null }));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    forecastData.push({
      month: label,
      revenue: null as any,
      forecast: Math.max(0, (lastRevenue + avgGrowth * i)) / 1000000,
    });
  }

  // Revenue by model for stacked display
  const modelData = data.revenueByModel.filter(m => m.revenue > 0).map(m => ({
    model: m.model,
    revenue: m.revenue / 1000000,
  }));

  // Payment mode pie
  const paymentPie = [
    { name: 'Cash', value: data.revenueByPaymentMode.cash },
    { name: 'Lease', value: data.revenueByPaymentMode.lease },
  ].filter(p => p.value > 0);

  // Aging
  const agingData = [
    { bucket: '0-30 days', amount: data.aging.current / 1000000, color: '#22c55e' },
    { bucket: '31-60 days', amount: data.aging.days31to60 / 1000000, color: '#f59e0b' },
    { bucket: '61-90 days', amount: data.aging.days61to90 / 1000000, color: '#ef4444' },
    { bucket: '90+ days', amount: data.aging.over90 / 1000000, color: '#991b1b' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Revenue Trend + Forecast */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue Trend & 3-Month Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} />
              <Tooltip formatter={(v: number) => `LKR ${v.toFixed(1)}M`} />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Forecast" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Model */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Revenue by Bus Model</CardTitle>
        </CardHeader>
        <CardContent>
          {modelData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No model data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: number) => `LKR ${v.toFixed(1)}M`} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {modelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment Mode Split */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PieIcon className="h-4 w-4" />
            Revenue by Payment Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentPie.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No payment data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={paymentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatLKR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Aging Analysis */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Outstanding Collections Aging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} />
              <Tooltip formatter={(v: number) => `LKR ${v.toFixed(2)}M`} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {agingData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            {agingData.map(d => (
              <div key={d.bucket} className="text-xs">
                <p className="font-semibold">LKR {(d.amount).toFixed(1)}M</p>
                <p className="text-muted-foreground">{d.bucket}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
