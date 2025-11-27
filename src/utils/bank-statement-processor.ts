import * as XLSX from 'xlsx';

export interface BankTransaction {
  txnDate: Date;
  description: string;
  amount: number;
  rowNumber: number;
}

export interface ExtractionResult {
  admissionNumbers: string[];
  confidence: number;
  matchedPattern: string;
}

export interface ProcessedTransaction extends BankTransaction {
  extractedIds: ExtractionResult;
  matchedStudents: any[];
  matchStatus: 'auto_matched' | 'partial_match' | 'unmatched';
  splitPayments?: { studentId: string; amount: number }[];
  nameBasedSuggestions?: any[];
}

/**
 * Parse Excel/CSV bank statement file
 */
export const parseBankStatement = async (file: File): Promise<BankTransaction[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

  return jsonData.map((row, index) => {
    // Try common column name variations
    const txnDate = row['Txn Date'] || row['Transaction Date'] || row['Date'] || row['txn_date'];
    const description = row['Description'] || row['description'] || row['Narration'] || row['Remarks'];
    const amount = row['Amount'] || row['amount'] || row['Cr/Dr'] || row['Credit'];

    return {
      txnDate: parseDate(txnDate),
      description: String(description || '').trim(),
      amount: parseFloat(String(amount || '0').replace(/[^0-9.-]/g, '')),
      rowNumber: index + 2, // Excel row number (header is row 1)
    };
  }).filter(t => t.description && t.amount > 0);
};

/**
 * Parse various date formats
 */
const parseDate = (dateValue: any): Date => {
  if (dateValue instanceof Date) return dateValue;
  
  // Handle Excel date serial numbers
  if (typeof dateValue === 'number') {
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  // Try parsing string dates
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Extract admission numbers from description using configured patterns
 */
export const extractAdmissionNumbers = (
  description: string,
  prefixes: string[],
  customPatterns: any[] = []
): ExtractionResult => {
  const normalized = description.toUpperCase().replace(/\s+/g, ' ').trim();
  const extractedIds: string[] = [];
  let confidence = 0;
  let matchedPattern = '';

  // Try custom patterns first
  for (const pattern of customPatterns) {
    try {
      const regex = new RegExp(pattern.regex, 'gi');
      const matches = normalized.match(regex);
      if (matches) {
        extractedIds.push(...matches.map(m => m.trim()));
        confidence = 95;
        matchedPattern = `Custom: ${pattern.name}`;
        break;
      }
    } catch (e) {
      console.error('Invalid custom pattern:', pattern);
    }
  }

  // If no custom pattern matched, try prefix-based extraction
  if (extractedIds.length === 0) {
    for (const prefix of prefixes) {
      // Pattern 1: PREFIX followed by digits (with optional spaces/separators)
      const pattern1 = new RegExp(`${prefix}\\s*[-_]?\\s*(\\d{4,6})`, 'gi');
      const matches1 = Array.from(normalized.matchAll(pattern1));
      
      if (matches1.length > 0) {
        matches1.forEach(match => {
          const id = `${prefix}${match[1]}`;
          if (!extractedIds.includes(id)) {
            extractedIds.push(id);
          }
        });
        confidence = 90;
        matchedPattern = `Prefix: ${prefix}`;
      }

      // Pattern 2: Just digits after known prefix location
      const prefixIndex = normalized.indexOf(prefix);
      if (prefixIndex !== -1) {
        const afterPrefix = normalized.substring(prefixIndex + prefix.length);
        const digitMatch = afterPrefix.match(/^\s*[-_]?\s*(\d{4,6})/);
        if (digitMatch) {
          const id = `${prefix}${digitMatch[1]}`;
          if (!extractedIds.includes(id)) {
            extractedIds.push(id);
            confidence = Math.max(confidence, 85);
            matchedPattern = matchedPattern || `Prefix: ${prefix}`;
          }
        }
      }
    }
  }

  // Pattern 3: Fallback - find any standalone numbers that might be IDs
  if (extractedIds.length === 0) {
    const standaloneNumbers = normalized.match(/\b\d{5,6}\b/g);
    if (standaloneNumbers) {
      extractedIds.push(...standaloneNumbers);
      confidence = 50;
      matchedPattern = 'Standalone number (low confidence)';
    }
  }

  return {
    admissionNumbers: extractedIds,
    confidence: Math.min(confidence, 100),
    matchedPattern,
  };
};

/**
 * Extract potential student names from description
 */
export const extractPotentialNames = (description: string): string[] => {
  // Remove common banking terms
  const cleaned = description
    .replace(/VSRTFR|CEFT|TRANSFER|PAYMENT|SEP|SEPT|SEPTEMBER|OCT|OCTOBER|GRADE|BATCH/gi, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim();

  // Split into words and filter
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  
  // Look for capitalized words that might be names
  const potentialNames = words.filter(w => /^[A-Z][a-z]+$/.test(w));
  
  return potentialNames;
};

/**
 * Calculate fuzzy match score between two strings
 */
export const calculateFuzzyMatch = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 100;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
};

/**
 * Levenshtein distance algorithm
 */
const levenshteinDistance = (str1: string, str2: string): number => {
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
};

/**
 * Check for duplicate payment
 */
export const checkDuplicatePayment = (
  txnDate: Date,
  amount: number,
  studentId: string,
  existingPayments: any[]
): boolean => {
  return existingPayments.some(payment => {
    const paymentDate = new Date(payment.payment_date);
    const sameDate = paymentDate.toDateString() === txnDate.toDateString();
    const sameAmount = Math.abs(payment.amount_received - amount) < 0.01;
    const sameStudent = payment.student_id === studentId;
    
    return sameDate && sameAmount && sameStudent;
  });
};
