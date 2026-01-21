import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Calendar, AlertTriangle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "./shared/StatusBadge";
import { DateDisplay } from "./shared/DateDisplay";
import { toast } from "sonner";
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

export const FinancialPeriodsView = () => {
  const queryClient = useQueryClient();

  const { data: periods, isLoading } = useQuery({
    queryKey: ["financial-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data;
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
      </div>

      <DataTable
        columns={columns}
        data={periods || []}
        searchKey="period_name"
      />
    </Card>
  );
};
