import { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: any[];
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
 * Extract text from image using Tesseract OCR
 * Supports both English and Sinhala text
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRResult> {
  const worker = await createWorker(['eng', 'sin']);
  
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789.,/-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzඅආඇඈඉඊඋඌඍඑඒඓඔඕඖකඛගඝඞචඡජඣඤඥඨඩඬණතථදධනපඵබභමයරලවසහළෆංඃ',
  });
  
  const { data } = await worker.recognize(imageFile);
  await worker.terminate();
  
  return {
    text: data.text,
    confidence: data.confidence,
    words: data.words,
  };
}

/**
 * Parse trip data from OCR text
 * Extracts bus number, date, and income/expense values
 */
export function parseTripData(ocrText: string): ParsedTripData {
  // Extract bus number (formats: NP-0748, NP 0748, NP0748)
  const busNumberMatch = ocrText.match(/[A-Z]{2,3}[-\s]?\d{4}/i);
  
  // Extract date (formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
  const dateMatch = ocrText.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  
  // Extract all numbers from the text
  const numberMatches = ocrText.match(/[\d,]+(?:\.\d+)?/g);
  const extractedNumbers = numberMatches 
    ? numberMatches.map(n => parseFloat(n.replace(/,/g, '')))
    : [];
  
  // Parse income and expense sections
  const { incomeFields, expenseFields } = parseFieldsFromText(ocrText, extractedNumbers);
  
  return {
    busNumber: busNumberMatch?.[0]?.toUpperCase() || null,
    date: dateMatch?.[0] || null,
    extractedNumbers,
    incomeFields,
    expenseFields,
    rawText: ocrText,
  };
}

/**
 * Parse income and expense fields from text
 * Uses position-based parsing to associate labels with values
 */
function parseFieldsFromText(text: string, numbers: number[]): {
  incomeFields: Record<string, number>;
  expenseFields: Record<string, number>;
} {
  const incomeFields: Record<string, number> = {};
  const expenseFields: Record<string, number> = {};
  
  // Split text into lines for line-by-line parsing
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentSection = 'unknown';
  let numberIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Detect section headers
    if (line.includes('income') || line.includes('ආදායම') || line.includes('revenue')) {
      currentSection = 'income';
      continue;
    }
    if (line.includes('expense') || line.includes('වියදම') || line.includes('විය') || line.includes('cost')) {
      currentSection = 'expense';
      continue;
    }
    
    // Extract field name and value from line
    const numberInLine = line.match(/[\d,]+(?:\.\d+)?/g);
    if (numberInLine && numberIndex < numbers.length) {
      const fieldName = line.replace(/[\d,\.]+/g, '').trim();
      const value = numbers[numberIndex];
      
      if (currentSection === 'income') {
        incomeFields[fieldName] = value;
      } else if (currentSection === 'expense') {
        expenseFields[fieldName] = value;
      }
      
      numberIndex++;
    }
  }
  
  return { incomeFields, expenseFields };
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
