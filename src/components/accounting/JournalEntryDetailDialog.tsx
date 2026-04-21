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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
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
import { AlertTriangle, ArrowLeftRight, Eye, ExternalLink, FileText, Info } from "lucide-react";
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

interface RelatedDocument {
  type: string;
  documentType: string;
  documentNumber: string;
  amount: number;
  date: string;
  data: any;
  storagePath?: string;  // For operational docs with actual stored PDFs
  documentUrl?: string;  // For AP payment attachments
}

export const JournalEntryDetailDialog = ({ entry, open, onOpenChange }: JournalEntryDetailDialogProps) => {
  const { data: lines, isLoading } = useJournalEntryLines(entry?.id);
  const reverseEntry = useReverseJournalEntry();
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<RelatedDocument | null>(null);

  const { data: relatedDocs, isLoading: docsLoading } = useQuery({
    queryKey: ["je-related-docs", entry?.id],
    enabled: !!entry?.id && open,
    queryFn: async () => {
      const entryId = entry.id;
      const docs: RelatedDocument[] = [];

      const [arInv, apInv, arRec, apPay, spPay, bankTx] = await Promise.all([
        supabase.from("ar_invoices").select("*, customers(name)").eq("journal_entry_id", entryId),
        supabase.from("ap_invoices").select("*, vendors(name)").eq("journal_entry_id", entryId),
        supabase.from("ar_receipts").select("*, customers(name)").eq("journal_entry_id", entryId),
        supabase.from("ap_payments").select("*, vendors(name)").eq("journal_entry_id", entryId),
        supabase.from("special_hire_payments").select("*").eq("journal_entry_id", entryId),
        supabase.from("bank_transactions").select("*, bank_accounts(account_name)").eq("journal_entry_id", entryId),
      ]);

      arInv.data?.forEach((d: any) => docs.push({
        type: "AR Invoice",
        documentType: "ar_invoice",
        documentNumber: d.invoice_number,
        amount: d.total_amount,
        date: d.invoice_date,
        data: d,
      }));

      apInv.data?.forEach((d: any) => docs.push({
        type: "AP Invoice",
        documentType: "ap_invoice",
        documentNumber: d.invoice_number,
        amount: d.total_amount,
        date: d.invoice_date,
        data: d,
      }));

      arRec.data?.forEach((d: any) => docs.push({
        type: "AR Receipt",
        documentType: "ar_receipt",
        documentNumber: d.receipt_number,
        amount: d.amount,
        date: d.receipt_date,
        data: d,
      }));

      apPay.data?.forEach((d: any) => docs.push({
        type: "AP Payment",
        documentType: "ap_payment",
        documentNumber: d.payment_number,
        amount: d.amount,
        date: d.payment_date,
        data: d,
        documentUrl: d.document_url || undefined,
      }));

      // For special hire payments, also fetch linked document_storage records
      if (spPay.data && spPay.data.length > 0) {
        const paymentIds = spPay.data.map((p: any) => p.id);
        const { data: storedDocs } = await supabase
          .from("document_storage")
          .select("id, payment_id, storage_path, document_status, created_at, document_type")
          .in("payment_id", paymentIds)
          .eq("document_status", "approved")
          .order("created_at", { ascending: false });

        spPay.data.forEach((d: any) => {
          const linkedDoc = storedDocs?.find((sd: any) => sd.payment_id === d.id);
          docs.push({
            type: "Special Hire Payment",
            documentType: "special_hire_payment",
            documentNumber: d.receipt_number || d.id?.slice(0, 8),
            amount: d.amount,
            date: d.payment_date,
            data: d,
            storagePath: linkedDoc?.storage_path || undefined,
          });
        });
      }

      bankTx.data?.forEach((d: any) => docs.push({
        type: "Bank Transaction",
        documentType: "bank_transaction",
        documentNumber: d.reference || d.id?.slice(0, 8),
        amount: d.amount,
        date: d.transaction_date,
        data: d,
      }));

      return docs;
    },
  });

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

            <Separator />

            {/* Related Documents */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Related Documents
              </h3>
              {docsLoading ? (
                <p className="text-muted-foreground text-sm">Searching for related documents...</p>
              ) : !relatedDocs || relatedDocs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No linked source documents found for this journal entry.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Document #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatedDocs.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{doc.documentNumber}</TableCell>
                        <TableCell className="text-right font-medium">
                          <CurrencyDisplay amount={doc.amount} />
                        </TableCell>
                        <TableCell className="text-sm">
                          <DateDisplay date={doc.date} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setPreviewDoc(doc)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {doc.storagePath && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  const { data } = supabase.storage.from("generated-documents").getPublicUrl(doc.storagePath!);
                                  window.open(data.publicUrl, "_blank");
                                }}
                                title="View Stored PDF"
                              >
                                <ExternalLink className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            {doc.documentUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={async () => {
                                  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.documentUrl!, 60);
                                  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
                                  else console.error("Attachment signed URL failed", error);
                                }}
                                title="View Attachment"
                              >
                                <ExternalLink className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
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

      {/* Document Preview Modal */}
      {previewDoc && (
        <FinanceDocumentPreviewModal
          open={!!previewDoc}
          onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
          documentType={previewDoc.documentType}
          documentData={previewDoc.data}
          companyId={entry.company_id}
        />
      )}
    </>
  );
};
