import { supabase } from '@/integrations/supabase/client';
import { preprocessImage } from './image-preprocessor';

export interface TripIncome extends Record<string, number> {
  bus_collection: number;
  call_booking: number;
  agent_booking: number;
  luggage_income: number;
  special_income: number;
}

export interface SingleTrip {
  trip_no: number;
  income: TripIncome;
  odometer_start?: number;
  odometer_end?: number;
  individualDate?: string; // NEW: YYYY-MM-DD for multi-day routes
}

export interface DailyExpenses extends Record<string, number> {
  fuel_cost: number;
  driver_salary: number; // Separate for OCR extraction
  conductor_salary: number; // Separate for OCR extraction
  runner?: number; // Optional OCR field for runner allowance
  food: number;
  parking: number;
  body_wash: number;
  police: number;
  repair: number;
  grease?: number; // Optional OCR field
  highway_toll?: number; // Optional OCR field (maps to highway_charges)
  phone?: number; // Optional OCR field (maps to short_misc)
  oil?: number; // Optional OCR field
  tyre_tube?: number; // Optional OCR field
  labour?: number; // Optional OCR field
  spare_parts?: number; // Optional OCR field
  permit?: number; // Optional OCR field
  insurance?: number; // Optional OCR field
  other?: number;
}

export interface OCRResult {
  busNumber: string | null;
  date: string | null;
  driverName?: string | null;
  conductorName?: string | null;
  trips: SingleTrip[];
  daily_expenses: DailyExpenses;
  confidence: number;
  rawData?: any;
}

export interface ParsedTripData {
  busNumber: string | null;
  date: string | null;
  extractedNumbers: number[];
  incomeFields: Record<string, number>;
  expenseFields: Record<string, number>;
  rawText: string;
}

/**
 * Extract text from image using Lovable AI
 * Supports both English and Sinhala text
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRResult> {
  try {
    // Preprocess image for better accuracy
    const preprocessedBase64 = await preprocessImage(imageFile, {
      autoRotate: true,
      enhanceContrast: true,
      adjustBrightness: true,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    // Call edge function for OCR processing
    const { data, error } = await supabase.functions.invoke('ocr-extract', {
      body: { imageBase64: preprocessedBase64 }
    });

    if (error) {
      console.error('OCR extraction error:', error);
      throw new Error(error.message || 'Failed to extract text from image');
    }

    if (!data) {
      throw new Error('No data returned from OCR service');
    }

    // Normalize bus number (0746 → NE-0746)
    let normalizedBusNumber = data.busNumber || null;
    if (normalizedBusNumber && !normalizedBusNumber.includes('-')) {
      // If just numbers, assume NE prefix (can be customized)
      normalizedBusNumber = `NE-${normalizedBusNumber}`;
    }

    // Return structured multi-trip data from AI
    return {
      busNumber: normalizedBusNumber,
      date: data.date || null,
      trips: data.trips || [],
      daily_expenses: data.daily_expenses || {
        fuel_cost: 0,
        driver_salary: 0,
        conductor_salary: 0,
        food: 0,
        parking: 0,
        body_wash: 0,
        police: 0,
        repair: 0,
        other: 0,
      },
      confidence: data.confidence || 0.5,
      rawData: data,
    };
  } catch (error) {
    console.error('Error in extractTextFromImage:', error);
    throw error;
  }
}

/**
 * Parse trip data from OCR result
 * Converts AI-extracted data to ParsedTripData format for compatibility
 */
export function parseTripData(ocrResult: OCRResult): ParsedTripData {
  // Aggregate all trip incomes for total
  const allIncomeValues: number[] = [];
  const aggregatedIncome: Record<string, number> = {
    bus_collection: 0,
    call_booking: 0,
    agent_booking: 0,
    luggage_income: 0,
    special_income: 0,
  };

  ocrResult.trips.forEach(trip => {
    Object.entries(trip.income).forEach(([key, value]) => {
      aggregatedIncome[key] = (aggregatedIncome[key] || 0) + value;
      allIncomeValues.push(value);
    });
  });

  const expenseValues = Object.values(ocrResult.daily_expenses).filter(n => n > 0);
  const extractedNumbers = [...allIncomeValues, ...expenseValues];

  return {
    busNumber: ocrResult.busNumber,
    date: ocrResult.date,
    extractedNumbers,
    incomeFields: aggregatedIncome,
    expenseFields: ocrResult.daily_expenses,
    rawText: JSON.stringify(ocrResult.rawData || {}, null, 2),
  };
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity between two strings (0-1)
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
