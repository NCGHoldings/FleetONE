import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, RefreshCw, TrendingUp, DollarSign, Bus, Banknote, Eye, EyeOff, Settings, FileText, Gauge, Wallet, BarChart3, LayoutGrid } from 'lucide-react';
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

// Section definitions with icons
const SECTIONS = [
  { key: 'Hire Info', icon: Bus, color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200', activeColor: 'bg-blue-500 text-white' },
  { key: 'Operations', icon: Settings, color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200', activeColor: 'bg-green-500 text-white' },
  { key: 'Invoice', icon: FileText, color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200', activeColor: 'bg-cyan-500 text-white' },
  { key: 'Meter / KM', icon: Gauge, color: 'bg-slate-100 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200', activeColor: 'bg-slate-500 text-white' },
  { key: 'Expenses', icon: Wallet, color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200', activeColor: 'bg-orange-500 text-white' },
  { key: 'Summary', icon: BarChart3, color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200', activeColor: 'bg-yellow-500 text-white' },
];

// Frozen column widths
const FROZEN_COL_1 = 40;  // #
const FROZEN_COL_2 = 120; // Quotation No
const FROZEN_COL_3 = 100; // Bus No
const FROZEN_TOTAL = FROZEN_COL_1 + FROZEN_COL_2 + FROZEN_COL_3;

export function SpecialHireSpreadsheetCore({ hires, loading, onUpdate, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set(SECTIONS.map(s => s.key)));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

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

  // Restore scroll position after data changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && (savedScrollRef.current.top || savedScrollRef.current.left)) {
      el.scrollTop = savedScrollRef.current.top;
      el.scrollLeft = savedScrollRef.current.left;
    }
  }, [hires]);

  const saveScrollPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      savedScrollRef.current = { top: el.scrollTop, left: el.scrollLeft };
    }
  }, []);

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
    saveScrollPosition();
    const { id, field } = editingCell;
    const numericFields = [
      'fuel_cost_actual', 'driver_wages', 'assistant_wages', 'driver_meal_allowance',
      'assistant_meal_allowance', 'wages_total', 'maintenance', 'other_permits_highway', 'buses_deployed',
      'km_trip', 'check_in_meter', 'check_out_meter', 'actual_km',
      'additional_distance_charge', 'additional_hours_charge',
      'invoiced_km', 'invoice_amount', 'discount', 'discount_amount_lkr',
      'fuel_price_per_liter'
    ];
    let val: any = editValue;
    if (numericFields.includes(field)) val = Number(val) || 0;

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

    if (field === 'discount' || field === 'discount_amount_lkr') {
      onUpdate(id, 'discount_amount_lkr', val);
      setEditingCell(null);
      return;
    }

    onUpdate(id, field, val === '' ? null : val);
    setEditingCell(null);
  }, [editingCell, editValue, onUpdate, hires, saveScrollPosition]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingCell(null);
  }, [commitEdit]);

  const toggleSection = (key: string) => {
    setVisibleSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev; // Keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const showOnlySection = (key: string) => {
    setVisibleSections(new Set([key]));
  };

  const showAllSections = () => {
    setVisibleSections(new Set(SECTIONS.map(s => s.key)));
  };

  const isSectionVisible = (key: string) => visibleSections.has(key);
  const isSingleSection = visibleSections.size === 1;
  const cellMinW = isSingleSection ? 'min-w-[140px]' : 'min-w-[80px]';

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
      'Buses': h.number_of_buses,
      'KM': h.km_trip,
      'Quot. Amt': h.gross_revenue,
      'Paid': h.total_paid,
      'Date': formatDate(h.pickup_datetime),
      'Request': h.special_request,
      'Days': h.number_of_days,
      'Deployed': h.buses_deployed,
      'Bus No': h.assigned_bus_no,
      'Model': h.bus_model,
      'Year': h.bus_year || '',
      'Capacity': h.bus_capacity || '',
      'Driver': h.assigned_driver_name,
      'Assistant': h.assigned_conductor_name,
      'From': h.pickup_location,
      'To': h.drop_location,
      'Pickup': h.pickup_time,
      'Drop': h.drop_time,
      'Op Remark': h.operation_remark,
      'Inv No': h.invoice_number,
      'Inv KM': h.invoiced_km,
      'Inv Amt': h.invoice_amount,
      'Discount': h.discount,
      'After Disc': h.price_after_discount,
      'Check In': h.check_in_meter,
      'Check Out': h.check_out_meter,
      'Actual KM': h.actual_km,
      'Dist Charge': h.additional_distance_charge,
      'Hrs Charge': h.additional_hours_charge,
      'Fuel Cost': h.fuel_cost_actual,
      'Price/L': h.fuel_price_per_liter,
      'Liters': h.fuel_liters_calculated,
      'KM/L': h.actual_km_per_l,
      'Std KM/L': h.standard_km_per_l,
      'Drv Wages': h.driver_wages,
      'Ast Wages': h.assistant_wages,
      'Drv Meal': h.driver_meal_allowance,
      'Ast Meal': h.assistant_meal_allowance,
      'Wages': h.wages_total,
      'Maint.': h.maintenance,
      'Other': h.other_permits_highway,
      'Net Income': h.net_income,
      'Day Buses': h.per_day_total_buses,
      'Advance': h.advance_payment,
      'Adv Date': formatDate(h.advance_payment_date),
      'Balance': h.balance_payment,
      'Bal Date': formatDate(h.balance_payment_date),
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
      <Select value={value || ''} onValueChange={(v) => { saveScrollPosition(); onUpdate(hire.id, field, v); }}>
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

  const renderFuelEfficiencyCell = (hire: SpreadsheetHire) => {
    const { actual_km_per_l, standard_km_per_l } = hire;
    if (!actual_km_per_l || actual_km_per_l === 0) return <span className="text-muted-foreground">-</span>;

    const isGood = standard_km_per_l > 0 ? actual_km_per_l >= standard_km_per_l : true;
    const colorClass = isGood
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

    return (
      <div className={`font-medium ${colorClass} text-[11px]`}>
        {actual_km_per_l.toFixed(1)}
        {standard_km_per_l > 0 && (
          <span className="text-[9px] ml-0.5 opacity-70">(Std:{standard_km_per_l})</span>
        )}
      </div>
    );
  };

  // Section column definitions
  const hireInfoHeaders = ['Status', 'Company', 'Customer', 'Phone', 'Route', 'Bus Type', 'Buses', 'KM', 'Quot. Amt', 'Paid', 'Date', 'Request', 'Days'];
  const opsHeaders = ['Deployed', 'Bus No', 'Model', 'Year', 'Cap.', 'Driver', 'Assistant', 'From', 'To', 'Pickup', 'Drop', 'Op Remark'];
  const invoiceHeaders = ['Inv No', 'Inv KM', 'Inv Amt', 'Discount', 'After Disc'];
  const meterHeaders = ['Check In', 'Check Out', 'Actual KM', 'Dist Charge', 'Hrs Charge'];
  const expenseHeaders = ['Fuel Cost', 'Price/L', 'Liters', 'KM/L', 'Drv Wages', 'Ast Wages', 'Drv Meal', 'Ast Meal', 'Wages', 'Maint.', 'Other'];
  const summaryHeaders = ['Net Income', 'Day Buses', 'Advance', 'Adv Date', 'Balance', 'Bal Date', 'Remark'];

  const sectionHeaders: Record<string, string[]> = {
    'Hire Info': hireInfoHeaders,
    'Operations': opsHeaders,
    'Invoice': invoiceHeaders,
    'Meter / KM': meterHeaders,
    'Expenses': expenseHeaders,
    'Summary': summaryHeaders,
  };

  const visibleSectionList = SECTIONS.filter(s => isSectionVisible(s.key));

  // Frozen column styles
  const frozenBg = 'bg-card dark:bg-card';
  const frozenHeaderBg = 'bg-muted dark:bg-muted';

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
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {hires.length}</span>
      </div>

      {/* Section Toggle Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg border">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Sections:</span>
        {SECTIONS.map(section => {
          const Icon = section.icon;
          const isActive = isSectionVisible(section.key);
          return (
            <div key={section.key} className="relative group">
              <button
                onClick={() => toggleSection(section.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive ? section.activeColor + ' shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {section.key}
                {isActive ? <Eye className="h-3 w-3 opacity-70" /> : <EyeOff className="h-3 w-3 opacity-50" />}
              </button>
              {/* Show Only on double-click or right area */}
              <button
                onClick={(e) => { e.stopPropagation(); showOnlySection(section.key); }}
                className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold shadow"
                title={`Show only ${section.key}`}
              >
                1
              </button>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={showAllSections}
          className="gap-1 text-xs h-7 ml-1"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> All
        </Button>
      </div>

      {/* Grid */}
      <div ref={scrollContainerRef} className="border rounded-lg overflow-auto max-h-[75vh] bg-card relative">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
        ) : (
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 z-30">
              {/* Group header row */}
              <tr>
                {/* Frozen group header */}
                <th
                  colSpan={3}
                  className={`px-2 py-1 text-center font-bold border-b border-r bg-primary/10 text-primary sticky left-0 z-40`}
                  style={{ minWidth: FROZEN_TOTAL }}
                >
                  Identity
                </th>
                {visibleSectionList.map(section => (
                  <th
                    key={section.key}
                    colSpan={sectionHeaders[section.key].length}
                    className={`px-2 py-1 text-center font-bold border-b border-r ${section.color} cursor-pointer`}
                    onClick={() => toggleSection(section.key)}
                  >
                    {section.key}
                  </th>
                ))}
              </tr>
              {/* Column headers */}
              <tr className={`${frozenHeaderBg} backdrop-blur-sm`}>
                {/* Frozen headers */}
                <th className={`px-1.5 py-1.5 text-left font-semibold text-muted-foreground border-b border-r whitespace-nowrap sticky left-0 z-40 ${frozenHeaderBg}`} style={{ width: FROZEN_COL_1, minWidth: FROZEN_COL_1 }}>#</th>
                <th className={`px-1.5 py-1.5 text-left font-semibold text-muted-foreground border-b border-r whitespace-nowrap sticky z-40 ${frozenHeaderBg}`} style={{ left: FROZEN_COL_1, width: FROZEN_COL_2, minWidth: FROZEN_COL_2 }}>Quotation No</th>
                <th className={`px-1.5 py-1.5 text-left font-semibold text-muted-foreground border-b border-r whitespace-nowrap sticky z-40 ${frozenHeaderBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`} style={{ left: FROZEN_COL_1 + FROZEN_COL_2, width: FROZEN_COL_3, minWidth: FROZEN_COL_3 }}>Bus No</th>
                {/* Section headers */}
                {visibleSectionList.map(section =>
                  sectionHeaders[section.key].map(h => (
                    <th key={section.key + '-' + h} className={`px-1.5 py-1.5 text-left font-semibold text-muted-foreground border-b border-r whitespace-nowrap select-none ${isSingleSection ? 'min-w-[140px]' : ''}`}>
                      {h}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((hire) => (
                <tr key={hire.id} className="border-b hover:bg-muted/30 transition-colors">
                  {/* Frozen identity columns */}
                  <td className={`px-1.5 py-1 border-r text-muted-foreground sticky left-0 z-10 ${frozenBg}`} style={{ width: FROZEN_COL_1, minWidth: FROZEN_COL_1 }}>{hire.row_num}</td>
                  <td className={`px-1.5 py-1 border-r font-mono font-medium whitespace-nowrap text-[10px] sticky z-10 ${frozenBg}`} style={{ left: FROZEN_COL_1, width: FROZEN_COL_2, minWidth: FROZEN_COL_2 }}>{hire.quotation_no}</td>
                  <td className={`px-1 py-1 border-r font-medium whitespace-nowrap sticky z-10 ${frozenBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`} style={{ left: FROZEN_COL_1 + FROZEN_COL_2, width: FROZEN_COL_3, minWidth: FROZEN_COL_3 }}>
                    {hire.bus_id ? (
                      <a href={`/fleet?bus=${hire.bus_id}`} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 text-[11px]" title="Open in Fleet Management">
                        {hire.assigned_bus_no || '-'}
                      </a>
                    ) : (
                      hire.assigned_bus_no || '-'
                    )}
                  </td>

                  {/* Hire Info */}
                  {isSectionVisible('Hire Info') && (
                    <>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderDropdownCell(hire, 'status', STATUS_OPTIONS)}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'company_name')}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'customer_name')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'customer_phone')}</td>
                      <td className="px-1.5 py-1 border-r max-w-[150px] truncate" title={hire.route}>{hire.route}</td>
                      <td className="px-1.5 py-1 border-r">{hire.bus_type_name || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-center">{hire.number_of_buses}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'km_trip', 'number')}</td>
                      <td className="px-1.5 py-1 border-r text-right font-medium">{formatCurrency(hire.gross_revenue)}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.total_paid)}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{formatDate(hire.pickup_datetime)}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'special_request')}</td>
                      <td className="px-1.5 py-1 border-r text-center">{hire.number_of_days}</td>
                    </>
                  )}

                  {/* Operations */}
                  {isSectionVisible('Operations') && (
                    <>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'buses_deployed', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assigned_bus_no')}</td>
                      <td className="px-1.5 py-1 border-r text-muted-foreground">{hire.bus_model || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-muted-foreground text-center">{hire.bus_year || '-'}</td>
                      <td className="px-1.5 py-1 border-r text-muted-foreground text-center">{hire.bus_capacity || '-'}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'assigned_driver_name')}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'assigned_conductor_name')}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'pickup_location')}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'drop_location')}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{hire.pickup_time}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{hire.drop_time}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'operation_remark')}</td>
                    </>
                  )}

                  {/* Invoice */}
                  {isSectionVisible('Invoice') && (
                    <>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'invoice_number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'invoiced_km', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'invoice_amount', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'discount', 'number')}</td>
                      <td className="px-1.5 py-1 border-r text-right font-medium">{formatCurrency(hire.price_after_discount)}</td>
                    </>
                  )}

                  {/* Meter / KM */}
                  {isSectionVisible('Meter / KM') && (
                    <>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'check_in_meter', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'check_out_meter', 'number')}</td>
                      <td className="px-1.5 py-1 border-r text-right">{hire.actual_km || '-'}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'additional_distance_charge', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'additional_hours_charge', 'number')}</td>
                    </>
                  )}

                  {/* Expenses */}
                  {isSectionVisible('Expenses') && (
                    <>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'fuel_cost_actual', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'fuel_price_per_liter', 'number')}</td>
                      <td className="px-1.5 py-1 border-r text-right text-muted-foreground">
                        {hire.fuel_liters_calculated > 0 ? hire.fuel_liters_calculated.toFixed(1) : '-'}
                      </td>
                      <td className="px-1.5 py-1 border-r">{renderFuelEfficiencyCell(hire)}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'driver_wages', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assistant_wages', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'driver_meal_allowance', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'assistant_meal_allowance', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'wages_total', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'maintenance', 'number')}</td>
                      <td className="px-1 py-1 border-r">{renderEditableCell(hire, 'other_permits_highway', 'number')}</td>
                    </>
                  )}

                  {/* Summary */}
                  {isSectionVisible('Summary') && (
                    <>
                      <td className={`px-1.5 py-1 border-r text-right font-bold ${hire.net_income >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(hire.net_income)}
                      </td>
                      <td className="px-1.5 py-1 border-r text-center">{hire.per_day_total_buses}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.advance_payment)}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{formatDate(hire.advance_payment_date)}</td>
                      <td className="px-1.5 py-1 border-r text-right">{formatCurrency(hire.balance_payment)}</td>
                      <td className="px-1.5 py-1 border-r whitespace-nowrap">{formatDate(hire.balance_payment_date)}</td>
                      <td className={`px-1 py-1 border-r ${cellMinW}`}>{renderEditableCell(hire, 'remark')}</td>
                    </>
                  )}
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
