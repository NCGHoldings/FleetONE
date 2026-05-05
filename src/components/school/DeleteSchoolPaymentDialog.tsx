import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2, BookOpen, Landmark, FileText, User } from "lucide-react";
import { useDeleteSchoolPayment, useSchoolPaymentDeletionBreakdown } from "@/hooks/useSchoolBusFinance";

interface DeleteSchoolPaymentDialogProps {
  paymentId: string | null;
  paymentAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const DeleteSchoolPaymentDialog = ({ 
  paymentId, 
  paymentAmount, 
  open, 
  onOpenChange,
  onSuccess 
}: DeleteSchoolPaymentDialogProps) => {
  const { data: breakdown, isLoading: loadingBreakdown } = useSchoolPaymentDeletionBreakdown(paymentId);
  const deleteMutation = useDeleteSchoolPayment();

  const handleDelete = async () => {
    if (!paymentId) return;
    await deleteMutation.mutateAsync(paymentId);
    onOpenChange(false);
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete & Reverse Payment
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to completely delete this payment of <strong>LKR {paymentAmount.toLocaleString()}</strong>? 
            This action cannot be undone and will reverse all related financial entries.
          </DialogDescription>
        </DialogHeader>

        {loadingBreakdown ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : breakdown ? (
          <div className="space-y-4 py-2">
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md font-medium border border-destructive/20">
              <p>Warning: This will permanently delete the payment and perform the following reversals:</p>
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg border text-sm">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Student Balance
                </span>
                <span className="font-bold text-amber-600">
                  Revert LKR {Number(breakdown.student_balance_impact || 0).toLocaleString()}
                </span>
              </div>

              {breakdown.has_ar_receipt && (
                <div className="flex justify-between items-start border-t pt-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>AR Receipt</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-destructive">Delete Receipt</span>
                    <p className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {breakdown.ar_receipt_number || "Linked Receipt"}
                    </p>
                  </div>
                </div>
              )}

              {breakdown.je_count > 0 && (
                <div className="flex justify-between items-start border-t pt-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-500" />
                    <span>Journal Entries</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-destructive">Delete {breakdown.je_count} Entry(s)</span>
                    <p className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {breakdown.je_numbers?.join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {breakdown.bank_tx_count > 0 && (
                <div className="flex justify-between items-start border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-purple-500" />
                    <span>Bank Balance</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-purple-600">
                      Reverse LKR {Number(breakdown.bank_balance_restored || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-destructive text-sm text-center py-4">Failed to load reversal breakdown.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteMutation.isPending || loadingBreakdown || !breakdown}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Reverse & Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
