import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ParsedRow {
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
  glCode: string;
}

interface ChartOfAccountsUploadProps {
  onUploadComplete: () => void;
  companyId?: string;
}

interface ExistingStats {
  accounts: number;
  journalLines: number;
  budgetLines: number;
  otherLinks: number;
}

export const ChartOfAccountsUpload = ({ onUploadComplete, companyId }: ChartOfAccountsUploadProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; success: number; errors: number } | null>(null);
  const [replaceMode, setReplaceMode] = useState<'replace' | 'merge'>('merge');
  const [existingStats, setExistingStats] = useState<ExistingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const mapAccountType = (level1: string): "asset" | "liability" | "equity" | "revenue" | "expense" => {
    const normalized = level1.toLowerCase().trim();
    if (normalized.includes("asset")) return "asset";
    if (normalized.includes("liabilit")) return "liability";
    if (normalized.includes("equity") || normalized.includes("capital")) return "equity";
    if (normalized.includes("revenue") || normalized.includes("income") || normalized.includes("sales")) return "revenue";
    if (normalized.includes("expense") || normalized.includes("cost")) return "expense";
    return "expense";
  };

  // Load existing stats when preview mode is shown
  useEffect(() => {
    if (previewMode && companyId) {
      loadExistingStats();
    }
  }, [previewMode, companyId]);

  // Auto-switch to merge if linked data is detected and replace is selected
  useEffect(() => {
    if (hasLinkedData && replaceMode === 'replace') {
      setReplaceMode('merge');
      toast.info("Switched to Merge mode — Replace is not available when accounts have linked data.");
    }
  }, [existingStats]);

  // Helper: count rows in a table matching account IDs in chunks
  const countLinkedRowsChunked = async (
    table: string,
    column: string,
    accountIds: string[],
    useCompanyFilter = false
  ): Promise<number> => {
    const CHUNK_SIZE = 200;
    let total = 0;
    for (let i = 0; i < accountIds.length; i += CHUNK_SIZE) {
      const chunk = accountIds.slice(i, i + CHUNK_SIZE);
      let query = (supabase as any)
        .from(table)
        .select("id", { count: "exact", head: true })
        .in(column, chunk);
      if (useCompanyFilter && companyId) {
        query = query.eq("company_id", companyId);
      }
      const { count } = await query;
      total += count || 0;
    }
    return total;
  };

  const loadExistingStats = async () => {
    if (!companyId) return;
    setLoadingStats(true);
    try {
      const { data: existingAccounts, error: accErr } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId);

      if (accErr) throw accErr;
      const accountIds = (existingAccounts || []).map(a => a.id);

      let journalLines = 0;
      let budgetLines = 0;
      let otherLinks = 0;

      if (accountIds.length > 0) {
        // Chunked counting across ALL account IDs
        journalLines = await countLinkedRowsChunked("journal_entry_lines", "account_id", accountIds);
        budgetLines = await countLinkedRowsChunked("budget_line_items", "account_id", accountIds);

        // Bank accounts linked via gl_account_id
        const { count: bankCount } = await supabase
          .from("bank_accounts")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .not("gl_account_id", "is", null);

        // AP/AR references – chunked
        const apCount = await countLinkedRowsChunked("accounts_payable", "account_id", accountIds);
        const arCount = await countLinkedRowsChunked("accounts_receivable", "account_id", accountIds);

        // AP/AR invoice lines
        const apLineCount = await countLinkedRowsChunked("ap_invoice_lines", "account_id", accountIds);
        const arLineCount = await countLinkedRowsChunked("ar_invoice_lines", "account_id", accountIds);

        // Asset categories referencing COA
        const assetCatCount = await countLinkedRowsChunked("asset_categories", "asset_account_id", accountIds);

        // Auto posting rules
        const debitRuleCount = await countLinkedRowsChunked("auto_posting_rules", "debit_account_id", accountIds);
        const creditRuleCount = await countLinkedRowsChunked("auto_posting_rules", "credit_account_id", accountIds);

        otherLinks = (bankCount || 0) + apCount + arCount + apLineCount + arLineCount + assetCatCount + debitRuleCount + creditRuleCount;
      }

      setExistingStats({ accounts: accountIds.length, journalLines, budgetLines, otherLinks });
    } catch (error) {
      console.error("Error loading existing stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewMode(false);
    setParsedData([]);
    setUploadStats(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error("File appears to be empty or has no data rows");
        return;
      }

      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.some((cell: any) => 
          String(cell).toLowerCase().includes("level") || 
          String(cell).toLowerCase().includes("drawer") ||
          String(cell).toLowerCase().includes("gl code")
        )) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = jsonData[headerRowIndex].map((h: any) => String(h || "").toLowerCase().trim());
      
      const level1Idx = headers.findIndex((h: string) => h.includes("level1") || h.includes("drawer"));
      const level2Idx = headers.findIndex((h: string) => h.includes("level2") && !h.includes("level2 gl"));
      const level3Idx = headers.findIndex((h: string) => h.includes("level3") && !h.includes("level3 gl"));
      const level4Idx = headers.findIndex((h: string) => h.includes("level4") && !h.includes("level4 gl"));
      const level5Idx = headers.findIndex((h: string) => h.includes("level5") && !h.includes("gl code"));
      const glCodeIdx = headers.findIndex((h: string) => h.includes("gl code") || h.includes("glcode"));

      if (level1Idx === -1 || glCodeIdx === -1) {
        toast.error("Could not find required columns (Level1/Drawers and GL Code)");
        return;
      }

      const parsed: ParsedRow[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const glCode = String(row[glCodeIdx] || "").trim();
        if (!glCode) continue;

        parsed.push({
          level1: String(row[level1Idx] || "").trim(),
          level2: level2Idx >= 0 ? String(row[level2Idx] || "").trim() : "",
          level3: level3Idx >= 0 ? String(row[level3Idx] || "").trim() : "",
          level4: level4Idx >= 0 ? String(row[level4Idx] || "").trim() : "",
          level5: level5Idx >= 0 ? String(row[level5Idx] || "").trim() : "",
          glCode,
        });
      }

      if (parsed.length === 0) {
        toast.error("No valid data rows found in the file");
        return;
      }

      setParsedData(parsed);
      setPreviewMode(true);
      toast.success(`Found ${parsed.length} accounts to upload`);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file. Please check the format.");
    }
  };

  const buildRecord = (row: ParsedRow) => {
    let accountLevel = 5;
    const accountName = row.level5 || row.level4 || row.level3 || row.level2 || row.level1;
    
    if (row.level5) accountLevel = 5;
    else if (row.level4) accountLevel = 4;
    else if (row.level3) accountLevel = 3;
    else if (row.level2) accountLevel = 2;
    else if (row.level1) accountLevel = 1;

    return {
      company_id: companyId!,
      account_code: row.glCode,
      account_name: accountName,
      account_type: mapAccountType(row.level1),
      level1: row.level1,
      level2: row.level2,
      level3: row.level3,
      level4: row.level4,
      level5: row.level5,
      gl_code: row.glCode,
      account_level: accountLevel,
      is_header: accountLevel < 5,
      is_active: true,
      current_balance: 0,
    };
  };

  const handleUploadMerge = async () => {
    if (!companyId) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let successCount = 0;
      let errorCount = 0;
      const batchSize = 50;

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize);
        const records = batch.map(row => {
          const rec = buildRecord(row);
          const { current_balance, ...upsertRec } = rec;
          return upsertRec;
        });

        const { error } = await supabase
          .from("chart_of_accounts")
          .upsert(records, {
            onConflict: "company_id,account_code",
            ignoreDuplicates: false,
          });

        if (error) {
          console.error(`COA upsert batch error:`, error.message);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }

        setUploadProgress(Math.round(((i + batch.length) / parsedData.length) * 100));
      }

      await supabase.from("coa_upload_history").insert({
        uploaded_by: user?.id,
        total_records: parsedData.length,
        status: errorCount === 0 ? "completed" : "partial",
        file_name: file?.name,
        notes: `Merge mode (upsert): ${successCount} success, ${errorCount} errors`,
      });

      setUploadStats({ total: parsedData.length, success: successCount, errors: errorCount });

      if (errorCount === 0) {
        toast.success(`Merged ${successCount} accounts successfully`);
        onUploadComplete();
        setTimeout(() => setOpen(false), 2000);
      } else {
        toast.warning(`Merged ${successCount} accounts with ${errorCount} errors`);
      }
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Failed to merge chart of accounts");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadReplace = async () => {
    if (parsedData.length === 0 || !companyId) return;

    // ── DEFENSIVE GUARD: If linked data exists, abort immediately ──
    if (hasLinkedData) {
      toast.error(
        "Replace is blocked: accounts have linked transactions/references. Use Merge/Update mode instead.",
        { duration: 8000 }
      );
      setReplaceMode('merge');

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("coa_upload_history").insert({
        uploaded_by: user?.id,
        total_records: parsedData.length,
        status: "failed",
        file_name: file?.name,
        notes: "replace_blocked_linked_data — runtime guard triggered",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const expectedCount = existingStats?.accounts || 0;

      // ── VERIFIED DELETE: use count to confirm rows were actually removed ──
      const { error: deleteError, count: deletedCount } = await supabase
        .from("chart_of_accounts")
        .delete({ count: 'exact' })
        .eq("company_id", companyId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        toast.error(
          "Replace failed: could not delete existing accounts (likely linked to transactions). Please use Merge/Update mode instead.",
          { duration: 8000 }
        );
        setUploadStats({ total: parsedData.length, success: 0, errors: parsedData.length });

        await supabase.from("coa_upload_history").insert({
          uploaded_by: user?.id,
          total_records: parsedData.length,
          status: "failed",
          file_name: file?.name,
          notes: `replace_blocked_delete_error: ${deleteError.message}`,
        });

        setIsUploading(false);
        return;
      }

      // ── VERIFIED DELETE CHECK: if accounts existed but 0 were deleted, stop ──
      if (expectedCount > 0 && (deletedCount === null || deletedCount === 0)) {
        console.error(`Delete was a no-op: expected ${expectedCount} deletions but got ${deletedCount}`);
        toast.error(
          "Replace failed: no accounts were actually deleted (possible RLS or FK constraint). Please use Merge/Update mode instead.",
          { duration: 8000 }
        );
        setUploadStats({ total: parsedData.length, success: 0, errors: parsedData.length });

        await supabase.from("coa_upload_history").insert({
          uploaded_by: user?.id,
          total_records: parsedData.length,
          status: "failed",
          file_name: file?.name,
          notes: `replace_blocked_delete_no_rows: expected ${expectedCount}, deleted ${deletedCount}`,
        });

        setIsUploading(false);
        return;
      }

      // ── DELETE VERIFIED — proceed with inserts ──
      let successCount = 0;
      let errorCount = 0;
      const batchSize = 50;
      const totalBatches = Math.ceil(parsedData.length / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, parsedData.length);
        const batchData = parsedData.slice(start, end);

        const records = batchData.map(buildRecord);

        const { error: insertError } = await supabase
          .from("chart_of_accounts")
          .insert(records);

        if (insertError) {
          console.error("Insert error for batch:", batch, insertError);
          errorCount += batchData.length;
        } else {
          successCount += batchData.length;
        }

        setUploadProgress(Math.round(((batch + 1) / totalBatches) * 100));
      }

      await supabase.from("coa_upload_history").insert({
        uploaded_by: user?.id,
        total_records: parsedData.length,
        status: errorCount === 0 ? "completed" : "partial",
        file_name: file?.name,
        notes: `Replace mode: deleted ${deletedCount}, inserted ${successCount}, errors ${errorCount}`,
      });

      setUploadStats({ total: parsedData.length, success: successCount, errors: errorCount });

      if (errorCount === 0) {
        toast.success(`Successfully replaced with ${successCount} accounts`);
        onUploadComplete();
        setTimeout(() => setOpen(false), 2000);
      } else {
        toast.warning(`Uploaded ${successCount} accounts with ${errorCount} errors`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload chart of accounts");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = () => {
    // ── HARD GUARD: Never allow replace when linked data exists ──
    if (replaceMode === 'replace' && hasLinkedData) {
      toast.error("Replace is not available for this company — accounts are linked to transactions. Switching to Merge/Update.");
      setReplaceMode('merge');
      return;
    }

    if (replaceMode === 'merge') {
      handleUploadMerge();
    } else {
      handleUploadReplace();
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setPreviewMode(false);
    setUploadProgress(0);
    setUploadStats(null);
    setReplaceMode('merge');
    setExistingStats(null);
  };

  const totalLinkedCount = (existingStats?.journalLines || 0) + (existingStats?.budgetLines || 0) + (existingStats?.otherLinks || 0);
  const hasLinkedData = existingStats && totalLinkedCount > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload COA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Chart of Accounts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!previewMode ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload an Excel file (.xlsx, .xls) or CSV with the following columns:
                  <br />
                  <strong>Level1 (Drawers)</strong>, <strong>Level2</strong>, <strong>Level3</strong>, 
                  <strong>Level4</strong>, <strong>Level5</strong>, <strong>Level5 GL Code</strong>
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="coa-file-input"
                />
                <label
                  htmlFor="coa-file-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                  <span className="text-lg font-medium">Click to select file</span>
                  <span className="text-sm text-muted-foreground">
                    Supports .xlsx, .xls, .csv files
                  </span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{file?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.length} accounts found
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetState} disabled={isUploading}>
                    Change File
                  </Button>
                </div>
              </div>

              {/* Existing Stats */}
              {loadingStats ? (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>Checking existing data...</AlertDescription>
                </Alert>
              ) : existingStats && existingStats.accounts > 0 ? (
                <Alert variant={hasLinkedData ? "destructive" : "default"}>
                  {hasLinkedData ? <AlertTriangle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>
                    <strong>Current COA:</strong> {existingStats.accounts} accounts
                    {hasLinkedData && (
                      <>
                        <br />
                        <span className="text-destructive font-semibold">
                          ⚠ {totalLinkedCount} linked references found ({existingStats.journalLines} journal lines, {existingStats.budgetLines} budget items, {existingStats.otherLinks} other refs).
                        </span>
                        <br />
                        <span className="text-sm">
                          <strong>Replace mode is disabled.</strong> Use <strong>Merge/Update</strong> to safely update your COA without breaking linked data.
                        </span>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Upload Mode Selection */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-semibold">Upload Mode</Label>
                <RadioGroup 
                  value={replaceMode} 
                  onValueChange={(v) => {
                    if (v === 'replace' && hasLinkedData) {
                      toast.warning("Replace is blocked — this company has linked transactions.");
                      return; // reject selection
                    }
                    setReplaceMode(v as 'replace' | 'merge');
                  }}
                >
                  <div className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50">
                    <RadioGroupItem value="merge" id="merge" className="mt-0.5" />
                    <div>
                      <Label htmlFor="merge" className="font-medium cursor-pointer">Merge / Update (Recommended)</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Matches accounts by GL Code. Updates existing accounts, adds new ones. 
                        Existing accounts not in the file are left untouched. <strong>Preserves all transaction links.</strong>
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 p-3 rounded-md border ${hasLinkedData ? 'opacity-40 cursor-not-allowed bg-muted/30' : 'hover:bg-muted/50'}`}>
                    <RadioGroupItem value="replace" id="replace" className="mt-0.5" disabled={!!hasLinkedData} />
                    <div>
                      <Label htmlFor="replace" className={`font-medium ${hasLinkedData ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        Replace All (Clean Slate)
                        {hasLinkedData && <Badge variant="outline" className="ml-2 text-destructive border-destructive text-[10px]">Blocked</Badge>}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasLinkedData 
                          ? <>This company has <strong>{totalLinkedCount} linked references</strong> to existing accounts. Replace is permanently blocked — use Merge/Update to safely update your COA.</>
                          : <>Deletes ALL existing accounts and uploads new ones. Only use for brand-new setups with no transactions or references.</>
                        }
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {/* No more bypass checkbox — replace is hard-blocked when linked data exists */}
              </div>

              {uploadStats && (
                <Alert variant={uploadStats.errors > 0 ? "destructive" : "default"}>
                  {uploadStats.errors > 0 ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    Upload complete: {uploadStats.success} success, {uploadStats.errors} errors
                  </AlertDescription>
                </Alert>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {replaceMode === 'merge' ? 'Merging' : 'Uploading'}... {uploadProgress}%
                  </p>
                </div>
              )}

              <ScrollArea className="h-[250px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GL Code</TableHead>
                      <TableHead>Level 1</TableHead>
                      <TableHead>Level 2</TableHead>
                      <TableHead>Level 3</TableHead>
                      <TableHead>Level 4</TableHead>
                      <TableHead>Level 5</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{row.glCode}</TableCell>
                        <TableCell className="text-xs">{row.level1}</TableCell>
                        <TableCell className="text-xs">{row.level2}</TableCell>
                        <TableCell className="text-xs">{row.level3}</TableCell>
                        <TableCell className="text-xs">{row.level4}</TableCell>
                        <TableCell className="text-xs">{row.level5}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {mapAccountType(row.level1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    Showing first 50 of {parsedData.length} rows
                  </p>
                )}
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || (replaceMode === 'replace' && !!hasLinkedData)}
                >
                  {isUploading 
                    ? (replaceMode === 'merge' ? "Merging..." : "Replacing...") 
                    : replaceMode === 'merge' 
                      ? `Merge ${parsedData.length} Accounts` 
                      : `Replace with ${parsedData.length} Accounts`
                  }
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
