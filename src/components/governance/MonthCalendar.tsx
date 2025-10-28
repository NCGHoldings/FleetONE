import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isToday, getDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GovernanceOccurrence } from '@/hooks/useGovernanceOccurrences';

interface MonthCalendarProps {
  currentDate: Date;
  occurrences: GovernanceOccurrence[];
  onOccurrenceClick: (occurrence: GovernanceOccurrence) => void;
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

  const getOccurrencesForDate = (date: Date) => {
    return occurrences.filter(occ => 
      isSameDay(new Date(occ.scheduled_date), date)
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

  return (
    <div className="h-full flex flex-col">
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
          const isCurrentDay = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'border rounded-lg p-3 min-h-[130px] flex flex-col shadow-sm hover:shadow-md transition-all',
                isCurrentDay && 'border-primary border-2 bg-primary/5 ring-2 ring-primary/20'
              )}
            >
              {/* Date header with occurrence count */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <span className={cn(
                  'text-lg font-semibold',
                  isCurrentDay && 'text-primary font-bold'
                )}>
                  {format(date, 'd')}
                </span>
                {dayOccurrences.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs font-medium">
                    {dayOccurrences.length}
                  </Badge>
                )}
              </div>

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
    </div>
  );
};
