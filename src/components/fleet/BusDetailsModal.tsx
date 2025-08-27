import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Calendar, Gauge, MapPin, Wrench, DollarSign } from "lucide-react";

interface BusDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: any;
}

export function BusDetailsModal({ open, onOpenChange, bus }: BusDetailsModalProps) {
  if (!bus) return null;

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "success" as const, label: "Active" },
      maintenance: { variant: "warning" as const, label: "Maintenance" },
      idle: { variant: "secondary" as const, label: "Idle" },
      retired: { variant: "destructive" as const, label: "Retired" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.active;
    return <Badge className={`status-${config.variant.replace('secondary', 'neutral').replace('destructive', 'error')}`}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5" />
            Bus Details - {bus.bus_no}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bus className="w-4 h-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bus Number</p>
                  <p className="font-semibold">{bus.bus_no}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(bus.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-semibold">{bus.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-semibold">{bus.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-semibold">{bus.year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-semibold">{bus.capacity} seats</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route & Operation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Operation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Route</p>
                <p className="font-semibold">{bus.route || "Not Assigned"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Running Days</p>
                <p className="font-semibold">{bus.running_days || 0} days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Daily Revenue</p>
                <p className="font-semibold text-success">₨ {(bus.avg_daily_revenue || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="font-semibold text-success">₨ {(bus.total_revenue || 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Mileage & Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Mileage & Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Mileage</p>
                  <p className="font-semibold">{(bus.current_mileage || 0).toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected KM/L</p>
                  <p className="font-semibold">{bus.expected_km_per_liter || 8} km/L</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Interval</p>
                  <p className="font-semibold">{(bus.service_interval_km || 10000).toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Service KM</p>
                  <p className="font-semibold">{(bus.next_service_mileage || 0).toLocaleString()} km</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Last Service</p>
                  <p className="font-semibold">
                    {bus.last_service_date ? new Date(bus.last_service_date).toLocaleDateString() : "Not Available"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Service</p>
                  <p className="font-semibold">
                    {bus.next_service_date ? new Date(bus.next_service_date).toLocaleDateString() : "Not Scheduled"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Service Mileage</p>
                  <p className="font-semibold">{(bus.last_service_mileage || 0).toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Insurance Expiry</p>
                  <p className="font-semibold">
                    {bus.insurance_expiry ? new Date(bus.insurance_expiry).toLocaleDateString() : "Not Available"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Owner Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Owner Name</p>
                  <p className="font-semibold">{bus.owner_name || "Not Available"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owner NIC</p>
                  <p className="font-semibold">{bus.owner_nic || "Not Available"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration Number</p>
                  <p className="font-semibold">{bus.registration_number || "Not Available"}</p>
                </div>
              </div>
              {bus.owner_address && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Owner Address</p>
                  <p className="font-semibold">{bus.owner_address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}