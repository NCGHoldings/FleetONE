import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

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

  const handleConfirmAll = async () => {
    setProcessing(true);
    try {
      // Fetch student details for all matched students
      const studentIds = [...new Set(items.flatMap(item => item.matched_student_ids || []))];
      const { data: students, error: studentsError } = await supabase
        .from('school_students')
        .select('id, fixed_monthly_amount, payment_balance')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      const studentMap = new Map(students?.map(s => [s.id, s]) || []);

      // Create payment transactions for all matched items
      const transactions = items.flatMap(item => {
        const matchedStudents = item.matched_student_ids || [];
        const splitAmount = item.amount / matchedStudents.length;
        
        const paymentDate = new Date(item.txn_date);
        const paymentMonth = paymentDate.toISOString().slice(0, 7);

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

      const { error } = await supabase
        .from('school_payment_transactions')
        .insert(transactions);

      if (error) throw error;

      // Update student balances
      for (const txn of transactions) {
        await supabase
          .from('school_students')
          .update({ payment_balance: txn.payment_balance_after })
          .eq('id', txn.student_id);
      }

      // Update import items as processed
      const itemIds = items.map(i => i.id);
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
            manual_matched_count: importData.manual_matched_count + items.length,
            unmatched_count: importData.unmatched_count - items.length,
          })
          .eq('id', importId);

        onStatsUpdate({
          total: importData.auto_matched_count + importData.manual_matched_count + importData.unmatched_count,
          autoMatched: importData.auto_matched_count,
          needsReview: 0,
          unmatched: importData.unmatched_count - items.length,
        });
      }

      toast({
        title: "Success",
        description: `Confirmed ${items.length} payment${items.length > 1 ? 's' : ''}`,
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
