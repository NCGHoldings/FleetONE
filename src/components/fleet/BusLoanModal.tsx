import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator, Building2, Calendar, DollarSign } from "lucide-react";
import { calculateLoanDetails, formatCurrency, generateAmortizationSchedule } from "@/lib/loan-calculator";

interface BusLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busId: string;
  busNumber: string;
  onSuccess: () => void;
}

export function BusLoanModal({ open, onOpenChange, busId, busNumber, onSuccess }: BusLoanModalProps) {
  const [loading, setLoading] = useState(false);
  const [tenureType, setTenureType] = useState<"months" | "years">("months");
  
  const [formData, setFormData] = useState({
    loanAmount: "",
    interestRate: "",
    tenure: "",
    lenderName: "",
    lenderContact: "",
    loanType: "Vehicle Loan",
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [calculation, setCalculation] = useState<ReturnType<typeof calculateLoanDetails> | null>(null);

  const handleCalculate = () => {
    const amount = parseFloat(formData.loanAmount);
    const rate = parseFloat(formData.interestRate);
    const tenureValue = parseFloat(formData.tenure);

    if (!amount || !rate || !tenureValue || amount <= 0 || rate <= 0 || tenureValue <= 0) {
      toast.error("Please enter valid loan amount, interest rate, and tenure");
      return;
    }

    const tenureMonths = tenureType === "years" ? tenureValue * 12 : tenureValue;
    const startDate = new Date(formData.startDate);

    const result = calculateLoanDetails(amount, rate, tenureMonths, startDate);
    setCalculation(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!calculation) {
      toast.error("Please calculate EMI first");
      return;
    }

    if (!formData.lenderName) {
      toast.error("Please enter lender name");
      return;
    }

    setLoading(true);

    try {
      const amount = parseFloat(formData.loanAmount);
      const rate = parseFloat(formData.interestRate);
      const tenureValue = parseFloat(formData.tenure);
      const tenureMonths = tenureType === "years" ? tenureValue * 12 : tenureValue;
      const startDate = new Date(formData.startDate);

      // Create loan record
      const { data: loanData, error: loanError } = await supabase
        .from("bus_loans")
        .insert({
          bus_id: busId,
          loan_amount: amount,
          interest_rate: rate,
          loan_tenure_months: tenureMonths,
          monthly_installment: calculation.monthlyInstallment,
          start_date: formData.startDate,
          end_date: calculation.endDate.toISOString().split("T")[0],
          lender_name: formData.lenderName,
          lender_contact: formData.lenderContact || null,
          loan_type: formData.loanType,
          notes: formData.notes || null,
          status: "active",
        })
        .select()
        .single();

      if (loanError) throw loanError;

      // Generate amortization schedule
      const schedule = generateAmortizationSchedule(amount, rate, tenureMonths, startDate);

      // Insert all payment schedule entries
      const paymentEntries = schedule.map((entry) => ({
        loan_id: loanData.id,
        payment_number: entry.paymentNumber,
        payment_date: entry.paymentDate.toISOString().split("T")[0],
        principal_amount: entry.principalAmount,
        interest_amount: entry.interestAmount,
        total_installment: entry.totalInstallment,
        balance_remaining: entry.balanceRemaining,
        payment_status: "pending",
      }));

      const { error: paymentsError } = await supabase
        .from("bus_loan_payments")
        .insert(paymentEntries);

      if (paymentsError) throw paymentsError;

      toast.success("Loan added successfully with payment schedule");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        loanAmount: "",
        interestRate: "",
        tenure: "",
        lenderName: "",
        lenderContact: "",
        loanType: "Vehicle Loan",
        startDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setCalculation(null);
    } catch (error) {
      console.error("Error adding loan:", error);
      toast.error("Failed to add loan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Loan for Bus {busNumber}</DialogTitle>
          <DialogDescription>
            Enter loan details and calculate the EMI to create a payment schedule
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Loan Calculator Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Loan Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmount">Loan Amount (LKR)</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    step="0.01"
                    value={formData.loanAmount}
                    onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })}
                    placeholder="5000000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (% per year)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="8.5"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenure">Tenure</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tenure"
                      type="number"
                      value={formData.tenure}
                      onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                      placeholder="60"
                      required
                      className="flex-1"
                    />
                    <Select value={tenureType} onValueChange={(value: "months" | "years") => setTenureType(value)}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <Button type="button" onClick={handleCalculate} className="w-full">
                <Calculator className="mr-2 h-4 w-4" />
                Calculate EMI
              </Button>

              {calculation && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Monthly EMI</div>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(calculation.monthlyInstallment)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Interest</div>
                      <div className="text-2xl font-bold text-destructive">
                        {formatCurrency(calculation.totalInterest)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(calculation.totalAmount)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">End Date</div>
                      <div className="text-lg font-bold">
                        {calculation.endDate.toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lender Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Lender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lenderName">Lender Name</Label>
                  <Input
                    id="lenderName"
                    value={formData.lenderName}
                    onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                    placeholder="Bank of Ceylon"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lenderContact">Contact Number</Label>
                  <Input
                    id="lenderContact"
                    value={formData.lenderContact}
                    onChange={(e) => setFormData({ ...formData, lenderContact: e.target.value })}
                    placeholder="+94 11 2345678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loanType">Loan Type</Label>
                <Select value={formData.loanType} onValueChange={(value) => setFormData({ ...formData, loanType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vehicle Loan">Vehicle Loan</SelectItem>
                    <SelectItem value="Leasing">Leasing</SelectItem>
                    <SelectItem value="Hire Purchase">Hire Purchase</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information about the loan..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !calculation}>
              {loading ? "Adding Loan..." : "Add Loan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
