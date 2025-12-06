import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AlertItem {
  id: string;
  message: string;
  type: "warning" | "error" | "info" | "success";
  time: string;
  busNo?: string;
}

interface LiveAlertsPanelProps {
  alerts?: AlertItem[];
  isLoading?: boolean;
}

const alertIcons = {
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  success: CheckCircle,
};

const alertColors = {
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
};

const dotColors = {
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-primary",
  success: "bg-success",
};

export function LiveAlertsPanel({ alerts = [], isLoading }: LiveAlertsPanelProps) {
  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="card-elevated overflow-hidden h-full">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning via-destructive to-primary" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-warning to-[hsl(25,90%,55%)] flex items-center justify-center text-white">
                <Bell className="w-4 h-4" />
              </div>
              Live Alerts
            </div>
            {alerts.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full"
              >
                {alerts.length} active
              </motion.span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px] pr-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">All clear!</p>
                <p className="text-sm">No active alerts at the moment</p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="space-y-3">
                  {alerts.map((alert, index) => {
                    const Icon = alertIcons[alert.type];
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${alertColors[alert.type]}`}
                      >
                        <div className="mt-0.5">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`w-2 h-2 rounded-full ${dotColors[alert.type]}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{alert.time}</span>
                            {alert.busNo && (
                              <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                {alert.busNo}
                              </span>
                            )}
                          </div>
                        </div>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
