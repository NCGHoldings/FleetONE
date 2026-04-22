import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Clock, CheckCircle, AlertCircle, Download, Receipt, History, FileSpreadsheet, Settings, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ColumnDef } from "@tanstack/react-table";
import { RecordPaymentModal } from "@/components/school/RecordPaymentModal";
import { PaymentHistoryModal } from "@/components/school/PaymentHistoryModal";
import { OutstandingStudentsView } from "@/components/school/OutstandingStudentsView";
import { BulkARInvoiceDialog } from "@/components/school/BulkARInvoiceDialog";
import { SchoolBusBranchPLReport } from "@/components/school/SchoolBusBranchPLReport";
import React from "react";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkARDialog, setShowBulkARDialog] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidStudents: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    overdueAmount: 0,
    totalOwed: 0,
    totalCredit: 0,
  });

  const [currentMonthTransactions, setCurrentMonthTransactions] = useState<any[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  const uniqueGrades = React.useMemo(() => {
    const grades = new Set(students.map(s => s.grade).filter(Boolean));
    return Array.from(grades).sort();
  }, [students]);

  const filteredStudents = React.useMemo(() => {
    return students.filter(s => {
      // Status
      const due = s.current_amount_due || 0;
      const balance = s.payment_balance || 0;
      let effectiveStatus = s.payment_status;
      if (due <= 0 && balance >= 0) {
        effectiveStatus = 'paid';
      }

      if (filterStatus !== "all") {
        if (effectiveStatus !== filterStatus) return false;
      }
      
      // Grade
      if (filterGrade !== "all" && s.grade !== filterGrade) return false;
      
      // Amount Due
      if (minAmount && due < parseFloat(minAmount)) return false;
      if (maxAmount && due > parseFloat(maxAmount)) return false;
      
      return true;
    });
  }, [students, filterStatus, filterGrade, minAmount, maxAmount]);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterGrade("all");
    setMinAmount("");
    setMaxAmount("");
  };

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

      // Fetch all transactions for this branch to compute Last Paid and current month revenue
      const { data: txData } = await supabase
        .from('school_payment_transactions')
        .select('id, amount_paid, student_id, payment_date, school_students!inner(branch_id)')
        .eq('school_students.branch_id', branchId);

      // Filter for current month revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const currentMonthTx = (txData || []).filter((tx: any) => {
        if (!tx.payment_date) return false;
        return new Date(tx.payment_date) >= startOfMonth;
      });
      
      setCurrentMonthTransactions(currentMonthTx);
      
      // Log this so the user can debug where the 30,205 came from
      console.log("=== TRANSACTIONS THIS MONTH (Revenue Calculation) ===", currentMonthTx);

      const actualRevenue = currentMonthTx.reduce((sum: number, tx: any) => sum + (Number(tx.amount_paid) || 0), 0);

      // Merge latest transaction data into students for perfectly accurate "Last Paid"
      const studentsWithComputedStatus = (data || []).map(s => {
        const studentTx = (txData || []).filter((tx: any) => tx.student_id === s.id);
        const latestTx = studentTx.sort((a: any, b: any) => 
          new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime()
        )[0];

        return {
          ...s,
          payment_amount: latestTx ? latestTx.amount_paid : s.payment_amount,
          last_payment_date: latestTx ? latestTx.payment_date : s.last_payment_date
        };
      });

      setStudents(studentsWithComputedStatus);
      calculateStats(studentsWithComputedStatus, actualRevenue);
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

  const calculateStats = (studentData: Student[], actualRevenue: number = 0) => {
    const totalStudents = studentData.length;
    
    // Derive status from balance: paid = amount due <= 0, pending = balance < 0
    const paidStudents = studentData.filter(s => (s.current_amount_due || 0) <= 0 && s.payment_balance >= 0).length;
    const pendingPayments = studentData.filter(s => (s.current_amount_due || 0) > 0 && s.payment_balance < 0).length;
    
    // Revenue from actual transactions, not stale payment_amount field
    const totalRevenue = actualRevenue;
    
    // Overdue = all outstanding (balance < 0)
    const overdueAmount = studentData
      .filter(s => s.payment_balance < 0)
      .reduce((sum, s) => sum + (s.current_amount_due || Math.abs(s.payment_balance) || 0), 0);
    
    // Total owed = sum of negative balances
    const totalOwed = studentData.reduce((sum, s) => sum + (s.payment_balance < 0 ? Math.abs(s.payment_balance) : 0), 0);
    
    // Advance/credit = sum of positive balances
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

  const handleExport = () => {
    toast({
      title: "Export Feature",
      description: "Export functionality coming soon",
    });
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
        let status = row.getValue("payment_status") as string;
        const due = row.original.current_amount_due || 0;
        const balance = row.original.payment_balance || 0;

        // Dynamically override status based on actual calculated due
        if (due <= 0 && balance >= 0) {
          status = 'paid';
        }

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
        <div className="flex gap-2">
          <Button onClick={() => setShowBulkARDialog(true)} variant="default">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Generate AR Invoices
          </Button>
          <Button onClick={() => navigate(`/school-bus/branch/${branchId}/payment-import`)} variant="outline">
            Import Bank Statement
          </Button>
          <Button onClick={() => navigate(`/school-bus/branch/${branchId}/payment-settings`)} variant="outline">
            Import Settings
          </Button>
          <Button onClick={() => navigate("/settings?tab=school-bus-finance")} variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
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
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Total Revenue
              <div className="flex items-center gap-1">
                {currentMonthTransactions.length > 0 && currentMonthTransactions.some(tx => !students.find(s => s.id === tx.student_id)) && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-6 text-[10px] px-2"
                    onClick={async () => {
                      try {
                        const unknownTxs = currentMonthTransactions.filter(tx => !students.find(s => s.id === tx.student_id));
                        const ids = unknownTxs.map(tx => tx.id);
                        if (ids.length > 0) {
                          await supabase.from('school_payment_transactions').delete().in('id', ids);
                          toast({ title: "Success", description: "Unknown payments removed!" });
                          fetchStudents();
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Fix Revenue
                  </Button>
                )}
                {currentMonthTransactions.length > 0 && (
                  <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-primary">
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3">
                    <h4 className="font-semibold text-sm mb-2">This Month's Transactions</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {currentMonthTransactions.map((tx, idx) => {
                        const student = students.find(s => s.id === tx.student_id);
                        return (
                          <div key={idx} className="flex justify-between text-xs border-b pb-1">
                            <span className="truncate pr-2">{student?.student_name || 'Unknown'}</span>
                            <div className="text-right flex-shrink-0">
                              <div className="font-medium text-green-600">LKR {Number(tx.amount_paid).toLocaleString()}</div>
                              <div className="text-muted-foreground text-[10px]">{new Date(tx.payment_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              </div>
            </CardTitle>
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

      {/* Tabs for Different Views */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Students</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="pl-report">P&L Report</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Advanced Filters */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-4">
              <div className="space-y-1 min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground">Grade</label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {uniqueGrades.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Min Amount Due (LKR)</label>
                <Input 
                  type="number" 
                  placeholder="Min Amount" 
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="h-8 w-[150px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Max Amount Due (LKR)</label>
                <Input 
                  type="number" 
                  placeholder="Max Amount" 
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="h-8 w-[150px]"
                />
              </div>
              {(filterStatus !== "all" || filterGrade !== "all" || minAmount || maxAmount) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-muted-foreground">
                  <FilterX className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={filteredStudents}
                searchKey="student_name"
                title="Student Payments"
                enableColumnFilters={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding" className="space-y-0">
          <OutstandingStudentsView
            students={students}
            onRecordPayment={handleRecordPayment}
            onViewHistory={handleViewHistory}
          />
        </TabsContent>

        {branchId && branch && (
          <TabsContent value="pl-report" className="space-y-0">
            <SchoolBusBranchPLReport
              branchId={branchId}
              branchName={branch.branch_name}
              branchCode={branch.branch_code}
              onBack={() => navigate(`/school-bus/branch/${branchId}`)}
            />
          </TabsContent>
        )}
      </Tabs>

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

      {branchId && branch && (
        <BulkARInvoiceDialog
          open={showBulkARDialog}
          onOpenChange={setShowBulkARDialog}
          branchId={branchId}
          branchName={branch.branch_name}
        />
      )}
    </div>
  );
}
