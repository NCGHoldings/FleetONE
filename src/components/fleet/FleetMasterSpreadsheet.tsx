import React, { useState } from 'react';
import { useFleetMasterSpreadsheet } from '@/hooks/useFleetMasterSpreadsheet';
import { FleetMasterSpreadsheetCore } from './FleetMasterSpreadsheetCore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw, Plus, FileSpreadsheet, Rocket, Bus, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatLKR } from '@/lib/accounting-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { FleetExcelImport } from './FleetExcelImport';

export function FleetMasterSpreadsheet() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { expandedRows, loading, kpis, updateField, confirmAndCreateTrips, addRosterEntry, bulkAddAllBuses, refetch } = useFleetMasterSpreadsheet(selectedDate);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [showAddBus, setShowAddBus] = useState(false);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [creating, setCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const loadAvailableBuses = async () => {
    const { data } = await supabase
      .from("buses")
      .select("id, bus_no, route")
      .order("bus_no");
    setAvailableBuses(data || []);
    setShowAddBus(true);
  };

  const handleAddBus = async () => {
    if (!selectedBusId) return;
    await addRosterEntry(selectedBusId);
    setShowAddBus(false);
    setSelectedBusId('');
  };

  const handleCreateTrips = async () => {
    setCreating(true);
    await confirmAndCreateTrips();
    setCreating(false);
  };

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
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

          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
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

          <Button variant="outline" size="sm" disabled={bulkAdding} onClick={async () => {
            setBulkAdding(true);
            await bulkAddAllBuses();
            setBulkAdding(false);
          }}>
            <Bus className="h-4 w-4 mr-1" /> {bulkAdding ? 'Adding...' : 'Bulk Add All'}
          </Button>

          <Button size="sm" onClick={handleCreateTrips} disabled={creating} className="bg-green-600 hover:bg-green-700 text-white">
            <Rocket className="h-4 w-4 mr-1" />
            {creating ? 'Creating...' : 'Create Trips'}
          </Button>
        </div>
      </div>

      {/* Spreadsheet */}
      <FleetMasterSpreadsheetCore
        rows={expandedRows}
        loading={loading}
        onUpdate={updateField}
      />

      {/* Add Bus Dialog */}
      <Dialog open={showAddBus} onOpenChange={setShowAddBus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bus to Fleet Roster</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedBusId} onValueChange={setSelectedBusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bus..." />
              </SelectTrigger>
              <SelectContent>
                {availableBuses.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bus_no} {b.route ? `— ${b.route}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddBus} disabled={!selectedBusId} className="w-full">
              <Bus className="h-4 w-4 mr-2" /> Add to Roster
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
