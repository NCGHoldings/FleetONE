import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { CreditCard, Calendar, TrendingDown, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface BusMasterLoansTabProps {
  data: BusMasterData;
}

export const BusMasterLoansTab = ({ data }: BusMasterLoansTabProps) => {
  const { loans } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-LK').format(num);
  };

  if (loans.activeLoans.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No Active Loans</p>
              <p className="text-sm">This bus has no associated loan records</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Loans</p>
            <p className="text-2xl font-bold">{loans.activeLoans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Debt</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(loans.totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly EMI</p>
            <p className="text-2xl font-bold">
              {formatCurrency(loans.activeLoans.reduce((sum, l) => sum + (l.monthly_installment || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold">{loans.payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Loan Details */}
      {loans.activeLoans.map((loan) => {
        const paidPayments = loan.bus_loan_payments?.filter((p: any) => p.payment_status === 'paid') || [];
        const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + p.total_installment, 0);
        const progressPercent = loan.loan_amount > 0 ? (totalPaid / loan.loan_amount) * 100 : 0;
        const remainingBalance = loan.loan_amount - totalPaid;

        return (
          <Card key={loan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {loan.lender_name}
                </CardTitle>
                <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                  {loan.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Loan Overview */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Loan Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(loan.loan_amount)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Interest Rate</p>
                  <p className="text-lg font-bold">{loan.interest_rate}%</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Monthly EMI</p>
                  <p className="text-lg font-bold">{formatCurrency(loan.monthly_installment)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Tenure</p>
                  <p className="text-lg font-bold">{loan.loan_tenure_months} months</p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Repayment Progress</span>
                  <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Paid: {formatCurrency(totalPaid)}</span>
                  <span>Remaining: {formatCurrency(remainingBalance)}</span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {format(new Date(loan.start_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {format(new Date(loan.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Payments */}
              {loan.bus_loan_payments && loan.bus_loan_payments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent Payments</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {loan.bus_loan_payments.slice(0, 6).map((payment: any) => (
                      <div 
                        key={payment.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {payment.payment_status === 'paid' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : payment.payment_status === 'pending' ? (
                            <Clock className="h-4 w-4 text-orange-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              Payment #{payment.payment_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(payment.total_installment)}</p>
                          <Badge 
                            variant={
                              payment.payment_status === 'paid' ? 'default' : 
                              payment.payment_status === 'pending' ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {payment.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
