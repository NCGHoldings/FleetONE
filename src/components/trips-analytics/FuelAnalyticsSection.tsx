import { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, Fuel, ArrowRight } from "lucide-react";
import { TripData } from "@/hooks/useTripsAnalytics";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface FuelAnalyticsSectionProps {
  rawTrips: TripData[];
}

export default function FuelAnalyticsSection({ rawTrips }: FuelAnalyticsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const availableDates = useMemo(() => {
    const dates = new Set(rawTrips.map(t => t.trip_date).filter(Boolean));
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [rawTrips]);

  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Filter and group data
  const processedData = useMemo(() => {
    let filtered = rawTrips;

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(t => t.trip_date === selectedDate);
    }

    // Filter by search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(trip => 
        (trip.buses?.bus_no || "").toLowerCase().includes(lowerSearch) ||
        (trip.buses?.registration_number || "").toLowerCase().includes(lowerSearch) ||
        (trip.routes?.route_name || "").toLowerCase().includes(lowerSearch) ||
        (trip.routes?.route_no || "").toLowerCase().includes(lowerSearch)
      );
    }

    // Group by Bus and Route
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
          odo_start: null,
          odo_end: null,
          distance_km: 0,
          fuel_liters: 0,
          standard_fuel_rate: trip.standard_fuel_rate || 0,
          km_per_liter: trip.km_per_liter || 0
        });
      }

      const group = groups.get(key);
      group.no_of_trips += 1;
      
      // Get min start meter and max end meter
      if (trip.odo_start !== null && trip.odo_start !== undefined) {
        if (group.odo_start === null || trip.odo_start < group.odo_start) {
          group.odo_start = trip.odo_start;
        }
      }
      if (trip.odo_end !== null && trip.odo_end !== undefined) {
        if (group.odo_end === null || trip.odo_end > group.odo_end) {
          group.odo_end = trip.odo_end;
        }
      }

      group.distance_km += (trip.distance_km || 0);
      group.fuel_liters += (trip.fuel_liters || 0);
    });

    // Sort by Bus Number
    return Array.from(groups.values()).sort((a, b) => {
      const busA = (a.buses?.bus_no || a.buses?.registration_number || "");
      const busB = (b.buses?.bus_no || b.buses?.registration_number || "");
      return busA.localeCompare(busB);
    });
  }, [rawTrips, searchTerm, selectedDate]);

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Fuel className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold">Fuel Consumption & Performance</h3>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search bus or route..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
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

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-blue-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="font-semibold whitespace-nowrap">Route (Permit)</TableHead>
                <TableHead className="font-semibold whitespace-nowrap">Bus Number</TableHead>
                <TableHead className="text-center font-semibold whitespace-nowrap">No of Trips</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Start Meter</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">End Meter</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Total Mileage</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Fuel Liter</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Fuel Consumption</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap text-yellow-600 dark:text-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10">Standard Rate</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Perform</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                processedData.map((group) => {
                  const busNumber = group.buses?.bus_no || group.buses?.registration_number || '-';
                  const routeName = group.routes ? `${group.routes.route_no} - ${group.routes.route_name}` : '-';
                  
                  const startMeter = group.odo_start ?? 0;
                  const endMeter = group.odo_end ?? 0;
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
                  let perfColor = "";
                  if (fuelLiters > 0 && standardRate > 0) {
                    if (performance >= 0) perfColor = "text-green-600 dark:text-green-400 font-medium";
                    else if (performance >= -0.5) perfColor = "text-amber-600 dark:text-amber-400 font-medium";
                    else perfColor = "text-red-600 dark:text-red-400 font-bold";
                  }

                  return (
                    <TableRow key={group.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="max-w-[200px] truncate" title={routeName}>{routeName}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{busNumber}</TableCell>
                      <TableCell className="text-center font-medium bg-slate-50 dark:bg-slate-800/50">{group.no_of_trips}</TableCell>
                      
                      <TableCell className="text-right whitespace-nowrap">{startMeter > 0 ? startMeter.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{endMeter > 0 ? endMeter.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap font-semibold">{totalMileage.toFixed(1)}</TableCell>
                      
                      <TableCell className="text-right whitespace-nowrap">{fuelLiters > 0 ? fuelLiters.toFixed(2) : '-'}</TableCell>
                      
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {actualConsumption > 0 ? actualConsumption.toFixed(2) : '-'}
                      </TableCell>
                      
                      <TableCell className="text-right font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10 whitespace-nowrap">
                        {standardRate > 0 ? standardRate.toFixed(2) : '-'}
                      </TableCell>
                      
                      <TableCell className={`text-right whitespace-nowrap ${perfColor}`}>
                        {standardRate > 0 && fuelLiters > 0 
                          ? (performance > 0 ? '+' : '') + performance.toFixed(2) 
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
