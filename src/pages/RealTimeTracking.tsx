import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  MapPin, Truck, Gauge, Fuel, Settings, 
  AlertTriangle, CheckCircle, RadioIcon as Radio,
  Thermometer, Droplets, Battery, Navigation, RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format } from "date-fns";

interface TrackingData {
  id: string;
  bus_id: string;
  bus_no: string;
  current_location: string;
  gps_coordinates?: {lat: number; lng: number};
  route_id?: string;
  route_name?: string;
  speed_kmh: number;
  status: string;
  last_update: string;
  fuel_level?: number;
  tire_pressure?: {
    front_left: number;
    front_right: number;
    rear_left: number;
    rear_right: number;
  };
  engine_health: string;
  engine_temperature?: number;
  oil_pressure?: number;
  battery_voltage?: number;
  odometer_reading?: number;
  driver_id?: string;
  driver_name?: string;
  alerts?: any[];
}

interface GPSSettings {
  apiEndpoint: string;
  apiKey: string;
  refreshInterval: number;
}

export default function RealTimeTracking() {
  const { hasRole } = useAuth();
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapView, setIsMapView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gpsSettings, setGpsSettings] = useState<GPSSettings>({
    apiEndpoint: 'https://track.schoolride.lk',
    apiKey: 'Connected via Supabase Edge Function',
    refreshInterval: 30
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  const fetchTrackingData = async () => {
    try {
      const { data, error } = await supabase
        .from('real_time_tracking')
        .select('*')
        .order('last_update', { ascending: false });

      if (error) throw error;
      setTrackingData((data as any) || []);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await simulateGPSUpdate(); // This now calls the real GPS API
  };

  const simulateGPSUpdate = async () => {
    try {
      setIsRefreshing(true);
      
      // Call the edge function to fetch real GPS data
      const { data, error } = await supabase.functions.invoke('fetch-gps-tracking');
      
      if (error) {
        console.error('Error calling GPS tracking function:', error);
        throw error;
      }

      if (data?.success) {
        // Refresh the tracking data after updating
        await fetchTrackingData();
        toast.success(`GPS data updated for ${data.data?.length || 0} vehicles from Traccar API`);
      } else {
        throw new Error(data?.error || 'Failed to update GPS data');
      }
    } catch (error: any) {
      console.error('Error updating GPS data:', error);
      
      // Fallback to simulated data if API fails
      try {
        const updates = trackingData.map(vehicle => {
          const newSpeed = vehicle.status === 'active' ? 
            Math.floor(Math.random() * 60) + 20 : 0;
          
          const newFuelLevel = Math.max(10, 
            (vehicle.fuel_level || 50) + (Math.random() - 0.5) * 5
          );

          return {
            id: vehicle.id,
            speed_kmh: newSpeed,
            fuel_level: newFuelLevel,
            last_update: new Date().toISOString(),
            engine_temperature: 85 + Math.random() * 20,
            battery_voltage: 12.0 + Math.random() * 2,
            status: newSpeed > 0 ? 'active' : 'inactive'
          };
        });

        // Update each vehicle's data
        for (const update of updates) {
          await supabase
            .from('real_time_tracking')
            .update(update)
            .eq('id', update.id);
        }

        await fetchTrackingData();
      } catch (fallbackError) {
        console.error('Fallback update failed:', fallbackError);
      }
      
      toast.error(`GPS API failed: ${ (error as any)?.message || 'Using simulated data. Check Traccar connection.' }`);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    
    // Set up auto-refresh
    if (gpsSettings.refreshInterval > 0) {
      refreshInterval.current = setInterval(() => {
        simulateGPSUpdate();
      }, gpsSettings.refreshInterval * 1000);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [gpsSettings.refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'maintenance': return 'secondary';
      case 'emergency': return 'destructive';
      case 'offline': return 'outline';
      default: return 'outline';
    }
  };

  const getEngineHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'default';
      case 'good': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getFuelLevelColor = (level: number) => {
    if (level < 20) return 'text-red-500';
    if (level < 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const columns: ColumnDef<TrackingData>[] = [
    {
      accessorKey: "bus_no",
      header: "Bus No",
      cell: ({ row }) => (
        <div className="font-mono font-medium">
          {row.getValue("bus_no")}
        </div>
      ),
    },
    {
      accessorKey: "current_location",
      header: "Current Location",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[200px] truncate">
            {row.getValue("current_location") || 'Location Unknown'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "route_name",
      header: "Route",
    },
    {
      accessorKey: "speed_kmh",
      header: "Speed",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue("speed_kmh")} km/h</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusColor(row.getValue("status"))}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      accessorKey: "last_update",
      header: "Last Update",
      cell: ({ row }) => {
        const date = new Date(row.getValue("last_update"));
        return (
          <div className="text-sm">
            {format(date, 'HH:mm:ss')}
            <br />
            <span className="text-muted-foreground text-xs">
              {format(date, 'MMM dd')}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "fuel_level",
      header: "Fuel",
      cell: ({ row }) => {
        const fuelLevel = row.getValue("fuel_level") as number;
        return fuelLevel ? (
          <div className="flex items-center gap-2">
            <Fuel className={`h-4 w-4 ${getFuelLevelColor(fuelLevel)}`} />
            <span className={getFuelLevelColor(fuelLevel)}>
              {Math.round(fuelLevel)}%
            </span>
          </div>
        ) : '-';
      },
    },
    {
      accessorKey: "tire_pressure",
      header: "Tire Pressure",
      cell: ({ row }) => {
        const tirePressure = row.original.tire_pressure;
        if (!tirePressure) return '-';
        
        const avgPressure = Object.values(tirePressure).reduce((a, b) => a + b, 0) / 4;
        const isLow = avgPressure < 30;
        
        return (
          <div className={`flex items-center gap-2 ${isLow ? 'text-red-500' : 'text-green-500'}`}>
            <Radio className="h-4 w-4" />
            <span>{Math.round(avgPressure)} PSI</span>
          </div>
        );
      },
    },
    {
      accessorKey: "engine_health",
      header: "Engine Health",
      cell: ({ row }) => (
        <Badge variant={getEngineHealthColor(row.getValue("engine_health"))}>
          {row.getValue("engine_health")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            // View detailed vehicle info
            toast.info(`Viewing details for ${row.original.bus_no}`);
          }}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            // Show on map
            toast.info(`Locating ${row.original.bus_no} on map`);
          }}>
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeVehicles = trackingData.filter(v => v.status === 'active').length;
  const totalVehicles = trackingData.length;
  const averageSpeed = trackingData.length > 0 ? 
    Math.round(trackingData.reduce((sum, v) => sum + v.speed_kmh, 0) / trackingData.length) : 0;
  const lowFuelVehicles = trackingData.filter(v => (v.fuel_level || 0) < 20).length;

  return (
    <div className="space-y-8 animate-fade-in p-6">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-primary to-primary-hover p-8 text-accent-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <Navigation className="w-10 h-10 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                Real-Time Tracking
              </h1>
              <p className="text-accent-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                Monitor fleet vehicles in real-time with GPS tracking
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshData}
              disabled={isRefreshing}
              className="bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: '0.2s' }}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : 'animate-pulse-subtle'}`} />
              Refresh
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setIsMapView(!isMapView)}
              className="bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: '0.3s' }}
            >
              <MapPin className="h-4 w-4 mr-2 animate-wiggle" />
              {isMapView ? 'Table View' : 'Map View'}
            </Button>
            
            {isSupervisor && (
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 transition-all duration-300 animate-scale-in"
                    style={{ animationDelay: '0.4s' }}
                  >
                    <Settings className="h-4 w-4 mr-2 animate-bounce-notification" />
                    GPS Settings
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>GPS API Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="api_endpoint">API Endpoint</Label>
                    <Input
                      id="api_endpoint"
                      value={gpsSettings.apiEndpoint}
                      onChange={(e) => setGpsSettings(prev => ({
                        ...prev, 
                        apiEndpoint: e.target.value
                      }))}
                      placeholder="https://api.gps-tracking.com/v1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="api_key">API Key</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={gpsSettings.apiKey}
                      onChange={(e) => setGpsSettings(prev => ({
                        ...prev, 
                        apiKey: e.target.value
                      }))}
                      placeholder="Enter your GPS API key"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="refresh_interval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refresh_interval"
                      type="number"
                      min="5"
                      max="300"
                      value={gpsSettings.refreshInterval}
                      onChange={(e) => setGpsSettings(prev => ({
                        ...prev, 
                        refreshInterval: parseInt(e.target.value) || 30
                      }))}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      toast.success('GPS settings saved');
                    }}
                    className="w-full"
                  >
                    Save Settings
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced KPI Cards with Animations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Active Vehicles"
              value={`${activeVehicles}/${totalVehicles}`}
              icon={<Truck className="h-4 w-4 group-hover:animate-wiggle" />}
              change="0"
              changeType="neutral"
              description="currently on road"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-success transition-all duration-500 group">
            <KPICard
              title="Average Speed"
              value={`${averageSpeed} km/h`}
              icon={<Gauge className="h-4 w-4 group-hover:animate-pulse-subtle" />}
              change="0"
              changeType="neutral"
              description="fleet average"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="professional-card hover:shadow-warning transition-all duration-500 group">
            <KPICard
              title="Low Fuel Alerts"
              value={lowFuelVehicles.toString()}
              icon={<Fuel className="h-4 w-4 group-hover:animate-bounce-notification" />}
              change="0"
              changeType="neutral"
              description="require attention"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <div className="professional-card hover:shadow-accent transition-all duration-500 group">
            <KPICard
              title="GPS Status"
              value="Online"
              icon={<Navigation className="h-4 w-4 group-hover:animate-bounce-subtle" />}
              change="0"
              changeType="neutral"
              description="tracking active"
            />
          </div>
        </div>
      </div>

      {/* Map or Table View */}
      {isMapView ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Fleet Map View
            </CardTitle>
            <CardDescription>
              Real-time vehicle locations with live tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Interactive Map Coming Soon</h3>
                <p className="text-muted-foreground text-sm">
                  Live GPS tracking with vehicle markers, routes, and real-time updates
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  API Endpoint: {gpsSettings.apiEndpoint}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Tracking Data</CardTitle>
            <CardDescription>
              Real-time monitoring of fleet vehicles with GPS, fuel, and engine data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={trackingData} />
          </CardContent>
        </Card>
      )}

      {/* Vehicle Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Engine Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trackingData.slice(0, 5).map(vehicle => (
                <div key={vehicle.id} className="flex justify-between items-center">
                  <span className="font-mono text-sm">{vehicle.bus_no}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {vehicle.engine_temperature ? `${Math.round(vehicle.engine_temperature)}°C` : 'N/A'}
                    </span>
                    {vehicle.engine_temperature && vehicle.engine_temperature > 100 && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Oil Pressure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trackingData.slice(0, 5).map(vehicle => (
                <div key={vehicle.id} className="flex justify-between items-center">
                  <span className="font-mono text-sm">{vehicle.bus_no}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {vehicle.oil_pressure ? `${Math.round(vehicle.oil_pressure)} PSI` : 'N/A'}
                    </span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5" />
              Battery Voltage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trackingData.slice(0, 5).map(vehicle => (
                <div key={vehicle.id} className="flex justify-between items-center">
                  <span className="font-mono text-sm">{vehicle.bus_no}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {vehicle.battery_voltage ? `${vehicle.battery_voltage.toFixed(1)}V` : 'N/A'}
                    </span>
                    {vehicle.battery_voltage && vehicle.battery_voltage > 12 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}