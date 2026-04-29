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
  const [allocationsPreview, setAllocationsPreview] = useState<Record<string, any>>({});
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

      // Pre-calculate allocations for preview
      const studentIds = [...new Set(data.flatMap(item => item.matched_student_ids || []))];
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('school_students')
          .select('id, fixed_monthly_amount, payment_balance, current_amount_due')
          .in('id', studentIds);
          
        if (students) {
          const studentMap = new Map(students.map(s => [s.id, s]));
          const newAllocations: Record<string, any> = {};
          
          data.forEach(item => {
            const matchedStudents = item.matched_student_ids || [];
            if (matchedStudents.length === 0) return;
            
            const studentDetails = matchedStudents.map((id: string) => studentMap.get(id)).filter(Boolean);
            const studentDues = studentDetails.map(student => ({
              student,
              due: student.current_amount_due || student.fixed_monthly_amount || 0
            }));
            
            const totalDue = studentDues.reduce((sum, s) => sum + s.due, 0);
            
            const allocations = studentDues.map(s => {
              let allocated = 0;
              if (totalDue === 0) {
                allocated = item.amount / matchedStudents.length;
              } else {
                allocated = s.due;
              }
              return { student: s.student, due: s.due, allocated };
            });

            const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated, 0);
            const difference = item.amount - totalAllocated;

            if (difference !== 0 && totalDue !== 0 && matchedStudents.length > 0) {
              const differencePerStudent = difference / matchedStudents.length;
              allocations.forEach(a => {
                a.allocated += differencePerStudent;
              });
            }
            
            newAllocations[item.id] = allocations;
          });
          
          setAllocationsPreview(newAllocations);
        }
      }
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

  // Allow confirming items with matched students (including multiple for bulk payments)
  const confirmableItems = matchStatus === 'partial_match'
    ? items.filter(item => (item.matched_student_ids || []).length > 0)
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
        .select('id, fixed_monthly_amount, payment_balance, current_amount_due')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      const studentMap = new Map(students?.map(s => [s.id, s]) || []);

      // Update import items as processed (ready for finance)
      const itemIds = confirmableItems.map(i => i.id);
      await supabase
        .from('school_payment_import_items')
        .update({
          match_status: 'ready_for_finance', // New status indicating Ops confirmed it
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
        let newManual = importData.manual_matched_count;
        let newUnmatched = importData.unmatched_count;
        
        if (matchStatus === 'partial_match') {
          newManual += confirmableItems.length;
          newUnmatched = Math.max(0, newUnmatched - confirmableItems.length);
        } else if (matchStatus === 'auto_matched') {
          // Confirming auto-matched items doesn't change the unmatched count
          // We can optionally shift them to manual, but it's better to keep the original categorization
        }

        await supabase
          .from('school_payment_imports')
          .update({
            manual_matched_count: newManual,
            unmatched_count: newUnmatched,
          })
          .eq('id', importId);

        onStatsUpdate({
          total: importData.auto_matched_count + importData.manual_matched_count + importData.unmatched_count,
          autoMatched: importData.auto_matched_count,
          needsReview: matchStatus === 'partial_match' ? 0 : undefined, // Let it naturally clear
          unmatched: newUnmatched,
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
      header: "Matched Student(s) & Allocation",
      cell: ({ row }) => {
        const students = row.original.suggested_students || [];
        const allocations = allocationsPreview[row.original.id] || [];
        
        return (
          <div className="space-y-2 min-w-[300px]">
            {students.map((student: any, idx: number) => {
              const alloc = allocations.find((a: any) => a.student.id === student.id);
              
              return (
                <div key={idx} className="flex flex-col gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md border text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-[10px]">{student.admission_no}</Badge>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                  </div>
                  {alloc && (
                    <div className="grid grid-cols-3 gap-2 mt-1 text-muted-foreground pt-1 border-t">
                      <div>
                        <span className="block text-[10px] uppercase">AR Due</span>
                        <span className="font-semibold text-foreground">
                          {alloc.due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase">Allocated</span>
                        <span className="font-semibold text-primary">
                          {alloc.allocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase">Bal Diff</span>
                        <span className={`font-semibold ${alloc.allocated - alloc.due > 0 ? 'text-green-600' : alloc.allocated - alloc.due < 0 ? 'text-red-500' : ''}`}>
                          {alloc.allocated - alloc.due > 0 ? '+' : ''}{(alloc.allocated - alloc.due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
          <div className="flex items-center gap-2">
            {matchStatus === 'partial_match' && confirmableItems.length < items.length && (
              <span className="text-xs text-muted-foreground">
                {items.length - confirmableItems.length} ambiguous — resolve in Unmatched tab
              </span>
            )}
            <Button
              onClick={handleConfirmAll}
              disabled={processing || confirmableItems.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm {confirmableItems.length} Payment{confirmableItems.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={items} />
      </CardContent>
    </Card>
  );
}
