import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { useJournalEntryLines } from "@/hooks/useAccountingData";
import { useReverseJournalEntry } from "@/hooks/useAccountingMutations";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ArrowLeftRight, Info } from "lucide-react";
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
  const reverseEntry = useReverseJournalEntry();
  const [showConfirm, setShowConfirm] = useState(false);

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

  const isReversed = entry.status === "reversed";
  const isReversal = entry.is_reversal === true;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Journal Entry: {entry.entry_number}
              <Badge variant={getStatusVariant(entry.status)}>
                {entry.status?.toUpperCase()}
              </Badge>
            </DialogTitle>
            {entry.status === "posted" && !isReversal && (
              <div className="absolute right-12 top-4">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowConfirm(true)}
                  disabled={reverseEntry.isPending}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-1" />
                  {reverseEntry.isPending ? "Reversing..." : "Reverse Entry"}
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {/* Reversal Info Banners */}
            {isReversed && entry.reversed_entry_id && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                <span className="text-orange-800 dark:text-orange-300">
                  This entry was <strong>reversed</strong> — a reversal entry has been created to zero out the balances.
                </span>
              </div>
            )}

            {isReversal && entry.reversed_entry_id && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-blue-800 dark:text-blue-300">
                  This is a <strong>reversal entry</strong> — it was created to reverse the original journal entry.
                </span>
              </div>
            )}

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
              ) : !lines || lines.length === 0 ? (
                <p className="text-muted-foreground text-sm">No entry lines found for this journal entry.</p>
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
                    {lines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-medium">
                              {line.chart_of_accounts?.account_code || "N/A"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {line.chart_of_accounts?.account_name || "Unknown Account"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{line.description || "-"}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {line.debit > 0 ? <CurrencyDisplay amount={line.debit} /> : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
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
                {entry.source_module && <span>Module: {entry.source_module}</span>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reversal Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reverse Journal Entry?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to reverse <strong>{entry.entry_number}</strong>. This will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Create a new reversal entry with opposite debit/credit amounts</li>
                <li>Mark the original entry as <strong>"REVERSED"</strong></li>
                <li>Reverse all account balance impacts</li>
              </ul>
              <p className="text-sm font-medium mt-2">
                Both the original and reversal entries will remain visible for audit purposes.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                reverseEntry.mutate(entry.id, {
                  onSuccess: () => onOpenChange(false)
                });
              }}
            >
              Yes, Reverse Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};