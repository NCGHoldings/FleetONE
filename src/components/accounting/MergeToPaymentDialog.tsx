import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAPPayments } from "@/hooks/useAccountingData";
import { useMergeInvoiceToAPPayment } from "@/hooks/useAccountingMutations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface MergeToPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
}

export const MergeToPaymentDialog = ({ open, onOpenChange, invoice }: MergeToPaymentDialogProps) => {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const { data: payments, isLoading: isLoadingPayments } = useAPPayments();
  const mergeMutation = useMergeInvoiceToAPPayment();

  const vendorPayments = useMemo(() => {
    if (!invoice?.vendor_id || !payments) return [];
    // Only show posted, non-advance payments for the same vendor
    return payments.filter(p => 
      p.vendor_id === invoice.vendor_id && 
      p.status !== "draft" && 
      p.status !== "cancelled" &&
      !p.is_advance &&
      !p.is_direct_payment
    );
  }, [payments, invoice]);

  const selectedPayment = vendorPayments.find(p => p.id === selectedPaymentId);

  const handleMerge = async () => {
    if (!invoice || !selectedPaymentId) return;

    await mergeMutation.mutateAsync({
      payment_id: selectedPaymentId,
      invoice_id: invoice.id,
      allocated_amount: invoice.balance,
    });

    onOpenChange(false);
    setSelectedPaymentId("");
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Invoice into Payment</DialogTitle>
          <DialogDescription>
            Add invoice <span className="font-mono">{invoice.invoice_number}</span> to an existing AP Payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Payment to Merge Into</label>
            <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingPayments ? "Loading..." : "Select existing payment"} />
              </SelectTrigger>
              <SelectContent>
                {vendorPayments.map((payment) => (
                  <SelectItem key={payment.id} value={payment.id}>
                    {payment.payment_number} - {format(new Date(payment.payment_date), "MMM dd, yyyy")} (<CurrencyDisplay amount={payment.amount} />)
                  </SelectItem>
                ))}
                {vendorPayments.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No posted payments found for this vendor.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPayment && (
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm">Full Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Current Payment Total</span>
                  <CurrencyDisplay amount={selectedPayment.amount} />
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>+ Invoice to Add</span>
                  <CurrencyDisplay amount={invoice.balance} />
                </div>
                <div className="pt-2 border-t flex justify-between items-center font-bold text-base">
                  <span>New Payment Total</span>
                  <CurrencyDisplay amount={selectedPayment.amount + invoice.balance} />
                </div>
              </div>

              <Alert variant="warning" className="bg-orange-50 border-orange-200 mt-4">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-xs mt-0">
                  <strong>Audit Trail Notice:</strong> The original Journal Entry ({selectedPayment.journal_entries?.entry_number}) will be automatically reversed. A new Journal Entry will be posted reflecting the updated total. Bank balances will be adjusted automatically.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMerge} 
            disabled={!selectedPaymentId || mergeMutation.isPending}
            className="gap-2"
          >
            {mergeMutation.isPending ? "Merging..." : (
              <>
                Confirm Merge <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
