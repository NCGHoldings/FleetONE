import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, CheckCircle2, AlertCircle, PlusCircle, Loader2, FileSpreadsheet, Trash2, Ban } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeBusNo } from "@/lib/bus-utils";
import * as XLSX from "xlsx";

interface FleetVehicleDataImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedRow {
  rowIndex: number;
  raw: Record<string, any>;
  mapped: {
    bus_no?: string;
    vehicle_name?: string;
    vehicle_brand?: string;
    permit_no?: string;
    permit_category?: string;
    capacity?: number;
    chassis_number?: string;
    engine_number?: string;
    type?: string;
    route?: string;
    year?: number;
    owner_name?: string;
    owner_address?: string;
    owner_nic?: string;
    leasing_bank?: string;
    leasing_end_date?: string;
    permit_expiry_date?: string;
    revenue_license_expiry?: string;
    insurance_company?: string;
    insurance_expiry?: string;
    default_driver_name?: string;
    driver_phone?: string;
  };
  matchStatus: "matched" | "new" | "no_bus_no";
  matchedBusId?: string;
  matchedBusNo?: string;
  fieldsToUpdate: string[];
}

interface UnmatchedDbBus {
  id: string;
  bus_no: string;
  selected: boolean;
}

const HEADER_SYNONYMS: Record<string, string[]> = {
  bus_no: ["vehicle no", "vehicle number", "bus no", "bus number", "reg no", "registration", "reg. no", "veh no", "v.no", "bus reg", "registration number", "reg number"],
  vehicle_name: ["vehicle name", "name", "veh name"],
  vehicle_brand: ["vehicle brand", "brand", "make", "manufacturer"],
  permit_no: ["permit no", "permit number", "permit"],
  permit_category: ["permit catagory", "permit category", "permit cat"],
  capacity: ["seating capacity", "capacity", "seats", "seat capacity"],
  chassis_number: ["chassie no", "chassis no", "chassis number", "chassie number", "chasis no", "chasi no", "chassis"],
  engine_number: ["engine no", "engine number", "engine"],
  type: ["usage type", "usage", "type"],
  route: ["allocation route", "route", "allocated route", "route allocation"],
  year: ["yom", "year of manufacture", "year", "manufacture year", "mfg year", "manufacturing year"],
  owner_name: ["ownership", "owner", "owner name", "owner's name", "owners name"],
  owner_address: ["owner's address", "owner address", "address", "owners address"],
  owner_nic: ["owner's id", "owner id", "nic", "owner nic", "owners id", "id no"],
  leasing_bank: ["leasing bank", "leasing", "bank", "finance company"],
  leasing_end_date: ["leasing end date", "leasing end", "lease end", "lease end date"],
  permit_expiry_date: ["permit expiry date", "permit expiry", "permit expire"],
  revenue_license_expiry: ["revenue expire", "revenue expiry", "revenue license", "revenue licence", "revenue license expiry", "amount revenue expire", "days to revenue"],
  insurance_company: ["insurence company", "insurance company", "insurer", "insurance"],
  insurance_expiry: ["insurence expiry date", "insurance expiry date", "insurance expiry", "insurence expiry", "days to expire insurence", "insurence month"],
  default_driver_name: ["driver name", "driver"],
  driver_phone: ["phone number", "phone", "driver phone", "contact", "contact number", "mobile"],
};

function detectHeaders(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  headers.forEach((h, idx) => {
    if (!h) return;
    const normalized = h.toString().trim().toLowerCase();
    for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
      if (mapping[field] !== undefined) continue;
      if (synonyms.some(s => normalized === s || normalized.includes(s))) {
        mapping[field] = idx;
        break;
      }
    }
  });
  return mapping;
}

