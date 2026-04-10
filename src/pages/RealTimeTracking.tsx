import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
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
  Thermometer, Droplets, Battery, Navigation, RefreshCw, Loader2, Plus, Satellite, Activity, BarChart3, Link2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format } from "date-fns";
import FleetTrackingMap from "@/components/fleet/FleetTrackingMap";
import { seedMissingGPSBuses } from "@/utils/seed-missing-gps-buses";
import { ServiceStatusBadge } from "@/components/fleet/ServiceStatusBadge";
import { VehicleDetailsModal } from "@/components/fleet/VehicleDetailsModal";
import { ServiceAlertPanel } from "@/components/fleet/ServiceAlertPanel";
import { ManualOdometerEntryModal } from "@/components/fleet/ManualOdometerEntryModal";
import { OdometerAdjustmentModal } from "@/components/fleet/OdometerAdjustmentModal";
import { OdometerOverviewModal } from "@/components/fleet/OdometerOverviewModal";
import { BusApiConnectionModal } from "@/components/fleet/BusApiConnectionModal";
import { useQuery } from "@tanstack/react-query";
import { useKloudipFIOS } from "@/hooks/useKloudipFIOS";

function parseBusNumber(fiosName: string): string {
  const parts = fiosName.split('-');
  if (parts.length >= 2 && !fiosName.includes(" ")) {
    return `${parts[0]} ${parts[1]}`;
  }
  return fiosName;
}

function getEngineHealth(speed: number, lastUpdate: string): string {
  const updateAge = Date.now() - new Date(lastUpdate).getTime();
  const minutesOld = updateAge / (1000 * 60);
  
  if (minutesOld > 30) return 'critical';
  if (speed > 80) return 'warning';
  return 'good';
}

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
  fuel_level_liters?: number; // Fuel in liters from FIOS
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
  // Enhanced GPS data from FIOS
  heading_degrees?: number;
  altitude_meters?: number;
  satellite_count?: number;
  fios_device_id?: number;
  odometer_km?: number;
  daily_mileage_km?: number;
  engine_hours?: number;
  odometer_source?: string;
  // Additional FIOS telemetry
  gsm_signal_strength?: number;
  ignition_status?: boolean;
  gps_accuracy?: number;
  alarm_active?: boolean;
}

interface GPSSettings {
  apiEndpoint: string;
  apiKey: string;
  refreshInterval: number;
}

