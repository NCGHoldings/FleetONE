import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, LayoutGrid, LayoutList, Plus, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useDailyBusGroupedTrips } from "@/hooks/useDailyBusGroupedTrips";
import { BusDailySummaryTable } from "@/components/trips/BusDailySummaryTable";
import { BusDailyCard } from "@/components/trips/BusDailyCard";
import { FleetDailySummary } from "@/components/trips/FleetDailySummary";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportFromAllocationModal } from "@/components/trips/ImportFromAllocationModal";

export default function DailyTrips() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"table" | "cards">(isMobile ? "cards" : "table");
  const [showImportModal, setShowImportModal] = useState(false);
  
  const { busSummaries, fleetSummary, loading, refetch } = useDailyBusGroupedTrips(selectedDate);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Daily Trips</h1>
              <p className="text-sm text-muted-foreground">
                Manage and track your daily bus operations
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full md:w-[240px] justify-start text-left font-normal",
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

              <Button 
                variant="outline"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import from Allocations
              </Button>

              <Button onClick={() => navigate('/trips/quick-entry')}>
                <Plus className="mr-2 h-4 w-4" />
                Quick Entry
              </Button>
            </div>
          </div>

          {/* View Mode Toggle */}
          {!isMobile && busSummaries.length > 0 && (
            <div className="flex items-center justify-between">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "cards")}>
                <TabsList>
                  <TabsTrigger value="table" className="gap-2">
                    <LayoutList className="h-4 w-4" />
                    Table View
                  </TabsTrigger>
                  <TabsTrigger value="cards" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Card View
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/daily-bus-expenses')}
              >
                Manage Daily Expenses
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading daily trips...</p>
            </div>
          </div>
        ) : busSummaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No trips found for {format(selectedDate, "PPP")}
            </p>
            <Button onClick={() => navigate('/trips/quick-entry')}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Trip
            </Button>
          </div>
        ) : (
          <>
            {/* Fleet Summary */}
            {fleetSummary && (
              <FleetDailySummary summary={fleetSummary} date={selectedDate} />
            )}

            {/* Bus Summaries */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Bus Operations</h3>
              
              {viewMode === "table" ? (
                <BusDailySummaryTable summaries={busSummaries} onRefresh={refetch} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {busSummaries.map((summary) => (
                    <BusDailyCard key={summary.bus_id} summary={summary} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ImportFromAllocationModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}
