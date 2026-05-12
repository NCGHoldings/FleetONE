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

export interface ImportValidationResult {
  errors: string[];
  warnings: string[];
  duplicateRows: number[];
  invalidDateRows: number[];
  zeroAmountRows: number[];
  noIdRows: number[];
  ambiguousMatchRows: number[];
  canProceed: boolean;
}

// =========== ADMISSION NUMBER NORMALIZATION ===========

/**
 * Normalize an admission-like token for comparison.
 * Returns { full: uppercased stripped token, numeric: trailing digit run, numericNoLeadingZeros: stripped of leading zeros }
 */
export const normalizeAdmissionToken = (token: string): { full: string; numeric: string; numericStripped: string } => {
  const upper = token.toUpperCase().replace(/[\s\-_./]+/g, '');
  const trailingDigits = upper.match(/(\d{4,6})$/);
  const numeric = trailingDigits ? trailingDigits[1] : upper.replace(/[^0-9]/g, '');
  return {
    full: upper,
    numeric,
    numericStripped: numeric.replace(/^0+/, '') || numeric, // remove leading zeros for comparison
  };
};

/**
 * Extract all plausible admission-number-like tokens from text.
 * Filters out overly generic tokens like "NEX000" that would match everything.
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

  // 2. Wrapped IDs like NEX-000W14929 → extract the trailing letter+digits portion (e.g. W14929)
  //    AND strip the leading letter to get pure digits (e.g. 14929)
  const wrappedRe = /[A-Z]{2,5}[\-_.]?[0-9A-Z]*?([A-Z]\d{4,6})/g;
  let m;
  while ((m = wrappedRe.exec(upper)) !== null) {
    if (!tokens.includes(m[1])) tokens.push(m[1]);
    // Also extract just the digits after the letter (e.g. W14929 → 14929)
    const pureDigits = m[1].replace(/^[A-Z]+/, '');
    if (pureDigits.length >= 4 && !tokens.includes(pureDigits)) {
      tokens.push(pureDigits);
    }
  }

  // 2b. NEX-style: NEX-000W12869 → extract the full numeric after "000" prefix (e.g. 12869)
  const nexRe = /NEX[\-_.]?\d{3}([A-Z]?)(\d{4,6})/g;
  let nm;
  while ((nm = nexRe.exec(upper)) !== null) {
    const digitPart = nm[2]; // Pure digits e.g. 12869
    if (!tokens.includes(digitPart)) tokens.push(digitPart);
    // Also try with any single-letter prefix from the student admission system
    if (nm[1]) {
      const withPrefix = nm[1] + digitPart; // e.g. W12869
      if (!tokens.includes(withPrefix)) tokens.push(withPrefix);
    }
  }

  // 3. Standalone 4-6 digit numbers (not part of longer sequences)
  const standalone = upper.match(/\b\d{4,6}\b/g);
  if (standalone) {
    for (const s of standalone) {
      if (!tokens.includes(s)) tokens.push(s);
    }
  }

  // Filter out overly generic tokens (all zeros after prefix, or too short numeric portion)
  const filtered = tokens.filter(t => {
    const norm = normalizeAdmissionToken(t);
    // Remove tokens where the numeric part is all zeros (e.g. NEX000)
    if (norm.numericStripped === '' || /^0+$/.test(norm.numeric)) return false;
    // Remove tokens with fewer than 3 meaningful digits
    if (norm.numericStripped.length < 3) return false;
    return true;
  });

  return [...new Set(filtered)];
};

/**
 * Build a canonical (deduplicated, active-only) student map for matching.
 * Returns Map<normalizedAdmissionKey, student[]> grouped by normalized numeric ID.
 * If multiple active students share the same normalized admission number, they are all included
 * but the caller should treat that as ambiguous.
 */
export const buildCanonicalStudentMap = (students: any[]): {
  byFullId: Map<string, any[]>;
  byNumeric: Map<string, any[]>;
  activeStudents: any[];
} => {
  // Filter to active only (is_active boolean column)
  const active = students.filter(s =>
    s.admission_no &&
    (s.is_active === true || s.is_active === undefined || s.is_active === null)
  );

  const byFullId = new Map<string, any[]>();
  const byNumeric = new Map<string, any[]>();

  for (const student of active) {
    const norm = normalizeAdmissionToken(student.admission_no);

    // Full normalized ID
    const existing = byFullId.get(norm.full) || [];
    existing.push(student);
    byFullId.set(norm.full, existing);

    // Numeric stripped (for zero-padded equivalence)
    const numKey = norm.numericStripped;
    if (numKey.length >= 4) {
      const numExisting = byNumeric.get(numKey) || [];
      numExisting.push(student);
      byNumeric.set(numKey, numExisting);
    }
  }

  return { byFullId, byNumeric, activeStudents: active };
};

