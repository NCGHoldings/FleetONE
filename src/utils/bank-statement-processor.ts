import * as XLSX from 'xlsx';

// =========== TYPES ===========
export interface BankStatementTransaction {
  rowNumber: number;
  txnDate: Date;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'payment' | 'deposit';
  chequeNumber?: string;
  rawRow?: Record<string, any>;
}

export interface ParseResult {
  transactions: BankStatementTransaction[];
  bankName: string;
  accountNumber: string;
  statementPeriod: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  parseWarnings: string[];
}

export interface BankFormat {
  id: string;
  name: string;
  detect: (headers: string[], rows: any[]) => boolean;
  parse: (rows: any[], headers: string[]) => BankStatementTransaction[];
  extractMeta: (rows: any[], headers: string[]) => Partial<ParseResult>;
}

export interface ExtractionResult {
  admissionNumbers: string[];
  confidence: number;
  matchedPattern: string;
}

export interface ProcessedTransaction extends BankStatementTransaction {
  extractedIds: ExtractionResult;
  matchedStudents: any[];
  matchStatus: 'auto_matched' | 'partial_match' | 'unmatched';
  splitPayments?: { studentId: string; amount: number }[];
  nameBasedSuggestions?: any[];
}

// =========== ADMISSION NUMBER NORMALIZATION ===========
/**
 * Normalize an admission-like token for comparison.
 * Handles: N14929, N 14929, LNU-14502, NEX-000W14929, W14929
 * Returns { full: uppercased stripped token, numeric: trailing digit run }
 */
export const normalizeAdmissionToken = (token: string): { full: string; numeric: string } => {
  const upper = token.toUpperCase().replace(/[\s\-_./]+/g, '');
  // Extract trailing 4-6 digit run
  const trailingDigits = upper.match(/(\d{4,6})$/);
  return {
    full: upper,
    numeric: trailingDigits ? trailingDigits[1] : upper.replace(/[^0-9]/g, ''),
  };
};

/**
 * Extract all plausible admission-number-like tokens from a combined text string.
 * Works on description, reference, tran ID — any text.
 */
export const extractAdmissionTokens = (text: string, prefixes: string[]): string[] => {
  if (!text) return [];
  const upper = text.toUpperCase().replace(/\s+/g, ' ').trim();
  const tokens: string[] = [];

  // 1. Prefix-based: find PREFIX followed by optional separators and digits
  for (const prefix of prefixes) {
    const p = prefix.toUpperCase();
    const re = new RegExp(`${p}[\\s\\-_./]*\\d{3,6}`, 'g');
    const matches = upper.match(re);
    if (matches) tokens.push(...matches.map(m => m.replace(/[\s\-_./]+/g, '')));
  }

  // 2. Wrapped IDs like NEX-000W14929 → extract trailing letter+digits portion
  const wrappedRe = /[A-Z]{2,5}[\-_.]?[0-9A-Z]*?([A-Z]\d{4,6})/g;
  let m;
  while ((m = wrappedRe.exec(upper)) !== null) {
    if (!tokens.includes(m[1])) tokens.push(m[1]);
  }

  // 3. Standalone 5-6 digit numbers
  const standalone = upper.match(/\b\d{5,6}\b/g);
  if (standalone) {
    for (const s of standalone) {
      if (!tokens.includes(s)) tokens.push(s);
    }
  }

  return [...new Set(tokens)];
};

/**
 * Match students from a list against extracted tokens.
 * Returns matched students with confidence info.
 */
