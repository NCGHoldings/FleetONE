import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertTriangle, Fuel, Wrench, Shield, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  type: 'fuel' | 'service' | 'insurance' | 'general';
  message: string;
  severity: 'warning' | 'critical';
  time: Date;
  busNo?: string;
}

export function ExecutiveLiveAlerts() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['executive-alerts'],
    queryFn: async () => {
      const alertsList: Alert[] = [];
      
      // Get buses with low fuel
      const { data: trackingData } = await supabase
        .from('real_time_tracking')
        .select('bus_id, fuel_level, last_update, buses:bus_id(bus_no)')
        .lt('fuel_level', 20)
        .order('last_update', { ascending: false })
        .limit(5);
      
      trackingData?.forEach(record => {
        if (record.fuel_level !== null) {
          const bus = record.buses as any;
          alertsList.push({
            id: `fuel-${record.bus_id}`,
            type: 'fuel',
            message: `Low fuel level (${record.fuel_level}%)`,
            severity: record.fuel_level < 10 ? 'critical' : 'warning',
            time: new Date(record.last_update),
            busNo: bus?.bus_no,
          });
        }
      });

      // Get buses due for service
      const { data: busesData } = await supabase
        .from('buses')
        .select('id, bus_no, next_service_date, current_mileage, next_service_mileage')
        .not('next_service_mileage', 'is', null)
        .order('next_service_mileage', { ascending: true })
        .limit(5);
      
      busesData?.forEach(bus => {
        if (bus.current_mileage && bus.next_service_mileage) {
          const kmRemaining = bus.next_service_mileage - bus.current_mileage;
          if (kmRemaining < 500) {
            alertsList.push({
              id: `service-${bus.id}`,
              type: 'service',
              message: `Service due in ${kmRemaining} km`,
              severity: kmRemaining < 200 ? 'critical' : 'warning',
              time: new Date(),
              busNo: bus.bus_no,
            });
          }
        }
      });

      // Get buses with expiring insurance
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const { data: insuranceData } = await supabase
        .from('buses')
        .select('id, bus_no, insurance_expiry')
        .not('insurance_expiry', 'is', null)
        .lte('insurance_expiry', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('insurance_expiry', { ascending: true })
        .limit(3);
      
      insuranceData?.forEach(bus => {
        if (bus.insurance_expiry) {
          const expiryDate = new Date(bus.insurance_expiry);
          const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alertsList.push({
            id: `insurance-${bus.id}`,
            type: 'insurance',
            message: `Insurance expires in ${daysRemaining} days`,
            severity: daysRemaining < 7 ? 'critical' : 'warning',
            time: expiryDate,
            busNo: bus.bus_no,
          });
        }
      });

      return alertsList.slice(0, 6);
    },
    refetchInterval: 10 * 60 * 1000, // 10 minutes (was 60s)
    refetchOnWindowFocus: false,
  });

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'fuel': return Fuel;
      case 'service': return Wrench;
      case 'insurance': return Shield;
      default: return AlertTriangle;
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted/30 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <Card className="bg-gradient-to-br from-card to-card/80 border-2 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-red-500/10 rounded-lg relative">
              <Bell className="w-5 h-5 text-red-500" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {alerts.length}
                </span>
              )}
            </div>
            Live Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {alerts.map((alert, index) => {
                const Icon = getAlertIcon(alert.type);
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      alert.severity === 'critical' 
                        ? "bg-red-500/10 border-red-500/30" 
                        : "bg-amber-500/10 border-amber-500/30"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg mt-0.5",
                      alert.severity === 'critical' ? "bg-red-500/20" : "bg-amber-500/20"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        alert.severity === 'critical' ? "text-red-500" : "text-amber-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {alert.busNo && (
                          <span className="font-semibold text-sm">{alert.busNo}</span>
                        )}
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          alert.severity === 'critical' 
                            ? "bg-red-500/20 text-red-500" 
                            : "bg-amber-500/20 text-amber-500"
                        )}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(alert.time, { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
