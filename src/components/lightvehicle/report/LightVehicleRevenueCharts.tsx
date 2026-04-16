import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LightVehicleReportData } from '@/hooks/useLightVehicleExecutiveReport';
import { Progress } from '@/components/ui/progress';

interface Props {
  data: LightVehicleReportData;
}

const formatLKR = (val: number) => `LKR ${(val / 1000000).toFixed(1)}M`;
const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

export function LightVehicleRevenueCharts({ data }: Props) {
  const paymentPieData = [
    { name: 'Paid', value: data.payments.totalPaid },
    { name: 'Pending', value: data.payments.totalPending },
    { name: 'Overdue', value: data.payments.totalOverdue },
  ].filter(d => d.value > 0);

  const paymentModeData = [
    { name: 'Cash', value: data.orders.cashCount },
    { name: 'Lease', value: data.orders.leaseCount },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Monthly Revenue Trend */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`LKR ${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="hsl(215, 88%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Status */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentPieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Collection Rate</span>
                  <span className="font-bold">{data.payments.collectionRate.toFixed(1)}%</span>
                </div>
                <Progress value={data.payments.collectionRate} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {paymentModeData.map(pm => (
                  <div key={pm.name} className="text-center p-2 rounded-lg bg-muted">
                    <p className="text-muted-foreground text-xs">{pm.name}</p>
                    <p className="font-bold">{pm.value}</p>
                  </div>
                ))}
              </div>
              {data.payments.lcActive > 0 && (
                <div className="text-sm p-2 rounded-lg bg-blue-50 text-center">
                  <p className="text-xs text-muted-foreground">Active LCs</p>
                  <p className="font-bold text-blue-600">{data.payments.lcActive} / {data.payments.lcTotal}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
