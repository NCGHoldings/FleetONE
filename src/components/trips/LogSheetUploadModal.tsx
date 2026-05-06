import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Upload, Loader2, Save, Camera, Search, AlertCircle, CheckCircle2, CalendarIcon, ChevronDown, ChevronRight, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { extractLogSheetData, OCRLogSheetResult, LogSheetRow } from '@/lib/ocr-log-sheet-processor';
import { format, parse, isValid, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { TelegramImageGallery } from './TelegramImageGallery';

interface LogSheetUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSuccess: () => void;
}

interface DBTripRow {
  id: string;
  trip_no: string;
  trip_date: string;
  odometer_start: number | null;
  odometer_end: number | null;
  fuel_liters: number | null;
  distance_km: number | null;
  notes: any;
  route_label?: string;
  routes?: { route_name: string } | null;
}

export function LogSheetUploadModal({ open, onOpenChange, selectedDate, onSuccess }: LogSheetUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRLogSheetResult | null>(null);
  
  // State for the verification grid
  const [busNumber, setBusNumber] = useState('');
  const [busId, setBusId] = useState<string | null>(null);
  const [monthYear, setMonthYear] = useState(format(selectedDate, 'yyyy-MM'));
  const [dbData, setDbData] = useState<Record<string, DBTripRow[]>>({});
  const [editedLogs, setEditedLogs] = useState<LogSheetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setExpandedRows(newSet);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setFile(null);
      setPreviewUrl(null);
      setOcrResult(null);
      setBusNumber('');
      setBusId(null);
      setDbData({});
      setEditedLogs([]);
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleTelegramImageSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const processImage = async () => {
    if (!file) {
      toast.error('Please select an image first');
      return;
    }

    setProcessing(true);
    try {
      const result = await extractLogSheetData(file);
      const baseMonth = parse(monthYear, 'yyyy-MM', new Date());
      let lastValidDate = baseMonth; // Default to 1st of month

      const processedLogs = result.logs.map((log, index) => {
        let finalDateStr = format(lastValidDate, 'yyyy-MM-dd');

        // Only try to extract from OCR for the first few rows to set the anchor, 
        // or just let it auto-increment.
        if (log.date && index === 0) {
           const match = log.date.match(/\d+/g);
           if (match && match.length > 0) {
              let day = parseInt(match[0]);
              if (match.length >= 2) {
                  const currentMonthNum = parseInt(monthYear.split('-')[1]);
                  const p1 = parseInt(match[0]);
                  const p2 = parseInt(match[1]);
                  day = p1 === currentMonthNum ? p2 : p1;
              }
              if (day >= 1 && day <= 31) {
                 const newDate = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), day);
                 if (isValid(newDate)) {
                     lastValidDate = newDate;
                     finalDateStr = format(newDate, 'yyyy-MM-dd');
                 }
              }
           }
        } else {
           // For row > 0, just strictly auto-increment from the previous row
           // This guarantees "row 1 is May 4, row 2 is May 5" flow!
           lastValidDate = addDays(lastValidDate, 1);
           finalDateStr = format(lastValidDate, 'yyyy-MM-dd');
        }
        
        return {
           ...log,
           date: finalDateStr
        };
      });

      setOcrResult(result);
      setEditedLogs(processedLogs);
      
      if (result.busNumber) {
        setBusNumber(result.busNumber);
        await lookupBus(result.busNumber);
      }
      
      toast.success('Log sheet processed successfully!');
    } catch (error: any) {
      console.error('OCR Error:', error);
      toast.error(`Processing failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const lookupBus = async (busNo: string) => {
    const { data } = await supabase
      .from('buses')
      .select('id, bus_no')
      .ilike('bus_no', `%${busNo.replace(/[^a-zA-Z0-9]/g, '%')}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (data) {
      setBusId(data.id);
      setBusNumber(data.bus_no);
      toast.success(`Bus ${data.bus_no} matched in database`);
      await fetchDbData(data.id, monthYear);
    } else {
      setBusId(null);
      toast.error('Could not match bus number to database. Please enter manually.');
    }
  };

  const fetchDbData = async (bId: string, my: string) => {
    if (!bId || !my) return;
    
    // Parse the selected month (e.g. '2026-04')
    const [yearStr, monthStr] = my.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed
    
    // Buffer the dates by 45 days on both sides to catch cross-month trips
    const startDateObj = subDays(new Date(year, month, 1), 45);
    const endDateObj = addDays(endOfMonth(new Date(year, month, 1)), 45);
    
    const startDate = format(startDateObj, 'yyyy-MM-dd');
    const endDate = format(endDateObj, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('daily_trips')
      .select('id, trip_no, trip_date, odometer_start, odometer_end, fuel_liters, distance_km, notes, route_label, routes(route_name)')
      .eq('bus_id', bId)
      .gte('trip_date', startDate)
      .lte('trip_date', endDate)
      .order('trip_date', { ascending: true })
      .order('created_at', { ascending: true }); // First trip of the day first

    if (error) {
      console.error('Error fetching DB data:', error);
      toast.error('Failed to load existing trips');
      return;
    }

    // Group by date, maintaining all trips for the day
    const dbMap: Record<string, DBTripRow[]> = {};
    if (data) {
      data.forEach(trip => {
        // Ensure trip_date is always YYYY-MM-DD even if it's a timestamp
        const dateKey = trip.trip_date.substring(0, 10);
        
        if (!dbMap[dateKey]) {
          dbMap[dateKey] = [];
        }
        dbMap[dateKey].push(trip as any);
      });
    }
    
    setDbData(dbMap);
  };

  const handleManualBusLookup = () => {
    lookupBus(busNumber);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMY = e.target.value;
    setMonthYear(newMY);
    if (busId) {
      fetchDbData(busId, newMY);
    }
  };

  const handleEditLog = (index: number, field: keyof LogSheetRow, value: any) => {
    const newLogs = [...editedLogs];
    const currentRow = { ...newLogs[index], [field]: value };
    
    // Auto-calculate distance if odometer changes
    if (field === 'start_odo' || field === 'end_odo') {
       const start = field === 'start_odo' ? value : currentRow.start_odo;
       const end = field === 'end_odo' ? value : currentRow.end_odo;
       if (start && end && end > start) {
          currentRow.distance = end - start;
       }
    }
    
    newLogs[index] = currentRow;
    setEditedLogs(newLogs);
  };

  const handleDateChange = (index: number, newDateStr: string) => {
    if (!newDateStr) return;
    
    const newLogs = [...editedLogs];
    newLogs[index].date = newDateStr;
    
    const baseDate = parse(newDateStr, 'yyyy-MM-dd', new Date());
    
    if (isValid(baseDate)) {
      // Auto-increment all subsequent rows
      for (let i = index + 1; i < newLogs.length; i++) {
        const nextDate = addDays(baseDate, i - index);
        newLogs[i].date = format(nextDate, 'yyyy-MM-dd');
      }
    }
    
    setEditedLogs(newLogs);
  };

  // Helper to construct full YYYY-MM-DD from log.date
  const getFullDate = (ocrDate: string | null): string | null => {
    if (!ocrDate) return null;
    
    // We already format dates to yyyy-MM-dd in processImage and handleDateChange
    if (ocrDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return ocrDate;
    }
    
    return null;
  };

  const handleSave = async () => {
    if (!busId) {
      toast.error('Please select a valid bus before saving.');
      return;
    }

    setSaving(true);
    let successCount = 0;

    try {
      // Get the currently authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const log of editedLogs) {
        const fullDate = getFullDate(log.date);
        if (!fullDate || !isValid(parse(fullDate, 'yyyy-MM-dd', new Date()))) {
          console.warn('Invalid date extracted:', log.date);
          continue; // Skip invalid rows
        }

        const dbRows = dbData[fullDate];

        // Prepare JSON notes
        const notesObj = {
          driver: log.driver_name,
          conductor: log.conductor_name,
          source: 'monthly_log_ocr'
        };

        if (dbRows && dbRows.length > 0) {
          // If we have multiple trips for the day, we allocate:
          // 1. Start Odo -> First Trip
          // 2. End Odo -> Last Trip
          // 3. Fuel -> First Trip (based on user plan)
          // 4. Notes -> All trips

          if (dbRows.length === 1) {
            // Single trip - standard update
            const dbRow = dbRows[0];
            const { error } = await supabase
              .from('daily_trips')
              .update({
                odometer_start: log.start_odo || dbRow.odometer_start,
                odometer_end: log.end_odo || dbRow.odometer_end,
                fuel_liters: log.fuel_liters || dbRow.fuel_liters,
                distance_km: log.distance || dbRow.distance_km,
                notes: { ...(dbRow.notes || {}), ...notesObj },
              })
              .eq('id', dbRow.id);
            if (!error) successCount++;
          } else {
            // Multiple trips
            for (let i = 0; i < dbRows.length; i++) {
              const dbRow = dbRows[i];
              const isFirst = i === 0;
              const isLast = i === dbRows.length - 1;

              const updates: any = {
                notes: { ...(dbRow.notes || {}), ...notesObj },
              };

              if (isFirst) {
                updates.odometer_start = log.start_odo || dbRow.odometer_start;
                updates.fuel_liters = log.fuel_liters || dbRow.fuel_liters;
                // If it's the only one getting distance, we can put it here, or leave DB distance alone.
              }
              
              if (isLast) {
                updates.odometer_end = log.end_odo || dbRow.odometer_end;
              }

              const { error } = await supabase
                .from('daily_trips')
                .update(updates)
                .eq('id', dbRow.id);
              
              if (!error) {
                 // Only count the whole day as 1 success to match log rows, or we can count each. 
                 // Let's only increment success count on the first one so the toast count matches rows.
                 if (isFirst) successCount++;
              }
            }
          }
        } else {
          // Generate a unique trip number
          const dateStr = fullDate.replace(/-/g, '');
          const prefix = `${busNumber}-${dateStr}-T1`;
          
          // Create new DB row
          const { error } = await supabase
            .from('daily_trips')
            .insert({
              bus_id: busId,
              trip_date: fullDate,
              trip_no: prefix,
              odometer_start: log.start_odo,
              odometer_end: log.end_odo,
              fuel_liters: log.fuel_liters,
              distance_km: log.distance,
              start_time: log.start_time,
              end_time: log.end_time,
              notes: notesObj,
              income: 0, // Empty income
              income_details: {},
            });

          if (!error) successCount++;
        }
      }

      toast.success(`Successfully saved ${successCount} log sheet rows!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save Error:', error);
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Monthly Log Sheet Verification</DialogTitle>
          <DialogDescription>
            Upload a monthly log sheet to automatically extract daily odometer and fuel readings.
          </DialogDescription>
        </DialogHeader>

        {!ocrResult ? (
          <div className="space-y-6 py-4">
            {/* Upload Section */}
            {!file ? (
              <div className="space-y-4">
                <TelegramImageGallery onImageSelect={handleTelegramImageSelect} />
                
                <div className="flex items-center gap-4 py-4">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-sm text-muted-foreground font-medium">OR UPLOAD FILE</span>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {isMobile && (
                    <Button
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-24 flex flex-col gap-2"
                      variant="outline"
                    >
                      <Camera className="h-6 w-6" />
                      <span>Take Photo</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 flex flex-col gap-2 w-full col-span-2 md:col-span-1"
                    variant="outline"
                  >
                    <Upload className="h-6 w-6" />
                    <span>Choose from Device</span>
                  </Button>
                  
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="max-w-md mx-auto relative rounded-lg overflow-hidden border">
                  {previewUrl && (
                    <img src={previewUrl} alt="Log sheet preview" className="w-full h-auto max-h-64 object-contain bg-muted" />
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setFile(null)} disabled={processing}>
                    Cancel
                  </Button>
                  <Button onClick={processImage} disabled={processing}>
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing AI OCR...
                      </>
                    ) : (
                      'Extract Data'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configuration Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg items-end">
              <div className="space-y-2">
                <Label>Bus Number</Label>
                <div className="flex gap-2">
                  <Input 
                    value={busNumber} 
                    onChange={e => setBusNumber(e.target.value)}
                    placeholder="e.g. NC-8226"
                  />
                  <Button variant="secondary" size="icon" onClick={handleManualBusLookup}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Month & Year</Label>
                <Input 
                  type="month" 
                  value={monthYear} 
                  onChange={handleMonthChange}
                />
              </div>

              <div className="flex items-center gap-2 font-medium text-sm">
                {busId ? (
                  <Badge variant="default" className="bg-green-600 text-white flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Bus Matched</Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Bus Not Matched</Badge>
                )}
              </div>
            </div>

            {/* Verification Grid */}
            <div className="border rounded-lg overflow-x-auto">
              <Table className="text-xs md:text-sm whitespace-nowrap">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Loc</TableHead>
                    <TableHead>Start Odo</TableHead>
                    <TableHead>End Odo</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Fuel (L)</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>System Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedLogs.map((log, index) => {
                    const fullDate = getFullDate(log.date);
                    const dbRows = fullDate ? dbData[fullDate] : null;
                    const exists = dbRows && dbRows.length > 0;
                    const dbFirstRow = exists ? dbRows[0] : null;
                    const dbLastRow = exists ? dbRows[dbRows.length - 1] : null;
                    const hasConflict = dbFirstRow && (dbFirstRow.odometer_start !== log.start_odo && log.start_odo !== null);
                    const isExpanded = expandedRows.has(index);

                    return (
                      <React.Fragment key={index}>
                      <TableRow className={hasConflict ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                        <TableCell className="font-medium p-1">
                          <div className="flex items-center gap-1">
                            {dbRows && dbRows.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 shrink-0" 
                                onClick={() => toggleRow(index)}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            )}
                            <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "h-7 w-[120px] justify-start text-left font-normal text-xs px-2",
                                  !fullDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
                                {fullDate ? format(parse(fullDate, 'yyyy-MM-dd', new Date()), "MMM dd, yyyy") : <span>Pick date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[100]" align="start">
                              <Calendar
                                mode="single"
                                selected={fullDate ? parse(fullDate, 'yyyy-MM-dd', new Date()) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    handleDateChange(index, format(date, 'yyyy-MM-dd'));
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                        <TableCell className="p-1">
                          <Input 
                            value={log.start_location || ''} 
                            onChange={e => handleEditLog(index, 'start_location', e.target.value)}
                            className="h-7 text-xs w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            value={log.start_odo || ''} 
                            onChange={e => handleEditLog(index, 'start_odo', e.target.value ? Number(e.target.value) : null)}
                            className="h-7 text-xs w-24"
                          />
                          {dbFirstRow && dbFirstRow.odometer_start && (
                            <div className="text-[10px] text-muted-foreground mt-1">DB: {dbFirstRow.odometer_start}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            value={log.end_odo || ''} 
                            onChange={e => handleEditLog(index, 'end_odo', e.target.value ? Number(e.target.value) : null)}
                            className="h-7 text-xs w-24"
                          />
                          {dbLastRow && dbLastRow.odometer_end && (
                            <div className="text-[10px] text-muted-foreground mt-1">DB: {dbLastRow.odometer_end}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            value={log.distance || ''} 
                            onChange={e => handleEditLog(index, 'distance', e.target.value ? Number(e.target.value) : null)}
                            className="h-7 text-xs w-16"
                          />
                          {dbFirstRow && dbFirstRow.distance_km && (
                            <div className="text-[10px] text-muted-foreground mt-1">DB: {dbFirstRow.distance_km}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            value={log.fuel_liters || ''} 
                            onChange={e => handleEditLog(index, 'fuel_liters', e.target.value ? Number(e.target.value) : null)}
                            className="h-7 text-xs w-16"
                          />
                           {dbFirstRow && dbFirstRow.fuel_liters && (
                            <div className="text-[10px] text-muted-foreground mt-1">DB: {dbFirstRow.fuel_liters}</div>
                          )}
                        </TableCell>
                        <TableCell>
                           <Input 
                            value={log.driver_name || ''} 
                            onChange={e => handleEditLog(index, 'driver_name', e.target.value)}
                            className="h-7 text-xs w-24"
                          />
                          {dbFirstRow && dbFirstRow.notes && typeof dbFirstRow.notes === 'string' && dbFirstRow.notes.includes('driver') && (
                            <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[100px]" title={JSON.parse(dbFirstRow.notes).driver}>
                              DB: {JSON.parse(dbFirstRow.notes).driver || 'N/A'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {dbRows && dbRows.length > 1 ? (
                            <div className="flex flex-col items-start gap-1">
                              <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 cursor-pointer" onClick={() => toggleRow(index)}>
                                {dbRows.length} Trips Found
                              </Badge>
                            </div>
                          ) : dbRows && dbRows.length === 1 ? (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Trip Exists</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">New Trip</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && dbRows && dbRows.length > 1 && (
                        <TableRow className="bg-muted/10 border-b-2 border-primary/20">
                          <TableCell colSpan={8} className="p-0">
                            <div className="p-4 pl-12 bg-gradient-to-b from-muted/30 to-muted/10 shadow-inner">
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider flex items-center gap-2">
                                <Route className="h-3 w-3" />
                                Database Trip Breakdown
                              </h4>
                              <div className="grid grid-cols-6 gap-2 text-xs mb-2 font-medium text-muted-foreground px-3">
                                <div>Trip No</div>
                                <div className="col-span-2">Route</div>
                                <div>Start Odo</div>
                                <div>End Odo</div>
                                <div>Driver</div>
                              </div>
                              <div className="space-y-1">
                                {dbRows.map((trip, i) => (
                                  <div key={trip.id} className="grid grid-cols-6 gap-2 text-xs bg-background p-2 px-3 rounded border items-center">
                                    <div className="font-mono text-[10px] bg-muted/50 px-1 py-0.5 rounded truncate" title={trip.trip_no}>{trip.trip_no}</div>
                                    <div className="col-span-2 font-medium truncate" title={trip.route_label || trip.routes?.route_name || 'N/A'}>
                                      {trip.route_label || trip.routes?.route_name || 'N/A'}
                                    </div>
                                    <div>
                                      {i === 0 ? (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{trip.odometer_start || '-'}</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">{trip.odometer_start || '-'}</span>
                                      )}
                                    </div>
                                    <div>
                                      {i === dbRows.length - 1 ? (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{trip.odometer_end || '-'}</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">{trip.odometer_end || '-'}</span>
                                      )}
                                    </div>
                                    <div className="truncate">
                                      {trip.notes && typeof trip.notes === 'string' && trip.notes.includes('driver') ? JSON.parse(trip.notes).driver : 'N/A'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 text-[10px] text-muted-foreground bg-blue-50/50 p-2 rounded border border-blue-100 flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                                <p><strong>Allocation Plan:</strong> When saved, the Start Odo (<span className="font-mono">{log.start_odo || '0'}</span>) will be applied to the <strong>first trip</strong>, and the End Odo (<span className="font-mono">{log.end_odo || '0'}</span>) will be applied to the <strong>last trip</strong>.</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center bg-background border-t pt-4 sticky bottom-0 z-10">
              <Button variant="outline" onClick={() => setOcrResult(null)}>
                Start Over
              </Button>
              <Button onClick={handleSave} disabled={saving || !busId}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save to Database
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
