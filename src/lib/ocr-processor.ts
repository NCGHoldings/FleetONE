import { supabase } from '@/integrations/supabase/client';
import { preprocessImage } from './image-preprocessor';

export interface OCRResult {
  busNumber: string | null;
  date: string | null;
  income: Record<string, number>;
  expenses: Record<string, number>;
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

    // Return structured data from AI
    return {
      busNumber: data.busNumber || null,
      date: data.date || null,
      income: data.income || {},
      expenses: data.expenses || {},
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
  // Convert structured AI data to legacy format
  const extractedNumbers = [
    ...Object.values(ocrResult.income),
    ...Object.values(ocrResult.expenses),
  ].filter(n => n > 0);

  return {
    busNumber: ocrResult.busNumber,
    date: ocrResult.date,
    extractedNumbers,
    incomeFields: ocrResult.income,
    expenseFields: ocrResult.expenses,
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
