import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import type { MonthlyData } from "@/hooks/useSpecialHireReports";

interface Props {
  totalCommission: number;
  totalRevenue: number;
  commissionByAgent: { name: string; trips: number; commission: number }[];
  monthlyData: MonthlyData[];
}

export default function CommissionReport({ totalCommission, totalRevenue, commissionByAgent, monthlyData }: Props) {
  const commPct = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Commissions</p>
            <p className="text-xl font-bold">LKR {totalCommission.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Commission % of Revenue</p>
            <p className="text-xl font-bold">{commPct.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>
      {commissionByAgent.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Referral Agents</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={commissionByAgent} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
                <Bar dataKey="commission" fill="hsl(280, 67%, 55%)" name="Commission" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Commission Trend (Monthly)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="commission" stroke="hsl(280, 67%, 55%)" name="Commission" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
