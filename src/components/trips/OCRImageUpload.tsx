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
      
      let { data: busData, error: busError } = await busQuery.maybeSingle();

      console.log(`🔍 Bus lookup for: "${data.busNumber}"`);
      console.log(`  Result:`, busData);
      console.log(`  Bus ID: ${busData?.id}`);
      console.log(`  Bus No: ${busData?.bus_no}`);
      console.log(`  Route: ${busData?.route}`);

      // If exact match fails, try multiple alternative formats
      if (busError || !busData) {
        console.log(`⚠️ Exact match failed for "${data.busNumber}", trying alternatives...`);
        
        const alternatives = [
          data.busNumber.replace('-', ' '),  // NG-8262 → NG 8262
          data.busNumber.replace(' ', '-'),  // NG 8262 → NG-8262
          data.busNumber.replace(/\s+/g, ''), // Remove all spaces
          data.busNumber.toUpperCase(),      // Force uppercase
        ];
        
        for (const altBusNumber of alternatives) {
          if (altBusNumber === data.busNumber) continue; // Skip if same as original
          
          console.log(`  Trying: "${altBusNumber}"`);
          const { data: altBusData } = await supabase
            .from('buses')
            .select('id, bus_no, route')
            .eq('bus_no', altBusNumber)
            .maybeSingle();
          
          if (altBusData) {
            busData = altBusData;
            console.log(`✅ Bus matched with alternative format: ${altBusNumber}`);
            break;
          }
        }
        
        if (!busData) {
          toast.error(`Bus not found. Tried: "${data.busNumber}" and alternatives.`);
          console.error('Bus lookup failed for all formats');
          return;
        }
      }

      // Warn if bus has no route (but allow trip creation)
      if (!busData.route) {
        console.warn(`⚠️ Bus ${busData.bus_no} has no route assigned`);
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
        
        // VALIDATION: Ensure valid date format
        if (!tripSaveDate || tripSaveDate === 'undefined' || tripSaveDate === 'null') {
          console.error(`❌ Invalid trip save date for Trip ${i + 1}:`, tripSaveDate);
          toast.error(`Invalid date for Trip ${i + 1}. Please check date selection.`);
          continue;
        }
        
        console.log(`\n📊 OCR Trip ${i + 1}:`);
        console.log(`  • Revenue: Rs. ${tripRevenue.toLocaleString()}`);
        console.log(`  • Target Save Date: ${tripSaveDate}`);
        console.log(`  • Individual Date Set: ${!!trip.individualDate}`);
        console.log(`  • Multi-day mode: ${hasIndividualDates}`);
        console.log(`  • Income breakdown:`, trip.income);
        
        // Find unused existing trip for this specific date
        const dateTrips = existingTripsByDate.get(tripSaveDate) || [];
        const unusedIndex = dateTrips.findIndex(t => !t.used);
        
        console.log(`  • Existing trips for ${tripSaveDate}: ${dateTrips.length}`);
        console.log(`  • Unused trip found at index: ${unusedIndex}`);
        
        if (unusedIndex !== -1) {
          // UPDATE existing trip
          const existingTrip = dateTrips[unusedIndex];
          existingTrip.used = true;
          
          console.log(`  🔄 Attempting to update trip ${existingTrip.trip_no}...`);
          console.log(`    Trip ID: ${existingTrip.id}`);
          console.log(`    New Revenue: Rs. ${tripRevenue}`);
          
          const incomeDetails = { ...trip.income };
          
          const updatePayload = {
            income: tripRevenue,
            income_details: incomeDetails as any,
            updated_at: new Date().toISOString()
          };
          
          console.log(`    Update payload:`, updatePayload);
          
          const { data: updateResult, error: updateError } = await supabase
            .from('daily_trips')
            .update(updatePayload)
            .eq('id', existingTrip.id)
            .select();
          
          if (updateError) {
            console.error(`❌ Error updating trip ${existingTrip.trip_no}:`, updateError);
            toast.error(`Failed to update trip: ${updateError.message}`);
            continue;
          }
          
          console.log(`  ✅ UPDATED existing trip:`, updateResult);
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
          
          const incomeDetails = { ...trip.income };
          
          const { error: insertError } = await supabase
            .from('daily_trips')
            .insert({
              trip_date: tripSaveDate,
              bus_id: busData.id,
              trip_no: newTripNo,
              income: tripRevenue,
              income_details: incomeDetails as any,
              data_source: 'ocr' as any
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
      
      // Determine unique trip dates for expense distribution
      const uniqueTripDates = hasIndividualDates 
        ? [...new Set(data.trips.map(t => t.individualDate).filter(Boolean) as string[])]
        : [tripDate];

      console.log('📅 Expense distribution dates:', uniqueTripDates);
      console.log(`   Multi-day mode: ${hasIndividualDates}`);
      console.log(`   Will divide expenses across ${uniqueTripDates.length} dates`);

      const numberOfDates = uniqueTripDates.length;

      // Divide each expense category by the number of trip dates
      const dividedExpenses = Object.entries(mappedExpenses).reduce((acc, [key, value]) => {
        acc[key] = Math.round(value / numberOfDates);  // Round to avoid decimals
        return acc;
      }, {} as Record<string, number>);

      const totalExpenses = Object.values(mappedExpenses).reduce((sum, val) => sum + val, 0);
      const perTripExpenses = Object.values(dividedExpenses).reduce((sum, val) => sum + val, 0);

      console.log('💰 Original total expenses:', totalExpenses);
      console.log('💰 Per-trip expenses:', perTripExpenses);
      console.log('   Breakdown:', dividedExpenses);

      // SINGLE-DAY: Save all expenses to one date
      // MULTI-DAY: Save divided expenses to each date
      for (const expenseDate of uniqueTripDates) {
        const expensePayload = {
          expense_date: expenseDate,
          bus_id: busData.id,
          created_by: user.id,
          ...(hasIndividualDates ? dividedExpenses : mappedExpenses),
        };

        console.log(`💾 Upserting expenses for ${expenseDate}:`, expensePayload);

        const { error: expenseError } = await supabase
          .from('daily_bus_expenses')
          .upsert(expensePayload, {
            onConflict: 'bus_id,expense_date'
          })
          .select()
          .single();

        if (expenseError) {
          console.error(`❌ Failed to save expenses for ${expenseDate}:`, expenseError);
          toast.error(`Failed to save expenses for ${expenseDate}: ${expenseError.message}`);
          return;
        }

        console.log(`✅ Expenses saved for ${expenseDate}`);
      }
      
      // Show enhanced success message with expense distribution
      toast.success(
        <div className="space-y-2">
          <p className="font-bold">✅ {busData.bus_no}: Successfully Applied!</p>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {mappingLog.length > 0 ? (
              mappingLog.map((log, idx) => (
                <div key={idx} className="flex justify-between gap-2">
                  <span>Trip {log.ocrTrip}:</span>
                  <span className="font-mono text-green-600">
                    {log.date} • {log.action} • {log.tripNo}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-red-500">⚠️ No trips were updated or created!</p>
            )}
          </div>
          <div className="text-xs text-muted-foreground border-t pt-1 mt-1">
            {hasIndividualDates ? (
              <>
                <p className="font-semibold">💰 Expenses divided across {uniqueTripDates.length} dates:</p>
                {uniqueTripDates.map(date => (
                  <p key={date} className="ml-2">• {date}: Rs. {perTripExpenses.toLocaleString()}</p>
                ))}
                <p className="font-semibold mt-1">Total: Rs. {totalExpenses.toLocaleString()}</p>
              </>
            ) : (
              <p>Expenses: {tripDate} • Total: Rs. {totalExpenses.toLocaleString()}</p>
            )}
          </div>
        </div>,
        { duration: 10000 }
      );

      // If no trips were mapped, show error
      if (mappingLog.length === 0) {
        toast.error('⚠️ Warning: No trips were saved. Check console for details.');
      }

      console.log('✅ All expenses saved, now verifying in DB...');

      // VERIFY: Query saved data for each date
      for (const expenseDate of uniqueTripDates) {
        const { data: verifiedExpense, error: verifyError } = await supabase
          .from('daily_bus_expenses')
          .select('*')
          .eq('bus_id', busData.id)
          .eq('expense_date', expenseDate)
          .single();

        if (verifyError) {
          console.error(`⚠️ Could not verify expenses for ${expenseDate}:`, verifyError);
        } else {
          console.log(`🔍 VERIFIED IN DATABASE (${expenseDate}):`, verifiedExpense);
          console.log('  Total in DB:', verifiedExpense.total_daily_expenses);
          console.log('  Fuel in DB:', verifiedExpense.fuel_cost);
          console.log('  Salary in DB:', verifiedExpense.salary);
        }
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
