import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, RefreshCw, TrendingUp, DollarSign, Bus, Banknote } from 'lucide-react';
import { SpreadsheetHire } from '@/hooks/useSpecialHireSpreadsheetData';
import * as XLSX from 'xlsx';

interface Props {
  hires: SpreadsheetHire[];
  loading: boolean;
  onUpdate: (hireId: string, field: string, value: any) => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'completed'];
const TRIP_STATUS_OPTIONS = ['pending', 'in_progress', 'completed', 'cancelled'];

const formatCurrency = (val: number) => val ? `LKR ${val.toLocaleString()}` : '-';
const formatDate = (val: string) => {
  if (!val) return '-';
  try { return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return val; }
};

// Column group definitions with colors
const COLUMN_GROUPS = [
  { label: 'Hire Info', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200', cols: 15 },
  { label: 'Operations', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200', cols: 9 },
  { label: 'Invoice', color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200', cols: 5 },
  { label: 'Meter / KM', color: 'bg-slate-100 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200', cols: 5 },
  { label: 'Expenses', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200', cols: 8 },
  { label: 'Summary', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200', cols: 7 },
];

export function SpecialHireSpreadsheetCore({ hires, loading, onUpdate, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return hires;
    const q = search.toLowerCase();
    return hires.filter(h =>
      h.quotation_no.toLowerCase().includes(q) ||
      h.customer_name.toLowerCase().includes(q) ||
      h.company_name.toLowerCase().includes(q) ||
      h.assigned_bus_no.toLowerCase().includes(q) ||
      h.assigned_driver_name.toLowerCase().includes(q) ||
      h.status.toLowerCase().includes(q)
    );
  }, [hires, search]);

  // KPIs
  const totalHires = hires.length;
  const totalRevenue = hires.reduce((s, h) => s + h.gross_revenue, 0);
  const totalCollected = hires.reduce((s, h) => s + h.total_paid, 0);
  const totalNetIncome = hires.reduce((s, h) => s + h.net_income, 0);

  const startEdit = useCallback((id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const numericFields = [
      'fuel_cost_actual', 'driver_wages', 'assistant_wages', 'driver_meal_allowance',
      'assistant_meal_allowance', 'wages_total', 'maintenance', 'other_permits_highway', 'buses_deployed',
      'km_trip', 'check_in_meter', 'check_out_meter', 'actual_km',
      'additional_distance_charge', 'additional_hours_charge',
      'invoiced_km', 'invoice_amount', 'discount', 'discount_amount_lkr'
    ];
    let val: any = editValue;
    if (numericFields.includes(field)) val = Number(val) || 0;

    // Auto-compute actual_km when check_in or check_out changes
    if (field === 'check_in_meter' || field === 'check_out_meter') {
      const hire = hires.find(h => h.id === id);
      if (hire) {
        const checkIn = field === 'check_in_meter' ? Number(val) : hire.check_in_meter;
        const checkOut = field === 'check_out_meter' ? Number(val) : hire.check_out_meter;
        if (checkIn > 0 && checkOut > 0) {
          const autoKm = Math.max(0, checkOut - checkIn);
          onUpdate(id, 'actual_km', autoKm);
        }
      }
    }

    // Auto-compute price_after_discount when invoice_amount or discount changes
    if (field === 'discount' || field === 'discount_amount_lkr') {
      onUpdate(id, 'discount_amount_lkr', val);
      setEditingCell(null);
      return;
    }

    onUpdate(id, field, val === '' ? null : val);
    setEditingCell(null);
  }, [editingCell, editValue, onUpdate, hires]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingCell(null);
  }, [commitEdit]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const exportToExcel = useCallback(() => {
    const data = filtered.map((h, i) => ({
      '#': i + 1,
      'Quotation No': h.quotation_no,
      'Status': h.status,
      'Company': h.company_name,
      'Customer': h.customer_name,
      'Phone': h.customer_phone,
      'Route': h.route,
      'Bus Type': h.bus_type_name,
      'No of Buses': h.number_of_buses,
      'Mileage (KM)': h.km_trip,
      'Quotation Amount': h.gross_revenue,
      'Completed Amount': h.total_paid,
      'Date': formatDate(h.pickup_datetime),
      'Special Request': h.special_request,
      'No of Days': h.number_of_days,
      'Buses Deployed': h.buses_deployed,
      'Bus Number': h.assigned_bus_no,
      'Driver': h.assigned_driver_name,
      'Assistant': h.assigned_conductor_name,
      'From': h.pickup_location,
      'To': h.drop_location,
      'Pickup Time': h.pickup_time,
      'Drop Time': h.drop_time,
      'Op Remark': h.operation_remark,
      'Invoice No': h.invoice_number,
      'Invoiced KM': h.invoiced_km,
      'Invoice Amount': h.invoice_amount,
      'Discount': h.discount,
      'After Discount': h.price_after_discount,
      'Check In Meter': h.check_in_meter,
      'Check Out Meter': h.check_out_meter,
      'Actual KM': h.actual_km,
      'Addl Distance Charge': h.additional_distance_charge,
      'Addl Hours Charge': h.additional_hours_charge,
      'Fuel Cost (Actual)': h.fuel_cost_actual,
      'Driver Wages': h.driver_wages,
      'Assistant Wages': h.assistant_wages,
      'Driver Meal': h.driver_meal_allowance,
      'Assistant Meal': h.assistant_meal_allowance,
      'Wages': h.wages_total,
      'Maintenance': h.maintenance,
      'Other (Permit/Highway)': h.other_permits_highway,
      'Net Income': h.net_income,
      'Per Day Buses': h.per_day_total_buses,
      'Advance Payment': h.advance_payment,
      'Advance Date': formatDate(h.advance_payment_date),
      'Balance Payment': h.balance_payment,
      'Balance Date': formatDate(h.balance_payment_date),
      'Remark': h.remark,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Special Hire');
    XLSX.writeFile(wb, `Special_Hire_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [filtered]);

  const renderEditableCell = (hire: SpreadsheetHire, field: string, type: 'text' | 'number' = 'text') => {
    const isEditing = editingCell?.id === hire.id && editingCell?.field === field;
    const value = (hire as any)[field];

    if (isEditing) {
      return (
        <Input
          autoFocus
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="h-6 text-[11px] border-0 bg-primary/5 shadow-none p-0.5 w-full"
        />
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-primary/5 rounded px-0.5 min-h-[24px] flex items-center text-[11px] transition-colors"
        onClick={() => startEdit(hire.id, field, value)}
        title="Click to edit"
      >
        <span>{type === 'number' ? (value || 0).toLocaleString() : (value || '-')}</span>
      </div>
    );
  };

  const renderDropdownCell = (hire: SpreadsheetHire, field: string, options: string[]) => {
    const value = (hire as any)[field];
    return (
      <Select value={value || ''} onValueChange={(v) => onUpdate(hire.id, field, v)}>
        <SelectTrigger className="h-6 text-[11px] border-0 bg-transparent shadow-none p-0.5 min-w-[80px]">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
  };

  // Build visible columns per group
  const hireInfoHeaders = ['#', 'Quotation No', 'Status', 'Company', 'Customer', 'Phone', 'Route', 'Bus Type', 'Buses', 'KM', 'Quot. Amt', 'Paid', 'Date', 'Request', 'Days'];
  const opsHeaders = ['Deployed', 'Bus No', 'Driver', 'Assistant', 'From', 'To', 'Pickup', 'Drop', 'Op Remark'];
  const invoiceHeaders = ['Inv No', 'Inv KM', 'Inv Amt', 'Discount', 'After Disc'];
  const meterHeaders = ['Check In', 'Check Out', 'Actual KM', 'Dist Charge', 'Hrs Charge'];
  const expenseHeaders = ['Fuel', 'Drv Wages', 'Ast Wages', 'Drv Meal', 'Ast Meal', 'Wages', 'Maint.', 'Other'];
  const summaryHeaders = ['Net Income', 'Day Buses', 'Advance', 'Adv Date', 'Balance', 'Bal Date', 'Remark'];

  const allGroupHeaders = [
    { group: COLUMN_GROUPS[0], headers: hireInfoHeaders },
    { group: COLUMN_GROUPS[1], headers: opsHeaders },
    { group: COLUMN_GROUPS[2], headers: invoiceHeaders },
    { group: COLUMN_GROUPS[3], headers: meterHeaders },
    { group: COLUMN_GROUPS[4], headers: expenseHeaders },
    { group: COLUMN_GROUPS[5], headers: summaryHeaders },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Hires</p>
                <p className="text-xl font-bold">{totalHires}</p>
              </div>
              <Bus className="h-5 w-5 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">LKR {(totalRevenue / 1e6).toFixed(1)}M</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-xl font-bold">LKR {(totalCollected / 1e6).toFixed(1)}M</p>
              </div>
              <Banknote className="h-5 w-5 text-emerald-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Income</p>
                <p className={`text-xl font-bold ${totalNetIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  LKR {(totalNetIncome / 1e6).toFixed(1)}M
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search hires..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1">
          <Download className="h-3.5 w-3.5" /> Export Excel
        </Button>
        <div className="flex gap-1 ml-2 flex-wrap">
          {COLUMN_GROUPS.map(g => (
            <button
              key={g.label}
              onClick={() => toggleGroup(g.label)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${g.color} ${collapsedGroups.has(g.label) ? 'opacity-40 line-through' : ''}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {hires.length}</span>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-auto max-h-[75vh] bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
        ) : (
          <table className="w-full text-[11px] border-collapse">
            {/* Group header row */}
            <thead className="sticky top-0 z-20">
              <tr>
                {allGroupHeaders.map(({ group, headers }) => {
                  if (collapsedGroups.has(group.label)) return (
                    <th key={group.label} className={`px-1 py-1 text-center font-bold border-b border-r ${group.color} cursor-pointer`} onClick={() => toggleGroup(group.label)}>
                      {group.label} ▸
                    </th>
                  );
                  return (
                    <th key={group.label} colSpan={headers.length} className={`px-2 py-1 text-center font-bold border-b border-r ${group.color} cursor-pointer`} onClick={() => toggleGroup(group.label)}>
                      {group.label}
                    </th>
                  );
                })}
              </tr>
              {/* Column headers */}
              <tr className="bg-muted/80 backdrop-blur-sm">
                {allGroupHeaders.map(({ group, headers }) => {
                  if (collapsedGroups.has(group.label)) return (
                    <th key={group.label + '-col'} className="px-1 py-1.5 border-b border-r text-muted-foreground text-[10px]">…</th>
                  );
                  return headers.map((h) => (
                    <th key={group.label + '-' + h} className="px-1.5 py-1.5 text-left font-semibold text-muted-foreground border-b border-r whitespace-nowrap select-none">
                      {h}
                    </th>
                  ));
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((hire) => (
                <tr key={hire.id} className="border-b hover:bg-muted/30 transition-colors">
                  {/* Hire Info */}
                  {!collapsedGroups.has('Hire Info') ? (
                    <>
                      <td className="px-1.5 py-1 border-r text-muted-foreground">{hire.row_num}</td>
                      <td className="px-1.5 py-1 border-r font-mono font-medium whitespace-nowrap">{hire.quotation_no}</td>
                      <td className="px-1 py-1 border-r">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeClass(hire.status)}`}>
                          {hire.status}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 border-r max-w-[100px] truncate" title={hire.company_name}>{hire.company_name || '-'}</td>
                      <td className="px-1.5 py-1 border-r max-w-[100px] truncate" title={hire.customer_name}>{hire.customer_name}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{hire.customer_phone || '-'}</td>
                      <td className="px-1.5 py-1 border-r max-w-[150px] truncate" title={hire.route}>{hire.route}</td>
                      <td className="px-1.5 py-1 border-r">{hire.bus_type_name || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-center">{hire.number_of_buses}</td>
                      <td className="px-1.5 py-1 border-r text-right">{hire.km_trip.toLocaleString()}</td>
                      <td className="px-1.5 py-1 border-r text-right font-medium">{formatCurrency(hire.gross_revenue)}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.total_paid)}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{formatDate(hire.pickup_datetime)}</td>
                      <td className="px-1.5 py-1 border-r max-w-[100px] truncate" title={hire.special_request}>{hire.special_request || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-center">{hire.number_of_days}</td>
                    </>
                  ) : <td className="px-1 py-1 border-r text-muted-foreground text-center">…</td>}

                  {/* Operations */}
                  {!collapsedGroups.has('Operations') ? (
                    <>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'buses_deployed', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assigned_bus_no')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assigned_driver_name')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assigned_conductor_name')}</td>
                      <td className="px-1.5 py-1 border-r max-w-[100px] truncate">{hire.pickup_location}</td>
                      <td className="px-1.5 py-1 border-r max-w-[100px] truncate">{hire.drop_location}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{hire.pickup_time}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{hire.drop_time}</td>
                      <td className="px-1 py-1 border-r min-w-[80px]">{renderEditableCell(hire, 'operation_remark')}</td>
                    </>
                  ) : <td className="px-1 py-1 border-r text-center text-muted-foreground">…</td>}

                  {/* Invoice */}
                  {!collapsedGroups.has('Invoice') ? (
                    <>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap font-mono">{hire.invoice_number || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-right">{hire.invoiced_km.toLocaleString()}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.invoice_amount)}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.discount)}</td>
                      <td className="px-1.5 py-1 border-r text-right font-medium">{formatCurrency(hire.price_after_discount)}</td>
                    </>
                  ) : <td className="px-1 py-1 border-r text-center text-muted-foreground">…</td>}

                  {/* Meter / KM */}
                  {!collapsedGroups.has('Meter / KM') ? (
                    <>
                      <td className="px-1.5 py-1 border-r text-right">{hire.check_in_meter || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-right">{hire.check_out_meter || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-right">{hire.actual_km || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.additional_distance_charge)}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.additional_hours_charge)}</td>
                    </>
                  ) : <td className="px-1 py-1 border-r text-center text-muted-foreground">…</td>}

                  {/* Expenses */}
                  {!collapsedGroups.has('Expenses') ? (
                    <>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'fuel_cost_actual', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'driver_wages', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assistant_wages', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'driver_meal_allowance', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assistant_meal_allowance', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'wages_total', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'maintenance', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'other_permits_highway', 'number')}</td>
                    </>
                  ) : <td className="px-1 py-1 border-r text-center text-muted-foreground">…</td>}

                  {/* Summary */}
                  {!collapsedGroups.has('Summary') ? (
                    <>
                      <td className={`px-1.5 py-1 border-r text-right font-bold ${hire.net_income >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(hire.net_income)}
                      </td>
                      <td className="px-1.5 py-1 border-r text-center">{hire.per_day_total_buses}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.advance_payment)}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{formatDate(hire.advance_payment_date)}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.balance_payment)}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{formatDate(hire.balance_payment_date)}</td>
                      <td className="px-1 py-1 border-r min-w-[80px]">{renderEditableCell(hire, 'remark')}</td>
                    </>
                  ) : <td className="px-1 py-1 border-r text-center text-muted-foreground">…</td>}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={99} className="text-center py-8 text-muted-foreground">No hires found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
