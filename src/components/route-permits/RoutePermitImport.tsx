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

  // Enhanced column name normalization for fuzzy matching
  const normalizeColumnName = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
      .replace(/\s+/g, '') // Remove spaces
      .trim();
  };

  // Advanced fuzzy matching for column names
  const fuzzyMatch = (target: string, candidate: string): boolean => {
    const normalizedTarget = normalizeColumnName(target);
    const normalizedCandidate = normalizeColumnName(candidate);
    
    // Exact match
    if (normalizedTarget === normalizedCandidate) return true;
    
    // Contains match
    if (normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate)) return true;
    
    // Key word matching for common variations
    const targetWords = normalizedTarget.split(/(?=[A-Z])|[^a-z0-9]/g).filter(w => w.length > 2);
    const candidateWords = normalizedCandidate.split(/(?=[A-Z])|[^a-z0-9]/g).filter(w => w.length > 2);
    
    return targetWords.some(tw => candidateWords.some(cw => 
      cw.includes(tw) || tw.includes(cw) || 
      (tw.length > 3 && cw.length > 3 && (tw.substring(0, 3) === cw.substring(0, 3)))
    ));
  };

  // Enhanced column value finder with extensive debugging
  const findColumnValue = (row: any, possibleNames: string[]): any => {
    console.log(`Looking for columns: ${possibleNames.join(', ')}`);
    console.log(`Available columns: ${Object.keys(row).join(', ')}`);
    
    // First try exact matches
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        console.log(`✓ Found exact match: "${name}" = "${row[name]}"`);
        return row[name];
      }
    }
    
    // Try fuzzy matching on all available columns
    for (const [actualColumn, value] of Object.entries(row)) {
      if (value !== undefined && value !== null && value !== '') {
        for (const possibleName of possibleNames) {
          if (fuzzyMatch(possibleName, actualColumn)) {
            console.log(`✓ Found fuzzy match: "${actualColumn}" matches "${possibleName}" = "${value}"`);
            return value;
          }
        }
      }
    }
    
    console.log(`✗ No match found for: ${possibleNames.join(', ')}`);
    return null;
  };

  const mapExcelToDatabase = (row: any) => {
    console.log('\n=== MAPPING ROW ===');
    console.log('Available columns:', Object.keys(row));
    console.log('Row data sample:', Object.entries(row).slice(0, 3));
    
    // Handle permit number first - use from Excel if available
    const permitNumber = findColumnValue(row, [
      'Permit Number', 'Permit No', 'Permit', 'License Number', 'Registration Number'
    ])?.toString().trim() || '';
    
    const ownerName = findColumnValue(row, [
      'Name of the Owner/Operator', 'Name of the Owner', 'Owner Name', 'Permit Holder', 'Owner', 'Permit Holder Name',
      'Holder Name', 'Company Name', 'Business Name', 'Operator Name', 'Licensee'
    ])?.toString().trim() || '';

    const routeName = findColumnValue(row, [
      'Permanent Route', 'Route Name', 'Route', 'Permanent Route Name', 'Main Route',
      'Service Route', 'Bus Route', 'Primary Route', 'Regular Route'
    ])?.toString() || '';

    const temporaryRouteName = findColumnValue(row, [
      'Temporary Route Name', 'Temp Route', 'Alternative Route', 'Secondary Route',
      'Special Route', 'Extra Route', 'Additional Route'
    ])?.toString() || '';

    const via = findColumnValue(row, [
      'Via', 'Via Locations', 'Through', 'Route Via', 'Passing Through',
      'Intermediate Stops', 'Stops', 'Via Points'
    ])?.toString() || '';

    const routeNumbersRaw = findColumnValue(row, [
      'Route Number', 'Route Numbers', 'Route No', 'Service Numbers', 'Route Nos',
      'Service Number', 'Bus Number', 'Line Number', 'Service Code'
    ]);
    const routeNumbers = routeNumbersRaw
      ? routeNumbersRaw
          .toString()
          .split(/[\s,\/\-]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : null;

    const ntcNumber = findColumnValue(row, [
      'NTC Approved Service Type', 'NTC Number', 'NTC Service Type', 'Service Type', 'NTC Approval',
      'License Type', 'Permit Type', 'Service Category', 'Approval Type'
    ])?.toString() || '';

    const ownerAddress = findColumnValue(row, [
      'Permit Holder Address', 'Owner Address', 'Address', 'Holder Address',
      'Business Address', 'Company Address', 'Registered Address'
    ])?.toString() || '';

    const ownerNic = findColumnValue(row, [
      'Permit Holder NIC', 'Owner NIC', 'NIC', 'National ID', 'ID Number',
      'Identity Number', 'Identification Number', 'NIC Number'
    ])?.toString() || '';

    const seats = findColumnValue(row, [
      'Seeal Seating Capacity', 'Approved Seating Capacity', 'Seating Capacity', 'Seats', 'Capacity', 'No of Seats',
      'Passenger Capacity', 'Total Seats', 'Seat Count', 'Passengers', 'Maximum Issue Date'
    ]);

    const maxFare = findColumnValue(row, [
      'Approved Maximum Fare', 'Maximum Fare', 'Max Fare', 'Fare', 'Maximum Price',
      'Ticket Price', 'Maximum Charge', 'Fare Amount', 'Price'
    ]);

    const issueDate = findColumnValue(row, [
      'Issue Date', 'Issued Date', 'Date Issued', 'Grant Date', 'Approval Date',
      'License Date', 'Permit Date', 'Registration Date', 'Start Date'
    ]);

    const expiryDateRaw = findColumnValue(row, [
      'Expirary Date', 'Expiry Date', 'Expiration Date', 'Valid Until', 'End Date',
      'Renewal Date', 'Validity Date', 'Due Date'
    ]);

    const annualFee = findColumnValue(row, [
      'Temporary Total Amount', 'Annual Fee', 'Fee', 'License Fee', 'Permit Fee', 'Yearly Fee',
      'Registration Fee', 'Renewal Fee', 'Amount', 'Cost', 'Total Amount'
    ]);

    const activeInOperation = findColumnValue(row, [
      'Existing in Operation/ Active or Inactive', 'Active in Operation', 'Operation Status', 'Active', 'Operating', 'Status',
      'Current Status', 'Service Status', 'Operational', 'Existing in Operation'
    ]);

    // Handle allocated bus number (optional field)
    const allocatedBusNumber = findColumnValue(row, [
      'Allocated Bus Number', 'Bus Number', 'Bus No', 'Vehicle Number', 'Fleet Number'
    ])?.toString() || '';

    const mappedRow = {
      permit_no: permitNumber || '', // Use from Excel if available, will auto-generate if empty
      route_name: routeName,
      temporary_route_name: temporaryRouteName,
      via: via,
      route_numbers: routeNumbers,
      owner_name: ownerName || 'Unknown Owner',
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
      // Store allocated bus number in notes if provided
      notes: allocatedBusNumber ? `Allocated Bus: ${allocatedBusNumber}` : null,
    } as any;

    console.log('Mapped result:', {
      permit_no: mappedRow.permit_no,
      owner_name: mappedRow.owner_name,
      route_name: mappedRow.route_name,
      seats: mappedRow.seats,
      max_fare: mappedRow.max_fare,
      allocated_bus: allocatedBusNumber
    });
    
    return mappedRow;
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Permanent Route': 'Colombo - Kandy',
        'Temporary Route Name': 'Express Route',
        'Via': 'Kadawatha, Gampaha',
        'Route Number': '101, 102',
        'Permit Number': 'PRM001',
        'Allocated Bus Number': 'BUS-001',
        'Name of the Owner/Operator': 'John Doe Transport',
        'Permit Holder Address': '123 Main Street, Colombo',
        'Permit Holder NIC': '751234567V',
        'NTC Approved Service Type': 'Regular',
        'Seeal Seating Capacity': 49,
        'Temporary Total Amount': 75000.00,
        'Existing in Operation/ Active or Inactive': 'Active'
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

          // Map Excel data to database format with extensive debugging
          console.log('\n=== STARTING IMPORT PROCESS ===');
          console.log(`Total rows in Excel: ${jsonData.length}`);
          
          const mappedData = (jsonData as any[]).map((row, index) => {
            console.log(`\n--- Processing Row ${index + 1} ---`);
            return mapExcelToDatabase(row);
          });
          
          console.log('\n=== VALIDATION PHASE ===');
          
          // Much more permissive validation - accept row if it has ANY meaningful data
          const validData = mappedData.filter((row, index) => {
            const hasOwnerName = row.owner_name && row.owner_name !== 'Unknown Owner' && row.owner_name.trim() !== '';
            const hasRouteName = row.route_name && row.route_name !== '' && row.route_name.trim() !== '';
            const hasAnyData = hasOwnerName || hasRouteName || 
              (row.seats && row.seats > 0) || 
              (row.max_fare && row.max_fare > 0) ||
              (row.route_numbers && row.route_numbers.length > 0) ||
              (row.ntc_number && row.ntc_number !== '') ||
              (row.owner_address && row.owner_address !== '') ||
              (row.owner_nic && row.owner_nic !== '');
            
            console.log(`Row ${index + 1} validation:`, {
              hasOwnerName,
              hasRouteName,
              hasSeats: row.seats && row.seats > 0,
              hasFare: row.max_fare && row.max_fare > 0,
              hasRouteNumbers: row.route_numbers && row.route_numbers.length > 0,
              valid: hasAnyData
            });
            
            return hasAnyData;
          });

          console.log(`\nValidation complete: ${validData.length}/${mappedData.length} rows valid`);

          if (validData.length === 0) {
            console.error('No valid data found - all rows failed validation');
            toast.error('No valid data found in Excel file. Please check your data and try again.');
            return;
          }

          if (validData.length < mappedData.length) {
            console.warn(`${mappedData.length - validData.length} rows were skipped`);
            toast.warning(`${mappedData.length - validData.length} rows were skipped due to missing data.`);
          }

          // Assign permit numbers - use from Excel if available, otherwise auto-generate
          const assignedData = validData.map((row, idx) => {
            // If permit number exists in Excel data, use it; otherwise generate PRM001, PRM002, etc.
            const finalPermitNo = row.permit_no && row.permit_no.trim() !== '' 
              ? row.permit_no.trim()
              : `PRM${(idx + 1).toString().padStart(3, '0')}`;
            
            return {
              ...row,
              permit_no: finalPermitNo,
            };
          });

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
                 <p>• The system will match column names flexibly using fuzzy matching</p>
                 <p>• Any row with meaningful data will be imported (owner name, route, seats, fare, etc.)</p>
                 <p>• Completely empty rows will be skipped automatically</p>
                 <p>• Permit numbers will be auto-generated as PRM001, PRM002, etc.</p>
                 <p>• Check browser console for detailed import debugging information</p>
               </div>
              <p className="font-medium mt-3 mb-2">Your Excel Column Names (will be auto-matched):</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>• Permanent Route</span>
                <span>• Temporary Route Name</span>
                <span>• Via</span>
                <span>• Route Number</span>
                <span>• Permit Number</span>
                <span>• Allocated Bus Number</span>
                <span>• Name of the Owner/Operator</span>
                <span>• Permit Holder Address</span>
                <span>• Permit Holder NIC</span>
                <span>• NTC Approved Service Type</span>
                <span>• Seeal Seating Capacity</span>
                <span>• Temporary Total Amount</span>
                <span>• Existing in Operation/ Active or Inactive</span>
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