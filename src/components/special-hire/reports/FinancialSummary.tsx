import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import type { MonthlyData } from "@/hooks/useSpecialHireReports";

const REV_COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 76%, 36%)", "hsl(45, 93%, 47%)", "hsl(280, 67%, 55%)"];
const EXP_COLORS = ["hsl(0, 84%, 60%)", "hsl(25, 95%, 53%)", "hsl(280, 67%, 55%)", "hsl(200, 18%, 46%)"];

interface Props {
  revenueBreakdown: { name: string; value: number }[];
  expenseBreakdown: { name: string; value: number }[];
  monthlyData: MonthlyData[];
  costPerKm: number;
}

const formatLKR = (v: number) => `LKR ${v.toLocaleString()}`;

export default function FinancialSummary({ revenueBreakdown, expenseBreakdown, monthlyData, costPerKm }: Props) {
  const marginData = monthlyData.map((m) => ({
    month: m.month,
    margin: m.revenue > 0 ? ((m.profit / m.revenue) * 100) : 0,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Cost per KM</p>
          <p className="text-xl font-bold">LKR {costPerKm.toFixed(2)}</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={revenueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {revenueBreakdown.map((_, i) => <Cell key={i} fill={REV_COLORS[i % REV_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatLKR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {expenseBreakdown.map((_, i) => <Cell key={i} fill={EXP_COLORS[i % EXP_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatLKR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Net Profit Margin Trend (%)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Line type="monotone" dataKey="margin" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
