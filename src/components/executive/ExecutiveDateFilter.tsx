import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface ExecutiveDateFilterProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

type PresetKey = 'today' | 'this-week' | 'this-month' | 'last-30-days' | 'last-month' | 'custom';

export function ExecutiveDateFilter({ dateRange, onDateRangeChange }: ExecutiveDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>('this-month');

  const presets: { key: PresetKey; label: string; getRange: () => { from: Date; to: Date } }[] = [
    { 
      key: 'today', 
      label: 'Today',
      getRange: () => ({ from: new Date(), to: new Date() })
    },
    { 
      key: 'this-week', 
      label: 'This Week',
      getRange: () => ({ 
        from: startOfWeek(new Date(), { weekStartsOn: 1 }), 
        to: endOfWeek(new Date(), { weekStartsOn: 1 }) 
      })
    },
    { 
      key: 'this-month', 
      label: 'This Month',
      getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
    },
    { 
      key: 'last-30-days', 
      label: 'Last 30 Days',
      getRange: () => ({ from: subDays(new Date(), 30), to: new Date() })
    },
    { 
      key: 'last-month', 
      label: 'Last Month',
      getRange: () => ({ 
        from: startOfMonth(subMonths(new Date(), 1)), 
        to: endOfMonth(subMonths(new Date(), 1)) 
      })
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.key);
    const range = preset.getRange();
    onDateRangeChange(range);
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setActivePreset('custom');
      onDateRangeChange({ from: range.from, to: range.to });
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Preset buttons */}
      <div className="hidden xl:flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {presets.map(preset => (
          <Button
            key={preset.key}
            variant={activePreset === preset.key ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "text-xs 3xl:text-sm px-2 3xl:px-3 h-7 3xl:h-8",
              activePreset === preset.key && "bg-background shadow-sm"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Calendar picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className={cn(
              "justify-start text-left font-normal gap-1.5 sm:gap-2",
              "min-w-[140px] sm:min-w-[180px] md:min-w-[200px]",
              "h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">
              {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
            </span>
            <span className="xs:hidden">
              {format(dateRange.from, "MM/dd")} - {format(dateRange.to, "MM/dd")}
            </span>
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={4}>
          <div className="flex flex-col sm:flex-row">
            {/* Preset list for mobile/tablet */}
            <div className="xl:hidden border-b sm:border-b-0 sm:border-r p-2 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
              {presets.map(preset => (
                <Button
                  key={preset.key}
                  variant={activePreset === preset.key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    handlePresetClick(preset);
                    setOpen(false);
                  }}
                  className="justify-start text-xs whitespace-nowrap flex-shrink-0"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleCustomDateChange}
              numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
              className="p-2 sm:p-3"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
