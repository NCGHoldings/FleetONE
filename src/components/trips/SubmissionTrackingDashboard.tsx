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
  Filter,
  Eye,
  Printer,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BusDailyFolderModal } from './BusDailyFolderModal';

interface SubmissionTrackingDashboardProps {
  selectedDate: Date;
}

export function SubmissionTrackingDashboard({ selectedDate }: SubmissionTrackingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [busesData, setBusesData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'sla_breach'>('all');
  const [selectedBusForFolder, setSelectedBusForFolder] = useState<any | null>(null);
  const navigate = useNavigate();

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
      {/* Mobile-friendly Filter Header */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Bus Number..."
            className="pl-10 h-10 bg-slate-50 border-transparent focus:bg-white transition-colors rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex overflow-x-auto pb-1 gap-2 hide-scrollbar">
          <Button 
            variant={filterMode === 'all' ? 'default' : 'secondary'} 
            onClick={() => setFilterMode('all')}
            size="sm"
            className={`rounded-full shrink-0 px-4 h-8 ${filterMode === 'all' ? 'shadow-sm' : 'bg-slate-100 text-slate-600'}`}
          >
            All Active
          </Button>
          <Button 
            variant={filterMode === 'missing' ? 'default' : 'secondary'} 
            onClick={() => setFilterMode('missing')}
            size="sm"
            className={`rounded-full shrink-0 px-4 h-8 ${filterMode === 'missing' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Missing Data
          </Button>
          <Button 
            variant={filterMode === 'sla_breach' ? 'default' : 'secondary'} 
            onClick={() => setFilterMode('sla_breach')}
            size="sm"
            className={`rounded-full shrink-0 px-4 h-8 ${filterMode === 'sla_breach' ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" /> SLA Breach (&gt;4h)
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : displayData.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-muted-foreground shadow-sm">
            <Bus className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No data found for the selected filters.</p>
          </div>
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
                   slaBadge = <Badge variant="destructive" className="animate-pulse border-none text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide"><Clock className="w-3 h-3 mr-1"/> Breach (+{Math.floor(hoursDiff)}h)</Badge>;
                 } else if (hoursDiff > 0) {
                   slaBadge = <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide"><Clock className="w-3 h-3 mr-1"/> Pending ({Math.floor(hoursDiff)}h)</Badge>;
                 } else {
                   slaBadge = <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">In Transit</Badge>;
                 }
              } else if (bus.trips.length > 0) {
                 slaBadge = <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-none text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">Awaiting Sub</Badge>;
              } else {
                 slaBadge = <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-none text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">No Schedule</Badge>;
              }
            } else {
               slaBadge = <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-none text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide"><CheckCircle2 className="w-3 h-3 mr-1"/> Submitted</Badge>;
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
              <div key={idx} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className="p-4 border-b bg-slate-50 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                      <Bus className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-lg text-slate-800 leading-none">{bus.bus_no}</h3>
                        {slaBadge}
                      </div>
                      {bus.latest_end_time && (
                        <p className="text-xs text-slate-500 font-medium">Last End: {bus.latest_end_time.substring(0,5)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 bg-white shadow-sm border border-slate-100 rounded-full" onClick={() => setSelectedBusForFolder(bus)} title={`View ${bus.bus_no} folder`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 bg-white shadow-sm border border-slate-100 rounded-full" onClick={() => {
                      const printContent = `
                        <html><head><title>${bus.bus_no} - Summary</title></head><body>
                        <h1>🚌 ${bus.bus_no} — Summary</h1>
                        <p>Total Trips: ${bus.trips.length}</p>
                        </body></html>
                      `;
                      const w = window.open('', '_blank', 'width=700,height=600');
                      if (w) { w.document.write(printContent); w.document.close(); setTimeout(() => { w.print(); }, 500); }
                    }} title={`Print ${bus.bus_no} summary`}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Status Banner */}
                <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider flex justify-between items-center ${hasSubmissions ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  <span className="flex items-center gap-1.5">
                    {hasSubmissions ? <FileText className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {hasSubmissions ? `${bus.submissions.length} Logs Found` : 'Logs Missing'}
                  </span>
                  <span>{hasSubmissions ? (allApplied ? 'Applied' : 'Pending Review') : 'Action Required'}</span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/50">
                   <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Expenses</span>
                      <span className={expOk ? "text-emerald-500" : "text-amber-500"}>{expOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span>
                   </div>
                   <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Fuel Logs</span>
                      <span className={fuelOk ? "text-emerald-500" : "text-slate-300"}>{fuelOk ? <CheckCircle2 className="h-4 w-4" /> : "-"}</span>
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
                            {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                          <div className="space-y-1 mt-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-semibold text-[10px] uppercase">Inc</span>
                              {tripIncOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-semibold text-[10px] uppercase">Odo</span>
                              {tripOdoOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-amber-500" />}
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
            );
          })
        )}
      </div>

      <BusDailyFolderModal
        open={!!selectedBusForFolder}
        onOpenChange={(open) => !open && setSelectedBusForFolder(null)}
        busData={selectedBusForFolder}
        date={selectedDate}
      />
    </div>
  );
}
