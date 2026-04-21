import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { useEditAPPayment } from "@/hooks/useEditAccountingMutations";
import { CurrencyInput } from "@/components/ui/currency-input";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Paperclip, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface APPaymentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
}

export const APPaymentEditDialog = ({ open, onOpenChange, payment }: APPaymentEditDialogProps) => {
  const { data: bankAccounts } = useBankAccounts();
  const editPayment = useEditAPPayment();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [vendorBillNumber, setVendorBillNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentDocUrl, setCurrentDocUrl] = useState<string | null>(null);

  useEffect(() => {
    if (payment && open) {
      setAmount(payment.amount || 0);
      setPaymentDate(payment.payment_date || format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod(payment.payment_method || "bank_transfer");
      setBankAccountId(payment.bank_account_id || "");
      setChequeNumber(payment.cheque_number || "");
      setChequeDate(payment.cheque_date || "");
      setReference(payment.reference || "");
      setNotes(payment.notes || "");
      setVendorBillNumber(payment.vendor_bill_number || "");
      setCurrentDocUrl(payment.document_url || null);
    }
  }, [payment, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !payment?.id) return;
    setUploading(true);
    try {
      const path = `ap_payments/${payment.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from("ap_payments").update({ document_url: path }).eq("id", payment.id);
      if (updErr) throw updErr;
      setCurrentDocUrl(path);
      toast.success("Attachment uploaded");
      queryClient.invalidateQueries({ queryKey: ["ap_payments"] });
    } catch (err: any) {
      toast.error("Upload failed", { description: err?.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = () => {
    if (!payment?.id) return;
    editPayment.mutate(
      {
        id: payment.id,
        updates: {
          amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          bank_account_id: bankAccountId || undefined,
          cheque_number: chequeNumber || undefined,
          cheque_date: chequeDate || undefined,
          reference: reference || undefined,
          notes: notes || undefined,
          vendor_bill_number: vendorBillNumber || undefined,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment — {payment?.payment_number}</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive" className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Editing will auto-reverse the existing GL journal entry and create a new one with updated values. Full history is preserved.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount</Label>
              <CurrencyInput value={amount} onValueChange={setAmount} />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map(ba => (
                    <SelectItem key={ba.id} value={ba.id}>{ba.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentMethod === "cheque" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cheque #</Label>
                <Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} />
              </div>
              <div>
                <Label>Cheque Date</Label>
                <Input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Vendor Bill #</Label>
            <Input value={vendorBillNumber} onChange={e => setVendorBillNumber(e.target.value)} />
          </div>

          <div>
            <Label>Reference</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="border-t pt-4">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Attachment
            </Label>
            {currentDocUrl ? (
              <p className="text-xs text-muted-foreground mt-1 break-all">
                Current: {currentDocUrl.split("/").pop()}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">No attachment yet.</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="text-xs"
              />
              {uploading && <Upload className="h-4 w-4 animate-pulse text-primary" />}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Uploading replaces any existing attachment reference.
            </p>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={editPayment.isPending}>
            {editPayment.isPending ? "Updating..." : "Update Payment (Auto GL Reversal)"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
