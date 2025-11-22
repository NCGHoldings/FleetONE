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

  // Fetch multi-date data when range mode is active - FETCH ALL DATA WITHOUT FILTERING
  const { data: multiDateData, isLoading: isLoadingMultiDate } = useQuery({
    queryKey: ['gl-multi-date-data', customDateRange],
    queryFn: async () => {
      if (!customDateRange?.from || !customDateRange?.to) return null;

      const startDate = format(customDateRange.from, 'yyyy-MM-dd');
      const endDate = format(customDateRange.to, 'yyyy-MM-dd');

      console.log('🔍 GL Export Debug - Starting Data Fetch');
      console.log('📅 Date Range:', startDate, 'to', endDate);

      // Fetch ALL trips and expenses in date range (NO FILTERING YET)
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

      console.log(`📊 Fetched ${trips?.length || 0} total trips from database (UNFILTERED)`);
      const tripsByBusDate: Record<string, number> = {};
      trips?.forEach(trip => {
        const key = `${trip.buses?.bus_no}-${trip.trip_date}`;
        tripsByBusDate[key] = (tripsByBusDate[key] || 0) + (trip.income || 0);
        console.log(`  📦 Trip: ${trip.buses?.bus_no} on ${trip.trip_date} - Revenue: Rs.${trip.income || 0}`);
      });
      console.log('📊 Raw data summary by bus-date:', tripsByBusDate);

      const { data: expenses, error: expensesError } = await supabase
        .from('daily_bus_expenses')
        .select(`
          *,
          buses!inner(id, bus_no)
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (expensesError) throw expensesError;

      console.log(`💰 Fetched ${expenses?.length || 0} total expense records from database (UNFILTERED)`);

      // Return unfiltered data - filtering will happen in filteredMultiDateData useMemo
      return { trips: trips || [], expenses: expenses || [] };
    },
    enabled: open && dateSelectionMode === 'range' && !!customDateRange?.from && !!customDateRange?.to,
  });

  // Filter the fetched data based on date-wise bus selection
  const filteredMultiDateData = useMemo(() => {
    if (!multiDateData || dateSelectionMode !== 'range') return null;

    console.log('🔍 Starting Post-Fetch Filtering');
    console.log('🚌 dateWiseBusSelection:', JSON.stringify(dateWiseBusSelection, null, 2));

    const filteredTrips = multiDateData.trips.filter(trip => {
      const tripDate = format(new Date(trip.trip_date), 'yyyy-MM-dd');
      const busNo = trip.buses?.bus_no;
      const isSelected = !!busNo && !!dateWiseBusSelection[tripDate]?.includes(busNo);
      
      console.log(`  ${isSelected ? '✅' : '❌'} Trip: ${busNo} on ${tripDate} - Rs.${trip.income || 0}`);
      
      return isSelected;
    });

    const filteredExpenses = multiDateData.expenses.filter(expense => {
      const expenseDate = format(new Date(expense.expense_date), 'yyyy-MM-dd');
      const busNo = expense.buses?.bus_no;
      const isSelected = !!busNo && !!dateWiseBusSelection[expenseDate]?.includes(busNo);
      
      console.log(`  ${isSelected ? '✅' : '❌'} Expense: ${busNo} on ${expenseDate}`);
      
      return isSelected;
    });

    console.log(`✅ Filtering Complete: ${filteredTrips.length} trips, ${filteredExpenses.length} expenses`);
    console.log('💰 Filtered trip details:');
    filteredTrips.forEach(trip => {
      console.log(`  ${trip.buses?.bus_no} on ${trip.trip_date}: Rs.${trip.income || 0}`);
    });

    return { trips: filteredTrips, expenses: filteredExpenses };
  }, [multiDateData, dateSelectionMode, dateWiseBusSelection]);

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
    if (dateSelectionMode === 'range' && filteredMultiDateData) {
      // Aggregate multi-date FILTERED data by bus
      console.log('🔄 Aggregating filtered multi-date data...');
      return aggregateMultiDateDataByBus(filteredMultiDateData.trips, filteredMultiDateData.expenses);
    }
    
    // Filter single-date data by selected buses
    if (selectedBuses.length > 0 && selectedBuses.length < availableBuses.length) {
      return busSummaries.filter(s => selectedBuses.includes(s.bus_no));
    }
    
    return busSummaries;
  }, [dateSelectionMode, filteredMultiDateData, busSummaries, selectedBuses, availableBuses]);

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

  // Calculate detailed breakdown for preview (date-wise, bus-wise)
  type DateBusBreakdown = Record<
    string, // '2025-11-17'
    Record<
      string, // 'ND 9817'
      {
        tripCount: number;
        revenue: number;
        fuel: number;
        otherExpenses: number;
        totalExpenses: number;
      }
    >
  >;

  const dateBusBreakdown = useMemo<DateBusBreakdown | null>(() => {
    if (!filteredMultiDateData || dateSelectionMode !== 'range') return null;

    console.log('📊 Calculating date-bus breakdown for preview...');
    const breakdown: DateBusBreakdown = {};

    // 1) Revenue by date + bus
    filteredMultiDateData.trips.forEach(trip => {
      const dateStr = format(new Date(trip.trip_date), 'yyyy-MM-dd');
      const busNo = trip.buses?.bus_no;
      if (!busNo) return;

      if (!breakdown[dateStr]) breakdown[dateStr] = {};
      if (!breakdown[dateStr][busNo]) {
        breakdown[dateStr][busNo] = {
          tripCount: 0,
          revenue: 0,
          fuel: 0,
          otherExpenses: 0,
          totalExpenses: 0,
        };
      }

      breakdown[dateStr][busNo].tripCount += 1;
      breakdown[dateStr][busNo].revenue += Number(trip.income || 0);
    });

    // 2) Expenses by date + bus
    filteredMultiDateData.expenses.forEach(expense => {
      const dateStr = format(new Date(expense.expense_date), 'yyyy-MM-dd');
      const busNo = expense.buses?.bus_no;
      if (!busNo) return;

      if (!breakdown[dateStr]) breakdown[dateStr] = {};
      if (!breakdown[dateStr][busNo]) {
        breakdown[dateStr][busNo] = {
          tripCount: 0,
          revenue: 0,
          fuel: 0,
          otherExpenses: 0,
          totalExpenses: 0,
        };
      }

      const fuel = Number(expense.fuel_cost || 0);
      const allKeys = [
        'repair','tyre_tube','salary','police','food','emission_fitness',
        'permits_renewal','staff_accommodation','highway_charges',
        'accident_compensation','parking','log_sheet','vehicle_hire',
        'ntc','runner','short_misc','temporary_permit','body_wash',
        'legal_court','other'
      ] as const;

      const other = allKeys.reduce(
        (sum, key) => sum + Number((expense as any)[key] || 0),
        0
      );

      breakdown[dateStr][busNo].fuel += fuel;
      breakdown[dateStr][busNo].otherExpenses += other;
      breakdown[dateStr][busNo].totalExpenses += fuel + other;
    });

    console.log('📊 Breakdown calculated:', breakdown);
    return breakdown;
  }, [filteredMultiDateData, dateSelectionMode]);

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
    console.log(`🔘 Toggling ${busNo} for date ${date}`);
    setDateWiseBusSelection(prev => {
      const currentBuses = prev[date] || [];
      const updated = currentBuses.includes(busNo)
        ? currentBuses.filter(b => b !== busNo)
        : [...currentBuses, busNo];
      console.log(`  Before:`, prev);
      console.log(`  After:`, { ...prev, [date]: updated });
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

              {/* Detailed Date & Bus Breakdown */}
              {dateSelectionMode === 'range' && dateBusBreakdown && (
                <div className="pt-2 border-t mt-2 space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">
                    Detailed Breakdown (Verify Before Export):
                  </div>
                  <ScrollArea className="max-h-[250px]">
                    <div className="space-y-3 text-xs">
                      {datesInRange.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const busesForDate = dateBusBreakdown[dateStr];
                        if (!busesForDate || Object.keys(busesForDate).length === 0) return null;

                        return (
                          <div key={dateStr} className="space-y-1">
                            <div className="font-semibold text-primary">
                              📅 {format(date, 'MMM dd, yyyy')}
                            </div>
                            {Object.entries(busesForDate).map(([busNo, stats]) => (
                              <div
                                key={`${dateStr}-${busNo}`}
                                className="flex flex-wrap justify-between gap-2 pl-2 border-l-2 border-primary/20 py-1"
                              >
                                <span className="font-medium min-w-[60px]">{busNo}</span>
                                <span className="text-muted-foreground text-[10px]">
                                  {stats.tripCount} trip{stats.tripCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-green-600 font-medium">
                                  Rev: Rs. {stats.revenue.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                                <span className="text-red-600">
                                  Exp: Rs. {stats.totalExpenses.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                                <span className="text-blue-600 font-medium">
                                  Net: Rs. {(stats.revenue - stats.totalExpenses).toLocaleString(
                                    'en-US',
                                    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                                  )}
                                </span>
                              </div>
                            ))}
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
