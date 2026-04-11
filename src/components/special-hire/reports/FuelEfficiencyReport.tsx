import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import type { MonthlyData } from "@/hooks/useSpecialHireReports";

interface FuelBusType {
  name: string;
  kmPerLiter: number;
  avgCostPerTrip: number;
  totalCost: number;
  trips: number;
}

interface Props {
  fuelByBusType: FuelBusType[];
  monthlyData: MonthlyData[];
  fuelRevenueRatio: number;
  totalFuel: number;
  tripCount: number;
}

const STANDARD_KM_PER_L = 3.5;

export default function FuelEfficiencyReport({ fuelByBusType, monthlyData, fuelRevenueRatio, totalFuel, tripCount }: Props) {
  const avgFuelPerTrip = tripCount > 0 ? totalFuel / tripCount : 0;

  const busTypeChart = fuelByBusType.map(b => ({
    name: b.name.length > 15 ? b.name.slice(0, 15) + "…" : b.name,
    "KM/L": Number(b.kmPerLiter.toFixed(2)),
    standard: STANDARD_KM_PER_L,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fuel / Revenue Ratio</p>
            <p className="text-xl font-bold">{fuelRevenueRatio.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Fuel Cost / Trip</p>
            <p className="text-xl font-bold">LKR {avgFuelPerTrip.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Fuel Cost</p>
            <p className="text-xl font-bold">LKR {(totalFuel / 1_000_000).toFixed(1)}M</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">KM/L by Bus Type (vs Standard {STANDARD_KM_PER_L})</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={busTypeChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="KM/L" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="standard" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} opacity={0.3} name="Standard" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fuel Cost Trend (Monthly)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="fuelCost" stroke="hsl(0, 84%, 60%)" name="Fuel Cost" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
