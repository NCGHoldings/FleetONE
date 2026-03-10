import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface ValidationResult {
  valid: ParsedRow[];
  errors: { row: number; message: string }[];
}

interface ParsedRow {
  staff_name: string;
  staff_type: string;
  contact_number?: string;
  nic_number?: string;
  address?: string;
  emergency_contact?: string;
  license_number?: string;
  license_expiry?: string;
  date_of_birth?: string;
  blood_group?: string;
  license_type?: string;
  joined_date?: string;
  salary_type?: string;
  daily_rate?: number;
  monthly_salary?: number;
  notes?: string;
}

interface StaffExcelImportProps {
  onImportComplete: () => void;
}

export function StaffExcelImport({ onImportComplete }: StaffExcelImportProps) {
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      "Staff Name", "Staff Type", "Contact Number", "NIC Number", "Address",
      "Emergency Contact", "License Number", "License Expiry", "Date of Birth",
      "Blood Group", "License Type", "Joined Date", "Salary Type", "Daily Rate",
      "Monthly Salary", "Notes"
    ];
    const sampleRow = [
      "John Perera", "driver", "0771234567", "901234567V", "123 Main St, Colombo",
      "0779876543", "DL-12345", "2027-12-31", "1990-05-15",
      "O+", "Heavy", "2020-01-15", "monthly", "", "25000", "Experienced highway driver"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff Template");
    XLSX.writeFile(wb, "Driver_Conductor_Import_Template.xlsx");
    toast({ title: "Template Downloaded", description: "Fill in the template and upload it back." });
  };

  const parseDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === "number") {
      // Excel serial date
      const date = XLSX.SSF.parse_date_code(val);
      if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return undefined;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        const valid: ParsedRow[] = [];
        const errors: { row: number; message: string }[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1
          const name = row["Staff Name"]?.toString().trim();
          const type = row["Staff Type"]?.toString().trim().toLowerCase();

          if (!name) { errors.push({ row: rowNum, message: "Staff Name is required" }); return; }
          if (!type || !["driver", "conductor"].includes(type)) {
            errors.push({ row: rowNum, message: `Staff Type must be 'driver' or 'conductor', got '${type}'` });
            return;
          }

          valid.push({
            staff_name: name,
            staff_type: type,
            contact_number: row["Contact Number"]?.toString().trim() || undefined,
            nic_number: row["NIC Number"]?.toString().trim() || undefined,
            address: row["Address"]?.toString().trim() || undefined,
            emergency_contact: row["Emergency Contact"]?.toString().trim() || undefined,
            license_number: row["License Number"]?.toString().trim() || undefined,
            license_expiry: parseDate(row["License Expiry"]),
            date_of_birth: parseDate(row["Date of Birth"]),
            blood_group: row["Blood Group"]?.toString().trim() || undefined,
            license_type: row["License Type"]?.toString().trim() || undefined,
            joined_date: parseDate(row["Joined Date"]),
            salary_type: row["Salary Type"]?.toString().trim().toLowerCase() || undefined,
            daily_rate: row["Daily Rate"] ? parseFloat(row["Daily Rate"]) : undefined,
            monthly_salary: row["Monthly Salary"] ? parseFloat(row["Monthly Salary"]) : undefined,
            notes: row["Notes"]?.toString().trim() || undefined,
          });
        });

        setValidation({ valid, errors });
      } catch (err) {
        toast({ title: "Parse Error", description: "Could not read the Excel file.", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!validation || validation.valid.length === 0) return;
    setImporting(true);

    try {
      // Fetch existing staff for merge matching by NIC
      const { data: existing } = await supabase
        .from("staff_registry")
        .select("id, nic_number, staff_name")
        .in("staff_type", ["driver", "conductor"]);

      const nicMap = new Map<string, string>();
      const nameMap = new Map<string, string>();
      (existing || []).forEach((s) => {
        if (s.nic_number) nicMap.set(s.nic_number.toLowerCase(), s.id);
        if (s.staff_name) nameMap.set(s.staff_name.toLowerCase(), s.id);
      });

      let updated = 0;
      let inserted = 0;
      let failed = 0;

      for (const row of validation.valid) {
        const matchId = (row.nic_number && nicMap.get(row.nic_number.toLowerCase())) ||
                        nameMap.get(row.staff_name.toLowerCase());

        const record: any = {
          staff_name: row.staff_name,
          staff_type: row.staff_type,
          contact_number: row.contact_number,
          nic_number: row.nic_number,
          address: row.address,
          emergency_contact: row.emergency_contact,
          license_number: row.license_number,
          license_expiry: row.license_expiry,
          date_of_birth: row.date_of_birth,
          blood_group: row.blood_group,
          license_type: row.license_type,
          joined_date: row.joined_date,
          salary_type: row.salary_type,
          daily_rate: row.daily_rate,
          monthly_salary: row.monthly_salary,
          notes: row.notes,
        };

        // Remove undefined values
        Object.keys(record).forEach((k) => record[k] === undefined && delete record[k]);

        if (matchId) {
          const { error } = await supabase.from("staff_registry").update(record).eq("id", matchId);
          if (error) { console.error("Update error:", error); failed++; } else { updated++; }
        } else {
          record.is_active = true;
          const { error } = await supabase.from("staff_registry").insert(record);
          if (error) { console.error("Insert error:", error); failed++; } else { inserted++; }
        }
      }

      toast({
        title: "Import Complete",
        description: `${inserted} added, ${updated} updated${failed > 0 ? `, ${failed} failed` : ""}`,
      });

      setValidation(null);
      setOpen(false);
      onImportComplete();
    } catch (err) {
      console.error(err);
      toast({ title: "Import Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
        <Download className="h-4 w-4" />
        Download Template
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setValidation(null); }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Import from Excel
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Drivers & Conductors
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />

            {validation && (
              <div className="space-y-3">
                <div className="flex gap-4">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" /> {validation.valid.length} valid
                  </Badge>
                  {validation.errors.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> {validation.errors.length} errors
                    </Badge>
                  )}
                </div>

                {validation.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                    {validation.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-destructive">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Row {err.row}: {err.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setValidation(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!validation || validation.valid.length === 0 || importing}
            >
              {importing ? "Importing..." : `Import ${validation?.valid.length || 0} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
