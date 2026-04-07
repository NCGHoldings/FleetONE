import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ExpandedFleetRow } from '@/hooks/useFleetMasterSpreadsheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { formatLKR } from "@/lib/accounting-utils";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

interface PendingTripsUpdate {
  rosterId: string;
  busNo: string;
  currentTrips: number;
  newTrips: number;
}

interface Props {
  rows: ExpandedFleetRow[];
  loading: boolean;
  onUpdate: (rosterId: string, field: string, value: any) => void;
  editMode?: 'master' | 'daily';
  selectedDate?: Date;
  availableRoutes?: any[];
}

const BUS_TYPE_OPTIONS = ['XL', 'Normal', 'Semi', 'A/C', 'Super Luxury'];
const PERMIT_TYPE_OPTIONS = ['XL', 'Normal', 'Semi', 'A/C'];
const REMARK_OPTIONS = ['Running', 'Repair', 'Hire', 'Accident', 'Stopped', 'Sold'];

const TOTAL_COLUMNS = 25;

export function FleetMasterSpreadsheetCore({ rows, loading, onUpdate, editMode = 'master', selectedDate, availableRoutes = [] }: Props) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [pendingTripsUpdate, setPendingTripsUpdate] = useState<PendingTripsUpdate | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Save scroll position before rows change, restore after
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      savedScrollRef.current = {
        top: scrollContainerRef.current.scrollTop,
        left: scrollContainerRef.current.scrollLeft,
      };
    }
  }, []);

  useEffect(() => {
    // Restore scroll position after rows re-render
    if (scrollContainerRef.current && rows.length > 0) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScrollRef.current.top;
          scrollContainerRef.current.scrollLeft = savedScrollRef.current.left;
        }
      });
    }
  }, [rows]);

  const startEdit = (cellKey: string, currentValue: any) => {
    setEditingCell(cellKey);
    setEditValue(String(currentValue ?? ''));
  };

  const commitEdit = (rosterId: string, field: string) => {
    if (editingCell) {
      saveScrollPosition();
      const numericFields = ['trips_per_day', 'day_target', 'sort_order', 'odometer_start', 'odometer_end', 'fuel_liters'];
      const val = numericFields.includes(field) ? Number(editValue) || 0 : editValue;
      
      // Intercept trips_per_day in daily mode for confirmation
      if (editMode === 'daily' && field === 'trips_per_day') {
        const row = rows.find(r => r.id === rosterId && r.trip_sequence === 1);
        const currentTrips = row?.trips_per_day || 0;
        const newTrips = Number(val) || 0;
        if (newTrips !== currentTrips) {
          setPendingTripsUpdate({
            rosterId,
            busNo: row?.bus_no || 'Unknown',
            currentTrips,
            newTrips,
          });
          setEditingCell(null);
          return;
        }
      }
      
      onUpdate(rosterId, field, val);
      setEditingCell(null);
    }
  };

  const confirmTripsUpdate = () => {
    if (pendingTripsUpdate) {
      onUpdate(pendingTripsUpdate.rosterId, 'trips_per_day', pendingTripsUpdate.newTrips);
      setPendingTripsUpdate(null);
    }
  };

  const cancelEdit = () => setEditingCell(null);

  const handleKeyDown = (e: React.KeyboardEvent, rosterId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(rosterId, field);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Determine if a field is allowed to be edited based on the current edit mode
  const isEditable = (field: string) => {
    if (editMode === 'master') return true;
    
    // In Daily mode, only allow editing trip-specific fields and select string fields
    const dailyEditable = [
      'route_label', 'route_id', 'remark', 'default_driver', 'default_conductor',
      'odometer_start', 'odometer_end', 'fuel_liters', 'trips_per_day'
    ];
    return dailyEditable.includes(field);
  };

  const renderEditableCell = (row: ExpandedFleetRow, field: string, value: any, type: 'text' | 'number' = 'text') => {
    const cellKey = `${row.id}-${row.trip_sequence}-${field}`;
    if (row.trip_sequence > 1 && !['trip_no', 'odometer_start', 'odometer_end', 'fuel_liters', 'default_driver', 'default_conductor', 'turn_01_time', 'turn_02_time'].includes(field)) {
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
          className="w-full h-9 px-3 text-sm border-2 border-primary rounded bg-background focus:ring-2 focus:ring-primary focus:outline-none"
        />
      );
    }

    if (!isEditable(field)) {
      return (
        <span
          className="px-3 py-2 rounded block truncate text-sm min-h-[36px] flex items-center text-muted-foreground bg-muted/10 cursor-not-allowed"
          title={String(value ?? '') + " (Master Edit Only)"}
        >
          {value || '-'}
        </span>
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-accent/50 px-3 py-2 rounded block truncate text-sm min-h-[36px] flex items-center"
        onClick={() => startEdit(cellKey, value)}
        title={String(value ?? '')}
      >
        {value || '-'}
      </span>
    );
  };

  const renderDropdownCell = (row: ExpandedFleetRow, field: string, value: string, options: string[]) => {
    if (row.trip_sequence > 1 && !['default_driver', 'default_conductor'].includes(field)) {
      return <span className="text-muted-foreground text-sm">↑</span>;
    }
    
    if (!isEditable(field)) {
      return (
        <span
          className="px-3 py-2 rounded block truncate text-sm min-h-[36px] flex items-center text-muted-foreground bg-muted/10 cursor-not-allowed"
          title={String(value ?? '') + " (Master Edit Only)"}
        >
          {value || '-'}
        </span>
      );
    }

    return (
      <Select
        value={value || ''}
        onValueChange={(v) => {
          saveScrollPosition();
          onUpdate(row.id, field, v);
        }}
      >
        <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2 focus:ring-0 shadow-none hover:bg-accent/50">
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

  const [openRouteComboboxFor, setOpenRouteComboboxFor] = useState<string | null>(null);

  const renderRouteCell = (row: ExpandedFleetRow) => {
    if (row.trip_sequence > 1) {
      return <span className="text-muted-foreground text-sm">↑</span>;
    }

    if (!isEditable('route_label')) {
      return (
        <span
          className="px-3 py-2 rounded block truncate text-sm min-h-[36px] flex items-center text-muted-foreground bg-muted/10 cursor-not-allowed"
          title={String(row.route_label ?? '') + " (Master Edit Only)"}
        >
          {row.route_label || '-'}
        </span>
      );
    }

    const rowKey = `${row.id}-route`;
    const isOpen = openRouteComboboxFor === rowKey;

    return (
      <Popover open={isOpen} onOpenChange={(open) => setOpenRouteComboboxFor(open ? rowKey : null)}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded px-3 py-2 text-sm min-h-[36px] hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary",
              !row.route_label && "text-muted-foreground"
            )}
            onClick={() => {
              if (isOpen) setOpenRouteComboboxFor(null);
            }}
          >
            <span className="truncate pr-2">
              {row.route_label || "Select route..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search route..." />
            <CommandList>
              <CommandEmpty>No route found.</CommandEmpty>
              <CommandGroup>
                {availableRoutes.map((routeItem) => (
                  <CommandItem
                    key={routeItem.id}
                    value={routeItem.route_name}
                    onSelect={(currentValue) => {
                      saveScrollPosition();
                      // We save route_name as route_label
                      onUpdate(row.id, 'route_label', currentValue);
                      setOpenRouteComboboxFor(null);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        row.route_label === routeItem.route_name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {routeItem.route_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
    <>
    <div ref={scrollContainerRef} className="border rounded-lg overflow-auto max-h-[80vh]">
      <Table>
        <TableHeader className="sticky top-0 z-20">
          {/* Group headers */}
          <TableRow className="border-b-0">
            <TableHead colSpan={2} className="bg-blue-600 text-white text-center text-sm font-bold border-r">Bus Info</TableHead>
            <TableHead colSpan={3} className="bg-blue-500 text-white text-center text-sm font-bold border-r">Route & Type</TableHead>
            <TableHead colSpan={2} className="bg-blue-400 text-white text-center text-sm font-bold border-r">Config</TableHead>
            <TableHead colSpan={1} className="bg-emerald-600 text-white text-center text-sm font-bold border-r">Status</TableHead>
            <TableHead colSpan={2} className="bg-green-600 text-white text-center text-sm font-bold border-r">Crew</TableHead>
            <TableHead colSpan={2} className="bg-cyan-600 text-white text-center text-sm font-bold border-r">Turns</TableHead>
            <TableHead colSpan={8} className="bg-slate-600 text-white text-center text-sm font-bold border-r">Meter / Fuel</TableHead>
            <TableHead colSpan={5} className="bg-amber-500 text-white text-center text-sm font-bold">Financials</TableHead>
          </TableRow>
          {/* Column headers */}
          <TableRow>
            <TableHead className="bg-blue-100 dark:bg-blue-950 text-sm w-14 sticky left-0 z-30 py-3">No</TableHead>
            <TableHead className="bg-blue-100 dark:bg-blue-950 text-sm min-w-[90px] py-3">Bus</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-sm min-w-[180px] py-3">Route</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-sm w-16 py-3">Trip</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-sm w-28 py-3">Bus Type</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-sm w-28 py-3">Permit</TableHead>
            <TableHead className="bg-blue-50 dark:bg-blue-900 text-sm w-24 py-3">Trips/Day</TableHead>
            <TableHead className="bg-emerald-50 dark:bg-emerald-950 text-sm w-28 py-3">Remark</TableHead>
            <TableHead className="bg-green-50 dark:bg-green-950 text-sm min-w-[140px] py-3">Driver</TableHead>
            <TableHead className="bg-green-50 dark:bg-green-950 text-sm min-w-[140px] py-3">Conductor</TableHead>
            <TableHead className="bg-cyan-50 dark:bg-cyan-950 text-sm w-24 py-3">Turn 01</TableHead>
            <TableHead className="bg-cyan-50 dark:bg-cyan-950 text-sm w-24 py-3">Turn 02</TableHead>
            {/* Meter / Fuel columns */}
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm min-w-[110px] py-3">Model</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm w-28 text-right py-3">Start KM</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm w-28 text-right py-3">End KM</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm w-28 text-right py-3">Mileage</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm w-28 text-right py-3">Fuel (L)</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm w-28 text-right py-3">KM/L</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm w-28 text-right py-3">Std Rate</TableHead>
            <TableHead className="bg-slate-100 dark:bg-slate-900 text-sm w-28 text-right py-3">Perform</TableHead>
            {/* Financial columns */}
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-sm w-32 text-right py-3">Target</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-sm w-32 text-right py-3">Passenger</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-sm w-32 text-right py-3">Luggage</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-sm w-32 text-right py-3">Expenses</TableHead>
            <TableHead className="bg-amber-50 dark:bg-amber-950 text-sm w-32 text-right py-3">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(sections.entries()).map(([sectionName, sectionRows]) => (
            <React.Fragment key={sectionName}>
              {/* Section header */}
              <TableRow>
                <TableCell colSpan={TOTAL_COLUMNS} className="bg-blue-700 text-white font-bold text-sm py-2.5 px-4">
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
                    <TableCell className="text-sm font-mono sticky left-0 bg-background z-10 py-2 min-h-[40px]">
                      {isSubRow ? '' : globalIndex}
                    </TableCell>
                    <TableCell className="text-sm font-semibold py-2 min-h-[40px]">{isSubRow ? '' : row.bus_no}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px] p-0">{renderRouteCell(row)}</TableCell>
                    <TableCell className="text-sm font-mono text-center py-2 min-h-[40px]">{row.trip_sequence}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderDropdownCell(row, 'bus_type', row.bus_type || '', BUS_TYPE_OPTIONS)}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderDropdownCell(row, 'permit_type', row.permit_type || '', PERMIT_TYPE_OPTIONS)}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'trips_per_day', row.trips_per_day, 'number')}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderDropdownCell(row, 'remark', row.remark || '', REMARK_OPTIONS)}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'default_driver', editMode === 'daily' ? row.driver_name : row.default_driver)}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'default_conductor', editMode === 'daily' ? row.conductor_name : row.default_conductor)}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'turn_01_time', editMode === 'daily' ? (row as any).daily_turn_01_time ?? row.turn_01_time : row.turn_01_time)}</TableCell>
                    <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'turn_02_time', editMode === 'daily' ? (row as any).daily_turn_02_time ?? row.turn_02_time : row.turn_02_time)}</TableCell>
                    {/* Meter / Fuel cells */}
                    <TableCell className="text-sm text-muted-foreground py-2 min-h-[40px]">{isSubRow ? '' : row.bus_model || '-'}</TableCell>
                    <TableCell className="text-sm text-right font-mono py-1 min-h-[40px]">
                      {renderEditableCell(row, 'odometer_start', row.start_meter || '', 'number')}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono py-1 min-h-[40px]">
                      {renderEditableCell(row, 'odometer_end', row.end_meter || '', 'number')}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono font-semibold py-2 min-h-[40px]">
                      {row.total_mileage > 0 ? row.total_mileage.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono py-1 min-h-[40px]">
                      {renderEditableCell(row, 'fuel_liters', row.fuel_liters || '', 'number')}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono py-2 min-h-[40px]">
                      {hasFuelData ? row.fuel_consumption.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono py-1 min-h-[40px]">
                      {isSubRow ? '' : renderEditableCell(row, 'standard_rate', row.standard_rate || '', 'number')}
                    </TableCell>
                    <TableCell className={`text-sm text-right font-mono font-bold py-2 min-h-[40px] ${getPerformanceColor(row.performance, hasFuelData)}`}>
                      {hasFuelData ? (row.performance >= 0 ? '+' : '') + row.performance.toFixed(2) : '-'}
                    </TableCell>
                    {/* Financial cells */}
                    <TableCell className="text-sm text-right font-mono py-1 min-h-[40px]">{renderEditableCell(row, 'day_target', row.day_target, 'number')}</TableCell>
                    <TableCell className="text-sm text-right font-mono text-green-700 dark:text-green-400 py-2 min-h-[40px]">
                      {row.passenger_income > 0 ? formatLKR(row.passenger_income) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-green-700 dark:text-green-400 py-2 min-h-[40px]">
                      {row.luggage_income > 0 ? formatLKR(row.luggage_income) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-destructive py-2 min-h-[40px]">
                      {row.total_expenses > 0 ? formatLKR(row.total_expenses) : '-'}
                    </TableCell>
                    <TableCell className={`text-sm text-right font-mono font-bold py-2 min-h-[40px] ${row.net_income >= 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
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

    {/* Trips/Day confirmation dialog */}
    <AlertDialog open={!!pendingTripsUpdate} onOpenChange={(open) => !open && setPendingTripsUpdate(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Change Trips for {pendingTripsUpdate?.busNo}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                <strong>Date:</strong> {selectedDate ? format(selectedDate, 'EEEE, MMM do yyyy') : 'Today'}
              </p>
              <p>
                <strong>Current:</strong> {pendingTripsUpdate?.currentTrips} trip(s) → <strong>New:</strong> {pendingTripsUpdate?.newTrips} trip(s)
              </p>
              {pendingTripsUpdate && pendingTripsUpdate.newTrips > pendingTripsUpdate.currentTrips && (
                <p className="text-primary font-medium">
                  {pendingTripsUpdate.newTrips - pendingTripsUpdate.currentTrips} new trip record(s) will be created for this date only.
                </p>
              )}
              {pendingTripsUpdate && pendingTripsUpdate.newTrips < pendingTripsUpdate.currentTrips && (
                <p className="text-destructive font-medium">
                  {pendingTripsUpdate.currentTrips - pendingTripsUpdate.newTrips} trip record(s) will be removed (only if they have no income/odometer data).
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Master roster will not be changed.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmTripsUpdate}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
