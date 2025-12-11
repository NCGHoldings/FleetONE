import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CrossComparisonFilterPanel from "./CrossComparisonFilterPanel";
import CrossComparisonTrendCharts from "./CrossComparisonTrendCharts";
import { useCrossComparisonAnalytics, TimeSlotValue } from "@/hooks/useCrossComparisonAnalytics";

interface CrossComparisonAnalyticsProps {
  startDate: Date;
  endDate: Date;
}

export default function CrossComparisonAnalytics({
  startDate,
  endDate,
}: CrossComparisonAnalyticsProps) {
  // Filter states
  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlotValue[]>([]);
  
  // Applied filters (used for querying)
  const [appliedFilters, setAppliedFilters] = useState({
    buses: [] as string[],
    routes: [] as string[],
    timeSlots: [] as TimeSlotValue[],
  });

  // Fetch data with applied filters
  const { data, isLoading, error } = useCrossComparisonAnalytics({
    startDate,
    endDate,
    routes: appliedFilters.routes,
    timeSlots: appliedFilters.timeSlots,
    buses: appliedFilters.buses,
  });

  // Reset filters when date range changes
  useEffect(() => {
    setSelectedBuses([]);
    setSelectedRoutes([]);
    setSelectedTimeSlots([]);
    setAppliedFilters({ buses: [], routes: [], timeSlots: [] });
  }, [startDate, endDate]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      buses: selectedBuses,
      routes: selectedRoutes,
      timeSlots: selectedTimeSlots,
    });
  };

  const handleClearFilters = () => {
    setSelectedBuses([]);
    setSelectedRoutes([]);
    setSelectedTimeSlots([]);
    setAppliedFilters({ buses: [], routes: [], timeSlots: [] });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Cross-Comparison Data</AlertTitle>
        <AlertDescription>
          {error.message || 'Failed to load comparison analytics data'}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <p className="text-muted-foreground">No data available for the selected date range</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <CrossComparisonFilterPanel
        availableBuses={data.availableBuses}
        availableRoutes={data.availableRoutes}
        selectedBuses={selectedBuses}
        selectedRoutes={selectedRoutes}
        selectedTimeSlots={selectedTimeSlots}
        onBusesChange={setSelectedBuses}
        onRoutesChange={setSelectedRoutes}
        onTimeSlotsChange={setSelectedTimeSlots}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        matchingTrips={data.dataSourceInfo.filteredRecords}
        isLoading={isLoading}
      />

      {/* Trend Charts */}
      <CrossComparisonTrendCharts
        trendData={data.trendData}
        byBus={data.byBus}
        byRoute={data.byRoute}
        totals={data.totals}
        dataSourceInfo={data.dataSourceInfo}
        selectedBuses={appliedFilters.buses}
        selectedRoutes={appliedFilters.routes}
      />
    </div>
  );
}
