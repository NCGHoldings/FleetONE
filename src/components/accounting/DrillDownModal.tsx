import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface DrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
  accountName?: string;
  dateRange?: { from?: Date; to?: Date };
}

export const DrillDownModal = ({
  open,
  onOpenChange,
  accountId,
  accountName,
  dateRange,
}: DrillDownModalProps) => {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["account-transactions", accountId, dateRange],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entries!inner(
            entry_number,
            entry_date,
            description,
            status,
            source_type
          )
        `)
        .eq("account_id", accountId)
        .eq("journal_entries.status", "posted")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!accountId,
  });

  const totalDebits = transactions?.reduce((sum, t) => sum + (t.debit || 0), 0) || 0;
  const totalCredits = transactions?.reduce((sum, t) => sum + (t.credit || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Account Transactions: {accountName || "Unknown Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Debits</p>
                  <p className="text-xl font-bold">
                    <CurrencyDisplay amount={totalDebits} />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                  <p className="text-xl font-bold">
                    <CurrencyDisplay amount={totalCredits} />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Movement</p>
                  <p className={`text-xl font-bold ${totalDebits - totalCredits >= 0 ? "text-primary" : "text-destructive"}`}>
                    <CurrencyDisplay amount={totalDebits - totalCredits} />
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => {
                    const entry = t.journal_entries as any;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          {format(new Date(entry.entry_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.entry_number}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {t.description || entry.description}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {t.debit ? <CurrencyDisplay amount={t.debit} /> : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {t.credit ? <CurrencyDisplay amount={t.credit} /> : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found for this account
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
