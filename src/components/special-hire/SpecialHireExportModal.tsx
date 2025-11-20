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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Quotation {
  id: string;
  quotation_no: string;
  created_at: string;
  created_by?: string;
  creator_name?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  company_name?: string;
  hire_type: string;
  num_buses?: number;
  number_of_buses?: number;
  bus_type?: string;
  seating_capacity?: number;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime?: string;
  total_distance_km?: number;
  hire_charge?: number;
  fuel_cost_fuel_only?: number;
  additional_charges?: Array<{ type: string; amount: number; reason?: string }> | string;
  total_additional_charges?: number;
  commission_amount?: number;
  commission_pass_through_amount?: number;
  discount_amount?: number;
  discount_amount_lkr?: number;
  discount_type?: string;
  discount_percentage?: number;
  gross_revenue?: number;
  net_profit?: number;
  status: string;
  approval_status?: string;
  valid_until?: string;
  route_description?: string;
  intermediate_stops?: string;
  percentage_adjustment?: number;
  created_by_name?: string;
}

type DateFilterType = 'created' | 'trip';
type SortOrder = 'created_desc' | 'created_asc' | 'trip_desc' | 'trip_asc' | 'quotation_no' | 'customer_name';

interface SpecialHireExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Quotation[];
}

interface ExportColumn {
  key: keyof Quotation;
  label: string;
  selected: boolean;
}

