import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isToday, getDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
                'border rounded-lg p-2 min-h-[100px] flex flex-col',
                isCurrentDay && 'border-primary border-2 bg-primary/5'
              )}
            >
              <div className={cn(
                'text-sm font-medium mb-2',
                isCurrentDay && 'text-primary font-bold'
              )}>
                {format(date, 'd')}
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayOccurrences.map(occ => (
                  <button
                    key={occ.id}
                    onClick={() => onOccurrenceClick(occ)}
                    className="w-full text-left"
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        'w-full text-xs justify-start truncate cursor-pointer hover:opacity-80 transition-opacity',
                        statusColors[occ.status]
                      )}
                    >
                      <span className="truncate">{occ.governance_item.title}</span>
                    </Badge>
                  </button>
                ))}
              </div>

              {dayOccurrences.length > 3 && (
                <div className="text-xs text-muted-foreground mt-1">
                  +{dayOccurrences.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
