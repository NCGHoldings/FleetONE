import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { Clock, ArrowRight } from "lucide-react";

interface EditHistoryEntry {
  edited_at: string;
  edited_by?: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  reversed_je_id?: string;
  new_je_id?: string;
  reason?: string;
}

interface EditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: EditHistoryEntry[];
  documentNumber: string;
}

const formatValue = (key: string, value: any) => {
  if (value === null || value === undefined) return "-";
  if (key.includes("amount") || key === "balance" || key === "total_amount") {
    return <CurrencyDisplay amount={Number(value)} />;
  }
  if (key.includes("date")) {
    try { return format(new Date(value), "MMM dd, yyyy"); } catch { return String(value); }
  }
  return String(value);
};

const LABEL_MAP: Record<string, string> = {
  amount: "Amount",
  payment_date: "Payment Date",
  receipt_date: "Receipt Date",
  payment_method: "Payment Method",
  vendor_id: "Vendor",
  customer_id: "Customer",
  reference: "Reference",
  notes: "Notes",
  bank_account_id: "Bank Account",
  cheque_number: "Cheque #",
  invoice_date: "Invoice Date",
  due_date: "Due Date",
  total_amount: "Total Amount",
};

export const EditHistoryDialog = ({ open, onOpenChange, history, documentNumber }: EditHistoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit History — {documentNumber}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {(!history || history.length === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-8">No edits recorded</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Edit #{history.length - idx}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.edited_at), "MMM dd, yyyy HH:mm")}
                    </span>
                  </div>
                  
                  {entry.reason && (
                    <p className="text-xs text-muted-foreground italic">{entry.reason}</p>
                  )}

                  <div className="space-y-1">
                    {Object.keys(entry.new_values).map(key => {
                      const oldVal = entry.old_values[key];
                      const newVal = entry.new_values[key];
                      if (oldVal === newVal) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="font-medium min-w-[100px]">{LABEL_MAP[key] || key}:</span>
                          <span className="text-muted-foreground">{formatValue(key, oldVal)}</span>
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="font-semibold">{formatValue(key, newVal)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {(entry.reversed_je_id || entry.new_je_id) && (
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      {entry.reversed_je_id && <span>Reversed JE: {entry.reversed_je_id.slice(0, 8)}...</span>}
                      {entry.new_je_id && <span className="ml-2">New JE: {entry.new_je_id.slice(0, 8)}...</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
