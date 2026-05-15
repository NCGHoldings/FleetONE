import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Calendar as CalendarIcon, Bus, X, Clock, FileText, FolderOpen, ArrowLeft, Minus } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, endOfMonth, isToday, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BusDailyFolderModal } from "./BusDailyFolderModal";

interface SubmissionMatrixDashboardProps {
  selectedMonth: Date;
}

export function SubmissionMatrixDashboard({ selectedMonth }: SubmissionMatrixDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [tripsData, setTripsData] = useState<any[]>([]);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [selectedBusForFolder, setSelectedBusForFolder] = useState<any | null>(null);
  const [selectedFolderDate, setSelectedFolderDate] = useState<Date>(new Date());
  const [expandedCell, setExpandedCell] = useState<{bus_no: string, day: number} | null>(null);
  const [selectedDetailDay, setSelectedDetailDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  useEffect(() => {
    fetchMatrixData();
  }, [selectedMonth]);

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');

      // 1. Fetch scheduled/active daily trips in the month
      const { data: trips } = await supabase
        .from('daily_trips')
        .select(`
          id, bus_id, trip_no, income, total_expenses, trip_date, route_label,
          buses:bus_id(bus_no),
          routes:route_id(route_name)
        `)
        .gte('trip_date', startDateStr)
        .lte('trip_date', endDateStr);

      // 2. Fetch submissions in the month
      const { data: submissions } = await supabase
        .from('conductor_submissions')
        .select(`
          id, bus_number, status, trip_date, created_at, submission_code
        `)
        .gte('trip_date', startDateStr)
        .lte('trip_date', endDateStr);

      setTripsData(trips || []);
      setSubmissionsData(submissions || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Group data by bus -> dates
  const fleetMatrix = useMemo(() => {
    const grouped = new Map<string, { 
      bus_no: string; 
      dates: Map<number, { 
        trips: any[]; 
        submissions: any[]; 
        status: 'complete' | 'pending' | 'missing' | 'none' 
      }> 
    }>();

    // Map trips
    tripsData.forEach(t => {
      const busNo = t.buses?.bus_no;
      if (!busNo || !t.trip_date) return;
      
      const date = parseISO(t.trip_date);
      const day = date.getDate();

      if (!grouped.has(busNo)) {
        grouped.set(busNo, { bus_no: busNo, dates: new Map() });
      }

      const bus = grouped.get(busNo)!;
      if (!bus.dates.has(day)) {
        bus.dates.set(day, { trips: [], submissions: [], status: 'none' });
      }
      bus.dates.get(day)!.trips.push(t);
    });

    // Map submissions
    submissionsData.forEach(sub => {
      const busNo = sub.bus_number;
      if (!busNo || !sub.trip_date) return;
      
      const date = parseISO(sub.trip_date);
      const day = date.getDate();

      if (!grouped.has(busNo)) {
        grouped.set(busNo, { bus_no: busNo, dates: new Map() });
      }

      const bus = grouped.get(busNo)!;
      if (!bus.dates.has(day)) {
        bus.dates.set(day, { trips: [], submissions: [], status: 'none' });
      }
      bus.dates.get(day)!.submissions.push(sub);
    });

    // Determine status per cell
    Array.from(grouped.values()).forEach(bus => {
      days.forEach(day => {
        if (bus.dates.has(day)) {
          const cell = bus.dates.get(day)!;
          if (cell.submissions.length > 0) {
             const allApplied = cell.submissions.every(s => s.status === 'applied');
             cell.status = allApplied ? 'complete' : 'pending';
          } else if (cell.trips.length > 0) {
             cell.status = 'missing';
          } else {
             cell.status = 'none';
          }
        }
      });
    });

    // Sort by bus number
    return Array.from(grouped.values()).sort((a, b) => a.bus_no.localeCompare(b.bus_no));
  }, [tripsData, submissionsData, days]);

  // Calculate daily totals (Missing vs Complete)
  const dailyTotals = useMemo(() => {
    const totals = new Map<number, { complete: number, missing: number }>();
    days.forEach(day => {
      let complete = 0;
      let missing = 0;
      fleetMatrix.forEach(bus => {
        if (bus.dates.has(day)) {
          const status = bus.dates.get(day)!.status;
          if (status === 'complete' || status === 'pending') complete++;
          if (status === 'missing') missing++;
        }
      });
      totals.set(day, { complete, missing });
    });
    return totals;
  }, [fleetMatrix, days]);

  const activeDetailDayData = useMemo(() => {
    if (selectedDetailDay === null) return null;
    const activeBuses = fleetMatrix.filter(b => {
      const dayData = b.dates.get(selectedDetailDay);
      return dayData && dayData.status !== 'none';
    });

    let maxTrips = 0;
    activeBuses.forEach(b => {
      const tripsLen = b.dates.get(selectedDetailDay)?.trips.length || 0;
      if (tripsLen > maxTrips) maxTrips = tripsLen;
    });

    return {
      buses: activeBuses,
      maxTrips,
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), selectedDetailDay)
    };
  }, [fleetMatrix, selectedDetailDay, monthStart]);

  const handleCellClick = (bus_no: string, day: number) => {
    const cellData = fleetMatrix.find(b => b.bus_no === bus_no)?.dates.get(day);
    if (!cellData || cellData.status === 'none') return;
    
    if (expandedCell?.bus_no === bus_no && expandedCell?.day === day) {
      setExpandedCell(null);
    } else {
      setExpandedCell({ bus_no, day });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 w-full bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fleetMatrix.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No schedule or submissions found for this month</p>
        </CardContent>
      </Card>
    );
  }

  if (selectedDetailDay !== null && activeDetailDayData) {
    const { buses, maxTrips, date } = activeDetailDayData;
    
    return (
      <TooltipProvider>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 bg-slate-50 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedDetailDay(null)}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Month
              </button>
              <CardTitle className="text-lg text-slate-800">
                {format(date, 'EEEE, MMMM d, yyyy')} Details
              </CardTitle>
            </div>
            <div className="flex gap-4 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Submitted</span>
              <span className="flex items-center gap-1"><X className="w-3.5 h-3.5 text-rose-500" /> Missing</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="w-full">
               <div className="min-w-max pb-4">
                 {/* Detail Header */}
                 <div className="flex border-b bg-slate-50">
                    <div className="w-32 min-w-32 p-3 font-semibold text-sm text-slate-700 sticky left-0 z-20 bg-slate-50 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Bus Number
                    </div>
                    {Array.from({ length: maxTrips }).map((_, i) => (
                      <div key={i} className="w-16 min-w-16 p-3 text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 border-r bg-slate-50/80">
                        Trip {i + 1}
                      </div>
                    ))}
                    <div className="w-20 min-w-20 p-3 text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 border-r bg-slate-50/80">
                      Fuel
                    </div>
                    <div className="w-20 min-w-20 p-3 text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 border-r bg-slate-50/80">
                      Expenses
                    </div>
                    <div className="w-32 min-w-32 p-3 text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 border-r bg-slate-50/80">
                      Bank Deposit
                    </div>
                    <div className="w-24 min-w-24 p-3 text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-50/80">
                      Action
                    </div>
                 </div>

                 {/* Detail Rows */}
                 {buses.length === 0 ? (
                   <div className="p-12 text-center text-slate-500 font-medium">No scheduled trips or submissions for this date.</div>
                 ) : (() => {
                    // Group buses by route
                    const groupedBuses = buses.reduce((acc, bus) => {
                      const dayData = bus.dates.get(selectedDetailDay)!;
                      const routeNames = Array.from(new Set(dayData.trips.map(t => t.routes?.route_name || t.route_label).filter(Boolean))).join(', ') || 'Unassigned / Unknown Route';
                      if (!acc[routeNames]) acc[routeNames] = [];
                      acc[routeNames].push(bus);
                      return acc;
                    }, {} as Record<string, typeof buses>);

                    // Sort routes alphabetically, putting Unassigned last
                    const sortedRoutes = Object.keys(groupedBuses).sort((a, b) => {
                      if (a === 'Unassigned / Unknown Route') return 1;
                      if (b === 'Unassigned / Unknown Route') return -1;
                      return a.localeCompare(b);
                    });

                    return sortedRoutes.map((routeName) => (
                      <div key={routeName} className="flex flex-col">
                        {/* Route Header Row */}
                        <div className="bg-blue-50/80 border-b border-t border-blue-100 shadow-sm sticky left-0 z-10 w-full">
                          <div className="px-4 py-2 font-bold text-xs text-blue-900 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                            {routeName}
                            <Badge variant="secondary" className="ml-2 text-[9px] h-4 bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200">
                              {groupedBuses[routeName].length} Buses
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Buses in this Route */}
                        {groupedBuses[routeName].map((bus, idx) => {
                          const dayData = bus.dates.get(selectedDetailDay)!;
                          const hasSubmissions = dayData.submissions.length > 0;
                          
                          let expOk = false;
                          let fuelOk = false;
                          let depositAmount = 0;
                          let hasDeposit = false;
                          let totalExp = 0;

                          dayData.trips.forEach(t => totalExp += (t.total_expenses || 0));
                          dayData.submissions.forEach((s: any) => {
                            if (s.ocr_data?.bank_deposit?.actual_amount) {
                              hasDeposit = true;
                              depositAmount += parseFloat(s.ocr_data.bank_deposit.actual_amount);
                            }
                            if (s.ocr_data?.expenses?.total) {
                              totalExp += parseFloat(s.ocr_data.expenses.total);
                            }
                            if (s.ocr_data?.fuel_details?.liters) {
                              fuelOk = true;
                            }
                          });
                          expOk = totalExp > 0 || hasSubmissions;

                          const sortedTrips = [...dayData.trips].sort((a, b) => {
                            const numA = parseInt(a.trip_no?.replace(/\D/g, '') || '0');
                            const numB = parseInt(b.trip_no?.replace(/\D/g, '') || '0');
                            return numA - numB;
                          });

                          return (
                            <div key={bus.bus_no} className={`flex border-b hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                               <div className="w-32 min-w-32 p-2 sticky left-0 z-10 border-r flex flex-col justify-center bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                 <div className="flex items-center gap-2">
                                   <Bus className="h-4 w-4 text-blue-500 shrink-0" />
                                   <div className="text-sm font-bold text-slate-700 truncate">{bus.bus_no}</div>
                                 </div>
                               </div>

                               {Array.from({ length: maxTrips }).map((_, i) => {
                                  const trip = sortedTrips[i];
                                  if (!trip) {
                                    return (
                                      <div key={i} className="w-16 min-w-16 p-3 border-r flex items-center justify-center bg-slate-50/30">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shadow-sm">
                                          <Minus className="w-3 h-3" />
                                        </div>
                                      </div>
                                    );
                                  }
                                  const tripIncOk = trip.income > 0;
                                  const tripOdoOk = trip.odometer_start || trip.odometer_end;
                                  const isComplete = tripIncOk && tripOdoOk;
                                  return (
                                    <div key={i} className="w-16 min-w-16 p-3 border-r flex items-center justify-center">
                                      {isComplete ? (
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                                          <Check className="w-3 h-3" />
                                        </div>
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shadow-sm">
                                          <X className="w-3 h-3" />
                                        </div>
                                      )}
                                    </div>
                                  );
                               })}

                               <div className="w-20 min-w-20 p-3 border-r flex items-center justify-center">
                                  {fuelOk ? (
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                                      <Check className="w-3 h-3" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shadow-sm">
                                      <Minus className="w-3 h-3" />
                                    </div>
                                  )}
                               </div>
                               <div className="w-20 min-w-20 p-3 border-r flex items-center justify-center">
                                  {expOk ? (
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                                      <Check className="w-3 h-3" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shadow-sm">
                                      <X className="w-3 h-3" />
                                    </div>
                                  )}
                               </div>
                               <div className="w-32 min-w-32 p-3 border-r flex items-center justify-center">
                                  {hasDeposit ? (
                                    <span className="font-bold text-purple-600 text-sm">Rs. {depositAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded uppercase">Not Recorded</span>
                                  )}
                               </div>
                               <div className="w-24 min-w-24 p-3 flex items-center justify-center">
                                   <button onClick={() => {
                                       setSelectedBusForFolder({
                                           bus_no: bus.bus_no,
                                           trips: dayData.trips,
                                           submissions: dayData.submissions,
                                           total_income: dayData.trips.reduce((acc, t) => acc + (t.income || 0), 0),
                                           total_expenses: dayData.trips.reduce((acc, t) => acc + (t.total_expenses || 0), 0),
                                           trip_date: format(date, 'yyyy-MM-dd')
                                       });
                                       setSelectedFolderDate(date);
                                   }} className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 bg-white border shadow-sm px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                                     <FolderOpen className="h-3 w-3" /> View
                                   </button>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                 })()}
               </div>
               <ScrollBar orientation="horizontal" />
             </ScrollArea>
          </CardContent>
        </Card>

        <BusDailyFolderModal
          open={!!selectedBusForFolder}
          onOpenChange={(open) => !open && setSelectedBusForFolder(null)}
          busData={selectedBusForFolder}
          date={selectedFolderDate}
        />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 bg-slate-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg text-slate-800">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              {format(selectedMonth, 'MMMM yyyy')} Submissions Matrix
            </div>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Applied</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Pending</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Missing</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-max pb-4">
              {/* Header Row - Days */}
              <div className="flex border-b bg-slate-50">
                <div className="w-32 min-w-32 p-3 font-semibold text-sm text-slate-700 sticky left-0 z-20 bg-slate-50 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Bus Number
                </div>
                {days.map(day => {
                  const date = new Date(monthStart);
                  date.setDate(day);
                  const isCurrentDay = isToday(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  return (
                    <div 
                      key={day} 
                      onClick={() => setSelectedDetailDay(day)}
                      className={`w-11 min-w-11 p-2 text-center text-xs font-medium border-r cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors ${
                        isCurrentDay 
                          ? 'bg-blue-100 text-blue-800' 
                          : isWeekend 
                            ? 'bg-slate-100 text-slate-500' 
                            : 'bg-transparent text-slate-600'
                      }`}
                    >
                      <div className="font-bold">{day}</div>
                      <div className="text-[10px] uppercase opacity-70">
                        {format(date, 'EEE').slice(0, 1)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bus Rows */}
              {fleetMatrix.map((bus, idx) => {
                const isExpanded = expandedCell?.bus_no === bus.bus_no;
                const expandedDay = isExpanded ? expandedCell.day : null;
                const expandedData = isExpanded && expandedDay ? bus.dates.get(expandedDay) : null;
                const expandedDate = expandedDay ? new Date(monthStart.getFullYear(), monthStart.getMonth(), expandedDay) : null;

                return (
                  <div 
                    key={bus.bus_no} 
                    className={`flex flex-col border-b transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <div className="flex w-fit hover:bg-slate-50">
                      {/* Bus Name */}
                      <div className="w-32 min-w-32 p-3 sticky left-0 z-10 border-r flex items-center gap-2 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <Bus className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="text-sm font-bold text-slate-700 truncate">{bus.bus_no}</div>
                      </div>

                      {/* Day Cells */}
                      {days.map(day => {
                        const dayData = bus.dates.get(day);
                        const status = dayData?.status || 'none';
                        const hasData = status !== 'none';
                        const isActiveCell = expandedCell?.bus_no === bus.bus_no && expandedCell?.day === day;
                        
                        const date = new Date(monthStart);
                        date.setDate(day);
                        const isCurrentDay = isToday(date);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        return (
                          <div 
                            key={day} 
                            onClick={() => handleCellClick(bus.bus_no, day)}
                            className={`w-11 min-w-11 p-1 border-r flex items-center justify-center transition-colors ${
                              hasData ? 'cursor-pointer hover:bg-slate-100' : ''
                            } ${
                              isActiveCell ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset z-10' :
                              isCurrentDay 
                                ? 'bg-blue-50/50' 
                                : isWeekend && !hasData
                                  ? 'bg-slate-50/50' 
                                  : ''
                            }`}
                          >
                            {hasData && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`flex justify-center items-center h-full w-full ${isActiveCell ? 'scale-110' : ''} transition-transform`}>
                                    {status === 'complete' && (
                                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                                        <Check className="h-3.5 w-3.5" />
                                      </div>
                                    )}
                                    {status === 'pending' && (
                                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200">
                                        <Clock className="h-3.5 w-3.5" />
                                      </div>
                                    )}
                                    {status === 'missing' && (
                                      <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                                        <X className="h-3.5 w-3.5" />
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="text-xs space-y-1">
                                    <div className="font-bold border-b pb-1 mb-1">{format(date, 'EEEE, MMM d')} - {bus.bus_no}</div>
                                    {status === 'missing' ? (
                                      <div className="text-rose-500 font-medium">{dayData.trips.length} Trips Scheduled, No Submissions</div>
                                    ) : (
                                      <div className="text-emerald-600 font-medium">{dayData.submissions.length} Submissions ({status})</div>
                                    )}
                                    <div className="text-slate-400 mt-1">Click to expand details</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Expanded Content Section */}
                    {isExpanded && expandedData && expandedDate && (() => {
                      const hasSubmissions = expandedData.submissions.length > 0;
                      const allApplied = hasSubmissions && expandedData.submissions.every((s: any) => s.status === 'applied');
                      let expOk = false;
                      let fuelOk = false;
                      let depositAmount = 0;
                      let hasDeposit = false;

                      let totalExp = 0;
                      expandedData.trips.forEach(t => totalExp += (t.total_expenses || 0));

                      expandedData.submissions.forEach((s: any) => {
                        if (s.ocr_data?.bank_deposit?.actual_amount) {
                          hasDeposit = true;
                          depositAmount += parseFloat(s.ocr_data.bank_deposit.actual_amount);
                        }
                        if (s.ocr_data?.expenses?.total) {
                          totalExp += parseFloat(s.ocr_data.expenses.total);
                        }
                        if (s.ocr_data?.fuel_details?.liters) {
                          fuelOk = true;
                        }
                      });
                      expOk = totalExp > 0 || hasSubmissions;

                      const sortedTrips = [...expandedData.trips].sort((a, b) => {
                        const numA = parseInt(a.trip_no?.replace(/\D/g, '') || '0');
                        const numB = parseInt(b.trip_no?.replace(/\D/g, '') || '0');
                        return numA - numB;
                      });

                      return (
                        <div className="w-full bg-slate-100/80 border-t shadow-inner p-4 sticky left-0 z-10 flex justify-start pl-[140px]" style={{ width: 'max-content', minWidth: '100%' }}>
                          <div className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow w-[600px]">
                            {/* Card Header */}
                            <div className="p-4 border-b bg-slate-50 flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                  <Bus className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <h3 className="font-bold text-lg text-slate-800 leading-none">{bus.bus_no}</h3>
                                    <span className="text-xs font-semibold text-slate-500">{format(expandedDate, 'MMMM d, yyyy')}</span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => {
                                  setSelectedBusForFolder({
                                      bus_no: bus.bus_no,
                                      trips: expandedData.trips,
                                      submissions: expandedData.submissions,
                                      total_income: expandedData.trips.reduce((acc, t) => acc + (t.income || 0), 0),
                                      total_expenses: expandedData.trips.reduce((acc, t) => acc + (t.total_expenses || 0), 0),
                                      trip_date: format(expandedDate, 'yyyy-MM-dd')
                                  });
                                  setSelectedFolderDate(expandedDate);
                              }} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-white border shadow-sm px-3 py-1.5 rounded-lg hover:bg-slate-50">
                                <FolderOpen className="h-3.5 w-3.5" /> View Master Folder
                              </button>
                            </div>

                            {/* Status Banner */}
                            <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider flex justify-between items-center ${hasSubmissions ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              <span className="flex items-center gap-1.5">
                                {hasSubmissions ? <FileText className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                {hasSubmissions ? `${expandedData.submissions.length} Logs Found` : 'Logs Missing'}
                              </span>
                              <span>{hasSubmissions ? (allApplied ? 'Applied' : 'Pending Review') : 'Action Required'}</span>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/50">
                               <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Expenses</span>
                                  <span className={expOk ? "text-emerald-500" : "text-amber-500"}>{expOk ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>
                               </div>
                               <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Fuel Logs</span>
                                  <span className={fuelOk ? "text-emerald-500" : "text-slate-300"}>{fuelOk ? <Check className="h-4 w-4" /> : "-"}</span>
                               </div>
                               <div className="col-span-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Bank Deposit</span>
                                  {hasDeposit ? (
                                    <span className="font-bold text-purple-600 text-sm">Rs. {depositAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px] font-semibold bg-slate-100 px-2 py-0.5 rounded uppercase">Not Recorded</span>
                                  )}
                               </div>
                            </div>

                            {/* Trip Breakdown */}
                            <div className="p-3 border-t bg-white">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Trip Breakdown ({sortedTrips.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {sortedTrips.length > 0 ? sortedTrips.map((trip: any, tIdx: number) => {
                                  const tripIncOk = trip.income > 0;
                                  const tripOdoOk = trip.odometer_start || trip.odometer_end;
                                  const isComplete = tripIncOk && tripOdoOk;
                                  const isPartial = (tripIncOk || tripOdoOk) && !isComplete;
                                  
                                  return (
                                    <div key={tIdx} className={`p-2 rounded-lg border shadow-sm text-xs min-w-[110px] flex-1 ${
                                      isComplete ? 'bg-emerald-50/50 border-emerald-100' :
                                      isPartial ? 'bg-amber-50/50 border-amber-100' :
                                      'bg-slate-50 border-slate-100'
                                    }`}>
                                      <div className="font-bold text-slate-700 mb-1 border-b border-slate-200/60 pb-1 flex justify-between items-center">
                                        <span>{trip.trip_no || `Trip ${tIdx+1}`}</span>
                                        {isComplete && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                      </div>
                                      <div className="space-y-1 mt-1.5">
                                        <div className="flex justify-between items-center">
                                          <span className="text-slate-500 font-semibold text-[10px] uppercase">Inc</span>
                                          {tripIncOk ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-amber-500" />}
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-slate-500 font-semibold text-[10px] uppercase">Odo</span>
                                          {tripOdoOk ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-amber-500" />}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }) : (
                                  <span className="text-xs text-slate-400 font-medium px-1">No trips scheduled for this date.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Summary Row */}
              <div className="flex border-t-2 bg-slate-100 font-medium text-slate-600">
                <div className="w-32 min-w-32 p-3 text-xs uppercase tracking-wider sticky left-0 z-20 bg-slate-100 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Missing Logs
                </div>
                {days.map(day => {
                  const missing = dailyTotals.get(day)?.missing || 0;
                  const date = new Date(monthStart);
                  date.setDate(day);
                  const isCurrentDay = isToday(date);
                  
                  return (
                    <div 
                      key={day} 
                      className={`w-11 min-w-11 p-2 text-center text-xs font-bold border-r ${
                        isCurrentDay ? 'bg-blue-100/50' : ''
                      } ${missing > 0 ? 'text-rose-600' : 'text-slate-400'}`}
                    >
                      {missing > 0 ? missing : '-'}
                    </div>
                  );
                })}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <BusDailyFolderModal
        open={!!selectedBusForFolder}
        onOpenChange={(open) => !open && setSelectedBusForFolder(null)}
        busData={selectedBusForFolder}
        date={selectedFolderDate}
      />
    </TooltipProvider>
  );
}
