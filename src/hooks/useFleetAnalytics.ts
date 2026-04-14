import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface FleetKPIs {
  totalDistance: number;
  avgSpeed: number;
  fuelEfficiency: number;
  activeVehicles: number;
  totalVehicles: number;
  maxSpeed: number;
  totalIdleTime: number;
  // Trends (compared to previous period)
  distanceTrend: number;
  speedTrend: number;
  utilizationTrend: number;
  efficiencyTrend: number;
  idleTrend: number;
  // Data source info
  dataSource: {
    mileageRecords: number;
    gpsRecords: number;
    fuelRecords: number;
  };
}

export interface BusSpeedData {
  bus_no: string;
  max_speed: number;
  avg_speed: number;
  last_recorded: string;
}

export interface OdometerTrendData {
  date: string;
  [key: string]: number | string; // Dynamic bus columns
}

export interface SpeedDistribution {
  range: string;
  count: number;
  percentage: number;
}

export function useFleetAnalytics(dateRange: { start: Date; end: Date }) {
  // Calculate previous period for trend comparison
  const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
  const prevPeriodEnd = dateRange.start;
  const prevPeriodStart = new Date(dateRange.start.getTime() - periodLength);

  // Real-time KPIs with trend calculations
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ['fleet-kpis', dateRange],
    queryFn: async (): Promise<FleetKPIs> => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();
      const prevStartDate = prevPeriodStart.toISOString();
      const prevEndDate = prevPeriodEnd.toISOString();

      // Current period - Total distance from daily mileage
      const { data: mileageData } = await supabase
        .from('bus_daily_mileage')
        .select('daily_km')
        .gte('date', startDate.split('T')[0])
        .lte('date', endDate.split('T')[0]);

      const totalDistance = mileageData?.reduce((sum, row) => sum + (row.daily_km || 0), 0) || 0;

      // Previous period distance
      const { data: prevMileageData } = await supabase
        .from('bus_daily_mileage')
        .select('daily_km')
        .gte('date', prevStartDate.split('T')[0])
        .lt('date', prevEndDate.split('T')[0]);

      const prevTotalDistance = prevMileageData?.reduce((sum, row) => sum + (row.daily_km || 0), 0) || 0;

      // Current period - Average speed from GPS history (excluding stationary)
      const { data: speedData } = await supabase
        .from('gps_location_history')
        .select('speed_kmh')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .gt('speed_kmh', 0);

      const avgSpeed = speedData && speedData.length > 0
        ? speedData.reduce((sum, row) => sum + (row.speed_kmh || 0), 0) / speedData.length
        : 0;

      const maxSpeed = speedData && speedData.length > 0
        ? Math.max(...speedData.map(row => row.speed_kmh || 0))
        : 0;

      // Previous period speed
      const { data: prevSpeedData } = await supabase
        .from('gps_location_history')
        .select('speed_kmh')
        .gte('timestamp', prevStartDate)
        .lt('timestamp', prevEndDate)
        .gt('speed_kmh', 0);

      const prevAvgSpeed = prevSpeedData && prevSpeedData.length > 0
        ? prevSpeedData.reduce((sum, row) => sum + (row.speed_kmh || 0), 0) / prevSpeedData.length
        : 0;

      // Active vehicles from real-time tracking
      const { data: trackingData } = await supabase
        .from('real_time_tracking')
        .select('status, bus_no, ignition_status');

      const activeVehicles = trackingData?.filter(v => v.status === 'active' || v.ignition_status === true).length || 0;
      const totalVehicles = trackingData?.length || 0;

      // Fuel efficiency from daily expenses
      const { data: expensesData } = await supabase
        .from('daily_bus_expenses')
        .select('fuel_liters')
        .gte('expense_date', startDate.split('T')[0])
        .lte('expense_date', endDate.split('T')[0]);

      const totalFuelLiters = expensesData?.reduce((sum, row) => sum + (row.fuel_liters || 0), 0) || 0;
      const fuelEfficiency = totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 0;

      // Previous period fuel efficiency
      const { data: prevExpensesData } = await supabase
        .from('daily_bus_expenses')
        .select('fuel_liters')
        .gte('expense_date', prevStartDate.split('T')[0])
        .lt('expense_date', prevEndDate.split('T')[0]);

      const prevTotalFuelLiters = prevExpensesData?.reduce((sum, row) => sum + (row.fuel_liters || 0), 0) || 0;
      const prevFuelEfficiency = prevTotalFuelLiters > 0 ? prevTotalDistance / prevTotalFuelLiters : 0;

      // Idle time calculation from GPS (points where speed = 0 but ignition on)
      const { data: idlePoints } = await supabase
        .from('gps_location_history')
        .select('id')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .eq('speed_kmh', 0);

      // Estimate idle time (each GPS point represents ~30 seconds)
      const totalIdleTime = (idlePoints?.length || 0) * 0.5; // minutes

      // Calculate trends (percentage change)
      const distanceTrend = prevTotalDistance > 0 
        ? Math.round(((totalDistance - prevTotalDistance) / prevTotalDistance) * 100) 
        : 0;
      const speedTrend = prevAvgSpeed > 0 
        ? Math.round(((avgSpeed - prevAvgSpeed) / prevAvgSpeed) * 100) 
        : 0;
      const efficiencyTrend = prevFuelEfficiency > 0 
        ? Math.round(((fuelEfficiency - prevFuelEfficiency) / prevFuelEfficiency) * 100) 
        : 0;
      
      // Utilization trend - compare with previous tracking data snapshot
      const utilizationTrend = 0; // Would need historical tracking data

      // Get fuel readings count
      const { count: fuelRecordsCount } = await supabase
        .from('bus_fuel_readings')
        .select('id', { count: 'exact', head: true })
        .gte('reading_timestamp', startDate)
        .lte('reading_timestamp', endDate);

      return {
        totalDistance: Math.round(totalDistance),
        avgSpeed: Math.round(avgSpeed),
        fuelEfficiency: parseFloat(fuelEfficiency.toFixed(1)),
        activeVehicles,
        totalVehicles,
        maxSpeed: Math.round(maxSpeed),
        totalIdleTime: Math.round(totalIdleTime),
        distanceTrend,
        speedTrend,
        utilizationTrend,
        efficiencyTrend,
        idleTrend: 0,
        dataSource: {
          mileageRecords: mileageData?.length || 0,
          gpsRecords: speedData?.length || 0,
          fuelRecords: fuelRecordsCount || 0,
        },
      };
    },
  });

  // Fastest buses
  const { data: fastestBuses, isLoading: fastestLoading } = useQuery({
    queryKey: ['fastest-buses', dateRange],
    queryFn: async (): Promise<BusSpeedData[]> => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const { data } = await supabase
        .from('gps_location_history')
        .select('bus_id, speed_kmh, timestamp, buses!inner(bus_no)')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .gt('speed_kmh', 0)
        .order('speed_kmh', { ascending: false });

      // Group by bus and calculate max/avg speeds
      const busStats = data?.reduce((acc: Record<string, { bus_no: string; speeds: number[]; last_recorded: string }>, curr: any) => {
        const busNo = curr.buses.bus_no;
        if (!acc[busNo]) {
          acc[busNo] = {
            bus_no: busNo,
            speeds: [],
            last_recorded: curr.timestamp,
          };
        }
        acc[busNo].speeds.push(curr.speed_kmh);
        if (new Date(curr.timestamp) > new Date(acc[busNo].last_recorded)) {
          acc[busNo].last_recorded = curr.timestamp;
        }
        return acc;
      }, {});

      return Object.values(busStats || {})
        .map((bus) => ({
          bus_no: bus.bus_no,
          max_speed: Math.max(...bus.speeds),
          avg_speed: Math.round(bus.speeds.reduce((a, b) => a + b, 0) / bus.speeds.length),
          last_recorded: bus.last_recorded,
        }))
        .sort((a, b) => b.max_speed - a.max_speed)
        .slice(0, 10);
    },
  });

  // Odometer trends
  const { data: odometerTrends, isLoading: odometerLoading } = useQuery({
    queryKey: ['odometer-trends', dateRange],
    queryFn: async (): Promise<OdometerTrendData[]> => {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      const { data } = await supabase
        .from('bus_daily_mileage')
        .select('date, daily_km, bus_id, buses!inner(bus_no)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      // Transform to chart format with each bus as a series
      const dates = [...new Set(data?.map((d: any) => d.date) || [])];
      const buses = [...new Set(data?.map((d: any) => d.buses.bus_no) || [])];

      return dates.map(date => {
        const row: OdometerTrendData = { date };
        buses.forEach(busNo => {
          const dayData = data?.find((d: any) => d.date === date && d.buses.bus_no === busNo);
          row[busNo] = (dayData as any)?.daily_km || 0;
        });
        return row;
      });
    },
  });

  // Speed distribution
  const { data: speedDistribution, isLoading: speedDistLoading } = useQuery({
    queryKey: ['speed-distribution', dateRange],
    queryFn: async (): Promise<SpeedDistribution[]> => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const { data } = await supabase
        .from('gps_location_history')
        .select('speed_kmh')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .gt('speed_kmh', 0);

      const total = data?.length || 0;
      const ranges = [
        { range: '0-30 km/h', min: 0, max: 30 },
        { range: '30-60 km/h', min: 30, max: 60 },
        { range: '60-90 km/h', min: 60, max: 90 },
        { range: '90+ km/h', min: 90, max: 999 },
      ];

      return ranges.map(({ range, min, max }) => {
        const count = data?.filter(d => d.speed_kmh >= min && d.speed_kmh < max).length || 0;
        return {
          range,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });
    },
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchKPIs();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchKPIs]);

  return {
    kpis,
    kpisLoading,
    fastestBuses,
    fastestLoading,
    odometerTrends,
    odometerLoading,
    speedDistribution,
    speedDistLoading,
    refetch: refetchKPIs,
  };
}
