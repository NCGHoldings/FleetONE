import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Upload, CalendarRange, AlertCircle } from "lucide-react";
import { DateRange } from "react-day-picker";

interface ImportFromAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AllocationPreview {
  id: string;
  allocation_date: string;
  bus_no: string;
  route_name: string;
  driver_name: string;
  conductor_name: string;
  start_time: string;
  end_time: string;
  bus_id: string;
  route_id: string;
  trip_id: string;
}

export function ImportFromAllocationModal({ isOpen, onClose, onSuccess }: ImportFromAllocationModalProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [allocations, setAllocations] = useState<AllocationPreview[]>([]);
  const [existingTripCount, setExistingTripCount] = useState(0);
  const [importMode, setImportMode] = useState<"skip" | "overwrite">("skip");
  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Safe JSON parsing helper
  const safeParseJSON = (str?: string) => {
    try {
      return str ? JSON.parse(str) : {};
    } catch {
      return {};
    }
  };

  // Fetch buses and routes on mount
  useEffect(() => {
    if (isOpen) {
      fetchBusesAndRoutes();
    }
  }, [isOpen]);

  const fetchBusesAndRoutes = async () => {
    try {
      const [busesRes, routesRes] = await Promise.all([
        supabase.from('buses').select('id, bus_no'),
        supabase.from('routes').select('id, route_no, route_name')
      ]);
      setBuses(busesRes.data || []);
      setRoutes(routesRes.data || []);
    } catch (error) {
      console.error('Error fetching buses and routes:', error);
    }
  };

  const handleDateRangeChange = async (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (!range?.from || !range?.to) {
      setAllocations([]);
      setExistingTripCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const startDate = format(range.from, 'yyyy-MM-dd');
      const endDate = format(range.to, 'yyyy-MM-dd');

      // Fetch driver allocations with simple select
      const { data: allocationsData, error: allocError } = await supabase
        .from('driver_allocations')
        .select('*')
        .gte('allocation_date', startDate)
        .lte('allocation_date', endDate)
        .eq('status', 'confirmed')
        .order('allocation_date', { ascending: true });

      if (allocError) throw allocError;

      // Check for existing trips
      const { data: existingTrips, error: tripsError } = await supabase
        .from('daily_trips')
        .select('id, trip_date, bus_id')
        .gte('trip_date', startDate)
        .lte('trip_date', endDate);

      if (tripsError) throw tripsError;

      const existingMap = new Set(
        existingTrips?.map(t => `${t.trip_date}_${t.bus_id}`) || []
      );

      setExistingTripCount(existingTrips?.length || 0);

      const formatted = allocationsData?.map((alloc: any) => {
        // Parse notes to get Excel data and fallback info
        const notes = safeParseJSON(alloc.notes);
        
        // Match bus and route from separate queries
        const bus = buses.find(b => b.id === alloc.bus_id);
        const route = routes.find(r => r.id === alloc.route_id);
        
        // Smart fallback: use Excel data from notes if IDs are missing
        const busNo = bus?.bus_no || notes.excel_bus_no || notes.bus_no || 'N/A';
        const routeDisplay = route 
          ? `${route.route_no} - ${route.route_name}` 
          : notes.excel_route_name || notes.route || 'N/A';
        
        return {
          id: alloc.id,
          allocation_date: alloc.allocation_date,
          bus_no: busNo,
          route_name: routeDisplay,
          driver_name: notes.excel_driver || notes.driver || 'N/A',
          conductor_name: notes.excel_conductor || notes.conductor || 'N/A',
          start_time: alloc.start_time,
          end_time: alloc.end_time,
          bus_id: alloc.bus_id,
          route_id: alloc.route_id,
          trip_id: alloc.trip_id,
          has_warnings: !alloc.bus_id || !alloc.route_id,
          notes: notes
        };
      }) || [];

      setAllocations(formatted);
      
      const withWarnings = formatted.filter((a: any) => a.has_warnings).length;
      if (withWarnings > 0) {
        toast.warning(`Found ${formatted.length} allocations (${withWarnings} need bus/route assignment)`, {
          duration: 5000
        });
      } else {
        toast.success(`Found ${formatted.length} allocations`);
      }
    } catch (error: any) {
      console.error('Error fetching allocations:', error);
      toast.error('Failed to fetch allocations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (allocations.length === 0 || !dateRange?.from || !dateRange?.to) {
      toast.error("Please select a date range and ensure allocations exist");
      return;
    }

    setIsLoading(true);
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      // Smart matching for allocations without bus_id
      const allocationsWithMatching = await Promise.all(
        allocations.map(async (alloc: any) => {
          if (!alloc.bus_id && alloc.notes?.excel_bus_no) {
            // Try to find bus by number (with normalization)
            const busNo = alloc.notes.excel_bus_no.replace(/\s+/g, '').toUpperCase();
            const { data: matchedBus } = await supabase
              .from('buses')
              .select('id, bus_no')
              .ilike('bus_no', busNo)
              .maybeSingle();
            
            if (matchedBus) {
              return { ...alloc, bus_id: matchedBus.id, bus_no: matchedBus.bus_no };
            }
          }
          if (!alloc.route_id && alloc.notes?.excel_route_no) {
            // Try to find route by number or name
            const { data: matchedRoute } = await supabase
              .from('routes')
              .select('id, route_no, route_name')
              .or(`route_no.eq.${alloc.notes.excel_route_no},route_name.ilike.%${alloc.notes.excel_route_name}%`)
              .limit(1)
              .maybeSingle();
            
            if (matchedRoute) {
              return { ...alloc, route_id: matchedRoute.id };
            }
          }
          return alloc;
        })
      );

      let validAllocations = allocationsWithMatching.filter((a: any) => a.bus_id);
      let invalidAllocations = allocationsWithMatching.filter((a: any) => !a.bus_id);

      // Auto-create missing buses
      if (invalidAllocations.length > 0) {
        console.log(`🔧 Auto-creating ${invalidAllocations.length} missing buses...`);
        
        // Collect unique missing bus numbers
        const missingBusNumbers = Array.from(
          new Set(
            invalidAllocations
              .map((a: any) => a.notes?.excel_bus_no)
              .filter(Boolean)
          )
        );

        const busMap = new Map<string, { id: string; bus_no: string }>();
        const createdBuses: string[] = [];

        // Create missing buses
        for (const busNo of missingBusNumbers) {
          const normalized = busNo.replace(/\s+/g, '').toUpperCase();
          
          // Double check if bus exists
          const { data: existingBus } = await supabase
            .from('buses')
            .select('id, bus_no')
            .ilike('bus_no', normalized)
            .maybeSingle();

          if (existingBus) {
            busMap.set(normalized, existingBus);
          } else {
            // Create new bus
            const { data: newBus, error: busError } = await supabase
              .from('buses')
              .insert({
                bus_no: busNo,
                type: 'Regular',
                model: 'Imported Bus',
                year: new Date().getFullYear(),
                capacity: 40,
                status: 'active',
              })
              .select('id, bus_no')
              .maybeSingle();

            if (newBus && !busError) {
              busMap.set(normalized, newBus);
              createdBuses.push(busNo);
              console.log(`✅ Created bus: ${busNo}`);
            } else {
              console.error(`❌ Failed to create bus ${busNo}:`, busError);
            }
          }
        }

        // Update invalidAllocations with new bus_ids
        const fixedAllocations = invalidAllocations.map((a: any) => {
          const excelBusNo = a.notes?.excel_bus_no;
          const key = excelBusNo?.replace(/\s+/g, '').toUpperCase();
          const busInfo = key ? busMap.get(key) : null;

          if (busInfo) {
            return {
              ...a,
              bus_id: busInfo.id,
              bus_no: busInfo.bus_no,
              has_warnings: true,
            };
          }
          return a;
        });

        // Rebuild allocations list
        validAllocations = [...validAllocations, ...fixedAllocations.filter((a: any) => a.bus_id)];
        invalidAllocations = fixedAllocations.filter((a: any) => !a.bus_id);

        if (createdBuses.length > 0) {
          toast.success(
            `Auto-created ${createdBuses.length} missing bus(es): ${createdBuses.join(', ')}`,
            { duration: 6000 }
          );
        }
      }

      // Auto-create missing routes (optional but recommended)
      const allocationsWithoutRoute = validAllocations.filter((a: any) => !a.route_id && a.notes?.excel_route_no);
      if (allocationsWithoutRoute.length > 0) {
        console.log(`🔧 Auto-creating ${allocationsWithoutRoute.length} missing routes...`);
        
        const missingRoutes = Array.from(
          new Set(
            allocationsWithoutRoute.map((a: any) => ({
              route_no: a.notes?.excel_route_no,
              route_name: a.notes?.excel_route_name,
            }))
          )
        );

        const routeMap = new Map<string, string>();
        const createdRoutes: string[] = [];

        for (const routeInfo of missingRoutes) {
          if (!routeInfo.route_no) continue;

          // Check if route exists
          const { data: existingRoute } = await supabase
            .from('routes')
            .select('id, route_no')
            .eq('route_no', routeInfo.route_no)
            .maybeSingle();

          if (existingRoute) {
            routeMap.set(routeInfo.route_no, existingRoute.id);
          } else {
            // Create new route
            const routeParts = (routeInfo.route_name || '').split(' - ');
            const { data: newRoute, error: routeError } = await supabase
              .from('routes')
              .insert({
                route_no: routeInfo.route_no,
                route_name: routeInfo.route_name || `Route ${routeInfo.route_no}`,
                start_location: routeParts[0] || 'Unknown',
                end_location: routeParts[1] || 'Unknown',
                distance_km: 0,
                estimated_duration_minutes: 0,
              })
              .select('id, route_no')
              .maybeSingle();

            if (newRoute && !routeError) {
              routeMap.set(routeInfo.route_no, newRoute.id);
              createdRoutes.push(routeInfo.route_no);
              console.log(`✅ Created route: ${routeInfo.route_no}`);
            } else {
              console.error(`❌ Failed to create route ${routeInfo.route_no}:`, routeError);
            }
          }
        }

        // Update allocations with route_ids
        validAllocations = validAllocations.map((a: any) => {
          if (!a.route_id && a.notes?.excel_route_no) {
            const routeId = routeMap.get(a.notes.excel_route_no);
            if (routeId) {
              return { ...a, route_id: routeId };
            }
          }
          return a;
        });

        if (createdRoutes.length > 0) {
          toast.success(
            `Auto-created ${createdRoutes.length} missing route(s): ${createdRoutes.join(', ')}`,
            { duration: 6000 }
          );
        }
      }

      // Final validation
      if (invalidAllocations.length > 0) {
        const busNumbers = invalidAllocations
          .map((a: any) => a.notes?.excel_bus_no || 'Unknown')
          .join(', ');
        toast.warning(
          `${invalidAllocations.length} allocation(s) still missing bus info: ${busNumbers}`,
          { duration: 6000 }
        );
      }

      if (validAllocations.length === 0) {
        toast.error('No valid allocations to import after auto-creation attempts.');
        setIsLoading(false);
        return;
      }

      console.log(`✅ Final: ${validAllocations.length} valid allocations ready to import`);

      // If overwrite mode, delete existing trips first
      if (importMode === 'overwrite' && existingTripCount > 0) {
        const tripNos = validAllocations.map(a => a.trip_id);
        
        const { error: deleteError } = await supabase
          .from('daily_trips')
          .delete()
          .gte('trip_date', startDate)
          .lte('trip_date', endDate)
          .in('trip_no', tripNos);

        if (deleteError) {
          console.error('Error deleting existing trips:', deleteError);
          toast.error('Failed to delete existing trips');
          setIsLoading(false);
          return;
        }
      }

      // Check which trips already exist by trip_no AND trip_date
      const { data: existingTrips } = await supabase
        .from('daily_trips')
        .select('trip_no, trip_date')
        .gte('trip_date', startDate)
        .lte('trip_date', endDate);

      const existingTripKeys = new Set(
        existingTrips?.map(t => `${t.trip_date}_${t.trip_no}`) || []
      );

      // Filter out existing trips if in skip mode
      const tripsToImport = importMode === 'skip'
        ? validAllocations.filter(a => !existingTripKeys.has(`${a.allocation_date}_${a.trip_id}`))
        : validAllocations;

      if (tripsToImport.length === 0) {
        toast.info('All trips already exist. Change to "Overwrite" mode to replace them.');
        setIsLoading(false);
        return;
      }

      // Prepare trip entries with correct schema and notes from allocation
      const tripEntries = tripsToImport.map((alloc: any) => ({
        trip_date: alloc.allocation_date,
        trip_no: alloc.trip_id,
        bus_id: alloc.bus_id,
        route_id: alloc.route_id || null,
        driver_id: null,
        conductor_id: null,
        start_time: alloc.start_time,
        end_time: alloc.end_time,
        odometer_start: null,
        odometer_end: null,
        distance_km: 0,
        income: 0,
        fuel_liters: null,
        status: 'scheduled' as const,
        data_source: 'import' as const,
        notes: JSON.stringify({
          driver: alloc.driver_name,
          conductor: alloc.conductor_name,
          imported_from: 'driver_allocation',
          import_date: new Date().toISOString(),
          original_bus_no: alloc.notes?.excel_bus_no || alloc.bus_no,
          original_route: alloc.notes?.excel_route_name || alloc.route_name,
          has_warnings: alloc.has_warnings || false
        })
      }));

      const { data, error: insertError } = await supabase
        .from('daily_trips')
        .insert(tripEntries)
        .select();

      if (insertError) {
        console.error('Error inserting trips:', insertError);
        toast.error(`Import failed: ${insertError.message}`);
        setIsLoading(false);
        return;
      }

      const importedCount = data?.length || 0;
      const skippedCount = validAllocations.length - importedCount;
      
      console.log(`✅ Import complete: ${importedCount} trips imported`);
      
      toast.success(
        `Successfully imported ${importedCount} trip${importedCount !== 1 ? 's' : ''}!` +
        (skippedCount > 0 ? ` (${skippedCount} skipped - already exist)` : '') +
        (invalidAllocations.length > 0 ? ` Warning: ${invalidAllocations.length} still need manual bus assignment` : ''),
        { duration: 6000 }
      );
      
      onSuccess?.();
      onClose();
      
      // Reset state
      setDateRange(undefined);
      setAllocations([]);
      setExistingTripCount(0);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to import trips');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import from Driver Allocations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4" />
              Select Date Range
            </Label>
            <DateRangePicker
              onDateRangeChange={handleDateRangeChange}
              className="w-full"
            />
          </div>

          {/* Import Options */}
          {allocations.length > 0 && (
            <div className="space-y-2">
              <Label>Import Options</Label>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as "skip" | "overwrite")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="font-normal cursor-pointer">
                    Skip existing trips ({existingTripCount} found)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="overwrite" id="overwrite" />
                  <Label htmlFor="overwrite" className="font-normal cursor-pointer">
                    Overwrite existing trips (delete and replace)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Statistics */}
          {allocations.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Statistics</h4>
              <ul className="text-sm space-y-1">
                <li>• {allocations.length} allocations found</li>
                <li>• {new Set(allocations.map(a => a.bus_id)).size} buses involved</li>
                <li>• {existingTripCount} trips already exist</li>
                <li>• Date range: {dateRange?.from && format(dateRange.from, 'PPP')} to {dateRange?.to && format(dateRange.to, 'PPP')}</li>
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {allocations.length > 0 && (
            <div className="border rounded-lg">
              <div className="bg-muted p-3 border-b">
                <h4 className="font-semibold">Preview ({allocations.length} allocations)</h4>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Bus</th>
                      <th className="text-left p-2 font-medium">Route</th>
                      <th className="text-left p-2 font-medium">Driver</th>
                      <th className="text-left p-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((alloc) => (
                      <tr key={alloc.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">{format(new Date(alloc.allocation_date), 'dd/MM/yyyy')}</td>
                        <td className="p-2">{alloc.bus_no}</td>
                        <td className="p-2">{alloc.route_name}</td>
                        <td className="p-2">{alloc.driver_name}</td>
                        <td className="p-2">{alloc.start_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {dateRange?.from && dateRange?.to && !isLoading && allocations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No confirmed driver allocations found for this date range</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isLoading || allocations.length === 0}
          >
            {isLoading ? 'Importing...' : `Import ${allocations.length} Trips`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
