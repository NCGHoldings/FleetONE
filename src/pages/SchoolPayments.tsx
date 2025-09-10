import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Clock, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ColumnDef } from "@tanstack/react-table";

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  grade: string;
  payment_status: string;
  payment_amount: number;
  last_payment_date: string;
  parent_name: string;
  father_contact_no: string;
  update_new: number;
}

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
}

export default function SchoolPayments() {
  const { branchId } = useParams<{ branchId: string }>();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidStudents: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    overdueAmount: 0
  });

  useEffect(() => {
    if (branchId) {
      fetchBranchData();
      fetchStudents();
    }
  }, [branchId]);

  const fetchBranchData = async () => {
    try {
      const { data, error } = await supabase
        .from('school_branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error) throw error;
      setBranch(data);
    } catch (error) {
      console.error('Error fetching branch:', error);
      toast({
        title: "Error",
        description: "Failed to load branch information",
        variant: "destructive",
      });
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_students')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (error) throw error;

      setStudents(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to load student payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentData: Student[]) => {
    const totalStudents = studentData.length;
    const paidStudents = studentData.filter(s => s.payment_status === 'paid').length;
    const pendingPayments = studentData.filter(s => s.payment_status === 'pending').length;
    const totalRevenue = studentData
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.payment_amount || 0), 0);
    const overdueAmount = studentData
      .filter(s => s.payment_status === 'overdue')
      .reduce((sum, s) => sum + (s.update_new || 0), 0);

    setStats({
      totalStudents,
      paidStudents,
      pendingPayments,
      totalRevenue,
      overdueAmount
    });
  };

  const handleMarkAsPaid = async (studentId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('school_students')
        .update({
          payment_status: 'paid',
          payment_amount: amount,
          last_payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment marked as received",
      });

      fetchStudents();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "student_name",
      header: "Student Name",
    },
    {
      accessorKey: "admission_no",
      header: "Admission No",
    },
    {
      accessorKey: "grade",
      header: "Grade",
    },
    {
      accessorKey: "payment_status",
      header: "Payment Status",
      cell: ({ row }) => {
        const status = row.getValue("payment_status") as string;
        return (
          <Badge variant={
            status === 'paid' ? 'success' : 
            status === 'overdue' ? 'destructive' : 'secondary'
          }>
            {status === 'paid' ? <CheckCircle className="w-3 h-3 mr-1" /> :
             status === 'overdue' ? <AlertCircle className="w-3 h-3 mr-1" /> :
             <Clock className="w-3 h-3 mr-1" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "update_new",
      header: "Amount Due",
      cell: ({ row }) => {
        const amount = row.getValue("update_new") as number;
        return amount ? `LKR ${amount.toLocaleString()}` : '-';
      },
    },
    {
      accessorKey: "payment_amount",
      header: "Last Payment",
      cell: ({ row }) => {
        const amount = row.getValue("payment_amount") as number;
        return amount ? `LKR ${amount.toLocaleString()}` : '-';
      },
    },
    {
      accessorKey: "last_payment_date",
      header: "Payment Date",
      cell: ({ row }) => {
        const date = row.getValue("last_payment_date") as string;
        return date ? new Date(date).toLocaleDateString() : '-';
      },
    },
    {
      accessorKey: "father_contact_no",
      header: "Contact",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const student = row.original;
        const suggestedAmount = student.update_new || student.payment_amount || 0;
        
        return student.payment_status !== 'paid' ? (
          <Button
            size="sm"
            onClick={() => handleMarkAsPaid(student.id, suggestedAmount)}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <CreditCard className="w-3 h-3 mr-1" />
            Mark Paid (LKR {suggestedAmount.toLocaleString()})
          </Button>
        ) : (
          <Badge variant="success">Paid</Badge>
        );
      },
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading payment data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/school-bus/branch/${branchId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Branch
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payment Management</h1>
            <p className="text-muted-foreground">
              {branch?.branch_name} ({branch?.branch_code})
            </p>
          </div>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.paidStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              LKR {stats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              LKR {stats.overdueAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={students}
            searchKey="student_name"
            title="Student Payments"
          />
        </CardContent>
      </Card>
    </div>
  );
}