import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { normalizeBusNo } from '@/lib/bus-utils';

interface ImportRow {
  bus: string;
  route: string;
  busType: string;
  permitType: string;
  routeStartDate: string;
  remark: string;
  driver: string;
  conductor: string;
  turn01: string;
  turn02: string;
  dayTarget: number;
  trip: number;
  section: string;
  matched: boolean;
  busId?: string;
  existingRosterId?: string;
}

interface FleetExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const SECTION_KEYWORDS = ['OLD RUNNING ROUTES', 'NEWLY STARTED ROUTES', 'EXTRA ROUTES', 'SCHOOL', 'HIRE'];

// Header synonyms for auto-detection
const HEADER_MAPS: Record<string, string[]> = {
  bus: ['bus', 'bus no', 'bus number', 'vehicle', 'vehicle no'],
  route: ['route', 'route no', 'route number'],
  busType: ['bus type', 'type', 'vehicle type'],
  permitType: ['permit', 'permit type'],
  routeStartDate: ['route start date', 'start date', 'route start'],
  remark: ['remark', 'remarks', 'status'],
  driver: ['driver', 'driver name'],
  conductor: ['conductor', 'conductor name'],
  turn01: ['turn 01', 'turn 01 start time', 'turn1', 'turn 1', '1st turn'],
  turn02: ['turn 02', 'turn 02 start time', 'turn2', 'turn 2', '2nd turn'],
  dayTarget: ['day target', 'target', 'daily target'],
  trip: ['trip', 'trips', 'trip no'],
};

function detectSection(cellValue: string | undefined): string | null {
  if (!cellValue) return null;
  const upper = String(cellValue).toUpperCase().trim();
  for (const kw of SECTION_KEYWORDS) {
    if (upper.includes(kw)) return String(cellValue).trim();
  }
  return null;
}

/** Find header row and map column names to indices */
function detectHeaderRow(sheet: XLSX.WorkSheet): { headerRowIndex: number; colMap: Record<string, number> } | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    const colMap: Record<string, number> = {};
    let matchCount = 0;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      const val = String(cell.v ?? '').trim().toLowerCase();
      if (!val) continue;

      for (const [key, synonyms] of Object.entries(HEADER_MAPS)) {
        if (synonyms.some(s => val === s || val.includes(s))) {
          if (!colMap[key]) {
            colMap[key] = c;
            matchCount++;
          }
          break;
        }
      }
    }

    // Need at least 'bus' + 2 other columns to consider it a header row
    if (colMap.bus !== undefined && matchCount >= 3) {
      return { headerRowIndex: r, colMap };
    }
  }
  return null;
}

function parseDayTarget(raw: string): number {
  if (!raw) return 0;
  // Remove commas, spaces
  const cleaned = raw.replace(/[,\s]/g, '');
  const num = Number(cleaned);
  // Excel date serials are typically > 40000; day targets are usually < 100000
  // But a realistic day target is usually < 500000 LKR
  if (isNaN(num)) return 0;
  return num;
}

function parseExcelRows(sheet: XLSX.WorkSheet): ImportRow[] {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const detected = detectHeaderRow(sheet);
  
  if (!detected) {
    console.warn('Could not detect header row, falling back to hardcoded indices');
    return parseExcelRowsLegacy(sheet);
  }

  const { headerRowIndex, colMap } = detected;
  console.log('Detected header row:', headerRowIndex, 'Column map:', colMap);
  
  const rows: ImportRow[] = [];
  let currentSection = '';

  const getVal = (r: number, key: string) => {
    const c = colMap[key];
    if (c === undefined) return '';
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    return cell ? String(cell.v ?? '').trim() : '';
  };

  for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
    // Check for section headers by scanning first few cells
    for (let c = range.s.c; c <= Math.min(range.s.c + 3, range.e.c); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const sec = detectSection(cell ? String(cell.v ?? '') : undefined);
      if (sec) {
        currentSection = sec;
        break;
      }
    }

    const busVal = getVal(r, 'bus');
    if (!busVal || busVal.length < 2) continue;
    if (busVal.toUpperCase() === 'BUS' || busVal.toUpperCase() === 'BUS NO') continue;

    rows.push({
      bus: busVal,
      route: getVal(r, 'route'),
      busType: getVal(r, 'busType'),
      permitType: getVal(r, 'permitType'),
      routeStartDate: getVal(r, 'routeStartDate'),
      remark: getVal(r, 'remark') || 'Running',
      driver: getVal(r, 'driver'),
      conductor: getVal(r, 'conductor'),
      turn01: getVal(r, 'turn01'),
      turn02: getVal(r, 'turn02'),
      dayTarget: parseDayTarget(getVal(r, 'dayTarget')),
      trip: parseInt(getVal(r, 'trip')) || 1,
      section: currentSection,
      matched: false,
    });
  }

  return rows;
}

