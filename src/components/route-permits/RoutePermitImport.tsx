import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface RoutePermitImportProps {
  onImportComplete: () => void;
}

export function RoutePermitImport({ onImportComplete }: RoutePermitImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      previewFile(selectedFile);
    }
  };

  const previewFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Show first 5 rows for preview
        setPreviewData(jsonData.slice(0, 5));
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error('Error reading file. Please ensure it\'s a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Helper to safely convert Excel cell values (string/date/number) to YYYY-MM-DD
  const formatExcelDate = (value: any) => {
    if (!value) return new Date().toISOString().split('T')[0];
    try {
      // If already a Date instance (when cellDates: true)
      if (value instanceof Date) {
        return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
          .toISOString()
          .split('T')[0];
      }
      // If number (Excel serial), approximate by treating as days since 1899-12-30
      if (typeof value === 'number') {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + value * 24 * 60 * 60 * 1000);
        return d.toISOString().split('T')[0];
      }
      // Fallback: parse as string
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .split('T')[0];
      }
    } catch {}
    return new Date().toISOString().split('T')[0];
  };

  const mapExcelToDatabase = (row: any) => {
    const ownerName = row['Name of the Owner']?.toString().trim() || 'Unknown Owner';

    const issueDate = row['Issue Date'] ? formatExcelDate(row['Issue Date']) : new Date().toISOString().split('T')[0];
    const expiryDateRaw = row['Expirary Date'] ?? row['Expiry Date'];
    const expiryDate = expiryDateRaw ? formatExcelDate(expiryDateRaw) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const routeNumbersRaw = row['Route Number'] ?? row['Route Numbers'];
    const routeNumbers = routeNumbersRaw
      ? routeNumbersRaw
          .toString()
          .split(/[\s,\/]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : null;

    return {
      route_name: row['Permanent Route']?.toString() || row['Route Name']?.toString() || '',
      temporary_route_name: row['Temporary Route Name']?.toString() || '',
      via: row['Via']?.toString() || '',
      route_numbers: routeNumbers,
      // permit_no will be assigned sequentially later
      owner_name: ownerName,
      owner_address: row['Permit Holder Address']?.toString() || '',
      owner_nic: row['Permit Holder NIC']?.toString() || '',
      ntc_number: row['NTC Approved Service Type']?.toString() || '',
      service_type: row['NTC Approved Service Type']?.toString() || 'regular',
      seats: row['Approved Seating Capacity'] ? parseInt(row['Approved Seating Capacity']) : null,
      max_fare: row['Approved Maximum Fare'] ? parseFloat(row['Approved Maximum Fare']) : null,
      issue_date: issueDate,
      expiry_date: expiryDate,
      annual_fee: row['Annual Fee'] ? parseFloat(row['Annual Fee']) : null,
      operation_status:
        (row['Active in Operation']?.toString().toLowerCase() === 'yes' ||
          row['Active in Operation']?.toString().toLowerCase() === 'active')
          ? 'active'
          : 'inactive',
      // omit permit_status to let DB default handle it safely
    } as any;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Clear existing data first as requested
          const { error: clearError } = await supabase
            .from('route_permits')
            .delete()
            .gt('created_at', '1900-01-01');
          if (clearError) {
            console.error('Failed to clear existing permits:', clearError);
            toast.error(`Failed to clear existing permits: ${clearError.message}`);
            return;
          }

          // Map Excel data to database format
          const mappedData = (jsonData as any[]).map(mapExcelToDatabase);

          // Assign sequential permit numbers PRM001, PRM002, ...
          const pad = (n: number) => n.toString().padStart(3, '0');
          const assignedData = mappedData.map((row, idx) => ({
            ...row,
            permit_no: `PRM${pad(idx + 1)}`,
          }));

          // Insert data in batches
          const batchSize = 100;
          let imported = 0;

          for (let i = 0; i < assignedData.length; i += batchSize) {
            const batch = assignedData.slice(i, i + batchSize);
            const { error } = await supabase
              .from('route_permits')
              .insert(batch);

            if (error) {
              console.error('Batch insert error:', error);
              toast.error(`Error importing batch starting at row ${i + 1}: ${error.message}`);
              continue;
            }
            imported += batch.length;
          }

          toast.success(`Successfully imported ${imported} route permits`);
          onImportComplete();
          setFile(null);
          setPreviewData([]);
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Failed to process and upload data');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Route Permits from Excel
        </CardTitle>
        <CardDescription>
          Upload an Excel or CSV file with route permit data to bulk import records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {previewData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Preview (First 5 rows)</h4>
            <div className="border rounded-md overflow-x-auto max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(previewData[0] || {}).slice(0, 6).map((key) => (
                      <TableHead key={key} className="text-xs">{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).slice(0, 6).map((value: any, cellIndex) => (
                        <TableCell key={cellIndex} className="text-xs">
                          {String(value || '').substring(0, 30)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Expected Excel Columns:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>• Permanent Route</span>
                <span>• Temporary Route Name</span>
                <span>• Via</span>
                <span>• Route Number</span>
                <span>• Permit Number (auto-generated: PRM001, PRM002, ...)</span>
                <span>• Allocated Bus Number</span>
                <span>• Name of the Owner</span>
                <span>• Permit Holder Address</span>
                <span>• Permit Holder NIC</span>
                <span>• NTC Approved Service Type</span>
                <span>• Approved Seating Capacity</span>
                <span>• Approved Maximum Fare</span>
                <span>• Issue Date</span>
                <span>• Expirary Date</span>
                <span>• Annual Fee</span>
                <span>• Active in Operation</span>
                <span>• Permit Active or Inactive</span>
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Importing...' : 'Import Route Permits'}
        </Button>
      </CardContent>
    </Card>
  );
}