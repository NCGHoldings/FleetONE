import { format, eachDayOfInterval, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { BusDailySummary } from "@/hooks/useDailyBusGroupedTrips";

interface DailyBreakdownViewProps {
  summaries: BusDailySummary[];
  dateRange: { from: Date; to: Date };
}

interface DayBreakdown {
  date: string;
  tripCount: number;
  buses: Map<string, number>;
  revenue: number;
  distance: number;
}

export function DailyBreakdownView({ summaries, dateRange }: DailyBreakdownViewProps) {
  // Generate all days in the range
  const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  
  // Calculate breakdown for each day
  const dailyBreakdowns = new Map<string, DayBreakdown>();
  
  allDays.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    dailyBreakdowns.set(dateStr, {
      date: dateStr,
      tripCount: 0,
      buses: new Map(),
      revenue: 0,
      distance: 0,
    });
  });

  // Populate with actual trip data
  console.log('🔍 DEBUG: DailyBreakdownView Processing:', {
    summariesCount: summaries.length,
    dateRangeFrom: format(dateRange.from, 'yyyy-MM-dd'),
    dateRangeTo: format(dateRange.to, 'yyyy-MM-dd'),
    totalDays: allDays.length,
  });

  summaries.forEach(summary => {
    console.log(`Processing bus ${summary.bus_no}:`, {
      totalTrips: summary.trips.length,
      trips: summary.trips.map(t => ({ 
        trip_no: t.trip_no,
        date: t.trip_date, 
        income: t.income 
      })),
    });

    summary.trips.forEach(trip => {
      const breakdown = dailyBreakdowns.get(trip.trip_date);
      console.log(`Adding trip ${trip.trip_no} to ${trip.trip_date}:`, {
        breakdownExists: !!breakdown,
        currentTripCount: breakdown?.tripCount || 0,
      });
      
      if (breakdown) {
        breakdown.tripCount++;
        breakdown.revenue += trip.income || 0;
        breakdown.distance += trip.distance_km || 0;
        
        const busCount = breakdown.buses.get(summary.bus_no) || 0;
        breakdown.buses.set(summary.bus_no, busCount + 1);
      } else {
        console.warn(`⚠️ Trip date ${trip.trip_date} not in breakdown map!`);
      }
    });
  });

  console.log('📊 Final breakdown data:', {
    totalBreakdowns: dailyBreakdowns.size,
    breakdowns: Array.from(dailyBreakdowns.entries()).map(([date, data]) => ({
      date,
      tripCount: data.tripCount,
      buses: data.buses.size,
    })),
  });

  // Calculate statistics
  const breakdownArray = Array.from(dailyBreakdowns.values());
  const totalTrips = breakdownArray.reduce((sum, d) => sum + d.tripCount, 0);
  const avgTripsPerDay = totalTrips / breakdownArray.length;
  const maxTrips = Math.max(...breakdownArray.map(d => d.tripCount));
  const minTrips = Math.min(...breakdownArray.map(d => d.tripCount));
  
  // Identify days with issues
  const daysWithNoTrips = breakdownArray.filter(d => d.tripCount === 0);
  const daysWithLowTrips = breakdownArray.filter(d => d.tripCount > 0 && d.tripCount < avgTripsPerDay * 0.7);

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDayStatus = (count: number) => {
    if (count === 0) return "missing";
    if (count < avgTripsPerDay * 0.7) return "low";
    if (count >= avgTripsPerDay) return "good";
    return "normal";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "missing":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />No Trips</Badge>;
      case "low":
        return <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600"><TrendingDown className="h-3 w-3" />Below Average</Badge>;
      case "good":
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Good</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakdownArray.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Trips/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTripsPerDay.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Range: {minTrips} - {maxTrips}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Days with No Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{daysWithNoTrips.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Days Below Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{daysWithLowTrips.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for missing data */}
      {(daysWithNoTrips.length > 0 || daysWithLowTrips.length > 0) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Data Quality Issues Detected:</strong>
            {daysWithNoTrips.length > 0 && (
              <span className="block mt-1">• {daysWithNoTrips.length} day(s) with no trips recorded</span>
            )}
            {daysWithLowTrips.length > 0 && (
              <span className="block mt-1">• {daysWithLowTrips.length} day(s) with below-average trip counts</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Day-by-Day Table */}
      <Card>
        <CardHeader>
          <CardTitle>Day-by-Day Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Day</th>
                  <th className="text-right p-3 font-medium">Trips</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Distance (km)</th>
                  <th className="text-left p-3 font-medium">Buses</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {breakdownArray.map((day) => {
                  const status = getDayStatus(day.tripCount);
                  const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;
                  
                  return (
                    <tr 
                      key={day.date} 
                      className={`border-b hover:bg-muted/50 ${status === 'missing' ? 'bg-destructive/10' : status === 'low' ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}
                    >
                      <td className="p-3 font-medium">
                        {format(parseISO(day.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="p-3">
                        <span className={isWeekend ? 'text-muted-foreground' : ''}>
                          {format(parseISO(day.date), 'EEEE')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {day.tripCount}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(day.revenue)}
                      </td>
                      <td className="p-3 text-right">
                        {day.distance.toFixed(1)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(day.buses.entries()).map(([busNo, count]) => (
                            <Badge key={busNo} variant="outline" className="text-xs">
                              {busNo} ({count})
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold bg-muted/50">
                  <td className="p-3" colSpan={2}>Total</td>
                  <td className="p-3 text-right">{totalTrips}</td>
                  <td className="p-3 text-right">{formatCurrency(breakdownArray.reduce((sum, d) => sum + d.revenue, 0))}</td>
                  <td className="p-3 text-right">{breakdownArray.reduce((sum, d) => sum + d.distance, 0).toFixed(1)}</td>
                  <td className="p-3" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
