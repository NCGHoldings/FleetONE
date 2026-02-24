import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trip {
  id: string;
  bus_no: string;
  route?: string;
}

interface QuickEntryBusListProps {
  trips: Trip[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  getCompletionStatus: (trip: any) => 'empty' | 'partial' | 'complete';
  loading: boolean;
}

export function QuickEntryBusList({
  trips,
  selectedTripId,
  onSelectTrip,
  getCompletionStatus,
  loading,
}: QuickEntryBusListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTrips = trips.filter(trip =>
    trip.bus_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="w-80 border-r bg-card p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-card flex flex-col">
      {/* Search Box */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Progress Counter */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="text-sm">
          <span className="font-semibold">
            {trips.filter(t => getCompletionStatus(t) === 'complete').length}
          </span>
          <span className="text-muted-foreground"> / {trips.length} completed</span>
        </div>
      </div>

      {/* Bus List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredTrips.map((trip) => {
            const status = getCompletionStatus(trip);
            const isSelected = trip.id === selectedTripId;

            return (
              <button
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-accent flex items-center gap-3",
                  isSelected && "bg-accent ring-2 ring-primary"
                )}
              >
                {getStatusIcon(status)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{trip.bus_no}</div>
                  {trip.route && (
                    <div className="text-xs text-muted-foreground truncate">
                      {trip.route}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {filteredTrips.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No buses found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
