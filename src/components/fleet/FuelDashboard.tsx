import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fuel, AlertTriangle, TrendingDown, TrendingUp, Database } from 'lucide-react';
import FuelConsumptionChart from './FuelConsumptionChart';
import FuelAlertPanel from './FuelAlertPanel';

interface FuelStats {
  totalCost: number;
  avgConsumption: number;
  lowFuelBuses: number;
  totalLiters: number;
  readingsCount: number;
  costTrend: number;
  consumptionTrend: number;
}

export default function FuelDashboard() {
  const { data: fuelStats, isLoading } = useQuery({
    queryKey: ['fuel-stats-real'],
    queryFn: async (): Promise<FuelStats> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get current period fuel data (last 30 days)
      const { data: currentFuelData } = await supabase
        .from('bus_fuel_readings')
        .select('fuel_level_liters, fuel_level_percent, odometer_reading, reading_timestamp')
        .gte('reading_timestamp', thirtyDaysAgo.toISOString())
        .order('reading_timestamp', { ascending: false });

      // Get previous period for comparison (30-60 days ago)
      const { data: previousFuelData } = await supabase
        .from('bus_fuel_readings')
        .select('fuel_level_liters, fuel_level_percent')
        .gte('reading_timestamp', sixtyDaysAgo.toISOString())
        .lt('reading_timestamp', thirtyDaysAgo.toISOString());

      // Get daily expenses for actual fuel costs
      const { data: expensesData } = await supabase
        .from('daily_bus_expenses')
        .select('fuel_cost, fuel_liters')
        .gte('expense_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const { data: prevExpensesData } = await supabase
        .from('daily_bus_expenses')
        .select('fuel_cost, fuel_liters')
        .gte('expense_date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('expense_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Get daily mileage for consumption calculation
      const { data: mileageData } = await supabase
        .from('bus_daily_mileage')
        .select('daily_km')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      const { data: prevMileageData } = await supabase
        .from('bus_daily_mileage')
        .select('daily_km')
        .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Count buses with low fuel (< 20%)
      const { data: latestReadings } = await supabase
        .from('bus_fuel_readings')
        .select('bus_id, fuel_level_percent')
        .order('reading_timestamp', { ascending: false });

      // Get unique latest reading per bus
      const latestByBus = new Map<string, number>();
      latestReadings?.forEach(r => {
        if (!latestByBus.has(r.bus_id)) {
          latestByBus.set(r.bus_id, r.fuel_level_percent || 0);
        }
      });
      const lowFuelBuses = Array.from(latestByBus.values()).filter(level => level < 20).length;

      // Calculate totals
      const totalCost = expensesData?.reduce((sum, e) => sum + (e.fuel_cost || 0), 0) || 0;
      const totalLiters = expensesData?.reduce((sum, e) => sum + (e.fuel_liters || 0), 0) || 0;
      const totalKm = mileageData?.reduce((sum, m) => sum + (m.daily_km || 0), 0) || 0;

      // Calculate average consumption (km/L)
      const avgConsumption = totalLiters > 0 ? totalKm / totalLiters : 0;

      // Previous period calculations for trends
      const prevTotalCost = prevExpensesData?.reduce((sum, e) => sum + (e.fuel_cost || 0), 0) || 0;
      const prevTotalLiters = prevExpensesData?.reduce((sum, e) => sum + (e.fuel_liters || 0), 0) || 0;
      const prevTotalKm = prevMileageData?.reduce((sum, m) => sum + (m.daily_km || 0), 0) || 0;
      const prevAvgConsumption = prevTotalLiters > 0 ? prevTotalKm / prevTotalLiters : 0;

      // Calculate trends
      const costTrend = prevTotalCost > 0 
        ? Math.round(((totalCost - prevTotalCost) / prevTotalCost) * 100) 
        : 0;
      const consumptionTrend = prevAvgConsumption > 0 
        ? parseFloat(((avgConsumption - prevAvgConsumption)).toFixed(1))
        : 0;

      return { 
        totalCost: Math.round(totalCost), 
        avgConsumption: parseFloat(avgConsumption.toFixed(1)), 
        lowFuelBuses,
        totalLiters: Math.round(totalLiters),
        readingsCount: currentFuelData?.length || 0,
        costTrend,
        consumptionTrend
      };
    },
  });

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="h-3 w-3" />
        <span>Based on {fuelStats?.readingsCount || 0} fuel readings (last 30 days)</span>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Fuel className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Fuel Cost</p>
              <h3 className="text-2xl font-bold">
                LKR {(fuelStats?.totalCost || 0).toLocaleString()}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">This month</p>
                {fuelStats?.costTrend !== 0 && (
                  <Badge 
                    variant="secondary" 
                    className={fuelStats?.costTrend && fuelStats.costTrend < 0 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }
                  >
                    {fuelStats?.costTrend && fuelStats.costTrend > 0 ? '↑' : '↓'} {Math.abs(fuelStats?.costTrend || 0)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              {(fuelStats?.consumptionTrend || 0) >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Avg Consumption</p>
              <h3 className="text-2xl font-bold">{fuelStats?.avgConsumption || 0} km/L</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{fuelStats?.totalLiters?.toLocaleString() || 0} L used</p>
                {fuelStats?.consumptionTrend !== 0 && (
                  <Badge 
                    variant="secondary" 
                    className={fuelStats?.consumptionTrend && fuelStats.consumptionTrend > 0 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                    }
                  >
                    {fuelStats?.consumptionTrend && fuelStats.consumptionTrend > 0 ? '+' : ''}{fuelStats?.consumptionTrend} km/L
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Fuel Alerts</p>
              <h3 className="text-2xl font-bold">{fuelStats?.lowFuelBuses || 0}</h3>
              <p className="text-xs text-destructive">Buses below 20% fuel</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FuelConsumptionChart />
        <FuelAlertPanel />
      </div>
    </div>
  );
}