function parseExcelDate(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    if (c.length === 4) return `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }
  return undefined;
}

export function FleetVehicleDataImport({ open, onOpenChange, onSuccess }: FleetVehicleDataImportProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [autoCreate, setAutoCreate] = useState(true);
  const [unmatchedDbBuses, setUnmatchedDbBuses] = useState<UnmatchedDbBus[]>([]);
  const [unmatchedAction, setUnmatchedAction] = useState<"none" | "deactivate" | "delete">("none");
  const [summary, setSummary] = useState({ updated: 0, created: 0, skipped: 0, deactivated: 0, deleted: 0 });
  const { toast } = useToast();

  const resetState = () => {
    setStep("upload");
    setParsedRows([]);
    setAutoCreate(true);
    setUnmatchedDbBuses([]);
    setUnmatchedAction("none");
    setSummary({ updated: 0, created: 0, skipped: 0, deactivated: 0, deleted: 0 });
  };

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      if (rawData.length < 2) {
        toast({ title: "Error", description: "Excel file has no data rows", variant: "destructive" });
        return;
      }

      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] as any[];
        if (row && row.filter(c => c != null && String(c).trim()).length >= 3) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = Array.from(rawData[headerRowIdx] as any[]).map(h => String(h || "").trim());
      const colMap = detectHeaders(headers);

      if (!colMap.bus_no && colMap.bus_no !== 0) {
        toast({ title: "Error", description: "Could not find 'Vehicle No' column in the Excel", variant: "destructive" });
        return;
      }

      // Fetch existing buses
      const { data: existingBuses } = await supabase.from("buses").select("id, bus_no");
      const busMap = new Map<string, { id: string; bus_no: string }>();
      (existingBuses || []).forEach(b => busMap.set(normalizeBusNo(b.bus_no), b));

      const rows: ParsedRow[] = [];
      const excelBusNos = new Set<string>();

      for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        if (!row || row.every(c => c == null || String(c).trim() === "")) continue;

        const getValue = (field: string) => {
          const idx = colMap[field];
          if (idx === undefined) return undefined;
          const v = row[idx];
          return v != null ? String(v).trim() : undefined;
        };

        const busNo = getValue("bus_no");
        if (!busNo) continue;

        excelBusNos.add(normalizeBusNo(busNo));

        const mapped: ParsedRow["mapped"] = {
          bus_no: busNo,
          vehicle_name: getValue("vehicle_name"),
          vehicle_brand: getValue("vehicle_brand"),
          permit_no: getValue("permit_no"),
          permit_category: getValue("permit_category"),
          capacity: getValue("capacity") ? parseInt(getValue("capacity")!) : undefined,
          chassis_number: getValue("chassis_number"),
          engine_number: getValue("engine_number"),
          type: getValue("type"),
          route: getValue("route"),
          year: getValue("year") ? parseInt(getValue("year")!) : undefined,
          owner_name: getValue("owner_name"),
          owner_address: getValue("owner_address"),
          owner_nic: getValue("owner_nic"),
          leasing_bank: getValue("leasing_bank"),
          leasing_end_date: parseExcelDate(colMap.leasing_end_date !== undefined ? row[colMap.leasing_end_date] : undefined),
          permit_expiry_date: parseExcelDate(colMap.permit_expiry_date !== undefined ? row[colMap.permit_expiry_date] : undefined),
          revenue_license_expiry: parseExcelDate(colMap.revenue_license_expiry !== undefined ? row[colMap.revenue_license_expiry] : undefined),
          insurance_company: getValue("insurance_company"),
          insurance_expiry: parseExcelDate(colMap.insurance_expiry !== undefined ? row[colMap.insurance_expiry] : undefined),
          default_driver_name: getValue("default_driver_name"),
          driver_phone: getValue("driver_phone"),
        };

        const normalizedNo = normalizeBusNo(busNo);
        const match = busMap.get(normalizedNo);

        const fieldsToUpdate = Object.entries(mapped)
          .filter(([k, v]) => k !== "bus_no" && v != null && String(v).trim() !== "")
          .map(([k]) => k);

        rows.push({
          rowIndex: i,
          raw: Object.fromEntries(headers.map((h, idx) => [h || `col_${idx}`, row?.[idx] ?? null])),
          mapped,
          matchStatus: match ? "matched" : "new",
          matchedBusId: match?.id,
          matchedBusNo: match?.bus_no,
          fieldsToUpdate: fieldsToUpdate.filter(f => mapped[f as keyof typeof mapped] != null && String(mapped[f as keyof typeof mapped]).trim() !== ""),
        });
      }

      // Detect DB buses NOT in Excel — likely fake/test data
      const unmatched: UnmatchedDbBus[] = (existingBuses || [])
        .filter(b => !excelBusNos.has(normalizeBusNo(b.bus_no)))
        .map(b => ({ id: b.id, bus_no: b.bus_no, selected: true }));

      setUnmatchedDbBuses(unmatched);
      setParsedRows(rows);
      setStep("preview");

      toast({
        title: "Excel Parsed",
        description: `Found ${rows.length} rows: ${rows.filter(r => r.matchStatus === "matched").length} matched, ${rows.filter(r => r.matchStatus === "new").length} new. ${unmatched.length} DB buses not in Excel.`,
      });
    } catch (err: any) {
      toast({ title: "Parse Error", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    setStep("importing");
    let updated = 0, created = 0, skipped = 0, deactivated = 0, deleted = 0;

    // Fetch routes for matching new buses
const { data: routes } = await supabase.from("routes").select("id, route_name");
    const routeMap = new Map<string, string>();
    (routes || []).forEach(r => routeMap.set(r.route_name.toLowerCase().trim(), r.id));

    for (const row of parsedRows) {
      const updateData: Record<string, any> = {};
      for (const field of row.fieldsToUpdate) {
        const val = row.mapped[field as keyof typeof row.mapped];
        if (val != null && String(val).trim() !== "") {
          updateData[field] = val;
        }
      }

      if (Object.keys(updateData).length === 0) {
        skipped++;
        continue;
      }

      if (row.matchStatus === "matched" && row.matchedBusId) {
        // Try to match route for existing buses too
        if (updateData.route && !updateData.route_id) {
          const routeId = routeMap.get(String(updateData.route).toLowerCase().trim());
          if (routeId) updateData.route_id = routeId;
        }
        const { error } = await supabase.from("buses").update(updateData).eq("id", row.matchedBusId);
        if (error) {
          console.error("Update error for", row.mapped.bus_no, error);
          skipped++;
        } else {
          updated++;
        }
      } else if (row.matchStatus === "new" && autoCreate) {
        updateData.bus_no = row.mapped.bus_no;
        updateData.status = "active";
        if (!updateData.model) updateData.model = updateData.vehicle_brand || "Unknown";
        if (!updateData.current_mileage) updateData.current_mileage = 0;
        // Match route for new buses
        if (updateData.route) {
          const routeId = routeMap.get(String(updateData.route).toLowerCase().trim());
          if (routeId) updateData.route_id = routeId;
        }
        const { error } = await supabase.from("buses").insert(updateData as any);
        if (error) {
          console.error("Insert error for", row.mapped.bus_no, error);
          skipped++;
        } else {
          created++;
        }
      } else {
        skipped++;
      }
    }

    // Handle unmatched DB buses
    const selectedUnmatched = unmatchedDbBuses.filter(b => b.selected);
    if (unmatchedAction === "deactivate" && selectedUnmatched.length > 0) {
      for (const bus of selectedUnmatched) {
        const { error } = await supabase.from("buses").update({ status: "inactive" } as any).eq("id", bus.id);
        if (!error) deactivated++;
      }
    } else if (unmatchedAction === "delete" && selectedUnmatched.length > 0) {
      for (const bus of selectedUnmatched) {
        const { error } = await supabase.from("buses").delete().eq("id", bus.id);
        if (!error) deleted++;
        else console.error("Delete error for", bus.bus_no, error);
      }
    }

    setSummary({ updated, created, skipped, deactivated, deleted });
    setStep("done");
    toast({
      title: "Import Complete",
      description: `${updated} updated, ${created} created, ${skipped} skipped${deactivated ? `, ${deactivated} deactivated` : ""}${deleted ? `, ${deleted} deleted` : ""}`,
    });
    onSuccess?.();
  };

  const toggleUnmatchedBus = (id: string) => {
    setUnmatchedDbBuses(prev => prev.map(b => b.id === id ? { ...b, selected: !b.selected } : b));
  };

  const toggleAllUnmatched = (checked: boolean) => {
    setUnmatchedDbBuses(prev => prev.map(b => ({ ...b, selected: checked })));
  };

  const matchedCount = parsedRows.filter(r => r.matchStatus === "matched").length;
  const newCount = parsedRows.filter(r => r.matchStatus === "new").length;
  const selectedUnmatchedCount = unmatchedDbBuses.filter(b => b.selected).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Vehicle Master Data from Excel
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Drop your Operations Excel here</p>
            <p className="text-sm text-muted-foreground mt-1">
              The file with Vehicle No, Permit No, Chassis No, Insurance, Leasing etc.
            </p>
            <p className="text-xs text-muted-foreground mt-3">Supports .xlsx and .xls</p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                  <CheckCircle2 className="w-3 h-3" /> {matchedCount} Matched
                </Badge>
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300">
                  <PlusCircle className="w-3 h-3" /> {newCount} New
                </Badge>
                {unmatchedDbBuses.length > 0 && (
                  <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
                    <AlertCircle className="w-3 h-3" /> {unmatchedDbBuses.length} Not in Excel
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch id="auto-create" checked={autoCreate} onCheckedChange={setAutoCreate} />
                <Label htmlFor="auto-create" className="text-sm">Auto-create new buses</Label>
              </div>
            </div>

            {/* Unmatched DB buses warning */}
            {unmatchedDbBuses.length > 0 && (
              <div className="border border-red-300 bg-red-50 dark:bg-red-950/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {unmatchedDbBuses.length} buses in database but NOT in Excel (likely fake/test data)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Checkbox
                    checked={selectedUnmatchedCount === unmatchedDbBuses.length}
                    onCheckedChange={(checked) => toggleAllUnmatched(!!checked)}
                  />
                  <span className="text-xs text-muted-foreground mr-2">Select all</span>
                  {unmatchedDbBuses.map(bus => (
                    <label key={bus.id} className="flex items-center gap-1 text-xs bg-background border rounded px-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={bus.selected}
                        onCheckedChange={() => toggleUnmatchedBus(bus.id)}
                      />
                      <span className="font-mono font-medium text-red-700 dark:text-red-400">{bus.bus_no}</span>
                    </label>
                  ))}
                </div>
                {selectedUnmatchedCount > 0 && (
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      variant={unmatchedAction === "deactivate" ? "default" : "outline"}
                      className="text-xs h-7 gap-1"
                      onClick={() => setUnmatchedAction(unmatchedAction === "deactivate" ? "none" : "deactivate")}
                    >
                      <Ban className="w-3 h-3" /> Flag as Inactive ({selectedUnmatchedCount})
                    </Button>
                    <Button
                      size="sm"
                      variant={unmatchedAction === "delete" ? "destructive" : "outline"}
                      className="text-xs h-7 gap-1"
                      onClick={() => setUnmatchedAction(unmatchedAction === "delete" ? "none" : "delete")}
                    >
                      <Trash2 className="w-3 h-3" /> Delete Permanently ({selectedUnmatchedCount})
                    </Button>
                  </div>
                )}
              </div>
            )}

            <ScrollArea className="h-[40vh] border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Vehicle No</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Brand</th>
                    <th className="p-2 text-left">Chassis</th>
                    <th className="p-2 text-left">Engine</th>
                    <th className="p-2 text-left">Permit</th>
                    <th className="p-2 text-left">Owner</th>
                    <th className="p-2 text-left">Leasing</th>
                    <th className="p-2 text-left">Insurance</th>
                    <th className="p-2 text-left">Driver</th>
                    <th className="p-2 text-left">Fields</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} className={`border-b ${row.matchStatus === "matched" ? "bg-green-50/50 dark:bg-green-950/10" : "bg-yellow-50/50 dark:bg-yellow-950/10"}`}>
                      <td className="p-2">
                        {row.matchStatus === "matched" ? (
                          <Badge variant="outline" className="text-green-600 text-[10px]">Match</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 text-[10px]">New</Badge>
                        )}
                      </td>
                      <td className="p-2 font-mono font-medium">{row.mapped.bus_no}</td>
                      <td className="p-2">{row.mapped.vehicle_name || "-"}</td>
                      <td className="p-2">{row.mapped.vehicle_brand || "-"}</td>
                      <td className="p-2 font-mono text-[10px]">{row.mapped.chassis_number || "-"}</td>
                      <td className="p-2 font-mono text-[10px]">{row.mapped.engine_number || "-"}</td>
                      <td className="p-2">{row.mapped.permit_no || "-"}</td>
                      <td className="p-2">{row.mapped.owner_name || "-"}</td>
                      <td className="p-2">{row.mapped.leasing_bank || "-"}</td>
                      <td className="p-2">{row.mapped.insurance_company || "-"}</td>
                      <td className="p-2">{row.mapped.default_driver_name || "-"}</td>
                      <td className="p-2">
                        <span className="cursor-help" title={row.fieldsToUpdate.join(', ')}>
                          <Badge variant="secondary" className="text-[10px]">{row.fieldsToUpdate.length} fields</Badge>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Will import: {matchedCount} updates{autoCreate && newCount > 0 ? ` + ${newCount} new buses` : ""}
                {unmatchedAction !== "none" && selectedUnmatchedCount > 0
                  ? ` | ${unmatchedAction === "delete" ? "Delete" : "Deactivate"} ${selectedUnmatchedCount} unmatched`
                  : ""}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetState}>Cancel</Button>
                <Button onClick={handleImport} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import {matchedCount} Updates{autoCreate && newCount > 0 ? ` + Create ${newCount} New` : ""}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Importing vehicle data...</p>
            <p className="text-sm text-muted-foreground">Processing {parsedRows.length} records</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-xl font-bold">Import Complete!</p>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{summary.updated}</p>
                <p className="text-sm text-muted-foreground">Updated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.created}</p>
                <p className="text-sm text-muted-foreground">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{summary.skipped}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              {summary.deactivated > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{summary.deactivated}</p>
                  <p className="text-sm text-muted-foreground">Deactivated</p>
                </div>
              )}
              {summary.deleted > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{summary.deleted}</p>
                  <p className="text-sm text-muted-foreground">Deleted</p>
                </div>
              )}
            </div>
            <Button onClick={() => { resetState(); onOpenChange(false); }} className="mt-4">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
