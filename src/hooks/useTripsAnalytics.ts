import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, differenceInDays, format } from 'date-fns';
import { groupBy, sumBy, meanBy, maxBy, minBy, orderBy } from 'lodash';

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  routes?: string[];
  drivers?: string[];
  conductors?: string[];
  buses?: string[];
  status?: string;
}

export interface TripData {
  id: string;
  trip_date: string;
  bus_id: string;
  route_id: string;
  driver_id: string;
  conductor_id: string;
  start_time: string;
  end_time: string;
  distance_km: number;
  income: number;
  fuel_cost: number;
  other_expenses: number;
  total_expenses: number;
  net_income: number;
  km_per_liter: number;
  status?: string;
  odo_start?: number;
  odo_end?: number;
}

export interface DriverStats {
  driverId: string;
  driverName: string;
  totalTrips: number;
  totalDistance: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  avgEfficiency: number;
  completionRate: number;
  rank: number;
}

export interface RouteStats {
  routeNo: string;
  routeName: string;
  totalTrips: number;
  totalDistance: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  avgEfficiency: number;
  profitMargin: number;
}

export interface BusStats {
  busNo: string;
  totalTrips: number;
  totalDistance: number;
  currentOdo: number;
  avgEfficiency: number;
  totalIncome: number;
  lastTripDate: string;
  utilizationRate: number;
}

export interface Insight {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  action?: string;
}

