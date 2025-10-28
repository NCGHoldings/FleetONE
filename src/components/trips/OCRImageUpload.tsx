import { useState } from 'react';
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { extractTextFromImage, parseTripData } from '@/lib/ocr-processor';
import { mapExtractedFields } from '@/lib/ocr-field-mapper';

interface OCRImageUploadProps {
  selectedDate: Date;
  onDataExtracted: (data: ExtractedTripData[]) => void;
}

export interface ExtractedTripData {
  id: string;
  fileName: string;
  imageUrl: string;
  busNumber: string | null;
  date: string | null;
  confidence: number;
  income: Record<string, number>;
  expenses: Record<string, number>;
  unmapped: { field: string; value: number; section: 'income' | 'expense' }[];
  rawText: string;
}

export function OCRImageUpload({ selectedDate, onDataExtracted }: OCRImageUploadProps) {
  const [images, setImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedTripData[]>([]);

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
    const results: ExtractedTripData[] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setProgress(((i + 1) / images.length) * 100);

        toast.info(`Processing ${image.name}...`);

        // Extract text using OCR
        const ocrResult = await extractTextFromImage(image);
        
        // Parse trip data from extracted text
        const parsedData = parseTripData(ocrResult.text);
        
        // Map fields to Quick Entry format
        const { income, expenses, unmapped } = mapExtractedFields(
          parsedData.incomeFields,
          parsedData.expenseFields
        );

        // Create preview URL for image
        const imageUrl = URL.createObjectURL(image);

        results.push({
          id: `${Date.now()}-${i}`,
          fileName: image.name,
          imageUrl,
          busNumber: parsedData.busNumber,
          date: parsedData.date,
          confidence: ocrResult.confidence,
          income,
          expenses,
          unmapped,
          rawText: ocrResult.text,
        });
      }

      setExtractedData(results);
      onDataExtracted(results);
      toast.success(`Successfully processed ${results.length} image(s)`);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Trip Sheets (OCR)
        </CardTitle>
        <CardDescription>
          Upload images of handwritten trip sheets. The system will automatically extract data and match to bus numbers.
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
              Drag and drop images here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, HEIC • Multiple files allowed
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

        {/* Extracted Data Preview */}
        {extractedData.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Extracted Data</h3>
              <span className="text-sm text-muted-foreground">
                {extractedData.length} sheet(s) processed
              </span>
            </div>
            
            <div className="space-y-3">
              {extractedData.map((data) => (
                <Card key={data.id} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={data.imageUrl}
                        alt={data.fileName}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{data.fileName}</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            data.confidence > 80 
                              ? 'bg-green-100 text-green-700'
                              : data.confidence > 60
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {data.confidence.toFixed(0)}% confidence
                          </span>
                        </div>
                        
                        {data.busNumber && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Bus:</span>{' '}
                            <span className="font-semibold">{data.busNumber}</span>
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Income fields:</span>{' '}
                            {Object.keys(data.income).length}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expense fields:</span>{' '}
                            {Object.keys(data.expenses).length}
                          </div>
                        </div>
                        
                        {data.unmapped.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-yellow-600">
                            <AlertCircle className="h-3 w-3" />
                            {data.unmapped.length} field(s) need manual mapping
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
