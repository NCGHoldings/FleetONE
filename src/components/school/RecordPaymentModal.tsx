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
import { usePostPaymentToGL, useBranchFinanceSettings, syncPaymentToFinanceAR } from "@/hooks/useSchoolBusFinance";
import { useCompany } from "@/contexts/CompanyContext";

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  fixed_monthly_amount: number;
  payment_balance: number;
  current_amount_due: number;
  branch_id?: string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
}

export function RecordPaymentModal({ isOpen, onClose, student, onSuccess }: RecordPaymentModalProps) {
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMonth, setPaymentMonth] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postPaymentToGL = usePostPaymentToGL();
  const { data: financeSettings } = useBranchFinanceSettings(student?.branch_id || null);
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();

  useEffect(() => {
    if (isOpen && student) {
      // Reset form
      setAmountReceived("");
      setPaymentMethod("Cash");
      setReferenceNo("");
      setPaymentDate(new Date());
      setPaymentMonth(new Date());
      setNotes("");
    }
  }, [isOpen, student]);

  if (!student) return null;

  const fixedAmount = student.fixed_monthly_amount || 0;
  const previousBalance = student.payment_balance || 0;
  const amountDue = student.current_amount_due || fixedAmount;
  const receivedAmount = parseFloat(amountReceived) || 0;
  const difference = receivedAmount - amountDue;
  const newBalance = previousBalance + receivedAmount;
  const nextMonthDue = fixedAmount - newBalance;

  const handleSubmit = async () => {
    if (!receivedAmount || receivedAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: paymentRecord, error } = await supabase
        .from("school_payment_transactions")
        .insert({
          student_id: student.id,
          payment_month: format(paymentMonth, 'yyyy-MM-dd'),
          fixed_amount: fixedAmount,
          amount_paid: receivedAmount,
          difference: difference,
          payment_balance_before: previousBalance,
          payment_balance_after: newBalance,
          payment_method: paymentMethod,
          reference_no: referenceNo || null,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-post to GL if settings enabled
      if (financeSettings?.auto_post_payments && student.branch_id) {
        try {
          await postPaymentToGL.mutateAsync({
            paymentId: paymentRecord.id,
            amount: receivedAmount,
            branchId: student.branch_id,
            studentName: student.student_name,
            paymentMethod: paymentMethod,
            referenceNo: referenceNo,
            fixedAmount: fixedAmount,
            overpaymentAmount: receivedAmount > amountDue ? (receivedAmount - amountDue) : undefined,
            previousBalance: previousBalance,
            studentId: student.id,
          });
        } catch (glError) {
          console.error("GL posting failed:", glError);
          // Payment still recorded, just GL posting failed
        }
      }

      // Note: The database trigger 'update_student_balance_on_payment_trigger' 
      // automatically updates:
      // 1. Student's current_amount_due (decreases by amount_paid)
      // 2. Student's payment_balance (set to payment_balance_after)
      // 3. School AR invoices status (marks as 'paid' or 'partial' using FIFO)

      // After FIFO settlement, sync orphaned invoices to Finance AR
      // This handles legacy invoices that have ar_invoice_id = NULL
      try {
        const effectiveCompanyId = getEffectiveCompanyId();
        const businessUnitCode = getBusinessUnitCode();
        
        // Find updated school invoices for this student that may need syncing
        const { data: updatedInvoices } = await supabase
          .from("school_ar_invoices")
          .select("id, amount, paid_amount, status, ar_invoice_id")
          .eq("student_id", student.id)
          .in("status", ["paid", "partial"]);

        if (updatedInvoices?.length) {
          // Get or create SBS customer
          let customerId: string | null = null;
          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("company_id", effectiveCompanyId)
            .eq("customer_code", "SBS-DEFAULT")
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer } = await supabase
              .from("customers")
              .insert({
                company_id: effectiveCompanyId,
                business_unit_code: 'SBO',
                customer_code: "SBS-DEFAULT",
                customer_name: "School Bus Students",
                is_active: true,
              } as any)
              .select()
              .single();
            customerId = newCustomer?.id || null;
          }

          if (customerId) {
            // Process each invoice that needs syncing
            for (const inv of updatedInvoices) {
              if (!inv.ar_invoice_id || inv.ar_invoice_id === null) {
                // Create Finance AR invoice for orphaned school invoice
                await syncPaymentToFinanceAR(
                  inv.id,
                  inv.paid_amount || 0,
                  inv.amount || 0,
                  effectiveCompanyId,
                  businessUnitCode,
                  customerId
                );
              } else {
                // Update existing Finance AR invoice
                const balance = (inv.amount || 0) - (inv.paid_amount || 0);
                const status = balance <= 0 ? "paid" : (inv.paid_amount || 0) > 0 ? "partial" : "unpaid";
                
                await supabase
                  .from("ar_invoices")
                  .update({
                    paid_amount: inv.paid_amount || 0,
                    balance: balance,
                    status: status,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", inv.ar_invoice_id);
              }
            }
          }
        }
      } catch (syncError) {
        console.error("Finance AR sync failed:", syncError);
        // Payment still recorded, just sync failed - this is non-critical
      }

      toast.success("Payment recorded successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Student:</span>
                <span className="ml-2 font-medium">{student.student_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Admission No:</span>
                <span className="ml-2 font-medium">{student.admission_no}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Payment Summary</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-primary font-medium">Fixed Monthly Amount:</span>
                <span className="font-semibold text-primary">LKR {fixedAmount.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className={previousBalance < 0 ? "text-destructive" : "text-green-600"}>
                  Previous Balance:
                </span>
                <span className={cn(
                  "font-medium",
                  previousBalance < 0 ? "text-destructive" : "text-green-600"
                )}>
                  LKR {previousBalance.toLocaleString()} {previousBalance < 0 ? "(owed)" : "(credit)"}
                </span>
              </div>
              
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Amount Due This Month:</span>
                <span className="font-semibold">LKR {amountDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Input Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-month">Payment Month</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(paymentMonth, "MMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentMonth}
                      onSelect={(date) => date && setPaymentMonth(date)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(paymentDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={(date) => date && setPaymentDate(date)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-received">Amount Received *</Label>
              <Input
                id="amount-received"
                type="number"
                placeholder="Enter amount received"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Online">Online Payment</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference-no">Reference Number</Label>
                <Input
                  id="reference-no"
                  placeholder="Optional"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

           {/* Calculation Display */}
          {receivedAmount > 0 && (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg border-2">
              <h3 className="font-semibold text-sm">After This Payment:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount Received:</span>
                  <span className="font-medium">LKR {receivedAmount.toLocaleString()}</span>
                </div>
                {previousBalance > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Existing Credit Balance:</span>
                    <span className="font-medium">LKR {previousBalance.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Difference from Fixed Amount:</span>
                  <span className={cn(
                    "font-medium",
                    difference < 0 ? "text-destructive" : "text-green-600"
                  )}>
                    LKR {Math.abs(difference).toLocaleString()} {difference < 0 ? "(short)" : "(extra)"}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">New Balance:</span>
                  <span className={cn(
                    "font-bold text-base",
                    newBalance < 0 ? "text-destructive" : "text-green-600"
                  )}>
                    LKR {newBalance.toLocaleString()} {newBalance < 0 ? "(owed)" : newBalance > 0 ? "(credit)" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Next Month Amount Due:</span>
                  <span className="font-semibold text-primary">
                    LKR {nextMonthDue.toLocaleString()}
                  </span>
                </div>
                {/* Credit CONSUMPTION info — when student has existing credit and it's being used */}
                {previousBalance > 0 && receivedAmount < amountDue && (financeSettings as Record<string, unknown>)?.advance_payments_liability_account_id && (
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
                    🔄 <strong>LKR {Math.min(previousBalance, amountDue - receivedAmount).toLocaleString()}</strong> credit 
                    from previous month will be applied from <em>Advance Payments Liability</em>
                  </div>
                )}
                {/* Credit ADDITION info — when student overpays */}
                {receivedAmount > amountDue && (financeSettings as Record<string, unknown>)?.advance_payments_liability_account_id && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
                    💡 Credit balance of <strong>LKR {(receivedAmount - amountDue).toLocaleString()}</strong> will be posted 
                    to <em>Advance Payments Liability</em> in COA
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !receivedAmount}>
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
