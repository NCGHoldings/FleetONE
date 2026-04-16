import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Gauge, Calendar, MapPin, Settings, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface OdometerData {
  bus_no: string;
  bus_id: string;
  current_mileage: number | null;
  base_odometer_km: number | null;
  base_odometer_date: string | null;
  daily_mileage: number | null;
  last_update: string | null;
  odometer_source: string;
}

interface OdometerOverviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OdometerData[];
  onSetBase: (busId: string, busNo: string) => void;
  onAdjust: (busId: string, busNo: string, currentOdometer: number) => void;
}

export function OdometerOverviewModal({
  open,
  onOpenChange,
  data,
  onSetBase,
  onAdjust,
}: OdometerOverviewModalProps) {
  const getSourceBadge = (source: string) => {
    const badges = {
      fios: { label: "FIOS", variant: "default" as const, color: "bg-blue-500" },
      gps_calculated: { label: "GPS", variant: "secondary" as const, color: "bg-purple-500" },
      manual: { label: "Manual", variant: "outline" as const, color: "bg-gray-500" },
    };
    return badges[source as keyof typeof badges] || badges.manual;
  };

  const sortedData = [...data].sort((a, b) => a.bus_no.localeCompare(b.bus_no));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Odometer & Daily Mileage Overview
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-4 pr-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg bg-card">
                <div className="text-sm text-muted-foreground mb-1">Total Buses</div>
                <div className="text-2xl font-bold">{data.length}</div>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <div className="text-sm text-muted-foreground mb-1">FIOS Tracked</div>
                <div className="text-2xl font-bold text-blue-500">
                  {data.filter(d => d.odometer_source === 'fios').length}
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <div className="text-sm text-muted-foreground mb-1">GPS Calculated</div>
                <div className="text-2xl font-bold text-purple-500">
                  {data.filter(d => d.odometer_source === 'gps_calculated').length}
                </div>
              </div>
            </div>

            {/* Bus Details Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold">Bus No</th>
                    <th className="text-left p-3 font-semibold">Current Odometer</th>
                    <th className="text-left p-3 font-semibold">Base Odometer</th>
                    <th className="text-left p-3 font-semibold">Today's Mileage</th>
                    <th className="text-left p-3 font-semibold">Source</th>
                    <th className="text-left p-3 font-semibold">Last Update</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((bus, index) => {
                    const badge = getSourceBadge(bus.odometer_source);
                    return (
                      <tr 
                        key={bus.bus_id} 
                        className={`border-t hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                        }`}
                      >
                        <td className="p-3 font-medium">{bus.bus_no}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {bus.current_mileage 
                                ? `${bus.current_mileage.toFixed(1)} km`
                                : <span className="text-muted-foreground">Not set</span>
                              }
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {bus.base_odometer_km ? (
                            <div className="space-y-1">
                              <div className="font-medium">{bus.base_odometer_km.toFixed(1)} km</div>
                              {bus.base_odometer_date && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(bus.base_odometer_date), 'MMM dd, yyyy')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className={`h-4 w-4 ${
                              (bus.daily_mileage || 0) > 0 ? 'text-green-500' : 'text-muted-foreground'
                            }`} />
                            <span className={
                              (bus.daily_mileage || 0) > 0 ? 'font-semibold' : 'text-muted-foreground'
                            }>
                              {bus.daily_mileage ? `${bus.daily_mileage.toFixed(1)} km` : '0.0 km'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={badge.variant} className="font-medium">
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {bus.last_update ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(bus.last_update), 'MMM dd, HH:mm')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No data</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {!bus.base_odometer_km && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSetBase(bus.bus_id, bus.bus_no)}
                              >
                                Set Base
                              </Button>
                            )}
                            {bus.current_mileage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onAdjust(bus.bus_id, bus.bus_no, bus.current_mileage!)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
