import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ChevronDown, ChevronUp, Calendar, Wrench } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export function ServiceAlertPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['service-alerts-fleet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bus_service_alerts')
        .select(`
          *,
          buses (
            bus_no,
            model,
            current_mileage,
            next_service_mileage
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !alerts || alerts.length === 0) {
    return null;
  }

  const recentAlerts = isExpanded ? alerts : alerts.slice(0, 3);

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Recent Service Alerts
            <Badge variant="secondary">{alerts.length}</Badge>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white border rounded-lg p-4 space-y-2 hover:border-orange-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold">{alert.buses?.bus_no}</span>
                  <Badge 
                    variant={alert.alert_type === 'urgent' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {alert.alert_type}
                  </Badge>
                  {alert.status && (
                    <Badge variant="outline" className="text-xs">
                      {alert.status}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Triggered:</span>
                  <span className="font-medium ml-1">{alert.triggered_at_km.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Next Service:</span>
                  <span className="font-medium ml-1">{alert.next_service_km.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium ml-1 text-orange-600">
                    {(alert.next_service_km - alert.triggered_at_km).toLocaleString()} km
                  </span>
                </div>
              </div>

              {alert.alert_sent_at && (
                <p className="text-xs text-muted-foreground">
                  Alert sent to external platform: {format(new Date(alert.alert_sent_at), 'PPp')}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
