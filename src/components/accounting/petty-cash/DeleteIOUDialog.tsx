import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2, BookOpen, Wallet, Landmark } from "lucide-react";
import { useDeleteIOU, useIOUDeletionBreakdown, IOURecord } from "@/hooks/usePettyCash";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";

interface DeleteIOUDialogProps {
  iou: IOURecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteIOUDialog = ({ iou, open, onOpenChange }: DeleteIOUDialogProps) => {
  const { data: breakdown, isLoading: loadingBreakdown } = useIOUDeletionBreakdown(iou?.id || null);
  const deleteMutation = useDeleteIOU();

  const handleDelete = async () => {
    if (!iou) return;
    await deleteMutation.mutateAsync(iou.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete & Reverse IOU
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to completely delete IOU <strong>{iou?.iou_number}</strong>? 
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
              <p>Warning: This will permanently delete the IOU and perform the following reversals:</p>
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg border text-sm">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-muted-foreground">IOU Amount</span>
                <span className="font-bold"><CurrencyDisplay amount={breakdown.amount || 0} /></span>
              </div>

              {breakdown.je_count > 0 && (
                <div className="flex flex-col border-t pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Journal Entries ({breakdown.je_count})</span>
                  </div>
                  {breakdown.je_impacts && breakdown.je_impacts.length > 0 && (
                    <div className="text-xs bg-background p-2 rounded border space-y-1">
                      {breakdown.je_impacts.map((impact: any, idx: number) => {
                        const amount = impact.debit > 0 ? impact.debit : impact.credit;
                        const isDebit = impact.debit > 0;
                        return (
                          <div key={idx} className="flex justify-between py-1 border-b last:border-0 border-muted">
                            <span className="text-muted-foreground truncate mr-2" title={impact.account_name}>
                              {impact.account_name}
                            </span>
                            <span className={isDebit ? "text-destructive whitespace-nowrap" : "text-green-600 whitespace-nowrap"}>
                              {isDebit ? "- Reversing Debit " : "+ Reversing Credit "}
                              <CurrencyDisplay amount={amount || 0} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    Ref: {breakdown.je_numbers?.join(", ")}
                  </p>
                </div>
              )}

              {breakdown.pc_count > 0 && (
                <div className="flex justify-between items-start border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                    <span>Petty Cash Float</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-green-600">
                      Restore <CurrencyDisplay amount={breakdown.pc_balance_restored || 0} />
                    </span>
                    <p className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {breakdown.pc_funds?.join(", ")}
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
                      Restore <CurrencyDisplay amount={breakdown.bank_balance_restored || 0} />
                    </span>
                  </div>
                </div>
              )}

              {breakdown.pc_count === 0 && breakdown.bank_tx_count === 0 && breakdown.je_count === 0 && (
                <p className="text-muted-foreground text-center pt-2">No related financial entries found.</p>
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
            Reverse & Delete IOU
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