export function useTripsAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['trips-analytics', filters],
    queryFn: async () => {
      // Fetch trips data
      const { data: trips, error: tripsError } = await supabase
        .from('daily_trips')
        .select('*')
        .gte('trip_date', format(filters.startDate, 'yyyy-MM-dd'))
        .lte('trip_date', format(filters.endDate, 'yyyy-MM-dd'))
        .order('trip_date', { ascending: false });

      if (tripsError) throw tripsError;

    // Fetch expenses data - remove buses join to avoid errors
    const { data: expenses, error: expensesError } = await supabase
      .from('daily_bus_expenses')
      .select('*')
      .gte('expense_date', format(filters.startDate, 'yyyy-MM-dd'))
      .lte('expense_date', format(filters.endDate, 'yyyy-MM-dd'));

      // Don't throw on expense errors - continue with trips data only
      if (expensesError) {
        console.warn('Could not fetch expenses, continuing with trips data only:', expensesError);
      }

      // Apply additional filters
      let filteredTrips = trips || [];
      
      if (filters.routes && filters.routes.length > 0) {
        filteredTrips = filteredTrips.filter(t => filters.routes!.includes(t.route_id));
      }
      if (filters.drivers && filters.drivers.length > 0) {
        filteredTrips = filteredTrips.filter(t => filters.drivers!.includes(t.driver_id));
      }
      if (filters.conductors && filters.conductors.length > 0) {
        filteredTrips = filteredTrips.filter(t => filters.conductors!.includes(t.conductor_id));
      }
      if (filters.buses && filters.buses.length > 0) {
        filteredTrips = filteredTrips.filter(t => filters.buses!.includes(t.bus_id));
      }

      return processAnalyticsData(filteredTrips, expenses || [], filters, !!expensesError);
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

function processAnalyticsData(
  trips: TripData[], 
  expenses: any[], 
  filters: AnalyticsFilters,
  expensesUnavailable: boolean = false
) {
  // Handle empty data
  if (!trips || trips.length === 0) {
    return {
      overview: {
        totalTrips: 0,
        totalDistance: 0,
        totalIncome: 0,
        totalFuelCost: 0,
        totalOtherExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
        avgEfficiency: 0,
        activeBuses: 0,
        profitMargin: 0,
        avgIncomePerTrip: 0,
        avgDistancePerTrip: 0,
        completionRate: 0,
        incomeChange: 0,
        profitChange: 0,
        tripsChange: 0
      },
      driverStats: [],
      routeStats: [],
      busStats: [],
      insights: [],
      dailyTrends: [],
      tripsByHour: {},
      expenseBreakdown: {
        fuel: 0,
        toll: 0,
        repair: 0,
        salaries: 0,
        permits: 0,
        other: 0,
        fuelPercentage: 0,
        tollPercentage: 0,
        repairPercentage: 0,
        salariesPercentage: 0,
        permitsPercentage: 0,
        otherPercentage: 0
      },
      rawTrips: [],
      tripsWithExpenses: 0
    };
  }

  // Create expense map by bus_id and date for quick lookup
  const expenseMap = new Map();
  expenses.forEach(exp => {
    const key = `${exp.bus_id}_${exp.expense_date}`;
    const totalExpense = (exp.fuel_cost || 0) + 
                        (exp.toll_cost || 0) + 
                        (exp.repair_cost || 0) + 
                        (exp.driver_salary || 0) + 
                        (exp.conductor_salary || 0) + 
                        (exp.other_expenses || 0);
    expenseMap.set(key, {
      ...exp,
      total: totalExpense
    });
  });

  // Calculate overview metrics
  const totalTrips = trips.length;
  const totalDistance = sumBy(trips, 'distance_km');
  const totalIncome = sumBy(trips, 'income');
  
  // Calculate total expenses from daily_bus_expenses using correct column names
  const totalFuelCost = sumBy(expenses, 'fuel_cost') || 0;
  const totalTollCost = sumBy(expenses, 'highway_charges') || 0;
  const totalRepairCost = (sumBy(expenses, 'repair') || 0) + (sumBy(expenses, 'tyre_tube') || 0);
  const totalSalaries = sumBy(expenses, 'salary') || 0;
  const totalPermitsLegal = (sumBy(expenses, 'permits_renewal') || 0) + 
                           (sumBy(expenses, 'temporary_permit') || 0) + 
                           (sumBy(expenses, 'legal_court') || 0) + 
                           (sumBy(expenses, 'ntc') || 0) + 
                           (sumBy(expenses, 'emission_fitness') || 0);
  const totalOtherExpenses = (sumBy(expenses, 'other') || 0) + 
                            (sumBy(expenses, 'food') || 0) + 
                            (sumBy(expenses, 'parking') || 0) + 
                            (sumBy(expenses, 'body_wash') || 0) + 
                            (sumBy(expenses, 'runner') || 0) + 
                            (sumBy(expenses, 'police') || 0) + 
                            (sumBy(expenses, 'log_sheet') || 0) + 
                            (sumBy(expenses, 'accident_compensation') || 0) + 
                            (sumBy(expenses, 'staff_accommodation') || 0) + 
                            (sumBy(expenses, 'vehicle_hire') || 0) + 
                            (sumBy(expenses, 'short_misc') || 0);
  const totalExpenses = totalFuelCost + totalTollCost + totalRepairCost + 
                       totalSalaries + totalPermitsLegal + totalOtherExpenses;
  
  const netProfit = totalIncome - totalExpenses;
  const avgEfficiency = meanBy(trips.filter(t => t.km_per_liter > 0), 'km_per_liter') || 0;
  const activeBuses = new Set(trips.map(t => t.bus_id)).size;

  // Calculate previous period for comparison
  const daysInPeriod = differenceInDays(filters.endDate, filters.startDate) + 1;
  const previousStartDate = subDays(filters.startDate, daysInPeriod);
  const previousTrips = trips.filter(t => {
    const tripDate = new Date(t.trip_date);
    return tripDate >= previousStartDate && tripDate < filters.startDate;
  });

  const prevTotalIncome = sumBy(previousTrips, 'income');
  const prevNetProfit = sumBy(previousTrips, 'net_income');
  const prevTotalTrips = previousTrips.length;

  const incomeChange = prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0;
  const profitChange = prevNetProfit > 0 ? ((netProfit - prevNetProfit) / prevNetProfit) * 100 : 0;
  const tripsChange = prevTotalTrips > 0 ? ((totalTrips - prevTotalTrips) / prevTotalTrips) * 100 : 0;

  // Driver statistics with expense mapping
  const driverGroups = groupBy(trips, 'driver_id');
  const driverStats: DriverStats[] = Object.keys(driverGroups).map(driver => {
    const driverTrips = driverGroups[driver];
    const driverIncome = sumBy(driverTrips, 'income');
    
    // Calculate driver expenses from expense map
    let driverExpenses = 0;
    driverTrips.forEach(trip => {
      const key = `${trip.bus_id}_${trip.trip_date}`;
      const expenseData = expenseMap.get(key);
      if (expenseData) {
        driverExpenses += expenseData.total / driverTrips.filter(t => t.bus_id === trip.bus_id && t.trip_date === trip.trip_date).length;
      }
    });
    
    return {
      driverId: driver,
      driverName: driver,
      totalTrips: driverTrips.length,
      totalDistance: sumBy(driverTrips, 'distance_km'),
      totalIncome: driverIncome,
      totalExpenses: driverExpenses,
      netIncome: driverIncome - driverExpenses,
      avgEfficiency: meanBy(driverTrips.filter(t => t.km_per_liter > 0), 'km_per_liter') || 0,
      completionRate: 100,
      rank: 0
    };
  });

  // Sort and rank drivers by net income
  const rankedDrivers = orderBy(driverStats, ['netIncome'], ['desc']).map((d, idx) => ({
    ...d,
    rank: idx + 1
  }));

  // Route statistics with expense mapping
  const routeGroups = groupBy(trips, 'route_id');
  const routeStats: RouteStats[] = Object.keys(routeGroups).map(routeNo => {
    const routeTrips = routeGroups[routeNo];
    const income = sumBy(routeTrips, 'income');
    
    // Calculate route expenses from expense map
    let routeExpenses = 0;
    routeTrips.forEach(trip => {
      const key = `${trip.bus_id}_${trip.trip_date}`;
      const expenseData = expenseMap.get(key);
      if (expenseData) {
        routeExpenses += expenseData.total / routeTrips.filter(t => t.bus_id === trip.bus_id && t.trip_date === trip.trip_date).length;
      }
    });
    
    const netIncome = income - routeExpenses;
    return {
      routeNo,
      routeName: routeNo,
      totalTrips: routeTrips.length,
      totalDistance: sumBy(routeTrips, 'distance_km'),
      totalIncome: income,
      totalExpenses: routeExpenses,
      netIncome: netIncome,
      avgEfficiency: meanBy(routeTrips.filter(t => t.km_per_liter > 0), 'km_per_liter') || 0,
      profitMargin: income > 0 ? ((netIncome / income) * 100) : 0
    };
  });

  // Bus statistics
  const busGroups = groupBy(trips, 'bus_id');
  const busStats: BusStats[] = Object.keys(busGroups).map(busId => {
    const busTrips = orderBy(busGroups[busId], ['trip_date'], ['desc']);
    return {
      busNo: busId,
      totalTrips: busTrips.length,
      totalDistance: sumBy(busTrips, 'distance_km'),
      currentOdo: busTrips[0]?.odo_end || 0,
      avgEfficiency: meanBy(busTrips.filter(t => t.km_per_liter > 0), 'km_per_liter') || 0,
      totalIncome: sumBy(busTrips, 'income'),
      lastTripDate: busTrips[0]?.trip_date || '',
      utilizationRate: (busTrips.length / totalTrips) * 100
    };
  });

  // Generate insights
  const insights = generateInsights({
    trips,
    driverStats: rankedDrivers,
    routeStats,
    busStats,
    incomeChange,
    profitChange,
    avgEfficiency
  });

  // Time-based analysis
  const tripsByHour = groupBy(trips, t => {
    if (!t.start_time) return 'unknown';
    const hour = parseInt(t.start_time.split(':')[0]);
    return hour;
  });

  const tripsByDate = groupBy(trips, 'trip_date');
  const expensesByDate = groupBy(expenses, 'expense_date');
  
  const dailyTrends = Object.keys(tripsByDate).map(date => {
    const dayTrips = tripsByDate[date];
    const dayExpenses = expensesByDate[date] || [];
    const dayTotalExpenses = sumBy(dayExpenses, exp => 
      (exp.fuel_cost || 0) + (exp.toll_cost || 0) + (exp.repair_cost || 0) + 
      (exp.driver_salary || 0) + (exp.conductor_salary || 0) + (exp.other_expenses || 0)
    );
    const dayIncome = sumBy(dayTrips, 'income');
    
    return {
      date,
      trips: dayTrips.length,
      income: dayIncome,
      expenses: dayTotalExpenses,
      netIncome: dayIncome - dayTotalExpenses,
      distance: sumBy(dayTrips, 'distance_km'),
      avgEfficiency: meanBy(dayTrips.filter(t => t.km_per_liter > 0), 'km_per_liter') || 0
    };
  });

  // Calculate trips with expense data for data quality indicator
  const tripsWithExpenses = trips.filter(t => {
    const key = `${t.bus_id}_${t.trip_date}`;
    return expenseMap.has(key);
  }).length;

  return {
    overview: {
      totalTrips,
      totalDistance,
      totalIncome,
      totalFuelCost,
      totalOtherExpenses,
      totalExpenses,
      netProfit,
      avgEfficiency,
      activeBuses,
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0,
      avgIncomePerTrip: totalTrips > 0 ? totalIncome / totalTrips : 0,
      avgDistancePerTrip: totalTrips > 0 ? totalDistance / totalTrips : 0,
      completionRate: 100,
      incomeChange,
      profitChange,
      tripsChange
    },
    driverStats: rankedDrivers,
    routeStats: orderBy(routeStats, ['totalIncome'], ['desc']),
    busStats: orderBy(busStats, ['totalIncome'], ['desc']),
    insights,
    dailyTrends: orderBy(dailyTrends, ['date'], ['asc']),
    tripsByHour,
    expenseBreakdown: {
      fuel: totalFuelCost,
      toll: totalTollCost,
      repair: totalRepairCost,
      salaries: totalSalaries,
      permits: totalPermitsLegal,
      other: totalOtherExpenses,
      fuelPercentage: totalExpenses > 0 ? (totalFuelCost / totalExpenses) * 100 : 0,
      tollPercentage: totalExpenses > 0 ? (totalTollCost / totalExpenses) * 100 : 0,
      repairPercentage: totalExpenses > 0 ? (totalRepairCost / totalExpenses) * 100 : 0,
      salariesPercentage: totalExpenses > 0 ? (totalSalaries / totalExpenses) * 100 : 0,
      permitsPercentage: totalExpenses > 0 ? (totalPermitsLegal / totalExpenses) * 100 : 0,
      otherPercentage: totalExpenses > 0 ? (totalOtherExpenses / totalExpenses) * 100 : 0
    },
    rawTrips: trips,
    tripsWithExpenses
  };
}

function generateInsights(data: any): Insight[] {
  const insights: Insight[] = [];

  // Top performer
  if (data.driverStats.length > 0) {
    const topDriver = data.driverStats[0];
    insights.push({
      type: 'success',
      title: 'Top Performer',
      message: `${topDriver.driverName} generated ₨${topDriver.netIncome.toLocaleString()} net income with ${topDriver.totalTrips} trips at ${topDriver.avgEfficiency.toFixed(1)} km/L average`
    });
  }

  // Revenue trend
  if (data.incomeChange !== 0) {
    insights.push({
      type: data.incomeChange > 0 ? 'success' : 'warning',
      title: 'Revenue Trend',
      message: `Revenue ${data.incomeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(data.incomeChange).toFixed(1)}% compared to previous period${data.incomeChange > 15 ? ' - Excellent performance!' : ''}`
    });
  }

  // Low efficiency alert
  const lowEfficiencyDrivers = data.driverStats.filter((d: DriverStats) => d.avgEfficiency > 0 && d.avgEfficiency < 9);
  if (lowEfficiencyDrivers.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Low Efficiency Alert',
      message: `${lowEfficiencyDrivers.length} driver${lowEfficiencyDrivers.length > 1 ? 's' : ''} below 9 km/L average - consider training or vehicle inspection`,
      action: 'View Drivers'
    });
  }

  // Top route
  if (data.routeStats.length > 0) {
    const topRoute = data.routeStats[0];
    const routeShare = (topRoute.totalIncome / data.trips.reduce((sum: number, t: TripData) => sum + t.income, 0)) * 100;
    insights.push({
      type: 'info',
      title: 'Top Revenue Route',
      message: `${topRoute.routeName} generated ₨${topRoute.totalIncome.toLocaleString()} (${routeShare.toFixed(1)}% of total revenue) with ${topRoute.profitMargin.toFixed(1)}% profit margin`
    });
  }

  // Negative profit alert
  const negativeTrips = data.trips.filter((t: TripData) => t.net_income < 0);
  if (negativeTrips.length > 0) {
    insights.push({
      type: 'error',
      title: 'Negative Profit Alert',
      message: `${negativeTrips.length} trips resulted in losses totaling ₨${Math.abs(sumBy(negativeTrips, 'net_income')).toLocaleString()}`,
      action: 'View Loss-Making Trips'
    });
  }

  // Fleet efficiency
  if (data.avgEfficiency > 0) {
    const status = data.avgEfficiency >= 12 ? 'Excellent' : data.avgEfficiency >= 10 ? 'Good' : 'Needs Improvement';
    insights.push({
      type: data.avgEfficiency >= 10 ? 'success' : 'info',
      title: 'Fleet Fuel Efficiency',
      message: `Average fleet efficiency is ${data.avgEfficiency.toFixed(1)} km/L - ${status}`
    });
  }

  return insights;
}
