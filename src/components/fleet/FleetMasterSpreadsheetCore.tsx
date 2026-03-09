import React, { useState, useRef, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ExpandedFleetRow } from '@/hooks/useFleetMasterSpreadsheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { formatLKR } from "@/lib/accounting-utils";

interface Props {
  rows: ExpandedFleetRow[];
  loading: boolean;
  onUpdate: (rosterId: string, field: string, value: any) => void;
}

const BUS_TYPE_OPTIONS = ['XL', 'Normal', 'Semi', 'A/C', 'Super Luxury'];
const PERMIT_TYPE_OPTIONS = ['XL', 'Normal', 'Semi', 'A/C'];
const REMARK_OPTIONS = ['Running', 'Repair', 'Hire', 'Accident', 'Stopped', 'Sold'];

const TOTAL_COLUMNS = 25;

export function FleetMasterSpreadsheetCore({ rows, loading, onUpdate }: Props) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEdit = (cellKey: string, currentValue: any) => {
    setEditingCell(cellKey);
    setEditValue(String(currentValue ?? ''));
  };

  const commitEdit = (rosterId: string, field: string) => {
    if (editingCell) {
      const numericFields = ['trips_per_day', 'day_target', 'sort_order', 'odometer_start', 'odometer_end', 'fuel_liters'];
      const val = numericFields.includes(field) ? Number(editValue) || 0 : editValue;
      onUpdate(rosterId, field, val);
      setEditingCell(null);
    }
  };

  const cancelEdit = () => setEditingCell(null);

  const handleKeyDown = (e: React.KeyboardEvent, rosterId: string, field: string) => {
    if (e.key === 'Enter') commitEdit(rosterId, field);
    else if (e.key === 'Escape') cancelEdit();
  };

  const renderEditableCell = (row: ExpandedFleetRow, field: string, value: any, type: 'text' | 'number' = 'text') => {
    const cellKey = `${row.id}-${row.trip_sequence}-${field}`;
    if (row.trip_sequence > 1 && !['trip_no', 'odometer_start', 'odometer_end', 'fuel_liters'].includes(field)) {
      return <span className="text-muted-foreground text-sm">↑</span>;
    }

    if (editingCell === cellKey) {
      return (
        <input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit(row.id, field)}
          onKeyDown={(e) => handleKeyDown(e, row.id, field)}
          className="w-full h-8 px-2 text-sm border rounded bg-background focus:ring-1 focus:ring-primary"
        />
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block truncate text-sm"
        onClick={() => startEdit(cellKey, value)}
        title={String(value ?? '')}
      >
        {value || '-'}
      </span>
    );
  };

  const renderDropdownCell = (row: ExpandedFleetRow, field: string, value: string, options: string[]) => {
    if (row.trip_sequence > 1) {
      return <span className="text-muted-foreground text-sm">↑</span>;
    }
    return (
      <Select
        value={value || ''}
        onValueChange={(v) => onUpdate(row.id, field, v)}
      >
        <SelectTrigger className="h-8 text-sm border-0 bg-transparent px-1 focus:ring-0 shadow-none">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const getPerformanceColor = (perf: number, hasFuel: boolean) => {
    if (!hasFuel) return '';
    if (perf >= 0) return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400';
    if (perf > -0.5) return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
    return 'bg-red-100 dark:bg-red-950 text-destructive';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading fleet roster...</span>
      </div>
    );
  }

  // Group rows by section
  const sections = new Map<string, ExpandedFleetRow[]>();
  rows.forEach(row => {
    const sec = row.section || 'OTHER';
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(row);
  });

  let globalIndex = 0;

  return (
    <div className="border rounded-lg overflow-auto max-h-[75vh]">
      <Table>
        <TableHeader className="sticky top-0 z-20">
          {/* Group headers */}
          <TableRow className="border-b-0">
            <TableHead colSpan={2} className="bg-blue-600 text-white text-center text-xs font-bold border-r">Bus Info</TableHead>
            <TableHead colSpan={3} className="bg-blue-500 text-white text-center text-xs font-bold border-r">Route & Type</TableHead>
            <TableHead colSpan={2} className="bg-blue-400 text-white text-center text-xs font-bold border-r">Config</TableHead>
            <TableHead colSpan={1} className="bg-emerald-600 text-white text-center text-xs font-bold border-r">Status</TableHead>
            <TableHead colSpan={2} className="bg-green-600 text-white text-center text-xs font-bold border-r">Crew</TableHead>
            <TableHead colSpan={2} className="bg-cyan-600 text-white text-center text-xs font-bold border-r">Turns</TableHead>
            <TableHead colSpan={8} className="bg-slate-600 text-white text-center text-xs font-bold border-r">Meter / Fuel</TableHead>
            <TableHead colSpan={5} className="bg-amber-500 text-white text-center text-xs font-bold">Financials</TableHead>
          </TableRow>
          {/* Column headers */}
          <TableRow>
            <TableHead className="bg-blue-100 dark:bg-blue-950 text-xs w-10 sticky left-0 z-30">No</TableHead>
            <TableHead className="bg-blue-100 dark:bg-blue-950 text-xs min-w-[70px]">Bus</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-xs min-w-[140px]">Route</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-xs w-14">Trip</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-xs w-20">Bus Type</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-xs w-20">Permit</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-xs w-16">Trips/Day</TableHead>
            <TableHead className="bg-emerald-50 dark:bg-emerald-950 text-xs w-20">Remark</TableHead>
            <TableHead className="bg-green-50 dark:bg-green-950 text-xs min-w-[100px]">Driver</TableHead>
            <TableHead className="bg-green-50 dark:bg-green-950 text-xs min-w-[100px]">Conductor</TableHead>
            <TableHead className="bg-cyan-50 dark:bg-cyan-950 text-xs w-16">Turn 01</TableHead>
            <TableHead className="bg-cyan-50 dark:bg-cyan-950 text-xs w-16">Turn 02</TableHead>
            {/* Meter / Fuel columns */}
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs min-w-[80px]">Model</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs w-20 text-right">Start KM</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs w-20 text-right">End KM</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs w-20 text-right">Mileage</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs w-18 text-right">Fuel (L)</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs w-18 text-right">KM/L</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs w-18 text-right">Std Rate</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-xs w-20 text-right">Perform</TableHead>
            {/* Financial columns */}
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-xs w-20 text-right">Target</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-xs w-24 text-right">Passenger</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-xs w-20 text-right">Luggage</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-xs w-24 text-right">Expenses</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-xs w-24 text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(sections.entries()).map(([sectionName, sectionRows]) => (
            <React.Fragment key={sectionName}>
              {/* Section header */}
              <TableRow>
                <TableCell colSpan={TOTAL_COLUMNS} className="bg-blue-700 text-white font-bold text-xs py-1.5 px-4">
                  {sectionName}
                </TableCell>
              </TableRow>
              {sectionRows.map((row) => {
                globalIndex++;
                const isSubRow = row.trip_sequence > 1;
                const hasFuelData = row.fuel_liters > 0 && row.total_mileage > 0;
                return (
                  <TableRow
                    key={`${row.id}-${row.trip_sequence}`}
                    className={`${isSubRow ? 'bg-muted/30' : ''} hover:bg-accent/30`}
                  >
                    <TableCell className="text-xs font-mono sticky left-0 bg-background z-10">
                      {isSubRow ? '' : globalIndex}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{isSubRow ? '' : row.bus_no}</TableCell>
                    <TableCell className="text-xs">{renderEditableCell(row, 'route_label', row.route_label)}</TableCell>
                    <TableCell className="text-xs font-mono text-center">{row.trip_sequence}</TableCell>
                    <TableCell className="text-xs">{renderDropdownCell(row, 'bus_type', row.bus_type || '', BUS_TYPE_OPTIONS)}</TableCell>
                    <TableCell className="text-xs">{renderDropdownCell(row, 'permit_type', row.permit_type || '', PERMIT_TYPE_OPTIONS)}</TableCell>
                    <TableCell className="text-xs">{renderEditableCell(row, 'trips_per_day', row.trips_per_day, 'number')}</TableCell>
                    <TableCell className="text-xs">{renderDropdownCell(row, 'remark', row.remark || '', REMARK_OPTIONS)}</TableCell>
                    <TableCell className="text-xs">{renderEditableCell(row, 'default_driver', row.default_driver)}</TableCell>
                    <TableCell className="text-xs">{renderEditableCell(row, 'default_conductor', row.default_conductor)}</TableCell>
                    <TableCell className="text-xs">{renderEditableCell(row, 'turn_01_time', row.turn_01_time)}</TableCell>
                    <TableCell className="text-xs">{renderEditableCell(row, 'turn_02_time', row.turn_02_time)}</TableCell>
                    {/* Meter / Fuel cells */}
                    <TableCell className="text-xs text-muted-foreground">{isSubRow ? '' : row.bus_model || '-'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {renderEditableCell(row, 'odometer_start', row.start_meter || '', 'number')}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {renderEditableCell(row, 'odometer_end', row.end_meter || '', 'number')}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {row.total_mileage > 0 ? row.total_mileage.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {renderEditableCell(row, 'fuel_liters', row.fuel_liters || '', 'number')}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {hasFuelData ? row.fuel_consumption.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">
                      {isSubRow ? '' : (row.standard_rate > 0 ? row.standard_rate.toFixed(2) : '-')}
                    </TableCell>
                    <TableCell className={`text-xs text-right font-mono font-bold ${getPerformanceColor(row.performance, hasFuelData)}`}>
                      {hasFuelData ? (row.performance >= 0 ? '+' : '') + row.performance.toFixed(2) : '-'}
                    </TableCell>
                    {/* Financial cells */}
                    <TableCell className="text-xs text-right font-mono">{renderEditableCell(row, 'day_target', row.day_target, 'number')}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-green-700 dark:text-green-400">
                      {row.passenger_income > 0 ? formatLKR(row.passenger_income) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-green-700 dark:text-green-400">
                      {row.luggage_income > 0 ? formatLKR(row.luggage_income) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-destructive">
                      {row.total_expenses > 0 ? formatLKR(row.total_expenses) : '-'}
                    </TableCell>
                    <TableCell className={`text-xs text-right font-mono font-bold ${row.net_income >= 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                      {(row.passenger_income + row.luggage_income + row.total_expenses) > 0 ? formatLKR(row.net_income) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={TOTAL_COLUMNS} className="text-center py-8 text-muted-foreground">
                No buses in roster. Add buses to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
