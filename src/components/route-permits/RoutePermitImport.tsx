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
        const workbook = XLSX.read(data, { type: 'array' });
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

  const mapExcelToDatabase = (row: any) => {
    // Validate required fields
    const permitNo = row['Permit Number']?.toString() || `TEMP-${Date.now()}`;
    const ownerName = row['Name of the Owner']?.toString() || 'Unknown Owner';
    const issueDate = row['Issue Date'] ? new Date(row['Issue Date']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const expiryDate = row['Expirary Date'] || row['Expiry Date'] ? new Date(row['Expirary Date'] || row['Expiry Date']).toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Map permit status to valid enum values
    const permitStatusRaw = row['Permit Active or Inactive']?.toString().toLowerCase();
    const permitStatus: 'valid' | 'suspended' | 'cancelled' | 'expired' = 
      permitStatusRaw === 'active' ? 'valid' : 
      permitStatusRaw === 'suspended' ? 'suspended' : 
      permitStatusRaw === 'cancelled' ? 'cancelled' : 
      permitStatusRaw === 'expired' ? 'expired' : 'valid';

    return {
      route_name: row['Permanent Route']?.toString() || row['Route Name']?.toString() || '',
      temporary_route_name: row['Temporary Route Name']?.toString() || '',
      via: row['Via']?.toString() || '',
      route_numbers: row['Route Number'] ? [row['Route Number'].toString()] : null,
      permit_no: permitNo,
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
      operation_status: row['Active in Operation']?.toString().toLowerCase() === 'yes' || row['Active in Operation']?.toString().toLowerCase() === 'active' ? 'active' : 'inactive',
      permit_status: permitStatus
    };
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
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Map Excel data to database format
          const mappedData = jsonData.map(mapExcelToDatabase);

          // Insert data in batches
          const batchSize = 100;
          let imported = 0;

          for (let i = 0; i < mappedData.length; i += batchSize) {
            const batch = mappedData.slice(i, i + batchSize);
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
                <span>• Permit Number</span>
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