import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { Wrench, AlertTriangle, CheckCircle, Clock, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";

interface BusMasterServiceTabProps {
  data: BusMasterData;
}

export const BusMasterServiceTab = ({ data }: BusMasterServiceTabProps) => {
  const { service, bus } = data;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-LK').format(num);
  };

  const getServiceStatus = () => {
    if (service.overdueKm && service.overdueKm > 0) {
      return { status: 'overdue', color: 'bg-red-500', icon: AlertTriangle };
    }
    if (service.nextServiceMileage) {
      const remaining = service.nextServiceMileage - (bus.current_mileage || 0);
      if (remaining < 1000) {
        return { status: 'due-soon', color: 'bg-orange-500', icon: Clock };
      }
    }
    return { status: 'ok', color: 'bg-green-500', icon: CheckCircle };
  };

  const statusInfo = getServiceStatus();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4">
      {/* Service Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Service Status
            </CardTitle>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Schedule Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Current Status */}
            <div className={`p-4 rounded-lg ${statusInfo.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/20' : statusInfo.status === 'due-soon' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-8 w-8 ${statusInfo.status === 'overdue' ? 'text-red-500' : statusInfo.status === 'due-soon' ? 'text-orange-500' : 'text-green-500'}`} />
                <div>
                  <p className="font-medium">
                    {statusInfo.status === 'overdue' && 'Service Overdue'}
                    {statusInfo.status === 'due-soon' && 'Service Due Soon'}
                    {statusInfo.status === 'ok' && 'Service Up to Date'}
                  </p>
                  {service.overdueKm ? (
                    <p className="text-sm text-muted-foreground">
                      Overdue by {formatNumber(service.overdueKm)} km
                    </p>
                  ) : service.nextServiceMileage ? (
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(service.nextServiceMileage - (bus.current_mileage || 0))} km remaining
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No service schedule set</p>
                  )}
                </div>
              </div>
            </div>

            {/* Last Service */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Last Service</p>
              {service.lastServiceDate ? (
                <>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(service.lastServiceDate), 'MMM dd, yyyy')}
                  </p>
                  {service.lastServiceMileage && (
                    <p className="text-sm text-muted-foreground">
                      at {formatNumber(service.lastServiceMileage)} km
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No record</p>
              )}
            </div>

            {/* Next Service */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Next Service Due</p>
              {service.nextServiceDate || service.nextServiceMileage ? (
                <>
                  {service.nextServiceDate && (
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(service.nextServiceDate), 'MMM dd, yyyy')}
                    </p>
                  )}
                  {service.nextServiceMileage && (
                    <p className="text-sm text-muted-foreground">
                      or at {formatNumber(service.nextServiceMileage)} km
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Not scheduled</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mileage Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Mileage Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Current Mileage</p>
              <p className="text-xl font-bold">{formatNumber(bus.current_mileage || 0)} km</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Service Interval</p>
              <p className="text-xl font-bold">{formatNumber(bus.service_interval_km || 5000)} km</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Next Service At</p>
              <p className="text-xl font-bold">
                {service.nextServiceMileage ? formatNumber(service.nextServiceMileage) : 'N/A'} km
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Km Until Service</p>
              <p className={`text-xl font-bold ${service.overdueKm ? 'text-red-500' : 'text-green-600'}`}>
                {service.overdueKm 
                  ? `-${formatNumber(service.overdueKm)}`
                  : service.nextServiceMileage 
                    ? formatNumber(service.nextServiceMileage - (bus.current_mileage || 0))
                    : 'N/A'
                } km
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Alerts */}
      {service.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Service Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {service.alerts.map((alert, index) => (
                <div key={alert.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{alert.alert_type}</p>
                    <p className="text-sm text-muted-foreground">
                      Triggered at {formatNumber(alert.triggered_at_km)} km
                    </p>
                  </div>
                  <Badge variant={alert.status === 'pending' ? 'destructive' : 'secondary'}>
                    {alert.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State for Service History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Service History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No service records available</p>
            <p className="text-sm">Service history will appear here once records are added</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