export const matchStudentsFromTokens = (
  tokens: string[],
  students: any[],
  matchText: string
): { matched: any[]; confidence: number; pattern: string } => {
  if (!students || students.length === 0) return { matched: [], confidence: 0, pattern: '' };

  const normalizedTokens = tokens.map(normalizeAdmissionToken);
  const matched: any[] = [];
  let confidence = 0;
  let pattern = '';

  for (const student of students) {
    if (!student.admission_no) continue;
    const studentNorm = normalizeAdmissionToken(student.admission_no);

    const isMatch = normalizedTokens.some(token => {
      // Exact full match
      if (token.full === studentNorm.full) return true;
      // Numeric-only match (LNU14480 → 14480 matches N14480 → 14480)
      if (token.numeric && studentNorm.numeric && token.numeric.length >= 4 && token.numeric === studentNorm.numeric) return true;
      // Partial contains (only for longer tokens)
      if (token.full.length >= 5 && (token.full.includes(studentNorm.full) || studentNorm.full.includes(token.full))) return true;
      return false;
    });

    if (isMatch) {
      matched.push(student);
      confidence = Math.max(confidence, 90);
      pattern = 'Admission number match';
    }
  }

  // Name-based fallback if no ID match
  if (matched.length === 0 && matchText) {
    const upperText = matchText.toUpperCase().replace(/\s+/g, ' ').trim();
    for (const student of students) {
      const name = (student.student_name || '').toUpperCase().trim();
      const parent = (student.parent_name || '').toUpperCase().trim();
      if (!name) continue;

      // Exact name match
      if (name.length >= 4 && upperText.includes(name)) {
        matched.push(student);
        confidence = Math.max(confidence, 70);
        pattern = 'Student name match';
      } else if (parent && parent.length >= 4 && upperText.includes(parent)) {
        matched.push(student);
        confidence = Math.max(confidence, 60);
        pattern = 'Parent name match';
      }
    }
  }

  // Deduplicate
  const unique = [...new Map(matched.map(s => [s.id, s])).values()];
  return { matched: unique, confidence, pattern };
};

// =========== HELPERS ===========
const parseDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  
  // Handle Excel date serial numbers
  if (typeof dateValue === 'number') {
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  const dateStr = String(dateValue).trim();
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const month = parseInt(dmyMatch[2]) - 1;
    let year = parseInt(dmyMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  
  // YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]));
  }
  
  // Try native parse
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Maximum amount allowed per transaction — prevents database numeric overflow
const MAX_AMOUNT = 999_999_999.99;

const cleanAmount = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    const n = Math.abs(val);
    return isFinite(n) && n <= MAX_AMOUNT ? n : 0;
  }
  let str = String(val).trim();
  // Remove currency symbols and text (LKR, Rs, $, etc.)
  str = str.replace(/^[A-Za-z$£€¥]+\.?\s*/g, '');
  // Handle comma-formatted numbers: "10,853.00" → "10853.00"
  // But be careful: some formats use comma as decimal (European)
  // Sri Lankan format uses comma as thousands separator, dot as decimal
  if (str.includes(',') && str.includes('.')) {
    // Both comma and dot: comma is thousands separator → remove commas
    str = str.replace(/,/g, '');
  } else if (str.includes(',') && !str.includes('.')) {
    // Only comma: could be thousands separator OR decimal
    // If comma is followed by exactly 2 digits at end, treat as decimal
    if (/,\d{2}$/.test(str)) {
      str = str.replace(/,(?=\d{2}$)/, '.');
      str = str.replace(/,/g, '');
    } else {
      // Comma is thousands separator
      str = str.replace(/,/g, '');
    }
  }
  // Remove everything except digits, dots, minus
  str = str.replace(/[^0-9.\-]/g, '');
  // Handle multiple dots (take only first)
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }
  const parsed = parseFloat(str);
  if (!isFinite(parsed) || isNaN(parsed)) return 0;
  const result = Math.abs(parsed);
  return result <= MAX_AMOUNT ? result : 0; // Cap at MAX to prevent overflow
};

const normalizeHeader = (h: string): string =>
  String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const findHeader = (headers: string[], ...candidates: string[]): string | null => {
  for (const candidate of candidates) {
    const normalized = normalizeHeader(candidate);
    const found = headers.find(h => normalizeHeader(h) === normalized);
    if (found) return found;
  }
  // Partial match pass — but skip short candidates (≤3 chars) to avoid "Dr" matching "Cr/Dr"
  for (const candidate of candidates) {
    const normalized = normalizeHeader(candidate);
    if (normalized.length <= 3) continue; // Short candidates must match exactly
    const partial = headers.find(h => normalizeHeader(h).includes(normalized) || normalized.includes(normalizeHeader(h)));
    if (partial) return partial;
  }
  return null;
};

// =========== BANK FORMAT PARSERS ===========

