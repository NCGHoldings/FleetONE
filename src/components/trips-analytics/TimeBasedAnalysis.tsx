import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Calendar } from "lucide-react";
import { useTimeBasedAnalytics } from "@/hooks/useTimeBasedAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import HourlyHeatmap from "./charts/HourlyHeatmap";
import DayOfWeekChart from "./charts/DayOfWeekChart";
import TimeSlotComparison from "./charts/TimeSlotComparison";

interface TimeBasedAnalysisProps {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
}

export default function TimeBasedAnalysis({
  startDate,
  endDate,
  branchId,
}: TimeBasedAnalysisProps) {
  const { data, isLoading } = useTimeBasedAnalytics(startDate, endDate, branchId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Best Performing Times Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Most Profitable Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.bestPerformingTimes.mostProfitableHour.toString().padStart(2, '0')}:00
            </div>
            <p className="text-xs text-muted-foreground mt-1">Peak profit generation time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Most Profitable Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.bestPerformingTimes.mostProfitableDay}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Best day for revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Busiest Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.bestPerformingTimes.busiestHour.toString().padStart(2, '0')}:00
            </div>
            <p className="text-xs text-muted-foreground mt-1">Maximum trip activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Busiest Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.bestPerformingTimes.busiestDay}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Most active day</p>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Performance Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.peakHours.map((peak, idx) => (
              <Badge key={idx} variant="secondary" className="text-sm">
                {peak.hour.toString().padStart(2, '0')}:00 - ₹{peak.profit.toLocaleString()} ({peak.trips} trips)
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Slot Comparison */}
      <TimeSlotComparison data={data.timeSlots} />

      {/* Hourly Heatmap */}
      <HourlyHeatmap data={data.hourlyData} />

      {/* Day of Week Performance */}
      <DayOfWeekChart data={data.dailyData} />
    </div>
  );
}
