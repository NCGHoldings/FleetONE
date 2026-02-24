import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceStatusBadge } from "./ServiceStatusBadge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Navigation, Mountain, Satellite, Gauge, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface VehicleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busNo: string;
}

export function VehicleDetailsModal({ open, onOpenChange, busNo }: VehicleDetailsModalProps) {
  const { data: trackingData, isLoading: trackingLoading } = useQuery({
    queryKey: ['vehicle-tracking', busNo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('real_time_tracking')
        .select('*')
        .eq('bus_no', busNo)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: busData, isLoading: busLoading } = useQuery({
    queryKey: ['bus-details', busNo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('bus_no', busNo)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: serviceAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['service-alerts', busData?.id],
    queryFn: async () => {
      if (!busData?.id) return [];
      const { data, error } = await supabase
        .from('bus_service_alerts')
        .select('*')
        .eq('bus_id', busData.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: open && !!busData?.id,
  });

  const isLoading = trackingLoading || busLoading || alertsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Vehicle Details - {busNo}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
              <TabsTrigger value="service">Service Status</TabsTrigger>
              <TabsTrigger value="alerts">Alert History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Status</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {trackingData?.current_location || 'Unknown'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-medium">{trackingData?.route_name || 'Not assigned'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Speed</p>
                      <p className="font-medium">{trackingData?.speed_kmh || 0} km/h</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={trackingData?.status === 'active' ? 'default' : 'secondary'}>
                        {trackingData?.status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Odometer & Mileage</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Odometer</p>
                    <p className="text-2xl font-bold flex items-center gap-2">
                      <Gauge className="h-5 w-5" />
                      {trackingData?.odometer_km?.toLocaleString() || '0'} km
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Daily Mileage</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {trackingData?.daily_mileage_km?.toFixed(1) || '0'} km
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="telemetry" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>GPS & Telemetry Data</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Navigation className="h-4 w-4" />
                        Heading
                      </p>
                      <p className="text-lg font-medium">{trackingData?.heading_degrees || 0}°</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mountain className="h-4 w-4" />
                        Altitude
                      </p>
                      <p className="text-lg font-medium">{trackingData?.altitude_meters || 0} m</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Satellite className="h-4 w-4" />
                        GPS Signal
                      </p>
                      <p className="text-lg font-medium">{trackingData?.satellite_count || 0} satellites</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Coordinates</p>
                      <p className="text-sm font-mono">
                        {trackingData?.gps_coordinates 
                          ? `${(trackingData.gps_coordinates as any)?.lat?.toFixed(6) || 'N/A'}, ${(trackingData.gps_coordinates as any)?.lng?.toFixed(6) || 'N/A'}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Last Update</p>
                      <p className="text-sm">
                        {trackingData?.last_update ? format(new Date(trackingData.last_update), 'PPp') : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="service" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Service Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {busData?.current_mileage && busData?.next_service_mileage ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Status:</span>
                        <ServiceStatusBadge 
                          currentKm={busData.current_mileage} 
                          nextServiceKm={busData.next_service_mileage}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Current Mileage</p>
                          <p className="text-xl font-bold">{busData.current_mileage.toLocaleString()} km</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Next Service Due</p>
                          <p className="text-xl font-bold">{busData.next_service_mileage.toLocaleString()} km</p>
                        </div>
                      </div>
                      {busData.last_service_date && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Last Service Date
                          </p>
                          <p className="font-medium">{format(new Date(busData.last_service_date), 'PPP')}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Service data not available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Service Alert History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {serviceAlerts && serviceAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {serviceAlerts.map((alert) => (
                        <div key={alert.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={alert.alert_type === 'urgent' ? 'destructive' : 'secondary'}>
                              {alert.alert_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(alert.created_at), 'PPp')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Triggered at:</span>
                              <span className="font-medium ml-2">{alert.triggered_at_km.toLocaleString()} km</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Next service:</span>
                              <span className="font-medium ml-2">{alert.next_service_km.toLocaleString()} km</span>
                            </div>
                          </div>
                          {alert.alert_sent_at && (
                            <p className="text-xs text-muted-foreground">
                              Alert sent: {format(new Date(alert.alert_sent_at), 'PPp')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No service alerts recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
