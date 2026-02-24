import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Table2, AlertCircle, CheckCircle, Download } from "lucide-react";
import { ExcelUploadZone } from "./ExcelUploadZone";
import { AdmissionUpdatePreviewTable } from "./AdmissionUpdatePreviewTable";
import { useBulkAdmissionUpdate } from "@/hooks/useBulkAdmissionUpdate";
import { toast } from "sonner";

interface BulkAdmissionNumberUpdateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId?: string;
  onSuccess: () => void;
}

export function BulkAdmissionNumberUpdate({
  open,
  onOpenChange,
  branchId,
  onSuccess,
}: BulkAdmissionNumberUpdateProps) {
  const [activeTab, setActiveTab] = useState<string>("excel");
  
  const {
    tnStudents,
    loading,
    validationResults,
    updateProgress,
    handleExcelUpload,
    handleManualUpdate,
    handleBulkUpdate,
    downloadTemplate,
    refreshStudents,
  } = useBulkAdmissionUpdate(branchId);

  const handleExcelProcessed = async (mappings: any[]) => {
    const result = await handleExcelUpload(mappings);
    if (result.success) {
      toast.success(`Successfully updated ${result.successCount} students`);
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(`Update failed: ${result.errors.join(", ")}`);
    }
  };

  const handleTableUpdate = async (updates: any[]) => {
    const result = await handleBulkUpdate(updates);
    if (result.success) {
      toast.success(`Successfully updated ${result.successCount} students`);
      onSuccess();
      refreshStudents();
    } else {
      toast.error(`Update failed: ${result.errors.join(", ")}`);
    }
  };

  const stats = {
    total: tnStudents.length,
    pending: tnStudents.filter(s => s.admission_no.includes('TN')).length,
    updated: validationResults.filter(v => v.status === 'success').length,
    errors: validationResults.filter(v => v.status === 'error').length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Bulk Update Admission Numbers
          </DialogTitle>
          <DialogDescription>
            Update temporary admission numbers (TN) to original numbers using Excel upload or interactive editor
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 py-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total TN Students</div>
          </div>
          <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Update</div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
            <div className="text-2xl font-bold text-green-600">{stats.updated}</div>
            <div className="text-sm text-muted-foreground">Valid</div>
          </div>
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
        </div>

        {/* Alert Banner */}
        {stats.pending > 0 && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-500">
              You have {stats.pending} students with temporary admission numbers that need to be updated.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Indicator */}
        {updateProgress.isUpdating && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <CheckCircle className="h-4 w-4 text-blue-600 animate-pulse" />
            <AlertDescription className="text-blue-700 dark:text-blue-500">
              Updating {updateProgress.current} of {updateProgress.total} students...
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Excel Upload
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Interactive Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Upload an Excel file with TN numbers and their corresponding new admission numbers
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <ExcelUploadZone
                onExcelProcessed={handleExcelProcessed}
                tnStudents={tnStudents}
                loading={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="table" className="flex-1 overflow-auto mt-4">
            <AdmissionUpdatePreviewTable
              students={tnStudents}
              loading={loading}
              onUpdate={handleTableUpdate}
              onManualUpdate={handleManualUpdate}
              validationResults={validationResults}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
