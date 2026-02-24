import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link2, CheckCircle, XCircle, ArrowRight, Zap, Settings2, RefreshCw } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transform?: string;
}

interface BusApiConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
  busNo: string;
  onSaved?: () => void;
}

export function BusApiConnectionModal({ isOpen, onClose, busId, busNo, onSaved }: BusApiConnectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Form state
  const [apiName, setApiName] = useState("Custom");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [authType, setAuthType] = useState("api_key");
  const [deviceIdentifier, setDeviceIdentifier] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60);
  
  // Discovery results
  const [discoveredMappings, setDiscoveredMappings] = useState<FieldMapping[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [existingConnection, setExistingConnection] = useState<any>(null);

  // Load existing connection
  useEffect(() => {
    if (isOpen && busId) {
      loadExistingConnection();
    }
  }, [isOpen, busId]);

  const loadExistingConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bus_api_connections')
        .select('*')
        .eq('bus_id', busId)
        .single();

      if (data && !error) {
        setExistingConnection(data);
        setApiName(data.api_name || "Custom");
        setApiEndpoint(data.api_endpoint || "");
        setApiKey(data.api_key || "");
        setAuthType(data.api_auth_type || "api_key");
        setDeviceIdentifier(data.device_identifier || "");
        setIsActive(data.is_active ?? true);
        setSyncInterval(data.sync_interval_seconds || 60);
        // Cast field_mappings from JSONB
        const mappings = Array.isArray(data.field_mappings) 
          ? (data.field_mappings as unknown as FieldMapping[])
          : [];
        setDiscoveredMappings(mappings);
      }
    } catch (error) {
      console.error('Error loading connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAndDiscover = async () => {
    if (!apiEndpoint) {
      toast.error("Please enter an API endpoint");
      return;
    }

    setTesting(true);
    setTestStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('discover-bus-api', {
        body: {
          apiEndpoint,
          apiKey,
          authType,
          deviceIdentifier,
          testOnly: false
        }
      });

      if (error) throw error;

      if (data.success) {
        setTestStatus('success');
        if (data.suggestedMappings && data.suggestedMappings.length > 0) {
          setDiscoveredMappings(data.suggestedMappings);
          toast.success(`API connected! Found ${data.suggestedMappings.length} field mappings`);
        } else {
          toast.success("API connected successfully, but no recognizable fields found");
        }
      } else {
        setTestStatus('error');
        toast.error(data.error || "API test failed");
      }
    } catch (error) {
      console.error('Test error:', error);
      setTestStatus('error');
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiEndpoint) {
      toast.error("Please enter an API endpoint");
      return;
    }

    setSaving(true);
    try {
      const connectionData = {
        bus_id: busId,
        bus_no: busNo,
        api_name: apiName,
        api_endpoint: apiEndpoint,
        api_key: apiKey || null,
        api_auth_type: authType,
        device_identifier: deviceIdentifier || null,
        is_active: isActive,
        sync_interval_seconds: syncInterval,
        field_mappings: JSON.parse(JSON.stringify(discoveredMappings)) as Json,
        discovered_schema: null as Json
      };

      let error;
      if (existingConnection) {
        const { error: updateError } = await supabase
          .from('bus_api_connections')
          .update(connectionData)
          .eq('id', existingConnection.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('bus_api_connections')
          .insert([connectionData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success("API connection saved successfully");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-bus-api-data', {
        body: { busId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Sync completed for ${busNo}`);
        onSaved?.();
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return <Badge className="bg-green-500">High</Badge>;
    if (confidence >= 0.7) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
  };

  const getTargetFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      latitude: 'GPS Latitude',
      longitude: 'GPS Longitude',
      speed: 'Speed (km/h)',
      odometer: 'Odometer (km)',
      fuel: 'Fuel Level',
      heading: 'Heading/Direction',
      timestamp: 'Last Update',
      battery: 'Battery Voltage',
      altitude: 'Altitude',
      satellites: 'Satellite Count',
      status: 'Status'
    };
    return labels[field] || field;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Configure API Connection - {busNo}
          </DialogTitle>
          <DialogDescription>
            Connect this bus to an external GPS/Fleet API for automatic data sync
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* API Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>API Name</Label>
                    <Input
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      placeholder="e.g., FIOS, Tracker, Custom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Type</Label>
                    <Select value={authType} onValueChange={setAuthType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Auth</SelectItem>
                        <SelectItem value="api_key">API Key (Header)</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Endpoint URL *</Label>
                  <Input
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="https://api.example.com/vehicles"
                  />
                </div>

                {authType !== 'none' && (
                  <div className="space-y-2">
                    <Label>API Key / Token</Label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter API key or token"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Device Identifier (Optional)</Label>
                  <Input
                    value={deviceIdentifier}
                    onChange={(e) => setDeviceIdentifier(e.target.value)}
                    placeholder="External device/vehicle ID in the API"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sync Interval (seconds)</Label>
                    <Input
                      type="number"
                      min={30}
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(parseInt(e.target.value) || 60)}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <Label>Enable Sync</Label>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>

                <Button 
                  onClick={handleTestAndDiscover} 
                  disabled={testing || !apiEndpoint}
                  className="w-full"
                  variant={testStatus === 'success' ? 'default' : 'outline'}
                >
                  {testing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
                  ) : testStatus === 'success' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Connection Verified</>
                  ) : testStatus === 'error' ? (
                    <><XCircle className="h-4 w-4 mr-2" /> Test Failed - Retry</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" /> Test &amp; Discover Fields</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Field Mappings */}
            {discoveredMappings.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Discovered Field Mappings ({discoveredMappings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {discoveredMappings.map((mapping, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            {mapping.sourceField}
                          </code>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {getTargetFieldLabel(mapping.targetField)}
                          </span>
                        </div>
                        {getConfidenceBadge(mapping.confidence)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Connection Status */}
            {existingConnection && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Last Sync Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {existingConnection.last_sync_status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : existingConnection.last_sync_status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-muted" />
                        )}
                        <span className="text-sm">
                          {existingConnection.last_sync_status || 'Never synced'}
                        </span>
                      </div>
                      {existingConnection.last_sync_at && (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {new Date(existingConnection.last_sync_at).toLocaleString()}
                        </p>
                      )}
                      {existingConnection.last_error_message && (
                        <p className="text-xs text-red-500">
                          {existingConnection.last_error_message}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncNow}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><RefreshCw className="h-4 w-4 mr-1" /> Sync Now</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !apiEndpoint}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : existingConnection ? (
                  'Update Connection'
                ) : (
                  'Save Connection'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
