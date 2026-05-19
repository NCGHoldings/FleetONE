import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download } from "lucide-react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from 'xlsx-js-style';

interface ARExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

interface ExportColumn {
  key: string;
  label: string;
  selected: boolean;
}

export function ARExportModal({ isOpen, onClose, data }: ARExportModalProps) {
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const [dateFilterType, setDateFilterType] = useState<'invoice_date' | 'due_date'>('invoice_date');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [columns, setColumns] = useState<ExportColumn[]>([
    { key: 'invoice_number', label: 'Invoice #', selected: true },
    { key: 'legacy_number', label: 'Legacy Number', selected: false },
    { key: 'customer_name', label: 'Customer', selected: true },
    { key: 'customer_code', label: 'Customer Code', selected: false },
    { key: 'student_name', label: 'Student Name', selected: true },
    { key: 'route_branch', label: 'Route/Branch', selected: true },
    { key: 'bus_no', label: 'Bus No.', selected: true },
    { key: 'category', label: 'Category', selected: true },
    { key: 'invoice_date', label: 'Invoice Date', selected: true },
    { key: 'due_date', label: 'Due Date', selected: true },
    { key: 'total_amount', label: 'Amount (LKR)', selected: true },
    { key: 'tax_amount', label: 'VAT Allocation (LKR)', selected: true },
    { key: 'paid_amount', label: 'Paid (LKR)', selected: true },
    { key: 'balance', label: 'Balance (LKR)', selected: true },
    { key: 'status', label: 'Status', selected: true },
    { key: 'notes', label: 'Notes', selected: false },
  ]);

  const toggleColumn = (key: string) => {
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

  // Sri Lankan timezone offset: UTC+5:30
  const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  const toSLDate = (utcDate: Date): Date => {
    return new Date(utcDate.getTime() + SL_OFFSET_MS);
  };

  const getSLToday = (): Date => {
    const now = toSLDate(new Date());
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const setPreset = (preset: 'today' | 'this_week' | 'this_month' | 'all') => {
    const today = getSLToday();
    switch (preset) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'this_week':
        setDateRange({ from: startOfWeek(today, { weekStartsOn: 1 }), to: today });
        break;
      case 'this_month':
        setDateRange({ from: startOfMonth(today), to: today });
        break;
      case 'all':
        setDateRange({});
        break;
    }
  };

  const filterDataByDateRange = (data: any[]) => {
    if (!dateRange.from && !dateRange.to) return data;
    
    return data.filter(inv => {
      const dateStr = dateFilterType === 'invoice_date' ? inv.invoice_date : inv.due_date;
      if (!dateStr) return false;
      
      const rawDate = new Date(dateStr);
      const compareDate = toSLDate(rawDate);

      const fromDate = dateRange.from || dateRange.to!;
      const toDate = dateRange.to || dateRange.from!;

      const fromStart = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0);
      const toEnd = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);

      return compareDate >= fromStart && compareDate <= toEnd;
    });
  };

  const applyFilters = (data: any[]) => {
    return data.filter(inv => {
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const catName = inv.bus_categories?.name || 'Uncategorized';
      const matchesCategory = categoryFilter === 'all' || catName === categoryFilter;
      
      return matchesStatus && matchesCategory;
    });
  };

  const formatValue = (inv: any, key: string): string => {
    switch (key) {
      case 'invoice_number': return inv.invoice_number || '';
      case 'legacy_number': return inv.legacy_number || '';
      case 'customer_name': return inv.customers?.customer_name || '';
      case 'customer_code': return inv.customers?.customer_code || '';
      case 'student_name': return inv.school_ar_invoices?.[0]?.school_students?.student_name || '';
      case 'route_branch': return inv.school_ar_invoices?.[0]?.school_students?.school_location || inv.school_ar_invoices?.[0]?.school_students?.route || '';
      case 'bus_no': return inv.bus_no || inv.school_ar_invoices?.[0]?.school_students?.bus_reg_no || '';
      case 'category': return inv.bus_categories?.name || '';
      case 'invoice_date': return inv.invoice_date ? format(new Date(inv.invoice_date), 'yyyy-MM-dd') : '';
      case 'due_date': return inv.due_date ? format(new Date(inv.due_date), 'yyyy-MM-dd') : '';
      case 'total_amount': return Number(inv.total_amount || 0).toLocaleString();
      case 'tax_amount': return Number(inv.tax_amount || 0).toLocaleString();
      case 'paid_amount': return Number(inv.paid_amount || 0).toLocaleString();
      case 'balance': return Number(inv.balance || 0).toLocaleString();
      case 'status': return String(inv.status || '').toUpperCase();
      case 'notes': return inv.notes || '';
      default: return '';
    }
  };

  const exportToExcel = () => {
    let processedData = filterDataByDateRange(data);
    processedData = applyFilters(processedData);
    
    const selectedColumns = columns.filter(col => col.selected);
    
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column to export');
      return;
    }
    
    const wb = XLSX.utils.book_new();
    const highlightedColumns = new Set(['total_amount', 'paid_amount', 'balance', 'status']);

    const headers = selectedColumns.map(col => {
      const isHighlighted = highlightedColumns.has(col.key);
      return {
        v: col.label,
        t: 's',
        s: {
          font: { bold: true, color: isHighlighted ? { rgb: '7C2D12' } : undefined },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: isHighlighted ? 'FEF3C7' : 'FFFFFF' } },
          border: isHighlighted ? {
            bottom: { style: 'medium', color: { rgb: 'D97706' } }
          } : undefined
        }
      };
    });
    
    const rows = processedData.map((inv, rowIdx) => 
      selectedColumns.map(col => {
        const value = formatValue(inv, col.key);
        const isHighlighted = highlightedColumns.has(col.key);
        const isEvenRow = rowIdx % 2 === 0;

        return {
          v: value,
          t: 's',
          s: {
            fill: { fgColor: { rgb: isHighlighted 
              ? (isEvenRow ? 'FFF7ED' : 'FFEDD5')
              : (isEvenRow ? 'FFFFFF' : 'E3F2FD')
            }},
            font: isHighlighted && col.key !== 'status' ? { bold: true } : undefined,
          }
        };
      })
    );
    
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!cols'] = selectedColumns.map(col => {
      if (col.key === 'invoice_number' || col.key === 'legacy_number') return { wch: 20 };
      if (col.key === 'customer_name' || col.key === 'student_name') return { wch: 30 };
      if (col.key === 'route_branch') return { wch: 20 };
      if (col.key.includes('date')) return { wch: 15 };
      if (col.key === 'notes') return { wch: 40 };
      return { wch: 15 };
    });
    
    XLSX.utils.book_append_sheet(wb, ws, 'AR Invoices');
    const filename = `AR_Invoices_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    toast.success('Excel file exported successfully');
    onClose();
  };

  const uniqueStatuses = ['all', ...Array.from(new Set(data.map(d => d.status).filter(Boolean)))];
  const uniqueCategories = ['all', ...Array.from(new Set(data.map(d => d.bus_categories?.name || 'Uncategorized').filter(Boolean)))];

  let filteredData = filterDataByDateRange(data);
  filteredData = applyFilters(filteredData);
  const filteredCount = filteredData.length;
  const selectedCount = columns.filter(col => col.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export AR Invoices
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Filter By Date</Label>
            <RadioGroup value={dateFilterType} onValueChange={(value) => setDateFilterType(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="invoice_date" id="invoice_date" />
                <Label htmlFor="invoice_date" className="font-normal">Invoice Date</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="due_date" id="due_date" />
                <Label htmlFor="due_date" className="font-normal">Due Date</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreset('today')}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('this_week')}>This Week</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('this_month')}>This Month</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('all')}>All Time</Button>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium mb-3 block">Date Range</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium mb-3 block">Additional Filters</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : String(status).toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Select Columns</Label>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="outline" size="sm" onClick={selectNone}>Select None</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {columns.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox id={column.key} checked={column.selected} onCheckedChange={() => toggleColumn(column.key)} />
                  <Label htmlFor={column.key} className="text-sm font-normal cursor-pointer">{column.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/20 p-4 rounded-lg space-y-1">
            <div className="text-sm text-muted-foreground">
              <div className="font-medium">Export Summary:</div>
              <div>Records to export: <span className="font-semibold">{filteredCount}</span> of {data.length}</div>
              <div>Selected columns: <span className="font-semibold">{selectedCount}</span> of {columns.length}</div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={exportToExcel} disabled={selectedCount === 0 || filteredCount === 0}>
              <Download className="w-4 h-4 mr-2" /> Export to Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
