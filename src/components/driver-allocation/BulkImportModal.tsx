import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AllocationData {
  busNo: string;
  routeNo: string;
  routeName: string;
  driverName: string;
  conductorName: string;
  whatsapp: string;
  date: string;
  time: string;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<AllocationData[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Bus No': 'NE 0746',
        'Route No': '15',
        'Route Name': 'Badulla to makumbura',
        'Driver': 'Jayashantha',
        'Conductor': 'Upul',
        'Whatsapp': '0702502294',
        'Date': '01/10/2025',
        'Time': '10.30am'
      },
      {
        'Bus No': 'NE 0762',
        'Route No': '15',
        'Route Name': 'Badulla to makumbura',
        'Driver': 'Mohan',
        'Conductor': 'Eranda',
        'Whatsapp': '0768450468',
        'Date': '02/10/2025',
        'Time': '5.30pm'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Driver Allocations');
    XLSX.writeFile(wb, 'driver_allocation_template.xlsx');
    toast.success('Sample template downloaded!');
  };

  const parseExcelDate = (dateValue: any): string | null => {
    console.log('Parsing date value:', dateValue, 'Type:', typeof dateValue);
    
    // If it's already a string in DD/MM/YYYY format
    if (typeof dateValue === 'string') {
      const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
      const match = dateValue.match(regex);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        
        // Validate day and month ranges
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
          console.log(`✅ String date parsed: ${day}/${month}/${year}`);
          return `${day}/${month}/${year}`; // Return DD/MM/YYYY
        } else {
          console.error(`❌ Invalid day/month: ${day}/${month}/${year}`);
        }
      }
    }
    
    // If it's an Excel serial number (number between 1 and 100000)
    if (typeof dateValue === 'number' && dateValue > 0 && dateValue < 100000) {
      // Excel epoch starts at 1900-01-01 (with 1900 leap year bug)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      console.log(`✅ Excel serial ${dateValue} → ${day}/${month}/${year}`);
      return `${day}/${month}/${year}`; // Return DD/MM/YYYY
    }
    
    // If it's a Date object (shouldn't happen with cellDates: false, but just in case)
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      const day = dateValue.getDate().toString().padStart(2, '0');
      const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
      const year = dateValue.getFullYear();
      console.log(`✅ Date object parsed: ${day}/${month}/${year}`);
      return `${day}/${month}/${year}`;
    }
    
    console.error('❌ Could not parse date:', dateValue);
    return null; // Invalid format
  };

  const validateWhatsAppFormat = (whatsapp: string): boolean => {
    // Sri Lankan WhatsApp format: 10 digits starting with 0
    const whatsappPattern = /^0\d{9}$/;
    return whatsappPattern.test(whatsapp);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: false,  // ✅ Keep dates as raw text values (no locale-dependent parsing)
          raw: false         // ✅ Convert all cells to strings
        });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const errors: string[] = [];
        const warnings: string[] = [];
        const allocations: AllocationData[] = [];

        jsonData.forEach((row: any, index: number) => {
          const rowNum = index + 2; // Excel row number (1-indexed + header)

          // Validate required fields
          if (!row['Bus No']) errors.push(`Row ${rowNum}: Missing Bus No`);
          if (!row['Route No']) errors.push(`Row ${rowNum}: Missing Route No`);
          if (!row['Route Name']) errors.push(`Row ${rowNum}: Missing Route Name`);
          if (!row['Driver']) errors.push(`Row ${rowNum}: Missing Driver`);
          if (!row['Conductor']) errors.push(`Row ${rowNum}: Missing Conductor`);
          if (!row['Date']) errors.push(`Row ${rowNum}: Missing Date`);
          if (!row['Time']) errors.push(`Row ${rowNum}: Missing Time`);

          // Parse and validate date format
          const parsedDate = row['Date'] ? parseExcelDate(row['Date']) : null;
          if (row['Date'] && !parsedDate) {
            errors.push(`Row ${rowNum}: Invalid date format. Received: ${row['Date']}. Use DD/MM/YYYY or Excel date format`);
          }

          // Validate WhatsApp format (warning only, not blocking)
          if (row['Whatsapp'] && !validateWhatsAppFormat(String(row['Whatsapp']))) {
            warnings.push(`Row ${rowNum}: WhatsApp number "${row['Whatsapp']}" may be invalid. Expected format: 0XXXXXXXXX (10 digits)`);
          }

          // If no critical errors for this row, add to allocations
          if (row['Bus No'] && row['Route No'] && parsedDate) {
            allocations.push({
              busNo: String(row['Bus No']).trim(),
              routeNo: String(row['Route No']).trim(),
              routeName: String(row['Route Name'] || '').trim(),
              driverName: String(row['Driver'] || '').trim(),
              conductorName: String(row['Conductor'] || '').trim(),
              whatsapp: String(row['Whatsapp'] || '').trim(),
              date: parsedDate,
              time: String(row['Time'] || '').trim()
            });
          }
        });

        // Show all errors and warnings
        const allMessages = [...errors, ...warnings];
        setParseErrors(allMessages);
        setParsedData(allocations);

        if (errors.length > 0) {
          toast.error(`Found ${allocations.length} allocations with ${errors.length} error(s)${warnings.length > 0 ? ` and ${warnings.length} warning(s)` : ''}`);
        } else if (warnings.length > 0) {
          toast.warning(`Parsed ${allocations.length} allocations with ${warnings.length} warning(s)`);
        } else if (allocations.length > 0) {
          toast.success(`Parsed ${allocations.length} allocations successfully`);
        }
      } catch (error) {
        console.error('Excel parsing error:', error);
        toast.error('Failed to parse Excel file. Please check the format.');
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleBulkImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to import. Please upload an Excel file first.');
      return;
    }

    // Only block on actual errors, not warnings
    const actualErrors = parseErrors.filter(msg => !msg.includes('may be invalid'));
    if (actualErrors.length > 0) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/driver-allocation-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allocations: parsedData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('Import result:', result);
      
      // Display row-by-row results
      if (result.rowResults && result.rowResults.length > 0) {
        const successRows = result.rowResults.filter((r: any) => r.status === 'success');
        const failedRows = result.rowResults.filter((r: any) => r.status === 'failed');
        
        if (successRows.length > 0) {
          toast.success(`Successfully imported ${successRows.length} allocations`);
        }
        
        if (failedRows.length > 0) {
          console.error('Failed rows:', failedRows);
          failedRows.forEach((row: any) => {
            toast.error(`Row ${row.row} failed: ${row.error}`, { duration: 8000 });
          });
        }
      } else {
        // Fallback to old result format
        if (result.success > 0) {
          toast.success(`Successfully imported ${result.success} driver allocations!`);
        }
      }
      
      // Show created entities summary
      if (result.created?.buses.length > 0) {
        toast.info(`Created ${result.created.buses.length} new buses`);
      }
      if (result.created?.staff.length > 0) {
        toast.info(`Created ${result.created.staff.length} new staff members`);
      }
      
      if (result.success > 0) {
        onSuccess();
        onClose();
        // Reset state
        setFile(null);
        setParsedData([]);
        setParseErrors([]);
      }

      // Display general errors
      if (result.errors && result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        result.errors.forEach((error: string) => {
          toast.error(error, { duration: 8000 });
        });
      }

    } catch (error: any) {
      console.error('Bulk import error:', error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Driver Allocations from Excel
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Excel Format Instructions:</h4>
            <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-sm">
              <li>• Required columns: <strong>Bus No, Route No, Route Name, Driver, Conductor, Date, Time</strong></li>
              <li>• Optional column: <strong>Whatsapp</strong> (phone number)</li>
              <li>• Date format: <strong>DD/MM/YYYY</strong> (e.g., 01/10/2025 for October 1, 2025)</li>
              <li>• Time format: <strong>HH.MMam/pm</strong> (e.g., 10.30am, 5.30pm)</li>
              <li>• WhatsApp format: <strong>0XXXXXXXXX</strong> (10 digits, e.g., 0702502294)</li>
              <li>• All fields are case-sensitive and must match exactly</li>
            </ul>
            <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs">
              <strong>Note:</strong> Route numbers from Excel will be used to find or create routes in the database. 
              The system will automatically match routes by name or number.
            </div>
          </div>

          {/* Download Template Button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Sample Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="excel-upload">Upload Excel File (.xlsx or .xls)</Label>
            <div className="flex gap-2">
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
              <h4 className="font-semibold text-destructive mb-2">Validation Errors ({parseErrors.length}):</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {parseErrors.map((error, index) => (
                  <p key={index} className="text-sm text-destructive">• {error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Preview Data */}
          {parsedData.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg border">
              <h3 className="font-semibold mb-3">Preview Data ({parsedData.length} allocations)</h3>
              <div className="max-h-96 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Bus No</th>
                      <th className="text-left p-2 font-medium">Route</th>
                      <th className="text-left p-2 font-medium">Route Name</th>
                      <th className="text-left p-2 font-medium">Driver</th>
                      <th className="text-left p-2 font-medium">Conductor</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((allocation, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">{allocation.busNo}</td>
                        <td className="p-2">{allocation.routeNo}</td>
                        <td className="p-2">{allocation.routeName}</td>
                        <td className="p-2">{allocation.driverName}</td>
                        <td className="p-2">{allocation.conductorName}</td>
                        <td className="p-2">{allocation.date}</td>
                        <td className="p-2">{allocation.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* What Will Be Created */}
          {parsedData.length > 0 && parseErrors.length === 0 && (
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Ready to Import:</h4>
              <ul className="text-green-800 dark:text-green-200 space-y-1 text-sm">
                <li>• {parsedData.length} driver allocations will be created</li>
                <li>• New buses, routes, and staff members will be created automatically if they don't exist</li>
                <li>• Each allocation will generate a corresponding daily trip entry</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={isProcessing || parsedData.length === 0 || parseErrors.some(msg => !msg.includes('may be invalid'))}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {parsedData.length} Allocations
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}