import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertCircle, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";

interface PublicPaymentDetailsProps {
  fixedMonthlyAmount: number;
  paymentBalance: number;
  currentAmountDue: number;
  paymentHistory: any[];
}

export function PublicPaymentDetails({ 
  fixedMonthlyAmount, 
  paymentBalance, 
  currentAmountDue, 
  paymentHistory 
}: PublicPaymentDetailsProps) {
  const hasOutstanding = paymentBalance < 0;
  const hasCredit = paymentBalance > 0;
  const isSettled = paymentBalance === 0;

  return (
    <div className="space-y-4">
      {/* Payment Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Payment Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Fixed Monthly Fee</p>
              <p className="font-semibold text-lg">
                LKR {fixedMonthlyAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Account Balance</p>
              <p className={cn(
                "font-semibold text-lg flex items-center gap-1",
                hasOutstanding ? "text-destructive" : hasCredit ? "text-green-600" : "text-muted-foreground"
              )}>
                {hasOutstanding && <TrendingDown className="w-4 h-4" />}
                {hasCredit && <TrendingUp className="w-4 h-4" />}
                {isSettled && <CheckCircle className="w-4 h-4" />}
                LKR {paymentBalance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasOutstanding ? "Outstanding" : hasCredit ? "Credit" : "Settled"}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Amount Due This Month</p>
            <p className="text-2xl font-bold text-primary">
              LKR {currentAmountDue.toLocaleString()}
            </p>
          </div>
          
          {/* Explanation Alert */}
          {!isSettled && (
            <Alert variant={hasOutstanding ? "destructive" : "default"} className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {hasOutstanding ? (
                  <>
                    You have an <strong>outstanding balance of LKR {Math.abs(paymentBalance).toLocaleString()}</strong> from previous months. 
                    The total amount due includes this month's fee <strong>(LKR {fixedMonthlyAmount.toLocaleString()})</strong> plus the outstanding balance.
                  </>
                ) : (
                  <>
                    You have a <strong>credit balance of LKR {paymentBalance.toLocaleString()}</strong> which will be applied to future payments. 
                    Your amount due this month has been reduced accordingly.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Payment History */}
      {paymentHistory && paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs text-right">Expected</TableHead>
                    <TableHead className="text-xs text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.slice(0, 5).map((transaction) => {
                    const isPaidFull = transaction.amount_paid >= transaction.fixed_amount;
                    const balanceAfter = transaction.payment_balance_after || 0;
                    
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-xs">
                          {format(new Date(transaction.payment_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className={cn(
                          "text-xs text-right font-medium",
                          isPaidFull ? "text-green-600" : "text-orange-600"
                        )}>
                          {transaction.amount_paid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {transaction.fixed_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          "text-xs text-right font-medium",
                          balanceAfter < 0 ? "text-destructive" : balanceAfter > 0 ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {balanceAfter.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {paymentHistory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payment history available yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
