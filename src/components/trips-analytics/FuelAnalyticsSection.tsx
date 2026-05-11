import { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Fuel, ArrowRight } from "lucide-react";
import { TripData } from "@/hooks/useTripsAnalytics";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface FuelAnalyticsSectionProps {
  rawTrips: TripData[];
}

export default function FuelAnalyticsSection({ rawTrips }: FuelAnalyticsSectionProps) {
  
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
          km_per_liter: trip.km_per_liter || 0
        });
      }

      const group = groups.get(key);
      group.no_of_trips += 1;
      
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

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Fuel className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold">Fuel Consumption & Performance</h3>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                  
                  // Color coding for performance
                  let perfClass = "";
                  if (fuelLiters > 0 && standardRate > 0) {
                    if (performance > 0) perfClass = "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-bold";
                    else if (performance < 0) perfClass = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-bold";
                    else perfClass = "font-medium";
                  }

                  return (
                    <TableRow key={group.id} className={`transition-colors border-slate-300 dark:border-slate-700 ${rowClass} ${borderClass}`}>
                      <TableCell className="max-w-[200px] truncate font-semibold" title={routeName || '-'}>{routeName || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{busModel}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{busNumber}</TableCell>
                      <TableCell className="text-center font-medium bg-black/5 dark:bg-white/5">{group.no_of_trips}</TableCell>
                      
                      <TableCell className="text-right whitespace-nowrap">{startMeter > 0 ? startMeter.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{endMeter > 0 ? endMeter.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap font-bold">{totalMileage.toFixed(0)}</TableCell>
                      
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
                    </TableRow>
                  );
                  });
                })()
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
