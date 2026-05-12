import { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Fuel, ArrowRight, AlertTriangle, Pencil, Check, X } from "lucide-react";
import { TripData } from "@/hooks/useTripsAnalytics";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Maximum reasonable mileage for a single day (km)
const MAX_DAILY_MILEAGE = 2000;

interface FuelAnalyticsSectionProps {
  rawTrips: TripData[];
  onDataCorrected?: () => void; // Callback to refetch analytics after correction
}

interface OdometerAdjustData {
  groupId: string;
  busNo: string;
  routeName: string;
  currentStart: number;
  currentEnd: number;
  totalMileage: number;
  tripIds: string[]; // All trip IDs in this group
  tripDetails: Array<{ id: string; odometer_start: number; odometer_end: number; trip_no: string }>;
}

export default function FuelAnalyticsSection({ rawTrips, onDataCorrected }: FuelAnalyticsSectionProps) {
  
  const availableDates = useMemo(() => {
    // Make sure we generate at least today's date if rawTrips is empty
    const dates = new Set(rawTrips.map(t => t.trip_date).filter(Boolean));
    const sorted = Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    if (sorted.length === 0) {
      const today = new Date();
      sorted.push(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    }
    return sorted;
  }, [rawTrips]);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [adjustDialog, setAdjustDialog] = useState<OdometerAdjustData | null>(null);
  const [adjustValues, setAdjustValues] = useState<Record<string, { start: string; end: string }>>({});
  const [saving, setSaving] = useState(false);



  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Filter and group data — only buses with actual trip data
  const processedData = useMemo(() => {
    let filtered = rawTrips;

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(t => t.trip_date === selectedDate);
    }

    // Group by Bus and Route — only from actual trip records
    const groups = new Map<string, any>();

    filtered.forEach(trip => {
      const busId = trip.bus_id || 'unknown';
      const routeId = trip.route_id || 'unknown';
      const key = `${busId}_${routeId}`;

      if (!groups.has(key)) {
        
        groups.set(key, {
          id: key,
          trip_date: trip.trip_date,
          buses: trip.buses,
          routes: trip.routes,
          no_of_trips: 0,
          odometer_start: null,
          odometer_end: null,
          distance_km: 0,
          fuel_liters: 0,
          standard_fuel_rate: trip.buses?.expected_km_per_liter || trip.standard_fuel_rate || 0,
          km_per_liter: trip.km_per_liter || 0,
          // Track individual trips for quick-adjust
          _tripDetails: [] as Array<{ id: string; odometer_start: number; odometer_end: number; trip_no: string }>
        });
      }

      const group = groups.get(key);
      group.no_of_trips += 1;
      
      // Track trip details for editing
      group._tripDetails.push({
        id: trip.id,
        odometer_start: trip.odometer_start || 0,
        odometer_end: trip.odometer_end || 0,
        trip_no: (trip as any).trip_no || `Trip ${group.no_of_trips}`
      });
      
      // Get min start meter and max end meter
      if (trip.odometer_start !== null && trip.odometer_start !== undefined) {
        if (group.odometer_start === null || trip.odometer_start < group.odometer_start) {
          group.odometer_start = trip.odometer_start;
        }
      }
      if (trip.odometer_end !== null && trip.odometer_end !== undefined) {
        if (group.odometer_end === null || trip.odometer_end > group.odometer_end) {
          group.odometer_end = trip.odometer_end;
        }
      }

      group.distance_km += (trip.distance_km || 0);
      group.fuel_liters += (trip.fuel_liters || 0);
    });

    // Only keep rows that have odometer data (start or end meter present)
    const withOdometer = Array.from(groups.values()).filter(g =>
      (g.odometer_start !== null && g.odometer_start > 0) ||
      (g.odometer_end !== null && g.odometer_end > 0)
    );

    // Sort by Route Name, then by Bus Number
    return withOdometer.sort((a, b) => {
      const routeA = a.routes ? `${a.routes.route_no || ''} ${a.routes.route_name || ''}`.trim() : (a.buses?.route || '-');
      const routeB = b.routes ? `${b.routes.route_no || ''} ${b.routes.route_name || ''}`.trim() : (b.buses?.route || '-');
      
      const routeCompare = routeA.localeCompare(routeB);
      if (routeCompare !== 0) return routeCompare;

      const busA = (a.buses?.bus_no || a.buses?.registration_number || "");
      const busB = (b.buses?.bus_no || b.buses?.registration_number || "");
      return busA.localeCompare(busB);
    });
  }, [rawTrips, selectedDate]);

  // Count anomalies
  const anomalyCount = useMemo(() => {
    return processedData.filter(g => {
      const s = g.odometer_start ?? 0;
      const e = g.odometer_end ?? 0;
      const mileage = (s > 0 && e > s) ? (e - s) : (g.distance_km ?? 0);
      return mileage > MAX_DAILY_MILEAGE;
    }).length;
  }, [processedData]);

  // Open quick-adjust dialog
  const openAdjustDialog = (group: any) => {
    const busNo = group.buses?.bus_no || group.buses?.registration_number || '-';
    const routeName = group.routes ? `${group.routes.route_no || ''} ${group.routes.route_name || ''}`.trim() : (group.buses?.route || '-');
    const startMeter = group.odometer_start ?? 0;
    const endMeter = group.odometer_end ?? 0;
    const totalMileage = (startMeter > 0 && endMeter > startMeter) ? (endMeter - startMeter) : (group.distance_km ?? 0);

    const data: OdometerAdjustData = {
      groupId: group.id,
      busNo,
      routeName,
      currentStart: startMeter,
      currentEnd: endMeter,
      totalMileage,
      tripIds: group._tripDetails.map((t: any) => t.id),
      tripDetails: group._tripDetails,
    };

    // Pre-fill adjust values with current trip values
    const values: Record<string, { start: string; end: string }> = {};
    group._tripDetails.forEach((t: any) => {
      values[t.id] = {
        start: t.odometer_start > 0 ? String(t.odometer_start) : '',
        end: t.odometer_end > 0 ? String(t.odometer_end) : '',
      };
    });
    setAdjustValues(values);
    setAdjustDialog(data);
  };

  // Save adjusted odometer values
  const handleSaveAdjust = async () => {
    if (!adjustDialog) return;
    setSaving(true);

    try {
      let updatedCount = 0;
      for (const trip of adjustDialog.tripDetails) {
        const vals = adjustValues[trip.id];
        if (!vals) continue;

        const newStart = parseFloat(vals.start) || 0;
        const newEnd = parseFloat(vals.end) || 0;
        const distance = newEnd > newStart ? newEnd - newStart : 0;

        const updatePayload: Record<string, any> = {
          odometer_start: newStart,
          odometer_end: newEnd,
          distance_km: distance,
        };
        // Recalculate km_per_liter if fuel data exists
        // We'd need fuel_liters from the trip, but we don't have it directly here
        // The system will recalculate on next data load

        const { error } = await supabase
          .from('daily_trips')
          .update(updatePayload)
          .eq('id', trip.id);

        if (error) throw error;
        updatedCount++;
      }

      toast({
        title: "✅ Odometer Corrected",
        description: `Updated ${updatedCount} trip(s) for ${adjustDialog.busNo}. Analytics will refresh.`,
      });

      setAdjustDialog(null);
      // Trigger refetch of analytics data
      if (onDataCorrected) {
        onDataCorrected();
      }
    } catch (error: any) {
      console.error("Error adjusting odometer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update odometer readings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview calculation in dialog
  const previewMileage = useMemo(() => {
    if (!adjustDialog) return { total: 0, perTrip: [] };
    const perTrip: Array<{ id: string; tripNo: string; distance: number }> = [];
    let total = 0;
    adjustDialog.tripDetails.forEach(trip => {
      const vals = adjustValues[trip.id];
      if (!vals) return;
      const s = parseFloat(vals.start) || 0;
      const e = parseFloat(vals.end) || 0;
      const dist = e > s ? e - s : 0;
      perTrip.push({ id: trip.id, tripNo: trip.trip_no, distance: dist });
      total += dist;
    });
    return { total, perTrip };
  }, [adjustDialog, adjustValues]);

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Fuel className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold">Fuel Consumption & Performance</h3>
            {anomalyCount > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {anomalyCount} Anomal{anomalyCount === 1 ? 'y' : 'ies'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select Date" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map(date => (
                    <SelectItem key={date} value={date}>{date}</SelectItem>
                  ))}
                  {availableDates.length === 0 && (
                    <SelectItem value="no-data" disabled>No Dates Available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border-2 border-slate-300 dark:border-slate-700 shadow-sm">
          <Table className="border-collapse [&_th]:border-r [&_th]:border-b [&_td]:border-r [&_td]:border-b dark:[&_th]:border-slate-600 dark:[&_td]:border-slate-700 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0">
            <TableHeader className="bg-slate-800 text-slate-100 dark:bg-slate-900">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold whitespace-nowrap text-slate-100">Route (Permit)</TableHead>
                <TableHead className="font-semibold whitespace-nowrap text-slate-100">Bus Model</TableHead>
                <TableHead className="font-semibold whitespace-nowrap text-slate-100">Bus Number</TableHead>
                <TableHead className="text-center font-semibold whitespace-nowrap text-slate-100">No of Trips</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap text-slate-100">Start Meter</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap text-slate-100">End Meter</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap text-slate-100">Total Mileage</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap text-slate-100">Fuel Liter</TableHead>
                <TableHead className="text-right font-bold whitespace-nowrap bg-yellow-400 text-yellow-950 border-r-yellow-500">Fuel Consumption</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap bg-blue-200 text-blue-900 border-r-blue-300">Standard Rate</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap text-slate-100">Perform</TableHead>
                <TableHead className="text-center font-semibold whitespace-nowrap text-slate-100 w-[60px]">Fix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p>No fuel records found for the selected date.</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/trips/daily">
                          Go to Daily Trips <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  let currentRouteName = "";
                  let routeColorIndex = -1;
                  const rowColors = [
                    "bg-green-50/60 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/40",
                    "bg-orange-50/60 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-900/40",
                    "bg-blue-50/60 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40",
                    "bg-purple-50/60 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40",
                    "bg-rose-50/60 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40",
                  ];

                  return processedData.map((group, index) => {
                    const busModel = group.buses?.model || '-';
                    const busNumber = group.buses?.bus_no || group.buses?.registration_number || '-';
                    const routeName = group.routes ? `${group.routes.route_no || ''} ${group.routes.route_name || ''}`.trim() : (group.buses?.route || '-');
                    
                    if (routeName !== currentRouteName) {
                      currentRouteName = routeName;
                      routeColorIndex = (routeColorIndex + 1) % rowColors.length;
                    }
                    
                    const isNewRoute = index > 0 && routeName !== (() => {
                      const prev = processedData[index-1];
                      return prev.routes ? `${prev.routes.route_no || ''} ${prev.routes.route_name || ''}`.trim() : (prev.buses?.route || '-');
                    })();

                    const borderClass = isNewRoute ? "border-t-2 border-t-slate-300 dark:border-t-slate-600" : "border-t border-slate-100 dark:border-slate-800/50";
                    const rowClass = rowColors[routeColorIndex];
                    
                    const startMeter = group.odometer_start ?? 0;
                    const endMeter = group.odometer_end ?? 0;
                  // If we have both meters, use the difference, otherwise sum of distances
                  const totalMileage = (startMeter > 0 && endMeter > startMeter) 
                    ? (endMeter - startMeter) 
                    : (group.distance_km ?? 0);
                  
                  const fuelLiters = group.fuel_liters ?? 0;
                  const standardRate = group.standard_fuel_rate ?? 0;
                  
                  // Actual consumption km/L
                  const actualConsumption = fuelLiters > 0 ? (totalMileage / fuelLiters) : (group.km_per_liter || 0);
                  
                  // Performance = Actual km/L - Standard km/L
                  const performance = actualConsumption - standardRate;

                  // Anomaly detection — flag unreasonable mileage
                  const isAnomaly = totalMileage > MAX_DAILY_MILEAGE;
                  
                  // Color coding for performance
                  let perfClass = "";
                  if (fuelLiters > 0 && standardRate > 0) {
                    if (performance > 0) perfClass = "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-bold";
                    else if (performance < 0) perfClass = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-bold";
                    else perfClass = "font-medium";
                  }

                  // Anomaly row styling
                  const anomalyRowClass = isAnomaly 
                    ? "!bg-red-50 hover:!bg-red-100 dark:!bg-red-950/40 dark:hover:!bg-red-900/50 ring-2 ring-red-400 ring-inset" 
                    : "";

                  return (
                    <TableRow key={group.id} className={`transition-colors border-slate-300 dark:border-slate-700 ${isAnomaly ? anomalyRowClass : rowClass} ${borderClass}`}>
                      <TableCell className="max-w-[200px] truncate font-semibold" title={routeName || '-'}>{routeName || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{busModel}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{busNumber}</TableCell>
                      <TableCell className="text-center font-medium bg-black/5 dark:bg-white/5">{group.no_of_trips}</TableCell>
                      
                      <TableCell className="text-right whitespace-nowrap">{startMeter > 0 ? startMeter.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{endMeter > 0 ? endMeter.toLocaleString() : '-'}</TableCell>
                      <TableCell className={`text-right whitespace-nowrap font-bold ${isAnomaly ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {isAnomaly && <AlertTriangle className="w-4 h-4 inline mr-1 text-red-500" />}
                        {totalMileage.toLocaleString()}
                      </TableCell>
                      
                      <TableCell className="text-right whitespace-nowrap">{fuelLiters > 0 ? fuelLiters.toFixed(2) : '-'}</TableCell>
                      
                      <TableCell className="text-right font-bold whitespace-nowrap bg-yellow-300 text-yellow-950 dark:bg-yellow-600/40 dark:text-yellow-100 border-x-yellow-400 dark:border-x-yellow-700/50">
                        {actualConsumption > 0 ? actualConsumption.toFixed(2) : '-'}
                      </TableCell>
                      
                      <TableCell className="text-right font-semibold whitespace-nowrap bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100 border-r-blue-200 dark:border-r-blue-800/50">
                        {standardRate > 0 ? standardRate.toFixed(2) : '-'}
                      </TableCell>
                      
                      <TableCell className={`text-right whitespace-nowrap ${perfClass}`}>
                        {standardRate > 0 && fuelLiters > 0 
                          ? (performance > 0 ? '+' : '') + performance.toFixed(2) 
                          : '-'}
                      </TableCell>

                      {/* Quick Adjust Button */}
                      <TableCell className="text-center">
                        <Button
                          variant={isAnomaly ? "destructive" : "ghost"}
                          size="icon"
                          className={`h-7 w-7 ${isAnomaly ? 'animate-pulse' : ''}`}
                          onClick={() => openAdjustDialog(group)}
                          title="Quick Adjust Odometer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                  });
                })()
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Quick Adjust Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={(open) => !open && setAdjustDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Quick Adjust Odometer — {adjustDialog?.busNo}
            </DialogTitle>
            <DialogDescription>
              {adjustDialog?.routeName} • {adjustDialog?.tripDetails.length} trip(s)
            </DialogDescription>
          </DialogHeader>

          {adjustDialog && (
            <div className="space-y-4">
              {/* Current vs New comparison */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <p className="text-xs text-muted-foreground">Current Mileage</p>
                  <p className="text-lg font-bold text-red-600">{adjustDialog.totalMileage.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">After Correction</p>
                  <p className={`text-lg font-bold ${previewMileage.total <= MAX_DAILY_MILEAGE ? 'text-green-600' : 'text-red-600'}`}>
                    {previewMileage.total.toLocaleString()} km
                  </p>
                </div>
              </div>

              {/* Per-trip odometer inputs */}
              <div className="space-y-3">
                {adjustDialog.tripDetails.map((trip, idx) => (
                  <div key={trip.id} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Trip {idx + 1}: {trip.trip_no}</span>
                      {previewMileage.perTrip[idx] && (
                        <Badge variant={previewMileage.perTrip[idx].distance > MAX_DAILY_MILEAGE ? "destructive" : "secondary"}>
                          {previewMileage.perTrip[idx].distance.toLocaleString()} km
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Start Meter</label>
                        <Input
                          type="number"
                          value={adjustValues[trip.id]?.start || ''}
                          onChange={(e) => setAdjustValues(prev => ({
                            ...prev,
                            [trip.id]: { ...prev[trip.id], start: e.target.value }
                          }))}
                          className="h-9"
                          placeholder="e.g. 15085"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">End Meter</label>
                        <Input
                          type="number"
                          value={adjustValues[trip.id]?.end || ''}
                          onChange={(e) => setAdjustValues(prev => ({
                            ...prev,
                            [trip.id]: { ...prev[trip.id], end: e.target.value }
                          }))}
                          className="h-9"
                          placeholder="e.g. 15899"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {adjustDialog.totalMileage > MAX_DAILY_MILEAGE && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Original mileage of {adjustDialog.totalMileage.toLocaleString()} km exceeds the {MAX_DAILY_MILEAGE.toLocaleString()} km daily maximum. 
                  This is likely a data entry error in the odometer reading.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdjustDialog(null)} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSaveAdjust} disabled={saving}>
              {saving ? (
                <span className="animate-spin mr-2">⏳</span>
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Save & Update Trips
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
