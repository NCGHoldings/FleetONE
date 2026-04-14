import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, Navigation, Battery, Signal, AlertTriangle, 
  CheckCircle2, Clock, Fuel 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RealTimeFleetStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['real-time-fleet-status'],
    queryFn: async () => {
      const { data: tracking } = await supabase
        .from('real_time_tracking')
        .select(`
          *,
          buses!inner(bus_no, model, status)
        `)
        .order('last_update', { ascending: false });

      return tracking?.map(t => ({
        id: t.bus_id,
        busNo: t.buses.bus_no,
        model: t.buses.model,
        status: t.status,
        speed: t.speed_kmh || 0,
        battery: t.battery_voltage || 0,
        gsm: t.gsm_signal_strength || 0,
        ignition: t.ignition_status,
        lastUpdate: t.last_update,
        gpsCoords: t.gps_coordinates,
        dailyKm: t.daily_mileage_km || 0,
      }));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Fleet Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const activeCount = data?.filter(b => b.status === 'active').length || 0;
  const movingCount = data?.filter(b => b.speed > 0).length || 0;
  const lowBatteryCount = data?.filter(b => b.battery > 0 && b.battery < 12).length || 0;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            Real-Time Fleet Status
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-600 border-green-200">
              {movingCount} Moving
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-600 border-blue-200">
              {activeCount} Active
            </Badge>
            {lowBatteryCount > 0 && (
              <Badge className="bg-red-500/20 text-red-600 border-red-200">
                {lowBatteryCount} Low Battery
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {data?.map((bus) => (
            <div 
              key={bus.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  bus.speed > 0 
                    ? 'bg-green-100 dark:bg-green-900' 
                    : bus.status === 'active'
                    ? 'bg-yellow-100 dark:bg-yellow-900'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {bus.speed > 0 ? (
                    <Navigation className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : bus.status === 'active' ? (
                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <Truck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{bus.busNo}</span>
                    <span className="text-xs text-muted-foreground">{bus.model}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      {bus.speed} km/h
                    </span>
                    <span className="flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      {bus.dailyKm.toFixed(1)} km today
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Battery Status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  bus.battery >= 12 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : bus.battery > 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                }`}>
                  <Battery className="h-3 w-3" />
                  {bus.battery > 0 ? `${bus.battery.toFixed(1)}V` : 'N/A'}
                </div>

                {/* Signal Status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  bus.gsm >= 15 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : bus.gsm > 0
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                }`}>
                  <Signal className="h-3 w-3" />
                  {bus.gsm > 0 ? `${bus.gsm}dB` : 'N/A'}
                </div>

                {/* Ignition */}
                {bus.ignition ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                )}

                {/* Last Update */}
                <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                  {bus.lastUpdate 
                    ? formatDistanceToNow(new Date(bus.lastUpdate), { addSuffix: true })
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
