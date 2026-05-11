import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Upload, Loader2, Save, Camera, Search, AlertCircle, CheckCircle2, CalendarIcon, ChevronDown, ChevronRight, Route, ChevronUp, Trash2, PlusCircle, Link2, Unlink } from 'lucide-react';
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
  onSuccess: (monthYear?: string) => void;
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
  const [lookingUp, setLookingUp] = useState(false);
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
    if (!busNo || busNo.trim().length < 2) {
      setBusId(null);
      setDbData({});
      toast.error('Please enter a valid bus number');
      return;
    }

    setLookingUp(true);
    try {
      const sanitizedInput = busNo.replace(/[^a-zA-Z0-9]/g, '%');
      let { data: buses } = await supabase
        .from('buses')
        .select('id, bus_no')
        .ilike('bus_no', `%${sanitizedInput}%`)
        .order('created_at', { ascending: false });
        
      // Fallback 1: Handle common OCR mistakes (e.g., N1 8255 -> NI 8255)
      if (!buses || buses.length === 0) {
        // Try replacing 1 with I and 0 with O
        const ocrCorrected = sanitizedInput.replace(/1/g, 'I').replace(/0/g, 'O');
        const { data: ocrBuses } = await supabase
          .from('buses')
          .select('id, bus_no')
          .ilike('bus_no', `%${ocrCorrected}%`)
          .order('created_at', { ascending: false });
          
        if (ocrBuses && ocrBuses.length > 0) {
          buses = ocrBuses;
        }
      }

      // Fallback 2: If we still have no match, try matching just the digits (usually the last 4)
      if ((!buses || buses.length === 0)) {
        const digits = busNo.match(/\d{3,4}/);
        if (digits && digits[0]) {
          const { data: fallbackBuses } = await supabase
            .from('buses')
            .select('id, bus_no')
            .ilike('bus_no', `%${digits[0]}%`)
            .order('created_at', { ascending: false });
            
          if (fallbackBuses && fallbackBuses.length > 0) {
            buses = fallbackBuses;
          }
        }
      }
        
      if (buses && buses.length > 0) {
        const primaryBus = buses[0];
        setBusId(primaryBus.id);
        setBusNumber(primaryBus.bus_no);
        toast.success(`Bus ${primaryBus.bus_no} matched in database`);
        await fetchDbData(buses.map(b => b.id), monthYear);
      } else {
        setBusId(null);
        setDbData({});
        toast.error('Could not match bus number to database. Please check and try again.');
      }
    } finally {
      setLookingUp(false);
    }
  };

  const fetchDbData = async (bIds: string[], my: string) => {
    if (!bIds || bIds.length === 0 || !my) return;
    
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
      .in('bus_id', bIds)
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
        // Handle both YYYY-MM-DD and full ISO timestamp strings safely
        let dateKey = trip.trip_date;
        if (dateKey.includes('T')) {
          dateKey = format(new Date(dateKey), 'yyyy-MM-dd');
        } else {
          dateKey = dateKey.substring(0, 10);
        }
        
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
    
    // Auto-update all rows in editedLogs to match the new year-month, keeping their days
    if (editedLogs.length > 0) {
      const [yearStr, monthStr] = newMY.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // 0-indexed
      
      const newLogs = [...editedLogs];
      newLogs.forEach((log) => {
        if (log.date) {
           const parsedDate = parse(log.date, 'yyyy-MM-dd', new Date());
           if (isValid(parsedDate)) {
             // Keep the day, change the month and year
             const newDate = new Date(year, month, parsedDate.getDate());
             log.date = format(newDate, 'yyyy-MM-dd');
           }
        }
      });
      setEditedLogs(newLogs);
    }

    if (busId) {
      fetchDbData([busId], newMY);
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

  const recalculateDatesFrom = (logs: LogSheetRow[], startIndex: number) => {
    for (let i = startIndex; i < logs.length; i++) {
        if (i === 0) continue;
        
        if (logs[i].isSecondaryTrip) {
            logs[i].date = logs[i-1].date;
        } else {
            const prevDateStr = logs[i-1].date;
            if (prevDateStr) {
                const prevDate = parse(prevDateStr, 'yyyy-MM-dd', new Date());
                if (isValid(prevDate)) {
                    logs[i].date = format(addDays(prevDate, 1), 'yyyy-MM-dd');
                }
            }
        }
    }
    return logs;
  };

  const handleDateChange = (index: number, newDateStr: string) => {
    if (!newDateStr) return;
    
    let newLogs = [...editedLogs];
    newLogs[index].date = newDateStr;
    
    if (index > 0) {
        newLogs[index].isSecondaryTrip = false;
    }
    
    newLogs = recalculateDatesFrom(newLogs, index + 1);
    setEditedLogs(newLogs);
  };

  const handleToggleSecondaryTrip = (index: number) => {
    if (index === 0) return;
    let newLogs = [...editedLogs];
    newLogs[index].isSecondaryTrip = !newLogs[index].isSecondaryTrip;
    
    if (newLogs[index].isSecondaryTrip) {
        newLogs[index].date = newLogs[index - 1].date;
    } else {
        const prevDateStr = newLogs[index - 1].date;
        if (prevDateStr) {
            const prevDate = parse(prevDateStr, 'yyyy-MM-dd', new Date());
            if (isValid(prevDate)) {
                newLogs[index].date = format(addDays(prevDate, 1), 'yyyy-MM-dd');
            }
        }
    }
    
    newLogs = recalculateDatesFrom(newLogs, index + 1);
    setEditedLogs(newLogs);
  };

  const handleAddRow = () => {
    const newLogs = [...editedLogs];
    let nextDateStr = format(new Date(), 'yyyy-MM-dd');
    if (newLogs.length > 0) {
      const lastRowDate = newLogs[newLogs.length - 1].date;
      if (lastRowDate) {
        const parsed = parse(lastRowDate, 'yyyy-MM-dd', new Date());
        if (isValid(parsed)) {
          nextDateStr = format(addDays(parsed, 1), 'yyyy-MM-dd');
        }
      }
    }
    newLogs.push({
      date: nextDateStr,
      start_location: null,
      start_odo: null,
      start_time: null,
      end_location: null,
      end_odo: null,
      end_time: null,
      distance: null,
      fuel_liters: null,
      driver_name: null,
      conductor_name: null,
      isSecondaryTrip: false,
    });
    setEditedLogs(newLogs);
  };

  const handleDeleteRow = (index: number) => {
    let newLogs = [...editedLogs];
    newLogs.splice(index, 1);
    newLogs = recalculateDatesFrom(newLogs, index);
    setEditedLogs(newLogs);
  };

  const handleShiftRow = (index: number, direction: 'up' | 'down') => {
    let newLogs = [...editedLogs];
    if (direction === 'up' && index > 0) {
      const temp = newLogs[index];
      newLogs[index] = newLogs[index - 1];
      newLogs[index - 1] = temp;
      newLogs = recalculateDatesFrom(newLogs, index - 1);
    } else if (direction === 'down' && index < newLogs.length - 1) {
      const temp = newLogs[index];
      newLogs[index] = newLogs[index + 1];
      newLogs[index + 1] = temp;
      newLogs = recalculateDatesFrom(newLogs, index);
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
    let errorCount = 0;

    try {
      // Get the currently authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Group edited logs by date
      const logsByDate: Record<string, LogSheetRow[]> = {};
      for (const log of editedLogs) {
        const fullDate = getFullDate(log.date);
        if (!fullDate || !isValid(parse(fullDate, 'yyyy-MM-dd', new Date()))) {
          console.warn('Invalid date extracted:', log.date);
          continue; // Skip invalid rows
        }
        if (!logsByDate[fullDate]) logsByDate[fullDate] = [];
        logsByDate[fullDate].push(log);
      }

      // Process day by day
      for (const [fullDate, logsForDay] of Object.entries(logsByDate)) {
        const dbRows = dbData[fullDate] || [];
        
        // We will map logRows to dbRows 1-to-1 up to the max available.
        const maxRows = Math.max(logsForDay.length, dbRows.length);
        
        for (let i = 0; i < maxRows; i++) {
          const log = logsForDay[i];
          const dbRow = dbRows[i];

          // If no log exists for this DB row, just skip (don't delete existing data)
          if (!log) continue;

          // Prepare JSON notes
          const notesObj = {
            source: 'monthly_log_ocr',
            driver: log.driver_name,
            conductor: log.conductor_name
          };

          if (dbRow && log) {
            // Both exist -> Update the specific DB trip with this log's data
            const { error } = await supabase
              .from('daily_trips')
              .update({
                odometer_start: log.start_odo !== null ? log.start_odo : dbRow.odometer_start,
                odometer_end: log.end_odo !== null ? log.end_odo : dbRow.odometer_end,
                fuel_liters: log.fuel_liters !== null ? log.fuel_liters : dbRow.fuel_liters,
                distance_km: log.distance !== null ? log.distance : dbRow.distance_km,
                notes: { ...(dbRow.notes || {}), ...notesObj },
              })
              .eq('id', dbRow.id);
              
            if (!error) successCount++;
            else {
              console.error("Error updating trip:", error);
              errorCount++;
            }
          } else if (log && !dbRow) {
            // Log exists but no DB row -> Insert new trip
            const dateStr = fullDate.replace(/-/g, '');
            // Append a suffix based on index so it is unique: T1, T2, etc.
            // If there are existing dbRows, we offset by dbRows.length
            const suffixIndex = (dbRows.length) + (i - dbRows.length) + 1; 
            const prefix = `${busNumber}-${dateStr}-T${suffixIndex}`;
            
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
                income: 0,
                income_details: {},
              });

            if (!error) successCount++;
            else {
              console.error("Error inserting trip:", error);
              errorCount++;
            }
          }
        }
      }

      if (errorCount > 0) {
        toast.warning(`Saved ${successCount} rows, but ${errorCount} failed. Check console for details.`);
      } else {
        toast.success(`Successfully saved ${successCount} log sheet rows!`);
      }
      
      onSuccess(monthYear);
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
                    onChange={e => {
                      setBusNumber(e.target.value);
                      if (busId) {
                        setBusId(null);
                        setDbData({});
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') handleManualBusLookup(); }}
                    placeholder="e.g. NC-8226"
                  />
                  <Button variant="secondary" size="icon" onClick={handleManualBusLookup} disabled={lookingUp}>
                    {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-7 w-7",
                                  log.isSecondaryTrip 
                                    ? "text-blue-600 bg-blue-50 hover:bg-blue-100" 
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => handleToggleSecondaryTrip(index)}
                                title={log.isSecondaryTrip ? "Unlink from previous day" : "Link as same day trip"}
                              >
                                {log.isSecondaryTrip ? <Unlink className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              disabled={index === 0}
                              onClick={() => handleShiftRow(index, 'up')}
                              title="Move Up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              disabled={index === editedLogs.length - 1}
                              onClick={() => handleShiftRow(index, 'down')}
                              title="Move Down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeleteRow(index)}
                              title="Delete Row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && dbRows && dbRows.length > 1 && (
                        <TableRow className="bg-muted/10 border-b-2 border-primary/20">
                          <TableCell colSpan={9} className="p-0">
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
                                {(() => {
                                  let distancePerTrip = 0;
                                  const canDistribute = log.start_odo !== null && log.end_odo !== null && log.end_odo > log.start_odo;
                                  if (canDistribute) {
                                     const totalDistance = log.end_odo! - log.start_odo!;
                                     distancePerTrip = Math.round(totalDistance / dbRows.length);
                                  }

                                  return dbRows.map((trip, i) => {
                                    const isFirst = i === 0;
                                    const isLast = i === dbRows.length - 1;
                                    
                                    let previewStartOdo = trip.odometer_start;
                                    let previewEndOdo = trip.odometer_end;
                                    let isAutoFilledStart = false;
                                    let isAutoFilledEnd = false;

                                    if (canDistribute) {
                                      previewStartOdo = log.start_odo! + (i * distancePerTrip);
                                      previewEndOdo = isLast ? log.end_odo : log.start_odo! + ((i + 1) * distancePerTrip);
                                      isAutoFilledStart = true;
                                      isAutoFilledEnd = true;
                                    } else {
                                      if (isFirst && log.start_odo !== null) {
                                        previewStartOdo = log.start_odo;
                                        isAutoFilledStart = true;
                                      }
                                      if (isLast && log.end_odo !== null) {
                                        previewEndOdo = log.end_odo;
                                        isAutoFilledEnd = true;
                                      }
                                    }

                                    return (
                                      <div key={trip.id} className="grid grid-cols-6 gap-2 text-xs bg-background p-2 px-3 rounded border items-center">
                                        <div className="font-mono text-[10px] bg-muted/50 px-1 py-0.5 rounded truncate" title={trip.trip_no}>{trip.trip_no}</div>
                                        <div className="col-span-2 font-medium truncate" title={trip.route_label || trip.routes?.route_name || 'N/A'}>
                                          {trip.route_label || trip.routes?.route_name || 'N/A'}
                                        </div>
                                        <div>
                                          {isAutoFilledStart ? (
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold">
                                              {previewStartOdo} (Auto)
                                            </Badge>
                                          ) : (
                                            <span className="text-muted-foreground">{previewStartOdo || '-'}</span>
                                          )}
                                        </div>
                                        <div>
                                          {isAutoFilledEnd ? (
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold">
                                              {previewEndOdo} (Auto)
                                            </Badge>
                                          ) : (
                                            <span className="text-muted-foreground">{previewEndOdo || '-'}</span>
                                          )}
                                        </div>
                                        <div className="truncate">
                                          {trip.notes && typeof trip.notes === 'string' && trip.notes.includes('driver') ? JSON.parse(trip.notes).driver : 'N/A'}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                              <div className="mt-3 text-[10px] text-muted-foreground bg-purple-50/50 p-2 rounded border border-purple-100 flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 text-purple-500 mt-0.5 shrink-0" />
                                <p><strong>Smart Allocation:</strong> When you click save, the system will evenly distribute the distance between the Start Odometer (<span className="font-mono font-bold text-purple-700">{log.start_odo || '0'}</span>) and the End Odometer (<span className="font-mono font-bold text-purple-700">{log.end_odo || '0'}</span>) across all <strong>{dbRows.length} trips</strong>. The purple badges above show a preview of what the database records will look like.</p>
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
              <div className="p-4 border-t border-dashed bg-muted/20 flex justify-center">
                <Button variant="outline" size="sm" className="w-full md:w-auto border-dashed hover:bg-muted/50" onClick={handleAddRow}>
                  <PlusCircle className="h-4 w-4 mr-2 text-primary" />
                  Add Missing Row
                </Button>
              </div>
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
