import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  topBuses: { bus: string; trips: number; revenue: number }[];
  topRoutes: { route: string; trips: number; revenue: number }[];
}

export default function BusRouteAnalytics({ topBuses, topRoutes }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Buses by Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topBuses} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                <YAxis dataKey="bus" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Routes by Trips</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {topRoutes.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-xs text-muted-foreground w-5">#{i + 1}</span>
                    <span className="truncate">{r.route}</span>
                  </div>
                  <div className="flex gap-3 shrink-0 text-xs">
                    <span className="font-medium">{r.trips} trips</span>
                    <span className="text-muted-foreground">LKR {(r.revenue / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
