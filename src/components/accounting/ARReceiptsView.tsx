import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, DollarSign, TrendingUp, Wallet, Eye, Printer, ArrowRightLeft, Landmark, FileText, Trash2, Pencil, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditHistoryDialog } from "./shared/EditHistoryDialog";
import { ARReceiptEditDialog } from "./ARReceiptEditDialog";
import { format, startOfMonth, endOfMonth, isToday, isWithinInterval } from "date-fns";
import { useARReceipts, useCustomers, useAllProfiles } from "@/hooks/useAccountingData";
import { useDeleteARReceipt } from "@/hooks/useAccountingMutations";
import { useBankFees } from "@/hooks/useBankFees";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { ARReceiptForm } from "./ARReceiptForm";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import { RelatedJournalEntries } from "./shared/RelatedJournalEntries";
import { BankFeeForm } from "./BankFeeForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export const ARReceiptsView = () => {
  const { data: receipts, isLoading } = useARReceipts();
  const { data: customers } = useCustomers();
  const deleteReceipt = useDeleteARReceipt();
  const { data: bankFees } = useBankFees();
  const { data: profiles } = useAllProfiles();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("_all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("_all");
  
  const [receiptFormOpen, setReceiptFormOpen] = useState(false);
  const [isAdvanceMode, setIsAdvanceMode] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [bankFeeOpen, setBankFeeOpen] = useState(false);
  const [feeReceiptId, setFeeReceiptId] = useState<string | undefined>();
  const [feeBankAccountId, setFeeBankAccountId] = useState<string | undefined>();
  const [detailReceipt, setDetailReceipt] = useState<any>(null);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);
  const [historyReceipt, setHistoryReceipt] = useState<any>(null);

  const getCustomerName = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    return customer?.customer_name || "Unknown";
  };

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };

  const hasLinkedFees = (receiptId: string) => {
    return bankFees?.some(f => f.ar_receipt_id === receiptId);
  };

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const todayReceipts = receipts?.filter(r => isToday(new Date(r.receipt_date))) || [];
  const monthReceipts = receipts?.filter(r => 
    isWithinInterval(new Date(r.receipt_date), { start: monthStart, end: monthEnd })
  ) || [];
  const advanceReceipts = receipts?.filter(r => r.is_advance) || [];

  const totalToday = todayReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalMonth = monthReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalAdvances = advanceReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  const filteredReceipts = receipts?.filter(receipt => {
    const matchesSearch = 
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(receipt.customer_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCustomer = selectedCustomer === "_all" || receipt.customer_id === selectedCustomer;
    const matchesMethod = paymentMethodFilter === "_all" || receipt.payment_method === paymentMethodFilter;
    
    return matchesSearch && matchesCustomer && matchesMethod;
  }) || [];

  const handleOpenReceipt = (advance: boolean = false) => {
    setIsAdvanceMode(advance);
    setReceiptFormOpen(true);
  };

  const handleViewReceipt = (receipt: any) => {
    setSelectedReceipt(receipt);
    setPreviewOpen(true);
  };

  const handleAddBankFee = (receipt: any) => {
    setFeeReceiptId(receipt.id);
    setFeeBankAccountId(receipt.bank_account_id);
    setBankFeeOpen(true);
  };

  const getStatusBadge = (receipt: any) => {
    if (receipt.is_advance) {
      return <Badge variant="secondary">Advance</Badge>;
    }
    return <Badge variant="default">{receipt.status || "Posted"}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      bank_transfer: "Bank Transfer",
      cheque: "Cheque",
      card: "Card",
      online: "Online",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receipts Today</p>
              <h3 className="text-2xl font-bold mt-2">
                <CurrencyDisplay amount={totalToday} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{todayReceipts.length} transactions</p>
            </div>
            <DollarSign className="h-10 w-10 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <h3 className="text-2xl font-bold mt-2">
                <CurrencyDisplay amount={totalMonth} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{monthReceipts.length} transactions</p>
            </div>
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unallocated Advances</p>
              <h3 className="text-2xl font-bold mt-2 text-orange-600">
                <CurrencyDisplay amount={totalAdvances} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{advanceReceipts.length} advance receipts</p>
            </div>
            <Wallet className="h-10 w-10 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenReceipt(false)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Receipt
          </Button>
          <Button variant="outline" onClick={() => handleOpenReceipt(true)}>
            <Wallet className="h-4 w-4 mr-2" />
            Record Advance
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Customers</SelectItem>
              {customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.customer_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Receipts Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading receipts...
                </TableCell>
              </TableRow>
            ) : filteredReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No receipts found
                </TableCell>
              </TableRow>
            ) : (
              filteredReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-1">
                      {receipt.receipt_number}
                      {hasLinkedFees(receipt.id) && (
                        <Badge variant="outline" className="text-xs ml-1">Fees</Badge>
                      )}
                    </div>
                    {(receipt as any).legacy_number && (receipt as any).legacy_number !== receipt.receipt_number && (
                      <div className="text-[10px] text-muted-foreground/60 mt-0.5">was: {(receipt as any).legacy_number}</div>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(receipt.receipt_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getCustomerName(receipt.customer_id)}</TableCell>
                  <TableCell>{getPaymentMethodLabel(receipt.payment_method)}</TableCell>
                  <TableCell className="text-muted-foreground">{receipt.reference || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <CurrencyDisplay amount={receipt.amount} />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {getCreatorName(receipt.created_by)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(receipt)}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailReceipt(receipt)} title="View Details">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingReceipt(receipt)} title="Edit Receipt">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setHistoryReceipt(receipt)} title="Edit History">
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleViewReceipt(receipt)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleAddBankFee(receipt)} title="Add Bank Fee">
                        <Landmark className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {receipt.is_advance && (
                        <Button variant="ghost" size="icon" title="Allocate to Invoice">
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Receipt" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Receipt {receipt.receipt_number}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reverse all linked Journal Entries, restore bank balance, and remove receipt allocations. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteReceipt.mutate(receipt.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Receipt Form Dialog */}
      <ARReceiptForm 
        open={receiptFormOpen} 
        onOpenChange={setReceiptFormOpen}
        isAdvanceMode={isAdvanceMode}
      />

      {/* Bank Fee Form */}
      <BankFeeForm
        open={bankFeeOpen}
        onOpenChange={setBankFeeOpen}
        arReceiptId={feeReceiptId}
        defaultBankAccountId={feeBankAccountId}
      />

      {/* Preview Modal */}
      {selectedReceipt && (
        <FinanceDocumentPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          documentType="ar_receipt"
          documentData={selectedReceipt}
          companyId={selectedReceipt?.company_id}
          businessUnitCode={selectedReceipt?.business_unit_code}
        />
      )}

      {/* Receipt Detail Dialog */}
      <Dialog open={!!detailReceipt} onOpenChange={(open) => { if (!open) setDetailReceipt(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              {detailReceipt?.receipt_number}
            </DialogDescription>
          </DialogHeader>
          {detailReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt #</p>
                  <p className="font-mono font-medium">{detailReceipt.receipt_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(detailReceipt.receipt_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{getCustomerName(detailReceipt.customer_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p className="font-medium">{getPaymentMethodLabel(detailReceipt.payment_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg"><CurrencyDisplay amount={detailReceipt.amount} /></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium">{detailReceipt.reference || "-"}</p>
                </div>
              </div>

              {/* Bank Fee Details */}
              {(detailReceipt as any).bank_fee_amount > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Fee</p>
                      <p className="font-bold"><CurrencyDisplay amount={(detailReceipt as any).bank_fee_amount} /></p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fee Type</p>
                      <p className="font-medium capitalize">{((detailReceipt as any).bank_fee_type || "bank_charge").replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net Amount</p>
                      <p className="font-bold text-lg"><CurrencyDisplay amount={detailReceipt.amount - ((detailReceipt as any).bank_fee_amount || 0)} /></p>
                    </div>
                  </div>
                </>
              )}

              {detailReceipt.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{detailReceipt.notes}</p>
                  </div>
                </>
              )}

              <RelatedJournalEntries sourceId={detailReceipt.id} sourceType="ar_receipt" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Receipt Dialog */}
      <ARReceiptEditDialog
        open={!!editingReceipt}
        onOpenChange={(open) => { if (!open) setEditingReceipt(null); }}
        receipt={editingReceipt}
      />

      {/* Edit History Dialog */}
      <EditHistoryDialog
        open={!!historyReceipt}
        onOpenChange={(open) => { if (!open) setHistoryReceipt(null); }}
        history={(historyReceipt as any)?.edit_history || []}
        documentNumber={historyReceipt?.receipt_number || ""}
      />
    </div>
  );
};
