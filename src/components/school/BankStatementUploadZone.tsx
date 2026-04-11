import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Building2, ArrowRight, Eye, AlertTriangle } from "lucide-react";
import {
  parseBankStatement, detectBankFormat, BANK_FORMATS,
  extractAdmissionNumbers, extractAdmissionTokens, matchStudentsFromTokens,
  buildCanonicalStudentMap, buildMatchText, validateImportData,
  getFileHeaders, parseBankStatementWithMapping,
  type ParseResult, type ColumnMapping, type ImportValidationResult,
} from "@/utils/bank-statement-processor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface BankStatementUploadZoneProps {
  branchId: string;
  onUploadComplete: (importId: string, stats: any) => void;
}

const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Step = "upload" | "column_mapping" | "preview" | "validation" | "processing" | "done";

export function BankStatementUploadZone({ branchId, onUploadComplete }: BankStatementUploadZoneProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [bankId, setBankId] = useState("auto");
  const [detectedBank, setDetectedBank] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState({ total: 0, autoMatched: 0, needsReview: 0, unmatched: 0 });
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ dateCol: '', descriptionCol: '', amountCol: '' });
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setBankId("auto");
    setDetectedBank("");
    setParseResult(null);
    setProcessing(false);
    setProgress(0);
    setImportStats({ total: 0, autoMatched: 0, needsReview: 0, unmatched: 0 });
    setFileHeaders([]);
    setSampleRows([]);
    setColumnMapping({ dateCol: '', descriptionCol: '', amountCol: '' });
    setValidationResult(null);
  };

  // ===== STEP 1: FILE SELECT + AUTO-DETECT =====
  const handleFileSelect = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    try {
      const detection = await detectBankFormat(selectedFile);
      setDetectedBank(detection.bankName);
      if (detection.bankId !== "generic") setBankId(detection.bankId);
    } catch {
      setDetectedBank("Unknown");
    }
  }, []);

  // ===== STEP 2: PARSE & PREVIEW =====
  const handleParse = useCallback(async () => {
    if (!file) return;
    try {
      const forcedBank = bankId === "auto" ? undefined : bankId;
      const result = await parseBankStatement(file, forcedBank);
      
      if (result.transactions.length === 0) {
        const { headers, sampleRows: samples } = await getFileHeaders(file);
        setFileHeaders(headers);
        setSampleRows(samples);
        const guess = (candidates: string[]) => {
          for (const c of candidates) {
            const found = headers.find(h => h.toLowerCase().includes(c.toLowerCase()));
            if (found) return found;
          }
          return '';
        };
        setColumnMapping({
          dateCol: guess(['date', 'txn date', 'trans date']),
          descriptionCol: guess(['description', 'narration', 'particulars', 'details']),
          amountCol: guess(['amount']),
          typeCol: guess(['cr/dr', 'dr/cr', 'type']),
          referenceCol: guess(['reference', 'ref', 'tran id']),
          balanceCol: guess(['balance']),
          matchFromCol: 'combined',
        });
        setStep("column_mapping");
        toast({
          title: "Auto-detection found 0 transactions",
          description: "Please map columns manually from your file",
        });
        return;
      }

      setParseResult(result);
      setStep("preview");

      if (result.parseWarnings.length > 0) {
        toast({
          title: "Parse Warnings",
          description: result.parseWarnings.join("; "),
        });
      }
    } catch (err: any) {
      toast({
        title: "Parse Failed",
        description: err.message || "Failed to parse bank statement",
        variant: "destructive",
      });
    }
  }, [file, bankId, toast]);

  const handleMappingParse = useCallback(async () => {
    if (!file || !columnMapping.dateCol || !columnMapping.descriptionCol || !columnMapping.amountCol) {
      toast({ title: "Missing columns", description: "Please map Date, Description, and Amount columns", variant: "destructive" });
      return;
    }
    try {
      const result = await parseBankStatementWithMapping(file, columnMapping);
      setParseResult(result);
      setStep("preview");
      if (result.transactions.length === 0) {
        toast({ title: "No Transactions Found", description: "No valid transactions with given column mapping", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Parse Failed", description: err.message || "Failed to parse", variant: "destructive" });
    }
  }, [file, columnMapping, toast]);

  // ===== STEP 3: PROCESS & MATCH =====
  const handleProcess = useCallback(async () => {
    if (!parseResult || parseResult.transactions.length === 0) return;

    try {
      setProcessing(true);
      setStep("processing");
      setProgress(10);

      // Fetch branch settings
      const { data: fetchedSettings } = await supabase
        .from('school_payment_import_settings')
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle();

      let settings = fetchedSettings;

      if (!settings) {
        const { data: newSettings, error: createError } = await supabase
          .from('school_payment_import_settings')
          .insert([{
            branch_id: branchId,
            min_confidence_threshold: 80,
            auto_approve_high_confidence: true,
            admission_prefixes: ['N', 'LNU', 'LKA', 'TKA', 'TN', 'R0', 'Sta'],
            default_payment_method: 'Bank Transfer',
            auto_split_siblings: true,
            enable_pattern_learning: true,
          }])
          .select()
          .single();

        if (createError) {
          if (createError.code === '23505') {
            const { data: refetched } = await supabase
              .from('school_payment_import_settings')
              .select('*')
              .eq('branch_id', branchId)
              .maybeSingle();
            settings = refetched;
          }
          
          if (!settings) {
            toast({
              title: "Settings Error",
              description: `Could not create default settings: ${createError.message}`,
              variant: "destructive",
            });
            setStep("preview");
            setProcessing(false);
            return;
          }
        } else {
          settings = newSettings;
        }
      }

      setProgress(20);

      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('school_payment_imports')
        .insert([{
          branch_id: branchId,
          file_name: file?.name || "bank_statement",
          total_transactions: parseResult.transactions.length,
          status: 'processing',
        }])
        .select()
        .single();

      if (importError || !importRecord) {
        throw new Error('Failed to create import record');
      }

      setProgress(35);

      // *** KEY FIX: Fetch ONLY ACTIVE students for this branch ***
      const { data: allStudents } = await (supabase as any)
        .from('school_students')
        .select('*')
        .eq('branch_id', branchId)
        .in('status', ['active', 'Active']);

      const students = allStudents || [];

      setProgress(45);

      // Build canonical student map (deduped by normalized admission number)
      const studentMap = buildCanonicalStudentMap(students);

      setProgress(50);

      // Fetch learned patterns for this branch
      const { data: learnedPatterns } = await supabase
        .from('school_payment_pattern_history')
        .select('*')
        .eq('branch_id', branchId);

      const patternMap = new Map<string, string>();
      (learnedPatterns || []).forEach((p: any) => {
        if (p.original_description && p.matched_admission_no) {
          patternMap.set(p.original_description.toUpperCase().trim(), p.matched_admission_no);
        }
      });

      // Auto-detect admission prefixes
      const configuredPrefixes = Array.isArray(settings.admission_prefixes) 
        ? settings.admission_prefixes 
        : (typeof settings.admission_prefixes === 'string' 
          ? JSON.parse(settings.admission_prefixes) 
          : ['N', 'LNU']);

      const detectedPrefixes = new Set<string>();
      students.forEach((s: any) => {
        const match = s.admission_no?.match(/^([A-Za-z]+)/);
        if (match) detectedPrefixes.add(match[1].toUpperCase());
      });
      const mergedPrefixes = [...new Set([...configuredPrefixes.map((p: string) => p.toUpperCase()), ...detectedPrefixes])];

      // Get the matchFromCol setting
      const matchFromCol = columnMapping.matchFromCol || 'combined';

      // Process each transaction
      const importItems = [];
      let autoMatched = 0;
      let needsReview = 0;
      let unmatched = 0;

      const allTokensPerTxn: string[][] = [];
      const allMatchResults: { matched: any[]; confidence: number }[] = [];

      for (const txn of parseResult.transactions) {
        const prefixes = mergedPrefixes;
        
        const patterns = Array.isArray(settings.custom_patterns)
          ? settings.custom_patterns
          : (typeof settings.custom_patterns === 'string'
            ? JSON.parse(settings.custom_patterns)
            : []);
        
        // *** KEY FIX: Use matchFromCol to control match source ***
        const matchText = buildMatchText(txn, matchFromCol);

        // Check learned patterns first
        let learnedStudentMatch: any[] = [];
        const descKey = txn.description.toUpperCase().trim();
        const learnedAdmission = patternMap.get(descKey);
        if (learnedAdmission) {
          const learnedStudent = studentMap.activeStudents.find(s =>
            s.admission_no && s.admission_no.toUpperCase().replace(/[\s\-_./]+/g, '') === learnedAdmission.toUpperCase().replace(/[\s\-_./]+/g, '')
          );
          if (learnedStudent) {
            learnedStudentMatch = [learnedStudent];
          }
        }

        // Extract admission tokens from the correct match text
        const tokens = extractAdmissionTokens(matchText, prefixes);
        
        // Also run legacy extraction
        const extraction = extractAdmissionNumbers(matchText, prefixes, patterns);
        
        // Merge tokens (deduped)
        const allTokens = [...new Set([...tokens, ...extraction.admissionNumbers])];
        allTokensPerTxn.push(allTokens);

        // *** KEY FIX: Use ranked matching with canonical student map ***
        let matchResult: { matched: any[]; confidence: number; pattern: string };

        if (learnedStudentMatch.length === 1) {
          matchResult = { matched: learnedStudentMatch, confidence: 95, pattern: 'Learned pattern match' };
        } else {
          matchResult = matchStudentsFromTokens(allTokens, students, matchText, studentMap);
        }

        allMatchResults.push(matchResult);

        const uniqueMatchedStudents = matchResult.matched;
        const effectiveConfidence = Math.max(extraction.confidence, matchResult.confidence);

        // Classification — stricter rules
        let matchStatus = 'unmatched';
        if (uniqueMatchedStudents.length === 1 && effectiveConfidence >= settings.min_confidence_threshold) {
          matchStatus = 'auto_matched';
          autoMatched++;
        } else if (uniqueMatchedStudents.length > 0 && uniqueMatchedStudents.length <= 5) {
          // Only mark as partial_match if reasonable number of candidates
          matchStatus = 'partial_match';
          needsReview++;
        } else if (uniqueMatchedStudents.length > 5) {
          // Too many candidates = essentially unmatched (ambiguous)
          matchStatus = 'unmatched';
          unmatched++;
        } else {
          unmatched++;
        }

        const amount = txn.credit > 0 ? txn.credit : txn.debit;

        importItems.push({
          import_id: importRecord.id,
          txn_date: isNaN(txn.txnDate.getTime()) ? format(new Date(), "yyyy-MM-dd") : format(txn.txnDate, "yyyy-MM-dd"),
          description: txn.description,
          amount: amount,
          extracted_ids: allTokens,
          matched_student_ids: (uniqueMatchedStudents as any[]).map(s => s.id),
          match_status: matchStatus,
          match_confidence: effectiveConfidence,
          suggested_students: (uniqueMatchedStudents as any[]).slice(0, 5).map(s => ({
            id: s.id,
            admission_no: s.admission_no,
            student_name: s.student_name,
          })),
        });
      }

      // Run validation
      const validation = validateImportData(parseResult.transactions, allTokensPerTxn, allMatchResults);
      setValidationResult(validation);

      setProgress(80);

      // Insert all import items
      const { error: itemsError } = await supabase
        .from('school_payment_import_items')
        .insert(importItems);

      if (itemsError) {
        throw new Error('Failed to save import items: ' + itemsError.message);
      }

      // Update import record with stats
      await supabase
        .from('school_payment_imports')
        .update({
          auto_matched_count: autoMatched,
          manual_matched_count: 0,
          unmatched_count: unmatched + needsReview,
          status: 'completed',
        })
        .eq('id', importRecord.id);

      setProgress(100);
      setStep("done");
      setImportStats({ total: parseResult.transactions.length, autoMatched, needsReview, unmatched });

      toast({
        title: "Import Complete ✅",
        description: `Processed ${parseResult.transactions.length} transactions. ${autoMatched} auto-matched, ${needsReview} need review, ${unmatched} unmatched.`,
      });

      onUploadComplete(importRecord.id, {
        total: parseResult.transactions.length,
        autoMatched,
        needsReview,
        unmatched,
      });

    } catch (error: any) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process bank statement",
        variant: "destructive",
      });
      setStep("preview");
    } finally {
      setProcessing(false);
    }
  }, [parseResult, branchId, file, toast, onUploadComplete, columnMapping]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: processing || step !== "upload",
  });

  return (
    <Card>
      <CardContent className="p-6">
        {/* ===== STEP INDICATOR ===== */}
        <div className="flex items-center gap-2 mb-4">
          {["Upload", "Map Columns", "Preview", "Process"].map((label, idx) => {
            const stepNum = idx + 1;
            const stepOrder: Record<string, number> = { upload: 1, column_mapping: 2, preview: 3, validation: 3, processing: 4, done: 4 };
            const currentStepNum = stepOrder[step] || 1;
            const isActive = stepNum <= currentStepNum;
            return (
              <div key={label} className="flex items-center gap-2">
                {idx > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                <Badge variant={isActive ? "default" : "outline"} className={`text-xs ${isActive ? "bg-blue-600" : ""}`}>
                  {stepNum}. {label}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* ===== STEP: UPLOAD ===== */}
        {step === "upload" && (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {file ? file.name : isDragActive ? 'Drop the file here' : 'Drag & drop bank statement here'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excel (.xlsx, .xls) or CSV (.csv) — Commercial Bank, Sampath, HNB, BOC, People's Bank, or generic
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm">Select File</Button>
              </div>
            </div>

            {file && (
              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Bank Format</label>
                  <Select value={bankId} onValueChange={setBankId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      {BANK_FORMATS.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {detectedBank && (
                  <div className="flex items-center gap-2 mt-5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs">Detected: <strong>{detectedBank}</strong></span>
                  </div>
                )}
                <Button className="mt-5" size="sm" onClick={handleParse} disabled={!file}>
                  <Eye className="w-4 h-4 mr-1" /> Parse & Preview
                </Button>
              </div>
            )}

            <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-300">
                  <p className="font-semibold mb-1">Supports multiple bank formats:</p>
                  <p>Commercial Bank, Sampath Bank, HNB, BOC, People's Bank, or any generic Excel/CSV with Date, Description, Amount columns.</p>
                  <p className="mt-1">Matches <strong>active students only</strong> using admission numbers from selected columns.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== STEP: COLUMN MAPPING ===== */}
        {step === "column_mapping" && fileHeaders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span className="text-xs text-yellow-700 dark:text-yellow-300">
                Auto-detection couldn't parse transactions. Map your file columns below.
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'dateCol' as const, label: 'Date Column *', required: true },
                { key: 'descriptionCol' as const, label: 'Description Column *', required: true },
                { key: 'amountCol' as const, label: 'Amount Column *', required: true },
                { key: 'typeCol' as const, label: 'Type (Cr/Dr) Column', required: false },
                { key: 'referenceCol' as const, label: 'Reference Column', required: false },
                { key: 'balanceCol' as const, label: 'Balance Column', required: false },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
                  <Select
                    value={columnMapping[key] || '__none__'}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, [key]: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={required ? 'Select column' : 'Optional'} />
                    </SelectTrigger>
                    <SelectContent>
                      {!required && <SelectItem value="__none__">— None —</SelectItem>}
                      {fileHeaders.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Match From selector */}
            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Match Students From</label>
              <Select
                value={columnMapping.matchFromCol || 'combined'}
                onValueChange={(v) => setColumnMapping(prev => ({ ...prev, matchFromCol: v }))}
              >
                <SelectTrigger className="h-9 text-xs w-full sm:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combined">Combined (Description + Reference + Tran ID)</SelectItem>
                  <SelectItem value="description">Description only</SelectItem>
                  <SelectItem value="reference">Reference / Tran ID only</SelectItem>
                  {fileHeaders.map(h => (
                    <SelectItem key={`match_${h}`} value={`col:${h}`}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Choose which column(s) contain admission numbers or student names for matching</p>
            </div>

            {/* Sample Data Preview */}
            {sampleRows.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-[180px]">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {fileHeaders.map(h => (
                        <th key={h} className="p-2 text-left whitespace-nowrap font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, i) => (
                      <tr key={i} className="border-b">
                        {fileHeaders.map(h => (
                          <td key={h} className="p-2 whitespace-nowrap">{String(row[h] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={resetState}>← Back</Button>
              <Button
                size="sm"
                onClick={handleMappingParse}
                disabled={!columnMapping.dateCol || !columnMapping.descriptionCol || !columnMapping.amountCol}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Parse with Mapping
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && parseResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Bank</p>
                <p className="font-bold text-xs">{parseResult.bankName}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-bold text-lg">{parseResult.transactions.length}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Debits</p>
                <p className="font-bold text-xs text-red-600">LKR {fmt(parseResult.totalDebits)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Credits</p>
                <p className="font-bold text-xs text-green-600">LKR {fmt(parseResult.totalCredits)}</p>
              </div>
            </div>

            {parseResult.parseWarnings.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className="text-xs text-yellow-700">{parseResult.parseWarnings.join("; ")}</span>
              </div>
            )}

            <div className="max-h-[300px] overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.transactions.slice(0, 100).map((t, i) => (
                    <tr key={i} className="border-b hover:bg-accent/30">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 whitespace-nowrap">
                        {isNaN(t.txnDate.getTime()) ? (
                          <span className="text-red-500">Invalid date</span>
                        ) : format(t.txnDate, "dd/MM/yyyy")}
                      </td>
                      <td className="p-2 max-w-[400px] truncate" title={t.description}>{t.description}</td>
                      <td className="p-2 text-right font-mono text-green-600">
                        LKR {fmt(t.credit > 0 ? t.credit : t.debit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.transactions.length > 100 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  Showing 100 of {parseResult.transactions.length} transactions
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={resetState}>← Back to Upload</Button>
              <Button size="sm" onClick={handleProcess} disabled={parseResult.transactions.length === 0}>
                <Upload className="w-4 h-4 mr-1" />
                Process & Match {parseResult.transactions.length} Transactions
              </Button>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-green-900 dark:text-green-300">
                  <p className="font-semibold">Improved Matching:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Only matches against <strong>active students</strong> in this branch</li>
                    <li>Ranked matching: Exact ID → Numeric suffix → Name fallback</li>
                    <li>Learned patterns from previous manual matches applied automatically</li>
                    <li>Ambiguous matches (5+ candidates) sent to review, not auto-confirmed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP: PROCESSING ===== */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-10 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="font-semibold text-sm">Processing & Matching Transactions...</p>
            <p className="text-xs text-muted-foreground">Matching against active students only • Using ranked matching</p>
            <div className="w-full max-w-md">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center mt-1">{progress}% complete</p>
            </div>
          </div>
        )}

        {/* ===== STEP: DONE ===== */}
        {step === "done" && (
          <div className="flex flex-col items-center py-10 gap-4">
            <CheckCircle2 className="w-14 h-14 text-green-600" />
            <p className="text-lg font-bold">Import Complete!</p>
            <div className="grid grid-cols-4 gap-4 w-full max-w-md">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-lg">{importStats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Auto-Matched</p>
                <p className="font-bold text-lg text-green-600">{importStats.autoMatched}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Need Review</p>
                <p className="font-bold text-lg text-yellow-600">{importStats.needsReview}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Unmatched</p>
                <p className="font-bold text-lg text-red-600">{importStats.unmatched}</p>
              </div>
            </div>

            {/* Validation warnings */}
            {validationResult && validationResult.warnings.length > 0 && (
              <div className="w-full max-w-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold mb-1">Data Quality Notes:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {validationResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={resetState}>Import Another File</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