// --- COMMERCIAL BANK OF CEYLON ---
const commercialBankFormat: BankFormat = {
  id: 'commercial_bank',
  name: 'Commercial Bank of Ceylon',
  detect: (headers: string[], rows: any[]) => {
    const normalized = headers.map(normalizeHeader);
    // Commercial Bank typically has: Date, Description, Cheque No, Debit, Credit, Balance
    const hasDate = normalized.some(h => h.includes('date') || h.includes('transactiondate'));
    const hasDebitCredit = normalized.some(h => h.includes('debit') || h.includes('withdrawal')) &&
                          normalized.some(h => h.includes('credit') || h.includes('deposit'));
    const hasBalance = normalized.some(h => h.includes('balance') || h.includes('runningbalance'));
    // Check for Commercial Bank specific keywords
    const rawStr = JSON.stringify(rows.slice(0, 5)).toLowerCase();
    const isCommercial = rawStr.includes('commercial') || rawStr.includes('combank');
    return (hasDate && hasDebitCredit && hasBalance) || isCommercial;
  },
  parse: (rows: any[], headers: string[]) => {
    const dateCol = findHeader(headers, 'Date', 'Transaction Date', 'Txn Date', 'Value Date');
    const descCol = findHeader(headers, 'Description', 'Narration', 'Particulars', 'Details');
    const chequeCol = findHeader(headers, 'Cheque No', 'Chq No', 'Cheque Number', 'Instrument');
    const debitCol = findHeader(headers, 'Debit', 'Withdrawal', 'Dr', 'Debit Amount');
    const creditCol = findHeader(headers, 'Credit', 'Deposit', 'Cr', 'Credit Amount');
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance', 'Closing Balance');
    const refCol = findHeader(headers, 'Reference', 'Ref No', 'Trans Ref');

    return rows.map((row, idx) => {
      const debit = cleanAmount(row[debitCol || '']);
      const credit = cleanAmount(row[creditCol || '']);
      return {
        rowNumber: idx + 2,
        txnDate: parseDate(row[dateCol || '']),
        description: String(row[descCol || ''] || '').trim(),
        reference: String(row[refCol || ''] || row[chequeCol || ''] || '').trim(),
        debit,
        credit,
        balance: cleanAmount(row[balanceCol || '']),
        type: (debit > 0 ? 'payment' : 'deposit') as 'payment' | 'deposit',
        chequeNumber: String(row[chequeCol || ''] || '').trim() || undefined,
        rawRow: row,
      };
    }).filter(t => t.description && (t.debit > 0 || t.credit > 0));
  },
  extractMeta: (rows, headers) => {
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance');
    const validRows = rows.filter(r => r[balanceCol || '']);
    return {
      bankName: 'Commercial Bank of Ceylon',
      openingBalance: validRows.length > 0 ? cleanAmount(validRows[0][balanceCol || '']) : 0,
      closingBalance: validRows.length > 0 ? cleanAmount(validRows[validRows.length - 1][balanceCol || '']) : 0,
    };
  },
};

