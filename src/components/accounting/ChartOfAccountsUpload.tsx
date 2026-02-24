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
  const [confirmReplace, setConfirmReplace] = useState(false);

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

  const loadExistingStats = async () => {
    if (!companyId) return;
    setLoadingStats(true);
    try {
      // Get existing account IDs for this company
      const { data: existingAccounts, error: accErr } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId);

      if (accErr) throw accErr;
      const accountIds = (existingAccounts || []).map(a => a.id);

      let journalLines = 0;
      let budgetLines = 0;

      if (accountIds.length > 0) {
        // Count journal entry lines referencing these accounts
        const { count: jelCount } = await (supabase as any)
          .from("journal_entry_lines")
          .select("id", { count: "exact", head: true })
          .in("account_id", accountIds.slice(0, 100));
        journalLines = jelCount || 0;

        // Count budget line items referencing these accounts
        const { count: blCount } = await (supabase as any)
          .from("budget_line_items")
          .select("*", { count: "exact", head: true })
          .in("chart_of_accounts_id", accountIds);
        budgetLines = blCount || 0;
      }

      setExistingStats({
        accounts: accountIds.length,
        journalLines,
        budgetLines,
      });
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
    setConfirmReplace(false);

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

      // Fetch existing accounts by gl_code for this company
      const { data: existingAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id, gl_code")
        .eq("company_id", companyId);

      const existingByGlCode = new Map<string, string>();
      (existingAccounts || []).forEach(a => {
        if (a.gl_code) existingByGlCode.set(a.gl_code, a.id);
      });

      let successCount = 0;
      let errorCount = 0;
      let updatedCount = 0;
      let insertedCount = 0;
      const batchSize = 50;

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize);
        
        for (const row of batch) {
          const existingId = existingByGlCode.get(row.glCode);
          const record = buildRecord(row);

          if (existingId) {
            // Update existing — preserve current_balance and id
            const { error } = await supabase
              .from("chart_of_accounts")
              .update({
                account_name: record.account_name,
                account_type: record.account_type,
                level1: record.level1,
                level2: record.level2,
                level3: record.level3,
                level4: record.level4,
                level5: record.level5,
                account_level: record.account_level,
                is_header: record.is_header,
                is_active: true,
              })
              .eq("id", existingId);

            if (error) {
              errorCount++;
            } else {
              updatedCount++;
              successCount++;
            }
          } else {
            // Insert new
            const { error } = await supabase
              .from("chart_of_accounts")
              .insert(record);

            if (error) {
              errorCount++;
            } else {
              insertedCount++;
              successCount++;
            }
          }
        }

        setUploadProgress(Math.round(((i + batch.length) / parsedData.length) * 100));
      }

      // Log upload history
      await supabase.from("coa_upload_history").insert({
        uploaded_by: user?.id,
        total_records: parsedData.length,
        status: errorCount === 0 ? "completed" : "partial",
        file_name: file?.name,
        notes: `Merge mode: ${updatedCount} updated, ${insertedCount} new, ${errorCount} errors`,
      });

      setUploadStats({ total: parsedData.length, success: successCount, errors: errorCount });

      if (errorCount === 0) {
        toast.success(`Merged successfully: ${updatedCount} updated, ${insertedCount} new accounts`);
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

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Delete existing accounts for THIS COMPANY ONLY
      const { error: deleteError } = await supabase
        .from("chart_of_accounts")
        .delete()
        .eq("company_id", companyId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
      }

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
        notes: `Replace mode: ${successCount} accounts, ${errorCount} errors`,
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
    if (replaceMode === 'merge') {
      handleUploadMerge();
    } else {
      // For replace mode with linked data, require confirmation
      const hasLinkedData = existingStats && (existingStats.journalLines > 0 || existingStats.budgetLines > 0);
      if (hasLinkedData && !confirmReplace) {
        toast.error("Please confirm that you understand the impact of replacing the COA");
        return;
      }
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
    setConfirmReplace(false);
  };

  const hasLinkedData = existingStats && (existingStats.journalLines > 0 || existingStats.budgetLines > 0);

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
                          ⚠ {existingStats.journalLines} journal entry lines and {existingStats.budgetLines} budget items 
                          are linked to these accounts.
                        </span>
                        <br />
                        <span className="text-sm">
                          Using <strong>Replace</strong> mode will orphan these references. 
                          <strong> Merge/Update</strong> mode is recommended to preserve data integrity.
                        </span>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Upload Mode Selection */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-semibold">Upload Mode</Label>
                <RadioGroup value={replaceMode} onValueChange={(v) => { setReplaceMode(v as 'replace' | 'merge'); setConfirmReplace(false); }}>
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
                  <div className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50">
                    <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                    <div>
                      <Label htmlFor="replace" className="font-medium cursor-pointer">Replace All (Clean Slate)</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deletes ALL existing accounts and uploads new ones. 
                        {hasLinkedData && <span className="text-destructive font-semibold"> Will break {existingStats!.journalLines + existingStats!.budgetLines} linked records!</span>}
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {/* Confirmation for replace mode with linked data */}
                {replaceMode === 'replace' && hasLinkedData && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-md border border-destructive/30">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={confirmReplace} 
                        onChange={(e) => setConfirmReplace(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-sm text-destructive">
                        I understand that replacing the COA will orphan <strong>{existingStats!.journalLines} journal entries</strong> and <strong>{existingStats!.budgetLines} budget items</strong>. This action cannot be undone.
                      </span>
                    </label>
                  </div>
                )}
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
                  disabled={isUploading || (replaceMode === 'replace' && hasLinkedData && !confirmReplace)}
                  variant={replaceMode === 'replace' && hasLinkedData ? "destructive" : "default"}
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
