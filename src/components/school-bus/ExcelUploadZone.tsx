import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { processAdmissionNumberExcel, validateExcelStructure } from "@/utils/admission-number-excel-processor";
import { toast } from "sonner";

interface ExcelUploadZoneProps {
  onExcelProcessed: (mappings: any[]) => void;
  tnStudents: any[];
  loading: boolean;
}

export function ExcelUploadZone({ onExcelProcessed, tnStudents, loading }: ExcelUploadZoneProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setProcessing(true);
    setUploadedFile(file);
    setValidationErrors([]);

    try {
      // Validate structure first
      const structureCheck = await validateExcelStructure(file);
      if (!structureCheck.valid) {
        toast.error(structureCheck.error || 'Invalid Excel file');
        setValidationErrors([structureCheck.error || 'Invalid Excel file']);
        setProcessing(false);
        return;
      }

      // Process the file
      const result = await processAdmissionNumberExcel(file);

      if (!result.success) {
        setValidationErrors(result.errors);
        toast.error(`Found ${result.errors.length} errors in Excel file`);
      } else {
        // Cross-check with database
        const validMappings: any[] = [];
        const newErrors: string[] = [];

        for (const mapping of result.mappings) {
          const student = tnStudents.find(s => s.admission_no === mapping.tnNumber);
          if (!student) {
            newErrors.push(`Row ${mapping.rowNumber}: TN number "${mapping.tnNumber}" not found in database`);
          } else {
            validMappings.push({
              ...mapping,
              studentId: student.id,
              studentName: student.student_name,
              grade: student.grade,
            });
          }
        }

        if (newErrors.length > 0) {
          setValidationErrors(newErrors);
          toast.warning(`${validMappings.length} valid, ${newErrors.length} errors`);
        } else {
          toast.success(`${validMappings.length} students ready to update`);
        }

        setPreviewData(validMappings);
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Failed to process Excel file');
      setValidationErrors(['An unexpected error occurred while processing the file']);
    } finally {
      setProcessing(false);
    }
  }, [tnStudents]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: loading || processing,
  });

  const handleConfirmUpdate = () => {
    if (previewData.length === 0) {
      toast.error('No valid data to update');
      return;
    }

    onExcelProcessed(previewData);
  };

  const stats = {
    total: previewData.length,
    errors: validationErrors.length,
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${(loading || processing) ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-accent/50'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          {processing ? (
            <>
              <FileSpreadsheet className="h-12 w-12 text-primary animate-pulse" />
              <div>
                <p className="text-lg font-medium">Processing Excel file...</p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </>
          ) : uploadedFile ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div>
                <p className="text-lg font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.total} students ready • {stats.errors} errors
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop the Excel file here' : 'Drag & drop Excel file here'}
                </p>
                <p className="text-sm text-muted-foreground">or click to browse (.xlsx, .xls)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Found {validationErrors.length} errors:</div>
            <ul className="list-disc list-inside space-y-1 text-sm max-h-40 overflow-y-auto">
              {validationErrors.slice(0, 10).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
              {validationErrors.length > 10 && (
                <li className="text-muted-foreground">... and {validationErrors.length - 10} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview ({previewData.length} students)</h3>
            <Button
              onClick={handleConfirmUpdate}
              disabled={validationErrors.length > 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm & Update All
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">TN Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">New Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Grade</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-mono">{item.tnNumber}</td>
                      <td className="px-4 py-3 text-sm font-mono text-green-600">{item.newNumber}</td>
                      <td className="px-4 py-3 text-sm">{item.studentName}</td>
                      <td className="px-4 py-3 text-sm">{item.grade}</td>
                      <td className="px-4 py-3 text-center">
                        <CheckCircle className="h-4 w-4 text-green-600 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
