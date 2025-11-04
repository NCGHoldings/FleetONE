import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Filter, RotateCcw } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  onFilterChange: (filters: any) => void;
  availableRoutes?: string[];
  availableDrivers?: string[];
  availableBuses?: string[];
}

export default function FilterPanel({ onFilterChange, availableRoutes, availableDrivers, availableBuses }: FilterPanelProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [preset, setPreset] = useState('30days');

  const applyPreset = (presetValue: string) => {
    const now = new Date();
    let from: Date;
    
    switch (presetValue) {
      case 'today':
        from = now;
        break;
      case 'week':
        from = startOfWeek(now);
        break;
      case 'month':
        from = startOfMonth(now);
        break;
      case '7days':
        from = subDays(now, 7);
        break;
      case '30days':
        from = subDays(now, 30);
        break;
      case '90days':
        from = subDays(now, 90);
        break;
      default:
        from = subDays(now, 30);
    }
    
    setDateRange({ from, to: now });
    setPreset(presetValue);
    onFilterChange({ startDate: from, endDate: now });
  };

  const handleReset = () => {
    applyPreset('30days');
  };

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Date Presets */}
      <div className="space-y-2">
        <Label>Date Range Preset</Label>
        <Select value={preset} onValueChange={applyPreset}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Date Range */}
      <div className="space-y-2">
        <Label>Custom Date Range</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM d, yyyy')
                )
              ) : (
                'Pick a date range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                  setPreset('custom');
                  onFilterChange({ startDate: range.from, endDate: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Showing data from {format(dateRange.from, 'MMM d, yyyy')} to {format(dateRange.to, 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  );
}
