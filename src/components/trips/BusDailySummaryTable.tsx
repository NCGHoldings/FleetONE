import { useState } from "react";
import { ChevronDown, ChevronRight, MoreVertical, Edit, Plus, TrendingUp, AlertTriangle, Pencil, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DeleteTripButton } from "./DeleteTripButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { BusDailySummary } from "@/hooks/useDailyBusGroupedTrips";
import { format } from "date-fns";
import { ExpenseBreakdownPreview, DailyExpenseData } from "./ExpenseBreakdownPreview";
import { InlineExpenseEditor } from "./InlineExpenseEditor";
import { InlineRevenueEditor } from "./InlineRevenueEditor";
import { GLStatusBadge, GLAggregatedStatus } from "@/components/ncg-express/GLStatusBadge";
import { useNCGExpressFinanceSettings, postTripRevenueToGL } from "@/hooks/useNCGExpressFinance";
import { toast } from "@/hooks/use-toast";
interface BusDailySummaryTableProps {
  summaries: BusDailySummary[];
  onRefresh: () => void;
}

export function BusDailySummaryTable({ summaries, onRefresh }: BusDailySummaryTableProps) {
  const navigate = useNavigate();
  const [expandedBuses, setExpandedBuses] = useState<Set<string>>(new Set());
  const [postingBusId, setPostingBusId] = useState<string | null>(null);
  const { settings } = useNCGExpressFinanceSettings();
  
  // Inline editor states
  const [editingExpenseBus, setEditingExpenseBus] = useState<{
    busId: string;
    busNo: string;
    date: string;
    expenses: DailyExpenseData | null;
  } | null>(null);
  
  const [editingTrip, setEditingTrip] = useState<{
    id: string;
    trip_no: string;
    route_name: string;
    driver_name?: string;
    conductor_name?: string;
    income: number;
    distance_km?: number;
    start_time?: string;
    end_time?: string;
  } | null>(null);

  const toggleExpanded = (busId: string) => {
    const newExpanded = new Set(expandedBuses);
    if (newExpanded.has(busId)) {
      newExpanded.delete(busId);
    } else {
      newExpanded.add(busId);
    }
    setExpandedBuses(newExpanded);
  };

  const handlePostAllTripsToGL = async (summary: BusDailySummary) => {
    if (!settings) {
      toast({
        title: "Settings not configured",
        description: "Please configure NCG Express Finance Settings first",
        variant: "destructive",
      });
      return;
    }

    setPostingBusId(summary.bus_id);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const trip of summary.trips) {
        if (trip.gl_posted) continue; // Skip already posted
        if (!trip.income || trip.income <= 0) continue; // Skip zero income

        const result = await postTripRevenueToGL(
          {
            id: trip.id,
            trip_no: trip.trip_no,
            trip_date: trip.trip_date,
            bus_no: summary.bus_no,
            route_name: trip.route_name,
            income: trip.income,
          },
          settings
        );

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Posted to GL",
          description: `${successCount} trip(s) posted successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        });
        onRefresh();
      } else if (failCount > 0) {
        toast({
          title: "Posting failed",
          description: `Failed to post ${failCount} trip(s)`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPostingBusId(null);
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (summaries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No trips found for this date</p>
        <Button onClick={() => navigate('/trips/quick-entry')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Trips
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {summaries.map((summary) => {
        const isExpanded = expandedBuses.has(summary.bus_id);
        // Divide expenses equally by number of trips
        const allocatedExpense = summary.total_expenses / summary.trip_count;
        const expensePercentage = 100 / summary.trip_count;
        
        const allocatedExpenses = summary.trips.map(trip => ({
          ...trip,
          allocated_expense: allocatedExpense,
          expense_percentage: expensePercentage,
        }));

        return (
          <Collapsible
            key={summary.bus_id}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(summary.bus_id)}
          >
            <div className="border rounded-lg bg-card">
              {/* Summary Row */}
              <div className="p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3 flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="font-semibold">{summary.bus_no}</div>
                      <div className="text-xs text-muted-foreground">
                        {summary.routes.join(", ") || "No route"}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 text-center">
                    <Badge variant="outline">{summary.trip_count} trips</Badge>
                    <div className="mt-1">
                      <GLAggregatedStatus 
                        posted={summary.trips.filter(t => t.gl_posted).length}
                        total={summary.trips.filter(t => t.income > 0).length}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="font-medium">{formatCurrency(summary.total_revenue)}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="font-medium">{summary.total_distance.toFixed(1)} km</div>
                    {summary.avg_km_per_liter > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {summary.avg_km_per_liter.toFixed(1)} km/L
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="font-medium">{formatCurrency(summary.total_expenses)}</div>
                    <div className="text-xs text-muted-foreground">Expenses</div>
                    {!summary.has_expenses && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="h-3 w-3" />
                        Not entered
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <div className={`font-semibold ${getProfitColor(summary.profit_margin)}`}>
                      {formatCurrency(summary.net_profit)}
                    </div>
                    <Badge variant={getProfitBadge(summary.profit_margin)} className="text-xs">
                      {summary.profit_margin.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/daily-bus-expenses?bus=${summary.bus_id}&date=${summary.date}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Daily Expenses
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/trips/quick-entry?bus=${summary.bus_id}&date=${summary.date}`)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Trip
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/trips-analytics?bus=${summary.bus_id}`)}>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          View Analytics
                        </DropdownMenuItem>
                        {summary.trips.some(t => !t.gl_posted && t.income > 0) && settings?.cash_account_id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handlePostAllTripsToGL(summary)}
                              disabled={postingBusId === summary.bus_id}
                              className="text-green-600"
                            >
                              {postingBusId === summary.bus_id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <BookOpen className="mr-2 h-4 w-4" />
                              )}
                              Post All Trips to GL
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Expanded Trip Details */}
              <CollapsibleContent>
                <div className="border-t bg-muted/30 p-4">
                  <h4 className="font-semibold mb-3">
                    Trip Details for {summary.bus_no} {summary.date.includes('to') ? `(${summary.date})` : `on ${format(new Date(summary.date), "PPP")}`}
                  </h4>
                  
                  <div className="space-y-3">
                    {allocatedExpenses.map((trip, idx) => (
                      <div key={trip.id} className="bg-card rounded-lg p-4 border">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">
                              Trip #{idx + 1} • {trip.route_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {trip.driver_name && `Driver: ${trip.driver_name}`}
                              {trip.driver_name && trip.conductor_name && " • "}
                              {trip.conductor_name && `Conductor: ${trip.conductor_name}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{trip.trip_no}</Badge>
                            <DeleteTripButton
                              tripId={trip.id}
                              tripNo={trip.trip_no}
                              busNo={summary.bus_no}
                              routeName={trip.route_name}
                              onDeleted={onRefresh}
                              variant="icon"
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setEditingTrip({
                                  id: trip.id,
                                  trip_no: trip.trip_no,
                                  route_name: trip.route_name,
                                  driver_name: trip.driver_name,
                                  conductor_name: trip.conductor_name,
                                  income: trip.income,
                                  distance_km: trip.distance_km,
                                  start_time: trip.start_time,
                                  end_time: trip.end_time,
                                })}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {trip.income === 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Awaiting Entry
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-muted-foreground">Distance</div>
                            <div className="font-medium">
                              {trip.distance_km?.toFixed(1) || 0} km
                            </div>
                            {trip.start_odo && trip.end_odo && (
                              <div className="text-xs text-muted-foreground">
                                Odo: {trip.start_odo} → {trip.end_odo}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-muted-foreground">Allocated Expense</div>
                            <div className="font-medium">{formatCurrency(trip.allocated_expense)}</div>
                            <div className="text-xs text-muted-foreground">
                              {trip.expense_percentage.toFixed(1)}% of daily
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expense Breakdown Preview */}
                  <ExpenseBreakdownPreview
                    expenses={summary.daily_expenses}
                    busId={summary.bus_id}
                    busNo={summary.bus_no}
                    date={summary.date}
                    onEditExpenses={() => setEditingExpenseBus({
                      busId: summary.bus_id,
                      busNo: summary.bus_no,
                      date: summary.date,
                      expenses: summary.daily_expenses,
                    })}
                  />

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/trips/quick-entry?date=${summary.date}`)}
                    >
                      Quick Entry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/trips-analytics?bus=${summary.bus_id}`)}
                    >
                      View Analytics
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {/* Inline Expense Editor */}
      <InlineExpenseEditor
        isOpen={!!editingExpenseBus}
        onClose={() => setEditingExpenseBus(null)}
        busId={editingExpenseBus?.busId || ''}
        busNo={editingExpenseBus?.busNo || ''}
        date={editingExpenseBus?.date || ''}
        existingExpenses={editingExpenseBus?.expenses}
        onSaved={onRefresh}
      />

      {/* Inline Revenue Editor */}
      <InlineRevenueEditor
        isOpen={!!editingTrip}
        onClose={() => setEditingTrip(null)}
        trip={editingTrip}
        onSaved={onRefresh}
      />
    </div>
  );
}
