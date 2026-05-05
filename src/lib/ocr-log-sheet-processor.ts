import { supabase } from '@/integrations/supabase/client';
import { preprocessImage } from './image-preprocessor';

export interface LogSheetRow {
  date: string | null;
  start_location: string | null;
  start_odo: number | null;
  start_time: string | null;
  end_location: string | null;
  end_odo: number | null;
  end_time: string | null;
  distance: number | null;
  fuel_liters: number | null;
  driver_name: string | null;
  conductor_name: string | null;
}

export interface OCRLogSheetResult {
  busNumber: string | null;
  logs: LogSheetRow[];
}

/**
 * Extract monthly log sheet data from image using Lovable AI
 */
export async function extractLogSheetData(imageFile: File): Promise<OCRLogSheetResult> {
  try {
    // Preprocess image for better accuracy
    const preprocessedBase64 = await preprocessImage(imageFile, {
      autoRotate: true,
      enhanceContrast: true,
      adjustBrightness: true,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    // Call edge function for OCR processing with the new sheetType parameter
    const { data, error } = await supabase.functions.invoke('ocr-extract', {
      body: { 
        imageBase64: preprocessedBase64,
        sheetType: 'monthly_log' 
      }
    });

    if (error) {
      console.error('OCR Log Sheet extraction error:', error);
      throw new Error(error.message || 'Failed to extract text from image');
    }

    if (!data) {
      throw new Error('No data returned from OCR service');
    }

    // Normalize bus number (0746 → NE-0746)
    let normalizedBusNumber = data.busNumber || null;
    if (normalizedBusNumber && !normalizedBusNumber.includes('-')) {
      normalizedBusNumber = `NE-${normalizedBusNumber}`;
    }
    
    // Ensure numbers are properly parsed
    const processedLogs = (data.logs || []).map((log: any) => ({
      ...log,
      start_odo: log.start_odo ? Number(log.start_odo) : null,
      end_odo: log.end_odo ? Number(log.end_odo) : null,
      distance: log.distance ? Number(log.distance) : null,
      fuel_liters: log.fuel_liters ? Number(log.fuel_liters) : null,
    }));

    return {
      busNumber: normalizedBusNumber,
      logs: processedLogs,
    };
  } catch (error) {
    console.error('Error in extractLogSheetData:', error);
    throw error;
  }
}