export default function RealTimeTracking() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapView, setIsMapView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [gpsSettings, setGpsSettings] = useState<GPSSettings>(() => {
    // Load non-sensitive settings from localStorage
    // SECURITY: API key is NOT stored in localStorage - fetched from secure edge function
    const savedSettings = localStorage.getItem('gpsSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Only restore non-sensitive settings, never the API key
        return {
          apiEndpoint: parsed.apiEndpoint || 'https://fios-api.kloudip.com',
          apiKey: '', // Always empty - fetched securely from edge function
          refreshInterval: parsed.refreshInterval || 30
        };
      } catch (e) {
        console.warn('Invalid saved GPS settings');
      }
    }
    return {
      apiEndpoint: 'https://fios-api.kloudip.com',
      apiKey: '', // Never stored in localStorage
      refreshInterval: 10 // Auto-set to 10s for fast FIOS updates
    };
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [unmatchedVehicleCount, setUnmatchedVehicleCount] = useState(0);
  const [isAddingBuses, setIsAddingBuses] = useState(false);
  const [selectedBusForOdometer, setSelectedBusForOdometer] = useState<{id: string, no: string, odometer?: number} | null>(null);
  const [isOdometerEntryOpen, setIsOdometerEntryOpen] = useState(false);
  const [isOdometerAdjustmentOpen, setIsOdometerAdjustmentOpen] = useState(false);
  const [isOdometerOverviewOpen, setIsOdometerOverviewOpen] = useState(false);
  const [selectedBusForApi, setSelectedBusForApi] = useState<{id: string, no: string} | null>(null);
  const [isApiConnectionOpen, setIsApiConnectionOpen] = useState(false);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Directly initialize our custom Wialon hook
  const { vehicles: fiosVehicles, loading: fiosLoading } = useKloudipFIOS(
    gpsSettings.apiKey || "b507db56e768bd62af1e9b6e184a0f7987B5D187A5190B92E4F4F80B08D43CD23D20EA6A",
    gpsSettings.refreshInterval
  );

  // Merged Tracking Data (Live Hardware + Local DB)
  const [liveTrackingData, setLiveTrackingData] = useState<TrackingData[]>([]);

  useEffect(() => {
    if (fiosVehicles && fiosVehicles.length > 0) {
      // Merge physical hardware FIOS pings into local database representations
      const merged = fiosVehicles.map(v => {
        const busNo = parseBusNumber(v.nm);
        // Find existing DB data to retain custom stats
        const dbData = trackingData.find(d => 
          d.bus_no === busNo || 
          d.bus_no === v.nm || 
          d.bus_no.replace(/\s+/g, '') === busNo.replace(/\s+/g, '')
        );

        const lastUpdate = v.pos?.t ? new Date(v.pos.t * 1000).toISOString() : new Date().toISOString();
        const speed = v.pos?.s || 0;
        const lat = v.pos?.y || 0;
        const lng = v.pos?.x || 0;

        return {
           id: dbData?.id || `fios-${v.id}`,
           bus_id: dbData?.bus_id || `fios-${v.id}`,
           bus_no: busNo,
           current_location: lat && lng ? `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}` : 'Lost GPS',
           gps_coordinates: { lat, lng },
           speed_kmh: speed,
           status: speed > 0 ? 'active' : 'inactive',
           last_update: lastUpdate,
           route_name: dbData?.route_name || 'Unassigned',
           fuel_level_liters: dbData?.fuel_level_liters,
           tire_pressure: dbData?.tire_pressure,
           engine_health: getEngineHealth(speed, lastUpdate),
           odometer_km: dbData?.odometer_km,
           fios_device_id: v.id,
           heading_degrees: v.pos?.c || 0,
           satellite_count: v.pos?.sc || 0,
           satellites: v.pos?.sc || 0,
           ignition_status: speed > 0 ? true : false,
           daily_mileage_km: dbData?.daily_mileage_km || 0,
           altitude: v.pos?.z || 0,
           battery_v: v.prms?.pwr_ext?.v,
           gsm: v.prms?.gsm?.v,
        } as TrackingData;
      });
      setLiveTrackingData(merged);
      setUnmatchedVehicleCount(merged.filter(m => String(m.id).startsWith("fios-")).length);
    } else {
      // Fallback explicitly to DB if hardware is unreachable
      setLiveTrackingData(trackingData);
    }
  }, [fiosVehicles, trackingData]);

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
    setIsRefreshing(true)
    try {
      await simulateGPSUpdate()
      await fetchTrackingData()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const debugGPSConnection = async () => {
    setIsRefreshing(true)
    try {
      const { data, error } = await supabase.functions.invoke('fetch-fios-tracking', {
        body: {}
      })
      
      if (error) {
        console.error('FIOS Debug Error:', error)
        toast.error(`FIOS Connection Error: ${error.message || 'Unknown error'}`)
        return
      }

      if (!data?.success) {
        console.error('FIOS Debug Failed:', data)
        toast.error(`FIOS Debug Failed: ${data?.error || 'API returned error'}`)
        return
      }

      console.log('FIOS Debug Success:', data)
      toast.success(`FIOS connection successful! Matched ${data.matched} vehicles, ${data.unmatched} unmatched`)
      
      // Refresh the tracking data to show the updated info
      await fetchTrackingData()
    } catch (error) {
      console.error('Debug FIOS error:', error)
      toast.error(`Debug failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  const simulateGPSUpdate = async () => {
    console.log("Fetching live GPS data from FIOS API...");
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-fios-tracking', {
        body: {}
      });

      if (error) {
        console.error("FIOS API error:", error);
        toast.error(`GPS Update Failed: ${error.message || "Failed to fetch GPS data from FIOS API"}`);
        return;
      }

      console.log("FIOS API response:", data);
      
      setUnmatchedVehicleCount(data.unmatched || 0);
      
      if (data.unmatchedVehicles && data.unmatchedVehicles.length > 0) {
        toast.success(`DB Sync Triggered. Matched ${data.matched} vehicles.`);
      } else {
        toast.success(`DB Sync completed.`);
      }
      
      // Refresh the tracking data from database
      await fetchTrackingData();
      
    } catch (err) {
      console.error("Failed to update GPS data:", err);
      toast.error("Failed to connect to FIOS API");
    }
  };

  // Fetch Google Maps API key on mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-api-key')
        
        if (error) {
          console.error('Error fetching Google Maps API key:', error)
          toast.error('Failed to load map API key')
          return
        }
        
        if (data?.apiKey) {
          setGoogleMapsApiKey(data.apiKey)
        }
      } catch (error) {
        console.error('Error fetching API key:', error)
        toast.error('Failed to initialize map')
      } finally {
        setIsLoadingApiKey(false)
      }
    }
    
    fetchApiKey()
  }, [])

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

  const handleAddMissingBuses = async () => {
    setIsAddingBuses(true);
    try {
      // Step 1: Detect all unmapped FIOS units currently residing purely in memory
      const missingBusesToInsert = liveTrackingData
        .filter((v) => String(v.id).startsWith("fios-"))
        .map((v) => ({
          bus_no: v.bus_no,
          type: v.bus_no.startsWith("NG") || v.bus_no.startsWith("NE") || v.bus_no.startsWith("NB") ? "Imported Bus" : "Regular",
          model: "Unknown",
          capacity: 50,
          year: 2020,
          status: "active",
        }));

      if (missingBusesToInsert.length === 0) {
        toast.error("No unmapped FIOS vehicles detected.");
        setIsAddingBuses(false);
        return;
      }
      
      console.log(`[FIOS Auth] Pushing ${missingBusesToInsert.length} hardware units...`);

      // Step 2: Push safely to the Database
      const { error } = await supabase
        .from("buses")
        .upsert(missingBusesToInsert, {
          onConflict: "bus_no"
        });

      if (error) {
        throw error;
      }
      
      toast.success(`Successfully registered ${missingBusesToInsert.length} FIOS units to your Fleet!`);
      
      // Step 3: Trigger backend Edge function to aggressively fetch Fuel and Odometer for new vehicles
      await debugGPSConnection();
      
      // Step 4: Refetch layout map tracking state natively
      await fetchTrackingData();
      
    } catch (error: any) {
      toast.error(`Database Error: ${error.message}`);
    }
    setIsAddingBuses(false);
  };

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
        <button 
          onClick={() => setSelectedVehicle(row.original.bus_no)}
          className="font-mono font-medium text-primary hover:underline cursor-pointer"
        >
          {row.getValue("bus_no")}
        </button>
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
      accessorKey: "fuel_level_liters",
      header: "Fuel",
      cell: ({ row }) => {
        const fuelLiters = row.getValue("fuel_level_liters") as number || row.original.fuel_level as number;
        return fuelLiters ? (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" />
            <span className="font-medium">{Math.round(fuelLiters)} L</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
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
      accessorKey: "battery_v",
      header: "Battery (V)",
      cell: ({ row }) => {
        const val = row.getValue("battery_v") as number;
        return (
          <div className="flex items-center gap-2">
            <Battery className={`h-4 w-4 ${val < 11.5 ? 'text-destructive' : 'text-green-500'}`} />
            <span>{val ? `${val}V` : '-'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "satellites",
      header: "Satellites",
      cell: ({ row }) => {
        const val = row.getValue("satellites") as number;
        return (
          <div className="flex items-center gap-2">
            <Satellite className={`h-4 w-4 ${val < 5 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <span>{val || '-'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "gsm",
      header: "Signal",
      cell: ({ row }) => {
        const val = row.getValue("gsm") as number;
        return (
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 ${val < 2 ? 'text-destructive' : 'text-blue-500'}`} />
            <span>{val ? `${val}/5` : '-'}</span>
          </div>
        )
      },
    },
    {
       accessorKey: "odometer_km",
      header: "Odometer",
      cell: ({ row }) => {
        const odometer = row.original.odometer_km;
        const dailyMileage = row.original.daily_mileage_km;
        const odometerSource = row.original.odometer_source || 'manual';
        
        const getSourceBadge = () => {
          switch(odometerSource) {
            case 'fios':
              return <Badge variant="default" className="text-xs">FIOS</Badge>;
            case 'gps_calculated':
              return <Badge variant="secondary" className="text-xs">GPS</Badge>;
            default:
              return <Badge variant="outline" className="text-xs">Manual</Badge>;
          }
        };
        
        return (
          <div className="space-y-1">
            {odometer && odometer > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{odometer.toFixed(1)} km</span>
                  {getSourceBadge()}
                </div>
                {dailyMileage && dailyMileage > 0 && (
                  <div className="text-xs text-muted-foreground">
                    +{dailyMileage.toFixed(1)} km today
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">-</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedBusForOdometer({ 
                      id: row.original.bus_id, 
                      no: row.original.bus_no
                    });
                    setIsOdometerEntryOpen(true);
                  }}
                  className="h-6 text-xs px-2"
                >
                  Set Base
                </Button>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "service_status",
      header: "Service Status",
      cell: ({ row }) => {
        const ServiceStatusCell = () => {
          const { data: busData } = useQuery({
            queryKey: ['bus-service', row.original.bus_no],
            queryFn: async () => {
              const { data } = await supabase
                .from('buses')
                .select('current_mileage, next_service_mileage')
                .eq('bus_no', row.original.bus_no)
                .single();
              return data;
            },
          });

          if (!busData?.current_mileage || !busData?.next_service_mileage) {
            return <span className="text-muted-foreground text-sm">N/A</span>;
          }

          return (
            <ServiceStatusBadge
              currentKm={busData.current_mileage}
              nextServiceKm={busData.next_service_mileage}
              showKm={false}
            />
          );
        };
        
        return <ServiceStatusCell />;
      },
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setSelectedVehicle(row.original.bus_no)}
            title="View Details"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              // Switch to map view and center on this bus
              setIsMapView(true);
              setSelectedVehicle(row.original.bus_no);
              toast.success(`Showing ${row.original.bus_no} on map`);
            }}
            title="Show on Map"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setSelectedBusForApi({
                id: row.original.bus_id,
                no: row.original.bus_no
              });
              setIsApiConnectionOpen(true);
            }}
            title="Configure API"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeVehicles = liveTrackingData.filter(v => v.status === 'active').length;
  const totalVehicles = liveTrackingData.length;
  const averageSpeed = liveTrackingData.length > 0 ? 
    Math.round(liveTrackingData.reduce((sum, v) => sum + v.speed_kmh, 0) / liveTrackingData.length) : 0;
  const lowFuelVehicles = liveTrackingData.filter(v => (v.fuel_level || 0) < 20).length;
  const totalFleetMileage = liveTrackingData.reduce((sum, v) => sum + (v.odometer_km || 0), 0);
  const totalDailyMileage = liveTrackingData.reduce((sum, v) => sum + (v.daily_mileage_km || 0), 0);
  const enginesRunning = liveTrackingData.filter(v => v.ignition_status === true).length;
  const lowBatteryCount = liveTrackingData.filter(v => v.battery_voltage && v.battery_voltage < 12.0).length;

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
              variant="default" 
              onClick={() => navigate('/fleet-analytics')}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 text-white transition-all duration-300 animate-scale-in shadow-lg"
              style={{ animationDelay: '0.1s' }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            
            {unmatchedVehicleCount > 0 && (
              <Button 
                onClick={handleAddMissingBuses}
                variant="default"
                disabled={isAddingBuses}
                className="bg-green-500/80 hover:bg-green-600 text-white transition-all duration-300 animate-scale-in"
                style={{ animationDelay: '0.15s' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingBuses ? "Adding Buses..." : `Add ${unmatchedVehicleCount} Missing GPS Buses`}
              </Button>
            )}
            
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
              onClick={debugGPSConnection}
              disabled={isRefreshing}
              className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-300/50 hover:bg-yellow-500/30 text-yellow-100 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: '0.25s' }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Debug GPS
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
            
            <Button 
              variant="outline" 
              onClick={() => setIsOdometerOverviewOpen(true)}
              className="bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: '0.35s' }}
            >
              <Gauge className="h-4 w-4 mr-2" />
              Odometer Overview
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
                       // Save to localStorage for persistence
                       localStorage.setItem('gpsSettings', JSON.stringify(gpsSettings));
                       toast.success('Hardware Tracker token saved locally');
                     }}
                     className="w-full"
                   >
                     Save & Test Settings
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
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
        <div className="animate-scale-in" style={{ animationDelay: '0.15s' }}>
          <div className="professional-card hover:shadow-success transition-all duration-500 group">
            <KPICard
              title="Engines Running"
              value={`${enginesRunning}/${totalVehicles}`}
              icon={<Activity className="h-4 w-4 group-hover:animate-pulse-subtle" />}
              change="0"
              changeType="neutral"
              description="ignition ON"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-info transition-all duration-500 group">
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
        <div className="animate-scale-in" style={{ animationDelay: '0.25s' }}>
          <div className="professional-card hover:shadow-info transition-all duration-500 group">
            <KPICard
              title="Total Fleet Mileage"
              value={`${totalFleetMileage.toLocaleString()} km`}
              icon={<Activity className="h-4 w-4 group-hover:animate-pulse-subtle" />}
              change="0"
              changeType="neutral"
              description={`+${totalDailyMileage.toFixed(0)} km today`}
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
        <div className="animate-scale-in" style={{ animationDelay: '0.35s' }}>
          <div className="professional-card hover:shadow-destructive transition-all duration-500 group">
            <KPICard
              title="Low Battery"
              value={lowBatteryCount.toString()}
              icon={<Battery className="h-4 w-4 group-hover:animate-bounce-notification" />}
              change="0"
              changeType="neutral"
              description="< 12.0V"
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
              Real-time vehicle locations with live GPS tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] w-full">
              {isLoadingApiKey ? (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg border">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              ) : googleMapsApiKey ? (
                <FleetTrackingMap 
                  trackingData={liveTrackingData} 
                  apiKey={googleMapsApiKey}
                  isLoading={loading || fiosLoading}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg border">
                  <div className="text-center space-y-4">
                    <MapPin className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Map Unavailable</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Unable to load Google Maps. Please check your configuration.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
            <DataTable columns={columns} data={liveTrackingData} />
          </CardContent>
        </Card>
      )}

      {/* Odometer & Mileage Card - ALL 16 BUSES */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Odometer & Daily Mileage - All Buses
            </div>
            <div className="text-sm font-normal text-muted-foreground">
              Total: {totalFleetMileage.toLocaleString()} km (+{totalDailyMileage.toFixed(1)} km today)
            </div>
          </CardTitle>
          <CardDescription>
            Real-time odometer readings and today's mileage for all {totalVehicles} buses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
            {liveTrackingData.map(vehicle => (
              <div key={vehicle.id} className="space-y-1 border-b pb-2 last:border-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{vehicle.bus_no}</span>
                    {vehicle.ignition_status && (
                      <Badge variant="default" className="text-xs bg-green-500">
                        Engine ON
                      </Badge>
                    )}
                    {vehicle.battery_voltage && vehicle.battery_voltage < 12.0 && (
                      <Badge variant="destructive" className="text-xs">
                        Low Battery
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {vehicle.odometer_km && vehicle.odometer_km > 0 ? (
                      <span className="text-sm font-medium text-primary">
                        {vehicle.odometer_km.toLocaleString()} km
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No odometer</span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {vehicle.odometer_source === 'fios' ? 'FIOS' : 
                       vehicle.odometer_source === 'gps_calculated' ? 'GPS' : 'Manual'}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>Today: {vehicle.daily_mileage_km ? `+${vehicle.daily_mileage_km.toFixed(1)} km` : '0 km'}</span>
                    {vehicle.battery_voltage && (
                      <span className={vehicle.battery_voltage < 12.0 ? 'text-red-500 font-medium' : ''}>
                        Battery: {vehicle.battery_voltage.toFixed(1)}V
                      </span>
                    )}
                    {vehicle.gsm_signal_strength !== null && vehicle.gsm_signal_strength !== undefined && (
                      <span>Signal: {vehicle.gsm_signal_strength}%</span>
                    )}
                  </div>
                  {vehicle.status === 'active' ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-muted-foreground">Inactive</span>
                  )}
                </div>
              </div>
            ))}
            {trackingData.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tracking data available yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
              <Satellite className="h-5 w-5" />
              GPS Data Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trackingData.slice(0, 5).map(vehicle => (
                <div key={vehicle.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-semibold">{vehicle.bus_no}</span>
                    <div className="flex items-center gap-2">
                      {vehicle.satellite_count !== null && vehicle.satellite_count !== undefined ? (
                        <>
                          <span className={`text-sm font-medium ${vehicle.satellite_count >= 4 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {vehicle.satellite_count} sats
                          </span>
                          {vehicle.satellite_count >= 4 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {vehicle.heading_degrees !== null && vehicle.heading_degrees !== undefined && (
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        <span>{vehicle.heading_degrees}°</span>
                      </div>
                    )}
                    {vehicle.altitude_meters !== null && vehicle.altitude_meters !== undefined && (
                      <div className="flex items-center gap-1">
                        <span>Alt: {Math.round(vehicle.altitude_meters)}m</span>
                      </div>
                    )}
                    {vehicle.odometer_km && vehicle.odometer_km > 0 && (
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span>{vehicle.odometer_km.toLocaleString()} km</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Alert Panel */}
      <ServiceAlertPanel />

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
        busNo={selectedVehicle || ''}
      />

      <ManualOdometerEntryModal
        open={isOdometerEntryOpen}
        onOpenChange={setIsOdometerEntryOpen}
        busId={selectedBusForOdometer?.id || ''}
        busNo={selectedBusForOdometer?.no || ''}
        currentOdometer={selectedBusForOdometer?.odometer}
        onSuccess={() => {
          fetchTrackingData();
          setSelectedBusForOdometer(null);
        }}
      />

      <OdometerAdjustmentModal
        open={isOdometerAdjustmentOpen}
        onOpenChange={setIsOdometerAdjustmentOpen}
        busId={selectedBusForOdometer?.id || ''}
        busNo={selectedBusForOdometer?.no || ''}
        currentOdometer={selectedBusForOdometer?.odometer}
        onSuccess={() => {
          fetchTrackingData();
          setSelectedBusForOdometer(null);
        }}
      />

      <OdometerOverviewModal
        open={isOdometerOverviewOpen}
        onOpenChange={setIsOdometerOverviewOpen}
        data={trackingData.map(bus => ({
          bus_no: bus.bus_no,
          bus_id: bus.bus_id,
          current_mileage: bus.odometer_km || null,
          base_odometer_km: null,
          base_odometer_date: null,
          daily_mileage: bus.daily_mileage_km || null,
          last_update: bus.last_update,
          odometer_source: bus.odometer_source || 'manual'
        }))}
        onSetBase={(busId, busNo) => {
          setSelectedBusForOdometer({ id: busId, no: busNo });
          setIsOdometerEntryOpen(true);
          setIsOdometerOverviewOpen(false);
        }}
        onAdjust={(busId, busNo, currentOdometer) => {
          setSelectedBusForOdometer({ id: busId, no: busNo, odometer: currentOdometer });
          setIsOdometerAdjustmentOpen(true);
          setIsOdometerOverviewOpen(false);
        }}
      />

      {/* Bus API Connection Modal */}
      {selectedBusForApi && (
        <BusApiConnectionModal
          isOpen={isApiConnectionOpen}
          onClose={() => {
            setIsApiConnectionOpen(false);
            setSelectedBusForApi(null);
          }}
          busId={selectedBusForApi.id}
          busNo={selectedBusForApi.no}
          onSaved={fetchTrackingData}
        />
      )}
    </div>
  );
}