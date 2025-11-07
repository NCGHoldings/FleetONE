import { Bus, TrendingUp, DollarSign, AlertTriangle, Fuel, Edit, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BusDailySummary } from "@/hooks/useDailyBusGroupedTrips";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";

interface BusDailyCardProps {
  summary: BusDailySummary;
}

export function BusDailyCard({ summary }: BusDailyCardProps) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProfitColor = (margin: number) => {
    if (margin >= 50) return "text-green-600 dark:text-green-400";
    if (margin >= 30) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProfitBadge = (margin: number) => {
    if (margin >= 50) return "default";
    if (margin >= 30) return "secondary";
    return "destructive";
  };

  const allocatedExpenses = summary.total_distance > 0 
    ? summary.trips.map(trip => ({
        ...trip,
        allocated_expense: (trip.distance_km || 0) / summary.total_distance * summary.total_expenses,
        expense_percentage: (trip.distance_km || 0) / summary.total_distance * 100,
      }))
    : summary.trips.map(trip => ({ ...trip, allocated_expense: 0, expense_percentage: 0 }));

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{summary.bus_no}</CardTitle>
            </div>
            <Badge variant="outline">{summary.trip_count} trips</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {summary.routes.join(", ") || "No route assigned"}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Revenue
              </div>
              <div className="font-semibold">{formatCurrency(summary.total_revenue)}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Expenses
              </div>
              <div className="font-semibold">{formatCurrency(summary.total_expenses)}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Profit
              </div>
              <div className={`font-bold ${getProfitColor(summary.profit_margin)}`}>
                {formatCurrency(summary.net_profit)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Fuel className="h-3 w-3" />
                Distance
              </div>
              <div className="font-semibold">{summary.total_distance.toFixed(1)} km</div>
            </div>
          </div>

          {/* Profit Margin */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Profit Margin</span>
              <Badge variant={getProfitBadge(summary.profit_margin)}>
                {summary.profit_margin.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={Math.min(summary.profit_margin, 100)} className="h-2" />
          </div>

          {/* Efficiency */}
          {summary.avg_km_per_liter > 0 && (
            <div className="flex justify-between items-center text-sm p-2 bg-muted rounded-md">
              <span className="text-muted-foreground">Efficiency</span>
              <span className="font-semibold">{summary.avg_km_per_liter.toFixed(1)} km/L</span>
            </div>
          )}

          {/* Warnings */}
          {!summary.has_expenses && (
            <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 p-2 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              Daily expenses not entered
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => setShowDetails(true)}
            >
              View Trips
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/daily-bus-expenses?bus=${summary.bus_id}&date=${summary.date}`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trip Details Sheet */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {summary.bus_no} - {summary.date.includes('to') ? summary.date : format(new Date(summary.date), "PPP")}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-muted rounded-lg text-sm">
              <div>
                <div className="text-muted-foreground">Total Revenue</div>
                <div className="font-semibold">{formatCurrency(summary.total_revenue)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Expenses</div>
                <div className="font-semibold">{formatCurrency(summary.total_expenses)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Net Profit</div>
                <div className={`font-bold ${getProfitColor(summary.profit_margin)}`}>
                  {formatCurrency(summary.net_profit)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Profit Margin</div>
                <Badge variant={getProfitBadge(summary.profit_margin)}>
                  {summary.profit_margin.toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Trip Timeline */}
            <div>
              <h4 className="font-semibold mb-3">Trip Timeline</h4>
              <div className="space-y-3">
                {allocatedExpenses.map((trip, idx) => (
                  <div key={trip.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">Trip #{idx + 1}</div>
                        <div className="text-sm text-muted-foreground">{trip.route_name}</div>
                      </div>
                      <Badge variant="outline">{trip.trip_no}</Badge>
                    </div>

                    {trip.driver_name && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {trip.driver_name}
                        {trip.conductor_name && ` • ${trip.conductor_name}`}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Time</div>
                        <div className="font-medium">
                          {trip.start_time && trip.end_time 
                            ? `${trip.start_time} - ${trip.end_time}`
                            : "N/A"}
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Revenue</div>
                        <div className="font-medium flex items-center gap-2">
                          {formatCurrency(trip.income)}
                          {trip.income === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Awaiting Entry
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Distance</div>
                        <div className="font-medium">{trip.distance_km?.toFixed(1) || 0} km</div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Allocated Cost</div>
                        <div className="font-medium">{formatCurrency(trip.allocated_expense)}</div>
                        <div className="text-xs text-muted-foreground">
                          {trip.expense_percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/trips/quick-entry?date=${summary.date}`)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Trip
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/daily-bus-expenses?bus=${summary.bus_id}&date=${summary.date}`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Expenses
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
