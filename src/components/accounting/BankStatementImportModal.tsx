import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, ArrowRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import { parseBankStatement, detectBankFormat, BANK_FORMATS, type ParseResult, type BankStatementTransaction } from "@/utils/bank-statement-processor";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccountId: string | null;
  onImportComplete?: () => void;
}

const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Step = "upload" | "preview" | "importing" | "done";

const BankStatementImportModal = ({ open, onOpenChange, bankAccountId, onImportComplete }: Props) => {
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [bankId, setBankId] = useState<string>("auto");
  const [detectedBank, setDetectedBank] = useState<string>("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setBankId("auto");
    setDetectedBank("");
    setParseResult(null);
    setImporting(false);
    setImportCount(0);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    // Auto-detect bank
    try {
      const detection = await detectBankFormat(selectedFile);
      setDetectedBank(detection.bankName);
      if (detection.bankId !== "generic") {
        setBankId(detection.bankId);
      }
    } catch {
      setDetectedBank("Unknown");
    }
  }, []);

  const handleParse = useCallback(async () => {
    if (!file) return;
    try {
      const forcedBank = bankId === "auto" ? undefined : bankId;
      const result = await parseBankStatement(file, forcedBank);
      setParseResult(result);
      setStep("preview");

      if (result.parseWarnings.length > 0) {
        result.parseWarnings.forEach(w => toast.warning(w));
      }
    } catch (err: any) {
      toast.error(`Parse failed: ${err.message}`);
    }
  }, [file, bankId]);

  const handleImport = useCallback(async () => {
    if (!parseResult || !bankAccountId) return;
    setImporting(true);
    setStep("importing");
    
    let imported = 0;
    const batchSize = 50;
    const txns = parseResult.transactions;

    try {
      for (let i = 0; i < txns.length; i += batchSize) {
        const batch = txns.slice(i, i + batchSize);
        const records = batch.map(t => ({
          bank_account_id: bankAccountId,
          transaction_date: format(t.txnDate, "yyyy-MM-dd"),
          description: t.description,
          reference: t.reference || null,
          debit_amount: t.debit || 0,
          credit_amount: t.credit || 0,
          transaction_type: t.type === "payment" ? "payment" : "deposit",
          cheque_number: t.chequeNumber || null,
          source_type: `statement_import_${parseResult.bankName.replace(/\s+/g, '_').toLowerCase()}`,
          is_reconciled: false,
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
        }));

        const { error } = await (supabase as any)
          .from("bank_transactions")
          .insert(records);

        if (error) {
          console.error("Import batch error:", error);
          toast.error(`Import error at row ${i + 2}: ${error.message}`);
          break;
        }
        imported += batch.length;
        setImportCount(imported);
      }

      setStep("done");
      toast.success(`Successfully imported ${imported} transactions`);
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }, [parseResult, bankAccountId, effectiveCompanyId, businessUnitCode]);

  const handleClose = useCallback(() => {
    if (step === "done" && onImportComplete) {
      onImportComplete();
    }
    resetState();
    onOpenChange(false);
  }, [step, onImportComplete, resetState, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Import Bank Statement
          </DialogTitle>
          <DialogDescription>
            Upload your bank statement file (Excel/CSV). Supports Commercial Bank, Sampath, HNB, BOC, People's Bank, and generic formats.
          </DialogDescription>
        </DialogHeader>

        {/* ===== STEP INDICATOR ===== */}
        <div className="flex items-center gap-2 px-1 py-2">
          {["Upload", "Preview", "Import"].map((label, idx) => {
            const stepNum = idx + 1;
            const currentStepNum = step === "upload" ? 1 : step === "preview" ? 2 : 3;
            const isActive = stepNum <= currentStepNum;
            return (
              <div key={label} className="flex items-center gap-2">
                {idx > 0 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-blue-600" : ""}>
                  {stepNum}. {label}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* ===== STEP: UPLOAD ===== */}
        {step === "upload" && (
          <div className="flex flex-col gap-4 py-4">
            {/* File Upload */}
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById("stmt-file-input")?.click()}>
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-sm">{file ? file.name : "Click to select bank statement file"}</p>
              <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx, .xls) or CSV (.csv)</p>
              <input
                id="stmt-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Bank Format Selection */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Bank Format</label>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger>
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
                  <span className="text-sm">Detected: <strong>{detectedBank}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP: PREVIEW ===== */}
        {step === "preview" && parseResult && (
          <div className="flex flex-col gap-3 overflow-hidden flex-1">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Bank</p>
                <p className="font-bold text-sm">{parseResult.bankName}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-bold text-lg">{parseResult.transactions.length}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Debits</p>
                <p className="font-bold text-sm text-red-600">LKR {fmt(parseResult.totalDebits)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Credits</p>
                <p className="font-bold text-sm text-green-600">LKR {fmt(parseResult.totalCredits)}</p>
              </div>
            </div>

            {/* Warnings */}
            {parseResult.parseWarnings.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className="text-xs text-yellow-700 dark:text-yellow-400">{parseResult.parseWarnings.join("; ")}</span>
              </div>
            )}

            {/* Transaction Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.transactions.slice(0, 200).map((t, i) => (
                    <tr key={i} className={`border-b hover:bg-accent/30 ${t.type === 'deposit' ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 whitespace-nowrap">{format(t.txnDate, "dd/MM/yyyy")}</td>
                      <td className="p-2 max-w-[300px] truncate" title={t.description}>{t.description}</td>
                      <td className="p-2 font-mono">{t.reference || "—"}</td>
                      <td className="p-2 text-right text-red-600">{t.debit > 0 ? fmt(t.debit) : "—"}</td>
                      <td className="p-2 text-right text-green-600">{t.credit > 0 ? fmt(t.credit) : "—"}</td>
                      <td className="p-2 text-right font-mono">{t.balance > 0 ? fmt(t.balance) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.transactions.length > 200 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  Showing 200 of {parseResult.transactions.length} transactions
                </p>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP: IMPORTING ===== */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="font-semibold">Importing transactions...</p>
            <p className="text-sm text-muted-foreground">
              {importCount} of {parseResult?.transactions.length || 0} imported
            </p>
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${parseResult ? (importCount / parseResult.transactions.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ===== STEP: DONE ===== */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
            <p className="text-xl font-bold">Import Complete!</p>
            <p className="text-sm text-muted-foreground">
              {importCount} transactions imported from {parseResult?.bankName}
            </p>
            <p className="text-xs text-muted-foreground">
              The imported transactions are now available in the reconciliation view for clearing.
            </p>
          </div>
        )}

        {/* ===== FOOTER ===== */}
        <DialogFooter className="mt-4">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!file}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Parse & Preview
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleImport} disabled={!parseResult || parseResult.transactions.length === 0 || !bankAccountId}>
                <Upload className="w-4 h-4 mr-2" />
                Import {parseResult?.transactions.length || 0} Transactions
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Done — Go to Reconciliation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { BankStatementImportModal };
