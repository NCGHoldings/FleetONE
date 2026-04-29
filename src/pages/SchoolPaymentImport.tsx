import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, CheckCircle, AlertCircle, HelpCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BankStatementUploadZone } from "@/components/school/BankStatementUploadZone";
import { PaymentMatchingPreview } from "@/components/school/PaymentMatchingPreview";
import { UnmatchedPaymentsTable } from "@/components/school/UnmatchedPaymentsTable";
import { ImportHistoryTable } from "@/components/school/ImportHistoryTable";
import { FinanceImportApprovalDialog } from "@/components/school/FinanceImportApprovalDialog";
import { supabase } from "@/integrations/supabase/client";

export default function SchoolPaymentImport() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upload");
  const [importId, setImportId] = useState<string | null>(null);
  
  const [stats, setStats] = useState({
    total: 0,
    autoMatched: 0,
    needsReview: 0,
    unmatched: 0,
  });

  const handleUploadComplete = (newImportId: string, uploadStats: any) => {
    setImportId(newImportId);
    setStats(uploadStats);
    setActiveTab("auto-matched");
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/school-bus/branch/${branchId}/payments`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Bank Statement Payment Import</h1>
            <p className="text-muted-foreground">
              Automatically match and record student payments from bank statements
            </p>
          </div>
        </div>
        {importId && (
          <Button 
            onClick={async () => {
              const { error } = await supabase
                .from('school_payment_imports')
                .update({ status: 'pending_finance' })
                .eq('id', importId);
              if (!error) {
                setActiveTab("history");
                setImportId(null);
              }
            }}
            className="bg-primary text-primary-foreground"
          >
            Submit Batch to Finance
          </Button>
        )}
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Auto-Matched
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{stats.autoMatched}</div>
              <p className="text-xs text-green-600 mt-1">
                {stats.total > 0 ? Math.round((stats.autoMatched / stats.total) * 100) : 0}% success
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-700">
                <Clock className="h-4 w-4" />
                Needs Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{stats.needsReview}</div>
              <p className="text-xs text-yellow-600 mt-1">Partial matches found</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                Unmatched
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{stats.unmatched}</div>
              <p className="text-xs text-red-600 mt-1">Manual action required</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="auto-matched" className="flex items-center gap-2" disabled={!importId}>
            <CheckCircle className="h-4 w-4" />
            Auto-Matched ({stats.autoMatched})
          </TabsTrigger>
          <TabsTrigger value="needs-review" className="flex items-center gap-2" disabled={!importId}>
            <HelpCircle className="h-4 w-4" />
            Needs Review ({stats.needsReview})
          </TabsTrigger>
          <TabsTrigger value="unmatched" className="flex items-center gap-2" disabled={!importId}>
            <AlertCircle className="h-4 w-4" />
            Unmatched ({stats.unmatched})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <BankStatementUploadZone
            branchId={branchId!}
            onUploadComplete={handleUploadComplete}
          />
        </TabsContent>

        <TabsContent value="auto-matched" className="mt-6">
          {importId && (
            <PaymentMatchingPreview
              importId={importId}
              matchStatus="auto_matched"
              onStatsUpdate={setStats}
            />
          )}
        </TabsContent>

        <TabsContent value="needs-review" className="mt-6">
          {importId && (
            <PaymentMatchingPreview
              importId={importId}
              matchStatus="partial_match"
              onStatsUpdate={setStats}
            />
          )}
        </TabsContent>

        <TabsContent value="unmatched" className="mt-6">
          {importId && (
            <UnmatchedPaymentsTable
              importId={importId}
              branchId={branchId!}
              onStatsUpdate={setStats}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ImportHistoryTable 
            branchId={branchId!} 
            onContinue={(importRecord) => {
              setImportId(importRecord.id);
              setStats({
                total: importRecord.total_transactions || 0,
                autoMatched: importRecord.auto_matched_count || 0,
                needsReview: importRecord.manual_matched_count || 0,
                unmatched: importRecord.unmatched_count || 0,
              });
              setActiveTab("unmatched");
            }}
          />
        </TabsContent>
      </Tabs>

      <FinanceImportApprovalDialog />
    </div>
  );
}
