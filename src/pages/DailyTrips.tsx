import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, LayoutGrid, LayoutList, Plus, Upload, ChevronLeft, ChevronRight, FileSpreadsheet, Settings } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useDailyBusGroupedTrips } from "@/hooks/useDailyBusGroupedTrips";
import { BusDailySummaryTable } from "@/components/trips/BusDailySummaryTable";
import { BusDailyCard } from "@/components/trips/BusDailyCard";
import { FleetDailySummary } from "@/components/trips/FleetDailySummary";
import { DailyBreakdownView } from "@/components/trips/DailyBreakdownView";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportFromAllocationModal } from "@/components/trips/ImportFromAllocationModal";
import { GLExportModal } from "@/components/trips/GLExportModal";
import { RouteGLCodesAdmin } from "@/components/trips/RouteGLCodesAdmin";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DateRange } from "react-day-picker";

export default function DailyTrips() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [viewMode, setViewMode] = useState<"table" | "cards">(isMobile ? "cards" : "table");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGLExportModal, setShowGLExportModal] = useState(false);
  const [showRouteGLAdmin, setShowRouteGLAdmin] = useState(false);
  
  // Validate and prepare date range for hook
  const validDateRange = dateMode === "range" && dateRange?.from && dateRange?.to
    ? { from: dateRange.from, to: dateRange.to }
    : undefined;

  // Debug logging
  console.log('🔍 DEBUG: DailyTrips Component State:', {
    dateMode,
    selectedDate: selectedDate?.toISOString(),
    dateRange: {
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
    },
    validDateRange: {
      from: validDateRange?.from?.toISOString(),
      to: validDateRange?.to?.toISOString(),
    },
  });
  
  const { busSummaries, fleetSummary, loading, refetch } = useDailyBusGroupedTrips(
    dateMode === "single" ? selectedDate : null,
    validDateRange
  );

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

            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Navigation */}
              <div className="flex items-center gap-1">
                {dateMode === "single" && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                    title="Previous Day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full md:w-[260px] justify-start text-left font-normal",
                        (!selectedDate && dateMode === "single") && "text-muted-foreground",
                        (!dateRange && dateMode === "range") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateMode === "single" ? (
                        selectedDate ? format(selectedDate, "PPP") : "Pick a date"
                      ) : (
                        dateRange?.from ? (
                          dateRange.to ? (
                            `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`
                          ) : (
                            format(dateRange.from, "PP")
                          )
                        ) : (
                          "Pick date range"
                        )
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-3 border-b">
                      <Tabs value={dateMode} onValueChange={(v) => setDateMode(v as "single" | "range")}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="single">Single Date</TabsTrigger>
                          <TabsTrigger value="range">Date Range</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    {dateMode === "single" ? (
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    ) : (
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    )}
                  </PopoverContent>
                </Popover>

                {dateMode === "single" && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                    title="Next Day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button 
                variant="outline"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Import from Allocations</span>
                <span className="sm:hidden">Import</span>
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowGLExportModal(true)}
                disabled={!busSummaries.length}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export GL</span>
                <span className="sm:hidden">GL</span>
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowRouteGLAdmin(true)}
                className="bg-secondary/50"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Route Codes</span>
                <span className="sm:hidden">Codes</span>
              </Button>

              <Button onClick={() => navigate('/trips/quick-entry')}>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Quick Entry</span>
                <span className="sm:hidden">Add</span>
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
              {dateMode === "single" ? (
                <>No trips found for {format(selectedDate, "PPP")}</>
              ) : dateRange?.from && dateRange?.to ? (
                <>No trips found from {format(dateRange.from, "PP")} to {format(dateRange.to, "PP")}</>
              ) : (
                <>Select a date range to view trips</>
              )}
            </p>
            {dateMode === "single" && (
              <Button onClick={() => navigate('/trips/quick-entry')}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Trip
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Fleet Summary */}
            {fleetSummary && (
              <FleetDailySummary 
                summary={fleetSummary} 
                date={selectedDate}
                dateRange={dateMode === "range" ? dateRange : undefined}
              />
            )}

            {/* Day-by-Day Breakdown for Date Ranges */}
            {dateMode === "range" && dateRange?.from && dateRange?.to && (
              <DailyBreakdownView 
                summaries={busSummaries} 
                dateRange={{ from: dateRange.from, to: dateRange.to }} 
              />
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

      <GLExportModal
        open={showGLExportModal}
        onOpenChange={setShowGLExportModal}
        busSummaries={busSummaries}
        selectedDate={selectedDate}
        dateRange={dateRange}
      />

      <Sheet open={showRouteGLAdmin} onOpenChange={setShowRouteGLAdmin}>
        <SheetContent side="right" className="w-full sm:max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Route GL Codes Management</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <RouteGLCodesAdmin />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
