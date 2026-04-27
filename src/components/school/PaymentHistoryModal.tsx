import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentTransaction {
  id: string;
  payment_month: string;
  payment_date: string;
  fixed_amount: number;
  amount_paid: number;
  difference: number;
  payment_balance_before: number;
  payment_balance_after: number;
  payment_method: string;
  reference_no: string | null;
  notes: string | null;
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName: string;
}

export function PaymentHistoryModal({ isOpen, onClose, studentId, studentName }: PaymentHistoryModalProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchPaymentHistory();
    }
  }, [isOpen, studentId]);

  const fetchPaymentHistory = async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("school_payment_transactions")
        .select("*")
        .eq("student_id", studentId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transaction: PaymentTransaction) => {
    if (!studentId) return;
    
    if (!confirm("Are you sure you want to delete this payment? This will adjust the student's balance back.")) {
      return;
    }

    try {
      setLoading(true);
      // Calculate how much this transaction actually changed the balance
      const balanceImpact = transaction.payment_balance_after - transaction.payment_balance_before;
      
      // 1. Fetch current student balance
      const { data: studentData, error: studentError } = await supabase
        .from("school_students")
        .select("payment_balance")
        .eq("id", studentId)
        .single();
        
      if (studentError) throw studentError;
      
      // 2. Reverse the exact impact
      const newBalance = (studentData.payment_balance || 0) - balanceImpact;
      const newAmountDue = Math.max(0, -newBalance);

      // 3. Delete the transaction
      const { error: deleteError } = await supabase
        .from("school_payment_transactions")
        .delete()
        .eq("id", transaction.id);
        
      if (deleteError) throw deleteError;

      // 4. Update student
      const { error: updateError } = await supabase
        .from("school_students")
        .update({
          payment_balance: newBalance,
          current_amount_due: newAmountDue
        })
        .eq("id", studentId);

      if (updateError) throw updateError;
      
      // 5. If there's an AR Receipt linked in Finance, we should probably warn them
      if (transaction.reference_no?.startsWith('IMPORT-')) {
         alert("Note: This was a bank import. You may need to manually void the corresponding AR Receipt in the Finance module if it was created.");
      }

      fetchPaymentHistory();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      alert(error.message || "Failed to delete transaction");
      setLoading(false);
    }
  };

  const totalPaid = transactions.reduce((sum, t) => sum + t.amount_paid, 0);
  const totalExpected = transactions.reduce((sum, t) => sum + t.fixed_amount, 0);
  const currentBalance = transactions.length > 0 ? transactions[0].payment_balance_after : 0;
  const monthsPaid = transactions.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment History - {studentName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    LKR {totalPaid.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Expected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    LKR {totalExpected.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Current Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    currentBalance < 0 ? "text-destructive" : "text-green-600"
                  )}>
                    LKR {currentBalance.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentBalance < 0 ? "Owed" : "Credit"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Months Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monthsPaid}</div>
                </CardContent>
              </Card>
            </div>

            {/* Transaction History Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Fixed Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Balance Before</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No payment history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {format(new Date(transaction.payment_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(transaction.payment_month), "MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.fixed_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.amount_paid.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          transaction.difference < 0 ? "text-destructive" : "text-green-600"
                        )}>
                          {transaction.difference > 0 && "+"}
                          {transaction.difference.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right",
                          transaction.payment_balance_before < 0 ? "text-destructive" : "text-green-600"
                        )}>
                          {transaction.payment_balance_before.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          transaction.payment_balance_after < 0 ? "text-destructive" : "text-green-600"
                        )}>
                          {transaction.payment_balance_after.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.payment_method}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.reference_no || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteTransaction(transaction)}
                            title="Delete this payment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {transactions.length > 0 && transactions[0].notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Latest Payment Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{transactions[0].notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