/** Legacy fallback with hardcoded indices */
function parseExcelRowsLegacy(sheet: XLSX.WorkSheet): ImportRow[] {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows: ImportRow[] = [];
  let currentSection = '';

  for (let r = range.s.r; r <= range.e.r; r++) {
    const getCellVal = (c: number) => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v ?? '').trim() : '';
    };

    const firstCell = getCellVal(0);
    const secondCell = getCellVal(1);
    const detected = detectSection(firstCell) || detectSection(secondCell);
    if (detected) { currentSection = detected; continue; }

    const busVal = getCellVal(1);
    if (!busVal || busVal.length < 2) continue;
    if (busVal.toUpperCase() === 'BUS' || busVal.toUpperCase() === 'BUS NO') continue;

    rows.push({
      bus: busVal,
      route: getCellVal(2),
      busType: getCellVal(4),
      permitType: getCellVal(5),
      routeStartDate: getCellVal(6),
      remark: getCellVal(7) || 'Running',
      driver: getCellVal(8),
      conductor: getCellVal(9),
      turn01: getCellVal(10),
      turn02: getCellVal(11),
      dayTarget: parseDayTarget(getCellVal(12)),
      section: currentSection,
      matched: false,
    });
  }
  return rows;
}

export function FleetExcelImport({ open, onOpenChange, onImportComplete }: FleetExcelImportProps) {
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [autoCreateBuses, setAutoCreateBuses] = useState(true);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = parseExcelRows(ws);

    // Fetch all buses to match
    const { data: allBuses } = await supabase.from('buses').select('id, bus_no');
    const busMap = new Map((allBuses || []).map(b => [normalizeBusNo(b.bus_no), b.id]));

    // Fetch existing roster
    const { data: existingRoster } = await supabase.from('fleet_master_roster').select('id, bus_id');
    const rosterMap = new Map((existingRoster || []).map(r => [r.bus_id, r.id]));

    const matched = raw.map(row => {
      const normalised = normalizeBusNo(row.bus);
      const busId = busMap.get(normalised);
      return {
        ...row,
        matched: !!busId,
        busId: busId || undefined,
        existingRosterId: busId ? rosterMap.get(busId) || undefined : undefined,
      };
    });

    setParsedRows(matched);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    try {
      let updated = 0;
      let inserted = 0;
      let busesCreated = 0;
      let deleted = 0;
      let errors = 0;

      // If auto-create is enabled, first create missing buses
      if (autoCreateBuses) {
        const unmatchedRows = parsedRows.filter(r => !r.matched);
        for (const row of unmatchedRows) {
          const { data: newBus, error } = await supabase.from('buses').insert({
            bus_no: row.bus,
            route: row.route || null,
            status: 'active' as any,
            capacity: 50,
            model: 'Unknown',
            type: row.busType || 'Standard',
            year: new Date().getFullYear(),
          }).select('id').single();

          if (newBus && !error) {
            row.busId = newBus.id;
            row.matched = true;
            busesCreated++;
          } else {
            console.warn('Failed to create bus:', row.bus, error?.message);
          }
        }
      }

      // Re-fetch roster to get current state
      const { data: currentRoster } = await supabase.from('fleet_master_roster').select('id, bus_id');
      const rosterMap = new Map((currentRoster || []).map(r => [r.bus_id, r.id]));

      const matchedRows = parsedRows.filter(r => r.matched && r.busId);
      const importedBusIds = new Set(matchedRows.map(r => r.busId!));

      // Upsert all matched rows
      for (let idx = 0; idx < matchedRows.length; idx++) {
        const row = matchedRows[idx];
        const payload: Record<string, any> = {
          route_label: row.route || null,
          bus_type: row.busType || null,
          permit_type: row.permitType || null,
          route_start_date: row.routeStartDate || null,
          remark: row.remark || 'Running',
          default_driver: row.driver || null,
          default_conductor: row.conductor || null,
          turn_01_time: row.turn01 || null,
          turn_02_time: row.turn02 || null,
          day_target: row.dayTarget,
          section: row.section || null,
          is_active: true,
        };

        const existingId = rosterMap.get(row.busId!);

        if (existingId) {
          const { error } = await supabase.from('fleet_master_roster').update({ ...payload, sort_order: idx + 1 }).eq('id', existingId);
          if (error) {
            console.error('Update error for bus:', row.bus, error.message);
            errors++;
          } else {
            updated++;
          }
        } else {
          const { error } = await supabase.from('fleet_master_roster').insert({
            bus_id: row.busId!,
            ...payload,
            trips_per_day: 1,
            sort_order: idx + 1,
          });
          if (error) {
            console.error('Insert error for bus:', row.bus, error.message);
            errors++;
          } else {
            inserted++;
          }
        }
      }

      // DELETE roster entries that are NOT in the Excel file (full replace)
      const rosterIdsToDelete = (currentRoster || [])
        .filter(r => !importedBusIds.has(r.bus_id))
        .map(r => r.id);

      if (rosterIdsToDelete.length > 0) {
        const { error } = await supabase
          .from('fleet_master_roster')
          .delete()
          .in('id', rosterIdsToDelete);
        if (error) {
          console.error('Delete error:', error.message);
          errors++;
        } else {
          deleted = rosterIdsToDelete.length;
        }
      }

      const unmatched = parsedRows.filter(r => !r.matched).length;
      const parts = [];
      if (busesCreated > 0) parts.push(`${busesCreated} new buses created`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (inserted > 0) parts.push(`${inserted} inserted`);
      if (deleted > 0) parts.push(`${deleted} old entries removed`);
      if (unmatched > 0) parts.push(`${unmatched} skipped`);
      if (errors > 0) parts.push(`${errors} errors`);

      toast({
        title: errors > 0 ? 'Import Completed with Errors' : 'Import Complete — Full Replace',
        description: parts.join(', ') || 'No changes made',
        variant: errors > 0 ? 'destructive' : 'default',
      });

      onImportComplete();
      onOpenChange(false);
      setParsedRows([]);
      setFileName('');
    } catch (err: any) {
      toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['No', 'Bus', 'Route', 'Trip', 'Bus Type', 'Permit Type', 'Route Start Date', 'Remark', 'Driver', 'Conductor', 'Turn 01 Start Time', 'Turn 02 Start Time', 'Day Target'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Fleet-Roster-Import-Template.xlsx');
  };

  const matchedCount = parsedRows.filter(r => r.matched).length;
  const unmatchedCount = parsedRows.filter(r => !r.matched).length;
  const totalImportable = autoCreateBuses ? parsedRows.length : matchedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Fleet Roster from Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <label className="flex-1">
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              <Button variant="outline" className="w-full" asChild>
                <span><Upload className="h-4 w-4 mr-2" /> {fileName || 'Choose Excel File'}</span>
              </Button>
            </label>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Template
            </Button>
          </div>

          {parsedRows.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" /> {matchedCount} matched
                </span>
                {unmatchedCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> {unmatchedCount} unmatched
                  </span>
                )}
              </div>

              {unmatchedCount > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted border text-sm">
                  <Checkbox
                    id="auto-create"
                    checked={autoCreateBuses}
                    onCheckedChange={(v) => setAutoCreateBuses(!!v)}
                  />
                  <label htmlFor="auto-create" className="cursor-pointer">
                    Auto-create {unmatchedCount} missing buses in system
                  </label>
                </div>
              )}

              <div className="border rounded-md overflow-x-auto max-h-60">
                <table className="text-xs w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-1.5 text-left">Status</th>
                      <th className="p-1.5 text-left">Bus</th>
                      <th className="p-1.5 text-left">Route</th>
                      <th className="p-1.5 text-left">Driver</th>
                      <th className="p-1.5 text-left">Conductor</th>
                      <th className="p-1.5 text-left">Target</th>
                      <th className="p-1.5 text-left">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={row.matched ? '' : 'bg-destructive/10'}>
                        <td className="p-1.5">
                          {row.matched
                            ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                        </td>
                        <td className="p-1.5 font-mono">{row.bus}</td>
                        <td className="p-1.5">{row.route}</td>
                        <td className="p-1.5">{row.driver}</td>
                        <td className="p-1.5">{row.conductor}</td>
                        <td className="p-1.5">{row.dayTarget}</td>
                        <td className="p-1.5 text-muted-foreground">{row.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleImport} disabled={importing || totalImportable === 0} className="w-full">
                {importing ? 'Importing...' : `Import ${totalImportable} Buses`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
