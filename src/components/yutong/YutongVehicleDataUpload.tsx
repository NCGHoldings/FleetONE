import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2, Plus, Ship } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useYutongVehicleDataManagement, ColumnMapping } from '@/hooks/useYutongVehicleDataManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onUploadComplete: () => void;
}

const FIELD_OPTIONS = [
  { value: 'vehicle_no', label: 'Vehicle No / Item No' },
  { value: 'model', label: 'Model' },
  { value: 'engine_no', label: 'Engine No' },
  { value: 'chassis_no', label: 'Chassis No / VIN No' },
  { value: 'seat_config', label: 'Seat Config' },
  { value: 'color', label: 'Color' },
  { value: 'customer_name', label: 'Customer Name' },
  { value: 'year_of_manufacture', label: 'Year of Manufacture' },
  { value: 'order_no', label: 'Order No (stored in raw data)' },
  { value: 'skip', label: '-- Skip Column --' },
];

// Detect if a row is a section header (e.g. "C9 Customers and Exstock - 37+1+1 = 9")
function isSectionHeaderRow(row: any[], mappedFields: Record<number, string | null>): boolean {
  // If most mapped fields (engine, chassis, model) are empty, it's likely a header
  let mappedCellsEmpty = 0;
  let mappedCellsTotal = 0;
  
  for (const [idxStr, field] of Object.entries(mappedFields)) {
    if (!field || field === 'skip') continue;
    if (['engine_no', 'chassis_no', 'model', 'seat_config', 'color'].includes(field)) {
      mappedCellsTotal++;
      const val = row[parseInt(idxStr)];
      if (val === null || val === undefined || String(val).trim() === '') {
        mappedCellsEmpty++;
      }
    }
  }
  
  // If 3+ important fields are empty, likely a header row
  return mappedCellsTotal >= 3 && mappedCellsEmpty >= 3;
}

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
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [newShipmentName, setNewShipmentName] = useState('');
  const [headerRowIndices, setHeaderRowIndices] = useState<Set<number>>(new Set());

  const { autoDetectColumnMapping, createDataSheet, insertVehicleRecords, isLoading } = useYutongVehicleDataManagement();

  const fetchShipments = async () => {
    const { data } = await supabase
      .from('yutong_shipment_groups')
      .select('id, shipment_no, shipment_name')
      .order('created_at', { ascending: false });
    setShipments(data || []);
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  // Recompute header rows when mappings change
  useEffect(() => {
    if (allData.length > 0 && columnMappings.length > 0) {
      const mappedFields: Record<number, string | null> = {};
      columnMappings.forEach((m, idx) => {
        mappedFields[idx] = m.mappedTo;
      });
      
      const headerIndices = new Set<number>();
      allData.forEach((row, idx) => {
        if (isSectionHeaderRow(row, mappedFields)) {
          headerIndices.add(idx);
        }
      });
      setHeaderRowIndices(headerIndices);
    }
  }, [allData, columnMappings]);

  const validDataCount = allData.length - headerRowIndices.size;

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
      setPreviewData(dataRows.slice(0, 10));
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

  const handleCreateShipment = async () => {
    if (!newShipmentName.trim()) {
      toast.error('Please enter a shipment name');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { data, error } = await (supabase
        .from('yutong_shipment_groups') as any)
        .insert({
          shipment_name: newShipmentName.trim(),
          status: 'planning',
        })
        .select('id, shipment_no, shipment_name')
        .single();

      if (error) throw error;
      
      setShipments(prev => [data, ...prev]);
      setSelectedShipment(data.id);
      setIsCreatingShipment(false);
      setNewShipmentName('');
      toast.success(`Shipment ${data.shipment_no} created`);
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      toast.error(error.message || 'Failed to create shipment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const modelMapping = columnMappings.find(m => m.mappedTo === 'model');
    if (!modelMapping) {
      toast.error('Please map at least the "Model" column');
      return;
    }

    setIsProcessing(true);
    try {
      const mappingObj: Record<string, string> = {};
      columnMappings.forEach(m => {
        if (m.mappedTo) {
          mappingObj[m.excelColumn] = m.mappedTo;
        }
      });

      const sheetId = await createDataSheet(
        sheetName,
        file.name,
        mappingObj,
        selectedShipment || undefined
      );

      if (!sheetId) {
        throw new Error('Failed to create data sheet');
      }

      // Filter out section header rows and transform data
      const vehicleRecords = allData
        .filter((_, idx) => !headerRowIndices.has(idx))
        .map(row => {
          const record: any = { raw_data: {} };
          headers.forEach((header, idx) => {
            const mapping = columnMappings[idx];
            const value = row[idx];
            record.raw_data[header] = value;
            
            if (mapping?.mappedTo && value !== null && value !== undefined) {
              if (mapping.mappedTo === 'order_no') {
                // Store order_no only in raw_data
                record.raw_data['_order_no'] = String(value).trim();
              } else if (mapping.mappedTo === 'year_of_manufacture') {
                record[mapping.mappedTo] = parseInt(String(value)) || null;
              } else {
                record[mapping.mappedTo] = String(value).trim();
              }
            }
          });
          return record;
        });

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
    setIsCreatingShipment(false);
    setNewShipmentName('');
    setHeaderRowIndices(new Set());
  };

  // Get model summary from data
  const getModelSummary = () => {
    const modelIdx = columnMappings.findIndex(m => m.mappedTo === 'model');
    if (modelIdx === -1) return {};
    const counts: Record<string, number> = {};
    allData.forEach((row, idx) => {
      if (headerRowIndices.has(idx)) return;
      const model = String(row[modelIdx] || '').trim();
      if (model) {
        counts[model] = (counts[model] || 0) + 1;
      }
    });
    return counts;
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
            Upload an Excel or CSV file containing vehicle details (Item No, Model, Engine No, VIN/Chassis No, Seat, Color, Customer Name, Order No)
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

  const modelSummary = getModelSummary();

  return (
    <div className="space-y-6">
      {/* File Info & Shipment */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle className="text-lg">{file?.name}</CardTitle>
                <CardDescription>
                  {allData.length} rows detected
                  {headerRowIndices.size > 0 && (
                    <span className="text-orange-500"> · {headerRowIndices.size} section header(s) will be skipped</span>
                  )}
                  <span className="text-primary font-medium"> · {validDataCount} vehicles to import</span>
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Summary */}
          {Object.keys(modelSummary).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(modelSummary).map(([model, count]) => (
                <Badge key={model} variant="secondary" className="text-xs">
                  {model}: {count} units
                </Badge>
              ))}
            </div>
          )}

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
              <Label>Link to Shipment</Label>
              {isCreatingShipment ? (
                <div className="flex gap-2">
                  <Input
                    value={newShipmentName}
                    onChange={(e) => setNewShipmentName(e.target.value)}
                    placeholder="Shipment name (e.g. Shipment 7)"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleCreateShipment} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCreatingShipment(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select value={selectedShipment || 'none'} onValueChange={(v) => {
                  if (v === 'create_new') {
                    setIsCreatingShipment(true);
                    setNewShipmentName(sheetName || '');
                  } else {
                    setSelectedShipment(v === 'none' ? '' : v);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_new">
                      <span className="flex items-center gap-2 text-primary font-medium">
                        <Plus className="h-3 w-3" /> Create New Shipment
                      </span>
                    </SelectItem>
                    <SelectItem value="none">No Shipment</SelectItem>
                    {shipments.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <Ship className="h-3 w-3" /> {s.shipment_nohipment_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedShipment && !isCreatingShipment && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ Linked to {shipments.find(s => s.id === selectedShipment)?.shipment_no}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Column Mapping</CardTitle>
          <CardDescription>
            Review auto-detected mappings and adjust if needed. Green = auto-detected.
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
                      <SelectTrigger className="w-[200px]">
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
          <CardDescription>
            First {Math.min(previewData.length, 10)} rows · Section headers highlighted in orange will be skipped during import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  {headers.map((h, idx) => (
                    <TableHead key={idx} className="whitespace-nowrap">
                      {h}
                      {columnMappings[idx]?.mappedTo && (
                        <span className="block text-xs text-primary font-normal">
                          → {FIELD_OPTIONS.find(f => f.value === columnMappings[idx].mappedTo)?.label || columnMappings[idx].mappedTo}
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, rowIdx) => {
                  const isHeader = headerRowIndices.has(rowIdx);
                  return (
                    <TableRow key={rowIdx} className={isHeader ? 'bg-orange-500/10 opacity-60' : ''}>
                      <TableCell className="text-xs text-muted-foreground">
                        {rowIdx + 1}
                        {isHeader && (
                          <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-orange-500/10 text-orange-600 border-orange-500/30">
                            skip
                          </Badge>
                        )}
                      </TableCell>
                      {headers.map((_, colIdx) => (
                        <TableCell key={colIdx} className="whitespace-nowrap text-sm">
                          {row[colIdx] ?? '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {allData.length > 10 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              ... and {allData.length - 10} more rows
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {validDataCount} vehicles will be imported
          {selectedShipment && (
            <Badge variant="outline" className="ml-2">
              <Ship className="h-3 w-3 mr-1" />
              {shipments.find(s => s.id === selectedShipment)?.shipment_number}
 o      </Badge>
          )}
        </div>
        <div className="flex gap-3">
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
                Import {validDataCount} Vehicles
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
