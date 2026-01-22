import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export const ChartOfAccountsUpload = ({ onUploadComplete, companyId }: ChartOfAccountsUploadProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; success: number; errors: number } | null>(null);

  const mapAccountType = (level1: string): "asset" | "liability" | "equity" | "revenue" | "expense" => {
    const normalized = level1.toLowerCase().trim();
    if (normalized.includes("asset")) return "asset";
    if (normalized.includes("liabilit")) return "liability";
    if (normalized.includes("equity") || normalized.includes("capital")) return "equity";
    if (normalized.includes("revenue") || normalized.includes("income") || normalized.includes("sales")) return "revenue";
    if (normalized.includes("expense") || normalized.includes("cost")) return "expense";
    return "expense"; // default
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

      // Find header row - look for Level1 or similar headers
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
      
      // Map column indices
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

      // Parse data rows
      const parsed: ParsedRow[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const glCode = String(row[glCodeIdx] || "").trim();
        if (!glCode) continue; // Skip rows without GL code

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

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      toast.error("No data to upload");
      return;
    }

    if (!companyId) {
      toast.error("No company selected");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Delete existing accounts for THIS COMPANY ONLY (replace mode)
      const { error: deleteError } = await supabase
        .from("chart_of_accounts")
        .delete()
        .eq("company_id", companyId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        // Continue anyway - might be empty table
      }

      let successCount = 0;
      let errorCount = 0;
      const batchSize = 50;
      const totalBatches = Math.ceil(parsedData.length / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, parsedData.length);
        const batchData = parsedData.slice(start, end);

        const records = batchData.map((row) => {
          // Determine account level based on which level has value
          let accountLevel = 5;
          let accountName = row.level5 || row.level4 || row.level3 || row.level2 || row.level1;
          
          if (row.level5) accountLevel = 5;
          else if (row.level4) accountLevel = 4;
          else if (row.level3) accountLevel = 3;
          else if (row.level2) accountLevel = 2;
          else if (row.level1) accountLevel = 1;

          return {
            company_id: companyId, // CRITICAL: Tag with company_id
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
        });

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

      // Log upload history
      await supabase.from("coa_upload_history").insert({
        uploaded_by: user?.id,
        total_records: parsedData.length,
        status: errorCount === 0 ? "completed" : "partial",
        file_name: file?.name,
        notes: `Uploaded ${successCount} accounts, ${errorCount} errors`,
      });

      setUploadStats({ total: parsedData.length, success: successCount, errors: errorCount });

      if (errorCount === 0) {
        toast.success(`Successfully uploaded ${successCount} accounts`);
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

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setPreviewMode(false);
    setUploadProgress(0);
    setUploadStats(null);
  };

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
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              <ScrollArea className="h-[300px] border rounded-lg">
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
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? "Uploading..." : `Upload ${parsedData.length} Accounts`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
