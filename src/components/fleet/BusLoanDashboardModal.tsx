import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Calendar, TrendingUp, CheckCircle, Clock, AlertCircle, FileDown } from "lucide-react";
import { formatCurrency, calculateLoanProgress } from "@/lib/loan-calculator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface BusLoanDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busId: string;
  busNumber: string;
}

interface LoanData {
  id: string;
  loan_amount: number;
  interest_rate: number;
  loan_tenure_months: number;
  monthly_installment: number;
  start_date: string;
  end_date: string;
  lender_name: string;
  loan_type: string;
  status: string;
}

interface PaymentData {
  id: string;
  payment_number: number;
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  total_installment: number;
  balance_remaining: number;
  payment_status: string;
  actual_payment_date: string | null;
}

export function BusLoanDashboardModal({ open, onOpenChange, busId, busNumber }: BusLoanDashboardModalProps) {
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<LoanData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const fetchLoanData = async () => {
    try {
      setLoading(true);

      // Fetch active loan
      const { data: loanData, error: loanError } = await supabase
        .from("bus_loans")
        .select("*")
        .eq("bus_id", busId)
        .eq("status", "active")
        .single();

      if (loanError) throw loanError;
      setLoan(loanData);

      // Fetch payment schedule
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("bus_loan_payments")
        .select("*")
        .eq("loan_id", loanData.id)
        .order("payment_number", { ascending: true });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching loan data:", error);
      toast.error("Failed to load loan details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLoanData();
    }
  }, [open, busId]);

  const handleMarkAsPaid = async () => {
    if (!selectedPayment) return;

    try {
      const { error } = await supabase
        .from("bus_loan_payments")
        .update({
          payment_status: "paid",
          actual_payment_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", selectedPayment);

      if (error) throw error;

      toast.success("Payment marked as paid");
      setSelectedPayment(null);
      await fetchLoanData();
    } catch (error) {
      console.error("Error marking payment:", error);
      toast.error("Failed to mark payment");
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center p-12">
            <div className="text-center">Loading loan details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!loan) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Active Loan</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">This bus doesn't have an active loan.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const paidPayments = payments.filter((p) => p.payment_status === "paid");
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.total_installment, 0);
  const balanceDue = loan.loan_amount - totalPaid;
  const progress = calculateLoanProgress(totalPaid, loan.loan_amount);
  const nextPayment = payments.find((p) => p.payment_status === "pending");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Dashboard - Bus {busNumber}</DialogTitle>
          </DialogHeader>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Total Loan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(loan.loan_amount)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  @ {loan.interest_rate}% for {loan.loan_tenure_months} months
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  Amount Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                <Progress value={progress} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{progress}% completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  Balance Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(balanceDue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payments.length - paidPayments.length} payments remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Next Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextPayment ? (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(nextPayment.total_installment)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(nextPayment.payment_date).toLocaleDateString()}
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-green-600 font-medium">All payments completed!</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Loan Details */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Lender:</span>
                  <p className="font-medium">{loan.lender_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Loan Type:</span>
                  <p className="font-medium">{loan.loan_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <p className="font-medium">{new Date(loan.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>
                  <p className="font-medium">{new Date(loan.end_date).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amortization Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Schedule ({paidPayments.length}/{payments.length} completed)</CardTitle>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Total EMI</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} className={payment.payment_status === "paid" ? "bg-green-50" : ""}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.principal_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.interest_amount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(payment.total_installment)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.balance_remaining)}</TableCell>
                        <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                        <TableCell>
                          {payment.payment_status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPayment(payment.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {payment.payment_status === "paid" && payment.actual_payment_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(payment.actual_payment_date).toLocaleDateString()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Payment as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this installment as paid? This action will update the payment status and record the payment date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid}>Confirm Payment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