/**
 * Ranked matching: returns exactly matched students with confidence.
 * Matching order:
 * 1. Exact full normalized admission match (confidence 95)
 * 2. Exact numeric suffix match (confidence 90)
 * 3. Zero-padded numeric equivalence (confidence 85)
 * 4. Exact student name in text (confidence 70)
 * 5. Exact parent name in text (confidence 60)
 * 
 * If more than 1 active student matches at the same level, mark as ambiguous.
 */
export const matchStudentsFromTokens = (
  tokens: string[],
  students: any[],
  matchText: string,
  studentMap?: ReturnType<typeof buildCanonicalStudentMap>
): { matched: any[]; confidence: number; pattern: string } => {
  if (!students || students.length === 0) return { matched: [], confidence: 0, pattern: '' };

  const map = studentMap || buildCanonicalStudentMap(students);
  const normalizedTokens = tokens.map(normalizeAdmissionToken);

  let accumulatedMatches: any[] = [];
  let highestConfidence = 0;
  let highestPattern = '';

  for (const token of normalizedTokens) {
    let candidates = map.byFullId.get(token.full);
    if (candidates && candidates.length > 0) {
      accumulatedMatches.push(...candidates);
      highestConfidence = Math.max(highestConfidence, 95);
      highestPattern = 'Exact admission match';
      continue;
    }

    if (token.numeric.length >= 4) {
      candidates = map.byNumeric.get(token.numericStripped);
      if (candidates && candidates.length > 0) {
        accumulatedMatches.push(...candidates);
        highestConfidence = Math.max(highestConfidence, 90);
        if (!highestPattern) highestPattern = 'Numeric suffix match';
        continue;
      }
    }
  }

  if (accumulatedMatches.length > 0) {
    const uniqueMatches = Array.from(new Set(accumulatedMatches));
    // If it's a multiple match, slightly adjust confidence so it doesn't drop too low, but still high enough to be processed.
    return {
      matched: uniqueMatches,
      confidence: highestConfidence,
      pattern: highestPattern + (uniqueMatches.length > 1 ? ' (Multiple)' : ''),
    };
  }

  // === TIER 3: Zero-padded numeric equivalence ===
  // Already handled by numericStripped in Tier 2

  // === TIER 4: Exact student name fallback ===
  if (matchText) {
    const upperText = matchText.toUpperCase().replace(/\s+/g, ' ').trim();
    const nameMatches: any[] = [];

    for (const student of map.activeStudents) {
      const name = (student.student_name || '').toUpperCase().trim();
      if (name.length >= 5 && upperText.includes(name)) {
        nameMatches.push(student);
      }
    }

    if (nameMatches.length > 0) {
      return {
        matched: nameMatches,
        confidence: nameMatches.length === 1 ? 70 : 55,
        pattern: nameMatches.length === 1 ? 'Student name match' : 'Multiple student name matches',
      };
    }

    // === TIER 5: Parent name fallback ===
    const parentMatches: any[] = [];
    for (const student of map.activeStudents) {
      const parent = (student.parent_name || '').toUpperCase().trim();
      if (parent.length >= 5 && upperText.includes(parent)) {
        parentMatches.push(student);
      }
    }

    if (parentMatches.length > 0) {
      return {
        matched: parentMatches,
        confidence: parentMatches.length === 1 ? 60 : 45,
        pattern: parentMatches.length === 1 ? 'Parent name match' : 'Multiple parent name matches',
      };
    }
  }

  return { matched: [], confidence: 0, pattern: '' };
};

/**
 * Pre-import validation — checks the parsed transactions for issues before processing.
 */
