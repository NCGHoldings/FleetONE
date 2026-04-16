import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFleetAlerts } from "@/hooks/useBusMasterData";
import { AlertTriangle, Shield, FileText, Wrench, ChevronRight, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FleetAlertsPanelProps {
  onBusClick: (busId: string) => void;
}

export const FleetAlertsPanel = ({ onBusClick }: FleetAlertsPanelProps) => {
  const { data: alerts, isLoading } = useFleetAlerts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Fleet Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts) return null;

  const totalAlerts = 
    alerts.expiredInsurance.length + 
    alerts.expiringInsurance.length + 
    alerts.expiredLicense.length + 
    alerts.expiringLicense.length +
    alerts.serviceOverdue.length +
    alerts.serviceDueSoon.length;

  if (totalAlerts === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">All Clear!</p>
              <p className="text-sm text-green-600 dark:text-green-300">
                No critical alerts. All documents and services are up to date.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alertGroups = [
    {
      title: 'Expired Insurance',
      icon: Shield,
      items: alerts.expiredInsurance,
      color: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600'
    },
    {
      title: 'Expiring Insurance',
      icon: Shield,
      items: alerts.expiringInsurance,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600'
    },
    {
      title: 'Expired License',
      icon: FileText,
      items: alerts.expiredLicense,
      color: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600'
    },
    {
      title: 'Expiring License',
      icon: FileText,
      items: alerts.expiringLicense,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600'
    },
    {
      title: 'Service Overdue',
      icon: Wrench,
      items: alerts.serviceOverdue,
      color: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600'
    },
    {
      title: 'Service Due Soon',
      icon: Wrench,
      items: alerts.serviceDueSoon,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600'
    },
  ].filter(group => group.items.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Fleet Alerts
            <Badge variant="destructive" className="ml-2">{totalAlerts}</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {alertGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div 
                key={group.title}
                className={`p-3 rounded-lg ${group.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${group.color}`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium">{group.title}</span>
                </div>
                <p className={`text-2xl font-bold ${group.textColor}`}>
                  {group.items.length}
                </p>
                <div className="mt-2 space-y-1">
                  {group.items.slice(0, 3).map((bus) => (
                    <button
                      key={bus.id}
                      onClick={() => onBusClick(bus.id)}
                      className="flex items-center justify-between w-full text-xs hover:underline"
                    >
                      <span>{bus.bus_no}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  ))}
                  {group.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{group.items.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
