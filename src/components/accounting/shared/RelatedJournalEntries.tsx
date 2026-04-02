import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { StatusBadge } from "./StatusBadge";
import { JournalEntryDetailDialog } from "../JournalEntryDetailDialog";
import { Separator } from "@/components/ui/separator";

interface RelatedJournalEntriesProps {
  sourceId: string;
  sourceType: "ar_invoice" | "ap_invoice" | "ar_receipt" | "ap_payment";
}

interface JELine {
  id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  account?: { account_code: string; account_name: string } | null;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  status: string;
  description: string;
  is_reversal: boolean;
  reversed_entry_id: string | null;
  source_module: string | null;
  journal_entry_lines: JELine[];
  _source_label?: string;
}

export const RelatedJournalEntries = ({ sourceId, sourceType }: RelatedJournalEntriesProps) => {
  const [selectedJEId, setSelectedJEId] = useState<string | null>(null);

  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ["related-journal-entries", sourceType, sourceId],
    queryFn: async () => {
      const jeIds: { id: string; label: string }[] = [];

      if (sourceType === "ar_invoice") {
        // Get invoice's own JE
        const { data: invoice } = await supabase
          .from("ar_invoices")
          .select("journal_entry_id")
          .eq("id", sourceId)
          .single();
        if (invoice?.journal_entry_id) {
          jeIds.push({ id: invoice.journal_entry_id, label: "Invoice JE" });
        }

        // Get all receipts allocated to this invoice
        const { data: allocations } = await supabase
          .from("ar_receipt_allocations")
          .select("receipt_id, ar_receipts(journal_entry_id, receipt_number)")
          .eq("invoice_id", sourceId);
        allocations?.forEach((a: any) => {
          if (a.ar_receipts?.journal_entry_id) {
            jeIds.push({
              id: a.ar_receipts.journal_entry_id,
              label: `Receipt: ${a.ar_receipts.receipt_number}`,
            });
          }
        });
      } else if (sourceType === "ap_invoice") {
        const { data: invoice } = await supabase
          .from("ap_invoices")
          .select("journal_entry_id")
          .eq("id", sourceId)
          .single();
        if (invoice?.journal_entry_id) {
          jeIds.push({ id: invoice.journal_entry_id, label: "Invoice JE" });
        }

        const { data: allocations } = await supabase
          .from("ap_payment_allocations")
          .select("payment_id, ap_payments(journal_entry_id, payment_number)")
          .eq("invoice_id", sourceId);
        allocations?.forEach((a: any) => {
          if (a.ap_payments?.journal_entry_id) {
            jeIds.push({
              id: a.ap_payments.journal_entry_id,
              label: `Payment: ${a.ap_payments.payment_number}`,
            });
          }
        });
      } else if (sourceType === "ar_receipt") {
        const { data: receipt } = await supabase
          .from("ar_receipts")
          .select("journal_entry_id")
          .eq("id", sourceId)
          .single();
        if (receipt?.journal_entry_id) {
          jeIds.push({ id: receipt.journal_entry_id, label: "Receipt JE" });
        }
      } else if (sourceType === "ap_payment") {
        const { data: payment } = await supabase
          .from("ap_payments")
          .select("journal_entry_id")
          .eq("id", sourceId)
          .single();
        if (payment?.journal_entry_id) {
          jeIds.push({ id: payment.journal_entry_id, label: "Payment JE" });
        }
      }

      if (jeIds.length === 0) return [];

      const uniqueIds = [...new Set(jeIds.map((j) => j.id))];
      const { data: entries } = await supabase
        .from("journal_entries")
        .select(`
          id, entry_number, entry_date, status, description, is_reversal, reversed_entry_id, source_module,
          journal_entry_lines(id, account_id, debit, credit, description,
            account:chart_of_accounts(account_code, account_name))
        `)
        .in("id", uniqueIds)
        .order("entry_date", { ascending: true });

      // Also fetch reversal entries that reference these JEs
      const { data: reversals } = await supabase
        .from("journal_entries")
        .select(`
          id, entry_number, entry_date, status, description, is_reversal, reversed_entry_id, source_module,
          journal_entry_lines(id, account_id, debit, credit, description,
            account:chart_of_accounts(account_code, account_name))
        `)
        .in("reversed_entry_id", uniqueIds)
        .eq("is_reversal", true);

      const allEntries = [...(entries || []), ...(reversals || [])];
      // Deduplicate
      const seen = new Set<string>();
      const deduped: JournalEntry[] = [];
      for (const e of allEntries) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          const labelMatch = jeIds.find((j) => j.id === e.id);
          deduped.push({
            ...e,
            is_reversal: e.is_reversal ?? false,
            journal_entry_lines: (e.journal_entry_lines || []) as JELine[],
            _source_label: labelMatch?.label || (e.is_reversal ? "Reversal" : "Journal Entry"),
          });
        }
      }

      return deduped.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    },
    enabled: !!sourceId,
  });

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Loading journal entries...
      </div>
    );
  }

  if (!journalEntries || journalEntries.length === 0) {
    return (
      <div className="py-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          No related journal entries found
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <Separator className="mb-4" />
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Related Journal Entries ({journalEntries.length})</h4>
      </div>

      <div className="space-y-3">
        {journalEntries.map((je) => (
          <Card key={je.id} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{je.entry_number}</span>
                <StatusBadge status={je.status} />
                {je.is_reversal && (
                  <Badge variant="outline" className="text-xs">Reversal</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {je._source_label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(je.entry_date), "MMM dd, yyyy")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSelectedJEId(je.id)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {je.description && (
              <p className="text-xs text-muted-foreground mb-2">{je.description}</p>
            )}

            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="text-xs py-1">Account</TableHead>
                  <TableHead className="text-xs py-1 text-right">Debit</TableHead>
                  <TableHead className="text-xs py-1 text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {je.journal_entry_lines.map((line) => (
                  <TableRow key={line.id} className="h-7">
                    <TableCell className="text-xs py-1">
                      {(line.account as any)?.account_code} - {(line.account as any)?.account_name || line.description}
                    </TableCell>
                    <TableCell className="text-xs py-1 text-right">
                      {line.debit_amount > 0 ? <CurrencyDisplay amount={line.debit_amount} /> : "-"}
                    </TableCell>
                    <TableCell className="text-xs py-1 text-right">
                      {line.credit_amount > 0 ? <CurrencyDisplay amount={line.credit_amount} /> : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>

      {selectedJEId && (
        <JournalEntryDetailDialog
          entryId={selectedJEId}
          open={!!selectedJEId}
          onOpenChange={(open) => { if (!open) setSelectedJEId(null); }}
        />
      )}
    </div>
  );
};
