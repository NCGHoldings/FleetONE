import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, Download } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

interface ImportPreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

const IMPORT_TYPES = [
  { value: "customers", label: "Customers", fields: ["customer_code", "customer_name", "email", "phone", "address", "credit_limit", "payment_terms"] },
  { value: "vendors", label: "Vendors", fields: ["vendor_code", "vendor_name", "email", "phone", "address", "payment_terms", "tax_id"] },
  { value: "items", label: "Inventory Items", fields: ["item_code", "item_name", "category", "unit_of_measure", "standard_cost", "selling_price", "reorder_level"] },
  { value: "chart_of_accounts", label: "Chart of Accounts", fields: ["account_code", "account_name", "account_type", "parent_code", "is_active"] },
  { value: "journal_entries", label: "Journal Entries", fields: ["entry_date", "description", "account_code", "debit_amount", "credit_amount", "reference"] },
];

export const DataImportWizard = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importType, setImportType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  const selectedType = IMPORT_TYPES.find(t => t.value === importType);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error("File must contain headers and at least one data row");
        return;
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1, 6); // Preview first 5 rows

      setPreview({
        headers,
        rows,
        totalRows: jsonData.length - 1,
      });

      // Auto-map columns based on name similarity
      const autoMappings: ColumnMapping[] = headers.map(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const matchedField = selectedType?.fields.find(f => 
          f === normalizedHeader || 
          f.includes(normalizedHeader) || 
          normalizedHeader.includes(f.replace("_", ""))
        );
        return {
          sourceColumn: header,
          targetField: matchedField || "",
        };
      });
      setColumnMappings(autoMappings);

      setStep(2);
      toast.success("File parsed successfully");
    } catch (error) {
      toast.error("Failed to parse file. Please ensure it's a valid Excel or CSV file.");
    }
  }, [selectedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => prev.map(m => 
      m.sourceColumn === sourceColumn ? { ...m, targetField } : m
    ));
  };

  const handleStartImport = async () => {
    setStep(4);
    setImportProgress(0);
    
    // Simulate import process
    const totalRows = preview?.totalRows || 0;
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < totalRows; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setImportProgress(Math.round(((i + 1) / totalRows) * 100));
      
      // Simulate random errors (5% chance)
      if (Math.random() < 0.05) {
        errors.push(`Row ${i + 2}: Invalid data format`);
      } else {
        successCount++;
      }
    }

    setImportResult({ success: successCount, errors });
    toast.success(`Import completed: ${successCount} records imported`);
  };

  const handleDownloadTemplate = () => {
    if (!selectedType) return;
    
    const worksheet = XLSX.utils.aoa_to_sheet([selectedType.fields]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, `${selectedType.value}_template.xlsx`);
    toast.success("Template downloaded");
  };

  const resetWizard = () => {
    setStep(1);
    setImportType("");
    setFile(null);
    setPreview(null);
    setColumnMappings([]);
    setImportProgress(0);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Import Wizard</h2>
          <p className="text-sm text-muted-foreground">Import data from Excel or CSV files</p>
        </div>
        {step > 1 && step < 4 && (
          <Button variant="outline" onClick={resetWizard}>Start Over</Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= s ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground"
            }`}>
              {step > s ? <CheckCircle className="h-5 w-5" /> : s}
            </div>
            <span className={`ml-2 text-sm font-medium ${step >= s ? "" : "text-muted-foreground"}`}>
              {s === 1 && "Select Type"}
              {s === 2 && "Upload File"}
              {s === 3 && "Map Columns"}
              {s === 4 && "Import"}
            </span>
            {idx < 3 && <div className={`flex-1 h-0.5 mx-4 ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Import Type */}
      {step === 1 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What would you like to import?</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select import type" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {importType && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Expected columns:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedType?.fields.map(field => (
                      <Badge key={field} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadTemplate} variant="outline">
                    <Download className="h-4 w-4 mr-2" />Download Template
                  </Button>
                </div>
              </div>
            )}

            {importType && (
              <div className="pt-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">
                    {isDragActive ? "Drop the file here" : "Drag & drop your file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    or click to browse (Excel .xlsx, .xls or CSV)
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Preview Data */}
      {step === 2 && preview && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">{preview.totalRows} rows to import</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-muted">
                    {preview.headers.map((h, i) => (
                      <th key={i} className="py-2 px-3 text-left font-medium border-b">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="py-2 px-3">{cell?.toString() || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">Showing first 5 rows</p>

            <div className="flex justify-end">
              <Button onClick={() => setStep(3)}>
                Continue to Column Mapping <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === 3 && (
        <Card className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your file columns to the corresponding fields. Unmapped columns will be ignored.
            </p>

            <div className="space-y-3">
              {columnMappings.map(mapping => (
                <div key={mapping.sourceColumn} className="flex items-center gap-4">
                  <div className="w-1/3 font-medium">{mapping.sourceColumn}</div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select 
                    value={mapping.targetField} 
                    onValueChange={(v) => handleMappingChange(mapping.sourceColumn, v)}
                  >
                    <SelectTrigger className="w-1/3">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Ignore —</SelectItem>
                      {selectedType?.fields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping.targetField && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleStartImport}>
                Start Import <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Import Progress/Results */}
      {step === 4 && (
        <Card className="p-6">
          {!importResult ? (
            <div className="space-y-4 text-center">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-lg font-medium">Importing data...</p>
              <Progress value={importProgress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">Import Complete!</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <Card className="p-4 bg-green-50 dark:bg-green-950/20">
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                </Card>
                <Card className="p-4 bg-red-50 dark:bg-red-950/20">
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-w-lg mx-auto">
                  <Label className="text-destructive">Errors:</Label>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <Button onClick={resetWizard}>Import More Data</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
