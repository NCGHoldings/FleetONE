import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConsolidateAPPayments } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface ConsolidatePaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPayments: any[];
}

export const ConsolidatePaymentsDialog = ({ open, onOpenChange, selectedPayments }: ConsolidatePaymentsDialogProps) => {
  const consolidateMutation = useConsolidateAPPayments();

  const handleConsolidate = async () => {
    if (selectedPayments.length < 2) return;

    await consolidateMutation.mutateAsync({
      payment_ids: selectedPayments.map(p => p.id),
    });

    onOpenChange(false);
  };

  const totalAmount = selectedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const oldestPayment = [...selectedPayments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Consolidate AP Payments</DialogTitle>
          <DialogDescription>
            You are about to merge {selectedPayments.length} payments into a single document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Payments to be merged:</h4>
            <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
              {selectedPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-mono">{payment.payment_number}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(payment.payment_date), "MMM dd, yyyy")}</div>
                  </div>
                  <CurrencyDisplay amount={payment.amount} className="font-medium" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 bg-muted/30 p-4 rounded-lg border mt-4">
            <h4 className="font-semibold text-sm">Consolidated Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Master Document</span>
                <span className="font-mono">{oldestPayment?.payment_number}</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center font-bold text-base">
                <span>Grand Total</span>
                <CurrencyDisplay amount={totalAmount} />
              </div>
            </div>

            <Alert variant="warning" className="bg-orange-50 border-orange-200 mt-4">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-xs mt-0">
                <strong>Audit Trail Notice:</strong> The original Journal Entries for all selected payments will be automatically reversed. A single new Journal Entry will be posted reflecting the combined Grand Total.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConsolidate} 
            disabled={selectedPayments.length < 2 || consolidateMutation.isPending}
            className="gap-2"
          >
            {consolidateMutation.isPending ? "Consolidating..." : (
              <>
                Confirm Consolidation <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
