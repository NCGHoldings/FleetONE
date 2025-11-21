import React, { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, Camera, CheckCircle2, Info, CalendarIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { extractTextFromImage } from '@/lib/ocr-processor';
import { OCRExtractedDataCard } from './OCRExtractedDataCard';
import { OCRBatchActions } from './OCRBatchActions';
import { supabase } from '@/integrations/supabase/client';
import { SingleTrip, DailyExpenses } from '@/lib/ocr-processor';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { mapOCRExpensesToDB } from '@/lib/ocr-expense-mapper';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Note: parseOcrDate function removed - using manual date selection instead

interface OCRImageUploadProps {
  selectedDate: Date;
  onDataExtracted: (data: {
    count?: number;
    extractedDate?: string;
    busNumber?: string;
  }) => void;
}

export interface ExtractedMultiTripData {
  id: string;
  fileName: string;
  imageUrl: string;
  busNumber: string;
  date: string;
  confidence: number;
  trips: SingleTrip[];
  daily_expenses: DailyExpenses;
  mapped_expenses?: import('@/lib/ocr-expense-mapper').DBExpenseFields;
  savedExpensesTotal?: number;
}

export function OCRImageUpload({ selectedDate, onDataExtracted }: OCRImageUploadProps) {
  const [images, setImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedMultiTripData[]>([]);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [manualDate, setManualDate] = useState<Date>(selectedDate); // Manual date selection
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      const newImages = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const processImages = async () => {
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setProcessing(true);
    setProgress(0);
    const results: ExtractedMultiTripData[] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        setProcessingStep(`Step 1/4: Uploading ${image.name}...`);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setProcessingStep("Step 2/4: Analyzing sheet structure...");
        
        // Extract multi-trip data using OCR
        const ocrResult = await extractTextFromImage(image);
        
        setProcessingStep("Step 3/4: Extracting trip data...");
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setProcessingStep("Step 4/4: Validating results...");
        await new Promise(resolve => setTimeout(resolve, 200));

        // Create preview URL for image
        const imageUrl = URL.createObjectURL(image);

        results.push({
          id: `${Date.now()}-${i}`,
          fileName: image.name,
          imageUrl,
          busNumber: ocrResult.busNumber || 'Unknown',
          date: ocrResult.date || new Date().toLocaleDateString('en-GB'),
          confidence: ocrResult.confidence,
          trips: ocrResult.trips,
          daily_expenses: ocrResult.daily_expenses,
        });
        
        setProgress(((i + 1) / images.length) * 100);
        setProcessingStep(`✓ Completed ${image.name}`);
      }

      setExtractedData(results);
      toast.success(`🎉 Successfully processed ${results.length} sheet(s) with ${results.reduce((sum, r) => sum + r.trips.length, 0)} total trips`);
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Failed to process images. Please ensure the image is clear and readable.');
    } finally {
      setProcessing(false);
      setProgress(0);
      setProcessingStep("");
    }
  };

  const clearAll = () => {
    setImages([]);
    setExtractedData([]);
    setProgress(0);
  };

  const applyMultiTripData = async (data: ExtractedMultiTripData & { mapped_expenses: import('@/lib/ocr-expense-mapper').DBExpenseFields }) => {
    try {
      // 1. Use manually selected date (ignore OCR date)
      const tripDate = format(manualDate, 'yyyy-MM-dd');
      console.log(`🔄 Processing OCR data - Sheet date: ${data.date} | Saving to: ${tripDate}`);

      // 2. FLEXIBLE BUS NUMBER MATCHING - try exact match first, then alternative formats
      let busQuery = supabase
        .from('buses')
        .select('id, bus_no, route')
        .eq('bus_no', data.busNumber);
      
      let { data: busData, error: busError } = await busQuery.single();

      // If exact match fails, try alternative formats (NE-0746 <-> NE 0746)
      if (busError || !busData) {
        const altBusNumber = data.busNumber.includes('-') 
          ? data.busNumber.replace('-', ' ')
          : data.busNumber.replace(' ', '-');
        
        const { data: altBusData, error: altError } = await supabase
          .from('buses')
          .select('id, bus_no, route')
          .eq('bus_no', altBusNumber)
          .single();
        
        if (!altError && altBusData) {
          busData = altBusData;
          console.log(`✅ Bus matched with alternative format: ${altBusNumber}`);
        } else {
          toast.error(`Bus not found. Tried: "${data.busNumber}" and "${altBusNumber}"`);
          console.error('Bus lookup error:', busError, altError);
          return;
        }
      }

      // 3. DETERMINE DATE RANGE AND PRE-LOAD ALL RELEVANT TRIPS
      const hasIndividualDates = data.trips.some(t => t.individualDate);
      let minDate = tripDate;
      let maxDate = tripDate;
      
      if (hasIndividualDates) {
        // For multi-day routes, find min/max dates
        const dates = data.trips
          .map(t => t.individualDate)
          .filter((d): d is string => !!d);
        minDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
        maxDate = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
      
      console.log(`📅 Date range: ${minDate} to ${maxDate} (${hasIndividualDates ? 'multi-day' : 'single-day'})`);

      // Pre-load all existing trips in date range
      const { data: existingTrips, error: queryError } = await supabase
        .from('daily_trips')
        .select('id, trip_no, trip_date, income')
        .eq('bus_id', busData.id)
        .gte('trip_date', minDate)
        .lte('trip_date', maxDate)
        .order('trip_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (queryError) {
        console.error('Error querying existing trips:', queryError);
        toast.error(`Failed to query existing trips: ${queryError.message}`);
        return;
      }

      console.log(`📊 Found ${existingTrips?.length || 0} existing trips in range for ${busData.bus_no}`);

      // 4. BUILD MAP OF EXISTING TRIPS BY DATE
      const existingTripsByDate = new Map<string, Array<{ id: string; trip_no: string; income: number | null; used: boolean }>>();
      if (existingTrips) {
        existingTrips.forEach(trip => {
          if (!existingTripsByDate.has(trip.trip_date)) {
            existingTripsByDate.set(trip.trip_date, []);
          }
          existingTripsByDate.get(trip.trip_date)!.push({
            id: trip.id,
            trip_no: trip.trip_no,
            income: trip.income,
            used: false
          });
        });
      }

      // 5. ROBUST MAPPING: UPDATE EXISTING TRIPS OR INSERT NEW ONES
      const mappingLog: Array<{ ocrTrip: number; revenue: number; date: string; action: string; tripNo: string }> = [];
      const missingMultiDayMappings: Array<{ ocrTrip: number; revenue: number; date: string }> = [];
      
      // Helper to generate globally unique trip_no
      const generateUniqueTripNo = async (busNo: string, date: string, startIdx: number) => {
        const dateStr = date.replace(/-/g, ''); // YYYYMMDD
        const prefix = `${busNo}-${dateStr}-T`;
        
        const { data: existingWithPrefix } = await supabase
          .from('daily_trips')
          .select('trip_no')
          .ilike('trip_no', `${prefix}%`);
        
        let maxNum = startIdx;
        if (existingWithPrefix && existingWithPrefix.length > 0) {
          existingWithPrefix.forEach(t => {
            const match = t.trip_no.match(/T(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          });
        }
        
        return `${prefix}${maxNum + 1}`;
      };

      // Process each OCR trip
      console.log(`\n🔄 Processing ${data.trips.length} OCR trip(s)...`);
      console.log(`Multi-day detection: ${hasIndividualDates ? 'YES ✓' : 'NO'}`);
      console.log(`Date range: ${minDate} to ${maxDate}`);
      console.log(`Existing trips found: ${existingTrips?.length || 0}`);
      
      for (let i = 0; i < data.trips.length; i++) {
        const trip = data.trips[i];
        const tripRevenue = Object.values(trip.income).reduce((s, v) => s + v, 0);
        const tripSaveDate = trip.individualDate || tripDate;
        
        console.log(`\n📊 OCR Trip ${i + 1}:`);
        console.log(`  • Revenue: Rs. ${tripRevenue.toLocaleString()}`);
        console.log(`  • Target Save Date: ${tripSaveDate}`);
        console.log(`  • Individual Date Set: ${!!trip.individualDate}`);
        console.log(`  • Multi-day mode: ${hasIndividualDates}`);
        
        // Find unused existing trip for this specific date
        const dateTrips = existingTripsByDate.get(tripSaveDate) || [];
        const unusedIndex = dateTrips.findIndex(t => !t.used);
        
        console.log(`  • Existing trips for ${tripSaveDate}: ${dateTrips.length}`);
        console.log(`  • Unused trip found at index: ${unusedIndex}`);
        
        if (unusedIndex !== -1) {
          // UPDATE existing trip
          const existingTrip = dateTrips[unusedIndex];
          existingTrip.used = true;
          
          const { error: updateError } = await supabase
            .from('daily_trips')
            .update({
              income: tripRevenue,
              ...Object.keys(trip.income).reduce((acc, key) => {
                acc[key] = trip.income[key];
                return acc;
              }, {} as any),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTrip.id);
          
          if (updateError) {
            console.error(`❌ Error updating trip ${existingTrip.trip_no}:`, updateError);
            toast.error(`Failed to update trip: ${updateError.message}`);
            continue;
          }
          
          console.log(`  ✅ UPDATED existing trip: ${existingTrip.trip_no}`);
          mappingLog.push({
            ocrTrip: i + 1,
            revenue: tripRevenue,
            date: tripSaveDate,
            action: 'updated',
            tripNo: existingTrip.trip_no
          });
          
        } else {
          // CREATE new trip for this date (works for both multi-day and single-day)
          const newTripNo = await generateUniqueTripNo(busData.bus_no, tripSaveDate, i + 1);
          
          const { error: insertError } = await supabase
            .from('daily_trips')
            .insert({
              trip_date: tripSaveDate,
              bus_id: busData.id,
              trip_no: newTripNo,
              income: tripRevenue,
              ...Object.keys(trip.income).reduce((acc, key) => {
                acc[key] = trip.income[key];
                return acc;
              }, {} as any)
            });
          
          if (insertError) {
            console.error(`❌ Error creating trip ${newTripNo}:`, insertError);
            toast.error(`Failed to create trip: ${insertError.message}`);
            continue;
          }
          
          console.log(`  ✅ CREATED new trip: ${newTripNo} on ${tripSaveDate}`);
          mappingLog.push({
            ocrTrip: i + 1,
            revenue: tripRevenue,
            date: tripSaveDate,
            action: 'created',
            tripNo: newTripNo
          });
        }
      }

      console.log('\n✅ Sheet application completed');
      console.log('Mapping Summary:', mappingLog);

      // 7. DELETE EXTRA TRIPS (only for non-multi-day routes)
      if (!hasIndividualDates) {
        const dateTrips = existingTripsByDate.get(tripDate) || [];
        const unusedTrips = dateTrips.filter(t => !t.used);
        
        if (unusedTrips.length > 0) {
          for (const tripToDelete of unusedTrips) {
            const { error: deleteError } = await supabase
              .from('daily_trips')
              .delete()
              .eq('id', tripToDelete.id);
            
            if (!deleteError) {
              console.log(`🗑️ Deleted extra trip: ${tripToDelete.trip_no}`);
            }
          }
        }
      }

      // 5. USE MAPPED EXPENSES or fallback to auto-mapping
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      if (!data.mapped_expenses) {
        console.error('⚠️ WARNING: mapped_expenses is undefined! User edits may have been lost.');
        toast.error('Edited expenses were not received. Please re-edit and try again.');
        return;
      }

      const mappedExpenses = data.mapped_expenses;
      console.log('📥 RECEIVED DATA FOR UPSERT:');
      console.log('  Bus:', busData.bus_no, '| Manually Selected Date:', tripDate);
      console.log('  OCR Sheet Date:', data.date);
      console.log('  data.mapped_expenses:', mappedExpenses);
      console.log('  Breakdown:', Object.entries(mappedExpenses)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      );
      
      // CRITICAL: Don't include total_daily_expenses - it's auto-generated by DB
      const expensePayload = {
        expense_date: tripDate,
        bus_id: busData.id,
        created_by: user.id, // Required for RLS UPDATE policy
        ...mappedExpenses,
        // total_daily_expenses removed - auto-calculated by DB
      };

      console.log('💾 Upserting expense payload:', expensePayload);

      const { data: upsertedExpense, error: expenseError } = await supabase
        .from('daily_bus_expenses')
        .upsert(expensePayload, {
          onConflict: 'bus_id,expense_date'
        })
        .select()
        .single();

      if (expenseError) {
        console.error('❌ Expense upsert error:', expenseError);
        toast.error(`Failed to save expenses: ${expenseError.message}`);
        return; // Stop if expenses fail
      }

      console.log('✅ Expense upserted successfully');
      
      // Calculate total expenses for success message
      const totalExpenses = Object.values(mappedExpenses).reduce((sum, val) => sum + val, 0);
      
      // Show enhanced success message
      toast.success(
        <div className="space-y-2">
          <p className="font-bold">✅ {busData.bus_no}: Successfully Applied!</p>
          <div className="text-xs space-y-1">
            {mappingLog.map((log, idx) => (
              <div key={idx} className="flex justify-between gap-4">
                <span>Trip {log.ocrTrip}: {log.date}</span>
                <span className="font-mono text-green-600">
                  {log.action === 'updated' ? '✓ updated' : '+ created'} {log.tripNo}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground border-t pt-1 mt-1">
            Expenses: {tripDate} • Total: Rs. {totalExpenses.toLocaleString()}
          </p>
        </div>,
        { duration: 6000 }
      );

      console.log('✅ Expense upserted, now verifying in DB...');

      // VERIFY: Query the actual saved data from database
      const { data: verifiedExpense, error: verifyError } = await supabase
        .from('daily_bus_expenses')
        .select('*')
        .eq('bus_id', busData.id)
        .eq('expense_date', tripDate)
        .single();

      if (verifyError) {
        console.error('⚠️ Could not verify saved expenses:', verifyError);
      } else {
        console.log('🔍 VERIFIED IN DATABASE:', verifiedExpense);
        console.log('  Total in DB:', verifiedExpense.total_daily_expenses);
        console.log('  Fuel in DB:', verifiedExpense.fuel_cost);
        console.log('  Salary in DB:', verifiedExpense.salary);
        
        toast.success(
          `💰 Expenses saved to database!`,
          { 
            description: `Bus ${busData.bus_no} • ${tripDate} • Total: Rs. ${verifiedExpense.total_daily_expenses?.toLocaleString() || 0}`,
            duration: 6000 
          }
        );

        // Update the card state with verified expense total from DB
        setExtractedData(prev => prev.map(item => 
          item.id === data.id 
            ? { ...item, savedExpensesTotal: verifiedExpense?.total_daily_expenses || 0 }
            : item
        ));
      }

      // 8. IMPROVED SUCCESS FEEDBACK WITH MAPPING LOG
      const totalRevenue = data.trips.reduce((sum, t) => 
        sum + Object.values(t.income).reduce((s, v) => s + (v || 0), 0), 0
      );
      
      const updatedCount = mappingLog.filter(m => m.action === 'updated').length;
      const createdCount = mappingLog.filter(m => m.action === 'created').length;
      
      // Build readable mapping summary
      const mappingSummary = mappingLog
        .map(m => `T${m.ocrTrip} → ${format(new Date(m.date), 'MMM d')} (Rs. ${m.revenue.toLocaleString()}) • ${m.action} ${m.tripNo}`)
        .join('\n');
      
      console.log(`📋 MAPPING SUMMARY:\n${mappingSummary}`);
      
      const parts = [];
      if (updatedCount > 0) parts.push(`Updated ${updatedCount}`);
      if (createdCount > 0) parts.push(`Created ${createdCount}`);
      const actionMsg = parts.join(', ') || 'Processed';
      
      toast.success(
        `✅ ${busData.bus_no}: ${actionMsg} • Total Revenue: Rs. ${totalRevenue.toLocaleString()}`,
        { 
          duration: 8000,
          description: mappingLog.map(m => 
            `Trip ${m.ocrTrip}: ${format(new Date(m.date), 'MMM d')} • ${m.action} ${m.tripNo}`
          ).join(' | '),
          action: {
            label: "View Expenses",
            onClick: () => navigate(`/daily-bus-expenses?date=${tripDate}&bus=${busData.id}`)
          }
        }
      );
      
      // 7. EMIT DATA TO TRIGGER UI REFRESH AND DATE SWITCH
      onDataExtracted({
        busNumber: busData.bus_no, // Use actual DB bus number
        extractedDate: tripDate,
        count: data.trips.length,
      });
    } catch (error) {
      console.error('Apply error:', error);
      toast.error('Failed to apply data');
    }
  };

  const handleApplyAll = async () => {
    const readyData = extractedData.filter(d => d.confidence >= 0.6);
    if (readyData.length === 0) {
      toast.error('No sheets ready to apply (confidence too low)');
      return;
    }

    toast.info(`Applying ${readyData.length} sheet(s)...`);
    
    let lastExtractedDate = '';
    for (const data of readyData) {
      // Auto-map expenses if not already mapped
      const dataWithExpenses = {
        ...data,
        mapped_expenses: data.mapped_expenses || mapOCRExpensesToDB(data.daily_expenses)
      };
      await applyMultiTripData(dataWithExpenses);
      // Use manually selected date
      lastExtractedDate = format(manualDate, 'yyyy-MM-dd');
    }
    
    onDataExtracted({
      count: readyData.length,
      extractedDate: lastExtractedDate,
    });
  };

  const handleDiscard = (index: number) => {
    setExtractedData(prev => prev.filter((_, i) => i !== index));
    toast.success("Sheet discarded");
  };

  const handleView = () => {
    toast.info("Viewing sheet details");
  };

  const handleExportCSV = () => {
    const csvRows = ['Bus Number,Date,Trip No,Revenue,Fuel Cost,Total Expenses'];
    
    extractedData.forEach(data => {
      data.trips.forEach(trip => {
        const revenue = Object.values(trip.income).reduce((s, v) => s + v, 0);
        const totalExpenses = Object.values(data.daily_expenses).reduce((s, v) => s + v, 0);
        csvRows.push(`${data.busNumber},${data.date},${trip.trip_no},${revenue},${data.daily_expenses.fuel_cost},${totalExpenses}`);
      });
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-multi-trip-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success("Exported to CSV");
  };

  const readySheets = extractedData.filter(d => d.confidence >= 0.6).length;
  const needsReviewSheets = extractedData.filter(d => d.confidence < 0.6).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Trip Sheets (OCR - Multi-Trip)
        </CardTitle>
        <CardDescription>
          Upload images of trip sheets. System will extract multiple trips and daily expenses automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Upload Area */}
        {images.length === 0 ? (
          <div className="space-y-3">
            {/* Mobile Camera Buttons */}
            {isMobile && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Take Photo</span>
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Choose from Gallery</span>
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Desktop/Fallback Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-primary/5"
              onClick={() => !isMobile && fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-sm font-medium mb-2">
                {isMobile ? "Tap above to upload" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports multiple images for bulk processing
              </p>
              {!isMobile && (
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Image Previews */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={image.name}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-xs mt-1 truncate">{image.name}</p>
                </div>
              ))}
              
              {/* Add More Button */}
              <div
                onClick={() => document.getElementById('file-input')?.click()}
                className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            {/* Processing Progress */}
            {processing && (
              <Card className="p-4 bg-primary/5 border-primary/30">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">Processing your sheets...</span>
                  </div>
                  {processingStep && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      {processingStep.includes("✓") ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin mt-0.5 shrink-0" />
                      )}
                      <span>{processingStep}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={processImages}
                disabled={processing}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Extract Data ({images.length})
                  </>
                )}
              </Button>
              <Button
                onClick={clearAll}
                variant="outline"
                disabled={processing}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </>
        )}

        {/* Batch Actions & Extracted Data */}
        {extractedData.length > 0 && (
          <>
            <OCRBatchActions
              totalSheets={extractedData.length}
              readySheets={readySheets}
              needsReviewSheets={needsReviewSheets}
              onApplyAll={handleApplyAll}
              onExportCSV={handleExportCSV}
            />
            
            <div className="space-y-3">
              {extractedData.map((data, index) => (
            <OCRExtractedDataCard
              key={data.id}
              data={data}
              actualSaveDate={format(manualDate, 'yyyy-MM-dd')}
              onApply={applyMultiTripData}
              onDiscard={() => handleDiscard(index)}
              onView={handleView}
              savedExpensesTotal={data.savedExpensesTotal}
            />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
