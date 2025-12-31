import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Calendar as CalendarIcon, User } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, isToday, parseISO } from "date-fns";

interface AttendanceRecord {
  id: string;
  staff_registry_id: string | null;
  staff_id: string;
  staff_name: string;
  staff_type?: string;
  attendance_date: string;
  trip_id?: string;
  bus_no?: string;
  route?: string;
  hours_worked: number;
  status: string;
}

interface AttendanceCalendarProps {
  attendance: AttendanceRecord[];
  selectedMonth: Date;
  loading?: boolean;
}

export function AttendanceCalendar({ attendance, selectedMonth, loading }: AttendanceCalendarProps) {
  // Get all days in the month
  const daysInMonth = getDaysInMonth(selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthStart = startOfMonth(selectedMonth);

  // Group attendance by staff
  const staffAttendance = useMemo(() => {
    const grouped = new Map<string, { 
      name: string; 
      type?: string;
      dates: Map<number, { count: number; records: AttendanceRecord[] }> 
    }>();

    attendance.forEach(record => {
      const staffKey = record.staff_registry_id || record.staff_id;
      const date = parseISO(record.attendance_date);
      const day = date.getDate();

      if (!grouped.has(staffKey)) {
        grouped.set(staffKey, { 
          name: record.staff_name, 
          type: record.staff_type,
          dates: new Map() 
        });
      }

      const staff = grouped.get(staffKey)!;
      if (!staff.dates.has(day)) {
        staff.dates.set(day, { count: 0, records: [] });
      }
      const dayData = staff.dates.get(day)!;
      dayData.count++;
      dayData.records.push(record);
    });

    // Sort by name
    return Array.from(grouped.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attendance]);

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals = new Map<number, number>();
    days.forEach(day => {
      let count = 0;
      staffAttendance.forEach(staff => {
        if (staff.dates.has(day)) count++;
      });
      totals.set(day, count);
    });
    return totals;
  }, [staffAttendance, days]);

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

  if (staffAttendance.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No attendance records for this month</p>
          <p className="text-sm">Click "Sync from Trips" to pull attendance data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5" />
            {format(selectedMonth, 'MMMM yyyy')} Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* Header Row - Days */}
              <div className="flex border-b">
                <div className="w-48 min-w-48 p-2 font-medium text-sm bg-muted/50 sticky left-0 z-10">
                  Staff Name
                </div>
                {days.map(day => {
                  const date = new Date(monthStart);
                  date.setDate(day);
                  const isCurrentDay = isToday(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  return (
                    <div 
                      key={day} 
                      className={`w-10 min-w-10 p-2 text-center text-xs font-medium border-l ${
                        isCurrentDay 
                          ? 'bg-primary text-primary-foreground' 
                          : isWeekend 
                            ? 'bg-muted/30' 
                            : 'bg-muted/50'
                      }`}
                    >
                      <div>{day}</div>
                      <div className="text-[10px] opacity-70">
                        {format(date, 'EEE').slice(0, 1)}
                      </div>
                    </div>
                  );
                })}
                <div className="w-16 min-w-16 p-2 text-center text-xs font-medium bg-muted/50 border-l">
                  Total
                </div>
              </div>

              {/* Staff Rows */}
              {staffAttendance.map((staff, idx) => {
                const totalDays = staff.dates.size;
                
                return (
                  <div 
                    key={staff.id} 
                    className={`flex border-b hover:bg-muted/30 transition-colors ${
                      idx % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    {/* Staff Name */}
                    <div className="w-48 min-w-48 p-2 sticky left-0 bg-background z-10 border-r flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{staff.name}</div>
                        {staff.type && (
                          <Badge 
                            variant={staff.type === 'driver' ? 'default' : 'secondary'} 
                            className="text-[10px] px-1 py-0"
                          >
                            {staff.type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Day Cells */}
                    {days.map(day => {
                      const dayData = staff.dates.get(day);
                      const hasAttendance = !!dayData;
                      const date = new Date(monthStart);
                      date.setDate(day);
                      const isCurrentDay = isToday(date);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <div 
                          key={day} 
                          className={`w-10 min-w-10 p-1 text-center border-l ${
                            isCurrentDay 
                              ? 'bg-primary/10' 
                              : isWeekend 
                                ? 'bg-muted/20' 
                                : ''
                          }`}
                        >
                          {hasAttendance ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center items-center h-6">
                                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="text-xs space-y-1">
                                  <div className="font-medium">{format(date, 'EEEE, MMM d')}</div>
                                  {dayData.records.map((r, i) => (
                                    <div key={i} className="text-muted-foreground">
                                      {r.bus_no && <span>Bus: {r.bus_no}</span>}
                                      {r.route && <span> • {r.route}</span>}
                                      {r.hours_worked && <span> • {r.hours_worked}h</span>}
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="h-6" />
                          )}
                        </div>
                      );
                    })}

                    {/* Total */}
                    <div className="w-16 min-w-16 p-2 text-center border-l font-medium text-sm">
                      {totalDays}
                    </div>
                  </div>
                );
              })}

              {/* Summary Row */}
              <div className="flex border-t-2 bg-muted/50 font-medium">
                <div className="w-48 min-w-48 p-2 text-sm sticky left-0 bg-muted/50 z-10">
                  Daily Total
                </div>
                {days.map(day => {
                  const total = dailyTotals.get(day) || 0;
                  const date = new Date(monthStart);
                  date.setDate(day);
                  const isCurrentDay = isToday(date);
                  
                  return (
                    <div 
                      key={day} 
                      className={`w-10 min-w-10 p-2 text-center text-xs border-l ${
                        isCurrentDay ? 'bg-primary/20' : ''
                      }`}
                    >
                      {total > 0 ? total : '-'}
                    </div>
                  );
                })}
                <div className="w-16 min-w-16 p-2 text-center border-l text-sm">
                  {staffAttendance.length}
                </div>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
