import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DeleteSchoolPaymentDialog } from "./DeleteSchoolPaymentDialog";
import { FinanceDocumentPreviewModal } from "../accounting/shared/FinanceDocumentPreviewModal";
import { Printer } from "lucide-react";

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
  const { toast } = useToast();

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>("");

  const [transactionToDelete, setTransactionToDelete] = useState<PaymentTransaction | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    documentType: 'school_invoice' | 'school_receipt';
    documentData: any;
  }>({
    isOpen: false,
    documentType: 'school_receipt',
    documentData: null
  });

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

  const handleEditDate = async (txId: string) => {
    if (!editDateValue) return;

    try {
      const newDate = new Date(editDateValue);
      if (isNaN(newDate.getTime())) {
        toast({ title: "Invalid Date", variant: "destructive" });
        return;
      }
      const formattedDate = newDate.toISOString().split('T')[0];

      // Fetch the transaction to see if it has a journal entry
      const { data: tx } = await supabase
        .from('school_payment_transactions')
        .select('id, journal_entry_id, ar_receipt_id')
        .eq('id', txId)
        .single();

      if (!tx) throw new Error("Transaction not found");

      // 1. Update the payment transaction
      await supabase
        .from('school_payment_transactions')
        .update({ payment_date: formattedDate })
        .eq('id', tx.id);

      // 2. Sync General Ledger and Finance records
      if (tx.journal_entry_id) {
        await supabase
          .from('journal_entries')
          .update({ entry_date: formattedDate })
          .eq('id', tx.journal_entry_id);
          
        await supabase
          .from('ar_receipts')
          .update({ receipt_date: formattedDate })
          .eq('journal_entry_id', tx.journal_entry_id);

        // 2.5 Sync Bank Transactions
        const sourceIds = [tx.journal_entry_id];
        if (tx.ar_receipt_id) sourceIds.push(tx.ar_receipt_id);
        
        await supabase
          .from('bank_transactions')
          .update({ transaction_date: formattedDate })
          .in('source_id', sourceIds);
      }

      // 3. Update the student's last_payment_date cache if it's the latest transaction
      const { data: latestTx } = await supabase
        .from('school_payment_transactions')
        .select('id, payment_date')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(1)
        .single();

      if (latestTx && latestTx.id === tx.id) {
        await supabase
          .from('school_students')
          .update({ last_payment_date: formattedDate })
          .eq('id', studentId);
      }

      toast({ title: "Date Updated", description: "Payment date successfully updated." });
      setEditingTxId(null);
      fetchPaymentHistory();
    } catch (error: any) {
      console.error("Error updating date:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTransaction = (transaction: PaymentTransaction) => {
    setTransactionToDelete(transaction);
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
                          {editingTxId === transaction.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="date"
                                value={editDateValue}
                                onChange={(e) => setEditDateValue(e.target.value)}
                                className="h-7 text-xs w-[130px] px-2 py-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-600"
                                onClick={() => handleEditDate(transaction.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground"
                                onClick={() => setEditingTxId(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {format(new Date(transaction.payment_date), "MMM dd, yyyy")}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => {
                                  setEditDateValue(transaction.payment_date);
                                  setEditingTxId(transaction.id);
                                }}
                                title="Edit Date"
                              >
                                <Edit2 className="h-3 w-3 text-muted-foreground hover:text-blue-600" />
                              </Button>
                            </div>
                          )}
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
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setPreviewModal({
                                isOpen: true,
                                documentType: 'school_receipt',
                                documentData: {
                                  ...transaction,
                                  student_name: studentName,
                                  prepared_by: 'Authorized Officer'
                                }
                              })}
                              title="Print Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteTransaction(transaction)}
                              title="Delete this payment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
      
      <DeleteSchoolPaymentDialog
        paymentId={transactionToDelete?.id || null}
        paymentAmount={transactionToDelete?.amount_paid || 0}
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
        onSuccess={() => {
          fetchPaymentHistory();
          setTransactionToDelete(null);
        }}
      />

      <FinanceDocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        documentType={previewModal.documentType}
        documentData={previewModal.documentData}
      />
    </Dialog>
  );
}
