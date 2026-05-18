import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePettyCashGLSyncPreview, useSyncPettyCashGL } from "@/hooks/usePettyCash";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { Loader2, ArrowRightLeft, DollarSign } from "lucide-react";

interface PettyCashGLSyncDialogProps {
  transactionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PettyCashGLSyncDialog: React.FC<PettyCashGLSyncDialogProps> = ({ transactionId, isOpen, onClose }) => {
  const { data: preview, isLoading: isPreviewLoading } = usePettyCashGLSyncPreview(transactionId);
  const { data: coaData } = useChartOfAccounts();
  const syncMutation = useSyncPettyCashGL();

  const [debitAccountId, setDebitAccountId] = useState<string>("");
  const [creditAccountId, setCreditAccountId] = useState<string>("");

  useEffect(() => {
    if (preview) {
      setDebitAccountId(preview.debitAccountId);
      setCreditAccountId(preview.creditAccountId);
    }
  }, [preview]);

  const handleConfirm = () => {
    if (!transactionId) return;
    syncMutation.mutate(
      { 
        transactionId, 
        overrideDebitAccountId: debitAccountId, 
        overrideCreditAccountId: creditAccountId 
      },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  const accounts = coaData || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm General Ledger Sync</DialogTitle>
          <DialogDescription>
            Review and override the GL accounts before posting this transaction.
          </DialogDescription>
        </DialogHeader>

        {isPreviewLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : preview ? (
          <div className="space-y-6 my-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Description</span>
                <span className="text-slate-900 font-semibold truncate max-w-[200px]" title={preview.jeDescription}>
                  {preview.jeDescription}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Amount</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {preview.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-4 relative">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Debit Account (DR)</label>
                <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Debit Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className="bg-white p-1 rounded-full border shadow-sm text-slate-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Credit Account (CR)</label>
                <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Credit Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 text-slate-500">
            Preview unavailable.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={syncMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={syncMutation.isPending || !debitAccountId || !creditAccountId}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {syncMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm & Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
