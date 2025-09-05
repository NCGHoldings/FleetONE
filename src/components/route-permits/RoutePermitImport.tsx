import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface RoutePermitImportProps {
  onImportComplete: () => void;
}

export function RoutePermitImport({ onImportComplete }: RoutePermitImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();

  // Comprehensive column mapping handling ALL variations from user's Excel
  const EXCEL_COLUMN_MAPPING = {
    // Route information
    "Permanent Route": "route_name",
    "Temporary Route Name": "temporary_route_name", 
    "Via": "via",
    "Route Number": "route_numbers",
    "Route Numbers": "route_numbers",
    
    // Permit details
    "Permit Number": "permit_no",
    "Permit No": "permit_no",
    
    // Bus allocation - handle quotes and variations
    "Allocated Bus Number": "allocated_bus_number",
    '"Allocated Bus\n Number"': "allocated_bus_number", // Handle quoted with line break
    '"Allocated Bus Number"': "allocated_bus_number", // Handle quoted
    "Allocated Bus\n Number": "allocated_bus_number", // Handle line break
    
    // Owner information - handle all variations
    "Name of the Owner/ Operator": "owner_name", // With forward slash and space
    "Name of the Owner/Operator": "owner_name", // With forward slash
    "Name of the Owner,Operator": "owner_name", // With comma
    "Name of the Owner Operator": "owner_name", // No punctuation
    "Owner Name": "owner_name",
    
    // Address and contact
    "Permit Holder Address": "owner_address",
    "Owner Address": "owner_address",
    "Address": "owner_address",
    
    "Permit Holder NIC": "owner_nic",
    "Owner NIC": "owner_nic",
    "NIC": "owner_nic",
    
    // Service details
    "NTC Approved Service Type": "service_type",
    "Service Type": "service_type",
    "Type": "service_type",
    
    // Capacity and fare
    "Approved Seating Capacity": "seats",
    "Seating Capacity": "seats",
    "Seats": "seats",
    "Capacity": "seats",
    
    "Approved Maximum Fare": "approved_maximum_fare",
    "Maximum Fare": "approved_maximum_fare",
    "Max Fare": "approved_maximum_fare",
    "Fare": "approved_maximum_fare",
    
    // Dates - handle typos
    "Issue Date": "issue_date",
    "Issued Date": "issue_date",
    "Date Issued": "issue_date",
    
    "Expiry Date": "expiry_date",
    "Expirary Date": "expiry_date", // Handle typo
    "Expiration Date": "expiry_date",
    "Expires": "expiry_date",
    
    // Financial
    "Annual Fee": "annual_fee",
    "Fee": "annual_fee",
    
    // Status fields
    "Active in Operation": "operation_status",
    "Operation Status": "operation_status",
    "Operating": "operation_status",
    
    "Permit Active or Inactive": "permit_active_inactive",
    "Permit Status": "permit_active_inactive",
    "Status": "permit_active_inactive",
    "Active": "permit_active_inactive"
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      previewFile(file);
    }
  };

  const findHeaderRow = (jsonData: any[]): number => {
    // Look for header row in first 5 rows
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (Array.isArray(row) && row.length > 5) {
        // Check if this row contains header-like strings
        const hasHeaders = row.some((cell: any) => {
          if (!cell) return false;
          const str = cell.toString().toLowerCase();
          return str.includes('permit') || str.includes('route') || str.includes('owner') || str.includes('number');
        });
        if (hasHeaders) return i;
      }
    }
    return 0; // Default to first row
  };

  const normalizeHeader = (header: any): string => {
    if (!header) return '';
    return header.toString()
      .trim()
      .replace(/\n/g, ' ') // Replace line breaks with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[""]/g, '"') // Normalize quotes
      .trim();
  };

  const previewFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: "array",
        cellStyles: true,
        cellDates: true,
        raw: false
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
      
      console.log("Raw Excel Data (first 10 rows):", jsonData.slice(0, 10));
      
      if (jsonData.length === 0) {
        throw new Error("Excel file appears to be empty");
      }

      // Find the actual header row
      const headerRowIndex = findHeaderRow(jsonData);
      console.log("Header row found at index:", headerRowIndex);
      
      if (headerRowIndex >= jsonData.length - 1) {
        throw new Error("No data rows found after header");
      }

      const rawHeaders = jsonData[headerRowIndex] as any[];
      const headers = rawHeaders.map(normalizeHeader);
      const dataStartRow = headerRowIndex + 1;
      const rows = jsonData.slice(dataStartRow, dataStartRow + 5); // Show first 5 data rows
      
      console.log("Normalized headers:", headers);
      console.log("Sample data rows:", rows);
      
      // Show mapping debug info
      const mappingDebug: any = {};
      headers.forEach((header, index) => {
        const dbField = EXCEL_COLUMN_MAPPING[header as keyof typeof EXCEL_COLUMN_MAPPING];
        mappingDebug[`${index}: "${header}"`] = dbField || 'NOT MAPPED';
      });
      console.log("Column mapping debug:", mappingDebug);
      
      const preview = rows.map((row: any[], index) => {
        const mappedRow: any = { _rowIndex: dataStartRow + index + 1 }; // Excel row number
        headers.forEach((header, colIndex) => {
          const dbField = EXCEL_COLUMN_MAPPING[header as keyof typeof EXCEL_COLUMN_MAPPING];
          const cellValue = row[colIndex];
          if (dbField && cellValue !== undefined && cellValue !== null && cellValue !== '') {
            mappedRow[dbField] = cellValue;
          }
        });
        return mappedRow;
      }).filter(row => {
        // Only show rows with some actual data
        return Object.keys(row).length > 1; // More than just _rowIndex
      });
      
      console.log("Preview data after mapping:", preview);
      setPreviewData(preview);
      
      if (preview.length === 0) {
        toast({
          title: "No Valid Data Found",
          description: "No rows could be mapped from your Excel file. Please check the column headers match the expected format.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Error previewing file:", error);
      toast({
        title: "Preview Error",
        description: error instanceof Error ? error.message : "Could not preview the Excel file",
        variant: "destructive",
      });
    }
  };

  const formatExcelDate = (value: any): string | null => {
    if (!value) return null;
    
    try {
      // If it's already a string in YYYY-MM-DD format
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      
      // If it's an Excel serial number
      if (typeof value === 'number' && value > 1) {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
          return `${date.y}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`;
        }
      }
      
      // Try to parse as date string
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
      
      return null;
    } catch (error) {
      console.error("Date parsing error:", error, "for value:", value);
      return null;
    }
  };

  const generatePermitNumber = (index: number): string => {
    return `PRM${(index + 1).toString().padStart(4, '0')}`;
  };

  const mapExcelToDatabase = (row: any[], headers: string[], rowIndex: number): any => {
    const mapped: any = {};
    
    headers.forEach((header, colIndex) => {
      const dbField = EXCEL_COLUMN_MAPPING[header as keyof typeof EXCEL_COLUMN_MAPPING];
      const cellValue = row[colIndex];
      
      if (dbField && cellValue !== undefined && cellValue !== null && cellValue !== '') {
        const strValue = cellValue.toString().trim();
        
        if (dbField === 'issue_date' || dbField === 'expiry_date') {
          const formattedDate = formatExcelDate(cellValue);
          if (formattedDate) {
            mapped[dbField] = formattedDate;
          }
        } else if (dbField === 'seats' || dbField === 'annual_fee' || dbField === 'approved_maximum_fare') {
          const numValue = parseFloat(strValue.replace(/[^\d.-]/g, '')); // Remove non-numeric chars
          if (!isNaN(numValue) && numValue > 0) {
            mapped[dbField] = numValue;
          }
        } else if (dbField === 'route_numbers') {
          // Handle route numbers as array
          if (strValue) {
            mapped[dbField] = strValue.split(/[,\s]+/).filter(Boolean);
          }
        } else if (dbField === 'operation_status') {
          // Map operation status
          const status = strValue.toLowerCase();
          mapped[dbField] = status.includes('active') ? 'active' : 'inactive';
        } else if (dbField === 'permit_active_inactive') {
          // Map permit status  
          const status = strValue.toLowerCase();
          mapped[dbField] = status.includes('active') ? 'active' : 'inactive';
        } else if (strValue !== 'BUS TO BE ASSIGNED' && strValue !== 'BUS PENDING' && strValue !== '') {
          // Only store meaningful values
          mapped[dbField] = strValue;
        }
      }
    });

    // Only create a record if we have meaningful data
    const hasData = mapped.permit_no || mapped.route_name || mapped.temporary_route_name || mapped.owner_name;
    if (!hasData) {
      return null; // Skip empty rows
    }

    // Set defaults for required fields  
    if (!mapped.route_name && mapped.temporary_route_name) {
      mapped.route_name = mapped.temporary_route_name;
    }
    if (!mapped.route_name) {
      mapped.route_name = 'Unknown Route';
    }
    if (!mapped.owner_name) {
      mapped.owner_name = 'Unknown Owner';
    }
    if (!mapped.issue_date) {
      mapped.issue_date = new Date().toISOString().split('T')[0];
    }
    if (!mapped.expiry_date) {
      // Default to 1 year from issue date
      const issueDate = new Date(mapped.issue_date);
      issueDate.setFullYear(issueDate.getFullYear() + 1);
      mapped.expiry_date = issueDate.toISOString().split('T')[0];
    }

    // Map additional fields to match database schema
    mapped.max_fare = mapped.approved_maximum_fare || null;
    mapped.ntc_number = mapped.permit_no || null; // Use permit number as NTC number
    
    // Set permit status based on permit_active_inactive or default to 'valid'
    if (mapped.permit_active_inactive === 'active') {
      mapped.permit_status = 'valid';
    } else if (mapped.permit_active_inactive === 'inactive') {
      mapped.permit_status = 'expired';
    } else {
      mapped.permit_status = 'valid';
    }

    return mapped;
  };

  const downloadTemplate = () => {
    const templateData = [
      [
        "Permanent Route",
        "Temporary Route Name", 
        "Via",
        "Route Number",
        "Permit Number",
        "Allocated Bus Number",
        "Name of the Owner/Operator",
        "Permit Holder Address",
        "Permit Holder NIC",
        "NTC Approved Service Type",
        "Approved Seating Capacity",
        "Approved Maximum Fare",
        "Issue Date",
        "Expiry Date",
        "Annual Fee",
        "Active in Operation",
        "Permit Active or Inactive"
      ],
      [
        "Colombo - Kandy",
        "Express Service",
        "Kegalle, Mawanella",
        "1, 2, 3",
        "PRM0001",
        "NB-1234",
        "John Doe Transport",
        "123 Main St, Colombo",
        "123456789V",
        "Regular",
        "45",
        "150.00",
        "2024-01-01",
        "2024-12-31",
        "50000.00",
        "Active",
        "Active"
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Route Permits Template");
    XLSX.writeFile(wb, "route_permits_template.xlsx");
    
    toast({
      title: "Template Downloaded",
      description: "Excel template downloaded successfully",
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an Excel file to import.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setImportResults(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: "array",
        cellStyles: true,
        cellDates: true,
        raw: false
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });

      if (jsonData.length === 0) {
        throw new Error("Excel file appears to be empty");
      }

      // Find the actual header row
      const headerRowIndex = findHeaderRow(jsonData);
      console.log("Header row found at index:", headerRowIndex);
      
      if (headerRowIndex >= jsonData.length - 1) {
        throw new Error("No data rows found after header");
      }

      const rawHeaders = jsonData[headerRowIndex] as any[];
      const headers = rawHeaders.map(normalizeHeader);
      const dataStartRow = headerRowIndex + 1;
      const dataRows = jsonData.slice(dataStartRow);
      
      console.log("Normalized headers:", headers);
      console.log("Total data rows:", dataRows.length);
      
      // Show detailed mapping info
      const mappedColumns = headers.filter(h => EXCEL_COLUMN_MAPPING[h as keyof typeof EXCEL_COLUMN_MAPPING]);
      const unmappedColumns = headers.filter(h => !EXCEL_COLUMN_MAPPING[h as keyof typeof EXCEL_COLUMN_MAPPING] && h);
      
      console.log("Successfully mapped columns:", mappedColumns);
      console.log("Unmapped columns:", unmappedColumns);

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process in batches
      const batchSize = 10;
      const totalBatches = Math.ceil(dataRows.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, dataRows.length);
        const batch = dataRows.slice(batchStart, batchEnd);

        const batchData = batch.map((row: any[], rowIndex) => {
          const globalRowIndex = batchStart + rowIndex;
          return mapExcelToDatabase(row, headers, globalRowIndex);
        }).filter(item => {
          // Only include non-null items with meaningful data
          return item !== null && (item.permit_no || item.route_name || item.owner_name);
        });

        if (batchData.length > 0) {
          try {
            const { data: insertData, error } = await supabase
              .from('route_permits')
              .insert(batchData)
              .select();

            if (error) {
              console.error("Batch insert error:", error);
              errors.push(`Batch ${batchIndex + 1}: ${error.message}`);
              failed += batchData.length;
            } else {
              successful += batchData.length;
              console.log(`Batch ${batchIndex + 1} inserted successfully:`, insertData?.length);
            }
          } catch (batchError) {
            console.error("Batch processing error:", batchError);
            errors.push(`Batch ${batchIndex + 1}: ${batchError}`);
            failed += batchData.length;
          }
        }

        setUploadProgress(((batchIndex + 1) / totalBatches) * 100);
      }

      setImportResults({ successful, failed, errors });

      if (successful > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${successful} route permits${failed > 0 ? ` (${failed} failed)` : ''}`,
        });
        onImportComplete();
      } else {
        toast({
          title: "Import Failed",
          description: "No data was successfully imported. Please check your Excel file format.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Import Route Permits from Excel
        </CardTitle>
        <CardDescription>
          Upload your Excel file with route permit data. The system will auto-generate permit numbers in PRM0001 format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Select Excel File</Label>
            <div className="mt-2">
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Preview (First 5 rows):</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Permit No</th>
                      <th className="p-2 text-left">Route Name</th>
                      <th className="p-2 text-left">Owner Name</th>
                      <th className="p-2 text-left">Bus Number</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{row.permit_no || `PRM${(index + 1).toString().padStart(4, '0')}`}</td>
                        <td className="p-2">{row.route_name || row.temporary_route_name || '-'}</td>
                        <td className="p-2">{row.owner_name || '-'}</td>
                        <td className="p-2">{row.allocated_bus_number || '-'}</td>
                        <td className="p-2">{row.operation_status || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing route permits...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {importResults && (
            <div className="space-y-2">
              <Alert className={importResults.successful > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {importResults.successful > 0 ? 
                    <CheckCircle className="w-4 h-4 text-green-600" /> : 
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  }
                  <AlertDescription>
                    <strong>Import Results:</strong><br />
                    Successfully imported: {importResults.successful}<br />
                    Failed: {importResults.failed}
                    {importResults.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">Show errors</summary>
                        <ul className="mt-1 ml-4 list-disc">
                          {importResults.errors.map((error, index) => (
                            <li key={index} className="text-xs">{error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Importing..." : "Import Data"}
          </Button>
          
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Expected Excel Columns:</strong></p>
          <p>Permanent Route, Temporary Route Name, Via, Route Number, Permit Number, Allocated Bus Number, Name of the Owner/Operator, Permit Holder Address, Permit Holder NIC, NTC Approved Service Type, Approved Seating Capacity, Approved Maximum Fare, Issue Date, Expiry Date, Annual Fee, Active in Operation, Permit Active or Inactive</p>
          <p><strong>Notes:</strong> Empty cells will be ignored. Permit numbers will be auto-generated in PRM0001 format if not provided.</p>
        </div>
      </CardContent>
    </Card>
  );
}