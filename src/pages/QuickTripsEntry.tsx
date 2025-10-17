import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarIcon, ArrowLeft, Menu } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [trips, setTrips] = useState<TripData[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBusList, setShowBusList] = useState(false);

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

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    if (isMobile) {
      setShowBusList(false);
    }
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);
  const completedCount = trips.filter(hasData).length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/trips')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowBusList(true)}
                className="shrink-0"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">Quick Entry</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {trips.length} trips • {completedCount} completed
              </p>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </span>
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
        {/* Desktop Sidebar - Bus List */}
        {!isMobile && (
          <QuickEntryBusList
            trips={trips}
            selectedTripId={selectedTripId}
            onSelectTrip={handleSelectTrip}
            getCompletionStatus={getCompletionStatus}
            loading={loading}
          />
        )}

        {/* Mobile Drawer - Bus List */}
        {isMobile && (
          <Sheet open={showBusList} onOpenChange={setShowBusList}>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Select Bus</SheetTitle>
              </SheetHeader>
              <div className="mt-4 h-[calc(100%-4rem)]">
                <QuickEntryBusList
                  trips={trips}
                  selectedTripId={selectedTripId}
                  onSelectTrip={handleSelectTrip}
                  getCompletionStatus={getCompletionStatus}
                  loading={loading}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}

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
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <p className="text-base md:text-lg text-muted-foreground mb-2">No trips scheduled for this date</p>
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
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <p className="text-muted-foreground mb-3">Select a bus to enter data</p>
                {isMobile && (
                  <Button onClick={() => setShowBusList(true)}>
                    <Menu className="mr-2 h-4 w-4" />
                    Select Bus
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
