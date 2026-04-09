import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import type { MonthlyData } from "@/hooks/useSpecialHireReports";

interface Props {
  totalAdvance: number;
  totalBalance: number;
  collectionRate: number;
  paymentAging: { name: string; value: number }[];
  monthlyData: MonthlyData[];
}

export default function PaymentCollectionReport({ totalAdvance, totalBalance, collectionRate, paymentAging, monthlyData }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Advance Collected</p>
            <p className="text-xl font-bold text-green-600">LKR {(totalAdvance / 1_000_000).toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Balance Due</p>
            <p className="text-xl font-bold text-red-600">LKR {(totalBalance / 1_000_000).toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Collection Rate</p>
            <p className="text-xl font-bold">{collectionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding Receivables Aging</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={paymentAging}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
              <Bar dataKey="value" name="Outstanding" radius={[4, 4, 0, 0]}>
                {paymentAging.map((_, i) => {
                  const colors = ["hsl(142, 76%, 36%)", "hsl(45, 93%, 47%)", "hsl(25, 95%, 53%)", "hsl(0, 84%, 60%)"];
                  return <rect key={i} fill={colors[i]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Advance Collection Trend (Monthly)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="advance" stroke="hsl(142, 76%, 36%)" name="Advance" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
