import { useState } from "react";
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

      // Fetch driver allocations
      const { data: allocationsData, error: allocError } = await supabase
        .from('driver_allocations')
        .select(`
          id,
          allocation_date,
          trip_id,
          start_time,
          end_time,
          bus_id,
          route_id,
          buses!driver_allocations_bus_id_fkey(bus_no),
          routes!driver_allocations_route_id_fkey(route_no, route_name),
          driver:staff!driver_allocations_driver_id_fkey(name),
          conductor:staff_driver_allocations_conductor_id_fkey(name)
        `)
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

      const formatted = allocationsData?.map((alloc: any) => ({
        id: alloc.id,
        allocation_date: alloc.allocation_date,
        bus_no: alloc.buses?.bus_no || 'N/A',
        route_name: `${alloc.routes?.route_no || ''} - ${alloc.routes?.route_name || 'N/A'}`,
        driver_name: alloc.driver?.name || 'N/A',
        conductor_name: alloc.conductor?.name || 'N/A',
        start_time: alloc.start_time,
        end_time: alloc.end_time,
        bus_id: alloc.bus_id,
        route_id: alloc.route_id,
        trip_id: alloc.trip_id,
      })) || [];

      setAllocations(formatted);
      toast.success(`Found ${formatted.length} allocations`);
    } catch (error: any) {
      console.error('Error fetching allocations:', error);
      toast.error('Failed to fetch allocations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!allocations.length) {
      toast.error('No allocations to import');
      return;
    }

    setIsLoading(true);
    try {
      const tripEntries = allocations.map(alloc => ({
        trip_no: alloc.trip_id,
        trip_date: alloc.allocation_date,
        bus_id: alloc.bus_id,
        route_id: alloc.route_id,
        start_time: alloc.start_time,
        end_time: alloc.end_time,
        income: 0,
        distance_km: 0,
        notes: JSON.stringify({
          driver: alloc.driver_name,
          conductor: alloc.conductor_name,
          imported_from_allocation: true,
          allocation_id: alloc.id
        })
      }));

      if (importMode === 'overwrite' && existingTripCount > 0) {
        // Delete existing trips in the date range first
        const startDate = format(dateRange!.from!, 'yyyy-MM-dd');
        const endDate = format(dateRange!.to!, 'yyyy-MM-dd');
        
        const { error: deleteError } = await supabase
          .from('daily_trips')
          .delete()
          .gte('trip_date', startDate)
          .lte('trip_date', endDate);

        if (deleteError) throw deleteError;
      }

      // Insert new trips
      const { data, error } = await supabase
        .from('daily_trips')
        .insert(tripEntries)
        .select();

      if (error) {
        // If it's a unique constraint error and we're in skip mode, that's expected
        if (error.code === '23505' && importMode === 'skip') {
          const importedCount = allocations.length - existingTripCount;
          toast.success(`Imported ${importedCount} trips, skipped ${existingTripCount} existing`);
        } else {
          throw error;
        }
      } else {
        toast.success(`Successfully imported ${data?.length || allocations.length} trips`);
      }

      onSuccess();
      onClose();
      
      // Reset state
      setDateRange(undefined);
      setAllocations([]);
      setExistingTripCount(0);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
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
