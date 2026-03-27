import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx-js-style';
import { Upload, Download, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { ImportValidationReport } from './ImportValidationReport';
import type { ValidationRow } from './ImportValidationReport';

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
  const [validationResults, setValidationResults] = useState<ValidationRow[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [autoCreateMissing, setAutoCreateMissing] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Bus No': 'NE 0746',
        'Route No': '15',
        'Route Name': 'Badulla to makumbura',
        'Driver': 'Jayashantha',
        'Conductor': 'Upul',
        'Whatsapp': '0702502294',
        'Date': '01 October 2025',
        'Time': '10.30am'
      },
      {
        'Bus No': 'NE 0762',
        'Route No': '15',
        'Route Name': 'Badulla to makumbura',
        'Driver': 'Mohan',
        'Conductor': 'Eranda',
        'Whatsapp': '0768450468',
        'Date': '02 October 2025',
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
    
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      
      // Handle long date format: "01 October 2025" or "7 October 2025"
      const longDateRegex = /^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i;
      const longMatch = trimmed.match(longDateRegex);
      
      if (longMatch) {
        const day = longMatch[1].padStart(2, '0');
        const monthName = longMatch[2].toLowerCase();
        const year = longMatch[3];
        
        const monthMap: Record<string, string> = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04',
          'may': '05', 'june': '06', 'july': '07', 'august': '08',
          'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };
        
        const month = monthMap[monthName];
        console.log(`✅ Long date parsed: "${trimmed}" → ${day}/${month}/${year}`);
        return `${day}/${month}/${year}`; // Return DD/MM/YYYY
      }
      
      // Handle DD/MM/YYYY format
      const shortDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
      const shortMatch = trimmed.match(shortDateRegex);
      
      if (shortMatch) {
        const day = shortMatch[1].padStart(2, '0');
        const month = shortMatch[2].padStart(2, '0');
        const year = shortMatch[3];
        
        // Validate day and month ranges
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
          console.log(`✅ Short date parsed: ${day}/${month}/${year}`);
          return `${day}/${month}/${year}`;
        } else {
          console.error(`❌ Invalid day/month: ${day}/${month}/${year}`);
        }
      }
    }
    
    // Handle Excel serial numbers
    if (typeof dateValue === 'number' && dateValue > 0 && dateValue < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      console.log(`✅ Excel serial ${dateValue} → ${day}/${month}/${year}`);
      return `${day}/${month}/${year}`;
    }
    
    // Handle Date objects
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      const day = dateValue.getDate().toString().padStart(2, '0');
      const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
      const year = dateValue.getFullYear();
      console.log(`✅ Date object parsed: ${day}/${month}/${year}`);
      return `${day}/${month}/${year}`;
    }
    
    console.error('❌ Could not parse date:', dateValue);
    return null;
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
            errors.push(`Row ${rowNum}: Invalid date format. Received: "${row['Date']}". Use DD/MM/YYYY (e.g., 01/10/2025) or long format (e.g., 01 October 2025)`);
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

  const validateDataAgainstDatabase = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to validate');
      return;
    }

    setIsValidating(true);
    setShowValidation(false);

    try {
      // Fetch existing data from database
      const [busesResult, routesResult, staffResult] = await Promise.all([
        supabase.from('buses').select('id, bus_no'),
        supabase.from('routes').select('id, route_no, route_name'),
        supabase.from('profiles').select('user_id, first_name, last_name')
      ]);

      const buses = busesResult.data || [];
      const routes = routesResult.data || [];
      const staff = staffResult.data || [];

      const validationResults: ValidationRow[] = parsedData.map((allocation, index) => {
        const rowNumber = index + 2; // Excel row (1-indexed + header)
        
        // Check bus
        const busFound = buses.find(b => b.bus_no === allocation.busNo);
        const busCheck = {
          status: busFound ? 'found' : (autoCreateMissing ? 'will_create' : 'not_found'),
          message: busFound 
            ? `✓ Bus "${allocation.busNo}" exists in database` 
            : autoCreateMissing
              ? `Will create new bus "${allocation.busNo}"`
              : `❌ Bus "${allocation.busNo}" not found in database`
        };

        // Check route (by route_no OR route_name)
        const routeFound = routes.find(r => 
          r.route_no === allocation.routeNo || 
          r.route_name?.toLowerCase().includes(allocation.routeName?.toLowerCase())
        );
        const routeCheck = {
          status: routeFound ? 'found' : (autoCreateMissing ? 'will_create' : 'not_found'),
          message: routeFound 
            ? `✓ Route "${allocation.routeNo}" → "${routeFound.route_name}"` 
            : autoCreateMissing
              ? `Will create new route "${allocation.routeNo} - ${allocation.routeName}"`
              : `❌ Route "${allocation.routeNo}" not found`
        };

        // Check driver
        const driverFound = staff.find(s => 
          s.first_name?.toLowerCase() === allocation.driverName?.toLowerCase()
        );
        const driverCheck = {
          status: driverFound ? 'found' : (autoCreateMissing ? 'will_create' : 'not_found'),
          message: driverFound 
            ? `✓ Driver "${allocation.driverName}" exists` 
            : autoCreateMissing
              ? `Will create new driver profile for "${allocation.driverName}"`
              : `❌ Driver "${allocation.driverName}" not found`
        };

        // Check conductor
        const conductorFound = staff.find(s => 
          s.first_name?.toLowerCase() === allocation.conductorName?.toLowerCase()
        );
        const conductorCheck = {
          status: conductorFound ? 'found' : (autoCreateMissing ? 'will_create' : 'not_found'),
          message: conductorFound 
            ? `✓ Conductor "${allocation.conductorName}" exists` 
            : autoCreateMissing
              ? `Will create new conductor profile for "${allocation.conductorName}"`
              : `❌ Conductor "${allocation.conductorName}" not found`
        };

        // Validate date format
        const dateValid = allocation.date && /^\d{2}\/\d{2}\/\d{4}$/.test(allocation.date);
        const dateCheck = {
          status: dateValid ? 'valid' : 'invalid',
          message: dateValid ? `✓ Valid date: ${allocation.date}` : `❌ Invalid date format: ${allocation.date}`
        };

        // Validate WhatsApp (optional)
        const whatsappValid = !allocation.whatsapp || /^0\d{9}$/.test(allocation.whatsapp);
        const whatsappCheck = {
          status: allocation.whatsapp ? (whatsappValid ? 'valid' : 'invalid') : 'missing',
          message: allocation.whatsapp 
            ? whatsappValid 
              ? `✓ Valid WhatsApp: ${allocation.whatsapp}` 
              : `⚠ Invalid WhatsApp format: ${allocation.whatsapp}`
            : 'No WhatsApp number provided (optional)'
        };

        // Determine overall row status
        let rowStatus: 'valid' | 'warning' | 'error' = 'valid';
        
        if (!dateValid || (!autoCreateMissing && (!busFound || !routeFound || !driverFound || !conductorFound))) {
          rowStatus = 'error';
        } else if (!busFound || !routeFound || !driverFound || !conductorFound || !whatsappValid) {
          rowStatus = 'warning';
        }

        return {
          rowNumber,
          status: rowStatus,
          data: allocation,
          checks: {
            bus: busCheck as any,
            route: routeCheck as any,
            driver: driverCheck as any,
            conductor: conductorCheck as any,
            date: dateCheck as any,
            whatsapp: whatsappCheck as any
          }
        };
      });

      setValidationResults(validationResults);
      setShowValidation(true);
      
      const errorCount = validationResults.filter(r => r.status === 'error').length;
      const warningCount = validationResults.filter(r => r.status === 'warning').length;
      
      if (errorCount > 0) {
        toast.error(`Validation complete: ${errorCount} error(s) found`);
      } else if (warningCount > 0) {
        toast.success(`Validation complete: ${warningCount} warning(s)`);
      } else {
        toast.success('✓ All rows validated successfully!');
      }
      
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error('Failed to validate data: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to import. Please upload an Excel file first.');
      return;
    }

    // Check validation results for errors
    const errorRows = validationResults.filter(r => r.status === 'error');
    if (errorRows.length > 0 && !autoCreateMissing) {
      toast.error(`Cannot import: ${errorRows.length} row(s) have critical errors`);
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
        body: JSON.stringify({ 
          allocations: parsedData,
          autoCreateMissing: autoCreateMissing 
        })
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
        setValidationResults([]);
        setShowValidation(false);
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {showValidation ? 'Import Validation Report' : 'Bulk Import Driver Allocations from Excel'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {showValidation ? (
            // Validation Report View
            <ImportValidationReport 
              validationResults={validationResults}
              autoCreateEnabled={autoCreateMissing}
            />
          ) : (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Excel Format Instructions:</h4>
            <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-sm">
              <li>• Required columns: <strong>Bus No, Route No, Route Name, Driver, Conductor, Date, Time</strong></li>
              <li>• Optional column: <strong>Whatsapp</strong> (phone number)</li>
              <li>• Date format: <strong>DD/MM/YYYY</strong> (e.g., 01/10/2025) <strong>OR</strong> long format (e.g., 01 October 2025)</li>
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

          {/* Auto-Create Option */}
          {parsedData.length > 0 && (
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <Checkbox 
                id="auto-create"
                checked={autoCreateMissing}
                onCheckedChange={(checked) => setAutoCreateMissing(!!checked)}
              />
              <div className="flex-1">
                <label htmlFor="auto-create" className="text-sm font-medium cursor-pointer">
                  Automatically create missing buses, routes, drivers, and conductors
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  If disabled, import will fail for rows with missing data. If enabled, new profiles will be created with default values.
                </p>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <DialogFooter className="border-t pt-4">
          {showValidation ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowValidation(false)}
                disabled={isProcessing}
              >
                ← Back to Upload
              </Button>
              <Button 
                onClick={handleBulkImport}
                disabled={isProcessing || validationResults.filter(r => r.status === 'error').length > 0}
                className="gap-2"
              >
                {isProcessing ? 'Importing...' : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Import {parsedData.length} Allocations
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={validateDataAgainstDatabase}
                disabled={isValidating || parsedData.length === 0}
                className="gap-2"
              >
                {isValidating ? 'Validating...' : 'Validate & Preview →'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}