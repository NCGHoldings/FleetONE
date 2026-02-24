import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  X,
  Eye,
  RefreshCw,
  Database
} from "lucide-react";
import * as XLSX from "xlsx-js-style";

interface ExcelColumn {
  excelColumn: string;
  dbColumn: string;
  isRequired: boolean;
  sampleData?: string;
}

interface ImportResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  message?: string;
}

const REQUIRED_COLUMNS = [
  { dbColumn: "student_name", label: "Student Name", required: true },
  { dbColumn: "admission_no", label: "Admission No", required: false },
  { dbColumn: "grade", label: "Grade", required: false },
  { dbColumn: "parent_name", label: "Parent Name", required: false },
  { dbColumn: "father_contact_no", label: "Father Contact No", required: false },
  { dbColumn: "mother_contact_no", label: "Mother Contact No", required: false },
  { dbColumn: "address", label: "Address", required: false },
  { dbColumn: "email_id", label: "Email ID", required: false },
  { dbColumn: "pickup_point", label: "Pick-up Point", required: false },
  { dbColumn: "dropoff_point", label: "Drop-off Point", required: false },
  { dbColumn: "route", label: "Route", required: false },
  { dbColumn: "bus_reg_no", label: "Bus Reg. No", required: false },
  { dbColumn: "driver_name", label: "Driver Name", required: false },
  { dbColumn: "driver_contact_no", label: "Driver Contact No", required: false },
  { dbColumn: "service_type", label: "OneWay / BothWay", required: false },
  { dbColumn: "update_new", label: "Update New (Expected Fee)", required: false },
];

interface Props {
  branchId: string;
  onImportComplete?: () => void;
}

export function SchoolExcelImport({ branchId, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<'replace_all' | 'upsert'>('replace_all');
  const [isMapping, setIsMapping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Invalid File",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    parseExcelFile(uploadedFile);
  };

  const parseExcelFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse with header
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length === 0) {
          throw new Error("Empty Excel file");
        }

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        setExcelColumns(headers);
        setExcelData(rows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        }));

        // Auto-map columns based on similarity
        autoMapColumns(headers);
        setIsMapping(true);
        
        toast({
          title: "File Parsed",
          description: `Found ${rows.length} rows with ${headers.length} columns`,
        });
      } catch (error) {
        console.error("Error parsing Excel:", error);
        toast({
          title: "Parse Error",
          description: "Failed to parse Excel file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const autoMapColumns = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    
    REQUIRED_COLUMNS.forEach(col => {
      const matchingHeader = headers.find(header => 
        header.toLowerCase().includes(col.label.toLowerCase()) ||
        col.label.toLowerCase().includes(header.toLowerCase()) ||
        header.toLowerCase().replace(/\s+/g, "").includes(col.dbColumn.toLowerCase())
      );
      
      if (matchingHeader) {
        mapping[col.dbColumn] = matchingHeader;
      }
    });

    // Skip monthly payment columns for now - focusing on student data only

    setColumnMapping(mapping);
  };

  const handleColumnMapping = (dbColumn: string, excelColumn: string) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      if (excelColumn === "skip") {
        delete newMapping[dbColumn];
      } else {
        newMapping[dbColumn] = excelColumn;
      }
      return newMapping;
    });
  };

  const generatePreview = () => {
    const preview = excelData.slice(0, 5).map(row => {
      const mappedRow: any = {};
      Object.entries(columnMapping).forEach(([dbCol, excelCol]) => {
        mappedRow[dbCol] = row[excelCol];
      });
      return mappedRow;
    });
    setPreviewData(preview);
    setIsPreviewOpen(true);
  };

  const startImport = async () => {
    if (!branchId || excelData.length === 0) return;

    setIsImporting(true);

    try {
      // Prepare mapped data for Edge Function
      const mappedData = excelData.map(row => {
        const mappedRow: any = {};
        Object.entries(columnMapping).forEach(([dbCol, excelCol]) => {
          if (excelCol !== "skip" && row[excelCol] !== undefined) {
            mappedRow[dbCol] = row[excelCol];
          }
        });
        return mappedRow;
      });

      // Call Edge Function for bulk processing
      const { data: result, error } = await supabase.functions.invoke('process-school-excel', {
        body: {
          data: mappedData,
          branch_id: branchId,
          mode: importMode
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to process import");
      }

      setImportResult(result);

      toast({
        title: result.success ? "Import Complete" : "Import Failed",
        description: result.message || `Processed ${result.total} records`,
        variant: result.success ? "default" : "destructive",
      });

      if (result.success && onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({});
    setImportMode('replace_all');
    setIsMapping(false);
    setIsImporting(false);
    setImportResult(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Excel Import
          </CardTitle>
          <CardDescription>
            Import student data from Excel files with automatic column mapping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!file && (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Upload Excel File</h3>
              <p className="text-muted-foreground mb-4">
                Select an Excel file (.xlsx or .xls) containing student data
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          )}

          {file && !isMapping && (
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>File Uploaded</AlertTitle>
              <AlertDescription>
                {file.name} - Processing data...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isMapping && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
            <CardDescription>
              Map Excel columns to database fields. Monthly payment columns are auto-detected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {REQUIRED_COLUMNS.map(column => (
                <div key={column.dbColumn} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {column.label}
                    {column.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </Label>
                  <Select
                    value={columnMapping[column.dbColumn] || "skip"}
                    onValueChange={(value) => handleColumnMapping(column.dbColumn, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Excel column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">-- Skip this field --</SelectItem>
                      {excelColumns.filter(col => col && col.trim() !== '').map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Import Mode Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Import Mode</Label>
              <RadioGroup value={importMode} onValueChange={(value: 'replace_all' | 'upsert') => setImportMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace_all" id="replace_all" />
                  <Label htmlFor="replace_all" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span className="font-medium">Replace All</span>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clear existing students and import all Excel rows. Guarantees Excel count = Database count.
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upsert" id="upsert" />
                  <Label htmlFor="upsert" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="font-medium">Update/Insert</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update existing students (by admission no) and insert new ones.
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePreview} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview Data
              </Button>
              <Button onClick={startImport} disabled={!columnMapping.student_name || isImporting}>
                {isImporting ? "Processing..." : "Start Import"}
              </Button>
              <Button onClick={resetImport} variant="outline" disabled={isImporting}>
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isImporting && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Import</CardTitle>
            <CardDescription>
              Processing {excelData.length} records using server-side batch processing...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Processing in {importMode === 'replace_all' ? 'Replace All' : 'Update/Insert'} mode</span>
            </div>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.inserted}</div>
                <div className="text-sm text-muted-foreground">Inserted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                <div className="text-sm text-muted-foreground">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>


            <Button onClick={resetImport} className="mt-4">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Data Preview</DialogTitle>
            <DialogDescription>
              Preview of the first 5 rows with current column mapping
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-96">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-muted">
                  {Object.keys(previewData[0] || {}).map(key => (
                    <th key={key} className="border border-gray-300 p-2 text-left text-sm font-medium">
                      {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td key={cellIndex} className="border border-gray-300 p-2 text-sm">
                        {value || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}