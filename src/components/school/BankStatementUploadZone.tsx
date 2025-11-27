import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { parseBankStatement, extractAdmissionNumbers } from "@/utils/bank-statement-processor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface BankStatementUploadZoneProps {
  branchId: string;
  onUploadComplete: (importId: string, stats: any) => void;
}

export function BankStatementUploadZone({ branchId, onUploadComplete }: BankStatementUploadZoneProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const processFile = async (file: File) => {
    try {
      setProcessing(true);
      setProgress(10);
      setFileName(file.name);

      // Parse the Excel/CSV file
      const transactions = await parseBankStatement(file);
      setProgress(30);

      if (transactions.length === 0) {
        toast({
          title: "No Transactions Found",
          description: "The uploaded file contains no valid transactions",
          variant: "destructive",
        });
        return;
      }

      // Fetch branch settings
      const { data: settings, error: settingsError } = await supabase
        .from('school_payment_import_settings')
        .select('*')
        .eq('branch_id', branchId)
        .single();

      if (!settings) {
        toast({
          title: "Settings Not Found",
          description: "Please configure import settings first",
          variant: "destructive",
        });
        return;
      }

      setProgress(40);

      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('school_payment_imports')
        .insert([{
          branch_id: branchId,
          file_name: file.name,
          total_transactions: transactions.length,
          status: 'processing',
        }])
        .select()
        .single();

      if (importError || !importRecord) {
        throw new Error('Failed to create import record');
      }

      setProgress(50);

      // Fetch all active students for this branch
      const { data: students } = await supabase
        .from('school_students')
        .select('id, admission_no, student_name, parent_name')
        .eq('branch_id', branchId)
        .eq('status', 'active');

      setProgress(60);

      // Process each transaction
      const importItems = [];
      let autoMatched = 0;
      let needsReview = 0;
      let unmatched = 0;

      for (const txn of transactions) {
        const prefixes = Array.isArray(settings.admission_prefixes) 
          ? settings.admission_prefixes 
          : (typeof settings.admission_prefixes === 'string' 
            ? JSON.parse(settings.admission_prefixes) 
            : ['N', 'LNU']);
        
        const patterns = Array.isArray(settings.custom_patterns)
          ? settings.custom_patterns
          : (typeof settings.custom_patterns === 'string'
            ? JSON.parse(settings.custom_patterns)
            : []);
            
        const extraction = extractAdmissionNumbers(
          txn.description,
          prefixes,
          patterns
        );

        const matchedStudents = students?.filter(s =>
          extraction.admissionNumbers.some(id =>
            s.admission_no.toUpperCase().includes(id.toUpperCase())
          )
        ) || [];

        let matchStatus = 'unmatched';
        if (matchedStudents.length > 0 && extraction.confidence >= settings.min_confidence_threshold) {
          matchStatus = 'auto_matched';
          autoMatched++;
        } else if (matchedStudents.length > 0) {
          matchStatus = 'partial_match';
          needsReview++;
        } else {
          unmatched++;
        }

        importItems.push({
          import_id: importRecord.id,
          txn_date: txn.txnDate.toISOString().split('T')[0],
          description: txn.description,
          amount: txn.amount,
          extracted_ids: extraction.admissionNumbers,
          matched_student_ids: matchedStudents.map(s => s.id),
          match_status: matchStatus,
          match_confidence: extraction.confidence,
          suggested_students: matchedStudents.map(s => ({
            id: s.id,
            admission_no: s.admission_no,
            student_name: s.student_name,
          })),
        });
      }

      setProgress(80);

      // Insert all import items
      const { error: itemsError } = await supabase
        .from('school_payment_import_items')
        .insert(importItems);

      if (itemsError) {
        throw new Error('Failed to save import items');
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

      toast({
        title: "Import Complete",
        description: `Processed ${transactions.length} transactions. ${autoMatched} auto-matched, ${needsReview + unmatched} need review.`,
      });

      onUploadComplete(importRecord.id, {
        total: transactions.length,
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
    } finally {
      setProcessing(false);
      setProgress(0);
      setFileName("");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [branchId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: processing,
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            {processing ? (
              <>
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground animate-pulse" />
                <div className="space-y-2 w-full max-w-md">
                  <p className="text-lg font-medium">Processing {fileName}...</p>
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground">{progress}% complete</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-16 w-16 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive
                      ? 'Drop the file here'
                      : 'Drag & drop bank statement here'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    or click to browse (Excel or CSV)
                  </p>
                </div>
                <Button type="button" variant="secondary">
                  Select File
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">File Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Excel (.xlsx, .xls) or CSV (.csv) format</li>
                <li>Must contain columns: Txn Date, Description, Amount</li>
                <li>Description should include student admission numbers or names</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
