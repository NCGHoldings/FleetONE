import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, CheckCircle2, AlertCircle, PlusCircle, Loader2, FileSpreadsheet, Trash2, Ban, ArrowRight } from "lucide-react";
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

interface MappedData {
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
  ownership_type?: string;
  leasing_bank?: string;
  leasing_end_date?: string;
  permit_expiry_date?: string;
  revenue_license_expiry?: string;
  revenue_amount?: number;
  insurance_company?: string;
  insurance_expiry?: string;
  insurance_month?: string;
  default_driver_name?: string;
  driver_phone?: string;
  documents_status?: string;
}

interface ParsedRow {
  rowIndex: number;
  raw: Record<string, any>;
  mapped: MappedData;
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

interface ImportError {
  busNo: string;
  error: string;
}

// Deterministic header mapping — exact match first, then approved aliases
// No generic single-word aliases like "name", "owner", "insurance", "phone"
const FIELD_MAPPINGS: { field: string; exact: string[]; aliases: string[] }[] = [
  { field: "bus_no", exact: ["vehicle no", "vehicle number", "bus no", "bus number"], aliases: ["reg no", "registration number", "reg. no", "veh no", "v.no", "bus reg"] },
  { field: "vehicle_name", exact: ["vehicle name", "veh name"], aliases: [] },
  { field: "vehicle_brand", exact: ["vehicle brand", "brand", "make"], aliases: ["manufacturer"] },
  { field: "permit_no", exact: ["permit no", "permit number"], aliases: [] },
  { field: "permit_category", exact: ["permit catagory", "permit category"], aliases: ["permit cat"] },
  { field: "capacity", exact: ["seating capacity", "seat capacity"], aliases: ["capacity", "seats"] },
  { field: "chassis_number", exact: ["chassie no", "chassis no", "chassis number", "chassie number"], aliases: ["chasis no", "chasi no"] },
  { field: "engine_number", exact: ["engine no", "engine number"], aliases: [] },
  { field: "type", exact: ["usage type"], aliases: [] },
  { field: "route", exact: ["allocation route", "allocated route", "route allocation"], aliases: [] },
  { field: "year", exact: ["yom", "year of manufacture"], aliases: ["manufacture year", "mfg year", "manufacturing year"] },
  { field: "owner_name", exact: ["ownership", "owner name", "owner's name"], aliases: ["owners name"] },
  { field: "owner_address", exact: ["owner's address", "owner address", "owners address"], aliases: [] },
  { field: "owner_nic", exact: ["owner's id", "owner id", "owner nic", "owners id"], aliases: ["nic", "id no"] },
  { field: "leasing_bank", exact: ["leasing bank"], aliases: ["finance company"] },
  { field: "leasing_end_date", exact: ["leasing end date", "leasing end"], aliases: ["lease end", "lease end date"] },
  { field: "permit_expiry_date", exact: ["permit expiry date", "permit expiry"], aliases: ["permit expire"] },
  { field: "revenue_license_expiry", exact: ["revenue expire", "revenue expiry", "revenue license expiry", "revenue licence expiry", "amount revenue expire"], aliases: ["days to revenue"] },
  { field: "revenue_amount", exact: ["amount revenue", "revenue amount"], aliases: [] },
  { field: "insurance_company", exact: ["insurence company", "insurance company"], aliases: ["insurer"] },
  { field: "insurance_expiry", exact: ["insurence expiry date", "insurance expiry date", "insurance expiry", "insurence expiry"], aliases: ["days to expire insurence"] },
  { field: "insurance_month", exact: ["insurence month", "insurance month"], aliases: [] },
  { field: "default_driver_name", exact: ["driver name"], aliases: [] },
  { field: "driver_phone", exact: ["phone number", "driver phone", "contact number"], aliases: ["mobile"] },
  { field: "documents_status", exact: ["documents", "document status"], aliases: ["docs"] },
  // "licence" alone maps to revenue license
  { field: "revenue_license_expiry_alt", exact: ["licence", "license"], aliases: [] },
];

function detectHeaders(headers: string[]): { mapping: Record<string, number>; headerMap: { excel: string; field: string }[] } {
  const mapping: Record<string, number> = {};
  const headerMap: { excel: string; field: string }[] = [];
  const usedIndices = new Set<number>();

  // Pass 1: exact matches
  headers.forEach((h, idx) => {
    if (!h || usedIndices.has(idx)) return;
    const normalized = h.toString().trim().toLowerCase();
    for (const fm of FIELD_MAPPINGS) {
      const targetField = fm.field === "revenue_license_expiry_alt" ? "revenue_license_expiry" : fm.field;
      if (mapping[targetField] !== undefined) continue;
      if (fm.exact.some(s => normalized === s)) {
        mapping[targetField] = idx;
        usedIndices.add(idx);
        headerMap.push({ excel: h.toString().trim(), field: targetField });
        break;
      }
    }
  });

  // Pass 2: alias matches for unmapped fields
  headers.forEach((h, idx) => {
    if (!h || usedIndices.has(idx)) return;
    const normalized = h.toString().trim().toLowerCase();
    for (const fm of FIELD_MAPPINGS) {
      const targetField = fm.field === "revenue_license_expiry_alt" ? "revenue_license_expiry" : fm.field;
      if (mapping[targetField] !== undefined) continue;
      if (fm.aliases.some(s => normalized === s || normalized.includes(s))) {
        mapping[targetField] = idx;
        usedIndices.add(idx);
        headerMap.push({ excel: h.toString().trim(), field: targetField });
        break;
      }
    }
  });

  return { mapping, headerMap };
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

// Only these fields are valid columns on the buses table
const VALID_BUS_COLUMNS = new Set([
  "bus_no", "vehicle_name", "vehicle_brand", "permit_no", "permit_category",
  "capacity", "chassis_number", "engine_number", "type", "route", "year",
  "owner_name", "owner_address", "owner_nic", "ownership_type",
  "leasing_bank", "leasing_end_date", "permit_expiry_date",
  "revenue_license_expiry", "revenue_amount",
  "insurance_company", "insurance_expiry", "insurance_month",
  "default_driver_name", "driver_phone", "documents_status",
  "model", "status", "current_mileage", "category_id", "sub_category_id",
  "category_assignment_source", "import_raw_data",
]);

export function FleetVehicleDataImport({ open, onOpenChange, onSuccess }: FleetVehicleDataImportProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [autoCreate, setAutoCreate] = useState(true);
  const [unmatchedDbBuses, setUnmatchedDbBuses] = useState<UnmatchedDbBus[]>([]);
  const [unmatchedAction, setUnmatchedAction] = useState<"none" | "deactivate" | "delete">("delete");
  const [summary, setSummary] = useState({ updated: 0, created: 0, skipped: 0, deactivated: 0, deleted: 0 });
  const [headerMap, setHeaderMap] = useState<{ excel: string; field: string }[]>([]);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const { toast } = useToast();

  const resetState = () => {
    setStep("upload");
    setParsedRows([]);
    setAutoCreate(true);
    setUnmatchedDbBuses([]);
    setUnmatchedAction("none");
    setSummary({ updated: 0, created: 0, skipped: 0, deactivated: 0, deleted: 0 });
    setHeaderMap([]);
    setImportErrors([]);
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
      const { mapping: colMap, headerMap: detectedHeaderMap } = detectHeaders(headers);
      setHeaderMap(detectedHeaderMap);

      if (colMap.bus_no === undefined) {
        toast({ title: "Error", description: "Could not find 'Vehicle No' column in the Excel", variant: "destructive" });
        return;
      }

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
          const v = row?.[idx];
          return v != null ? String(v).trim() : undefined;
        };

        const getDateValue = (field: string) => {
          const idx = colMap[field];
          if (idx === undefined) return undefined;
          return parseExcelDate(row?.[idx]);
        };

        const busNo = getValue("bus_no");
        if (!busNo) continue;

        excelBusNos.add(normalizeBusNo(busNo));

        const capacityStr = getValue("capacity");
        const yearStr = getValue("year");
        const revenueStr = getValue("revenue_amount");

        const mapped: MappedData = {
          bus_no: busNo,
          vehicle_name: getValue("vehicle_name"),
          vehicle_brand: getValue("vehicle_brand"),
          permit_no: getValue("permit_no"),
          permit_category: getValue("permit_category"),
          capacity: capacityStr ? parseInt(capacityStr) || undefined : undefined,
          chassis_number: getValue("chassis_number"),
          engine_number: getValue("engine_number"),
          type: getValue("type"),
          route: getValue("route"),
          year: yearStr ? parseInt(yearStr) || undefined : undefined,
          owner_name: getValue("owner_name"),
          owner_address: getValue("owner_address"),
          owner_nic: getValue("owner_nic"),
          ownership_type: getValue("owner_name"), // "Ownership" column maps to ownership classification
          leasing_bank: getValue("leasing_bank"),
          leasing_end_date: getDateValue("leasing_end_date"),
          permit_expiry_date: getDateValue("permit_expiry_date"),
          revenue_license_expiry: getDateValue("revenue_license_expiry"),
          revenue_amount: revenueStr ? parseFloat(revenueStr) || undefined : undefined,
          insurance_company: getValue("insurance_company"),
          insurance_expiry: getDateValue("insurance_expiry"),
          insurance_month: getValue("insurance_month"),
          default_driver_name: getValue("default_driver_name"),
          driver_phone: getValue("driver_phone"),
          documents_status: getValue("documents_status"),
        };

        // If "Ownership" column was detected under owner_name but it's really an ownership type
        // check if the value looks like a type (Own, Leased, Hired) vs a person's name
        if (mapped.owner_name) {
          const ownerLower = mapped.owner_name.toLowerCase();
          if (["own", "leased", "hired", "company", "private"].includes(ownerLower)) {
            mapped.ownership_type = mapped.owner_name;
            mapped.owner_name = undefined;
          } else {
            mapped.ownership_type = undefined; // It's a real name, not a type
          }
        }

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
          fieldsToUpdate,
        });
      }

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
    const errors: ImportError[] = [];

    const [{ data: categories }, { data: subCategories }] = await Promise.all([
      supabase.from("bus_categories").select("id, name"),
      supabase.from("bus_sub_categories").select("id, name, category_id"),
    ]);

    const catByName = new Map<string, string>();
    (categories || []).forEach(c => catByName.set(c.name.toLowerCase().trim(), c.id));

    const subCatByName = new Map<string, string>();
    (subCategories || []).forEach(sc => subCatByName.set(sc.name.toLowerCase().trim(), sc.id));

    const getCategoryId = (usageType?: string): string | undefined => {
      if (!usageType) return catByName.get("public bus");
      const u = usageType.toLowerCase().trim();
      if (u.includes("school") || u.startsWith("sbs")) return catByName.get("school bus");
      if (u.includes("special")) return catByName.get("special hire");
      return catByName.get("public bus");
    };

    const getSubCategoryId = (permitCat?: string): string | undefined => {
      if (!permitCat) return undefined;
      const p = permitCat.toLowerCase().trim();
      if (p.includes("super luxury") || p.includes("super lux")) return subCatByName.get("super luxury");
      if (p.includes("semi")) return subCatByName.get("semi luxury");
      return subCatByName.get(p);
    };

    // Filter payload to only valid bus columns
    const cleanPayload = (data: Record<string, any>): Record<string, any> => {
      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        if (VALID_BUS_COLUMNS.has(k) && v != null && String(v).trim() !== "") {
          cleaned[k] = v;
        }
      }
      return cleaned;
    };

    for (const row of parsedRows) {
      const rawUpdateData: Record<string, any> = {};
      for (const field of row.fieldsToUpdate) {
        const val = row.mapped[field as keyof MappedData];
        if (val != null && String(val).trim() !== "") {
          rawUpdateData[field] = val;
        }
      }

      // Category assignment
      const categoryId = getCategoryId(row.mapped.type);
      const subCategoryId = getSubCategoryId(row.mapped.permit_category);
      if (categoryId) rawUpdateData.category_id = categoryId;
      if (subCategoryId) rawUpdateData.sub_category_id = subCategoryId;
      rawUpdateData.category_assignment_source = "excel_import";

      // Store raw Excel data for audit
      rawUpdateData.import_raw_data = row.raw;

      if (row.matchStatus === "matched" && row.matchedBusId) {
        const payload = cleanPayload(rawUpdateData);
        delete payload.bus_no; // Don't update bus_no on existing
        if (Object.keys(payload).length === 0) { skipped++; continue; }
        const { error } = await supabase.from("buses").update(payload).eq("id", row.matchedBusId);
        if (error) {
          console.error("Update error for", row.mapped.bus_no, error);
          errors.push({ busNo: row.mapped.bus_no || "?", error: error.message });
          skipped++;
        } else {
          updated++;
        }
      } else if (row.matchStatus === "new" && autoCreate) {
        rawUpdateData.bus_no = row.mapped.bus_no;
        rawUpdateData.status = "active";
        if (!rawUpdateData.model) rawUpdateData.model = rawUpdateData.vehicle_brand || "Unknown";
        if (!rawUpdateData.current_mileage) rawUpdateData.current_mileage = 0;
        if (!rawUpdateData.type) rawUpdateData.type = "Public Transport";
        if (!rawUpdateData.year) rawUpdateData.year = 2000;
        if (!rawUpdateData.capacity) rawUpdateData.capacity = 54;
        const payload = cleanPayload(rawUpdateData);
        const { error } = await supabase.from("buses").insert(payload as any);
        if (error) {
          console.error("Insert error for", row.mapped.bus_no, error, JSON.stringify(payload));
          errors.push({ busNo: row.mapped.bus_no || "?", error: error.message });
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
        const { error } = await supabase.from("buses").update({ status: "retired" } as any).eq("id", bus.id);
        if (!error) deactivated++;
      }
    } else if (unmatchedAction === "delete" && selectedUnmatched.length > 0) {
      const fkTables = [
        "daily_trips", "daily_bus_expenses", "daily_cash_settlements",
        "fleet_master_roster", "bus_service_alerts", "maintenance_records",
        "route_permits", "insurance_records", "special_hire_projects",
        "real_time_tracking", "driver_allocations", "route_expenses",
        "bus_loans", "journal_entry_lines", "bus_tyres",
        "tyre_rotation_history", "tyre_inspection_records",
        "fuel_consumption_logs", "fuel_alerts", "bus_fuel_readings",
        "driver_behavior_events", "safety_alerts", "gps_location_history",
        "completed_trips", "fleet_analytics_daily", "bus_daily_mileage",
        "bus_api_connections", "ar_invoices", "ap_invoices", "expense_requests"
      ];
      for (const bus of selectedUnmatched) {
        // Clean up FK-linked records first
        for (const table of fkTables) {
          await supabase.from(table as any).delete().eq("bus_id", bus.id);
        }
        const { error } = await supabase.from("buses").delete().eq("id", bus.id);
        if (!error) deleted++;
        else {
          console.error("Delete error for", bus.bus_no, error);
          errors.push({ busNo: bus.bus_no, error: error.message });
        }
      }
    }

    setImportErrors(errors);
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
            {/* Header mapping preview */}
            {headerMap.length > 0 && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-semibold mb-2">Column Mapping ({headerMap.length} columns detected)</p>
                <div className="flex flex-wrap gap-1.5">
                  {headerMap.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1 py-0.5">
                      <span className="text-muted-foreground">{m.excel}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span className="font-semibold">{m.field}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
                      <Checkbox checked={bus.selected} onCheckedChange={() => toggleUnmatchedBus(bus.id)} />
                      <span className="font-mono font-medium text-red-700 dark:text-red-400">{bus.bus_no}</span>
                    </label>
                  ))}
                </div>
                {selectedUnmatchedCount > 0 && (
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant={unmatchedAction === "deactivate" ? "default" : "outline"} className="text-xs h-7 gap-1"
                      onClick={() => setUnmatchedAction(unmatchedAction === "deactivate" ? "none" : "deactivate")}>
                      <Ban className="w-3 h-3" /> Flag as Retired ({selectedUnmatchedCount})
                    </Button>
                    <Button size="sm" variant={unmatchedAction === "delete" ? "destructive" : "outline"} className="text-xs h-7 gap-1"
                      onClick={() => setUnmatchedAction(unmatchedAction === "delete" ? "none" : "delete")}>
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
                      <td className="p-2">{row.mapped.owner_name || row.mapped.ownership_type || "-"}</td>
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
          <div className="flex flex-col items-center gap-4 py-8">
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

            {/* Error details */}
            {importErrors.length > 0 && (
              <div className="w-full border border-red-300 bg-red-50 dark:bg-red-950/20 rounded-lg p-3 mt-2">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  {importErrors.length} Failed Rows:
                </p>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {importErrors.map((e, i) => (
                      <div key={i} className="text-xs flex gap-2">
                        <span className="font-mono font-medium text-red-700">{e.busNo}</span>
                        <span className="text-muted-foreground">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Button onClick={() => { resetState(); onOpenChange(false); }} className="mt-4">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
