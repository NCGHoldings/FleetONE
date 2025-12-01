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
  // Real-time KPIs
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ['fleet-kpis', dateRange],
    queryFn: async (): Promise<FleetKPIs> => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      // Total distance from daily mileage
      const { data: mileageData } = await supabase
        .from('bus_daily_mileage')
        .select('daily_km')
        .gte('date', startDate.split('T')[0])
        .lte('date', endDate.split('T')[0]);

      const totalDistance = mileageData?.reduce((sum, row) => sum + (row.daily_km || 0), 0) || 0;

      // Average speed from GPS history (excluding stationary)
      const { data: speedData } = await supabase
        .from('gps_location_history')
        .select('speed_kmh')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .gt('speed_kmh', 0);

      const avgSpeed = speedData && speedData.length > 0
        ? speedData.reduce((sum, row) => sum + (row.speed_kmh || 0), 0) / speedData.length
        : 0;

      // Max speed
      const maxSpeed = speedData && speedData.length > 0
        ? Math.max(...speedData.map(row => row.speed_kmh || 0))
        : 0;

      // Active vehicles from real-time tracking
      const { data: trackingData } = await supabase
        .from('real_time_tracking')
        .select('status, bus_no');

      const activeVehicles = trackingData?.filter(v => v.status === 'active').length || 0;
      const totalVehicles = trackingData?.length || 0;

      // Fuel efficiency from analytics
      const { data: analyticsData } = await supabase
        .from('fleet_analytics_daily')
        .select('fuel_efficiency_kmpl')
        .gte('analytics_date', startDate.split('T')[0])
        .lte('analytics_date', endDate.split('T')[0]);

      const fuelEfficiency = analyticsData && analyticsData.length > 0
        ? analyticsData.reduce((sum, row) => sum + (row.fuel_efficiency_kmpl || 0), 0) / analyticsData.length
        : 0;

      // Total idle time
      const { data: idleData } = await supabase
        .from('fleet_analytics_daily')
        .select('total_idle_time_minutes')
        .gte('analytics_date', startDate.split('T')[0])
        .lte('analytics_date', endDate.split('T')[0]);

      const totalIdleTime = idleData?.reduce((sum, row) => sum + (row.total_idle_time_minutes || 0), 0) || 0;

      return {
        totalDistance: Math.round(totalDistance),
        avgSpeed: Math.round(avgSpeed),
        fuelEfficiency: parseFloat(fuelEfficiency.toFixed(1)),
        activeVehicles,
        totalVehicles,
        maxSpeed: Math.round(maxSpeed),
        totalIdleTime: Math.round(totalIdleTime),
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
      const busStats = data?.reduce((acc: any, curr: any) => {
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
        .map((bus: any) => ({
          bus_no: bus.bus_no,
          max_speed: Math.max(...bus.speeds),
          avg_speed: bus.speeds.reduce((a: number, b: number) => a + b, 0) / bus.speeds.length,
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
      const dates = [...new Set(data?.map(d => d.date) || [])];
      const buses = [...new Set(data?.map(d => d.buses.bus_no) || [])];

      return dates.map(date => {
        const row: OdometerTrendData = { date };
        buses.forEach(busNo => {
          const dayData = data?.find(d => d.date === date && d.buses.bus_no === busNo);
          row[busNo] = dayData?.daily_km || 0;
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