export const validateImportData = (
  transactions: BankStatementTransaction[],
  tokens: string[][],  // tokens per transaction
  matchResults: { matched: any[]; confidence: number }[],
): ImportValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const duplicateRows: number[] = [];
  const invalidDateRows: number[] = [];
  const zeroAmountRows: number[] = [];
  const noIdRows: number[] = [];
  const ambiguousMatchRows: number[] = [];

  // Check for duplicate rows (same date + same amount + same description)
  const seen = new Map<string, number>();
  transactions.forEach((txn, i) => {
    const key = `${txn.txnDate.toISOString().slice(0, 10)}_${txn.credit || txn.debit}_${txn.description.slice(0, 30)}`;
    if (seen.has(key)) {
      duplicateRows.push(i);
      if (!duplicateRows.includes(seen.get(key)!)) duplicateRows.push(seen.get(key)!);
    }
    seen.set(key, i);
  });

  transactions.forEach((txn, i) => {
    // Invalid date
    if (isNaN(txn.txnDate.getTime()) || txn.txnDate.getFullYear() < 2020 || txn.txnDate.getFullYear() > 2030) {
      invalidDateRows.push(i);
    }
    // Zero amount
    const amt = txn.credit > 0 ? txn.credit : txn.debit;
    if (amt <= 0) {
      zeroAmountRows.push(i);
    }
    // No extractable ID
    if (tokens[i] && tokens[i].length === 0) {
      noIdRows.push(i);
    }
    // Ambiguous match (>3 candidates)
    if (matchResults[i] && matchResults[i].matched.length > 3) {
      ambiguousMatchRows.push(i);
    }
  });

  if (invalidDateRows.length > 0) warnings.push(`${invalidDateRows.length} rows have invalid/suspicious dates`);
  if (zeroAmountRows.length > 0) warnings.push(`${zeroAmountRows.length} rows have zero or negative amounts`);
  if (duplicateRows.length > 0) warnings.push(`${new Set(duplicateRows).size} possible duplicate rows detected`);
  if (noIdRows.length > 0) warnings.push(`${noIdRows.length} rows have no extractable admission number`);
  if (ambiguousMatchRows.length > 0) warnings.push(`${ambiguousMatchRows.length} rows match more than 3 students (sent to review)`);

  // Critical errors that should block
  if (transactions.length === 0) errors.push('No transactions to import');

  return {
    errors,
    warnings,
    duplicateRows: [...new Set(duplicateRows)],
    invalidDateRows,
    zeroAmountRows,
    noIdRows,
    ambiguousMatchRows,
    canProceed: errors.length === 0,
  };
};

// =========== HELPERS ===========
const parseDate = (dateValue: any): Date => {
  if (!dateValue) return new Date(NaN); // Return invalid date instead of today
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
  
  // MM/DD/YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1]);
    const day = parseInt(mdyMatch[2]);
    const year = parseInt(mdyMatch[3]);
    // If month > 12, it's likely DD/MM/YYYY already handled above
    if (month <= 12) {
      return new Date(year, month - 1, day);
    }
  }
  
  // Try native parse
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
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
  str = str.replace(/^[A-Za-z$£€¥]+\.?\s*/g, '');
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/,/g, '');
  } else if (str.includes(',') && !str.includes('.')) {
    if (/,\d{2}$/.test(str)) {
      str = str.replace(/,(?=\d{2}$)/, '.');
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  str = str.replace(/[^0-9.\-]/g, '');
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }
  const parsed = parseFloat(str);
  if (!isFinite(parsed) || isNaN(parsed)) return 0;
  const result = Math.abs(parsed);
  return result <= MAX_AMOUNT ? result : 0;
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
    if (normalized.length <= 3) continue;
    const partial = headers.find(h => normalizeHeader(h).includes(normalized) || normalized.includes(normalizeHeader(h)));
    if (partial) return partial;
  }
  return null;
};

