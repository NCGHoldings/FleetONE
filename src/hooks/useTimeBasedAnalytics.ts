import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format, parseISO, getDay } from "date-fns";

export interface TimeSlotData {
  hour: number;
  timeLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalTrips: number;
  avgEfficiency: number;
}

export interface DayOfWeekData {
  day: number;
  dayName: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalTrips: number;
  avgEfficiency: number;
}

export interface TimeBasedAnalytics {
  hourlyData: TimeSlotData[];
  dailyData: DayOfWeekData[];
  peakHours: Array<{
    hour: number;
    profit: number;
    trips: number;
  }>;
  timeSlots: {
    morning: { income: number; profit: number; trips: number };
    afternoon: { income: number; profit: number; trips: number };
    evening: { income: number; profit: number; trips: number };
  };
  bestPerformingTimes: {
    mostProfitableHour: number;
    mostProfitableDay: string;
    busiestHour: number;
    busiestDay: string;
  };
}

export function useTimeBasedAnalytics(
  startDate?: Date,
  endDate?: Date,
  branchId?: string
) {
  return useQuery({
    queryKey: ["time-based-analytics", startDate, endDate, branchId],
    queryFn: async () => {
      const query = supabase
        .from("daily_trips")
        .select(`
          *,
          daily_bus_expenses(*)
        `);

      const { data: trips, error } = await query;

      if (error) throw error;

      // Filter in memory to avoid query builder type issues
      let filteredTrips = trips || [];
      
      if (startDate) {
        const startDateStr = format(startOfDay(startDate), "yyyy-MM-dd");
        filteredTrips = filteredTrips.filter(t => t.trip_date >= startDateStr);
      }
      if (endDate) {
        const endDateStr = format(endOfDay(endDate), "yyyy-MM-dd");
        filteredTrips = filteredTrips.filter(t => t.trip_date <= endDateStr);
      }

      return processTimeBasedData(filteredTrips);
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}

function processTimeBasedData(trips: any[]): TimeBasedAnalytics {
  // Initialize hourly data (0-23 hours)
  const hourlyData: TimeSlotData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    timeLabel: `${i.toString().padStart(2, '0')}:00`,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTrips: 0,
    avgEfficiency: 0,
  }));

  // Initialize daily data (0=Sunday, 6=Saturday)
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dailyData: DayOfWeekData[] = dayNames.map((dayName, i) => ({
    day: i,
    dayName,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTrips: 0,
    avgEfficiency: 0,
  }));

  // Time slots
  const timeSlots = {
    morning: { income: 0, profit: 0, trips: 0 },
    afternoon: { income: 0, profit: 0, trips: 0 },
    evening: { income: 0, profit: 0, trips: 0 },
  };

  // Process each trip
  trips.forEach((trip) => {
    const income = Number(trip.income) || 0;
    const tripDate = parseISO(trip.trip_date);
    const hour = trip.start_time ? parseInt(trip.start_time.split(':')[0]) : 12;
    const dayOfWeek = getDay(tripDate);
    const efficiency = Number(trip.fuel_efficiency) || 0;

    // Calculate expenses
    let expenses = 0;
    if (trip.daily_bus_expenses && Array.isArray(trip.daily_bus_expenses)) {
      expenses = trip.daily_bus_expenses.reduce((sum: number, exp: any) => {
        return sum + (Number(exp.amount) || 0);
      }, 0);
    }

    const netProfit = income - expenses;

    // Update hourly data
    const hourData = hourlyData[hour];
    if (hourData) {
      hourData.totalIncome += income;
      hourData.totalExpenses += expenses;
      hourData.netProfit += netProfit;
      hourData.totalTrips += 1;
      if (efficiency > 0) {
        hourData.avgEfficiency = (hourData.avgEfficiency * (hourData.totalTrips - 1) + efficiency) / hourData.totalTrips;
      }
    }

    // Update daily data
    const dayData = dailyData[dayOfWeek];
    if (dayData) {
      dayData.totalIncome += income;
      dayData.totalExpenses += expenses;
      dayData.netProfit += netProfit;
      dayData.totalTrips += 1;
      if (efficiency > 0) {
        dayData.avgEfficiency = (dayData.avgEfficiency * (dayData.totalTrips - 1) + efficiency) / dayData.totalTrips;
      }
    }

    // Update time slots (6-12: morning, 12-18: afternoon, 18-24: evening)
    if (hour >= 6 && hour < 12) {
      timeSlots.morning.income += income;
      timeSlots.morning.profit += netProfit;
      timeSlots.morning.trips += 1;
    } else if (hour >= 12 && hour < 18) {
      timeSlots.afternoon.income += income;
      timeSlots.afternoon.profit += netProfit;
      timeSlots.afternoon.trips += 1;
    } else {
      timeSlots.evening.income += income;
      timeSlots.evening.profit += netProfit;
      timeSlots.evening.trips += 1;
    }
  });

  // Find peak hours (top 5 by profit)
  const peakHours = [...hourlyData]
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 5)
    .map(h => ({ hour: h.hour, profit: h.netProfit, trips: h.totalTrips }));

  // Find best performing times
  const mostProfitableHour = hourlyData.reduce((max, curr) => 
    curr.netProfit > max.netProfit ? curr : max
  , hourlyData[0]);

  const mostProfitableDay = dailyData.reduce((max, curr) => 
    curr.netProfit > max.netProfit ? curr : max
  , dailyData[0]);

  const busiestHour = hourlyData.reduce((max, curr) => 
    curr.totalTrips > max.totalTrips ? curr : max
  , hourlyData[0]);

  const busiestDay = dailyData.reduce((max, curr) => 
    curr.totalTrips > max.totalTrips ? curr : max
  , dailyData[0]);

  return {
    hourlyData,
    dailyData,
    peakHours,
    timeSlots,
    bestPerformingTimes: {
      mostProfitableHour: mostProfitableHour.hour,
      mostProfitableDay: mostProfitableDay.dayName,
      busiestHour: busiestHour.hour,
      busiestDay: busiestDay.dayName,
    },
  };
}
