import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRightLeft, ShieldAlert } from "lucide-react";

export interface GLImpactLine {
  accountName: string;
  amount: number;
}

interface GLImpactPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  debits: GLImpactLine[];
  credits: GLImpactLine[];
  onConfirm: () => void;
  isExecuting?: boolean;
}

export function GLImpactPreviewModal({
  isOpen,
  onOpenChange,
  debits,
  credits,
  onConfirm,
  isExecuting
}: GLImpactPreviewModalProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  const totalDebit = debits.reduce((sum, line) => sum + line.amount, 0);
  const totalCredit = credits.reduce((sum, line) => sum + line.amount, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Database Impact Preview
          </DialogTitle>
          <DialogDescription>
            Please verify the exact Journal Entry (Debits and Credits) that will be posted to the General Ledger before confirming this transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="my-6">
          <div className="grid grid-cols-2 gap-0 border rounded-lg overflow-hidden">
            {/* DEBITS */}
            <div className="border-r bg-slate-50/50">
              <div className="bg-slate-100 p-3 font-semibold text-center border-b">
                Debit (DR)
              </div>
              <div className="p-4 space-y-3 min-h-[150px]">
                {debits.map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{d.accountName}</span>
                    <span className="text-muted-foreground">{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-100/50 border-t flex justify-between font-bold">
                <span>Total Debit</span>
                <span>{formatCurrency(totalDebit)}</span>
              </div>
            </div>

            {/* CREDITS */}
            <div className="bg-slate-50/50">
              <div className="bg-slate-100 p-3 font-semibold text-center border-b">
                Credit (CR)
              </div>
              <div className="p-4 space-y-3 min-h-[150px]">
                {credits.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="font-medium ml-6">{c.accountName}</span>
                    <span className="text-muted-foreground">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-100/50 border-t flex justify-between font-bold">
                <span>Total Credit</span>
                <span>{formatCurrency(totalCredit)}</span>
              </div>
            </div>
          </div>
        </div>

        {!isBalanced && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="h-4 w-4" />
            Warning: The Journal Entry is unbalanced. You cannot proceed until it is mathematically perfect.
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExecuting}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isExecuting || !isBalanced || totalDebit === 0}
            className="gap-2"
          >
            {isExecuting ? "Executing Database Hit..." : "Confirm & Execute Database Hit"}
            {!isExecuting && <ArrowRightLeft className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
