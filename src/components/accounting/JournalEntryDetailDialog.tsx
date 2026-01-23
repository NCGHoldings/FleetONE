import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { useJournalEntryLines } from "@/hooks/useAccountingData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

interface JournalEntryDetailDialogProps {
  entry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JournalEntryDetailDialog = ({ entry, open, onOpenChange }: JournalEntryDetailDialogProps) => {
  const { data: lines, isLoading } = useJournalEntryLines(entry?.id);

  if (!entry) return null;

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "posted": return "default";
      case "draft": return "secondary";
      case "rejected": 
      case "void": return "destructive";
      case "reversed": return "outline";
      default: return "secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Journal Entry: {entry.entry_number}
            <Badge variant={getStatusVariant(entry.status)}>
              {entry.status?.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Entry Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium"><DateDisplay date={entry.entry_date} /></p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-medium">{entry.reference || "-"}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Total Debit</p>
              <p className="font-medium text-emerald-600"><CurrencyDisplay amount={entry.total_debit} /></p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Total Credit</p>
              <p className="font-medium text-primary"><CurrencyDisplay amount={entry.total_credit} /></p>
            </Card>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p>{entry.description}</p>
          </div>

          <Separator />

          {/* Entry Lines */}
          <div>
            <h3 className="font-semibold mb-3">Entry Lines</h3>
            {isLoading ? (
              <p className="text-muted-foreground">Loading lines...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines?.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-sm">
                        {line.chart_of_accounts?.account_code} - {line.chart_of_accounts?.account_name}
                      </TableCell>
                      <TableCell>{line.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        {line.debit > 0 ? <CurrencyDisplay amount={line.debit} /> : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit > 0 ? <CurrencyDisplay amount={line.credit} /> : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">
                      <CurrencyDisplay amount={entry.total_debit} />
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <CurrencyDisplay amount={entry.total_credit} />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>

          {/* Audit Info */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <div className="flex gap-6">
              <span>Created: {new Date(entry.created_at).toLocaleString()}</span>
              {entry.posted_at && <span>Posted: {new Date(entry.posted_at).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