// --- SAMPATH BANK ---
const sampathBankFormat: BankFormat = {
  id: 'sampath_bank',
  name: 'Sampath Bank PLC',
  detect: (headers: string[], rows: any[]) => {
    const normalized = headers.map(normalizeHeader);
    // Sampath Bank format: Trans Date, Value Date, Description, Debit, Credit, Balance
    const hasTransDate = normalized.some(h => h.includes('transdate') || h.includes('trandate'));
    const hasValueDate = normalized.some(h => h.includes('valuedate') || h.includes('valdate'));
    const rawStr = JSON.stringify(rows.slice(0, 5)).toLowerCase();
    const isSampath = rawStr.includes('sampath');
    return (hasTransDate && hasValueDate) || isSampath;
  },
  parse: (rows: any[], headers: string[]) => {
    const dateCol = findHeader(headers, 'Trans Date', 'Transaction Date', 'Date', 'Txn Date');
    const valueDateCol = findHeader(headers, 'Value Date', 'Val Date');
    const descCol = findHeader(headers, 'Description', 'Narration', 'Particulars', 'Transaction Description');
    const debitCol = findHeader(headers, 'Debit', 'Dr Amount', 'Withdrawal');
    const creditCol = findHeader(headers, 'Credit', 'Cr Amount', 'Deposit');
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance', 'Available Balance');
    const refCol = findHeader(headers, 'Reference', 'Ref', 'Trans Ref', 'Instrument No');
    const chequeCol = findHeader(headers, 'Cheque No', 'Chq No', 'Instrument');

    return rows.map((row, idx) => {
      const debit = cleanAmount(row[debitCol || '']);
      const credit = cleanAmount(row[creditCol || '']);
      return {
        rowNumber: idx + 2,
        txnDate: parseDate(row[dateCol || valueDateCol || '']),
        description: String(row[descCol || ''] || '').trim(),
        reference: String(row[refCol || ''] || '').trim(),
        debit,
        credit,
        balance: cleanAmount(row[balanceCol || '']),
        type: (debit > 0 ? 'payment' : 'deposit') as 'payment' | 'deposit',
        chequeNumber: String(row[chequeCol || ''] || '').trim() || undefined,
        rawRow: row,
      };
    }).filter(t => t.description && (t.debit > 0 || t.credit > 0));
  },
  extractMeta: (rows, headers) => {
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance');
    const validRows = rows.filter(r => r[balanceCol || '']);
    return {
      bankName: 'Sampath Bank PLC',
      openingBalance: validRows.length > 0 ? cleanAmount(validRows[0][balanceCol || '']) : 0,
      closingBalance: validRows.length > 0 ? cleanAmount(validRows[validRows.length - 1][balanceCol || '']) : 0,
    };
  },
};

// --- HNB (Hatton National Bank) ---
const hnbFormat: BankFormat = {
  id: 'hnb',
  name: 'Hatton National Bank',
  detect: (headers: string[], rows: any[]) => {
    const rawStr = JSON.stringify(rows.slice(0, 5)).toLowerCase();
    return rawStr.includes('hatton') || rawStr.includes('hnb');
  },
  parse: (rows, headers) => commercialBankFormat.parse(rows, headers), // Similar structure
  extractMeta: (rows, headers) => ({
    ...commercialBankFormat.extractMeta(rows, headers),
    bankName: 'Hatton National Bank',
  }),
};

// --- BOC (Bank of Ceylon) ---
const bocFormat: BankFormat = {
  id: 'boc',
  name: 'Bank of Ceylon',
  detect: (headers: string[], rows: any[]) => {
    const rawStr = JSON.stringify(rows.slice(0, 5)).toLowerCase();
    return rawStr.includes('bank of ceylon') || rawStr.includes('boc');
  },
  parse: (rows, headers) => commercialBankFormat.parse(rows, headers),
  extractMeta: (rows, headers) => ({
    ...commercialBankFormat.extractMeta(rows, headers),
    bankName: 'Bank of Ceylon',
  }),
};

// --- PEOPLES BANK ---
const peoplesBankFormat: BankFormat = {
  id: 'peoples_bank',
  name: "People's Bank",
  detect: (headers: string[], rows: any[]) => {
    const rawStr = JSON.stringify(rows.slice(0, 5)).toLowerCase();
    return rawStr.includes("people's bank") || rawStr.includes('peoples bank');
  },
  parse: (rows, headers) => commercialBankFormat.parse(rows, headers),
  extractMeta: (rows, headers) => ({
    ...commercialBankFormat.extractMeta(rows, headers),
    bankName: "People's Bank",
  }),
};