export function SpecialHireExportModal({ isOpen, onClose, data }: SpecialHireExportModalProps) {
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('created');
  const [sortBy, setSortBy] = useState<SortOrder>('created_desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hireTypeFilter, setHireTypeFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');

  const [columns, setColumns] = useState<ExportColumn[]>([
    { key: 'quotation_no', label: 'Quotation No.', selected: true },
    { key: 'created_at', label: 'Created Date', selected: true },
    { key: 'creator_name', label: 'Created By', selected: true },
    { key: 'customer_name', label: 'Customer Name', selected: true },
    { key: 'customer_phone', label: 'Customer Phone', selected: false },
    { key: 'customer_email', label: 'Customer Email', selected: false },
    { key: 'company_name', label: 'Company Name', selected: false },
    { key: 'hire_type', label: 'Hire Type', selected: true },
    { key: 'number_of_buses', label: 'Number of Buses', selected: true },
    { key: 'bus_type', label: 'Bus Type', selected: true },
    { key: 'seating_capacity', label: 'Seating Capacity', selected: false },
    { key: 'pickup_location', label: 'Pickup Location', selected: true },
    { key: 'drop_location', label: 'Drop Location', selected: true },
    { key: 'pickup_datetime', label: 'Pickup Date/Time', selected: true },
    { key: 'drop_datetime', label: 'Drop Date/Time', selected: false },
    { key: 'total_distance_km', label: 'Total Distance (km)', selected: true },
    { key: 'hire_charge', label: 'Hire Charge (LKR)', selected: true },
    { key: 'fuel_cost_fuel_only', label: 'Fuel Cost (LKR)', selected: true },
    { key: 'total_additional_charges', label: 'Additional Charges (LKR)', selected: false },
    { key: 'commission_pass_through_amount', label: 'Commission Amount (LKR)', selected: false },
    { key: 'discount_amount_lkr', label: 'Discount Amount (LKR)', selected: false },
    { key: 'gross_revenue', label: 'Gross Revenue (LKR)', selected: true },
    { key: 'net_profit', label: 'Net Profit (LKR)', selected: true },
    { key: 'status', label: 'Status', selected: true },
    { key: 'approval_status', label: 'Approval Status', selected: true },
    { key: 'valid_until', label: 'Valid Until', selected: false },
    { key: 'route_description', label: 'Route Description', selected: false },
    { key: 'intermediate_stops', label: 'Intermediate Stops', selected: false },
  ]);

  const toggleColumn = (key: keyof Quotation) => {
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

  const filterDataByDateRange = (data: Quotation[]) => {
    if (!dateRange.from && !dateRange.to) return data;
    
    return data.filter(quotation => {
      const compareDate = dateFilterType === 'created' 
        ? new Date(quotation.created_at)
        : new Date(quotation.pickup_datetime);
      
      if (dateRange.from && dateRange.to) {
        return compareDate >= dateRange.from && compareDate <= dateRange.to;
      } else if (dateRange.from) {
        return compareDate >= dateRange.from;
      } else if (dateRange.to) {
        return compareDate <= dateRange.to;
      }
      
      return true;
    });
  };

  const applyFilters = (data: Quotation[]) => {
    return data.filter(quotation => {
      const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
      const matchesHireType = hireTypeFilter === 'all' || quotation.hire_type === hireTypeFilter;
      const matchesApproval = approvalFilter === 'all' || quotation.approval_status === approvalFilter;
      const matchesCreator = creatorFilter === 'all' || quotation.created_by === creatorFilter;
      
      return matchesStatus && matchesHireType && matchesApproval && matchesCreator;
    });
  };

  const sortData = (data: Quotation[]) => {
    const sorted = [...data];
    
    switch (sortBy) {
      case 'created_desc':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'created_asc':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'trip_desc':
        return sorted.sort((a, b) => new Date(b.pickup_datetime).getTime() - new Date(a.pickup_datetime).getTime());
      case 'trip_asc':
        return sorted.sort((a, b) => new Date(a.pickup_datetime).getTime() - new Date(b.pickup_datetime).getTime());
      case 'quotation_no':
        return sorted.sort((a, b) => a.quotation_no.localeCompare(b.quotation_no));
      case 'customer_name':
        return sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
      default:
        return sorted;
    }
  };

  const formatValue = (value: any, key: keyof Quotation): string => {
    if (value == null || value === '') return '';
    
    switch (key) {
      case 'created_at':
      case 'pickup_datetime':
      case 'drop_datetime':
      case 'valid_until':
        return format(new Date(value), 'yyyy-MM-dd HH:mm');
      case 'hire_charge':
      case 'fuel_cost_fuel_only':
      case 'total_additional_charges':
      case 'commission_amount':
      case 'commission_pass_through_amount':
      case 'discount_amount':
      case 'discount_amount_lkr':
      case 'gross_revenue':
      case 'net_profit':
        return `${Number(value).toLocaleString()}`;
      case 'total_distance_km':
        return Number(value).toFixed(2);
      case 'number_of_buses':
      case 'num_buses':
      case 'seating_capacity':
        return String(value);
      case 'additional_charges':
        // Handle complex additional_charges field
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed.map((c: any) => `${c.type}: ${c.amount}`).join('; ');
            }
          } catch {
            return value;
          }
        } else if (Array.isArray(value)) {
          return value.map(c => `${c.type}: ${c.amount}`).join('; ');
        }
        return String(value);
      case 'intermediate_stops':
        // Handle intermediate stops
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed.join('; ');
            }
          } catch {
            return value;
          }
        } else if (Array.isArray(value)) {
          return value.join('; ');
        }
        return String(value);
      default:
        return String(value);
    }
  };

  const exportToCSV = () => {
    // Filter by date range
    let processedData = filterDataByDateRange(data);
    
    // Apply additional filters
    processedData = applyFilters(processedData);
    
    // Sort data
    processedData = sortData(processedData);
    
    // Get selected columns
    const selectedColumns = columns.filter(col => col.selected);
    
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column to export');
      return;
    }
    
    // Create CSV header
    const headers = selectedColumns.map(col => col.label);
    
    // Create CSV rows
    const rows = processedData.map(quotation => 
      selectedColumns.map(col => {
        const value = formatValue(quotation[col.key], col.key);
        // Escape commas and quotes in CSV
        return value.toString().includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
      })
    );
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    downloadCSV(csvContent, `special_hire_quotations_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Export completed successfully');
    onClose();
  };

  // Get unique values for filters
  const uniqueStatuses = ['all', ...Array.from(new Set(data.map(q => q.status)))];
  const uniqueHireTypes = ['all', ...Array.from(new Set(data.map(q => q.hire_type)))];
  const uniqueApprovals = ['all', ...Array.from(new Set(data.map(q => q.approval_status).filter(Boolean)))];
  const uniqueCreators = ['all', ...Array.from(new Set(data.map(q => q.creator_name).filter(Boolean)))];

  // Calculate filtered count
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
            Export Special Hire Quotations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Filter Type Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">Filter By Date</Label>
            <RadioGroup value={dateFilterType} onValueChange={(value) => setDateFilterType(value as DateFilterType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="created" id="created" />
                <Label htmlFor="created" className="font-normal">
                  Created Date
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="trip" id="trip" />
                <Label htmlFor="trip" className="font-normal">
                  Trip Date (Pickup Date/Time)
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

          {/* Sort Order Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">Sort Order</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOrder)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Created Date (Newest First)</SelectItem>
                <SelectItem value="created_asc">Created Date (Oldest First)</SelectItem>
                <SelectItem value="trip_desc">Trip Date (Newest First)</SelectItem>
                <SelectItem value="trip_asc">Trip Date (Oldest First)</SelectItem>
                <SelectItem value="quotation_no">Quotation Number</SelectItem>
                <SelectItem value="customer_name">Customer Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Filters */}
          <div>
            <Label className="text-base font-medium mb-3 block">Additional Filters</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status === 'all' ? 'All Statuses' : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hire Type</Label>
                <Select value={hireTypeFilter} onValueChange={setHireTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueHireTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? 'All Hire Types' : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Approval Status</Label>
                <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueApprovals.map(approval => (
                      <SelectItem key={approval} value={approval}>
                        {approval === 'all' ? 'All Approvals' : approval}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Created By</Label>
                <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCreators.map(creator => (
                      <SelectItem key={creator} value={creator}>
                        {creator === 'all' ? 'All Creators' : creator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Column Selection */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {columns.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={column.selected}
                    onCheckedChange={() => toggleColumn(column.key)}
                  />
                  <Label htmlFor={column.key} className="text-sm font-normal cursor-pointer">
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-muted/20 p-4 rounded-lg space-y-1">
            <div className="text-sm text-muted-foreground">
              <div className="font-medium">Export Summary:</div>
              <div>Records to export: <span className="font-semibold">{filteredCount}</span> of {data.length}</div>
              <div>Selected columns: <span className="font-semibold">{selectedCount}</span> of {columns.length}</div>
              {(dateRange.from || dateRange.to) && (
                <div>Date range: {dateRange.from ? format(dateRange.from, 'PP') : 'Any'} to {dateRange.to ? format(dateRange.to, 'PP') : 'Any'}</div>
              )}
              {(statusFilter !== 'all' || hireTypeFilter !== 'all' || approvalFilter !== 'all' || creatorFilter !== 'all') && (
                <div className="mt-1">
                  <span className="font-medium">Active filters:</span>
                  {statusFilter !== 'all' && ` Status: ${statusFilter}`}
                  {hireTypeFilter !== 'all' && ` | Hire Type: ${hireTypeFilter}`}
                  {approvalFilter !== 'all' && ` | Approval: ${approvalFilter}`}
                  {creatorFilter !== 'all' && ` | Creator: ${creatorFilter}`}
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
              disabled={selectedCount === 0 || filteredCount === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
