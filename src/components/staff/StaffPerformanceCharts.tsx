import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Route, TrendingUp } from "lucide-react";

interface StaffPerformanceChartsProps {
  staffId: string;
  staffName: string;
}

interface RouteData {
  route: string;
  trips: number;
  revenue: number;
}

interface MonthlyData {
  month: string;
  score: number;
  trips: number;
}

export function StaffPerformanceCharts({ staffId, staffName }: StaffPerformanceChartsProps) {
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Fetch attendance records for this staff
        const { data: attendance, error: attendanceError } = await supabase
          .from('staff_attendance')
          .select('*')
          .or(`staff_id.eq.${staffId},staff_registry_id.eq.${staffId}`);

        if (attendanceError) console.error('Attendance error:', attendanceError);

        // Fetch trips to match by name
        const { data: trips, error: tripsError } = await supabase
          .from('daily_trips')
          .select('*, route:routes(route_name)')
          .order('trip_date', { ascending: false })
          .limit(100);

        if (tripsError) console.error('Trips error:', tripsError);

        // Match trips by staff name in notes
        const staffTrips = (trips || []).filter(trip => {
          try {
            const notes = typeof trip.notes === 'string' ? JSON.parse(trip.notes) : trip.notes;
            const driverName = notes?.driver?.toLowerCase() || '';
            const conductorName = notes?.conductor?.toLowerCase() || '';
            const staffNameLower = staffName?.toLowerCase() || '';
            return driverName.includes(staffNameLower) || conductorName.includes(staffNameLower);
          } catch {
            return false;
          }
        });

        // Group by route
        const routeMap = new Map<string, { trips: number; revenue: number }>();
        staffTrips.forEach(trip => {
          const routeName = (trip.route as any)?.route_name || attendance?.find(a => a.trip_id === trip.id)?.route || 'Unknown';
          const existing = routeMap.get(routeName) || { trips: 0, revenue: 0 };
          existing.trips += 1;
          existing.revenue += parseFloat(trip.income as any) || 0;
          routeMap.set(routeName, existing);
        });

        const routeChartData: RouteData[] = Array.from(routeMap.entries())
          .map(([route, data]) => ({
            route: route.length > 10 ? route.substring(0, 10) + '...' : route,
            trips: data.trips,
            revenue: Math.round(data.revenue),
          }))
          .sort((a, b) => b.trips - a.trips)
          .slice(0, 5);

        setRouteData(routeChartData);

        // Group by month for trend
        const monthMap = new Map<string, { score: number; trips: number }>();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        staffTrips.forEach(trip => {
          const date = new Date(trip.trip_date);
          const monthKey = months[date.getMonth()];
          const existing = monthMap.get(monthKey) || { score: 0, trips: 0 };
          existing.trips += 1;
          // Calculate a simple score based on fuel efficiency
          const fuelEff = parseFloat(trip.km_per_liter as any) || 0;
          existing.score += fuelEff > 8 ? 80 : fuelEff > 6 ? 60 : 40;
          monthMap.set(monthKey, existing);
        });

        // Get last 6 months
        const currentMonth = new Date().getMonth();
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const monthIndex = (currentMonth - 5 + i + 12) % 12;
          return months[monthIndex];
        });

        const monthlyChartData: MonthlyData[] = last6Months.map(month => {
          const data = monthMap.get(month) || { score: 0, trips: 0 };
          return {
            month,
            score: data.trips > 0 ? Math.round(data.score / data.trips) : 0,
            trips: data.trips,
          };
        });

        setMonthlyData(monthlyChartData);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (staffId && staffName) {
      fetchChartData();
    }
  }, [staffId, staffName]);

  const chartConfig = {
    trips: {
      label: "Trips",
      color: "hsl(var(--primary))",
    },
    score: {
      label: "Score",
      color: "hsl(var(--chart-2))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-3))",
    },
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse h-[250px] bg-muted rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse h-[250px] bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Trips by Route */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4" />
            Trips by Route
          </CardTitle>
        </CardHeader>
        <CardContent>
          {routeData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="route" type="category" width={80} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="trips" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No route data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance Trend (6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.some(d => d.trips > 0) ? (
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Avg Score"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="trips"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Trips"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
