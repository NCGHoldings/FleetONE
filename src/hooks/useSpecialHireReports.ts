import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from "date-fns";

export interface ReportFilters {
  dateFrom: Date;
  dateTo: Date;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  profit: number;
  trips: number;
  fuelCost: number;
  commission: number;
  advance: number;
}

export function useSpecialHireReports() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: subMonths(startOfMonth(new Date()), 11),
    dateTo: endOfMonth(new Date()),
  });

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["special-hire-reports", filters.dateFrom.toISOString(), filters.dateTo.toISOString()],
    queryFn: async () => {
      // Fetch all with cursor pagination to bypass 1000 limit
      let allData: any[] = [];
      let lastCreatedAt: string | null = null;
      let lastId: string | null = null;
      const batchSize = 1000;

      while (true) {
        let query = supabase
          .from("special_hire_quotations")
          .select("id, quotation_no, pickup_datetime, pickup_location, drop_location, assigned_bus_no, hire_charge, extra_charges, overtime_charge, overnight_charge, gross_revenue, fuel_cost_fuel_only, driver_charge, commission_amount, referral_commission_amount, total_expenses, net_profit, advance_paid, balance_due, total_paid, status, trip_status, km_trip, km_parking_to_pickup, km_drop_to_parking, bus_type_id, customer_total_with_fuel, created_at, number_of_buses, fuel_price_per_liter, referral_agent_id")
          .gte("pickup_datetime", filters.dateFrom.toISOString())
          .lte("pickup_datetime", filters.dateTo.toISOString())
          .eq("is_active_version", true)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .limit(batchSize);

        if (lastCreatedAt && lastId) {
          query = query.or(`created_at.gt.${lastCreatedAt},and(created_at.eq.${lastCreatedAt},id.gt.${lastId})`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allData = [...allData, ...data];
        if (data.length < batchSize) break;

        const last = data[data.length - 1];
        lastCreatedAt = last.created_at;
        lastId = last.id;
      }
      return allData;
    },
  });

  // Fetch bus types for names
  const { data: busTypes = [] } = useQuery({
    queryKey: ["bus-types-for-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("bus_types").select("id, name");
      return data || [];
    },
  });

  // Fetch referral agents
  const { data: agents = [] } = useQuery({
    queryKey: ["referral-agents-for-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("referral_agents").select("id, name");
      return data || [];
    },
  });

  const agentMap = useMemo(() => {
    const m: Record<string, string> = {};
    agents.forEach((a: any) => { m[a.id] = a.name; });
    return m;
  }, [agents]);

  const busTypeMap = useMemo(() => {
    const m: Record<string, string> = {};
    busTypes.forEach((b: any) => { m[b.id] = b.name; });
    return m;
  }, [busTypes]);

  const stats = useMemo(() => {
    const q = quotations;
    const totalRevenue = q.reduce((s, r) => s + (Number(r.gross_revenue) || 0), 0);
    const totalProfit = q.reduce((s, r) => s + (Number(r.net_profit) || 0), 0);
    const totalFuel = q.reduce((s, r) => s + (Number(r.fuel_cost_fuel_only) || 0), 0);
    const totalDriver = q.reduce((s, r) => s + (Number(r.driver_charge) || 0), 0);
    const totalCommission = q.reduce((s, r) => s + (Number(r.commission_amount) || 0) + (Number(r.referral_commission_amount) || 0), 0);
    const totalExpenses = q.reduce((s, r) => s + (Number(r.total_expenses) || 0), 0);
    const totalAdvance = q.reduce((s, r) => s + (Number(r.advance_paid) || 0), 0);
    const totalBalance = q.reduce((s, r) => s + (Number(r.balance_due) || 0), 0);
    const totalHireCharge = q.reduce((s, r) => s + (Number(r.hire_charge) || 0), 0);
    const totalExtra = q.reduce((s, r) => s + (Number(r.extra_charges) || 0), 0);
    const totalOvertime = q.reduce((s, r) => s + (Number(r.overtime_charge) || 0), 0);
    const totalOvernight = q.reduce((s, r) => s + (Number(r.overnight_charge) || 0), 0);
    const totalKm = q.reduce((s, r) => s + (Number(r.km_trip) || 0), 0);
    const avgTripValue = q.length > 0 ? totalRevenue / q.length : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const collectionRate = totalRevenue > 0 ? (totalAdvance / totalRevenue) * 100 : 0;
    const costPerKm = totalKm > 0 ? totalExpenses / totalKm : 0;
    const fuelRevenueRatio = totalRevenue > 0 ? (totalFuel / totalRevenue) * 100 : 0;

    return {
      totalRevenue, totalProfit, totalFuel, totalDriver, totalCommission,
      totalExpenses, totalAdvance, totalBalance, totalHireCharge, totalExtra,
      totalOvertime, totalOvernight, totalKm, avgTripValue, profitMargin,
      collectionRate, costPerKm, fuelRevenueRatio, tripCount: q.length,
    };
  }, [quotations]);

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    const map: Record<string, MonthlyData> = {};
    quotations.forEach((r) => {
      const month = format(new Date(r.pickup_datetime), "yyyy-MM");
      if (!map[month]) {
        map[month] = { month, revenue: 0, profit: 0, trips: 0, fuelCost: 0, commission: 0, advance: 0 };
      }
      map[month].revenue += Number(r.gross_revenue) || 0;
      map[month].profit += Number(r.net_profit) || 0;
      map[month].trips += 1;
      map[month].fuelCost += Number(r.fuel_cost_fuel_only) || 0;
      map[month].commission += (Number(r.commission_amount) || 0) + (Number(r.referral_commission_amount) || 0);
      map[month].advance += Number(r.advance_paid) || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [quotations]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    quotations.forEach((r) => {
      const s = r.trip_status || r.status || "unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [quotations]);

  // Revenue breakdown
  const revenueBreakdown = useMemo(() => [
    { name: "Hire Charge", value: stats.totalHireCharge },
    { name: "Extra Charges", value: stats.totalExtra },
    { name: "Overtime", value: stats.totalOvertime },
    { name: "Overnight", value: stats.totalOvernight },
  ].filter(i => i.value > 0), [stats]);

  // Expense breakdown
  const expenseBreakdown = useMemo(() => [
    { name: "Fuel", value: stats.totalFuel },
    { name: "Driver", value: stats.totalDriver },
    { name: "Commission", value: stats.totalCommission },
    { name: "Other", value: Math.max(0, stats.totalExpenses - stats.totalFuel - stats.totalDriver - stats.totalCommission) },
  ].filter(i => i.value > 0), [stats]);

  // Top buses
  const topBuses = useMemo(() => {
    const map: Record<string, { bus: string; trips: number; revenue: number }> = {};
    quotations.forEach((r) => {
      const buses = (r.assigned_bus_no || "").split(",").map((b: string) => b.trim()).filter(Boolean);
      buses.forEach((bus: string) => {
        if (!map[bus]) map[bus] = { bus, trips: 0, revenue: 0 };
        map[bus].trips += 1;
        map[bus].revenue += (Number(r.gross_revenue) || 0) / (buses.length || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [quotations]);

  // Top routes
  const topRoutes = useMemo(() => {
    const map: Record<string, { route: string; trips: number; revenue: number }> = {};
    quotations.forEach((r) => {
      const route = `${r.pickup_location || "?"} → ${r.drop_location || "?"}`;
      if (!map[route]) map[route] = { route, trips: 0, revenue: 0 };
      map[route].trips += 1;
      map[route].revenue += Number(r.gross_revenue) || 0;
    });
    return Object.values(map).sort((a, b) => b.trips - a.trips).slice(0, 10);
  }, [quotations]);

  // Payment aging
  const paymentAging = useMemo(() => {
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    const now = new Date();
    quotations.forEach((r) => {
      const bal = Number(r.balance_due) || 0;
      if (bal <= 0) return;
      const days = differenceInDays(now, new Date(r.pickup_datetime));
      if (days <= 30) buckets["0-30"] += bal;
      else if (days <= 60) buckets["31-60"] += bal;
      else if (days <= 90) buckets["61-90"] += bal;
      else buckets["90+"] += bal;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [quotations]);

  // Commission by agent
  const commissionByAgent = useMemo(() => {
    const map: Record<string, { name: string; trips: number; commission: number }> = {};
    quotations.forEach((r) => {
      if (!r.referral_agent_id) return;
      const id = r.referral_agent_id;
      if (!map[id]) map[id] = { name: agentMap[id] || "Unknown", trips: 0, commission: 0 };
      map[id].trips += 1;
      map[id].commission += (Number(r.referral_commission_amount) || 0) + (Number(r.commission_amount) || 0);
    });
    return Object.values(map).sort((a, b) => b.commission - a.commission).slice(0, 10);
  }, [quotations, agentMap]);

  // Fuel efficiency per bus type
  const fuelByBusType = useMemo(() => {
    const map: Record<string, { name: string; totalKm: number; totalLiters: number; totalCost: number; trips: number }> = {};
    quotations.forEach((r) => {
      const btId = r.bus_type_id;
      if (!btId) return;
      const name = busTypeMap[btId] || "Unknown";
      if (!map[btId]) map[btId] = { name, totalKm: 0, totalLiters: 0, totalCost: 0, trips: 0 };
      map[btId].totalKm += Number(r.km_trip) || 0;
      const fuelCost = Number(r.fuel_cost_fuel_only) || 0;
      const fuelPrice = Number(r.fuel_price_per_liter) || 0;
      map[btId].totalLiters += fuelPrice > 0 ? fuelCost / fuelPrice : 0;
      map[btId].totalCost += fuelCost;
      map[btId].trips += 1;
    });
    return Object.values(map).map(v => ({
      ...v,
      kmPerLiter: v.totalLiters > 0 ? v.totalKm / v.totalLiters : 0,
      avgCostPerTrip: v.trips > 0 ? v.totalCost / v.trips : 0,
    }));
  }, [quotations, busTypeMap]);

  return {
    filters, setFilters, isLoading, quotations,
    stats, monthlyData, statusBreakdown, revenueBreakdown, expenseBreakdown,
    topBuses, topRoutes, paymentAging, commissionByAgent, fuelByBusType,
  };
}