// =========== DEBIT/CREDIT EXTRACTOR ===========
const extractDebitCredit = (row: any, headers: string[], debitCol: string | null, creditCol: string | null): { debit: number; credit: number } => {
  let debit = 0;
  let credit = 0;

  // Detect merged columns (e.g., "Withdrawal/Deposit" matched by both)
  if (debitCol && creditCol && debitCol === creditCol) {
    debitCol = null;
    creditCol = null;
  }

  if (debitCol || creditCol) {
    if (debitCol) debit = cleanAmount(row[debitCol]);
    if (creditCol) credit = cleanAmount(row[creditCol]);
  } else {
    // Single column Amount + Type (Cr/Dr) fallback
    const amountCol = findHeader(headers, 'Amount', 'Transaction Amount', 'Debit/Credit', 'Withdrawal/Deposit', 'Amount(LKR)');
    const typeCol = findHeader(headers, 'Type', 'Transaction Type', 'Dr/Cr', 'Cr/Dr');

    if (amountCol) {
      const amount = cleanAmount(row[amountCol]);
      if (typeCol && row[typeCol]) {
        const typeVal = String(row[typeCol]).toLowerCase().trim();
        // Identify debit keywords
        if (typeVal === 'dr' || typeVal.includes('debit') || typeVal.includes('withdrawal') || typeVal.includes('payment')) {
          debit = amount;
        } else {
          // Assume credit if it says cr, deposit, etc.
          credit = amount;
        }
      } else {
        // Fallback: check if the original amount string has a minus sign
        const rawAmt = String(row[amountCol]).trim();
        if (rawAmt.startsWith('-') || rawAmt.includes('DR')) {
          debit = amount;
        } else {
          credit = amount;
        }
      }
    }
  }

  // GUARD: Ensure mutual exclusivity — a single transaction cannot be both a debit AND a credit.
  // If both are non-zero, it's a parsing error (e.g., merged column or duplicate data).
  if (debit > 0 && credit > 0) {
    if (debit > credit) {
      credit = 0;   // Larger value wins as debit (withdrawal)
    } else {
      debit = 0;    // Larger or equal value wins as credit (deposit)
    }
  }

  return { debit, credit };
};

// =========== BANK FORMAT PARSERS ===========

