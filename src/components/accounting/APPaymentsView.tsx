import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, DollarSign, TrendingDown, Wallet, Eye, Printer, ArrowRightLeft, Landmark, FileText, Trash2, Paperclip, Pencil, Clock, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditHistoryDialog } from "./shared/EditHistoryDialog";
import { APPaymentEditDialog } from "./APPaymentEditDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ConsolidatePaymentsDialog } from "./ConsolidatePaymentsDialog";
import { ChequePrintPreview } from "./ChequePrintPreview";
import { format, startOfMonth, endOfMonth, isToday, isWithinInterval } from "date-fns";
import { useAPPayments, useVendors, useAllProfiles } from "@/hooks/useAccountingData";
import { useDeleteAPPayment, useApproveAPPayment } from "@/hooks/useAccountingMutations";
import { useBankFees } from "@/hooks/useBankFees";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, ExternalLink } from "lucide-react";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { APPaymentForm } from "./APPaymentForm";
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

export const APPaymentsView = () => {
  const { data: payments, isLoading } = useAPPayments();
  const { data: vendors } = useVendors();
  const deletePayment = useDeleteAPPayment();
  const approvePayment = useApproveAPPayment();
  const { data: bankFees } = useBankFees();
  const { data: profiles } = useAllProfiles();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("_all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("_all");
  
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [isAdvanceMode, setIsAdvanceMode] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [bankFeeOpen, setBankFeeOpen] = useState(false);
  const [feePaymentId, setFeePaymentId] = useState<string | undefined>();
  const [feeBankAccountId, setFeeBankAccountId] = useState<string | undefined>();
  const [chequePrintOpen, setChequePrintOpen] = useState(false);
  const [printCheque, setPrintCheque] = useState<any>(null);
  const [detailPayment, setDetailPayment] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [historyPayment, setHistoryPayment] = useState<any>(null);
  const [selectedPaymentsToConsolidate, setSelectedPaymentsToConsolidate] = useState<any[]>([]);
  const [consolidateDialogOpen, setConsolidateDialogOpen] = useState(false);

  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find(v => v.id === vendorId);
    return vendor?.vendor_name || "Unknown";
  };

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };

  // Resolve display label for any payee type (vendor / customer / direct float)
  const getPayeeLabel = (payment: any): string => {
    const type = payment?.payee_type;
    if (type === "customer") {
      const name = payment?.customers?.customer_name;
      return name ? `${name} (Customer)` : "Customer";
    }
    if (type === "direct" || payment?.is_direct_payment) {
      const bus = payment?.bus_no;
      return bus ? `Bus ${bus} (Fuel Float)` : "Direct (Float)";
    }
    // vendor (default)
    const vendorName = payment?.vendors?.vendor_name || (payment?.vendor_id ? getVendorName(payment.vendor_id) : null);
    if (vendorName && vendorName !== "Unknown") return vendorName;
    // last-chance fallbacks
    if (payment?.bus_no) return `Bus ${payment.bus_no} (Fuel Float)`;
    return "Unknown";
  };

  // Open an attached document via signed URL
  const openAttachment = async (path: string, download = false) => {
    try {
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60, download ? { download: true } : undefined);
      if (error || !data?.signedUrl) throw error || new Error("No signed URL");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e: any) {
      toast.error("Could not open attachment", { description: e?.message || "File may no longer exist." });
    }
  };

  // Build a preview URL for inline display in the details dialog
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const loadPreviewUrl = async (path: string) => {
    setPreviewUrl(null);
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 300);
    if (data?.signedUrl) setPreviewUrl(data.signedUrl);
  };
  const hasLinkedFees = (paymentId: string) => {
    return bankFees?.some(f => f.ap_payment_id === paymentId);
  };

  // Calculate summary metrics
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const todayPayments = payments?.filter(p => isToday(new Date(p.payment_date))) || [];
  const monthPayments = payments?.filter(p => 
    isWithinInterval(new Date(p.payment_date), { start: monthStart, end: monthEnd })
  ) || [];
  const advancePayments = payments?.filter(p => p.is_advance) || [];

  const totalToday = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalMonth = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalAdvances = advancePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Total bank fees this month
  const monthBankFees = bankFees?.filter(f => 
    f.ap_payment_id && isWithinInterval(new Date(f.fee_date), { start: monthStart, end: monthEnd })
  ) || [];
  const totalMonthFees = monthBankFees.reduce((sum, f) => sum + (f.amount || 0), 0);

  // Filter payments
  const filteredPayments = payments?.filter(payment => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      payment.payment_number.toLowerCase().includes(term) ||
      getPayeeLabel(payment).toLowerCase().includes(term) ||
      payment.reference?.toLowerCase().includes(term) ||
      payment.cheque_number?.toLowerCase().includes(term) ||
      (payment as any).bus_no?.toLowerCase?.().includes(term);

    const matchesVendor = selectedVendor === "_all" || payment.vendor_id === selectedVendor;
    const matchesMethod = paymentMethodFilter === "_all" || payment.payment_method === paymentMethodFilter;

    return matchesSearch && matchesVendor && matchesMethod;
  }) || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPaymentsToConsolidate(filteredPayments);
    } else {
      setSelectedPaymentsToConsolidate([]);
    }
  };

  const handleSelectPayment = (checked: boolean, payment: any) => {
    if (checked) {
      setSelectedPaymentsToConsolidate(prev => [...prev, payment]);
    } else {
      setSelectedPaymentsToConsolidate(prev => prev.filter(p => p.id !== payment.id));
    }
  };

  const handleOpenPayment = (advance: boolean = false) => {
    setIsAdvanceMode(advance);
    setPaymentFormOpen(true);
  };

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPreviewOpen(true);
  };

  const handleAddBankFee = (payment: any) => {
    setFeePaymentId(payment.id);
    setFeeBankAccountId(payment.bank_account_id);
    setBankFeeOpen(true);
  };

  const handlePrintCheque = (payment: any) => {
    if (payment.payment_method === "cheque") {
      setPrintCheque({
        cheque_number: payment.cheque_number || "",
        cheque_date: payment.cheque_date || payment.payment_date,
        payee: getPayeeLabel(payment),
        amount: payment.amount,
        bank_account_name: payment.bank_account_id || "",
        reference: payment.reference,
      });
      setChequePrintOpen(true);
    } else {
      // For non-cheque payments, open the voucher preview
      handleViewPayment(payment);
    }
  };

  const getStatusBadge = (payment: any) => {
    if (payment.is_advance) {
      return <Badge variant="secondary">Advance</Badge>;
    }
    if (payment.approval_status === "pending") {
      return <Badge variant="outline">Pending Approval</Badge>;
    }
    return <Badge variant="default">{payment.status || "Posted"}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      bank_transfer: "Bank Transfer",
      cheque: "Cheque",
      online: "Online",
      direct: "Direct (Float)",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Payments Today</p>
              <h3 className="text-2xl font-bold mt-2">
                <CurrencyDisplay amount={totalToday} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{todayPayments.length} transactions</p>
            </div>
            <DollarSign className="h-10 w-10 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <h3 className="text-2xl font-bold mt-2">
                <CurrencyDisplay amount={totalMonth} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{monthPayments.length} transactions</p>
            </div>
            <TrendingDown className="h-10 w-10 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unallocated Advances</p>
              <h3 className="text-2xl font-bold mt-2 text-orange-600">
                <CurrencyDisplay amount={totalAdvances} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{advancePayments.length} advance payments</p>
            </div>
            <Wallet className="h-10 w-10 text-orange-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bank Fees (Month)</p>
              <h3 className="text-2xl font-bold mt-2">
                <CurrencyDisplay amount={totalMonthFees} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{monthBankFees.length} charges</p>
            </div>
            <Landmark className="h-10 w-10 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenPayment(false)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
          <Button variant="outline" onClick={() => handleOpenPayment(true)}>
            <Wallet className="h-4 w-4 mr-2" />
            Record Advance
          </Button>
          {selectedPaymentsToConsolidate.length >= 2 && (
            <Button variant="secondary" onClick={() => setConsolidateDialogOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Consolidate {selectedPaymentsToConsolidate.length} Payments
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Vendors</SelectItem>
              {vendors?.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
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
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedPaymentsToConsolidate.length === filteredPayments.length && filteredPayments.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Payment #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Cheque #</TableHead>
              <TableHead>Vendor Bill #</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Bank Fee</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                 <TableCell colSpan={12} className="text-center py-8">
                   Loading payments...
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedPaymentsToConsolidate.some(p => p.id === payment.id)}
                      onCheckedChange={(checked) => handleSelectPayment(!!checked, payment)}
                      aria-label={`Select payment ${payment.payment_number}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-1">
                      {payment.payment_number}
                      {hasLinkedFees(payment.id) && (
                        <Badge variant="outline" className="text-xs ml-1">Fees</Badge>
                      )}
                      {(payment as any).document_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-1"
                          onClick={() => openAttachment((payment as any).document_url)}
                          title="Open attached document"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                    </div>
                    {(payment as any).legacy_number && (payment as any).legacy_number !== payment.payment_number && (
                      <div className="text-[10px] text-muted-foreground/60 mt-0.5">was: {(payment as any).legacy_number}</div>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getPayeeLabel(payment)}</TableCell>
                  <TableCell>{getPaymentMethodLabel(payment.payment_method || "")}</TableCell>
                  <TableCell className="font-mono">{payment.cheque_number || "-"}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{(payment as any).vendor_bill_number || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.reference || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <CurrencyDisplay amount={payment.amount} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {(payment as any).bank_fee_amount > 0 ? (
                      <CurrencyDisplay amount={(payment as any).bank_fee_amount} />
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <CurrencyDisplay amount={(payment as any).total_with_fees || payment.amount} />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {getCreatorName(payment.created_by)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(payment)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {(payment as any).approval_status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 gap-1"
                          onClick={() => approvePayment.mutate(payment.id)}
                          disabled={approvePayment.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { setDetailPayment(payment); if ((payment as any).document_url) loadPreviewUrl((payment as any).document_url); else setPreviewUrl(null); }} title="View Details">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingPayment(payment)} title="Edit Payment">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setHistoryPayment(payment)} title="Edit History">
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleViewPayment(payment)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(payment as any).document_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAttachment((payment as any).document_url)}
                          title="View attachment"
                          className="text-primary"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleAddBankFee(payment)} title="Add Bank Fee">
                        <Landmark className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintCheque(payment)}
                        title={payment.payment_method === "cheque" ? "Print Cheque" : "Print Voucher"}
                        className={payment.payment_method === "cheque" ? "text-primary" : ""}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {payment.is_advance && (
                        <Button variant="ghost" size="icon" title="Allocate to Invoice">
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Payment" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Payment {payment.payment_number}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reverse all linked Journal Entries, restore bank balance, and remove payment allocations. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deletePayment.mutate(payment.id)}
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

      {/* Payment Form Dialog */}
      <APPaymentForm 
        open={paymentFormOpen} 
        onOpenChange={setPaymentFormOpen}
        isAdvanceMode={isAdvanceMode}
      />

      {/* Bank Fee Form */}
      <BankFeeForm
        open={bankFeeOpen}
        onOpenChange={setBankFeeOpen}
        apPaymentId={feePaymentId}
        defaultBankAccountId={feeBankAccountId}
      />

      {/* Preview Modal */}
      {selectedPayment && (
        <FinanceDocumentPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          documentType="ap_payment_voucher"
          documentData={selectedPayment}
          companyId={selectedPayment?.company_id}
          businessUnitCode={selectedPayment?.business_unit_code}
        />
      )}

      {/* Cheque Print Preview */}
      <ChequePrintPreview
        open={chequePrintOpen}
        onOpenChange={setChequePrintOpen}
        cheque={printCheque}
      />

      {/* Payment Detail Dialog */}
      <Dialog open={!!detailPayment} onOpenChange={(open) => { if (!open) { setDetailPayment(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              {detailPayment?.payment_number}
            </DialogDescription>
          </DialogHeader>
          {detailPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment #</p>
                  <p className="font-mono font-medium">{detailPayment.payment_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(detailPayment.payment_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{getVendorName(detailPayment.vendor_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p className="font-medium">{getPaymentMethodLabel(detailPayment.payment_method || "")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg"><CurrencyDisplay amount={detailPayment.amount} /></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium">{detailPayment.reference || "-"}</p>
                </div>
              </div>

              {/* Bank Fee Details */}
              {(detailPayment as any).bank_fee_amount > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Fee</p>
                      <p className="font-bold"><CurrencyDisplay amount={(detailPayment as any).bank_fee_amount} /></p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fee Type</p>
                      <p className="font-medium capitalize">{((detailPayment as any).bank_fee_type || "bank_charge").replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total (incl. Fee)</p>
                      <p className="font-bold text-lg"><CurrencyDisplay amount={(detailPayment as any).total_with_fees || detailPayment.amount} /></p>
                    </div>
                  </div>
                </>
              )}

              {detailPayment.cheque_number && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Cheque #</p>
                      <p className="font-mono font-medium">{detailPayment.cheque_number}</p>
                    </div>
                    {detailPayment.cheque_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Cheque Date</p>
                        <p className="font-medium">{format(new Date(detailPayment.cheque_date), "MMM dd, yyyy")}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {detailPayment.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{detailPayment.notes}</p>
                  </div>
                </>
              )}

              {detailPayment.document_url && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Attachment</p>
                        <p className="font-medium text-sm break-all">{String(detailPayment.document_url).split("/").pop()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openAttachment(detailPayment.document_url)}>
                          <ExternalLink className="h-4 w-4 mr-1" /> Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAttachment(detailPayment.document_url, true)}>
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                    {previewUrl && (() => {
                      const path = String(detailPayment.document_url).toLowerCase();
                      if (/\.(png|jpe?g|webp|gif)$/.test(path)) {
                        return <img src={previewUrl} alt="Attachment preview" className="max-h-96 w-auto rounded border" />;
                      }
                      if (path.endsWith(".pdf")) {
                        return <iframe src={previewUrl} className="w-full h-96 rounded border" title="Attachment preview" />;
                      }
                      return <p className="text-xs text-muted-foreground">Preview not available — use Open or Download.</p>;
                    })()}
                  </div>
                </>
              )}

              <RelatedJournalEntries sourceId={detailPayment.id} sourceType="ap_payment" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <APPaymentEditDialog
        open={!!editingPayment}
        onOpenChange={(open) => { if (!open) setEditingPayment(null); }}
        payment={editingPayment}
      />

      {/* Edit History Dialog */}
      <EditHistoryDialog
        open={!!historyPayment}
        onOpenChange={(open) => { if (!open) setHistoryPayment(null); }}
        history={(historyPayment as any)?.edit_history || []}
        documentNumber={historyPayment?.payment_number || ""}
      />

      <ConsolidatePaymentsDialog
        open={consolidateDialogOpen}
        onOpenChange={(open) => {
          setConsolidateDialogOpen(open);
          if (!open) setSelectedPaymentsToConsolidate([]);
        }}
        selectedPayments={selectedPaymentsToConsolidate}
      />
    </div>
  );
};
