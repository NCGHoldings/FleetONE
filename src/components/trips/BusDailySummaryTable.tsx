import { useState } from "react";
import { ChevronDown, ChevronRight, MoreVertical, Edit, Plus, TrendingUp, AlertTriangle, Pencil, BookOpen, Loader2, Fuel, Gauge } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExpenseBreakdownPreview, DailyExpenseData } from "./ExpenseBreakdownPreview";
import { InlineExpenseEditor } from "./InlineExpenseEditor";
import { InlineRevenueEditor } from "./InlineRevenueEditor";
import { InlineCrewEditor } from "./InlineCrewEditor";
import { GLStatusBadge, GLAggregatedStatus } from "@/components/ncg-express/GLStatusBadge";
import { useNCGExpressFinanceSettings, postTripRevenueToGL } from "@/hooks/useNCGExpressFinance";
import { toast } from "@/hooks/use-toast";
interface BusDailySummaryTableProps {
  summaries: BusDailySummary[];
  onRefresh: () => void;
  selectedDate?: Date;
}

export function BusDailySummaryTable({ summaries, onRefresh, selectedDate }: BusDailySummaryTableProps) {
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
  
  const [editingCrewTrip, setEditingCrewTrip] = useState<{
    id: string;
    trip_no: string;
    route_name: string;
    driver_name?: string;
    conductor_name?: string;
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
        <Button onClick={() => navigate(`/trips/quick-entry${selectedDate ? `?date=${format(selectedDate, 'yyyy-MM-dd')}` : ''}`)}>
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
            <div className={`border rounded-xl bg-card transition-all duration-300 hover:shadow-md ${isExpanded ? 'shadow-md ring-1 ring-primary/10' : 'hover:border-primary/20'}`}>
              {/* Summary Row */}
              <div className="p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3 flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 rounded-full transition-all duration-200 ${isExpanded ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'}`}>
                        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1 h-10 rounded-full ${summary.profit_margin >= 50 ? 'bg-gradient-to-b from-green-400 to-emerald-500' : summary.profit_margin >= 30 ? 'bg-gradient-to-b from-amber-400 to-yellow-500' : summary.net_profit >= 0 ? 'bg-gradient-to-b from-orange-400 to-red-400' : 'bg-gradient-to-b from-red-500 to-red-600'}`} />
                      <div>
                        <div className="font-bold text-base tracking-tight">{summary.bus_no}</div>
                        <div className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {summary.routes.join(", ") || "No route"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 text-center">
                    <Badge variant="outline" className="font-semibold border-primary/20 bg-primary/5 text-primary">{summary.trip_count} trips</Badge>
                    <div className="mt-1">
                      <GLAggregatedStatus 
                        posted={summary.trips.filter(t => t.gl_posted).length}
                        total={summary.trips.filter(t => t.income > 0).length}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="font-semibold text-base">{formatCurrency(summary.total_revenue)}</div>
                    <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Revenue</div>
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="font-semibold">{summary.total_distance.toFixed(1)} km</div>
                    {summary.min_start_odo && summary.max_end_odo && (
                      <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Gauge className="h-3 w-3" />
                        {summary.min_start_odo.toLocaleString()} → {summary.max_end_odo.toLocaleString()}
                      </div>
                    )}
                    {summary.avg_km_per_liter > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {summary.avg_km_per_liter.toFixed(1)} km/L
                      </div>
                    )}
                    {summary.diesel_price_per_liter > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Fuel className="h-3 w-3" />
                        Rs.{summary.diesel_price_per_liter}/L
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="font-semibold">{formatCurrency(summary.total_expenses)}</div>
                    <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Expenses</div>
                    {!summary.has_expenses && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 justify-end mt-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        Not entered
                      </div>
                    )}
                  </div>

                  <div className="col-span-1 text-right">
                    <div className={`font-bold text-base ${getProfitColor(summary.profit_margin)}`}>
                      {formatCurrency(summary.net_profit)}
                    </div>
                    <Badge variant={getProfitBadge(summary.profit_margin)} className="text-xs font-semibold">
                      {summary.profit_margin.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted">
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
                <div className="border-t bg-gradient-to-b from-muted/40 to-muted/10 p-4">
                  <h4 className="font-semibold mb-4 text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Trip Details for {summary.bus_no} {summary.date.includes('to') ? `(${summary.date})` : `on ${format(new Date(summary.date), "PPP")}`}
                  </h4>
                  
                  {/* Tree View Trips */}
                  <div className="relative ml-3">
                    {/* Vertical tree line */}
                    <div className="absolute left-3 top-0 bottom-8 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />
                    
                    <div className="space-y-3">
                      {allocatedExpenses.map((trip, idx) => (
                        <div key={trip.id} className="relative pl-8">
                          {/* Horizontal branch line */}
                          <div className="absolute left-3 top-5 w-5 h-px bg-primary/20" />
                          {/* Node dot */}
                          <div className={`absolute left-1.5 top-3.5 w-3 h-3 rounded-full border-2 ${trip.income > 0 ? 'bg-green-100 border-green-400' : 'bg-orange-100 border-orange-400'}`} />

                          <div className="bg-card rounded-xl p-4 border shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold flex items-center gap-2">
                                  <span className="text-primary text-sm">Trip #{idx + 1}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="flex items-center gap-1.5">
                                    {trip.route_name}
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          {trip.route_id ? (
                                            <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                          ) : (
                                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                          )}
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                          {trip.route_id ? "Official Route (Dictionary Match)" : "Unverified Route. Please map to an official route."}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap mt-1">
                                  <span>
                                    Driver: {trip.driver_name || 'N/A'} • Conductor: {trip.conductor_name || 'N/A'}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 rounded-full"
                                    onClick={() => setEditingCrewTrip({
                                      id: trip.id,
                                      trip_no: trip.trip_no,
                                      route_name: trip.route_name,
                                      driver_name: trip.driver_name && trip.driver_name !== 'N/A' ? trip.driver_name : '',
                                      conductor_name: trip.conductor_name && trip.conductor_name !== 'N/A' ? trip.conductor_name : '',
                                    })}
                                    title="Edit driver / conductor"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <GLStatusBadge posted={trip.gl_posted} />
                                <Badge variant="outline" className="font-mono text-xs">{trip.trip_no}</Badge>
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

                            <div className="grid grid-cols-5 gap-4 text-sm">
                              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5">
                                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Time</div>
                                <div className="font-semibold">
                                  {trip.start_time && trip.end_time 
                                    ? `${trip.start_time} - ${trip.end_time}`
                                    : "N/A"}
                                </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5">
                                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Gauge className="h-3 w-3" />
                                  Odo & Dist.
                                </div>
                                {trip.start_odo || trip.end_odo ? (
                                  <>
                                    <div className="font-semibold">
                                      {(trip.start_odo || 0).toLocaleString()} → {(trip.end_odo || 0).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {trip.distance_km?.toFixed(1) || 0} km
                                    </div>
                                  </>
                                ) : (
                                  <div className="font-semibold">{trip.distance_km?.toFixed(1) || 0} km</div>
                                )}
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5">
                                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Fuel className="h-3 w-3" />
                                  Fuel
                                </div>
                                {trip.fuel_liters ? (
                                  <>
                                    <div className="font-semibold">{trip.fuel_liters.toFixed(1)} L</div>
                                    {trip.diesel_price_per_liter ? (
                                      <div className="text-xs text-muted-foreground">
                                        @ Rs.{trip.diesel_price_per_liter}/L = {formatCurrency(trip.fuel_liters * trip.diesel_price_per_liter)}
                                      </div>
                                    ) : summary.diesel_price_per_liter > 0 ? (
                                      <div className="text-xs text-muted-foreground">
                                        @ Rs.{summary.diesel_price_per_liter}/L = {formatCurrency(trip.fuel_liters * summary.diesel_price_per_liter)}
                                      </div>
                                    ) : null}
                                  </>
                                ) : (
                                  <div className="font-semibold text-muted-foreground">—</div>
                                )}
                              </div>

                              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2.5">
                                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Revenue</div>
                                <div className="font-semibold flex items-center gap-2">
                                  {formatCurrency(trip.income)}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 rounded-full"
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
                                    <Badge variant="outline" className="text-[10px]">
                                      Awaiting
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2.5">
                                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Allocated Cost</div>
                                <div className="font-semibold">{formatCurrency(trip.allocated_expense)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {trip.expense_percentage.toFixed(1)}% of daily
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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

      {/* Inline Crew (Driver / Conductor) Editor */}
      <InlineCrewEditor
        isOpen={!!editingCrewTrip}
        onClose={() => setEditingCrewTrip(null)}
        trip={editingCrewTrip}
        onSaved={onRefresh}
      />
    </div>
  );
}
