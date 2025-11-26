import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Fuel, AlertTriangle, TrendingDown } from 'lucide-react';
import FuelConsumptionChart from './FuelConsumptionChart';
import FuelAlertPanel from './FuelAlertPanel';

export default function FuelDashboard() {
  const { data: fuelStats } = useQuery({
    queryKey: ['fuel-stats'],
    queryFn: async () => {
      const { data: readings } = await supabase
        .from('bus_fuel_readings')
        .select(`
          *,
          buses!inner(bus_no)
        `)
        .order('reading_timestamp', { ascending: false })
        .limit(100);

      const totalCost = 5245000; // Mock data
      const avgConsumption = 8.5;
      const lowFuelBuses = readings?.filter(r => r.fuel_level_percent < 20).length || 0;

      return { totalCost, avgConsumption, lowFuelBuses };
    },
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Fuel className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Fuel Cost</p>
              <h3 className="text-2xl font-bold">
                LKR {(fuelStats?.totalCost || 0).toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg">
              <TrendingDown className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Consumption</p>
              <h3 className="text-2xl font-bold">{fuelStats?.avgConsumption} km/L</h3>
              <p className="text-xs text-success">+0.3 km/L vs last month</p>
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
              <h3 className="text-2xl font-bold">{fuelStats?.lowFuelBuses}</h3>
              <p className="text-xs text-destructive">Require attention</p>
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
