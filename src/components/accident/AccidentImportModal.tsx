import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  rowErrors: Array<{
    row: number;
    errors: string[];
    data: any;
  }>;
}

interface AccidentImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AccidentImportModal({ open, onOpenChange, onSuccess }: AccidentImportModalProps) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const downloadTemplate = () => {
    const headers = [
      'NO', 'VehicleNumber', 'AccidentDate', 'BLNumber', 'DetailsOfAccident',
      'EstimateAmount', 'ApprovedAmount', 'ProcessDetails', 'AccidentMark', 'Salvage',
      'ReportedBy', 'Location', 'InsurerClaimRef', 'CreatedAt', 'UpdatedAt'
    ];
    
    const sampleData = [
      '', 'BUS001', '2024-01-15', 'BL001', 'Sample accident details',
      '50000', '45000', 'Claim processed', 'false', 'false',
      'John Doe', 'Colombo', 'REF001', '', ''
    ];
    
    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accident_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
      return;
    }

    setImporting(true);
    setProgress(10);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);

      const response = await supabase.functions.invoke('accident-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: formData
      });

      setProgress(80);

      if (response.error) {
        throw new Error(response.error.message || 'Import failed');
      }

      const result = response.data;
      setProgress(100);

      if (result.success) {
        setImportResult(result.result);
        toast.success(result.message);
        
        // Call onSuccess if there were any successful imports
        if (result.result.created > 0 || result.result.updated > 0) {
          onSuccess();
        }
      } else {
        throw new Error(result.error || 'Import failed');
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import accident records');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Accident Records</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to import accident records. Existing records will be updated based on BL Number or Vehicle Number + Accident Date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Step 1: Download Template</CardTitle>
              <CardDescription>
                Download the Excel template with the correct column headers and sample data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Import Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Step 2: Upload Your File</CardTitle>
              <CardDescription>
                Select your populated Excel or CSV file to import accident records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="hidden"
                  id="import-file-upload"
                />
                <Button
                  onClick={() => document.getElementById('import-file-upload')?.click()}
                  disabled={importing}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing...' : 'Select File to Import'}
                </Button>

                {importing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      Processing your file... {progress}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                    <div className="text-sm text-muted-foreground">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {importResult.rowErrors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Row Errors ({importResult.rowErrors.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {importResult.rowErrors.map((error, index) => (
                        <div key={index} className="border border-red-200 rounded p-2 text-sm">
                          <div className="font-medium text-red-800">Row {error.row}:</div>
                          <ul className="list-disc list-inside text-red-600 ml-2">
                            {error.errors.map((err, errIndex) => (
                              <li key={errIndex}>{err}</li>
                            ))}
                          </ul>
                          {error.data.VehicleNumber && (
                            <div className="text-muted-foreground mt-1">
                              Vehicle: {error.data.VehicleNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm text-blue-800">Import Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Required fields:</strong> VehicleNumber, AccidentDate</li>
                <li><strong>Update logic:</strong> Records are matched by BL Number OR (Vehicle Number + Accident Date)</li>
                <li><strong>Date format:</strong> YYYY-MM-DD (e.g., 2024-01-15)</li>
                <li><strong>Boolean fields:</strong> Use true/false or yes/no for AccidentMark and Salvage</li>
                <li><strong>Amounts:</strong> Enter numeric values without currency symbols</li>
                <li><strong>File types:</strong> Excel (.xlsx, .xls) or CSV (.csv)</li>
                <li><strong>Error handling:</strong> Invalid rows are skipped, valid rows are processed</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}