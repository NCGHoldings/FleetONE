import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, Clock, AlertTriangle } from "lucide-react";
import { useJournalEntries, useAPInvoices, useAPPayments, usePurchaseOrders } from "@/hooks/useAccountingData";
import { 
  useApproveJournalEntry, 
  useApproveAPInvoice, 
  useApproveAPPayment,
  useRejectJournalEntry,
  useRejectAPInvoice,
  useRejectAPPayment,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
} from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const PendingApprovalsView = () => {
  const { data: journalEntries } = useJournalEntries("draft");
  const { data: apInvoices } = useAPInvoices();
  const { data: apPayments } = useAPPayments();
  const { data: purchaseOrders } = usePurchaseOrders("pending_approval");

  const approveJE = useApproveJournalEntry();
  const approveAPInv = useApproveAPInvoice();
  const approveAPPay = useApproveAPPayment();
  const approvePO = useApprovePurchaseOrder();
  
  const rejectJE = useRejectJournalEntry();
  const rejectAPInv = useRejectAPInvoice();
  const rejectAPPay = useRejectAPPayment();
  const rejectPO = useRejectPurchaseOrder();

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; type: string; id: string }>({
    open: false,
    type: "",
    id: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  const pendingJournals = journalEntries?.filter(je => je.status === "draft") || [];
  const pendingAPInvoices = apInvoices?.filter(inv => inv.approval_status === "pending") || [];
  const pendingAPPayments = apPayments?.filter(pay => pay.approval_status === "pending") || [];
  const pendingPOs = purchaseOrders?.filter(po => po.status === "pending_approval") || [];

  const totalPending = pendingJournals.length + pendingAPInvoices.length + pendingAPPayments.length + pendingPOs.length;

  const handleApprove = async (type: string, id: string) => {
    try {
      if (type === "journal") {
        await approveJE.mutateAsync({ entryId: id, level: 2 });
      } else if (type === "ap_invoice") {
        await approveAPInv.mutateAsync(id);
      } else if (type === "ap_payment") {
        await approveAPPay.mutateAsync(id);
      } else if (type === "purchase_order") {
        await approvePO.mutateAsync(id);
      }
      toast.success("Approved successfully");
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    
    try {
      const { type, id } = rejectDialog;
      if (type === "journal") {
        await rejectJE.mutateAsync({ id, reason: rejectReason });
      } else if (type === "ap_invoice") {
        await rejectAPInv.mutateAsync({ id, reason: rejectReason });
      } else if (type === "ap_payment") {
        await rejectAPPay.mutateAsync({ id, reason: rejectReason });
      } else if (type === "purchase_order") {
        await rejectPO.mutateAsync({ id, reason: rejectReason });
      }
      toast.success("Rejected successfully");
      setRejectDialog({ open: false, type: "", id: "" });
      setRejectReason("");
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Pending Approvals</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve pending transactions
          </p>
        </div>
        {totalPending > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {totalPending} Pending
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Journal Entries</p>
              <h3 className="text-2xl font-bold mt-1">{pendingJournals.length}</h3>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AP Invoices</p>
              <h3 className="text-2xl font-bold mt-1">{pendingAPInvoices.length}</h3>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AP Payments</p>
              <h3 className="text-2xl font-bold mt-1">{pendingAPPayments.length}</h3>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="journals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="journals">
              Journal Entries ({pendingJournals.length})
            </TabsTrigger>
            <TabsTrigger value="ap_invoices">
              AP Invoices ({pendingAPInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="ap_payments">
              AP Payments ({pendingAPPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journals" className="space-y-4">
            {pendingJournals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending journal entries</p>
            ) : (
              <div className="space-y-3">
                {pendingJournals.map((je) => (
                  <div key={je.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">{je.entry_number}</span>
                        <Badge variant="outline">Draft</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{je.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(je.entry_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-semibold">
                        <CurrencyDisplay amount={je.total_debit || 0} />
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600"
                        onClick={() => handleApprove("journal", je.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive"
                        onClick={() => setRejectDialog({ open: true, type: "journal", id: je.id })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ap_invoices" className="space-y-4">
            {pendingAPInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending AP invoices</p>
            ) : (
              <div className="space-y-3">
                {pendingAPInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">{inv.invoice_number}</span>
                        <Badge variant="outline">Pending Approval</Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {inv.vendors?.vendor_name || "Unknown Vendor"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(inv.due_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-semibold">
                        <CurrencyDisplay amount={inv.total_amount || 0} />
                      </p>
                      {inv.wht_amount > 0 && (
                        <p className="text-xs text-orange-600">
                          WHT: <CurrencyDisplay amount={inv.wht_amount} />
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600"
                        onClick={() => handleApprove("ap_invoice", inv.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive"
                        onClick={() => setRejectDialog({ open: true, type: "ap_invoice", id: inv.id })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ap_payments" className="space-y-4">
            {pendingAPPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending AP payments</p>
            ) : (
              <div className="space-y-3">
                {pendingAPPayments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">{pay.payment_number}</span>
                        <Badge variant="outline">Pending Approval</Badge>
                        <Badge variant="secondary">{pay.payment_method}</Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {pay.vendors?.vendor_name || "Unknown Vendor"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pay.payment_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-semibold">
                        <CurrencyDisplay amount={pay.amount || 0} />
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600"
                        onClick={() => handleApprove("ap_payment", pay.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive"
                        onClick={() => setRejectDialog({ open: true, type: "ap_payment", id: pay.id })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, type: "", id: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
