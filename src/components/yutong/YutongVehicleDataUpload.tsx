import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useYutongVehicleDataManagement, ColumnMapping } from '@/hooks/useYutongVehicleDataManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onUploadComplete: () => void;
}

const FIELD_OPTIONS = [
  { value: 'vehicle_no', label: 'Vehicle No' },
  { value: 'model', label: 'Model' },
  { value: 'engine_no', label: 'Engine No' },
  { value: 'chassis_no', label: 'Chassis No' },
  { value: 'seat_config', label: 'Seat Config' },
  { value: 'color', label: 'Color' },
  { value: 'customer_name', label: 'Customer Name' },
  { value: 'year_of_manufacture', label: 'Year of Manufacture' },
  { value: 'skip', label: '-- Skip Column --' },
];

export function YutongVehicleDataUpload({ onUploadComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<string>('');
  const [shipments, setShipments] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');

  const { autoDetectColumnMapping, createDataSheet, insertVehicleRecords, isLoading } = useYutongVehicleDataManagement();

  // Fetch shipments on mount
  useState(() => {
    const fetchShipments = async () => {
      const { data } = await supabase
        .from('yutong_shipment_groups')
        .select('id, shipment_number, shipment_name')
        .order('created_at', { ascending: false });
      setShipments(data || []);
    };
    fetchShipments();
  });

  const processFile = useCallback(async (acceptedFile: File) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await acceptedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error('File must have at least a header row and one data row');
        return;
      }

      const fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim()).filter(h => h);
      const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));

      setFile(acceptedFile);
      setHeaders(fileHeaders);
      setPreviewData(dataRows.slice(0, 5));
      setAllData(dataRows);
      setSheetName(acceptedFile.name.replace(/\.[^/.]+$/, ''));

      // Auto-detect column mappings
      const mappings = autoDetectColumnMapping(fileHeaders);
      setColumnMappings(mappings);
      setStep('mapping');
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [autoDetectColumnMapping]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
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

  const updateMapping = (index: number, value: string) => {
    setColumnMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], mappedTo: value === 'skip' ? null : value, autoDetected: false };
      return updated;
    });
  };

  const handleImport = async () => {
    if (!file) return;

    // Validate at least model is mapped
    const modelMapping = columnMappings.find(m => m.mappedTo === 'model');
    if (!modelMapping) {
      toast.error('Please map at least the "Model" column');
      return;
    }

    setIsProcessing(true);
    try {
      // Create column mapping object
      const mappingObj: Record<string, string> = {};
      columnMappings.forEach(m => {
        if (m.mappedTo) {
          mappingObj[m.excelColumn] = m.mappedTo;
        }
      });

      // Create data sheet record
      const sheetId = await createDataSheet(
        sheetName,
        file.name,
        mappingObj,
        selectedShipment || undefined
      );

      if (!sheetId) {
        throw new Error('Failed to create data sheet');
      }

      // Transform data based on mappings
      const vehicleRecords = allData.map(row => {
        const record: any = { raw_data: {} };
        headers.forEach((header, idx) => {
          const mapping = columnMappings[idx];
          const value = row[idx];
          record.raw_data[header] = value;
          
          if (mapping?.mappedTo && value !== null && value !== undefined) {
            if (mapping.mappedTo === 'year_of_manufacture') {
              record[mapping.mappedTo] = parseInt(String(value)) || null;
            } else {
              record[mapping.mappedTo] = String(value).trim();
            }
          }
        });
        return record;
      });

      // Insert vehicle records
      const success = await insertVehicleRecords(sheetId, vehicleRecords, selectedShipment || undefined);
      
      if (success) {
        onUploadComplete();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error importing data:', error);
      toast.error(error.message || 'Failed to import data');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
    setAllData([]);
    setColumnMappings([]);
    setSheetName('');
    setSelectedShipment('');
    setStep('upload');
  };

  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Vehicle Data Sheet
          </CardTitle>
          <CardDescription>
            Upload an Excel or CSV file containing vehicle details (No, Model, Engine No, Chassis No, Seat, Color, Customer Name)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Processing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your Excel/CSV file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle className="text-lg">{file?.name}</CardTitle>
                <CardDescription>{allData.length} rows detected</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Sheet Name</Label>
              <Input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Enter a name for this data sheet"
              />
            </div>
            <div>
              <Label>Link to Shipment (Optional)</Label>
              <Select value={selectedShipment || 'none'} onValueChange={(v) => setSelectedShipment(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Shipment</SelectItem>
                  {shipments.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.shipment_number} - {s.shipment_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Column Mapping</CardTitle>
          <CardDescription>
            Review auto-detected mappings and adjust if needed. Columns marked with green are auto-detected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Excel Column</TableHead>
                <TableHead>Detection</TableHead>
                <TableHead>Map To</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columnMappings.map((mapping, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{mapping.excelColumn}</TableCell>
                  <TableCell>
                    {mapping.autoDetected ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Auto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                        <AlertCircle className="h-3 w-3 mr-1" /> Manual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.mappedTo || 'skip'}
                      onValueChange={(v) => updateMapping(idx, v)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping.confidence > 0 && (
                      <Badge variant={mapping.confidence >= 90 ? 'default' : 'secondary'}>
                        {mapping.confidence}%
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <CardDescription>First 5 rows of your data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h, idx) => (
                    <TableHead key={idx} className="whitespace-nowrap">
                      {h}
                      {columnMappings[idx]?.mappedTo && (
                        <span className="block text-xs text-primary font-normal">
                          → {columnMappings[idx].mappedTo}
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {headers.map((_, colIdx) => (
                      <TableCell key={colIdx} className="whitespace-nowrap">
                        {row[colIdx] ?? '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetForm}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isProcessing || isLoading}>
          {isProcessing || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import {allData.length} Vehicles
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
