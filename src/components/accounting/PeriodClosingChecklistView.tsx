import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lock,
  FileText,
  DollarSign,
  Building,
  Calculator,
  ClipboardCheck,
} from "lucide-react";
import { useFinancialPeriods, usePeriodClosingChecklist } from "@/hooks/useAccountingData";
import { useClosePeriod } from "@/hooks/useAccountingMutations";
import { format } from "date-fns";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "completed" | "warning" | "pending";
  count?: number;
  autoCheck: boolean;
}

export const PeriodClosingChecklistView = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});

  const { data: periods = [] } = useFinancialPeriods();
  const { data: checklistData } = usePeriodClosingChecklist(selectedPeriodId);
  const closePeriod = useClosePeriod();

  const openPeriods = periods.filter((p: any) => !p.is_closed);
  const selectedPeriod = periods.find((p: any) => p.id === selectedPeriodId);

  const getChecklistItems = (): ChecklistItem[] => {
    if (!checklistData) return [];

    return [
      {
        id: "journals",
        title: "All Journal Entries Posted",
        description: "Ensure all journal entries for the period are posted",
        icon: <FileText className="h-5 w-5" />,
        status: checklistData.unpostedJournals === 0 ? "completed" : "warning",
        count: checklistData.unpostedJournals,
        autoCheck: true,
      },
      {
        id: "ar_invoices",
        title: "AR Invoices Reviewed",
        description: "Review unpaid AR invoices and provisions",
        icon: <DollarSign className="h-5 w-5" />,
        status: checklistData.unpaidARInvoices === 0 ? "completed" : "warning",
        count: checklistData.unpaidARInvoices,
        autoCheck: true,
      },
      {
        id: "ap_invoices",
        title: "AP Invoices Reviewed",
        description: "Review unpaid AP invoices and accruals",
        icon: <DollarSign className="h-5 w-5" />,
        status: checklistData.unpaidAPInvoices === 0 ? "completed" : "warning",
        count: checklistData.unpaidAPInvoices,
        autoCheck: true,
      },
      {
        id: "bank_recon",
        title: "Bank Reconciliations Complete",
        description: "All bank accounts reconciled for the period",
        icon: <Building className="h-5 w-5" />,
        status: checklistData.pendingReconciliations === 0 ? "completed" : "warning",
        count: checklistData.pendingReconciliations,
        autoCheck: true,
      },
      {
        id: "depreciation",
        title: "Depreciation Run",
        description: "Monthly depreciation calculated and posted",
        icon: <Calculator className="h-5 w-5" />,
        status: manualChecks["depreciation"] ? "completed" : "pending",
        autoCheck: false,
      },
      {
        id: "inventory",
        title: "Inventory Valued",
        description: "Inventory valuation completed for the period",
        icon: <ClipboardCheck className="h-5 w-5" />,
        status: manualChecks["inventory"] ? "completed" : "pending",
        autoCheck: false,
      },
      {
        id: "accruals",
        title: "Accruals Posted",
        description: "All accrual entries posted for the period",
        icon: <FileText className="h-5 w-5" />,
        status: manualChecks["accruals"] ? "completed" : "pending",
        autoCheck: false,
      },
      {
        id: "review",
        title: "Management Review",
        description: "Financial statements reviewed and approved",
        icon: <CheckCircle className="h-5 w-5" />,
        status: manualChecks["review"] ? "completed" : "pending",
        autoCheck: false,
      },
    ];
  };

  const checklistItems = getChecklistItems();
  const completedCount = checklistItems.filter((item) => item.status === "completed").length;
  const progress = checklistItems.length > 0 ? (completedCount / checklistItems.length) * 100 : 0;
  const canClosePeriod = progress === 100;

  const toggleManualCheck = (id: string) => {
    setManualChecks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriodId || !canClosePeriod) {
      toast.error("Complete all checklist items before closing the period");
      return;
    }

    try {
      await closePeriod.mutateAsync(selectedPeriodId);
      setSelectedPeriodId("");
      setManualChecks({});
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Period Closing Checklist</h2>
          <p className="text-muted-foreground">Complete all items before closing the financial period</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Period to Close</CardTitle>
          <CardDescription>Choose an open financial period to review and close</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a financial period" />
            </SelectTrigger>
            <SelectContent>
              {openPeriods.length === 0 ? (
                <SelectItem value="none" disabled>
                  No open periods
                </SelectItem>
              ) : (
                openPeriods.map((period: any) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.period_name} ({format(new Date(period.start_date), "MMM dd")} - {format(new Date(period.end_date), "MMM dd, yyyy")})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPeriod && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Closing Progress</CardTitle>
                  <CardDescription>
                    {selectedPeriod.period_name}: {format(new Date(selectedPeriod.start_date), "MMM dd")} - {format(new Date(selectedPeriod.end_date), "MMM dd, yyyy")}
                  </CardDescription>
                </div>
                <Badge variant={canClosePeriod ? "default" : "secondary"}>
                  {completedCount} / {checklistItems.length} Complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round(progress)}% complete
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {checklistItems.map((item) => (
              <Card key={item.id} className={item.status === "completed" ? "border-green-200 bg-green-50/50" : ""}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    {!item.autoCheck && (
                      <Checkbox
                        checked={manualChecks[item.id] || false}
                        onCheckedChange={() => toggleManualCheck(item.id)}
                      />
                    )}
                    <div className="p-2 bg-muted rounded-lg">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.count !== undefined && item.count > 0 && (
                      <Badge variant="outline" className="text-yellow-600">
                        {item.count} pending
                      </Badge>
                    )}
                    {getStatusIcon(item.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className={canClosePeriod ? "border-green-500" : "border-muted"}>
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <Lock className={`h-8 w-8 ${canClosePeriod ? "text-green-500" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-bold text-lg">Close Period</p>
                  <p className="text-muted-foreground">
                    {canClosePeriod
                      ? "All items complete. Ready to close the period."
                      : "Complete all checklist items to close this period."}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleClosePeriod}
                disabled={!canClosePeriod || closePeriod.isPending}
              >
                <Lock className="h-4 w-4 mr-2" />
                Close Period
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};