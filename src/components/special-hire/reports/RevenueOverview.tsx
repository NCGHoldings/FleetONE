import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Percent, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyData } from "@/hooks/useSpecialHireReports";

const formatLKR = (v: number) => `LKR ${(v / 1_000_000).toFixed(1)}M`;
const formatLKRK = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}K`;

interface Props {
  stats: any;
  monthlyData: MonthlyData[];
}

export default function RevenueOverview({ stats, monthlyData }: Props) {
  const kpis = [
    { label: "Total Revenue", value: formatLKR(stats.totalRevenue), icon: DollarSign, color: "text-blue-600" },
    { label: "Total Profit", value: formatLKR(stats.totalProfit), icon: TrendingUp, color: "text-green-600" },
    { label: "Profit Margin", value: `${stats.profitMargin.toFixed(1)}%`, icon: Percent, color: "text-purple-600" },
    { label: "Avg Trip Value", value: `LKR ${stats.avgTripValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, icon: BarChart3, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`h-4 w-4 ${k.color}`} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-lg font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Revenue vs Profit (Monthly)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatLKRK(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Revenue" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" stroke="hsl(142, 76%, 36%)" name="Profit" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
