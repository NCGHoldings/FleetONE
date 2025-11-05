import { useState } from 'react';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { extractTextFromImage } from '@/lib/ocr-processor';
import { OCRExtractedDataCard } from './OCRExtractedDataCard';
import { OCRBatchActions } from './OCRBatchActions';
import { supabase } from '@/integrations/supabase/client';
import { SingleTrip, DailyExpenses } from '@/lib/ocr-processor';

interface OCRImageUploadProps {
  selectedDate: Date;
  onDataExtracted: () => void;
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
}

export function OCRImageUpload({ selectedDate, onDataExtracted }: OCRImageUploadProps) {
  const [images, setImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedMultiTripData[]>([]);

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
        setProgress(((i + 1) / images.length) * 100);

        toast.info(`Processing ${image.name}...`);

        // Extract multi-trip data using OCR
        const ocrResult = await extractTextFromImage(image);

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
      }

      setExtractedData(results);
      toast.success(`Successfully processed ${results.length} sheet(s) with ${results.reduce((sum, r) => sum + r.trips.length, 0)} total trips`);
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Failed to process images. Please try again.');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const clearAll = () => {
    setImages([]);
    setExtractedData([]);
    setProgress(0);
  };

  const applyMultiTripData = async (data: ExtractedMultiTripData) => {
    try {
      // 1. Validate bus number exists
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .select('id, bus_no')
        .eq('bus_no', data.busNumber)
        .single();

      if (busError || !busData) {
        toast.error(`Bus ${data.busNumber} not found in database. Please check the bus number.`);
        return;
      }

      // 2. Parse date
      const [day, month, year] = data.date.split('/');
      const tripDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // 3. Insert trips
      const tripsToInsert = data.trips.map((trip, idx) => ({
        trip_no: `${data.busNumber}-${trip.trip_no}`,
        trip_date: tripDate,
        bus_id: busData.id,
        income: Object.values(trip.income).reduce((s, v) => s + v, 0),
        income_details: trip.income as any,
        odometer_start: trip.odometer_start || null,
        odometer_end: trip.odometer_end || null,
      }));

      const { error: tripError } = await supabase
        .from('daily_trips')
        .insert(tripsToInsert);

      if (tripError) {
        console.error('Trip insert error:', tripError);
        toast.error('Failed to insert trips: ' + tripError.message);
        return;
      }

      // 4. Insert or update daily expenses
      const { error: expenseError } = await supabase
        .from('daily_bus_expenses')
        .upsert({
          expense_date: tripDate,
          bus_id: busData.id,
          ...data.daily_expenses,
        }, {
          onConflict: 'bus_id,expense_date'
        });

      if (expenseError) {
        console.error('Expense insert error:', expenseError);
        toast.error('Failed to insert expenses: ' + expenseError.message);
        return;
      }

      toast.success(`✅ Applied ${data.trips.length} trip(s) for ${data.busNumber} with daily expenses`);
      onDataExtracted();
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
    
    for (const data of readyData) {
      await applyMultiTripData(data);
    }
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
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop trip sheet images, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG • Multiple sheets allowed
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
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
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing images...</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
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
                  onApply={applyMultiTripData}
                  onDiscard={() => handleDiscard(index)}
                  onView={handleView}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
