import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isToday, getDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Calendar, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GovernanceOccurrence } from '@/hooks/useGovernanceOccurrences';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MonthCalendarProps {
  currentDate: Date;
  occurrences: GovernanceOccurrence[];
  onOccurrenceClick: (occurrence: GovernanceOccurrence) => void;
}

interface Holiday {
  holiday_date: string;
  holiday_name: string;
  type: string;
  is_mercantile: boolean;
}

const statusColors: Record<string, string> = {
  Planned: 'bg-blue-500',
  Due: 'bg-yellow-500',
  Submitted: 'bg-green-500',
  Completed: 'bg-gray-400',
  Skipped: 'bg-red-500',
  'N/A': 'bg-gray-300',
};

const statusTextColors: Record<string, string> = {
  Planned: 'text-blue-500',
  Due: 'text-yellow-500',
  Submitted: 'text-green-500',
  Completed: 'text-gray-400',
  Skipped: 'text-red-500',
  'N/A': 'text-gray-300',
};

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthCalendar = ({ currentDate, occurrences, onOccurrenceClick }: MonthCalendarProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for the first week
  const startDayOfWeek = getDay(monthStart);
  const paddingDays = Array(startDayOfWeek).fill(null);

  // Fetch holidays for the current month
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('holiday_date, holiday_name, type, is_mercantile')
        .gte('holiday_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('holiday_date', format(monthEnd, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return (data || []) as Holiday[];
    },
  });

  const getOccurrencesForDate = (date: Date) => {
    return occurrences.filter(occ => 
      isSameDay(new Date(occ.scheduled_date), date)
    );
  };

  const getHolidaysForDate = (date: Date) => {
    return holidays.filter(holiday => 
      isSameDay(new Date(holiday.holiday_date), date)
    );
  };

  const getCompanyPrefix = (occ: GovernanceOccurrence) => {
    const company = occ.governance_item.companies?.name || '';
    const sbu = occ.governance_item.sbus?.name || '';
    if (sbu) {
      return `${company}-${sbu}`;
    }
    return company;
  };

  // Check if there are any occurrences at all
  const hasAnyOccurrences = occurrences.length > 0;

  return (
    <div className="h-full flex flex-col">
      {!hasAnyOccurrences && (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
          <Calendar className="h-16 w-16 text-muted-foreground/40" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No Scheduled Occurrences</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The calendar is empty. Click the <strong>"Generate Schedule"</strong> button above to populate it with governance items.
            </p>
          </div>
        </div>
      )}

      {hasAnyOccurrences && (
        <>
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        {/* Padding days */}
        {paddingDays.map((_, idx) => (
          <div key={`padding-${idx}`} className="bg-muted/20 rounded-lg" />
        ))}

        {/* Actual days */}
        {daysInMonth.map(date => {
          const dayOccurrences = getOccurrencesForDate(date);
          const dayHolidays = getHolidaysForDate(date);
          const isCurrentDay = isToday(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'border rounded-lg p-3 min-h-[130px] flex flex-col shadow-sm hover:shadow-md transition-all',
                isCurrentDay && 'border-primary border-2 bg-primary/5 ring-2 ring-primary/20',
                dayHolidays.length > 0 && 'bg-red-50/30 border-red-200'
              )}
            >
              {/* Date header with occurrence count */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-lg font-semibold',
                    isCurrentDay && 'text-primary font-bold',
                    dayHolidays.length > 0 && 'text-red-600'
                  )}>
                    {format(date, 'd')}
                  </span>
                  {dayHolidays.length > 0 && (
                    <span className="text-sm">🏖️</span>
                  )}
                </div>
                {dayOccurrences.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs font-medium">
                    {dayOccurrences.length}
                  </Badge>
                )}
              </div>

              {/* Holiday indicator */}
              {dayHolidays.length > 0 && (
                <div className="mb-2">
                  {dayHolidays.map((holiday, idx) => (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <div className="text-[10px] font-medium text-red-600 truncate cursor-help">
                          {holiday.holiday_name}
                          {holiday.is_mercantile && ' (M)'}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <div className="font-semibold">{holiday.holiday_name}</div>
                          <div className="text-xs">
                            {holiday.is_mercantile ? 'Mercantile Holiday (Banks/Offices closed)' : 'Public Holiday'}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* Occurrences list with enhanced styling */}
              <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
                {dayOccurrences.slice(0, 4).map(occ => (
                  <Tooltip key={occ.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onOccurrenceClick(occ)}
                        className="w-full text-left group"
                      >
                        <div className="flex items-start gap-1.5 p-2 rounded-md hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
                          {/* Type icon */}
                          {occ.governance_item.type === 'REPORT' ? (
                            <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                          ) : (
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                          )}
                          
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Company/SBU prefix */}
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              {getCompanyPrefix(occ)}
                            </div>
                            
                            {/* Title */}
                            <div className="text-xs font-medium leading-tight truncate">
                              {occ.governance_item.title}
                            </div>

                            {/* Holiday adjusted indicator */}
                            {occ.is_holiday_adjusted && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[9px] px-1 py-0">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                Adjusted
                              </Badge>
                            )}
                          </div>
                          
                          {/* Status indicator dot */}
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                            statusColors[occ.status]
                          )} />
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{occ.governance_item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {occ.governance_item.companies?.name}
                          {occ.governance_item.sbus && ` - ${occ.governance_item.sbus.name}`}
                        </div>
                        {occ.is_holiday_adjusted && occ.adjusted_reason && (
                          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-1.5 mt-1">
                            <AlertCircle className="w-3 h-3 inline mr-1 text-yellow-600" />
                            <span className="text-yellow-800">{occ.adjusted_reason}</span>
                          </div>
                        )}
                        {occ.original_scheduled_date && occ.is_holiday_adjusted && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Originally:</span> {format(new Date(occ.original_scheduled_date), 'MMM dd, yyyy')}
                          </div>
                        )}
                        <div className="text-xs">
                          <span className="font-medium">Category:</span> {occ.governance_item.category}
                        </div>
                        <div className={cn("text-xs font-medium", statusTextColors[occ.status])}>
                          Status: {occ.status}
                        </div>
                        {occ.governance_item.owner_name && (
                          <div className="text-xs">
                            <span className="font-medium">Owner:</span> {occ.governance_item.owner_name}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Show more indicator */}
              {dayOccurrences.length > 4 && (
                <div className="text-xs text-primary hover:text-primary/80 font-medium mt-2 pt-2 border-t cursor-pointer">
                  +{dayOccurrences.length - 4} more items
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
};
