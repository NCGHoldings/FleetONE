import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertCircle, Download } from "lucide-react";
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

  // Helper function to normalize column names for flexible matching
  const normalizeColumnName = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Helper function to find column value with flexible matching
  const findColumnValue = (row: any, possibleNames: string[]): any => {
    // First try exact matches
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return row[name];
      }
    }
    
    // Then try normalized matches
    const normalizedRow = Object.keys(row).reduce((acc, key) => {
      acc[normalizeColumnName(key)] = row[key];
      return acc;
    }, {} as any);
    
    for (const name of possibleNames) {
      const normalizedName = normalizeColumnName(name);
      if (normalizedRow[normalizedName] !== undefined && normalizedRow[normalizedName] !== null && normalizedRow[normalizedName] !== '') {
        return normalizedRow[normalizedName];
      }
    }
    
    return null;
  };

  const mapExcelToDatabase = (row: any) => {
    console.log('Mapping row:', Object.keys(row)); // Debug log to see actual column names
    
    const ownerName = findColumnValue(row, [
      'Name of the Owner', 'Owner Name', 'Permit Holder', 'Owner', 'Permit Holder Name'
    ])?.toString().trim() || 'Unknown Owner';

    const routeName = findColumnValue(row, [
      'Permanent Route', 'Route Name', 'Route', 'Permanent Route Name', 'Main Route'
    ])?.toString() || '';

    const temporaryRouteName = findColumnValue(row, [
      'Temporary Route Name', 'Temp Route', 'Alternative Route', 'Secondary Route'
    ])?.toString() || '';

    const via = findColumnValue(row, [
      'Via', 'Via Locations', 'Through', 'Route Via', 'Passing Through'
    ])?.toString() || '';

    const routeNumbersRaw = findColumnValue(row, [
      'Route Number', 'Route Numbers', 'Route No', 'Service Numbers', 'Route Nos'
    ]);
    const routeNumbers = routeNumbersRaw
      ? routeNumbersRaw
          .toString()
          .split(/[\s,\/]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : null;

    const ntcNumber = findColumnValue(row, [
      'NTC Approved Service Type', 'NTC Number', 'NTC Service Type', 'Service Type', 'NTC Approval'
    ])?.toString() || '';

    const ownerAddress = findColumnValue(row, [
      'Permit Holder Address', 'Owner Address', 'Address', 'Holder Address'
    ])?.toString() || '';

    const ownerNic = findColumnValue(row, [
      'Permit Holder NIC', 'Owner NIC', 'NIC', 'National ID', 'ID Number'
    ])?.toString() || '';

    const seats = findColumnValue(row, [
      'Approved Seating Capacity', 'Seating Capacity', 'Seats', 'Capacity', 'No of Seats'
    ]);

    const maxFare = findColumnValue(row, [
      'Approved Maximum Fare', 'Maximum Fare', 'Max Fare', 'Fare', 'Maximum Price'
    ]);

    const issueDate = findColumnValue(row, [
      'Issue Date', 'Issued Date', 'Date Issued', 'Grant Date', 'Approval Date'
    ]);

    const expiryDateRaw = findColumnValue(row, [
      'Expirary Date', 'Expiry Date', 'Expiration Date', 'Valid Until', 'End Date'
    ]);

    const annualFee = findColumnValue(row, [
      'Annual Fee', 'Fee', 'License Fee', 'Permit Fee', 'Yearly Fee'
    ]);

    const activeInOperation = findColumnValue(row, [
      'Active in Operation', 'Operation Status', 'Active', 'Operating', 'Status'
    ]);

    return {
      route_name: routeName,
      temporary_route_name: temporaryRouteName,
      via: via,
      route_numbers: routeNumbers,
      // permit_no will be assigned sequentially later
      owner_name: ownerName,
      owner_address: ownerAddress,
      owner_nic: ownerNic,
      ntc_number: ntcNumber,
      service_type: ntcNumber || 'regular',
      seats: seats ? parseInt(seats) : null,
      max_fare: maxFare ? parseFloat(maxFare) : null,
      issue_date: issueDate ? formatExcelDate(issueDate) : new Date().toISOString().split('T')[0],
      expiry_date: expiryDateRaw ? formatExcelDate(expiryDateRaw) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      annual_fee: annualFee ? parseFloat(annualFee) : null,
      operation_status:
        (activeInOperation?.toString().toLowerCase() === 'yes' ||
          activeInOperation?.toString().toLowerCase() === 'active' ||
          activeInOperation?.toString().toLowerCase() === 'true')
          ? 'active'
          : 'inactive',
      // omit permit_status to let DB default handle it safely
    } as any;
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Name of the Owner': 'John Doe Transport',
        'Permanent Route': 'Colombo - Kandy',
        'Temporary Route Name': 'Express Route',
        'Via': 'Kadawatha, Gampaha',
        'Route Number': '101, 102',
        'NTC Approved Service Type': 'Regular',
        'Approved Seating Capacity': 49,
        'Approved Maximum Fare': 300.00,
        'Issue Date': '2024-01-01',
        'Expiry Date': '2025-12-31',
        'Annual Fee': 75000.00,
        'Active in Operation': 'Yes',
        'Permit Holder Address': '123 Main Street, Colombo',
        'Permit Holder NIC': '751234567V'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Route Permits Template');
    
    XLSX.writeFile(workbook, 'route_permits_template.xlsx');
    toast.success('Template downloaded successfully');
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
          
          // Validate mapped data
          const validData = mappedData.filter(row => {
            const hasOwnerName = row.owner_name && row.owner_name !== 'Unknown Owner';
            const hasRouteName = row.route_name && row.route_name !== '';
            return hasOwnerName || hasRouteName; // At least one should be present
          });

          if (validData.length === 0) {
            toast.error('No valid data found in Excel file. Please check column names and data.');
            return;
          }

          if (validData.length < mappedData.length) {
            toast.warning(`${mappedData.length - validData.length} rows were skipped due to missing required data.`);
          }

          // Assign sequential permit numbers PRM001, PRM002, ...
          const pad = (n: number) => n.toString().padStart(3, '0');
          const assignedData = validData.map((row, idx) => ({
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
          console.log('Import completed successfully');
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
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            Upload your Excel file with route permit data
          </div>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>
        
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
              <p className="font-medium mb-2">Import Instructions:</p>
              <div className="space-y-1 text-xs">
                <p>• Download the template above to get the correct Excel format</p>
                <p>• The system will match column names flexibly (e.g., "Owner Name" = "Name of the Owner")</p>
                <p>• At least one of "Route Name" or "Owner Name" must be filled for each row</p>
                <p>• Empty rows or rows with missing critical data will be skipped</p>
                <p>• Permit numbers will be auto-generated as PRM001, PRM002, etc.</p>
              </div>
              <p className="font-medium mt-3 mb-2">Common Excel Column Names (flexible matching):</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>• Owner Name / Name of the Owner</span>
                <span>• Route Name / Permanent Route</span>
                <span>• Temporary Route Name</span>
                <span>• Via / Via Locations</span>
                <span>• Route Number / Route Numbers</span>
                <span>• NTC Number / Service Type</span>
                <span>• Seating Capacity / Seats</span>
                <span>• Maximum Fare / Max Fare</span>
                <span>• Issue Date / Date Issued</span>
                <span>• Expiry Date / Valid Until</span>
                <span>• Annual Fee / License Fee</span>
                <span>• Active in Operation / Status</span>
                <span>• Owner Address / Address</span>
                <span>• Owner NIC / NIC Number</span>
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