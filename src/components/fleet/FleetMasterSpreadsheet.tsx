import React, { useState, useEffect } from 'react';
import { useFleetMasterSpreadsheet, EditMode } from '@/hooks/useFleetMasterSpreadsheet';
import { FleetMasterSpreadsheetCore } from './FleetMasterSpreadsheetCore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw, Plus, FileSpreadsheet, Rocket, Bus, Upload, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatLKR } from '@/lib/accounting-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { FleetExcelImport } from './FleetExcelImport';
import { Input } from '@/components/ui/input';

interface FleetMasterSpreadsheetProps {
  initialDate?: Date;
}

export function FleetMasterSpreadsheet({ initialDate }: FleetMasterSpreadsheetProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [editMode, setEditMode] = useState<EditMode>('master');
  const [dieselPrice, setDieselPrice] = useState<number>(() => {
    const saved = localStorage.getItem('fleet_diesel_price');
    return saved ? Number(saved) : 392; // Default to 392 if not set
  });

  const handleDieselPriceChange = (val: string) => {
    const num = Number(val);
    if (!isNaN(num)) {
      setDieselPrice(num);
      localStorage.setItem('fleet_diesel_price', num.toString());
    }
  };
  
  const { 
    roster,
    expandedRows, 
    availableRoutes,
    routeLeaders,
    loading, 
    kpis, 
    updateField, 
    confirmAndCreateTrips, 
    addRosterEntry, 
    deleteRosterEntry,
    moveRosterEntry,
    bulkAddAllBuses, 
    updateRouteLeaders,
    refetch 
  } = useFleetMasterSpreadsheet(selectedDate, editMode, dieselPrice);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [showAddBus, setShowAddBus] = useState(false);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedRouteLabel, setSelectedRouteLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [showBulkAssignLeader, setShowBulkAssignLeader] = useState(false);
  const [bulkLeaderName, setBulkLeaderName] = useState('');

  const handleToggleRoute = (routeLabel: string) => {
    setSelectedRoutes(prev => 
      prev.includes(routeLabel) 
        ? prev.filter(r => r !== routeLabel)
        : [...prev, routeLabel]
    );
  };

  const handleBulkAssignLeader = async () => {
    if (!bulkLeaderName.trim() || selectedRoutes.length === 0) return;
    await updateRouteLeaders(selectedRoutes, bulkLeaderName.trim());
    setShowBulkAssignLeader(false);
    setSelectedRoutes([]);
    setBulkLeaderName('');
  };

  // Sync date when parent changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const filteredRows = expandedRows.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (row.bus_no && row.bus_no.toLowerCase().includes(q)) ||
      (row.route_label && row.route_label.toLowerCase().includes(q)) ||
      (row.default_driver && row.default_driver.toLowerCase().includes(q)) ||
      (row.default_conductor && row.default_conductor.toLowerCase().includes(q)) ||
      (row.bus_type && row.bus_type.toLowerCase().includes(q)) ||
      (row.remark && row.remark.toLowerCase().includes(q))
    );
  });

  const loadAvailableBuses = async () => {
    const { data } = await supabase
      .from("buses")
      .select("id, bus_no, route, category_id")
      .eq("category_id", "8ba0dd7b-c503-4c3e-86e0-ac68480f3f8c")
      .order("bus_no");
    setAvailableBuses(data || []);
    setShowAddBus(true);
  };

  const handleAddBus = async () => {
    if (!selectedBusId) return;
    await addRosterEntry(selectedBusId, selectedRouteId || undefined, selectedRouteLabel || undefined);
    setShowAddBus(false);
    setSelectedBusId('');
    setSelectedRouteId('');
    setSelectedRouteLabel('');
  };

  const handleAddBusToRoute = async (routeLabel: string) => {
    const route = availableRoutes.find(r => r.route_name === routeLabel);
    if (route) {
      setSelectedRouteId(route.id);
      setSelectedRouteLabel(route.route_name);
    } else {
      setSelectedRouteId('');
      setSelectedRouteLabel(routeLabel === 'Unassigned Route' ? '' : routeLabel);
    }
    await loadAvailableBuses();
  };

  const handleDeleteRosterEntry = (id: string) => {
    if (window.confirm("Are you sure you want to remove this bus from the roster?")) {
      deleteRosterEntry(id);
    }
  };

  const handleCreateTrips = async () => {
    setCreating(true);
    await confirmAndCreateTrips();
    setCreating(false);
  };

  // Calculate eligible trip count per bus to handle cases where some buses have extra trips
  let tripsPending = 0;
  let totalTarget = 0;
  let totalExisting = 0;

  roster.forEach(r => {
    if (r.is_active && r.bus_id && r.remark === 'Running') {
       const busTarget = r.trips_per_day || 1;
       totalTarget += busTarget;
       
       // Count existing trips for this specific bus
       const busExistingTrips = expandedRows.filter(er => er.bus_id === r.bus_id && er.trip_id).length;
       totalExisting += busExistingTrips;
       
       if (busExistingTrips < busTarget) {
         tripsPending += (busTarget - busExistingTrips);
       }
    }
  });

  const isAllTripsCreated = totalTarget > 0 && tripsPending === 0;
  const isPartialTripsCreated = tripsPending > 0 && totalExisting > 0;

  const exportToExcel = () => {
    const data = expandedRows.map((r, i) => ({
      'No': r.trip_sequence === 1 ? i + 1 : '',
      'Bus': r.bus_no,
      'Route': r.route_label || '',
      'Trip': r.trip_sequence,
      'Bus Type': r.bus_type || '',
      'Permit Type': r.permit_type || '',
      'Trips/Day': r.trips_per_day,
      'Remark': r.remark || '',
      'Driver': r.default_driver || '',
      'Conductor': r.default_conductor || '',
      'Turn 01': r.turn_01_time || '',
      'Turn 02': r.turn_02_time || '',
      'Model': r.bus_model || '',
      'Start Meter': r.start_meter || '',
      'End Meter': r.end_meter || '',
      'Total Mileage': r.total_mileage || '',
      'Fuel Liters': r.fuel_liters || '',
      'KM/L': r.fuel_consumption || '',
      'Std Rate': r.standard_rate || '',
      'Performance': r.performance || '',
      'Day Target': r.day_target,
      'Passenger': r.passenger_income,
      'Luggage': r.luggage_income,
      'Total Expenses': r.total_expenses,
      'Net': r.net_income,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fleet Roster');
    XLSX.writeFile(wb, `Fleet-Roster-${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
    toast({ title: "Exported", description: "Excel file downloaded" });
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400">Buses Running</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{kpis.totalBuses}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-xs text-green-600 dark:text-green-400">Total Revenue</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatLKR(kpis.totalRevenue)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-xs text-red-600 dark:text-red-400">Total Expenses</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatLKR(kpis.totalExpenses)}</p>
        </div>
        <div className={`border rounded-lg p-3 ${kpis.netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
          <p className="text-xs text-muted-foreground">Net Income</p>
          <p className={`text-lg font-bold ${kpis.netIncome >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
            {formatLKR(kpis.netIncome)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">Total Mileage</p>
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{kpis.totalMileage.toLocaleString()} km</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <p className="text-xs text-orange-600 dark:text-orange-400">Total Fuel</p>
          <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{kpis.totalFuelLiters.toLocaleString()} L</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 border rounded-md px-2 h-9">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Diesel (LKR):</span>
            <input 
              type="number" 
              className="w-16 h-7 text-sm bg-transparent border-none focus:outline-none font-semibold" 
              value={dieselPrice} 
              onChange={(e) => handleDieselPriceChange(e.target.value)} 
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>

          <div className="flex bg-muted p-1 rounded-md ml-2 border">
            <button
              onClick={() => setEditMode('master')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-sm transition-colors",
                editMode === 'master' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Master Roster
            </button>
            <button
              onClick={() => setEditMode('daily')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-sm transition-colors",
                editMode === 'daily' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Today Only
            </button>
          </div>

          <div className="relative ml-2 w-48 lg:w-64">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bus, driver, route..."
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import Excel
          </Button>

          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Export
          </Button>

          <Button variant="outline" size="sm" onClick={loadAvailableBuses}>
            <Plus className="h-4 w-4 mr-1" /> Add Bus
          </Button>

          {selectedRoutes.length > 0 && (
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => setShowBulkAssignLeader(true)}>
              <Users className="h-4 w-4 mr-1" /> Assign Leader ({selectedRoutes.length})
            </Button>
          )}

          <Button variant="outline" size="sm" disabled={bulkAdding} onClick={async () => {
            setBulkAdding(true);
            await bulkAddAllBuses();
            setBulkAdding(false);
          }}>
            <Bus className="h-4 w-4 mr-1" /> {bulkAdding ? 'Adding...' : 'Bulk Add All'}
          </Button>

          <Button 
            size="sm" 
            onClick={handleCreateTrips} 
            disabled={creating || isAllTripsCreated} 
            className={cn(
               isAllTripsCreated 
                 ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" 
                 : isPartialTripsCreated
                   ? "bg-amber-500 hover:bg-amber-600 text-white"
                   : "bg-green-600 hover:bg-green-700 text-white"
            )}
          >
            {isAllTripsCreated ? (
              <><CheckCircle2 className="h-4 w-4 mr-1" /> Generated ({totalExisting}/{totalTarget})</>
            ) : isPartialTripsCreated ? (
              <><Rocket className="h-4 w-4 mr-1" /> {creating ? 'Creating...' : `Create Remaining (${tripsPending})`}</>
            ) : (
              <><Rocket className="h-4 w-4 mr-1" /> {creating ? 'Creating...' : 'Create Trips'}</>
            )}
          </Button>
        </div>
      </div>

      {/* No Trips Banner */}
      {editMode === 'daily' && totalTarget > 0 && totalExisting === 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">No trips generated for {format(selectedDate, 'MMM do, yyyy')}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">Click "Create Trips" to generate daily trip records before entering income/expense data.</p>
            </div>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateTrips} disabled={creating}>
            <Rocket className="h-4 w-4 mr-1" /> {creating ? 'Creating...' : 'Create Trips'}
          </Button>
        </div>
      )}

      {/* Spreadsheet */}
      <div className={cn("transition-colors rounded-md overflow-hidden", editMode === 'daily' ? 'ring-2 ring-primary/20' : '')}>
        {editMode === 'daily' && (
          <div className="bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold flex items-center">
            Editing Mode: Changes will only apply to {format(selectedDate, 'MMM do')} daily trips.
          </div>
        )}
        <FleetMasterSpreadsheetCore
          rows={filteredRows}
          loading={loading}
          onUpdate={updateField}
          editMode={editMode}
          selectedDate={selectedDate}
          availableRoutes={availableRoutes}
          routeLeaders={routeLeaders}
          selectedRoutes={selectedRoutes}
          onToggleRoute={handleToggleRoute}
          onDelete={handleDeleteRosterEntry}
          onMove={moveRosterEntry}
          onAddBusToRoute={handleAddBusToRoute}
        />
      </div>

      <Dialog open={showBulkAssignLeader} onOpenChange={setShowBulkAssignLeader}>
        <DialogContent className="sm:max-w-[425px] z-[100]">
          <DialogHeader>
            <DialogTitle>Assign Route Leader</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              You are assigning a leader to {selectedRoutes.length} route(s):
              <ul className="list-disc pl-5 mt-2 max-h-32 overflow-y-auto font-medium text-foreground">
                {selectedRoutes.map(r => <li key={r}>{r}</li>)}
              </ul>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Route Leader Name</label>
              <Input 
                value={bulkLeaderName} 
                onChange={e => setBulkLeaderName(e.target.value)} 
                placeholder="Type leader name..."
                autoFocus
              />
            </div>
            
            <div className="flex justify-end pt-4 gap-2">
              <Button variant="outline" onClick={() => setShowBulkAssignLeader(false)}>Cancel</Button>
              <Button onClick={handleBulkAssignLeader} disabled={!bulkLeaderName.trim()}>Save Leader</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Bus Dialog */}
      <Dialog open={showAddBus} onOpenChange={setShowAddBus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bus to Fleet Roster</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bus</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedBusId
                      ? (() => {
                          const bus = availableBuses.find(b => b.id === selectedBusId);
                          return bus ? `${bus.bus_no}${bus.route ? ` — ${bus.route}` : ''}` : 'Select a bus...';
                        })()
                      : 'Select a bus...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[100]" align="start">
                  <Command>
                    <CommandInput placeholder="Search bus number or route..." className="border-b" />
                    <CommandEmpty>No bus found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                      {availableBuses.map(b => (
                        <CommandItem
                          key={b.id}
                          value={`${b.bus_no} ${b.route || ''}`}
                          onSelect={() => setSelectedBusId(b.id)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedBusId === b.id ? "opacity-100" : "opacity-0")} />
                          {b.bus_no} {b.route ? `— ${b.route}` : ''}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Route</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedRouteLabel || 'Select a route (optional)...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[100]" align="start">
                  <Command>
                    <CommandInput placeholder="Search route..." className="border-b" />
                    <CommandEmpty>No route found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                      {availableRoutes.map(r => (
                        <CommandItem
                          key={r.id}
                          value={r.route_name}
                          onSelect={() => {
                            setSelectedRouteId(r.id);
                            setSelectedRouteLabel(r.route_name);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedRouteId === r.id ? "opacity-100" : "opacity-0")} />
                          {r.route_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleAddBus} disabled={!selectedBusId} className="w-full">
              <Bus className="h-4 w-4 mr-2" /> Add to Roster
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <FleetExcelImport
        open={showImport}
        onOpenChange={setShowImport}
        onImportComplete={refetch}
      />
    </div>
  );
}