// --- GENERIC FORMAT (fallback) ---
const genericFormat: BankFormat = {
  id: 'generic',
  name: 'Generic / Other Bank',
  detect: () => true, // Always matches as fallback
  parse: (rows: any[], headers: string[]) => {
    const dateCol = findHeader(headers, 'Date', 'Transaction Date', 'Txn Date', 'Value Date', 'Trans Date');
    const descCol = findHeader(headers, 'Description', 'Narration', 'Particulars', 'Details', 'Remarks', 'Transaction Details');
    const refCol = findHeader(headers, 'Reference', 'Ref No', 'Trans Ref', 'Reference No', 'Tran ID', 'Tran Serial');
    const chequeCol = findHeader(headers, 'Cheque No', 'Chq No', 'Cheque Number', 'Instrument');
    
    // Try debit/credit split columns
    let debitCol = findHeader(headers, 'Debit', 'Withdrawal', 'Dr', 'Debit Amount');
    let creditCol = findHeader(headers, 'Credit', 'Deposit', 'Cr', 'Credit Amount');
    
    // Safety: if debit and credit resolved to the same column, clear both and fall back
    if (debitCol && creditCol && debitCol === creditCol) {
      debitCol = null;
      creditCol = null;
    }
    
    // Or combined amount column
    const amountCol = findHeader(headers, 'Amount', 'Transaction Amount');
    const typeCol = findHeader(headers, 'Type', 'Transaction Type', 'Dr/Cr', 'Cr/Dr');
    
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance', 'Closing Balance', 'Available Balance');

    return rows.map((row, idx) => {
      let debit = 0, credit = 0;
      
      if (debitCol && creditCol) {
        debit = cleanAmount(row[debitCol]);
        credit = cleanAmount(row[creditCol]);
      } else if (amountCol) {
        const amount = cleanAmount(row[amountCol]);
        const typeVal = String(row[typeCol || ''] || '').toLowerCase();
        if (typeVal.includes('dr') || typeVal.includes('debit') || typeVal.includes('withdrawal') || typeVal.includes('payment')) {
          debit = amount;
        } else {
          credit = amount;
        }
      }

      return {
        rowNumber: idx + 2,
        txnDate: parseDate(row[dateCol || '']),
        description: String(row[descCol || ''] || '').trim(),
        reference: String(row[refCol || ''] || row[chequeCol || ''] || '').trim(),
        debit,
        credit,
        balance: cleanAmount(row[balanceCol || '']),
        type: (debit > 0 ? 'payment' : 'deposit') as 'payment' | 'deposit',
        chequeNumber: String(row[chequeCol || ''] || '').trim() || undefined,
        rawRow: row,
      };
    }).filter(t => t.description && (t.debit > 0 || t.credit > 0));
  },
  extractMeta: (rows, headers) => {
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance');
    const validRows = rows.filter(r => r[balanceCol || '']);
    return {
      bankName: 'Generic',
      openingBalance: validRows.length > 0 ? cleanAmount(validRows[0][balanceCol || '']) : 0,
      closingBalance: validRows.length > 0 ? cleanAmount(validRows[validRows.length - 1][balanceCol || '']) : 0,
    };
  },
};

// =========== ALL BANK FORMATS (ordered by specificity) ===========
export const BANK_FORMATS: BankFormat[] = [
  commercialBankFormat,
  sampathBankFormat,
  hnbFormat,
  bocFormat,
  peoplesBankFormat,
  genericFormat,
];

// =========== MAIN PARSER ===========
export const parseBankStatement = async (file: File, forceBankId?: string): Promise<ParseResult> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
  
  if (jsonData.length === 0) {
    return {
      transactions: [],
      bankName: 'Unknown',
      accountNumber: '',
      statementPeriod: '',
      openingBalance: 0,
      closingBalance: 0,
      totalDebits: 0,
      totalCredits: 0,
      parseWarnings: ['No data found in file'],
    };
  }

  const headers = Object.keys(jsonData[0] || {});
  const warnings: string[] = [];

  // Auto-detect or use forced bank
  let format: BankFormat;
  if (forceBankId) {
    format = BANK_FORMATS.find(f => f.id === forceBankId) || genericFormat;
  } else {
    format = BANK_FORMATS.find(f => f.detect(headers, jsonData)) || genericFormat;
    if (format.id === 'generic') {
      warnings.push('Could not auto-detect bank format, using generic parser');
    }
  }

  // Parse transactions
  const transactions = format.parse(jsonData, headers);
  const meta = format.extractMeta(jsonData, headers);

  // Calculate totals
  const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);

  // Detect period from dates
  const dates = transactions.map(t => t.txnDate).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  const periodStart = dates.length > 0 ? dates[0] : new Date();
  const periodEnd = dates.length > 0 ? dates[dates.length - 1] : new Date();
  const statementPeriod = `${periodStart.toLocaleDateString('en-GB')} - ${periodEnd.toLocaleDateString('en-GB')}`;

  if (transactions.length === 0) {
    warnings.push('No valid transactions parsed from file');
  }

  return {
    transactions,
    bankName: meta.bankName || format.name,
    accountNumber: meta.accountNumber || '',
    statementPeriod,
    openingBalance: meta.openingBalance || 0,
    closingBalance: meta.closingBalance || 0,
    totalDebits,
    totalCredits,
    parseWarnings: warnings,
  };
};

