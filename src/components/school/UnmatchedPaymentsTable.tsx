import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, X } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { SearchableStudentSelector } from "./SearchableStudentSelector";
import { usePostPaymentToGL } from "@/hooks/useSchoolBusFinance";

interface UnmatchedPaymentsTableProps {
  importId: string;
  branchId: string;
  onStatsUpdate: (stats: any) => void;
}

export function UnmatchedPaymentsTable({ importId, branchId, onStatsUpdate }: UnmatchedPaymentsTableProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Record<string, string>>({});
  const postPaymentToGL = usePostPaymentToGL();

  useEffect(() => {
    if (importId && branchId) {
      fetchData();
    }
  }, [importId, branchId]);

  const fetchData = async () => {
    if (!importId || !branchId) return;
    
    try {
      setLoading(true);
      
      // Fetch unmatched and posted_unmatched items
      const { data: itemsData, error: itemsError } = await supabase
        .from('school_payment_import_items')
        .select('*')
        .eq('import_id', importId)
        .in('match_status', ['unmatched', 'posted_unmatched'])
        .order('txn_date', { ascending: false });

      if (itemsError) {
        console.error("Error fetching items:", itemsError);
      }

      // Fetch ACTIVE students only for this branch
      const { data: studentsData, error: studentsError } = await supabase
        .from('school_students')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('student_name');
      
      if (studentsError) {
        console.error("Error fetching students:", studentsError);
      }

      if (itemsData) setItems(itemsData);
      if (studentsData) setStudents(studentsData);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMatch = async (itemId: string, studentId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Validate student belongs to current branch
    const student = students.find(s => s.id === studentId);
    if (!student || student.branch_id !== branchId) {
      toast({ title: "Error", description: "Student does not belong to this branch", variant: "destructive" });
      return;
    }

    try {
      // Fetch student details including current balance
      const { data: studentData, error: studentError } = await supabase
        .from('school_students')
        .select('fixed_monthly_amount, payment_balance')
        .eq('id', studentId)
        .eq('branch_id', branchId)
        .single();

      if (studentError || !studentData) throw new Error('Student not found in this branch');

      if (item.match_status === 'unmatched') {
        // Just mark as ready for Finance (Operations matched it before Finance approval)
        await supabase
          .from('school_payment_import_items')
          .update({
            matched_student_ids: [studentId],
            match_status: 'ready_for_finance',
            processed_at: new Date().toISOString(),
          })
          .eq('id', itemId);
      } else if (item.match_status === 'posted_unmatched') {
        // Finance already posted this to Suspense. Create transaction and Reverse Suspense -> AR.
        const amountPaid = item.amount;
        const fixedAmount = studentData.fixed_monthly_amount || 0;
        const balanceBefore = studentData.payment_balance || 0;
        const difference = amountPaid - fixedAmount;
        const balanceAfter = balanceBefore + difference;
        
        // Get payment month (format: YYYY-MM-01 to satisfy PostgreSQL date type)
        const paymentDate = new Date(item.txn_date);
        const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-01`;

        // Create payment transaction
        const { data: insertedTxns, error: txnError } = await supabase
          .from('school_payment_transactions')
          .insert([{
            student_id: studentId,
            payment_date: item.txn_date,
            payment_month: paymentMonth,
            amount_paid: amountPaid,
            fixed_amount: fixedAmount,
            difference: difference,
            payment_balance_before: balanceBefore,
            payment_balance_after: balanceAfter,
            payment_method: 'Bank Transfer',
            reference_no: `IMPORT-${importId.slice(0, 8)}`,
            notes: `Manually matched from suspense: ${item.description}`,
          }])
          .select();

        if (txnError) throw txnError;

        // Post to GL (Suspense -> AR)
        const suspenseCoaId = item.notes?.split('Suspense COA: ')[1]?.trim();
        if (suspenseCoaId && insertedTxns && insertedTxns.length > 0) {
          try {
            await postPaymentToGL.mutateAsync({
              paymentId: insertedTxns[0].id,
              amount: amountPaid,
              branchId: branchId,
              studentName: student.student_name || 'Student',
              paymentMethod: 'Bank Transfer',
              referenceNo: `REVERSAL-${item.description}`,
              fixedAmount: fixedAmount,
              overpaymentAmount: difference > 0 ? difference : undefined,
              previousBalance: balanceBefore,
              customBankAccountId: suspenseCoaId // Dr Suspense
            });
          } catch (e) {
            console.error("Suspense reversal GL posting failed", e);
            toast({ title: "GL Warning", description: "Payment recorded but GL reversal failed.", variant: "destructive" });
          }
        }

        // Update student balance and payment status
        await supabase
          .from('school_students')
          .update({ 
            payment_balance: balanceAfter,
            payment_status: 'paid',
            last_payment_date: item.txn_date
          })
          .eq('id', studentId);

        // Update import item
        await supabase
          .from('school_payment_import_items')
          .update({
            matched_student_ids: [studentId],
            match_status: 'manual_matched',
            processed_at: new Date().toISOString(),
          })
          .eq('id', itemId);
      }

      // Save pattern for future learning
      try {
        await supabase
          .from('school_payment_pattern_history')
          .insert([{
            branch_id: branchId,
            original_description: item.description,
            matched_admission_no: student.admission_no || studentId,
            pattern_type: 'manual_match',
          }]);
      } catch (e) {
        console.warn('Pattern learning save failed (non-critical):', e);
      }

      toast({
        title: "Payment Matched",
        description: "Payment has been successfully recorded",
      });

      // Clear the selection for this row
      setSelectedStudents(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to match payment",
        variant: "destructive",
      });
    }
  };

  const handleIgnore = async (itemId: string) => {
    await supabase
      .from('school_payment_import_items')
      .update({
        match_status: 'ignored',
        notes: 'Ignored by user',
      })
      .eq('id', itemId);

    fetchData();
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
          <p className="font-medium">{row.original.description}</p>
          {row.original.extracted_ids && row.original.extracted_ids.length > 0 && (
            <div className="flex gap-1 mt-1">
              {(row.original.extracted_ids as string[]).map((id: string, idx: number) => (
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
      id: "actions",
      header: "Match to Student",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <SearchableStudentSelector
            students={students.filter(s => {
              if (!searchTerm) return true;
              const name = (s.student_name || '').toLowerCase();
              const admNo = (s.admission_no || '').toLowerCase();
              const term = searchTerm.toLowerCase();
              return name.includes(term) || admNo.includes(term);
            })}
            value={selectedStudents[row.original.id] || null}
            onValueChange={(value) => {
              if (value !== null) {
                setSelectedStudents(prev => ({ ...prev, [row.original.id]: value }));
              } else {
                setSelectedStudents(prev => {
                  const next = { ...prev };
                  delete next[row.original.id];
                  return next;
                });
              }
            }}
          />
          <Button
            onClick={() => handleManualMatch(row.original.id, selectedStudents[row.original.id])}
            disabled={!selectedStudents[row.original.id]}
            size="sm"
          >
            Confirm
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleIgnore(row.original.id)}
            title="Ignore this transaction"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
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
          <p>No unmatched payments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Unmatched Payments ({items.length})</CardTitle>
          <div className="flex gap-2 items-center">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}
