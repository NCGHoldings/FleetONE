import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ExpandedFleetRow } from '@/hooks/useFleetMasterSpreadsheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Check, ChevronsUpDown, MapPin, Settings, Activity, Users, Clock, Gauge, Wallet, Layers } from "lucide-react";
import { formatLKR } from "@/lib/accounting-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

// Section definitions
const FLEET_SECTIONS = [
  { key: 'route_type', label: 'Route & Type', icon: MapPin, color: 'bg-blue-500' },
  { key: 'config', label: 'Config', icon: Settings, color: 'bg-blue-400' },
  { key: 'status', label: 'Status', icon: Activity, color: 'bg-emerald-600' },
  { key: 'crew', label: 'Crew', icon: Users, color: 'bg-green-600' },
  { key: 'turns', label: 'Turns', icon: Clock, color: 'bg-cyan-600' },
  { key: 'meter', label: 'Meter / Fuel', icon: Gauge, color: 'bg-slate-600' },
  { key: 'financials', label: 'Financials', icon: Wallet, color: 'bg-amber-500' },
] as const;

type SectionKey = typeof FLEET_SECTIONS[number]['key'];

export function FleetMasterSpreadsheetCore({ rows, loading, onUpdate, editMode = 'master', selectedDate, availableRoutes = [] }: Props) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [pendingTripsUpdate, setPendingTripsUpdate] = useState<PendingTripsUpdate | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(new Set(FLEET_SECTIONS.map(s => s.key)));
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

  const allSectionsVisible = visibleSections.size === FLEET_SECTIONS.length;
  const singleSectionFocus = visibleSections.size === 1;

  const toggleSection = (key: SectionKey) => {
    setVisibleSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const showAllSections = () => {
    setVisibleSections(new Set(FLEET_SECTIONS.map(s => s.key)));
  };

  const showOnlySection = (key: SectionKey) => {
    setVisibleSections(new Set([key]));
  };

  // Calculate dynamic column count
  const visibleColumnCount = useMemo(() => {
    let count = 2; // No + Bus (always visible)
    if (visibleSections.has('route_type')) count += 3; // Route, Trip, Bus Type, Permit → but Trip is col4 so: Route, Trip, BusType, Permit = 4? Let me recount
    // Route & Type: Route, Trip, Bus Type, Permit = 4 cols
    if (visibleSections.has('route_type')) count += 4;
    // Config: Trips/Day = 1 col  
    if (visibleSections.has('config')) count += 1;
    // Status: Remark = 1 col
    if (visibleSections.has('status')) count += 1;
    // Crew: Driver, Conductor = 2 cols
    if (visibleSections.has('crew')) count += 2;
    // Turns: Turn 01, Turn 02 = 2 cols
    if (visibleSections.has('turns')) count += 2;
    // Meter: Model, Start KM, End KM, Mileage, Fuel, KM/L, Std Rate, Perform = 8 cols
    if (visibleSections.has('meter')) count += 8;
    // Financials: Target, Passenger, Luggage, Expenses, Net = 5 cols
    if (visibleSections.has('financials')) count += 5;
    return count;
  }, [visibleSections]);

  // Recalculate — remove the extra +4 duplication
  const TOTAL_COLUMNS = visibleColumnCount;

  const cellMinWidth = singleSectionFocus ? 'min-w-[160px]' : 'min-w-[100px]';

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      savedScrollRef.current = {
        top: scrollContainerRef.current.scrollTop,
        left: scrollContainerRef.current.scrollLeft,
      };
    }
  }, []);

  useEffect(() => {
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

  const isEditable = (field: string) => {
    if (editMode === 'master') return true;
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
        <div className="relative w-full h-full flex items-center">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => commitEdit(row.id, field)}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            className="absolute left-0 top-1/2 -translate-y-1/2 min-w-[200px] h-10 px-3 text-sm border-2 border-primary rounded bg-background shadow-lg focus:ring-2 focus:ring-primary focus:outline-none z-50"
          />
        </div>
      );
    }

    if (!isEditable(field)) {
      return (
        <span
          className="px-3 py-2.5 rounded block text-sm min-h-[40px] flex items-center text-muted-foreground bg-muted/10 cursor-not-allowed overflow-hidden text-ellipsis whitespace-nowrap"
          title={String(value ?? '') + " (Master Edit Only)"}
        >
          {value || '-'}
        </span>
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-accent/50 px-3 py-2.5 rounded block text-sm min-h-[40px] flex items-center overflow-hidden text-ellipsis whitespace-nowrap"
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
  const [openCrewComboboxFor, setOpenCrewComboboxFor] = useState<string | null>(null);

  const uniqueDrivers = React.useMemo(() => 
    [...new Set(rows.map(r => r.default_driver).filter(Boolean))].sort() as string[], [rows]);
  const uniqueConductors = React.useMemo(() => 
    [...new Set(rows.map(r => r.default_conductor).filter(Boolean))].sort() as string[], [rows]);

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

  const renderCrewCombobox = (row: ExpandedFleetRow, field: 'default_driver' | 'default_conductor', value: string) => {
    if (row.trip_sequence > 1 && !['default_driver', 'default_conductor'].includes(field)) {
      return <span className="text-muted-foreground text-sm">↑</span>;
    }
    if (!isEditable(field)) {
      return (
        <span className="px-3 py-2 rounded block truncate text-sm min-h-[36px] flex items-center text-muted-foreground bg-muted/10 cursor-not-allowed"
          title={String(value ?? '') + " (Master Edit Only)"}>
          {value || '-'}
        </span>
      );
    }
    const names = field === 'default_driver' ? uniqueDrivers : uniqueConductors;
    const cellKey = `${row.id}-${row.trip_sequence}-${field}`;
    const isOpen = openCrewComboboxFor === cellKey;
    const placeholder = field === 'default_driver' ? 'Select driver...' : 'Select conductor...';
    return (
      <Popover open={isOpen} onOpenChange={(open) => setOpenCrewComboboxFor(open ? cellKey : null)}>
        <PopoverTrigger asChild>
          <button className={cn(
            "flex w-full items-center justify-between rounded px-3 py-2 text-sm min-h-[36px] hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary",
            !value && "text-muted-foreground"
          )}>
            <span className="truncate pr-2">{value || placeholder}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search or type new..." />
            <CommandList>
              <CommandEmpty>
                <span className="text-xs text-muted-foreground">No match — type a name and press Enter</span>
              </CommandEmpty>
              <CommandGroup>
                {names.map((name) => (
                  <CommandItem key={name} value={name} onSelect={(currentValue) => {
                    saveScrollPosition();
                    onUpdate(row.id, field, currentValue);
                    setOpenCrewComboboxFor(null);
                  }}>
                    <Check className={cn("mr-2 h-4 w-4", value === name ? "opacity-100" : "opacity-0")} />
                    {name}
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

  // Frozen column dimensions
  const frozenCol1Width = 56; // No
  const frozenCol2Width = 100; // Bus
  const frozenHeaderBg = 'bg-blue-100 dark:bg-blue-950';
  const frozenBodyBg = 'bg-background';
  const frozenSubRowBg = 'bg-muted/30';

  // Group header colSpan calculations
  const groupHeaders: { key: SectionKey | 'identity'; label: string; colSpan: number; color: string }[] = [
    { key: 'identity', label: 'Bus Info', colSpan: 2, color: 'bg-blue-600' },
  ];
  if (visibleSections.has('route_type')) groupHeaders.push({ key: 'route_type', label: 'Route & Type', colSpan: 4, color: 'bg-blue-500' });
  if (visibleSections.has('config')) groupHeaders.push({ key: 'config', label: 'Config', colSpan: 1, color: 'bg-blue-400' });
  if (visibleSections.has('status')) groupHeaders.push({ key: 'status', label: 'Status', colSpan: 1, color: 'bg-emerald-600' });
  if (visibleSections.has('crew')) groupHeaders.push({ key: 'crew', label: 'Crew', colSpan: 2, color: 'bg-green-600' });
  if (visibleSections.has('turns')) groupHeaders.push({ key: 'turns', label: 'Turns', colSpan: 2, color: 'bg-cyan-600' });
  if (visibleSections.has('meter')) groupHeaders.push({ key: 'meter', label: 'Meter / Fuel', colSpan: 8, color: 'bg-slate-600' });
  if (visibleSections.has('financials')) groupHeaders.push({ key: 'financials', label: 'Financials', colSpan: 5, color: 'bg-amber-500' });

  return (
    <>
    {/* Section Toggle Chip Bar */}
    <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
      <Button
        variant={allSectionsVisible ? 'default' : 'outline'}
        size="sm"
        className="h-8 text-xs font-medium gap-1.5"
        onClick={showAllSections}
      >
        <Layers className="h-3.5 w-3.5" />
        All
      </Button>
      <div className="w-px h-6 bg-border" />
      {FLEET_SECTIONS.map(section => {
        const Icon = section.icon;
        const isActive = visibleSections.has(section.key);
        return (
          <div key={section.key} className="relative group">
            <Button
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "h-8 text-xs font-medium gap-1.5 transition-all",
                isActive && section.color + ' text-white border-transparent hover:opacity-90',
                !isActive && 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => toggleSection(section.key)}
            >
              <Icon className="h-3.5 w-3.5" />
              {section.label}
            </Button>
            {/* Show Only badge on hover */}
            {!singleSectionFocus && (
              <button
                className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  showOnlySection(section.key);
                }}
                title={`Show only ${section.label}`}
              >
                1
              </button>
            )}
          </div>
        );
      })}
      {singleSectionFocus && (
        <span className="text-xs text-muted-foreground ml-2 italic">
          Section View — click "All" to show everything
        </span>
      )}
    </div>

    <div ref={scrollContainerRef} className="border rounded-lg overflow-auto max-h-[80vh]">
      <Table>
        <TableHeader className="sticky top-0 z-20">
          {/* Group headers */}
          <TableRow className="border-b-0">
            {groupHeaders.map((gh, idx) => {
              const isIdentity = gh.key === 'identity';
              return (
                <TableHead
                  key={gh.key}
                  colSpan={gh.colSpan}
                  className={cn(
                    gh.color, 'text-white text-center text-sm font-bold',
                    idx < groupHeaders.length - 1 && 'border-r',
                    isIdentity && 'sticky left-0 z-40'
                  )}
                  style={isIdentity ? { width: frozenCol1Width + frozenCol2Width } : undefined}
                >
                  {gh.label}
                </TableHead>
              );
            })}
          </TableRow>
          {/* Column headers */}
          <TableRow>
            {/* Frozen: No */}
            <TableHead
              className={cn(frozenHeaderBg, "text-sm sticky left-0 z-40 py-3")}
              style={{ width: frozenCol1Width, minWidth: frozenCol1Width }}
            >
              No
            </TableHead>
            {/* Frozen: Bus */}
            <TableHead
              className={cn(frozenHeaderBg, "text-sm sticky z-40 py-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]")}
              style={{ left: frozenCol1Width, width: frozenCol2Width, minWidth: frozenCol2Width }}
            >
              Bus
            </TableHead>
            {/* Route & Type */}
            {visibleSections.has('route_type') && (
              <>
                <TableHead className={cn("bg-blue-50 dark:bg-blue-900 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 180 : 180 }}>Route</TableHead>
                <TableHead className="bg-blue-50 dark:bg-blue-900 text-sm w-16 py-3">Trip</TableHead>
                <TableHead className={cn("bg-blue-50 dark:bg-blue-900 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Bus Type</TableHead>
                <TableHead className={cn("bg-blue-50 dark:bg-blue-900 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Permit</TableHead>
              </>
            )}
            {/* Config */}
            {visibleSections.has('config') && (
              <TableHead className={cn("bg-blue-50 dark:bg-blue-900 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 96 }}>Trips/Day</TableHead>
            )}
            {/* Status */}
            {visibleSections.has('status') && (
              <TableHead className={cn("bg-emerald-50 dark:bg-emerald-950 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Remark</TableHead>
            )}
            {/* Crew */}
            {visibleSections.has('crew') && (
              <>
                <TableHead className={cn("bg-green-50 dark:bg-green-950 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 180 : 140 }}>Driver</TableHead>
                <TableHead className={cn("bg-green-50 dark:bg-green-950 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 180 : 140 }}>Conductor</TableHead>
              </>
            )}
            {/* Turns */}
            {visibleSections.has('turns') && (
              <>
                <TableHead className={cn("bg-cyan-50 dark:bg-cyan-950 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 96 }}>Turn 01</TableHead>
                <TableHead className={cn("bg-cyan-50 dark:bg-cyan-950 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 96 }}>Turn 02</TableHead>
              </>
            )}
            {/* Meter / Fuel */}
            {visibleSections.has('meter') && (
              <>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 110 }}>Model</TableHead>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Start KM</TableHead>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>End KM</TableHead>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Mileage</TableHead>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Fuel (L)</TableHead>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>KM/L</TableHead>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Std Rate</TableHead>
                <TableHead className={cn("bg-slate-100 dark:bg-slate-900 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 140 : 112 }}>Perform</TableHead>
              </>
            )}
            {/* Financials */}
            {visibleSections.has('financials') && (
              <>
                <TableHead className={cn("bg-amber-50 dark:bg-amber-950 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 160 : 128 }}>Target</TableHead>
                <TableHead className={cn("bg-amber-50 dark:bg-amber-950 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 160 : 128 }}>Passenger</TableHead>
                <TableHead className={cn("bg-amber-50 dark:bg-amber-950 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 160 : 128 }}>Luggage</TableHead>
                <TableHead className={cn("bg-amber-50 dark:bg-amber-950 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 160 : 128 }}>Expenses</TableHead>
                <TableHead className={cn("bg-amber-50 dark:bg-amber-950 text-sm text-right py-3", cellMinWidth)} style={{ minWidth: singleSectionFocus ? 160 : 128 }}>Net</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(sections.entries()).map(([sectionName, sectionRows]) => (
            <React.Fragment key={sectionName}>
              {/* Section header */}
              <TableRow>
                <TableCell colSpan={TOTAL_COLUMNS} className="bg-blue-700 text-white font-bold text-sm py-2.5 px-4 sticky left-0">
                  {sectionName}
                </TableCell>
              </TableRow>
              {sectionRows.map((row) => {
                globalIndex++;
                const isSubRow = row.trip_sequence > 1;
                const hasFuelData = row.fuel_liters > 0 && row.total_mileage > 0;
                const rowBg = isSubRow ? frozenSubRowBg : frozenBodyBg;
                return (
                  <TableRow
                    key={`${row.id}-${row.trip_sequence}`}
                    className={`${isSubRow ? 'bg-muted/30' : ''} hover:bg-accent/30`}
                  >
                    {/* Frozen: No */}
                    <TableCell
                      className={cn("text-sm font-mono sticky left-0 z-10 py-2 min-h-[40px]", rowBg)}
                      style={{ width: frozenCol1Width, minWidth: frozenCol1Width }}
                    >
                      {isSubRow ? '' : globalIndex}
                    </TableCell>
                    {/* Frozen: Bus */}
                    <TableCell
                      className={cn("text-sm font-semibold sticky z-10 py-2 min-h-[40px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]", rowBg)}
                      style={{ left: frozenCol1Width, width: frozenCol2Width, minWidth: frozenCol2Width }}
                    >
                      {isSubRow ? '' : row.bus_no}
                    </TableCell>
                    {/* Route & Type */}
                    {visibleSections.has('route_type') && (
                      <>
                        <TableCell className="text-sm py-1 min-h-[40px] p-0">{renderRouteCell(row)}</TableCell>
                        <TableCell className="text-sm font-mono text-center py-2 min-h-[40px]">{row.trip_sequence}</TableCell>
                        <TableCell className="text-sm py-1 min-h-[40px]">{renderDropdownCell(row, 'bus_type', row.bus_type || '', BUS_TYPE_OPTIONS)}</TableCell>
                        <TableCell className="text-sm py-1 min-h-[40px]">{renderDropdownCell(row, 'permit_type', row.permit_type || '', PERMIT_TYPE_OPTIONS)}</TableCell>
                      </>
                    )}
                    {/* Config */}
                    {visibleSections.has('config') && (
                      <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'trips_per_day', row.trips_per_day, 'number')}</TableCell>
                    )}
                    {/* Status */}
                    {visibleSections.has('status') && (
                      <TableCell className="text-sm py-1 min-h-[40px]">{renderDropdownCell(row, 'remark', row.remark || '', REMARK_OPTIONS)}</TableCell>
                    )}
                    {/* Crew */}
                    {visibleSections.has('crew') && (
                      <>
                        <TableCell className="text-sm py-1 min-h-[40px] p-0">{renderCrewCombobox(row, 'default_driver', (editMode === 'daily' ? row.driver_name : row.default_driver) || '')}</TableCell>
                        <TableCell className="text-sm py-1 min-h-[40px] p-0">{renderCrewCombobox(row, 'default_conductor', (editMode === 'daily' ? row.conductor_name : row.default_conductor) || '')}</TableCell>
                      </>
                    )}
                    {/* Turns */}
                    {visibleSections.has('turns') && (
                      <>
                        <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'turn_01_time', editMode === 'daily' ? (row as any).daily_turn_01_time ?? row.turn_01_time : row.turn_01_time)}</TableCell>
                        <TableCell className="text-sm py-1 min-h-[40px]">{renderEditableCell(row, 'turn_02_time', editMode === 'daily' ? (row as any).daily_turn_02_time ?? row.turn_02_time : row.turn_02_time)}</TableCell>
                      </>
                    )}
                    {/* Meter / Fuel */}
                    {visibleSections.has('meter') && (
                      <>
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
                      </>
                    )}
                    {/* Financials */}
                    {visibleSections.has('financials') && (
                      <>
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
                      </>
                    )}
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
