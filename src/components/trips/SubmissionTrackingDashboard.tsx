import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Bus,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface SubmissionTrackingDashboardProps {
  selectedDate: Date;
}

export function SubmissionTrackingDashboard({ selectedDate }: SubmissionTrackingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [busesData, setBusesData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'sla_breach'>('all');

  useEffect(() => {
    fetchTrackingData();
  }, [selectedDate]);

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // 1. Fetch scheduled/active daily trips
      const { data: trips, error: tripsError } = await supabase
        .from('daily_trips')
        .select(`
          id, bus_id, trip_no, income, total_expenses, odometer_start, odometer_end, fuel_liters, start_time, end_time,
          buses:bus_id(bus_no)
        `)
        .eq('trip_date', dateStr);

      if (tripsError) throw tripsError;

      // 2. Fetch submissions for this date
      const { data: submissions, error: subError } = await supabase
        .from('conductor_submissions')
        .select(`
          id, bus_number, status, created_at, ocr_data, submission_code
        `)
        .eq('trip_date', dateStr);

      if (subError) throw subError;

      // Map trips by bus
      const busMap = new Map<string, any>();

      (trips || []).forEach(t => {
        const busNo = t.buses?.bus_no;
        if (!busNo) return;
        
        if (!busMap.has(busNo)) {
          busMap.set(busNo, {
            bus_no: busNo,
            trips: [],
            total_income: 0,
            total_expenses: 0,
            has_odo: false,
            has_fuel: false,
            latest_end_time: null,
            submissions: []
          });
        }
        
        const b = busMap.get(busNo);
        b.trips.push(t);
        b.total_income += (t.income || 0);
        b.total_expenses += (t.total_expenses || 0);
        
        if (t.odometer_start || t.odometer_end) b.has_odo = true;
        if (t.fuel_liters && t.fuel_liters > 0) b.has_fuel = true;
        
        if (t.end_time) {
          // Compare times (simple string comparison works for HH:mm:ss)
          if (!b.latest_end_time || t.end_time > b.latest_end_time) {
            b.latest_end_time = t.end_time;
          }
        }
      });

      // Attach submissions
      (submissions || []).forEach(sub => {
        const busNo = sub.bus_number;
        if (busNo) {
          if (!busMap.has(busNo)) {
            // Bus has submission but no scheduled daily trips yet
            busMap.set(busNo, {
              bus_no: busNo,
              trips: [],
              total_income: 0,
              total_expenses: 0,
              has_odo: false,
              has_fuel: false,
              latest_end_time: null,
              submissions: []
            });
          }
          busMap.get(busNo).submissions.push(sub);
        }
      });

      setBusesData(Array.from(busMap.values()));
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  // Filter & Search Logic
  let displayData = busesData.filter(b => {
    if (searchQuery && !b.bus_no.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Check SLA Breach
    let isSlaBreach = false;
    if (b.latest_end_time && b.submissions.length === 0) {
      // Assuming today is selectedDate. If historical, SLA might just be true if missing.
      const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      if (isToday) {
        const [hh, mm] = b.latest_end_time.split(':').map(Number);
        const endTimeDate = new Date();
        endTimeDate.setHours(hh, mm, 0, 0);
        const hoursDiff = differenceInMinutes(now, endTimeDate) / 60;
        if (hoursDiff >= 4) {
          isSlaBreach = true;
        }
      } else {
        // For past dates, if it had an end time and no submission, it breached SLA
        isSlaBreach = true;
      }
    }

    // Check Missing Data
    const isMissingData = b.total_income === 0 || !b.has_odo || b.submissions.length === 0;

    if (filterMode === 'sla_breach' && !isSlaBreach) return false;
    if (filterMode === 'missing' && !isMissingData) return false;

    return true;
  });

  // Sort by SLA Breach first, then missing
  displayData.sort((a, b) => {
    // Basic sorting logic placeholder
    return a.bus_no.localeCompare(b.bus_no);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Bus Number..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant={filterMode === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilterMode('all')}
            size="sm"
          >
            All Active
          </Button>
          <Button 
            variant={filterMode === 'missing' ? 'default' : 'outline'} 
            onClick={() => setFilterMode('missing')}
            size="sm"
            className={filterMode === 'missing' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            <AlertTriangle className="w-4 h-4 mr-1" /> Missing Data
          </Button>
          <Button 
            variant={filterMode === 'sla_breach' ? 'default' : 'outline'} 
            onClick={() => setFilterMode('sla_breach')}
            size="sm"
            className={filterMode === 'sla_breach' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <Clock className="w-4 h-4 mr-1" /> SLA Breach (&gt;4h)
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">Bus Number</th>
                <th className="px-4 py-3 text-center">Submissions</th>
                <th className="px-4 py-3">Trip-by-Trip Breakdown</th>
                <th className="px-4 py-3 text-center">Daily Fuel / Exp</th>
                <th className="px-4 py-3 text-center">Bank Deposit</th>
                <th className="px-4 py-3">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-8 w-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No data found for the selected filters.
                  </td>
                </tr>
              ) : (
                displayData.map((bus, idx) => {
                  const hasSubmissions = bus.submissions.length > 0;
                  const allApplied = hasSubmissions && bus.submissions.every((s: any) => s.status === 'applied');
                  
                  let slaBadge = null;
                  
                  if (!hasSubmissions) {
                    if (bus.latest_end_time) {
                       const [hh, mm] = bus.latest_end_time.split(':').map(Number);
                       const endTimeDate = new Date(selectedDate);
                       endTimeDate.setHours(hh, mm, 0, 0);
                       
                       const hoursDiff = differenceInMinutes(now, endTimeDate) / 60;
                       
                       if (hoursDiff >= 4) {
                         slaBadge = <Badge variant="destructive" className="animate-pulse flex w-fit"><Clock className="w-3 h-3 mr-1"/> SLA Breach (+{Math.floor(hoursDiff)}h)</Badge>;
                       } else if (hoursDiff > 0) {
                         slaBadge = <Badge variant="outline" className="border-amber-500 text-amber-600 flex w-fit"><Clock className="w-3 h-3 mr-1"/> Pending ({Math.floor(hoursDiff)}h)</Badge>;
                       } else {
                         slaBadge = <Badge variant="outline" className="text-slate-500 flex w-fit">In Transit</Badge>;
                       }
                    } else if (bus.trips.length > 0) {
                       slaBadge = <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 flex w-fit">Awaiting Sub</Badge>;
                    } else {
                       slaBadge = <Badge variant="outline" className="text-slate-400 flex w-fit">No Schedule</Badge>;
                    }
                  } else {
                     slaBadge = <Badge className="bg-emerald-500 flex w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Submitted</Badge>;
                  }

                  const expOk = bus.total_expenses > 0 || hasSubmissions;
                  const fuelOk = bus.has_fuel;
                  
                  let depositAmount = 0;
                  let hasDeposit = false;
                  bus.submissions.forEach((s: any) => {
                    if (s.ocr_data?.bank_deposit?.actual_amount) {
                      hasDeposit = true;
                      depositAmount += parseFloat(s.ocr_data.bank_deposit.actual_amount);
                    }
                  });

                  // Sort trips by trip_no to ensure they are sequential
                  const sortedTrips = [...bus.trips].sort((a, b) => {
                    const numA = parseInt(a.trip_no?.replace(/\D/g, '') || '0');
                    const numB = parseInt(b.trip_no?.replace(/\D/g, '') || '0');
                    return numA - numB;
                  });

                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <Bus className="w-4 h-4 text-blue-500" />
                            {bus.bus_no}
                          </span>
                          {bus.latest_end_time && (
                            <span className="text-[10px] text-muted-foreground ml-6">
                              Last End: {bus.latest_end_time.substring(0,5)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        {hasSubmissions ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-emerald-600">{bus.submissions.length} Found</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{allApplied ? 'Applied' : 'Pending Review'}</span>
                          </div>
                        ) : (
                          <span className="text-amber-500 font-medium text-xs">Missing</span>
                        )}
                      </td>
                      
                      {/* Trip Breakdown Column */}
                      <td className="px-4 py-3 align-top min-w-[300px]">
                        <div className="flex flex-wrap gap-2">
                          {sortedTrips.length > 0 ? sortedTrips.map((trip: any, tIdx: number) => {
                            const tripIncOk = trip.income > 0;
                            const tripOdoOk = trip.odometer_start || trip.odometer_end;
                            // Determine overall trip status for styling
                            const isComplete = tripIncOk && tripOdoOk;
                            const isPartial = (tripIncOk || tripOdoOk) && !isComplete;
                            
                            return (
                              <div key={tIdx} className={`p-2 rounded border text-xs min-w-[110px] ${
                                isComplete ? 'bg-emerald-50 border-emerald-200' :
                                isPartial ? 'bg-amber-50 border-amber-200' :
                                'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="font-semibold text-slate-700 mb-1 border-b border-slate-200 pb-1 flex justify-between items-center">
                                  <span>{trip.trip_no || `Trip ${tIdx+1}`}</span>
                                  {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground text-[10px] uppercase">Inc</span>
                                    {tripIncOk ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-amber-500" />}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground text-[10px] uppercase">Odo</span>
                                    {tripOdoOk ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-amber-500" />}
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <span className="text-xs text-slate-400 italic">No trips scheduled</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center align-top">
                        <div className="flex flex-col items-center gap-1 text-xs font-medium">
                          <span className={expOk ? "text-emerald-600" : "text-amber-500"}>
                            Exp: {expOk ? <CheckCircle2 className="w-3 h-3 inline" /> : <XCircle className="w-3 h-3 inline" />}
                          </span>
                          <span className={fuelOk ? "text-emerald-600" : "text-slate-400"}>
                            Fuel: {fuelOk ? <CheckCircle2 className="w-3 h-3 inline" /> : '-'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center align-top">
                        {hasDeposit ? (
                          <span className="font-bold text-purple-600">Rs. {depositAmount.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top">
                        {slaBadge}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
