import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePostPaymentToGL, useBranchFinanceSettings } from "@/hooks/useSchoolBusFinance";
import { useCompany } from "@/contexts/CompanyContext";
import { useChartOfAccounts } from "@/hooks/useAccountingData";

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  fixed_monthly_amount: number;
  payment_balance: number;
  current_amount_due: number;
  branch_id?: string;
}

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
}

export function AdjustBalanceModal({ isOpen, onClose, student, onSuccess }: AdjustBalanceModalProps) {
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"write_off" | "credit">("write_off");
  const [glAccountId, setGlAccountId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState<Date>(new Date());
  const [adjustmentMonth, setAdjustmentMonth] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postPaymentToGL = usePostPaymentToGL();
  const { data: financeSettings } = useBranchFinanceSettings(student?.branch_id || null);
  const { data: accounts } = useChartOfAccounts();

  useEffect(() => {
    if (isOpen && student) {
      setAdjustmentAmount("");
      setReferenceNo("");
      setAdjustmentDate(new Date());
      setAdjustmentMonth(new Date());
      setNotes("");
      setGlAccountId("");
      // Default to write-off if they owe money
      if (student.current_amount_due > 0 || (student.payment_balance || 0) < 0) {
        setAdjustmentType("write_off");
      } else {
        setAdjustmentType("credit");
      }
    }
  }, [isOpen, student]);

  if (!student) return null;

  const previousBalance = student.payment_balance || 0;
  const parsedAmount = parseFloat(adjustmentAmount) || 0;

  // If write-off, they owe less (balance increases / becomes less negative).
  // If credit adjustment, their balance decreases.
  const signedAmount = adjustmentType === "write_off" ? parsedAmount : -parsedAmount;
  const newBalance = previousBalance + signedAmount;
  
  // Amount due is mathematically max(0, -newBalance)
  const amountDue = Math.max(0, -newBalance);

  const handleSubmit = async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Please enter a valid adjustment amount");
      return;
    }
    if (!glAccountId) {
      toast.error("Please select an offset GL account for this adjustment");
      return;
    }
    if (!notes.trim()) {
      toast.error("Please provide a reason for this adjustment");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // We pass signedAmount because the DB trigger adds amount_paid to payment_balance.
      // Wait, RecordPaymentModal passes receivedAmount (positive). 
      // If adjustmentType is "write_off" (student owes us, and we forgive it), it acts like a payment. 
      // So amount_paid should be POSITIVE.
      // If adjustmentType is "credit" (we reduce their credit balance, maybe refund or penalty), it acts like a reversal.
      // amount_paid should be NEGATIVE.
      const transactionAmount = adjustmentType === "write_off" ? parsedAmount : -parsedAmount;
      
      const { data: paymentRecord, error } = await supabase
        .from("school_payment_transactions")
        .insert({
          student_id: student.id,
          payment_month: format(adjustmentMonth, 'yyyy-MM-dd'),
          fixed_amount: student.fixed_monthly_amount || 0,
          amount_paid: transactionAmount,
          difference: 0,
          payment_balance_before: previousBalance,
          payment_balance_after: newBalance,
          payment_method: "Adjustment",
          reference_no: referenceNo || null,
          payment_date: format(adjustmentDate, 'yyyy-MM-dd'),
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-post to GL using the offset account as the customBankAccountId.
      // In usePostPaymentToGL:
      // DR customBankAccountId (amount)
      // CR Trade Receivables (amount)
      // If amount is positive (write-off), it DRs the Expense and CRs AR (correct).
      // If amount is negative (penalty), it DRs the Expense (negative = CR) and CRs AR (negative = DR). (correct).
      if (financeSettings?.auto_post_payments && student.branch_id) {
        try {
          await postPaymentToGL.mutateAsync({
            paymentId: paymentRecord.id,
            amount: transactionAmount,
            branchId: student.branch_id,
            studentName: student.student_name,
            paymentMethod: "Adjustment",
            referenceNo: referenceNo || "ADJ-" + format(new Date(), "yyyyMMdd"),
            fixedAmount: student.fixed_monthly_amount || 0,
            previousBalance: previousBalance,
            customBankAccountId: glAccountId, 
            studentId: student.id,
          });
        } catch (glError) {
          console.error("GL posting failed:", glError);
        }
      }

      toast.success("Balance adjustment recorded successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error recording adjustment:", error);
      toast.error(error.message || "Failed to record adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adjust Student Balance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Student:</span> <span className="font-medium">{student.student_name}</span></div>
            <div><span className="text-muted-foreground">Admission:</span> <span className="font-medium">{student.admission_no}</span></div>
            <div>
              <span className="text-muted-foreground">Current Balance:</span> 
              <span className={cn("ml-2 font-semibold", previousBalance < 0 ? "text-destructive" : "text-green-600")}>
                LKR {previousBalance.toLocaleString()} {previousBalance < 0 ? "(owed)" : "(credit)"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Amount Due:</span> 
              <span className="ml-2 font-semibold text-primary">LKR {student.current_amount_due?.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(val: any) => setAdjustmentType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="write_off">Write-off / Discount (Reduces Debt)</SelectItem>
                  <SelectItem value="credit">Penalty / Correction (Increases Debt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Adjustment Amount (LKR) *</Label>
              <Input
                type="number"
                placeholder="Amount"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Offset GL Account (Required) *</Label>
            <Select value={glAccountId} onValueChange={setGlAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Expense or Income Account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts?.filter(a => a.account_type === 'Expense' || a.account_type === 'Income' || a.account_type === 'Equity').map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name} ({acc.account_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {adjustmentType === "write_off" 
                ? "This account will be DEBITED (e.g. Bad Debt Expense, Discounts Allowed)." 
                : "This account will be CREDITED (e.g. Adjustments Income, Penalty Income)."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adjustment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(adjustmentDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={adjustmentDate} onSelect={(date) => date && setAdjustmentDate(date)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input placeholder="Optional" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason / Notes (Required) *</Label>
            <Textarea
              placeholder="Explain why this adjustment is being made..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {parsedAmount > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              <h4 className="font-semibold mb-1">Impact Preview:</h4>
              <div className="flex justify-between">
                <span>New Balance:</span>
                <span className={cn("font-bold", newBalance < 0 ? "text-destructive" : "text-green-600")}>
                  LKR {newBalance.toLocaleString()} {newBalance < 0 ? "(owed)" : newBalance > 0 ? "(credit)" : ""}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>New Amount Due:</span>
                <span className="font-bold">LKR {amountDue.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !parsedAmount || !glAccountId || !notes.trim()}>
              {isSubmitting ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
