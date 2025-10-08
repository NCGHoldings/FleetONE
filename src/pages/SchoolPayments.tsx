import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Clock, CheckCircle, AlertCircle, Download, Receipt, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ColumnDef } from "@tanstack/react-table";
import { RecordPaymentModal } from "@/components/school/RecordPaymentModal";
import { PaymentHistoryModal } from "@/components/school/PaymentHistoryModal";

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
  fixed_monthly_amount: number;
  payment_balance: number;
  current_amount_due: number;
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidStudents: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    overdueAmount: 0,
    totalOwed: 0,
    totalCredit: 0,
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
      .reduce((sum, s) => sum + (s.current_amount_due || s.update_new || 0), 0);
    const totalOwed = studentData.reduce((sum, s) => sum + (s.payment_balance < 0 ? Math.abs(s.payment_balance) : 0), 0);
    const totalCredit = studentData.reduce((sum, s) => sum + (s.payment_balance > 0 ? s.payment_balance : 0), 0);

    setStats({
      totalStudents,
      paidStudents,
      pendingPayments,
      totalRevenue,
      overdueAmount,
      totalOwed,
      totalCredit,
    });
  };

  const handleRecordPayment = (student: Student) => {
    setSelectedStudent(student);
    setShowPaymentModal(true);
  };

  const handleViewHistory = (student: Student) => {
    setSelectedStudent(student);
    setShowHistoryModal(true);
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
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("payment_status") as string;
        return (
          <Badge variant={
            status === 'paid' ? 'default' : 
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
      accessorKey: "fixed_monthly_amount",
      header: "Fixed Amount",
      cell: ({ row }) => {
        const amount = row.getValue("fixed_monthly_amount") as number;
        return <span className="font-medium text-primary">LKR {amount?.toLocaleString() || 0}</span>;
      },
    },
    {
      accessorKey: "payment_balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = row.getValue("payment_balance") as number;
        const isNegative = balance < 0;
        return (
          <span className={isNegative ? "font-medium text-destructive" : "font-medium text-green-600"}>
            LKR {balance?.toLocaleString() || 0}
            <span className="text-xs ml-1">
              {isNegative ? "(owed)" : balance > 0 ? "(credit)" : ""}
            </span>
          </span>
        );
      },
    },
    {
      accessorKey: "current_amount_due",
      header: "Amount Due",
      cell: ({ row }) => {
        const due = row.getValue("current_amount_due") as number;
        return <span className="font-semibold">LKR {due?.toLocaleString() || 0}</span>;
      },
    },
    {
      accessorKey: "payment_amount",
      header: "Last Paid",
      cell: ({ row }) => {
        const amount = row.getValue("payment_amount") as number;
        return <span className="font-medium">LKR {amount?.toLocaleString() || 0}</span>;
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
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleRecordPayment(student)}
            >
              <Receipt className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewHistory(student)}
            >
              <History className="h-4 w-4 mr-1" />
              History
            </Button>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
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
            <div className="text-2xl font-bold text-green-600">{stats.paidStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</div>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              LKR {stats.totalOwed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Advance Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              LKR {stats.totalCredit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Credit</p>
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

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={() => {
          fetchStudents();
        }}
      />

      <PaymentHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedStudent(null);
        }}
        studentId={selectedStudent?.id || null}
        studentName={selectedStudent?.student_name || ""}
      />
    </div>
  );
}
