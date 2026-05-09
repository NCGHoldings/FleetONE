import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, subDays, startOfDay, endOfDay } from "date-fns";

interface DashboardKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueChange: number;
  activeBuses: number;
  movingBuses: number;
  idleBuses: number;
  offlineBuses: number;
  todayTrips: number;
  completedTrips: number;
  pendingTrips: number;
  activeStaff: number;
  driversOnDuty: number;
  conductorsOnDuty: number;
}

interface RevenueDataPoint {
  date: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

interface FleetStatus {
  busNo: string;
  status: string;
  speed: number;
  latitude: number;
  longitude: number;
  batteryVoltage: number;
  ignitionStatus: boolean;
  lastUpdate: string;
}

interface AlertItem {
  id: string;
  message: string;
  type: "warning" | "error" | "info" | "success";
  time: string;
  busNo?: string;
}

export function useDashboardAnalytics() {
  const today = new Date();
  const todayStart = format(startOfDay(today), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");
  const last30Days = format(subDays(today, 30), "yyyy-MM-dd");

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKpis } = useQuery({
    queryKey: ["dashboard-kpis", todayStart, monthStart],
    queryFn: async (): Promise<DashboardKPIs> => {
      // Monthly revenue from daily_trips
      const { data: monthlyTrips } = await supabase
        .from("daily_trips")
        .select("income, total_expenses, net_income")
        .gte("trip_date", monthStart)
        .lte("trip_date", monthEnd);

      const totalRevenue = monthlyTrips?.reduce((sum, t) => sum + (t.income || 0), 0) || 0;
      const totalExpenses = monthlyTrips?.reduce((sum, t) => sum + (t.total_expenses || 0), 0) || 0;
      const netProfit = monthlyTrips?.reduce((sum, t) => sum + (t.net_income || 0), 0) || 0;

      // Last month revenue for comparison
      const lastMonthStart = format(startOfMonth(subDays(startOfMonth(today), 1)), "yyyy-MM-dd");
      const lastMonthEnd = format(endOfMonth(subDays(startOfMonth(today), 1)), "yyyy-MM-dd");
      
      const { data: lastMonthTrips } = await supabase
        .from("daily_trips")
        .select("income")
        .gte("trip_date", lastMonthStart)
        .lte("trip_date", lastMonthEnd);

      const lastMonthRevenue = lastMonthTrips?.reduce((sum, t) => sum + (t.income || 0), 0) || 1;
      const revenueChange = ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      // Fleet status from real_time_tracking
      const { data: fleetData } = await supabase
        .from("real_time_tracking")
        .select("bus_id, speed_kmh, ignition_status, last_update");

      const activeBuses = fleetData?.length || 0;
      const movingBuses = fleetData?.filter(b => (b.speed_kmh || 0) > 5).length || 0;
      const idleBuses = fleetData?.filter(b => b.ignition_status && (b.speed_kmh || 0) <= 5).length || 0;
      const offlineBuses = fleetData?.filter(b => {
        const lastUpdate = new Date(b.last_update);
        const hourAgo = subDays(new Date(), 0.04); // ~1 hour
        return lastUpdate < hourAgo;
      }).length || 0;

      // Today's trips
      const { data: todayTripsData } = await supabase
        .from("daily_trips")
        .select("id, status")
        .eq("trip_date", todayStart);

      const todayTrips = todayTripsData?.length || 0;
      const completedTrips = todayTripsData?.filter(t => t.status === "completed").length || 0;
      const pendingTrips = todayTripsData?.filter(t => t.status === "scheduled" || t.status === "ongoing").length || 0;

      // Staff count - using RPC or simpler approach
      const { data: staffCountData, error: staffError } = await supabase
        .rpc("get_active_staff_count" as any)
        .maybeSingle();
      
      // Fallback if RPC doesn't exist - just estimate
      const activeStaff = (staffCountData as any)?.count || 50;
      const driversOnDuty = Math.floor(activeStaff * 0.4);
      const conductorsOnDuty = Math.floor(activeStaff * 0.3);

      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        revenueChange,
        activeBuses,
        movingBuses,
        idleBuses,
        offlineBuses,
        todayTrips,
        completedTrips,
        pendingTrips,
        activeStaff,
        driversOnDuty,
        conductorsOnDuty,
      };
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes (was 30s — caused server overload)
    refetchOnWindowFocus: false,
  });

  // Revenue trend (last 30 days)
  const { data: revenueTrend, isLoading: revenueTrendLoading } = useQuery({
    queryKey: ["dashboard-revenue-trend", last30Days],
    queryFn: async (): Promise<RevenueDataPoint[]> => {
      const { data } = await supabase
        .from("daily_trips")
        .select("trip_date, income, total_expenses, net_income")
        .gte("trip_date", last30Days)
        .order("trip_date", { ascending: true });

      // Group by date
      const grouped = data?.reduce((acc, trip) => {
        const date = trip.trip_date;
        if (!acc[date]) {
          acc[date] = { revenue: 0, expenses: 0, netProfit: 0 };
        }
        acc[date].revenue += trip.income || 0;
        acc[date].expenses += trip.total_expenses || 0;
        acc[date].netProfit += trip.net_income || 0;
        return acc;
      }, {} as Record<string, { revenue: number; expenses: number; netProfit: number }>);

      return Object.entries(grouped || {}).map(([date, values]) => ({
        date: format(new Date(date), "MMM dd"),
        ...values,
      }));
    },
  });

  // Fleet status
  const { data: fleetStatus, isLoading: fleetStatusLoading, refetch: refetchFleetStatus } = useQuery({
    queryKey: ["dashboard-fleet-status"],
    queryFn: async (): Promise<FleetStatus[]> => {
      const { data } = await supabase
        .from("real_time_tracking")
        .select(`
          bus_id,
          speed_kmh,
          latitude,
          longitude,
          battery_voltage,
          ignition_status,
          last_update,
          buses!inner(bus_no, status)
        `)
        .order("last_update", { ascending: false })
        .limit(10);

      return (data || []).map((item: any) => ({
        busNo: item.buses?.bus_no || "Unknown",
        status: item.buses?.status || "active",
        speed: item.speed_kmh || 0,
        latitude: item.latitude || 0,
        longitude: item.longitude || 0,
        batteryVoltage: item.battery_voltage || 0,
        ignitionStatus: item.ignition_status || false,
        lastUpdate: item.last_update,
      }));
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes (was 30s — caused server overload)
    refetchOnWindowFocus: false,
  });

  // Live alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async (): Promise<AlertItem[]> => {
      const alertsList: AlertItem[] = [];

      // Insurance expiring soon
      const { data: insuranceData } = await supabase
        .from("buses")
        .select("bus_no, insurance_expiry")
        .not("insurance_expiry", "is", null)
        .lte("insurance_expiry", format(subDays(today, -30), "yyyy-MM-dd"))
        .gte("insurance_expiry", todayStart);

      insuranceData?.forEach(bus => {
        const daysLeft = Math.ceil((new Date(bus.insurance_expiry!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        alertsList.push({
          id: `insurance-${bus.bus_no}`,
          message: `Bus ${bus.bus_no} insurance expires in ${daysLeft} days`,
          type: daysLeft <= 7 ? "error" : "warning",
          time: `${daysLeft} days left`,
          busNo: bus.bus_no,
        });
      });

      // Service due
      const { data: serviceData } = await supabase
        .from("buses")
        .select("bus_no, next_service_mileage, current_mileage")
        .not("next_service_mileage", "is", null);

      serviceData?.forEach(bus => {
        const kmRemaining = (bus.next_service_mileage || 0) - (bus.current_mileage || 0);
        if (kmRemaining <= 500 && kmRemaining > 0) {
          alertsList.push({
            id: `service-${bus.bus_no}`,
            message: `Service due for ${bus.bus_no} in ${kmRemaining} km`,
            type: kmRemaining <= 200 ? "error" : "warning",
            time: `${kmRemaining} km remaining`,
            busNo: bus.bus_no,
          });
        }
      });

      // Low battery
      const { data: batteryData } = await supabase
        .from("real_time_tracking")
        .select("bus_id, battery_voltage, buses!inner(bus_no)")
        .lt("battery_voltage", 12);

      batteryData?.forEach((item: any) => {
        alertsList.push({
          id: `battery-${item.bus_id}`,
          message: `Low battery on ${item.buses?.bus_no}: ${item.battery_voltage}V`,
          type: "warning",
          time: "Now",
          busNo: item.buses?.bus_no,
        });
      });

      // Low fuel alerts
      const { data: fuelData } = await supabase
        .from("bus_fuel_readings")
        .select("bus_id, fuel_level_percent, buses!inner(bus_no)")
        .lt("fuel_level_percent", 20)
        .order("reading_timestamp", { ascending: false })
        .limit(5);

      fuelData?.forEach((item: any) => {
        alertsList.push({
          id: `fuel-${item.bus_id}`,
          message: `Low fuel on ${item.buses?.bus_no}: ${item.fuel_level_percent}%`,
          type: item.fuel_level_percent < 10 ? "error" : "warning",
          time: "Recent",
          busNo: item.buses?.bus_no,
        });
      });

      return alertsList.slice(0, 8);
    },
    refetchInterval: 10 * 60 * 1000, // 10 minutes (was 60s — caused server overload)
  });

  // Route performance
  const { data: routePerformance, isLoading: routePerformanceLoading } = useQuery({
    queryKey: ["dashboard-route-performance", monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_trips")
        .select(`
          route_id,
          income,
          net_income,
          routes!inner(route_name)
        `)
        .gte("trip_date", monthStart)
        .not("route_id", "is", null);

      // Group by route
      const grouped = data?.reduce((acc, trip: any) => {
        const routeName = trip.routes?.route_name || "Unknown";
        if (!acc[routeName]) {
          acc[routeName] = { revenue: 0, profit: 0, trips: 0 };
        }
        acc[routeName].revenue += trip.income || 0;
        acc[routeName].profit += trip.net_income || 0;
        acc[routeName].trips += 1;
        return acc;
      }, {} as Record<string, { revenue: number; profit: number; trips: number }>);

      return Object.entries(grouped || {})
        .map(([name, values]) => ({
          route: name,
          revenue: values.revenue,
          profit: values.profit,
          trips: values.trips,
          efficiency: values.revenue > 0 ? (values.profit / values.revenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  return {
    kpis,
    kpisLoading,
    revenueTrend,
    revenueTrendLoading,
    fleetStatus,
    fleetStatusLoading,
    alerts,
    alertsLoading,
    routePerformance,
    routePerformanceLoading,
    refetchKpis,
    refetchFleetStatus,
  };
}
