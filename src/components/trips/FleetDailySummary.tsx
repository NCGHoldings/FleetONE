import { Bus, TrendingUp, DollarSign, Fuel, AlertCircle, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FleetSummary } from "@/hooks/useDailyBusGroupedTrips";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface FleetDailySummaryProps {
  summary: FleetSummary;
  date: Date;
  dateRange?: DateRange;
}

export function FleetDailySummary({ summary, date, dateRange }: FleetDailySummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDateLabel = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`;
    }
    return format(date, "PPPP");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">
          {dateRange?.from && dateRange?.to ? "Range Summary" : "Daily Summary"}
        </h2>
        <p className="text-muted-foreground">{getDateLabel()}</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Bus className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Active Buses</div>
            </div>
            <div className="text-2xl font-bold">{summary.active_buses}</div>
            <div className="text-xs text-muted-foreground">{summary.total_trips} total trips</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</div>
            <div className="text-xs text-muted-foreground">
              {summary.total_distance.toFixed(0)} km
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Fleet Profit</div>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.fleet_profit)}
            </div>
            <div className="text-xs text-muted-foreground">
              {summary.fleet_profit_margin.toFixed(1)}% margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Fleet Avg Efficiency</div>
            </div>
            <div className="text-2xl font-bold">
              {summary.fleet_avg_efficiency > 0 ? summary.fleet_avg_efficiency.toFixed(1) : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground">km per liter</div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        {summary.top_performer && (
          <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>
              <div className="font-semibold text-green-900 dark:text-green-100">
                Top Performer: {summary.top_performer.bus_no}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                {summary.top_performer.profit_margin.toFixed(1)}% profit margin with {formatCurrency(summary.top_performer.net_profit)} profit
              </div>
            </AlertDescription>
          </Alert>
        )}

        {summary.needs_attention && (
          <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription>
              <div className="font-semibold text-orange-900 dark:text-orange-100">
                Attention Needed: {summary.needs_attention.bus_no}
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-300">
                {summary.needs_attention.avg_km_per_liter.toFixed(1)} km/L - below fleet average of {summary.fleet_avg_efficiency.toFixed(1)} km/L
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
