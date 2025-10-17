import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuickEntryBusList } from "@/components/trips/QuickEntryBusList";
import { QuickEntryForm } from "@/components/trips/QuickEntryForm";

interface TripData {
  id: string;
  trip_no: string;
  bus_id: string;
  bus_no: string;
  route?: string;
  driver_name?: string;
  conductor_name?: string;
  income_details?: any;
  other_expenses_details?: any;
  income?: number;
  other_expenses?: number;
}

export default function QuickTripsEntry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [trips, setTrips] = useState<TripData[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTripsForDate(selectedDate);
  }, [selectedDate]);

  const loadTripsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_trips')
        .select(`
          id,
          trip_no,
          bus_id,
          income,
          other_expenses,
          income_details,
          other_expenses_details,
          buses:bus_id(bus_no),
          routes:route_id(route_name)
        `)
        .eq('trip_date', dateStr)
        .order('bus_id');

      if (error) throw error;

      const transformedTrips = (data || []).map((trip: any) => ({
        id: trip.id,
        trip_no: trip.trip_no || `T${trip.id.slice(0, 4)}`,
        bus_id: trip.bus_id,
        bus_no: trip.buses?.bus_no || 'N/A',
        route: trip.routes?.route_name,
        income_details: trip.income_details,
        other_expenses_details: trip.other_expenses_details,
        income: trip.income || 0,
        other_expenses: trip.other_expenses || 0,
      }));

      setTrips(transformedTrips);
      
      if (transformedTrips.length > 0 && !selectedTripId) {
        const firstIncomplete = transformedTrips.find(t => !hasData(t));
        setSelectedTripId(firstIncomplete?.id || transformedTrips[0].id);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: "Error",
        description: "Failed to load trips",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasData = (trip: TripData) => {
    return trip.income > 0 || trip.other_expenses > 0;
  };

  const getCompletionStatus = (trip: TripData) => {
    if (!trip.income_details && !trip.other_expenses_details) return 'empty';
    if (trip.income > 0 && trip.other_expenses > 0) return 'complete';
    return 'partial';
  };

  const handleSaveSuccess = () => {
    loadTripsForDate(selectedDate);
  };

  const handleSaveAndNext = () => {
    const currentIndex = trips.findIndex(t => t.id === selectedTripId);
    const nextIncomplete = trips.slice(currentIndex + 1).find(t => !hasData(t));
    
    if (nextIncomplete) {
      setSelectedTripId(nextIncomplete.id);
    } else {
      const firstIncomplete = trips.find(t => !hasData(t));
      if (firstIncomplete) {
        setSelectedTripId(firstIncomplete.id);
      }
    }
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);
  const completedCount = trips.filter(hasData).length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/trips')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Quick Entry - Daily Trips</h1>
              <p className="text-sm text-muted-foreground">
                {trips.length} trips scheduled • {completedCount} completed
              </p>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Bus List */}
        <QuickEntryBusList
          trips={trips}
          selectedTripId={selectedTripId}
          onSelectTrip={setSelectedTripId}
          getCompletionStatus={getCompletionStatus}
          loading={loading}
        />

        {/* Main Area - Data Entry Form */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading trips...</p>
              </div>
            </div>
          ) : trips.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg text-muted-foreground mb-2">No trips scheduled for this date</p>
                <Button onClick={() => navigate('/trips')}>
                  Go to Daily Trips
                </Button>
              </div>
            </div>
          ) : selectedTrip ? (
            <QuickEntryForm
              tripId={selectedTrip.id}
              busNo={selectedTrip.bus_no}
              route={selectedTrip.route}
              onSuccess={handleSaveSuccess}
              onSaveAndNext={handleSaveAndNext}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a bus to enter data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
