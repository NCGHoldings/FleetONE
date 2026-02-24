import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Unlock, Calendar, AlertTriangle, Plus, X, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "./shared/StatusBadge";
import { DateDisplay } from "./shared/DateDisplay";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FinancialPeriodsView = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [periodName, setPeriodName] = useState("");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodType, setPeriodType] = useState("monthly");

  const { data: periods, isLoading } = useQuery({
    queryKey: ["financial-periods", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const createPeriod = useMutation({
    mutationFn: async (params: {
      period_name: string;
      fiscal_year: number;
      start_date: string;
      end_date: string;
      status: string;
      company_id?: string;
    }) => {
      const { error } = await supabase
        .from("financial_periods")
        .insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-periods"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-periods"] });
      toast.success("Financial period created successfully");
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create period: ${error.message}`);
    },
  });

  const closePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from("financial_periods")
        .update({ 
          status: "closed" as const,
          closed_at: new Date().toISOString(),
        })
        .eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-periods"] });
      toast.success("Period closed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to close period: ${error.message}`);
    },
  });

  const reopenPeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from("financial_periods")
        .update({ 
          status: "open" as const,
          closed_at: null,
        })
        .eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-periods"] });
      toast.success("Period reopened");
    },
  });

  const resetForm = () => {
    setPeriodName("");
    setFiscalYear(new Date().getFullYear().toString());
    setStartDate("");
    setEndDate("");
    setPeriodType("monthly");
  };

  const handleAutoGenerate = () => {
    const year = parseInt(fiscalYear) || new Date().getFullYear();
    if (periodType === "monthly") {
      // Generate 12 monthly periods
      const newPeriods: {
        period_name: string;
        fiscal_year: number;
        start_date: string;
        end_date: string;
        status: string;
        company_id?: string;
      }[] = [];
      for (let m = 0; m < 12; m++) {
        const start = new Date(year, m, 1);
        const end = new Date(year, m + 1, 0); // Last day of month
        const monthName = start.toLocaleString("en-US", { month: "long" });
        newPeriods.push({
          period_name: `${monthName} ${year}`,
          fiscal_year: year,
          start_date: start.toISOString().split("T")[0],
          end_date: end.toISOString().split("T")[0],
          status: "open",
          ...(effectiveCompanyId ? { company_id: effectiveCompanyId } : {}),
        });
      }
      // Insert all periods
      const insertAll = async () => {
        const { error } = await supabase.from("financial_periods").insert(newPeriods);
        if (error) throw error;
      };
      insertAll()
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["financial-periods"] });
          queryClient.invalidateQueries({ queryKey: ["cashflow-periods"] });
          toast.success(`Created 12 monthly periods for ${year}`);
          setCreateDialogOpen(false);
        })
        .catch((err) => {
          toast.error(`Failed: ${err.message}`);
        });
    } else if (periodType === "quarterly") {
      const quarters = [
        { name: "Q1", start: `${year}-01-01`, end: `${year}-03-31` },
        { name: "Q2", start: `${year}-04-01`, end: `${year}-06-30` },
        { name: "Q3", start: `${year}-07-01`, end: `${year}-09-30` },
        { name: "Q4", start: `${year}-10-01`, end: `${year}-12-31` },
      ];
      const newPeriods = quarters.map((q) => ({
        period_name: `${q.name} ${year}`,
        fiscal_year: year,
        start_date: q.start,
        end_date: q.end,
        status: "open",
        ...(effectiveCompanyId ? { company_id: effectiveCompanyId } : {}),
      }));
      const insertAll = async () => {
        const { error } = await supabase.from("financial_periods").insert(newPeriods);
        if (error) throw error;
      };
      insertAll()
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["financial-periods"] });
          queryClient.invalidateQueries({ queryKey: ["cashflow-periods"] });
          toast.success(`Created 4 quarterly periods for ${year}`);
          setCreateDialogOpen(false);
        })
        .catch((err) => {
          toast.error(`Failed: ${err.message}`);
        });
    } else {
      // Annual
      createPeriod.mutate({
        period_name: `FY ${year}`,
        fiscal_year: parseInt(fiscalYear),
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        status: "open",
        ...(effectiveCompanyId ? { company_id: effectiveCompanyId } : {}),
      });
    }
  };

  const handleManualCreate = () => {
    if (!periodName || !startDate || !endDate) {
      toast.error("Please fill in all fields");
      return;
    }
    createPeriod.mutate({
      period_name: periodName,
      fiscal_year: parseInt(fiscalYear),
      start_date: startDate,
      end_date: endDate,
      status: "open",
      ...(effectiveCompanyId ? { company_id: effectiveCompanyId } : {}),
    });
  };

  const columns = [
    {
      accessorKey: "period_name",
      header: "Period",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.period_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "fiscal_year",
      header: "Fiscal Year",
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      cell: ({ row }: any) => <DateDisplay date={row.original.start_date} />,
    },
    {
      accessorKey: "end_date",
      header: "End Date",
      cell: ({ row }: any) => <DateDisplay date={row.original.end_date} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "closed_at",
      header: "Closed At",
      cell: ({ row }: any) => (
        row.original.closed_at ? (
          <DateDisplay date={row.original.closed_at} format="datetime" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const period = row.original;
        const isOpen = period.status === "open";

        return (
          <div className="flex gap-2">
            {isOpen ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-amber-600">
                    <Lock className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Close Financial Period
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to close <strong>{period.period_name}</strong>? 
                      This will prevent any new postings to this period. 
                      Ensure all transactions are reconciled before closing.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => closePeriod.mutate(period.id)}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Close Period
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => reopenPeriod.mutate(period.id)}
              >
                <Unlock className="h-4 w-4 mr-1" />
                Reopen
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Financial Periods</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage accounting periods and control posting dates
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Period
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Financial Period</DialogTitle>
              <DialogDescription>
                Create a single period manually or auto-generate monthly/quarterly periods for a fiscal year.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Period Type */}
              <div className="space-y-2">
                <Label>Generation Method</Label>
                <Select value={periodType} onValueChange={setPeriodType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (Single Period)</SelectItem>
                    <SelectItem value="monthly">Auto-Generate Monthly (12 Periods)</SelectItem>
                    <SelectItem value="quarterly">Auto-Generate Quarterly (4 Periods)</SelectItem>
                    <SelectItem value="annual">Auto-Generate Annual (1 Period)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fiscal Year */}
              <div className="space-y-2">
                <Label>Fiscal Year</Label>
                <Input
                  type="number"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>

              {periodType === "manual" && (
                <>
                  <div className="space-y-2">
                    <Label>Period Name</Label>
                    <Input
                      value={periodName}
                      onChange={(e) => setPeriodName(e.target.value)}
                      placeholder="e.g., January 2026"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {periodType !== "manual" && (
                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    {periodType === "monthly" && "12 monthly periods will be created"}
                    {periodType === "quarterly" && "4 quarterly periods will be created"}
                    {periodType === "annual" && "1 annual period will be created"}
                  </p>
                  <p>
                    All periods will be created for the fiscal year {fiscalYear} with 'open' status.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={periodType === "manual" ? handleManualCreate : handleAutoGenerate}
                disabled={createPeriod.isPending}
              >
                {createPeriod.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {periodType === "manual" ? "Create Period" : `Generate ${periodType === "monthly" ? "12" : periodType === "quarterly" ? "4" : "1"} Period${periodType !== "annual" ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={periods || []}
        searchKey="period_name"
      />
    </Card>
  );
};
