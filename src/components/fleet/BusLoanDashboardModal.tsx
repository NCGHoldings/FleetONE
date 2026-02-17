import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Calendar, TrendingUp, CheckCircle, Clock, AlertCircle, FileDown, Receipt, BookOpen } from "lucide-react";
import { formatCurrency, calculateLoanProgress } from "@/lib/loan-calculator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  fetchLeasingFinanceSettings, 
  processLeasingPaymentWithFinance,
  createLeasingAPInvoice,
  createLenderVendor,
  LeasingFinanceSettings,
  LoanPaymentData,
} from "@/hooks/useLeasingFinance";

interface BusLoanDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busId: string;
  busNumber: string;
}

interface LoanData {
  id: string;
  bus_id: string;
  loan_amount: number;
  interest_rate: number;
  loan_tenure_months: number;
  monthly_installment: number;
  start_date: string;
  end_date: string;
  lender_name: string;
  loan_type: string;
  status: string;
  vendor_id?: string;
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
  journal_entry_id?: string;
  ap_invoice_id?: string;
  gl_posted?: boolean;
}

export function BusLoanDashboardModal({ open, onOpenChange, busId, busNumber }: BusLoanDashboardModalProps) {
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<LoanData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [financeSettings, setFinanceSettings] = useState<LeasingFinanceSettings | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [creatingAP, setCreatingAP] = useState(false);

  // Count payments that already have AP invoices linked
  const paymentsWithAP = payments.filter(p => p.ap_invoice_id);
  const paymentsWithoutAP = payments.filter(p => !p.ap_invoice_id && p.payment_status === "pending");

  const handleBulkCreateAP = async () => {
    if (!loan || !financeSettings) return;

    setCreatingAP(true);
    try {
      // Ensure vendor exists
      let vendorId = loan.vendor_id || null;
      if (!vendorId && financeSettings.auto_create_vendor) {
        vendorId = await createLenderVendor({
          lenderName: loan.lender_name,
        });
        if (vendorId) {
          await supabase
            .from("bus_loans")
            .update({ vendor_id: vendorId })
            .eq("id", loan.id);
        }
      }

      if (!vendorId) {
        toast.error("No vendor available. Configure auto-vendor in Leasing Finance Settings.");
        return;
      }

      let created = 0;
      for (const payment of paymentsWithoutAP) {
        const paymentData: LoanPaymentData = {
          id: payment.id,
          payment_number: payment.payment_number,
          payment_date: payment.payment_date,
          principal_amount: payment.principal_amount,
          interest_amount: payment.interest_amount,
          total_installment: payment.total_installment,
          balance_remaining: payment.balance_remaining,
          payment_status: payment.payment_status,
        };

        const apResult = await createLeasingAPInvoice({
          loanId: loan.id,
          paymentData,
          vendorId,
          busNumber,
          lenderName: loan.lender_name,
          settings: financeSettings,
        });

        if (apResult) {
          await supabase
            .from("bus_loan_payments")
            .update({ ap_invoice_id: apResult.invoiceId })
            .eq("id", payment.id);
          created++;
        }
      }

      toast.success(`Created ${created} AP invoices for pending installments`);
      await fetchLoanData();
    } catch (error) {
      console.error("Error creating bulk AP invoices:", error);
      toast.error("Failed to create AP invoices");
    } finally {
      setCreatingAP(false);
    }
  };

  const fetchLoanData = async () => {
    try {
      setLoading(true);

      // Fetch finance settings
      const settings = await fetchLeasingFinanceSettings();
      setFinanceSettings(settings);

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
    if (!selectedPayment || !loan) return;

    const payment = payments.find(p => p.id === selectedPayment);
    if (!payment) return;

    setProcessingPayment(true);
    try {
      // Update payment status first
      const { error } = await supabase
        .from("bus_loan_payments")
        .update({
          payment_status: "paid",
          actual_payment_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", selectedPayment);

      if (error) throw error;

      // If finance settings are configured, process finance integration
      if (financeSettings?.auto_post_gl_on_payment) {
        const financeResult = await processLeasingPaymentWithFinance({
          paymentId: selectedPayment,
          loanId: loan.id,
          paymentData: {
            ...payment,
            actual_payment_date: new Date().toISOString().split("T")[0],
          },
          busId: loan.bus_id,
          busNumber,
          lenderName: loan.lender_name,
          vendorId: loan.vendor_id,
          apInvoiceId: payment.ap_invoice_id,
        });

        if (financeResult.success && financeResult.journalEntryId) {
          toast.success(`Payment marked as paid. GL Entry created.`);
        } else if (!financeResult.success) {
          toast.warning(`Payment marked as paid, but GL posting failed: ${financeResult.error}`);
        } else {
          toast.success("Payment marked as paid");
        }
      } else {
        toast.success("Payment marked as paid");
      }

      setSelectedPayment(null);
      await fetchLoanData();
    } catch (error) {
      console.error("Error marking payment:", error);
      toast.error("Failed to mark payment");
    } finally {
      setProcessingPayment(false);
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

  const getStatusBadge = (status: string, glPosted?: boolean) => {
    switch (status) {
      case "paid":
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
            {glPosted && <Badge variant="outline" className="text-xs"><BookOpen className="h-2 w-2 mr-1" />GL</Badge>}
          </div>
        );
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

          {/* Finance Integration Status */}
          {financeSettings && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <Receipt className="h-4 w-4 inline mr-1" />
                  Finance Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {financeSettings.auto_post_gl_on_payment ? (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Auto GL Posting Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Manual GL Posting
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
              <div className="flex gap-2">
                {financeSettings && paymentsWithoutAP.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkCreateAP}
                    disabled={creatingAP}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    {creatingAP ? "Creating..." : `Create ${paymentsWithoutAP.length} AP Invoices`}
                  </Button>
                )}
                {paymentsWithAP.length > 0 && (
                  <Badge variant="outline" className="text-xs py-1">
                    {paymentsWithAP.length} AP linked
                  </Badge>
                )}
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
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
                        <TableCell>{getStatusBadge(payment.payment_status, payment.gl_posted)}</TableCell>
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
              {financeSettings?.auto_post_gl_on_payment && (
                <span className="block mt-2 text-primary font-medium">
                  <BookOpen className="h-4 w-4 inline mr-1" />
                  A GL entry will be automatically created (DR Interest Expense + DR Lease Liability / CR Bank).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingPayment}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid} disabled={processingPayment}>
              {processingPayment ? "Processing..." : "Confirm Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
