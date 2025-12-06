import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bus, 
  MapPin, 
  Gauge, 
  Battery, 
  Power, 
  ExternalLink,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

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

interface FleetStatusTableProps {
  data?: FleetStatus[];
  isLoading?: boolean;
}

export function FleetStatusTable({ data = [], isLoading }: FleetStatusTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (speed: number, ignition: boolean) => {
    if (speed > 5) return "bg-success text-success-foreground";
    if (ignition) return "bg-warning text-warning-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getStatusLabel = (speed: number, ignition: boolean) => {
    if (speed > 5) return "Moving";
    if (ignition) return "Idle";
    return "Offline";
  };

  const getBatteryColor = (voltage: number) => {
    if (voltage >= 12.5) return "text-success";
    if (voltage >= 12) return "text-warning";
    return "text-destructive";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="card-elevated overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(250,80%,55%)] to-[hsl(280,70%,50%)]" />
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(250,80%,55%)] flex items-center justify-center text-white">
              <Bus className="w-4 h-4" />
            </div>
            Real-Time Fleet Status
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/real-time-tracking")}
            className="gap-2"
          >
            View All
            <ExternalLink className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bus className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium">No fleet data available</p>
              <p className="text-sm">Connect your fleet to see real-time status</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.slice(0, 6).map((bus, index) => (
                <motion.div
                  key={bus.busNo}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group"
                  onClick={() => navigate("/real-time-tracking")}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-[hsl(250,80%,55%)]/20 flex items-center justify-center">
                        <Bus className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{bus.busNo}</p>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getStatusColor(bus.speed, bus.ignitionStatus)}`}
                        >
                          {getStatusLabel(bus.speed, bus.ignitionStatus)}
                        </Badge>
                      </div>
                    </div>
                    {bus.ignitionStatus && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Zap className="w-4 h-4 text-success" />
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="w-4 h-4" />
                      <span>{bus.speed.toFixed(0)} km/h</span>
                    </div>
                    <div className={`flex items-center gap-2 ${getBatteryColor(bus.batteryVoltage)}`}>
                      <Battery className="w-4 h-4" />
                      <span>{bus.batteryVoltage.toFixed(1)}V</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">
                        {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      Updated {bus.lastUpdate ? formatDistanceToNow(new Date(bus.lastUpdate), { addSuffix: true }) : "N/A"}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute inset-0 rounded-lg border-2 border-primary/0 group-hover:border-primary/30 transition-all pointer-events-none" />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
