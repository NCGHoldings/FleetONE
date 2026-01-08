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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  useEffect(() => {
    fetchData();
  }, [importId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch unmatched items
    const { data: itemsData } = await supabase
      .from('school_payment_import_items')
      .select('*')
      .eq('import_id', importId)
      .eq('match_status', 'unmatched')
      .order('txn_date', { ascending: false });

    // Fetch all students
    const studentsQuery: any = await (supabase as any)
      .from('school_students')
      .select('*')
      .eq('branch_id', branchId)
      .order('student_name');
    
    const studentsData = studentsQuery.data;

    if (itemsData) setItems(itemsData);
    if (studentsData) setStudents(studentsData);
    setLoading(false);
  };

  const handleManualMatch = async (itemId: string, studentId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    try {
      // Fetch student details including current balance
      const { data: student, error: studentError } = await supabase
        .from('school_students')
        .select('fixed_monthly_amount, payment_balance')
        .eq('id', studentId)
        .single();

      if (studentError || !student) throw new Error('Student not found');

      const amountPaid = item.amount;
      const fixedAmount = student.fixed_monthly_amount || 0;
      const balanceBefore = student.payment_balance || 0;
      const difference = amountPaid - fixedAmount;
      const balanceAfter = balanceBefore + difference;
      
      // Get payment month (format: YYYY-MM)
      const paymentDate = new Date(item.txn_date);
      const paymentMonth = paymentDate.toISOString().slice(0, 7);

      // Create payment transaction
      const { error: txnError } = await supabase
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
          notes: `Manually matched from import: ${item.description}`,
        }]);

      if (txnError) throw txnError;

      // Update student balance
      await supabase
        .from('school_students')
        .update({ payment_balance: balanceAfter })
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

      toast({
        title: "Payment Matched",
        description: "Payment has been successfully recorded",
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
          <Select
            onValueChange={(value) => handleManualMatch(row.original.id, value)}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select student..." />
            </SelectTrigger>
            <SelectContent>
              {students
                .filter(s =>
                  s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.admission_no} - {student.student_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
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
