import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
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

function detectSection(cellValue: string | undefined): string | null {
  if (!cellValue) return null;
  const upper = String(cellValue).toUpperCase().trim();
  for (const kw of SECTION_KEYWORDS) {
    if (upper.includes(kw)) return String(cellValue).trim();
  }
  return null;
}

function parseExcelRows(sheet: XLSX.WorkSheet): ImportRow[] {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows: ImportRow[] = [];
  let currentSection = '';

  for (let r = range.s.r; r <= range.e.r; r++) {
    // Read all cells in row
    const getCellVal = (c: number) => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v ?? '').trim() : '';
    };

    // Check if this row is a section header
    const firstCell = getCellVal(0);
    const secondCell = getCellVal(1);
    const detected = detectSection(firstCell) || detectSection(secondCell);
    if (detected) {
      currentSection = detected;
      continue;
    }

    // Try to find a bus number — typically column index 1 (B)
    const busVal = getCellVal(1);
    if (!busVal || busVal.length < 2) continue;
    // Skip header rows
    if (busVal.toUpperCase() === 'BUS' || busVal.toUpperCase() === 'BUS NO') continue;

    const route = getCellVal(2);
    const busType = getCellVal(4);
    const permitType = getCellVal(5);
    const routeStartDate = getCellVal(6);
    const remark = getCellVal(7);
    const driver = getCellVal(8);
    const conductor = getCellVal(9);
    const turn01 = getCellVal(10);
    const turn02 = getCellVal(11);
    const dayTargetRaw = getCellVal(12);
    const dayTarget = Number(dayTargetRaw) || 0;

    rows.push({
      bus: busVal,
      route,
      busType,
      permitType,
      routeStartDate,
      remark: remark || 'Running',
      driver,
      conductor,
      turn01,
      turn02,
      dayTarget,
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
      const matchedRows = parsedRows.filter(r => r.matched && r.busId);
      let updated = 0;
      let inserted = 0;

      for (const row of matchedRows) {
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

        if (row.existingRosterId) {
          await supabase.from('fleet_master_roster').update(payload).eq('id', row.existingRosterId);
          updated++;
        } else {
          await supabase.from('fleet_master_roster').insert({
            bus_id: row.busId!,
            ...payload,
            trips_per_day: 1,
            sort_order: inserted + updated + 1,
          });
          inserted++;
        }
      }

      const unmatched = parsedRows.filter(r => !r.matched).length;
      toast({
        title: 'Import Complete',
        description: `Updated ${updated}, inserted ${inserted} buses.${unmatched > 0 ? ` ${unmatched} unmatched.` : ''}`,
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
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" /> {matchedCount} matched
                </span>
                {unmatchedCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> {unmatchedCount} unmatched
                  </span>
                )}
              </div>

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

              <Button onClick={handleImport} disabled={importing || matchedCount === 0} className="w-full">
                {importing ? 'Importing...' : `Import ${matchedCount} Buses`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
