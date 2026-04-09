import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Trash2 } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { usePostPaymentToGL, useBranchFinanceSettings } from "@/hooks/useSchoolBusFinance";

interface PaymentMatchingPreviewProps {
  importId: string;
  matchStatus: 'auto_matched' | 'partial_match';
  onStatsUpdate: (stats: any) => void;
}

export function PaymentMatchingPreview({ importId, matchStatus, onStatsUpdate }: PaymentMatchingPreviewProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const postPaymentToGL = usePostPaymentToGL();

  useEffect(() => {
    fetchItems();
  }, [importId, matchStatus]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('school_payment_import_items')
      .select('*')
      .eq('import_id', importId)
      .eq('match_status', matchStatus)
      .order('txn_date', { ascending: false });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const handleDeleteRow = async (itemId: string) => {
    try {
      // Update the item's match_status to 'ignored'
      const { error } = await supabase
        .from('school_payment_import_items')
        .update({ match_status: 'ignored' })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Removed",
        description: "Payment row removed from list",
      });

      // Remove from displayed list
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove row",
        variant: "destructive",
      });
    }
  };

  // For partial_match, only allow confirming items with exactly 1 matched student
  const confirmableItems = matchStatus === 'partial_match'
    ? items.filter(item => (item.matched_student_ids || []).length === 1)
    : items;

  const handleConfirmAll = async () => {
    if (confirmableItems.length === 0) {
      toast({ title: "No confirmable items", description: "Partial matches with multiple students must be resolved individually.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      // Fetch student details for all matched students
      const studentIds = [...new Set(confirmableItems.flatMap(item => item.matched_student_ids || []))];
      const { data: students, error: studentsError } = await supabase
        .from('school_students')
        .select('id, fixed_monthly_amount, payment_balance')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      const studentMap = new Map(students?.map(s => [s.id, s]) || []);

      // Create payment transactions for all matched items
      const transactions = confirmableItems.flatMap(item => {
        const matchedStudents = item.matched_student_ids || [];
        const splitAmount = item.amount / matchedStudents.length;
        
        const paymentDate = new Date(item.txn_date);
        const paymentMonth = paymentDate.toISOString().slice(0, 7) + '-01';

        return matchedStudents.map((studentId: string) => {
          const student = studentMap.get(studentId);
          const fixedAmount = student?.fixed_monthly_amount || 0;
          const balanceBefore = student?.payment_balance || 0;
          const difference = splitAmount - fixedAmount;
          const balanceAfter = balanceBefore + difference;

          return {
            student_id: studentId,
            payment_date: item.txn_date,
            payment_month: paymentMonth,
            amount_paid: splitAmount,
            fixed_amount: fixedAmount,
            difference: difference,
            payment_balance_before: balanceBefore,
            payment_balance_after: balanceAfter,
            payment_method: 'Bank Transfer',
            reference_no: `IMPORT-${importId.slice(0, 8)}`,
            notes: `Auto-imported from bank statement: ${item.description}`,
          };
        });
      });

      const { data: insertedPayments, error } = await supabase
        .from('school_payment_transactions')
        .insert(transactions)
        .select();

      if (error) throw error;

      // Post each payment to GL (async, non-blocking per payment)
      if (insertedPayments) {
        for (const txn of insertedPayments) {
          const student = studentMap.get(txn.student_id);
          // Get branch_id for the student
          const { data: studentData } = await supabase
            .from('school_students')
            .select('branch_id, student_name')
            .eq('id', txn.student_id)
            .single();

          if (studentData?.branch_id) {
            try {
              await postPaymentToGL.mutateAsync({
                paymentId: txn.id,
                amount: txn.amount_paid,
                branchId: studentData.branch_id,
                studentName: studentData.student_name || 'Student',
                paymentMethod: 'Bank Transfer',
                referenceNo: txn.reference_no || undefined,
                fixedAmount: student?.fixed_monthly_amount || 0,
                overpaymentAmount: txn.difference > 0 ? txn.difference : undefined,
                previousBalance: student?.payment_balance || 0,
              });
            } catch (glError) {
              console.error("GL posting failed for bank import payment:", glError);
            }
          }
        }
      }

      // Update student balances (trigger handles this, but ensure)
      for (const txn of transactions) {
        await supabase
          .from('school_students')
          .update({ payment_balance: txn.payment_balance_after })
          .eq('id', txn.student_id);
      }

      // Update import items as processed
      const itemIds = confirmableItems.map(i => i.id);
      await supabase
        .from('school_payment_import_items')
        .update({
          match_status: 'manual_matched',
          processed_at: new Date().toISOString(),
        })
        .in('id', itemIds);

      // Update import record stats
      const { data: importData } = await supabase
        .from('school_payment_imports')
        .select('auto_matched_count, manual_matched_count, unmatched_count')
        .eq('id', importId)
        .single();

      if (importData) {
        await supabase
          .from('school_payment_imports')
          .update({
            manual_matched_count: importData.manual_matched_count + confirmableItems.length,
            unmatched_count: importData.unmatched_count - confirmableItems.length,
          })
          .eq('id', importId);

        onStatsUpdate({
          total: importData.auto_matched_count + importData.manual_matched_count + importData.unmatched_count,
          autoMatched: importData.auto_matched_count,
          needsReview: 0,
          unmatched: importData.unmatched_count - confirmableItems.length,
        });
      }

      toast({
        title: "Success",
        description: `Confirmed ${confirmableItems.length} payment${confirmableItems.length > 1 ? 's' : ''}`,
      });

      fetchItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm payments",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "txn_date",
      header: "Date",
      cell: ({ row }) => formatDateDisplay(row.original.txn_date),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="font-medium truncate">{row.original.description}</p>
          {row.original.extracted_ids && row.original.extracted_ids.length > 0 && (
            <div className="flex gap-1 mt-1">
              {row.original.extracted_ids.map((id: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {id}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold">
          LKR {row.original.amount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "suggested_students",
      header: "Matched Student(s)",
      cell: ({ row }) => {
        const students = row.original.suggested_students || [];
        return (
          <div className="space-y-1">
            {students.map((student: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant="default">{student.admission_no}</Badge>
                <span className="text-sm">{student.student_name}</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "match_confidence",
      header: "Confidence",
      cell: ({ row }) => (
        <Badge
          variant={row.original.match_confidence >= 80 ? "default" : "secondary"}
        >
          {row.original.match_confidence}%
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteRow(row.original.id)}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No {matchStatus === 'auto_matched' ? 'auto-matched' : 'partial'} payments to review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {matchStatus === 'auto_matched' ? 'Auto-Matched' : 'Needs Review'} Payments ({items.length})
          </CardTitle>
          <Button
            onClick={handleConfirmAll}
            disabled={processing}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm All {items.length} Payment{items.length > 1 ? 's' : ''}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}
