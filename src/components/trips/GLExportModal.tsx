import { useState, useMemo } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { FileSpreadsheet, Calendar as CalendarIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { BusDailySummary } from '@/hooks/useDailyBusGroupedTrips';
import { generateGLRows, exportToExcel, calculateGLSummary, aggregateMultiDateDataByBus } from '@/lib/gl-export-generator';

interface GLExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busSummaries: BusDailySummary[];
  selectedDate: Date | null;
  dateRange?: { from?: Date; to?: Date };
}

export function GLExportModal({
  open,
  onOpenChange,
  busSummaries,
  selectedDate,
  dateRange,
}: GLExportModalProps) {
  const [exportMode, setExportMode] = useState<'all' | 'filled'>('filled');
  const [dateSelectionMode, setDateSelectionMode] = useState<'single' | 'range'>('single');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>();
  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);
  const [selectAllBuses, setSelectAllBuses] = useState(true);
  const [dateWiseBusSelection, setDateWiseBusSelection] = useState<Record<string, string[]>>({});

  // Get unique buses from busSummaries
  const availableBuses = useMemo(() => {
    return Array.from(new Set(busSummaries.map(s => s.bus_no))).sort();
  }, [busSummaries]);

  // Get dates in range for date-wise selection
  const datesInRange = useMemo(() => {
    if (!customDateRange?.from || !customDateRange?.to) return [];
    return eachDayOfInterval({ start: customDateRange.from, end: customDateRange.to });
  }, [customDateRange]);

  // Initialize selected buses when modal opens
  useMemo(() => {
    if (open && selectAllBuses) {
      setSelectedBuses(availableBuses);
    }
  }, [open, availableBuses, selectAllBuses]);

  // Fetch multi-date data when range mode is active
  const { data: multiDateData, isLoading: isLoadingMultiDate } = useQuery({
    queryKey: ['gl-multi-date-data', customDateRange, dateWiseBusSelection],
    queryFn: async () => {
      if (!customDateRange?.from || !customDateRange?.to) return null;

      const startDate = format(customDateRange.from, 'yyyy-MM-dd');
      const endDate = format(customDateRange.to, 'yyyy-MM-dd');

      // Fetch ALL trips and expenses in date range
      const { data: trips, error: tripsError } = await supabase
        .from('daily_trips')
        .select(`
          *,
          buses!inner(id, bus_no),
          routes(route_name, route_gl_code)
        `)
        .gte('trip_date', startDate)
        .lte('trip_date', endDate);

      if (tripsError) throw tripsError;

      const { data: expenses, error: expensesError } = await supabase
        .from('daily_bus_expenses')
        .select(`
          *,
          buses!inner(id, bus_no)
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (expensesError) throw expensesError;

      // Filter based on date-wise bus selection
      const filteredTrips = trips?.filter(trip => {
        const tripDate = format(new Date(trip.trip_date), 'yyyy-MM-dd');
        const busNo = trip.buses?.bus_no;
        return busNo && dateWiseBusSelection[tripDate]?.includes(busNo);
      }) || [];

      const filteredExpenses = expenses?.filter(expense => {
        const expenseDate = format(new Date(expense.expense_date), 'yyyy-MM-dd');
        const busNo = expense.buses?.bus_no;
        return busNo && dateWiseBusSelection[expenseDate]?.includes(busNo);
      }) || [];

      return { trips: filteredTrips, expenses: filteredExpenses };
    },
    enabled: open && dateSelectionMode === 'range' && !!customDateRange?.from && !!customDateRange?.to && Object.keys(dateWiseBusSelection).length > 0,
  });

  const displayDate = useMemo(() => {
    if (dateSelectionMode === 'range' && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`;
    }
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    if (selectedDate) {
      return format(selectedDate, 'dd/MM/yyyy');
    }
    return 'No date selected';
  }, [selectedDate, dateRange, dateSelectionMode, customDateRange]);

  const exportDate = customDateRange?.from || selectedDate || dateRange?.from || new Date();
  const exportDateRange = dateSelectionMode === 'range' && customDateRange?.from && customDateRange?.to 
    ? { from: customDateRange.from, to: customDateRange.to }
    : undefined;

  // Determine which data to use for GL generation
  const processedBusSummaries = useMemo(() => {
    if (dateSelectionMode === 'range' && multiDateData) {
      // Aggregate multi-date data by bus
      return aggregateMultiDateDataByBus(multiDateData.trips, multiDateData.expenses);
    }
    
    // Filter single-date data by selected buses
    if (selectedBuses.length > 0 && selectedBuses.length < availableBuses.length) {
      return busSummaries.filter(s => selectedBuses.includes(s.bus_no));
    }
    
    return busSummaries;
  }, [dateSelectionMode, multiDateData, busSummaries, selectedBuses, availableBuses]);

  const glRows = useMemo(() => {
    if (!processedBusSummaries.length) return [];
    
    return generateGLRows({
      busSummaries: processedBusSummaries,
      date: exportDate,
      dateRange: exportDateRange,
      exportMode,
    });
  }, [processedBusSummaries, exportDate, exportDateRange, exportMode]);

  const summary = useMemo(() => {
    return calculateGLSummary(glRows);
  }, [glRows]);

  const handleExport = () => {
    if (!processedBusSummaries.length) {
      toast.error('No data available to export');
      return;
    }

    if (dateSelectionMode === 'single' && selectedBuses.length === 0) {
      toast.error('Please select at least one bus');
      return;
    }

    if (dateSelectionMode === 'range' && Object.keys(dateWiseBusSelection).length === 0) {
      toast.error('Please select buses for at least one date');
      return;
    }

    try {
      exportToExcel(glRows, exportDate, exportDateRange);
      
      const dateInfo = exportDateRange 
        ? `${format(exportDateRange.from!, 'dd/MM/yyyy')} - ${format(exportDateRange.to!, 'dd/MM/yyyy')}`
        : format(exportDate, 'dd/MM/yyyy');
      
      const busCount = dateSelectionMode === 'range'
        ? Array.from(new Set(Object.values(dateWiseBusSelection).flat())).length
        : selectedBuses.length;
        
      toast.success(`GL export generated successfully for ${dateInfo} (${busCount} buses)`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate export. Please try again.');
    }
  };

  const handleBusToggle = (busNo: string, checked: boolean) => {
    if (checked) {
      setSelectedBuses(prev => [...prev, busNo]);
    } else {
      setSelectedBuses(prev => prev.filter(b => b !== busNo));
      setSelectAllBuses(false);
    }
  };

  const handleSelectAllToggle = (checked: boolean) => {
    setSelectAllBuses(checked);
    if (checked) {
      setSelectedBuses(availableBuses);
    } else {
      setSelectedBuses([]);
    }
  };

  const handleDateWiseBusToggle = (date: string, busNo: string) => {
    setDateWiseBusSelection(prev => {
      const currentBuses = prev[date] || [];
      const updated = currentBuses.includes(busNo)
        ? currentBuses.filter(b => b !== busNo)
        : [...currentBuses, busNo];
      return { ...prev, [date]: updated };
    });
  };

  const handleDateWiseSelectAll = (date: string) => {
    setDateWiseBusSelection(prev => {
      const currentBuses = prev[date] || [];
      const allSelected = currentBuses.length === availableBuses.length;
      return { ...prev, [date]: allSelected ? [] : [...availableBuses] };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export to GL Format
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Selection</Label>
            <RadioGroup 
              value={dateSelectionMode} 
              onValueChange={(value) => setDateSelectionMode(value as 'single' | 'range')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single-date" />
                <Label htmlFor="single-date" className="font-normal cursor-pointer">
                  Current Date Only ({displayDate})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="range" id="range-date" />
                <Label htmlFor="range-date" className="font-normal cursor-pointer">
                  Multiple Dates (Select Range)
                </Label>
              </div>
            </RadioGroup>

            {dateSelectionMode === 'range' && (
              <div className="pt-2">
                <DateRangePicker 
                  onDateRangeChange={(range) => {
                    setCustomDateRange(range);
                    setDateWiseBusSelection({});
                  }}
                  className="w-full"
                />
                {isLoadingMultiDate && (
                  <p className="text-xs text-muted-foreground mt-2">Loading data...</p>
                )}
              </div>
            )}
          </div>

          {/* Bus Selection - Date Wise for Range Mode */}
          {dateSelectionMode === 'range' && datesInRange.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Buses for Each Date</Label>
              <ScrollArea className="max-h-[400px] rounded-md border p-4">
                <div className="space-y-4">
                  {datesInRange.map((date, index) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const displayDate = format(date, 'MMM dd, yyyy');
                    const selectedForDate = dateWiseBusSelection[dateStr] || [];
                    const allSelectedForDate = selectedForDate.length === availableBuses.length;

                    return (
                      <div key={dateStr} className={`space-y-2 ${index > 0 ? 'pt-4 border-t' : ''}`}>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-primary">
                            📅 {displayDate}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDateWiseSelectAll(dateStr)}
                            className="h-7 text-xs"
                          >
                            {allSelectedForDate ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {availableBuses.map((busNo) => (
                            <div key={`${dateStr}-${busNo}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${dateStr}-${busNo}`}
                                checked={selectedForDate.includes(busNo)}
                                onCheckedChange={() => handleDateWiseBusToggle(dateStr, busNo)}
                              />
                              <Label
                                htmlFor={`${dateStr}-${busNo}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {busNo}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground pl-4">
                          {selectedForDate.length} bus{selectedForDate.length !== 1 ? 'es' : ''} selected
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Bus Selection - Simple for Single Date Mode */}
          {dateSelectionMode === 'single' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Buses ({selectedBuses.length}/{availableBuses.length})</Label>
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectAllBuses}
                    onCheckedChange={handleSelectAllToggle}
                  />
                  <Label htmlFor="select-all" className="font-medium cursor-pointer">
                    Select All Buses
                  </Label>
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {availableBuses.map(busNo => (
                      <div key={busNo} className="flex items-center space-x-2">
                        <Checkbox
                          id={`bus-${busNo}`}
                          checked={selectedBuses.includes(busNo)}
                          onCheckedChange={(checked) => handleBusToggle(busNo, checked as boolean)}
                        />
                        <Label htmlFor={`bus-${busNo}`} className="font-normal cursor-pointer">
                          {busNo}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Export Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Mode</Label>
            <RadioGroup value={exportMode} onValueChange={(value) => setExportMode(value as 'all' | 'filled')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  All Categories (Include all GL codes)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filled" id="filled" />
                <Label htmlFor="filled" className="font-normal cursor-pointer">
                  Only Filled Categories (Exclude zero entries)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview Summary */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Export Preview</Label>
            <div className="rounded-md border bg-card p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date Range:</span>
                <span className="font-medium">{displayDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buses Selected:</span>
                <span className="font-medium">{summary.busCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Revenue:</span>
                <span className="font-medium text-green-600">
                  Rs. {summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Expenses:</span>
                <span className="font-medium text-red-600">
                  Rs. {summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Net Profit:</span>
                <span className="font-medium text-blue-600">
                  Rs. {(summary.totalRevenue - summary.totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total GL Entries:</span>
                <span className="font-medium">{summary.entryCount} rows</span>
              </div>
              
              {/* Show date-wise bus selection summary */}
              {dateSelectionMode === 'range' && Object.keys(dateWiseBusSelection).length > 0 && (
                <div className="pt-2 border-t mt-2">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Buses by Date:</div>
                  <ScrollArea className="max-h-[100px]">
                    <div className="space-y-1 text-xs">
                      {datesInRange.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const buses = dateWiseBusSelection[dateStr] || [];
                        if (buses.length === 0) return null;
                        return (
                          <div key={dateStr} className="flex gap-2">
                            <span className="font-medium text-primary min-w-[80px]">
                              {format(date, 'MMM dd')}:
                            </span>
                            <span className="text-muted-foreground">
                              {buses.join(', ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={
              !processedBusSummaries.length || 
              (dateSelectionMode === 'single' && selectedBuses.length === 0) ||
              (dateSelectionMode === 'range' && Object.keys(dateWiseBusSelection).length === 0) ||
              isLoadingMultiDate
            }
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoadingMultiDate ? 'Loading...' : 'Export to Excel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