// =========== AUTO-DETECT BANK NAME ===========
export const detectBankFormat = async (file: File): Promise<{ bankId: string; bankName: string; confidence: number }> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 0 });
  
  if (jsonData.length === 0) {
    return { bankId: 'generic', bankName: 'Generic', confidence: 0 };
  }
  
  const headers = Object.keys(jsonData[0] || {});
  
  for (const format of BANK_FORMATS) {
    if (format.id === 'generic') continue;
    if (format.detect(headers, jsonData)) {
      return { bankId: format.id, bankName: format.name, confidence: 85 };
    }
  }
  
  return { bankId: 'generic', bankName: 'Generic / Other Bank', confidence: 50 };
};

// =========== ADMISSION NUMBER EXTRACTION (for School Bus) ===========
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

  // Fallback - standalone numbers
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

// =========== DUPLICATE DETECTION ===========
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

// =========== COLUMN MAPPING TYPES & PARSER ===========
export interface ColumnMapping {
  dateCol: string;
  descriptionCol: string;
  amountCol: string;
  typeCol?: string; // Cr/Dr indicator column
  referenceCol?: string;
  balanceCol?: string;
  matchFromCol?: string; // Which column(s) to use for student matching: 'description', 'reference', 'combined', or a specific header name
}

export const getFileHeaders = async (file: File): Promise<{ headers: string[]; sampleRows: Record<string, any>[] }> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  return { headers, sampleRows: jsonData.slice(0, 5) };
};

export const parseBankStatementWithMapping = async (file: File, mapping: ColumnMapping): Promise<ParseResult> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
  const warnings: string[] = [];

  if (jsonData.length === 0) {
    return {
      transactions: [], bankName: 'Manual Mapping', accountNumber: '', statementPeriod: '',
      openingBalance: 0, closingBalance: 0, totalDebits: 0, totalCredits: 0,
      parseWarnings: ['No data found in file'],
    };
  }

  const transactions: BankStatementTransaction[] = jsonData.map((row, idx) => {
    let debit = 0, credit = 0;
    const amount = cleanAmount(row[mapping.amountCol]);

    if (mapping.typeCol) {
      const typeVal = String(row[mapping.typeCol] || '').toLowerCase().trim();
      if (typeVal.includes('dr') || typeVal.includes('debit') || typeVal.includes('withdrawal')) {
        debit = amount;
      } else {
        credit = amount;
      }
    } else {
      credit = amount; // Default: treat as credit/deposit
    }

    return {
      rowNumber: idx + 2,
      txnDate: parseDate(row[mapping.dateCol]),
      description: String(row[mapping.descriptionCol] || '').trim(),
      reference: String(row[mapping.referenceCol || ''] || '').trim(),
      debit, credit,
      balance: cleanAmount(row[mapping.balanceCol || '']),
      type: (debit > 0 ? 'payment' : 'deposit') as 'payment' | 'deposit',
      rawRow: row,
    };
  }).filter(t => t.description && (t.debit > 0 || t.credit > 0));

  const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);
  const dates = transactions.map(t => t.txnDate).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  const periodStart = dates.length > 0 ? dates[0] : new Date();
  const periodEnd = dates.length > 0 ? dates[dates.length - 1] : new Date();

  if (transactions.length === 0) warnings.push('No valid transactions parsed with given column mapping');

  return {
    transactions, bankName: 'Manual Mapping', accountNumber: '',
    statementPeriod: `${periodStart.toLocaleDateString('en-GB')} - ${periodEnd.toLocaleDateString('en-GB')}`,
    openingBalance: 0, closingBalance: 0, totalDebits, totalCredits, parseWarnings: warnings,
  };
};
