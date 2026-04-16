import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface ServiceAlertConfig {
  id: string;
  service_interval_km: number;
  alert_threshold_km: number;
  external_api_endpoint: string | null;
  external_api_key: string | null;
  is_enabled: boolean;
}

export function ServiceAlertSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<ServiceAlertConfig>({
    id: "",
    service_interval_km: 3000,
    alert_threshold_km: 200,
    external_api_endpoint: null,
    external_api_key: null,
    is_enabled: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("service_alert_config")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      if (data) setConfig(data);
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("service_alert_config")
        .upsert({
          id: config.id || undefined,
          service_interval_km: config.service_interval_km,
          alert_threshold_km: config.alert_threshold_km,
          external_api_endpoint: config.external_api_endpoint,
          external_api_key: config.external_api_key,
          is_enabled: config.is_enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service alert settings saved successfully",
      });
      fetchConfig();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.external_api_endpoint || !config.external_api_key) {
      toast({
        title: "Missing Configuration",
        description: "Please set API endpoint and API key first",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-service-alerts", {
        body: { test_mode: true, bus_id: null },
      });

      if (error) throw error;

      toast({
        title: "Connection Successful",
        description: "External API endpoint is reachable",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Alert Configuration</CardTitle>
          <CardDescription>
            Configure automatic service alerts based on bus mileage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service_interval">Service Interval (KM)</Label>
              <Input
                id="service_interval"
                type="number"
                value={config.service_interval_km}
                onChange={(e) =>
                  setConfig({ ...config, service_interval_km: parseInt(e.target.value) })
                }
                placeholder="3000"
              />
              <p className="text-sm text-muted-foreground">
                Distance between regular services (e.g., 3000 km)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert_threshold">Alert Threshold (KM)</Label>
              <Input
                id="alert_threshold"
                type="number"
                value={config.alert_threshold_km}
                onChange={(e) =>
                  setConfig({ ...config, alert_threshold_km: parseInt(e.target.value) })
                }
                placeholder="200"
              />
              <p className="text-sm text-muted-foreground">
                Alert this many km before service is due (e.g., 200 km)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={config.is_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
            />
            <Label htmlFor="enabled">Enable Service Alerts</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>External Platform Integration</CardTitle>
          <CardDescription>
            Connect to your external maintenance management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_endpoint">External API Endpoint URL</Label>
            <Input
              id="api_endpoint"
              type="url"
              value={config.external_api_endpoint || ""}
              onChange={(e) =>
                setConfig({ ...config, external_api_endpoint: e.target.value })
              }
              placeholder="https://your-maintenance-app.lovable.app/api/receive-alert"
            />
            <p className="text-sm text-muted-foreground">
              URL where service alerts will be sent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              value={config.external_api_key || ""}
              onChange={(e) =>
                setConfig({ ...config, external_api_key: e.target.value })
              }
              placeholder="Enter your API key"
            />
            <p className="text-sm text-muted-foreground">
              API key for authentication with external platform
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTestConnection}
              disabled={testing || !config.external_api_endpoint || !config.external_api_key}
              variant="outline"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/50">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        <div className="flex-1 text-sm">
          <p className="font-medium">How it works:</p>
          <p className="text-muted-foreground">
            When a bus reaches {config.alert_threshold_km} km before its next service
            (every {config.service_interval_km} km), an alert will be automatically sent
            to your external maintenance platform.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Configuration"
          )}
        </Button>
      </div>
    </div>
  );
}
