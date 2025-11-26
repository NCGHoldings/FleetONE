import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Fuel, TrendingDown, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function FuelAlertPanel() {
  const { data: alerts, refetch } = useQuery({
    queryKey: ['fuel-alerts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fuel_alerts')
        .select(`
          *,
          buses!inner(bus_no)
        `)
        .eq('status', 'active')
        .order('alert_timestamp', { ascending: false })
        .limit(10);

      return data;
    },
  });

  const acknowledgeAlert = async (alertId: string) => {
    await supabase
      .from('fuel_alerts')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);
    refetch();
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_fuel': return <Fuel className="h-4 w-4" />;
      case 'suspected_theft': return <AlertTriangle className="h-4 w-4" />;
      case 'abnormal_consumption': return <TrendingDown className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'low_fuel': return 'warning';
      case 'suspected_theft': return 'destructive';
      case 'abnormal_consumption': return 'secondary';
      default: return 'default';
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'low_fuel': return 'Low Fuel';
      case 'suspected_theft': return 'Suspected Theft';
      case 'abnormal_consumption': return 'Abnormal Consumption';
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Active Fuel Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-2 text-success" />
              <p>No active fuel alerts</p>
            </div>
          ) : (
            alerts.map((alert: any) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${
                  alert.alert_type === 'suspected_theft' ? 'bg-destructive/10 text-destructive' :
                  alert.alert_type === 'low_fuel' ? 'bg-warning/10 text-warning' :
                  'bg-secondary/10 text-secondary'
                }`}>
                  {getAlertIcon(alert.alert_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{alert.buses.bus_no}</h4>
                    <Badge variant={getAlertColor(alert.alert_type) as any}>
                      {getAlertTitle(alert.alert_type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fuel Level: {alert.fuel_level_percent?.toFixed(1)}%
                    {alert.fuel_drop_amount && ` • Drop: ${alert.fuel_drop_amount.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(alert.alert_timestamp), { addSuffix: true })}
                  </p>
                  {alert.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{alert.notes}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
