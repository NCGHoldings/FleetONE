import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { useJournalEntryLines, useAllProfiles } from "@/hooks/useAccountingData";
import { useReverseJournalEntry } from "@/hooks/useAccountingMutations";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import { useCompany } from "@/contexts/CompanyContext";
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
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ArrowLeftRight, Eye, ExternalLink, FileText, Info, Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
  const { selectedCompanyId } = useCompany();
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<RelatedDocument | null>(null);
  
  const { data: profiles } = useAllProfiles();
  
  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System / Auto";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };

  // States for Fix Bank Account dialog
  const [showFixBankDialog, setShowFixBankDialog] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [isFixingBank, setIsFixingBank] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts-fix'],
    queryFn: async () => {
       // First fetch all configured bank accounts from school bus settings for the CURRENT company
       const { data: settings } = await supabase.from('school_bus_finance_settings')
          .select('bank_account_id, cash_account_id, sbs_collection_account_id, trade_receivable_account_id')
          .eq('company_id', selectedCompanyId || entry?.company_id);
       
       let validIds = new Set<string>();
       settings?.forEach(s => {
         if (s.bank_account_id) validIds.add(s.bank_account_id);
         if (s.cash_account_id) validIds.add(s.cash_account_id);
         if (s.sbs_collection_account_id) validIds.add(s.sbs_collection_account_id);
         if (s.trade_receivable_account_id) validIds.add(s.trade_receivable_account_id);
       });

       if (validIds.size === 0) {
         // Fallback: fetch all bank and cash accounts for the current company
         const { data, error } = await supabase.from('chart_of_accounts')
          .select('id, account_code, account_name, account_type')
          .eq('company_id', selectedCompanyId || entry?.company_id)
          .in('account_type', ['Bank', 'Cash'])
          .order('account_name');
          
         if (error) {
           console.error("Error fetching fallback accounts:", error);
           return [];
         }
         return data || [];
       }

       // Fetch ONLY the accounts that have been mapped in the settings
       const { data, error } = await supabase.from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .in('id', Array.from(validIds))
        .order('account_name');
        
       if (error) {
         console.error("Error fetching accounts:", error);
         return [];
       }
       
       return data || [];
    },
    enabled: showFixBankDialog
  });

  const handleFixBank = async () => {
    if (!selectedBankAccountId) {
      toast.error("Please select a bank account first");
      return;
    }

    try {
      setIsFixingBank(true);
      const bankDebitLine = lines?.find((l: any) => l.debit > 0 && l.description?.includes('Payment received'));
      if (!bankDebitLine) throw new Error("Could not find bank debit line");

      const oldAccountId = bankDebitLine.account_id;
      if (oldAccountId === selectedBankAccountId) {
        toast.info("This is already the selected account.");
        setShowFixBankDialog(false);
        return;
      }

      const { data: newAccount } = await supabase.from('chart_of_accounts').select('account_name, current_balance').eq('id', selectedBankAccountId).single();
      const { data: oldAccount } = await supabase.from('chart_of_accounts').select('account_name, current_balance').eq('id', oldAccountId).single();

      // 1. Revert old account balance
      if (oldAccount) {
        await supabase.from('chart_of_accounts')
          .update({ current_balance: Number(oldAccount.current_balance || 0) - Number(bankDebitLine.debit) })
          .eq('id', oldAccountId);
      }

      // 2. Add to new account balance
      if (newAccount) {
        await supabase.from('chart_of_accounts')
          .update({ current_balance: Number(newAccount.current_balance || 0) + Number(bankDebitLine.debit) })
          .eq('id', selectedBankAccountId);
      }

      // 3. Update journal entry line
      await supabase.from('journal_entry_lines')
        .update({ account_id: selectedBankAccountId })
        .eq('id', bankDebitLine.id);

      toast.success(`Successfully switched bank account to ${newAccount?.account_name || 'selected account'} and corrected COA balances!`);
      setShowFixBankDialog(false);
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to fix bank account");
    } finally {
      setIsFixingBank(false);
    }
  };

  const { data: relatedDocs, isLoading: docsLoading } = useQuery({
    queryKey: ["je-related-docs", entry?.id],
    enabled: !!entry?.id && open,
    queryFn: async () => {
      const entryId = entry.id;
      const docs: RelatedDocument[] = [];

      const [arInv, apInv, arRec, apPay, spPay, bankTx] = await Promise.all([
        supabase.from("ar_invoices").select("*, customers(customer_name)").eq("journal_entry_id", entryId),
        supabase.from("ap_invoices").select("*, vendors(vendor_name)").eq("journal_entry_id", entryId),
        supabase.from("ar_receipts").select("*, customers(customer_name)").eq("journal_entry_id", entryId),
        supabase.from("ap_payments").select("*, vendors(vendor_name)").eq("journal_entry_id", entryId),
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
        documentType: "ap_payment_voucher",
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
            documentType: "ar_receipt",
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
        documentType: "journal_voucher",
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-6">
              <DialogTitle className="flex items-center gap-3 text-xl">
                Journal Entry: {entry.entry_number}
                <Badge variant={getStatusVariant(entry.status)}>
                  {entry.status?.toUpperCase()}
                </Badge>
              </DialogTitle>
              {entry.status === "posted" && !isReversal && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      const bankDebitLine = lines?.find((l: any) => l.debit > 0 && l.description?.includes('Payment received'));
                      if (!bankDebitLine) {
                        toast.error("Could not identify the Bank/Cash debit line to fix.");
                        return;
                      }
                      setShowFixBankDialog(true);
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Fix Bank Account
                  </Button>
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
            </div>
          </DialogHeader>

          <div className="space-y-6 p-6 overflow-y-auto">
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
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <span>Created By: <strong>{getCreatorName(entry.created_by)}</strong></span>
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

      {/* Fix Bank Account Dialog */}
      <Dialog open={showFixBankDialog} onOpenChange={setShowFixBankDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix Bank Account Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              The system mapped the payment debit to: 
              <br />
              <strong className="text-foreground">
                {lines?.find((l: any) => l.debit > 0 && l.description?.includes('Payment received'))?.chart_of_accounts?.account_name || "Unknown"}
              </strong>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Correct Bank/Cash Account</label>
              
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedBankAccountId
                      ? bankAccounts?.find((acc) => acc.id === selectedBankAccountId)?.account_name
                      : "Search and select correct account..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search bank accounts..." />
                    <CommandList>
                      <CommandEmpty>No bank account found.</CommandEmpty>
                      <CommandGroup>
                        {bankAccounts?.map((acc) => (
                          <CommandItem
                            key={acc.id}
                            value={acc.account_name}
                            onSelect={() => {
                              setSelectedBankAccountId(acc.id);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedBankAccountId === acc.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {acc.account_code} - {acc.account_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This will automatically update the Journal Entry and correct the Chart of Accounts running balances for both the old and new accounts.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFixBankDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleFixBank} 
              disabled={!selectedBankAccountId || isFixingBank}
            >
              {isFixingBank ? "Fixing..." : "Confirm & Fix"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