// --- COMMERCIAL BANK OF CEYLON ---
const commercialBankFormat: BankFormat = {
  id: 'commercial_bank',
  name: 'Commercial Bank of Ceylon',
  detect: (headers: string[], rows: any[]) => {
    const normalized = headers.map(normalizeHeader);
    const hasDate = normalized.some(h => h.includes('date') || h.includes('transactiondate'));
    const hasDebitCredit = normalized.some(h => h.includes('debit') || h.includes('withdrawal')) &&
                          normalized.some(h => h.includes('credit') || h.includes('deposit'));
    const hasBalance = normalized.some(h => h.includes('balance') || h.includes('runningbalance'));
    const rawStr = JSON.stringify(rows.slice(0, 5)).toLowerCase();
    const isCommercial = rawStr.includes('commercial') || rawStr.includes('combank');
    return (hasDate && hasDebitCredit && hasBalance) || isCommercial;
  },
  parse: (rows: any[], headers: string[]) => {
    const dateCol = findHeader(headers, 'Date', 'Transaction Date', 'Txn Date', 'Value Date');
    const descCol = findHeader(headers, 'Description', 'Narration', 'Particulars', 'Details');
    const chequeCol = findHeader(headers, 'Cheque No', 'Chq No', 'Cheque Number', 'Instrument');
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance', 'Closing Balance');
    const refCol = findHeader(headers, 'Reference', 'Ref No', 'Trans Ref');

    const debitCol = findHeader(headers, 'Debit', 'Withdrawal', 'Dr', 'Debit Amount');
    const creditCol = findHeader(headers, 'Credit', 'Deposit', 'Cr', 'Credit Amount');

    return rows.map((row, idx) => {
      const { debit, credit } = extractDebitCredit(row, headers, debitCol, creditCol);
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
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance', 'Available Balance');
    const refCol = findHeader(headers, 'Reference', 'Ref', 'Trans Ref', 'Instrument No');
    const chequeCol = findHeader(headers, 'Cheque No', 'Chq No', 'Instrument');

    const debitCol = findHeader(headers, 'Debit', 'Dr Amount', 'Withdrawal');
    const creditCol = findHeader(headers, 'Credit', 'Cr Amount', 'Deposit');

    return rows.map((row, idx) => {
      const { debit, credit } = extractDebitCredit(row, headers, debitCol, creditCol);
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
  parse: (rows, headers) => commercialBankFormat.parse(rows, headers),
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
  detect: () => true,
  parse: (rows: any[], headers: string[]) => {
    const dateCol = findHeader(headers, 'Date', 'Transaction Date', 'Txn Date', 'Value Date', 'Trans Date');
    const descCol = findHeader(headers, 'Description', 'Narration', 'Particulars', 'Details', 'Remarks', 'Transaction Details');
    const refCol = findHeader(headers, 'Reference', 'Ref No', 'Trans Ref', 'Reference No', 'Tran ID', 'Tran Serial');
    const chequeCol = findHeader(headers, 'Cheque No', 'Chq No', 'Cheque Number', 'Instrument');
    const balanceCol = findHeader(headers, 'Balance', 'Running Balance', 'Closing Balance', 'Available Balance');

    const debitCol = findHeader(headers, 'Debit', 'Withdrawal', 'Dr', 'Debit Amount');
    const creditCol = findHeader(headers, 'Credit', 'Deposit', 'Cr', 'Credit Amount');

    return rows.map((row, idx) => {
      const { debit, credit } = extractDebitCredit(row, headers, debitCol, creditCol);

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

  let format: BankFormat;
  if (forceBankId) {
    format = BANK_FORMATS.find(f => f.id === forceBankId) || genericFormat;
  } else {
    format = BANK_FORMATS.find(f => f.detect(headers, jsonData)) || genericFormat;
    if (format.id === 'generic') {
      warnings.push('Could not auto-detect bank format, using generic parser');
    }
  }

  const transactions = format.parse(jsonData, headers);
  const meta = format.extractMeta(jsonData, headers);

  const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);

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
  if (!description) return { admissionNumbers: [], confidence: 0, matchedPattern: '' };
  
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

  // Use token extraction
  if (extractedIds.length === 0) {
    const tokens = extractAdmissionTokens(description, prefixes);
    if (tokens.length > 0) {
      extractedIds.push(...tokens);
      confidence = 90;
      matchedPattern = 'Token extraction';
    }
  }

  // Legacy prefix-based fallback
  if (extractedIds.length === 0) {
    for (const prefix of prefixes) {
      const pattern1 = new RegExp(`${prefix}\\s*[-_]?\\s*(\\d{4,6})`, 'gi');
      const matches1 = Array.from(normalized.matchAll(pattern1));
      if (matches1.length > 0) {
        matches1.forEach(match => {
          const id = `${prefix}${match[1]}`;
          if (!extractedIds.includes(id)) extractedIds.push(id);
        });
        confidence = 90;
        matchedPattern = `Prefix: ${prefix}`;
      }
    }
  }

  // Fallback - standalone numbers
  if (extractedIds.length === 0) {
    const standaloneNumbers = normalized.match(/\b\d{4,6}\b/g);
    if (standaloneNumbers) {
      extractedIds.push(...standaloneNumbers);
      confidence = 50;
      matchedPattern = 'Standalone number (low confidence)';
    }
  }

  return {
    admissionNumbers: [...new Set(extractedIds)],
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

/**
 * Build match text based on user's "Match From" selection and the transaction data.
 */
export const buildMatchText = (
  txn: BankStatementTransaction,
  matchFromCol?: string
): string => {
  // Default to combined
  if (!matchFromCol || matchFromCol === 'combined') {
    const parts = [txn.description, txn.reference];
    if (txn.rawRow) {
      for (const key of Object.keys(txn.rawRow)) {
        const lk = key.toLowerCase();
        if (lk.includes('tran') || lk.includes('ref') || lk.includes('serial')) {
          const val = String(txn.rawRow[key] || '').trim();
          if (val && !parts.includes(val)) parts.push(val);
        }
      }
    }
    return parts.filter(Boolean).join(' ');
  }

  if (matchFromCol === 'description') return txn.description || '';
  if (matchFromCol === 'reference') return [txn.reference, ...(txn.rawRow ? Object.keys(txn.rawRow).filter(k => k.toLowerCase().includes('tran') || k.toLowerCase().includes('serial')).map(k => String(txn.rawRow![k] || '')) : [])].filter(Boolean).join(' ');

  // Specific column via "col:ColumnName"
  if (matchFromCol.startsWith('col:')) {
    const colName = matchFromCol.slice(4);
    return String(txn.rawRow?.[colName] || '').trim();
  }

  return txn.description || '';
};

// =========== COLUMN MAPPING TYPES & PARSER ===========
export interface ColumnMapping {
  dateCol: string;
  descriptionCol: string;
  amountCol: string;
  typeCol?: string;
  referenceCol?: string;
  balanceCol?: string;
  matchFromCol?: string;
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
      credit = amount;
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
