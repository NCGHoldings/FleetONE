import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { YutongReportData } from '@/hooks/useYutongExecutiveReport';
import { Users, UserPlus, UserCheck, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: YutongReportData;
}

const formatLKR = (val: number) => `LKR ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4'];

export function YutongCustomerAnalytics({ data }: Props) {
  const { customerBreakdown, topCustomers } = data;

  const customerTypePie = [
    { name: 'New Customers', value: customerBreakdown.newCustomers },
    { name: 'Repeat Customers', value: customerBreakdown.repeatCustomers },
  ].filter(p => p.value > 0);

  // Concentration
  const totalRev = data.orders.totalOrderValue;
  const top3Rev = topCustomers.slice(0, 3).reduce((s, c) => s + c.totalValue, 0);
  const top5Rev = topCustomers.slice(0, 5).reduce((s, c) => s + c.totalValue, 0);
  const restRev = totalRev - top5Rev;

  const concentrationPie = [
    { name: 'Top 3', value: top3Rev },
    { name: 'Rank 4-5', value: Math.max(0, top5Rev - top3Rev) },
    { name: 'Others', value: Math.max(0, restRev) },
  ].filter(p => p.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Customer Type Split */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 rounded-lg p-3 bg-blue-50 flex-1">
              <UserPlus className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{customerBreakdown.newCustomers}</p>
                <p className="text-[10px] text-muted-foreground">New</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg p-3 bg-emerald-50 flex-1">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{customerBreakdown.repeatCustomers}</p>
                <p className="text-[10px] text-muted-foreground">Repeat</p>
              </div>
            </div>
          </div>
          {customerTypePie.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={customerTypePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}>
                  {customerTypePie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue Concentration */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue Concentration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-3">
            <p className="text-3xl font-bold text-primary">{customerBreakdown.topConcentration}%</p>
            <p className="text-xs text-muted-foreground">from top 3 customers</p>
          </div>
          {concentrationPie.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={concentrationPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {concentrationPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatLKR(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Top Customers Table */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {topCustomers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{c.company_name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.orderCount} orders • Avg {formatLKR(c.avgOrderValue)}</p>
                  </div>
                  <p className="text-xs font-bold shrink-0">{formatLKR(c.totalValue)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
