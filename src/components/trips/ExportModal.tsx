import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn, formatDateDisplay } from "@/lib/utils";
import { 
  getRevenueAccountCode, 
  getExpenseAccountCode, 
  formatExportAmount 
} from "@/lib/account-codes";

interface Trip {
  id: string;
  trip_no: string;
  bus_no: string;
  route_no: string;
  route: string;
  driver_name?: string;
  conductor_name?: string;
  whatsapp?: string;
  trip_date: string;
  start_time?: string;
  end_time?: string;
  odometer_start?: number;
  odometer_end?: number;
  distance_km: number;
  income: number;
  fuel_cost: number;
  diesel_price_per_liter?: number;
  fuel_liters?: number;
  other_expenses: number;
  total_expenses: number;
  net_income: number;
  km_per_liter: number;
  performance_score?: number;
  status: string;
  income_details?: any;
  other_expenses_details?: any;
}

type ExportFormat = 'summary' | 'detailed' | 'journal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Trip[];
}

interface ExportColumn {
  key: keyof Trip;
  label: string;
  selected: boolean;
}

export function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const [exportFormat, setExportFormat] = useState<ExportFormat>('summary');

  const [columns, setColumns] = useState<ExportColumn[]>([
    { key: 'trip_no', label: 'Trip ID', selected: true },
    { key: 'bus_no', label: 'Bus No.', selected: true },
    { key: 'route_no', label: 'Route No.', selected: true },
    { key: 'route', label: 'Route', selected: true },
    { key: 'driver_name', label: 'Driver', selected: true },
    { key: 'conductor_name', label: 'Conductor', selected: true },
    { key: 'whatsapp', label: 'WhatsApp', selected: false },
    { key: 'trip_date', label: 'Date', selected: true },
    { key: 'start_time', label: 'Start Time', selected: true },
    { key: 'end_time', label: 'End Time', selected: true },
    { key: 'odometer_start', label: 'Odometer Start', selected: false },
    { key: 'odometer_end', label: 'Odometer End', selected: false },
    { key: 'distance_km', label: 'Distance (km)', selected: true },
    { key: 'income', label: 'Income (₨)', selected: true },
    { key: 'fuel_cost', label: 'Fuel Cost (₨)', selected: true },
    { key: 'diesel_price_per_liter', label: 'Diesel Price (₨/L)', selected: false },
    { key: 'fuel_liters', label: 'Fuel Liters (L)', selected: false },
    { key: 'other_expenses', label: 'Other Expenses', selected: true },
    { key: 'total_expenses', label: 'Total Expenses', selected: true },
    { key: 'net_income', label: 'Net Income (₨)', selected: true },
    { key: 'km_per_liter', label: 'km/L', selected: true },
    { key: 'performance_score', label: 'Performance Score', selected: false },
    { key: 'status', label: 'Status', selected: true },
  ]);

  const toggleColumn = (key: keyof Trip) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, selected: !col.selected } : col
    ));
  };

  const selectAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: true })));
  };

  const selectNone = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: false })));
  };

  const filterDataByDate = (data: Trip[]) => {
    if (!dateRange.from && !dateRange.to) return data;

    return data.filter(trip => {
      const tripDate = new Date(trip.trip_date);
      
      if (dateRange.from && dateRange.to) {
        return tripDate >= dateRange.from && tripDate <= dateRange.to;
      } else if (dateRange.from) {
        return tripDate >= dateRange.from;
      } else if (dateRange.to) {
        return tripDate <= dateRange.to;
      }
      
      return true;
    });
  };

  const formatValue = (value: any, key: keyof Trip): string => {
    if (value == null || value === '') return '';
    
    switch (key) {
      case 'trip_date':
        return formatDateDisplay(value);
      case 'income':
      case 'fuel_cost':
      case 'other_expenses':
      case 'total_expenses':
      case 'net_income':
        return `₨ ${Number(value).toLocaleString()}`;
      case 'diesel_price_per_liter':
        return `₨ ${Number(value).toFixed(2)}`;
      case 'distance_km':
      case 'fuel_liters':
      case 'km_per_liter':
        return Number(value).toFixed(2);
      case 'performance_score':
        return `${Number(value).toFixed(1)}%`;
      case 'whatsapp':
        return value ? 'Sent' : 'Not Sent';
      default:
        return String(value);
    }
  };

  const exportToCSV = () => {
    const filteredData = filterDataByDate(data);
    
    if (exportFormat === 'summary') {
      exportSummaryFormat(filteredData);
    } else if (exportFormat === 'detailed') {
      exportDetailedFormat(filteredData);
    } else if (exportFormat === 'journal') {
      exportJournalFormat(filteredData);
    }
  };

  const exportSummaryFormat = (filteredData: Trip[]) => {
    const selectedColumns = columns.filter(col => col.selected);
    
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export');
      return;
    }

    // Create CSV header
    const headers = selectedColumns.map(col => col.label);
    
    // Create CSV rows
    const rows = filteredData.map(trip => 
      selectedColumns.map(col => {
        const value = formatValue(trip[col.key], col.key);
        // Escape commas and quotes in CSV
        return value.toString().includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
      })
    );

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    downloadCSV(csvContent, 'daily_trips_summary');
  };

  const exportDetailedFormat = (filteredData: Trip[]) => {
    const headers = ['Trip No', 'Bus No', 'Date', 'Account Code', 'Account Name', 'Amount', 'Type'];
    const rows: string[][] = [];

    filteredData.forEach(trip => {
      // Process Revenue
      if (trip.income_details) {
        Object.entries(trip.income_details).forEach(([fieldName, amount]) => {
          if (amount && Number(amount) > 0) {
            const accountCode = getRevenueAccountCode(fieldName);
            if (accountCode) {
              rows.push([
                trip.trip_no || '',
                trip.bus_no || '',
                formatDateDisplay(trip.trip_date),
                accountCode.code,
                accountCode.name,
                formatExportAmount(Number(amount)),
                'Revenue'
              ]);
            }
          }
        });
      }

      // Process Expenses
      if (trip.other_expenses_details) {
        Object.entries(trip.other_expenses_details).forEach(([fieldName, amount]) => {
          if (amount && Number(amount) > 0) {
            const accountCode = getExpenseAccountCode(fieldName);
            if (accountCode) {
              rows.push([
                trip.trip_no || '',
                trip.bus_no || '',
                formatDateDisplay(trip.trip_date),
                accountCode.code,
                accountCode.name,
                formatExportAmount(Number(amount)),
                'Expense'
              ]);
            }
          }
        });
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(','))
    ].join('\n');

    downloadCSV(csvContent, 'daily_trips_detailed');
  };

  const exportJournalFormat = (filteredData: Trip[]) => {
    const headers = ['Date', 'Trip No', 'Bus No', 'Account Code', 'Account Name', 'Debit', 'Credit', 'Description'];
    const rows: string[][] = [];

    filteredData.forEach(trip => {
      const description = `Bus ${trip.bus_no} - ${trip.route || 'N/A'}`;

      // Process Revenue (Credit)
      if (trip.income_details) {
        Object.entries(trip.income_details).forEach(([fieldName, amount]) => {
          if (amount && Number(amount) > 0) {
            const accountCode = getRevenueAccountCode(fieldName);
            if (accountCode) {
              rows.push([
                formatDateDisplay(trip.trip_date),
                trip.trip_no || '',
                trip.bus_no || '',
                accountCode.code,
                accountCode.name,
                '', // Debit
                formatExportAmount(Number(amount)), // Credit
                description
              ]);
            }
          }
        });
      }

      // Process Expenses (Debit)
      if (trip.other_expenses_details) {
        Object.entries(trip.other_expenses_details).forEach(([fieldName, amount]) => {
          if (amount && Number(amount) > 0) {
            const accountCode = getExpenseAccountCode(fieldName);
            if (accountCode) {
              rows.push([
                formatDateDisplay(trip.trip_date),
                trip.trip_no || '',
                trip.bus_no || '',
                accountCode.code,
                accountCode.name,
                formatExportAmount(Number(amount)), // Debit
                '', // Credit
                description
              ]);
            }
          }
        });
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(','))
    ].join('\n');

    downloadCSV(csvContent, 'daily_trips_journal');
  };

  const downloadCSV = (csvContent: string, baseFilename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${baseFilename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onClose();
  };

  const filteredCount = filterDataByDate(data).length;
  const selectedCount = columns.filter(col => col.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Daily Trips
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summary" id="summary" />
                <Label htmlFor="summary" className="font-normal">
                  Summary Format - Totals only (current format)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="detailed" id="detailed" />
                <Label htmlFor="detailed" className="font-normal">
                  Detailed Accounting Format - With account codes and line items
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="journal" id="journal" />
                <Label htmlFor="journal" className="font-normal">
                  Journal Entry Format - Debit/Credit columns for accounting software
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">Date Range</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Column Selection - Only for Summary Format */}
          {exportFormat === 'summary' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Select Columns</Label>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {columns.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={column.selected}
                    onCheckedChange={() => toggleColumn(column.key)}
                  />
                  <Label htmlFor={column.key} className="text-sm font-normal">
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Export Summary */}
          <div className="bg-muted/20 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">
              <div>Records to export: {filteredCount} of {data.length}</div>
              {exportFormat === 'summary' && (
                <div>Selected columns: {selectedCount} of {columns.length}</div>
              )}
              {exportFormat !== 'summary' && (
                <div className="mt-1 text-xs">
                  {exportFormat === 'detailed' 
                    ? 'Export will include all revenue and expense line items with account codes'
                    : 'Export will be formatted as journal entries with debit/credit columns'}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={exportToCSV} 
              disabled={exportFormat === 'summary' && selectedCount === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}