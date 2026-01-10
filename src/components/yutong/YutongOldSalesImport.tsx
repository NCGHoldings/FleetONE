import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useYutongOldSalesManagement, OldSalesRecord } from '@/hooks/useYutongOldSalesManagement';

// Column mapping from Excel headers to database fields (includes typo variants for parsing)
const COLUMN_MAPPING: Record<string, keyof OldSalesRecord> = {
  'no': 'row_number',
  'quotation id': 'quotation_no',
  'quoted date': 'quoted_date',
  'entered by': 'entered_by',
  'name': 'customer_name',
  'company': 'company_name',
  'address': 'customer_address',
  'contact no': 'customer_phone',
  'email adress': 'customer_email', // typo variant
  'email address': 'customer_email',
  'model': 'bus_model',
  'optional specifications': 'optional_specifications',
  'no of units': 'quantity',
  'base price': 'base_price',
  'total': 'total_before_discount',
  'discount': 'discount_amount',
  'price': 'subtotal_price',
  'vat': 'vat_amount',
  'advance payment': 'advance_payment',
  'final price': 'final_price',
  'sales person': 'sales_person',
  'quotation status': 'quotation_status',
};

// Unique headers for UI display (no duplicates)
const DISPLAY_HEADERS = [
  'no', 'quotation id', 'quoted date', 'entered by', 'name', 
  'company', 'address', 'contact no', 'email address', 'model', 
  'optional specifications', 'no of units', 'base price', 'total', 
  'discount', 'price', 'vat', 'advance payment', 'final price', 
  'sales person', 'quotation status'
];

interface YutongOldSalesImportProps {
  onImportComplete: () => void;
}

export const YutongOldSalesImport: React.FC<YutongOldSalesImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<OldSalesRecord[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  
  const { importOldSales } = useYutongOldSalesManagement();

  const parseExcelDate = (value: unknown): string | undefined => {
    if (!value) return undefined;
    
    // If it's a string date
    if (typeof value === 'string') {
      // Handle DD/MM/YYYY format (e.g., "19/02/2025")
      const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Handle MM-DD-YYYY format
      const mmddyyyy = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try standard Date parsing
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      
      return undefined;
    }
    
    // If it's an Excel date number
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return undefined;
  };

  const parseNumericValue = (value: unknown): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and spaces
      const cleaned = value.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        
        if (jsonData.length < 2) {
          setError('File appears to be empty or has no data rows');
          return;
        }

        // Get headers from first row
        const rawHeaders = (jsonData[0] as string[]).map(h => String(h || '').toLowerCase().trim());
        setHeaders(rawHeaders);

        // Process data rows
        const records: OldSalesRecord[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          if (!row || row.length === 0) continue;

          const record: Partial<OldSalesRecord> = {};
          
          rawHeaders.forEach((header, index) => {
            const mappedField = COLUMN_MAPPING[header];
            if (mappedField && row[index] !== undefined && row[index] !== null && row[index] !== '') {
              const value = row[index];
              
              // Handle different field types
              if (mappedField === 'quoted_date') {
                (record as Record<string, unknown>)[mappedField] = parseExcelDate(value);
              } else if (['quantity', 'row_number'].includes(mappedField)) {
                (record as Record<string, unknown>)[mappedField] = parseInt(String(value)) || 0;
              } else if (['base_price', 'total_before_discount', 'discount_amount', 'subtotal_price', 'vat_amount', 'advance_payment', 'final_price'].includes(mappedField)) {
                (record as Record<string, unknown>)[mappedField] = parseNumericValue(value);
              } else {
                (record as Record<string, unknown>)[mappedField] = String(value);
              }
            }
          });

          // Ensure required field exists
          if (record.customer_name || record.company_name || record.quotation_no) {
            records.push({
              customer_name: record.customer_name || record.company_name || 'Unknown',
              ...record
            } as OldSalesRecord);
          }
        }

        if (records.length === 0) {
          setError('No valid records found in the file. Please check column headers match expected format.');
          return;
        }

        setPreviewData(records);
        setError(null);
      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsBinaryString(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewData([]);
      setError(null);
      processFile(selectedFile);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file || previewData.length === 0) return;
    
    setImporting(true);
    const result = await importOldSales(file.name, previewData);
    setImporting(false);
    
    if (result) {
      setFile(null);
      setPreviewData([]);
      setHeaders([]);
      onImportComplete();
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Old Sales Data
          </CardTitle>
          <CardDescription>
            Upload an Excel (.xlsx, .xls) or CSV file containing your historical sales data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary font-medium">Drop the file here...</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-2">
                  Drag & drop your Excel/CSV file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supported formats: .xlsx, .xls, .csv
                </p>
              </>
            )}
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="font-medium">{file.name}</span>
                <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Expected Column Format */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Column Headers</CardTitle>
          <CardDescription>
            Your Excel/CSV file should have these column headers (case-insensitive)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DISPLAY_HEADERS.map((header) => (
              <Badge 
                key={header} 
                variant={headers.includes(header) || (header === 'email address' && headers.includes('email adress')) ? 'default' : 'outline'}
                className="capitalize"
              >
                {(headers.includes(header) || (header === 'email address' && headers.includes('email adress'))) && <Check className="h-3 w-3 mr-1" />}
                {header}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Data Preview ({previewData.length} records)</span>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Import All Records
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Review the data before importing. First 10 records shown below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Quotation ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Final Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.row_number || index + 1}</TableCell>
                      <TableCell>{record.quotation_no || '-'}</TableCell>
                      <TableCell>{record.quoted_date || '-'}</TableCell>
                      <TableCell>{record.customer_name}</TableCell>
                      <TableCell>{record.company_name || '-'}</TableCell>
                      <TableCell>{record.bus_model || '-'}</TableCell>
                      <TableCell className="text-right">{record.quantity || 1}</TableCell>
                      <TableCell className="text-right">
                        {record.final_price?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.quotation_status || 'N/A'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 10 && (
                <p className="text-center text-muted-foreground py-4">
                  ... and {previewData.length - 10} more records
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
