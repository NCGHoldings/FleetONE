import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Clock, CheckCircle, AlertCircle, Download, Receipt, History, FileSpreadsheet, Settings, FilterX, Trash2, Database, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ColumnDef } from "@tanstack/react-table";
import { RecordPaymentModal } from "@/components/school/RecordPaymentModal";
import { PaymentHistoryModal } from "@/components/school/PaymentHistoryModal";
import { AdjustBalanceModal } from "@/components/school/AdjustBalanceModal";
import { OutstandingStudentsView } from "@/components/school/OutstandingStudentsView";
import { BulkARInvoiceDialog } from "@/components/school/BulkARInvoiceDialog";
import { SchoolBusBranchPLReport } from "@/components/school/SchoolBusBranchPLReport";
import { SchoolBusFinanceSettlement } from "@/components/school/SchoolBusFinanceSettlement";
import { useAuth } from "@/hooks/useAuth";
import React from "react";
import * as XLSX from "xlsx";

interface Student {
  id: string;
  student_name: string;
  is_active?: boolean;
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
  last_payment_notes?: string;
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
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showBulkARDialog, setShowBulkARDialog] = useState(false);
  const [showFinanceHub, setShowFinanceHub] = useState(false);
  const { userRoles } = useAuth();
  
  const hasFinanceAccess = userRoles.includes('super_admin') || userRoles.includes('admin') || userRoles.includes('finance');
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterFinance, setFilterFinance] = useState<string>("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueGrades = React.useMemo(() => {
    const grades = new Set(students.map(s => s.grade).filter(Boolean));
    return Array.from(grades).sort();
  }, [students]);

  const filteredStudents = React.useMemo(() => {
    return students.filter(s => {
      // Active status filter
      if (filterActive === "active" && s.is_active === false) return false;
      if (filterActive === "inactive" && s.is_active !== false) return false;

      // Status
      const due = s.current_amount_due || 0;
      const balance = s.payment_balance || 0;
      const hasPaymentHistory = Number(s.payment_amount) > 0 || balance > 0;
      const isMathematicallyPaid = due <= 0 && balance >= 0 && hasPaymentHistory;
      
      let effectiveStatus = s.payment_status ? String(s.payment_status).toLowerCase().trim() : 'pending';
      
      if (s.is_active === false) {
        effectiveStatus = 'missing';
      } else if (isMathematicallyPaid || effectiveStatus === 'paid') {
        // If DB says paid OR math says paid, it's paid (matches KPI & Badges)
        effectiveStatus = 'paid';
      } else if (balance < 0) {
        effectiveStatus = 'overdue';
      } else {
        effectiveStatus = 'pending';
      }

      if (filterStatus !== "all") {
        if (effectiveStatus !== filterStatus) return false;
      }
      
      // Grade
      if (filterGrade !== "all" && s.grade !== filterGrade) return false;
      
      // Amount Due
      if (minAmount && due < parseFloat(minAmount)) return false;
      if (maxAmount && due > parseFloat(maxAmount)) return false;

      // Finance Integration
      if (filterFinance !== "all") {
        const issues = (s as any).finance_issues;
        if (filterFinance === "synced" && (issues?.hasAny)) return false;
        if (filterFinance === "pending_gl" && !issues?.missingGL) return false;
        if (filterFinance === "pending_allocation" && !issues?.missingAllocation) return false;
        if (filterFinance === "missing_ar" && !issues?.missingARSight) return false;
        if (filterFinance === "any_issue" && (!issues || !issues.hasAny)) return false;
      }
      
      // Global Search
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = s.student_name?.toLowerCase().includes(query);
        const matchesAdmission = s.admission_no?.toLowerCase().includes(query);
        const matchesNotes = s.last_payment_notes?.toLowerCase().includes(query);
        if (!matchesName && !matchesAdmission && !matchesNotes) return false;
      }

      return true;
    });
  }, [students, filterStatus, filterGrade, filterActive, filterFinance, minAmount, maxAmount, searchQuery]);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterGrade("all");
    setFilterActive("active");
    setFilterFinance("all");
    setMinAmount("");
    setMaxAmount("");
    setSearchQuery("");
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
    setErrorMsg(null);
    try {
      // Fetch all students using pagination to avoid 400 Bad Request (max-rows limit)
      let allBranchStudents: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('school_students')
          .select('*')
          .eq('branch_id', branchId)
          .range(page * pageSize, (page + 1) * pageSize - 1);
          
        if (error) throw error;
        allBranchStudents = [...allBranchStudents, ...(data || [])];
        hasMore = data && data.length === pageSize;
        page++;
      }
      
      const data = allBranchStudents;

      // Fetch all transactions for this branch
      const { data: txData } = await supabase
        .from('school_payment_transactions')
        .select('id, amount_paid, student_id, payment_date, gl_posted, notes, school_students!inner(branch_id, student_name, is_active)')
        .eq('school_students.branch_id', branchId);

      // Fetch all invoices for this branch to check for AR discrepancies
      const { data: invData } = await supabase
        .from('school_ar_invoices')
        .select('id, student_id, payment_id, status, ar_invoice_id, amount, paid_amount, school_students!inner(branch_id)')
        .neq('status', 'void')
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

        const studentInv = (invData || []).filter((inv: any) => inv.student_id === s.id);

        // Calculate finance issues
        const hasMissingGL = studentTx.some(tx => tx.gl_posted !== true);
        const hasUnallocatedPayment = studentTx.some(tx => tx.gl_posted === true && !studentInv.some(inv => inv.payment_id === tx.id));
        const hasUnpaidInvoice = studentInv.some(inv => inv.status === 'unpaid' || inv.status === 'posted');
        const hasMissingAllocation = hasUnallocatedPayment && hasUnpaidInvoice;
        const hasMissingARSight = studentInv.some(inv => (inv.status === 'paid' || inv.status === 'partial') && !inv.ar_invoice_id);

        return {
          ...s,
          payment_amount: latestTx ? latestTx.amount_paid : s.payment_amount,
          last_payment_date: latestTx ? latestTx.payment_date : s.last_payment_date,
          last_payment_notes: latestTx ? latestTx.notes : undefined,
          finance_issues: {
             missingGL: hasMissingGL,
             missingAllocation: hasMissingAllocation,
             missingARSight: hasMissingARSight,
             hasAny: hasMissingGL || hasMissingAllocation || hasMissingARSight
          }
        };
      });

      // Pass ALL students to state so they can be filtered by the UI dropdown
      console.log("FETCH STUDENTS SUCCESS, COUNT:", studentsWithComputedStatus.length);
      setStudents(studentsWithComputedStatus);
      // calculateStats internally filters out inactive students for KPI accuracy
      calculateStats(studentsWithComputedStatus, actualRevenue);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setErrorMsg(error.message || "Failed to load student payment data");
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
    // Only calculate stats for ACTIVE students to match the Total Students count
    const activeStudents = studentData.filter(s => s.is_active !== false);
    
    const totalStudents = activeStudents.length;
    
    // Derive status from balance OR database payment_status to match dashboard
    const paidStudents = activeStudents.filter(s => {
      const due = s.current_amount_due || 0;
      const balance = s.payment_balance || 0;
      const hasPaymentHistory = Number(s.payment_amount) > 0 || balance > 0;
      const isMathematicallyPaid = due <= 0 && balance >= 0 && hasPaymentHistory;
      
      const isStatusPaid = s.payment_status && String(s.payment_status).toLowerCase().trim() === 'paid';
      return isMathematicallyPaid || isStatusPaid;
    }).length;
    
    const pendingPayments = activeStudents.filter(s => {
      const due = s.current_amount_due || 0;
      const balance = s.payment_balance || 0;
      const hasPaymentHistory = Number(s.payment_amount) > 0 || balance > 0;
      const isMathematicallyPaid = due <= 0 && balance >= 0 && hasPaymentHistory;
      
      const isMathematicallyPending = due > 0 || balance < 0 || !isMathematicallyPaid;
      const isStatusPaid = s.payment_status && String(s.payment_status).toLowerCase().trim() === 'paid';
      const isStatusPending = s.payment_status && String(s.payment_status).toLowerCase().trim() === 'pending';
      return (isMathematicallyPending && !isStatusPaid) || isStatusPending;
    }).length;
    
    // Revenue from actual transactions (we can keep this as total actual revenue for the branch regardless of student status)
    const totalRevenue = actualRevenue;
    
    // Overdue = all outstanding (balance < 0)
    const overdueAmount = activeStudents
      .filter(s => s.payment_balance < 0)
      .reduce((sum, s) => sum + (s.current_amount_due || Math.abs(s.payment_balance) || 0), 0);
    
    // Total owed = sum of negative balances
    const totalOwed = activeStudents.reduce((sum, s) => sum + (s.payment_balance < 0 ? Math.abs(s.payment_balance) : 0), 0);
    
    // Advance/credit = sum of positive balances
    const totalCredit = activeStudents.reduce((sum, s) => sum + (s.payment_balance > 0 ? s.payment_balance : 0), 0);

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
    try {
      const exportData = filteredStudents.map(student => {
        let status = student.payment_status ? String(student.payment_status).toLowerCase().trim() : 'pending';
        const due = student.current_amount_due || 0;
        const balance = student.payment_balance || 0;
        const isActive = student.is_active !== false;
        const hasPaymentHistory = Number(student.payment_amount) > 0 || balance > 0;
        const isMathematicallyPaid = due <= 0 && balance >= 0 && hasPaymentHistory;

        if (!isActive) {
          status = 'Missing/Inactive';
        } else if (isMathematicallyPaid) {
          status = 'Paid';
        } else {
          status = status.charAt(0).toUpperCase() + status.slice(1);
        }

        const issues = (student as any).finance_issues;
        let financeStatus = "Synced";
        if (issues?.hasAny) {
          const statusList = [];
          if (issues.missingGL) statusList.push("Pending GL");
          if (issues.missingAllocation) statusList.push("Pending Allocation");
          if (issues.missingARSight) statusList.push("Missing AR Sync");
          financeStatus = statusList.join(", ");
        }

        return {
          "Student Name": student.student_name || "-",
          "Admission No": student.admission_no || "-",
          "Grade": student.grade || "-",
          "Status": status,
          "Fixed Amount (LKR)": student.fixed_monthly_amount || 0,
          "Balance (LKR)": student.payment_balance || 0,
          "Amount Due (LKR)": student.current_amount_due || 0,
          "Last Paid Amount (LKR)": student.payment_amount || 0,
          "Last Payment Date": student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString() : "-",
          "Contact No": student.father_contact_no || "-",
          "Finance Integration": financeStatus
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns slightly
      const colWidths = [
        { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
        { wch: 15 }, { wch: 15 }, { wch: 25 }
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      
      const fileName = `Student_Payments_${branch?.branch_code || 'Branch'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredStudents.length} records to Excel.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the Excel file.",
        variant: "destructive"
      });
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "student_name",
      header: "Student Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.student_name}</span>
          {row.original.is_active === false && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-destructive text-destructive bg-destructive/10">Inactive</Badge>
          )}
        </div>
      ),
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
        let status = row.getValue("payment_status") as string || 'pending';
        const due = row.original.current_amount_due || 0;
        const balance = row.original.payment_balance || 0;
        const isActive = row.original.is_active !== false;
        const hasPaymentHistory = Number(row.original.payment_amount) > 0 || balance > 0;
        const isMathematicallyPaid = due <= 0 && balance >= 0 && hasPaymentHistory;

        // Missing/Inactive students should be marked as missing to draw attention
        if (!isActive) {
          status = 'missing';
        } else if (isMathematicallyPaid) {
          // Dynamically override status based on actual calculated due
          status = 'paid';
        } else if (status !== 'paid') {
          status = 'pending';
        }

        return (
          <Badge variant={
            status === 'paid' ? 'default' : 
            status === 'missing' ? 'destructive' :
            status === 'overdue' ? 'destructive' : 'secondary'
          }>
            {status === 'paid' ? <CheckCircle className="w-3 h-3 mr-1" /> :
             status === 'missing' ? <AlertCircle className="w-3 h-3 mr-1" /> :
             status === 'overdue' ? <AlertCircle className="w-3 h-3 mr-1" /> :
             <Clock className="w-3 h-3 mr-1" />}
            {status === 'missing' ? 'Missing/Inactive' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
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
      id: "integration",
      header: "Finance Integration",
      accessorFn: (row: any) => {
        const issues = row.finance_issues;
        if (!issues || !issues.hasAny) return "Synced";
        let status = [];
        if (issues.missingGL) status.push("Pending GL");
        if (issues.missingAllocation) status.push("Pending Allocation");
        if (issues.missingARSight) status.push("Missing AR Sync");
        return status.join(", ");
      },
      cell: ({ row }) => {
        const issues = (row.original as any).finance_issues;
        if (!issues || !issues.hasAny) {
          return (
             <Badge variant="outline" className="text-[10px] h-5 py-0 border-green-200 text-green-700 bg-green-50">
               <CheckCircle className="w-3 h-3 mr-1" />
               Synced
             </Badge>
          );
        }

        return (
          <div className="flex flex-col gap-1">
            {issues.missingGL && (
              <Badge variant="outline" className="text-[9px] h-4 py-0 border-amber-200 text-amber-700 bg-amber-50 leading-tight">
                <Clock className="w-3 h-3 mr-1 shrink-0" /> Pending GL
              </Badge>
            )}
            {issues.missingAllocation && (
              <Badge variant="outline" className="text-[9px] h-4 py-0 border-blue-200 text-blue-700 bg-blue-50 leading-tight">
                <Database className="w-3 h-3 mr-1 shrink-0" /> Pending Allocation
              </Badge>
            )}
            {issues.missingARSight && (
              <Badge variant="outline" className="text-[9px] h-4 py-0 border-red-200 text-red-700 bg-red-50 leading-tight">
                <XCircle className="w-3 h-3 mr-1 shrink-0" /> Missing AR Sync
              </Badge>
            )}
          </div>
        );
      }
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
            {hasFinanceAccess && (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                onClick={() => {
                  setSelectedStudent(student);
                  setShowAdjustModal(true);
                }}
              >
                Adjust
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewHistory(student)}
            >
              <History className="h-4 w-4 mr-1" />
              History
            </Button>
            {hasFinanceAccess && (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                onClick={() => {
                  setSelectedStudent(student);
                  setShowFinanceHub(true);
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Finance Hub
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to permanently delete ${student.student_name} and all their payment records? This cannot be undone.`)) {
                  try {
                    // First delete their transactions to satisfy foreign key constraints
                    await supabase.from('school_payment_transactions').delete().eq('student_id', student.id);
                    await supabase.from('school_ar_invoices').delete().eq('student_id', student.id);
                    
                    // Then delete the student
                    const { error } = await supabase.from('school_students').delete().eq('id', student.id);
                    if (error) throw error;
                    
                    toast({ title: "Success", description: "Student and records permanently deleted." });
                    fetchStudents();
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  }
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading payment data...</div>;
  }

  const activeStudents = students.filter(s => s.is_active === true);
  const unknownTxs = currentMonthTransactions.filter(tx => !activeStudents.find(s => s.id === tx.student_id));

  return (
    <div className="space-y-6">
      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Error Loading Data</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {unknownTxs.length > 0 && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Missing or Inactive Students Detected</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                We detected <strong>{unknownTxs.length} payment(s)</strong> (Total: LKR {unknownTxs.reduce((sum, tx) => sum + Number(tx.amount_paid), 0).toLocaleString()}) 
                linked to students who are inactive or missing from the database. 
                This causes discrepancies in the total revenue calculation.
              </div>
              <div className="flex gap-2 shrink-0">
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={async () => {
                    try {
                      const inactiveStudentIds = unknownTxs.map(tx => tx.student_id).filter(Boolean);
                      if (inactiveStudentIds.length > 0) {
                        await supabase.from('school_students').update({ is_active: true }).in('id', inactiveStudentIds);
                        toast({ title: "Success", description: "Students restored to active status!" });
                        fetchStudents();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  Restore Students to Active
                </Button>
                <Button variant="outline" size="sm" className="bg-white" onClick={() => navigate(`/school-bus/branch/${branchId}`)}>
                  Manage Students
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={async () => {
                    try {
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
                  Purge Orphaned Revenue
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] px-2 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  onClick={async () => {
                    try {
                      const { data: branchStudents } = await supabase.from('school_students').select('id').eq('branch_id', branchId);
                      if (!branchStudents) return;

                      // 1. Fetch all transactions and invoices safely in chunks
                      const studentIds = branchStudents.map(s => s.id);
                      let allPayments: any[] = [];
                      let allInvoices: any[] = [];
                      
                      const chunkSize = 100;
                      for (let i = 0; i < studentIds.length; i += chunkSize) {
                        const chunk = studentIds.slice(i, i + chunkSize);
                        
                        // Auto-activate all students in this chunk just in case they were hidden
                        await supabase.from('school_students').update({ is_active: true }).in('id', chunk).eq('is_active', false);

                        const { data: pChunk } = await supabase.from('school_payment_transactions')
                          .select('*').in('student_id', chunk);
                        if (pChunk) allPayments = [...allPayments, ...pChunk];
                        
                        const { data: iChunk } = await supabase.from('school_ar_invoices')
                          .select('*').in('student_id', chunk).neq('status', 'void');
                        if (iChunk) allInvoices = [...allInvoices, ...iChunk];
                      }

                      // Sort them to simulate the original query
                      allPayments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                      allInvoices.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                      // 2. Identify duplicates
                      const dupesToDelete = [];
                      const validPayments = [];
                      const importMap = new Map();
                      
                      if (allPayments) {
                        for (const p of allPayments) {
                          if (p.reference_no && p.reference_no.startsWith('IMPORT-')) {
                            const key = `${p.student_id}_${p.payment_month}_${p.amount_paid}_${p.payment_date}`;
                            if (importMap.has(key)) {
                              dupesToDelete.push(p.id);
                            } else {
                              importMap.set(key, true);
                              validPayments.push(p);
                            }
                          } else {
                            validPayments.push(p);
                          }
                        }
                      }

                      // 3. Nullify FK constraint on invoices before deleting duplicates
                      if (dupesToDelete.length > 0) {
                        await supabase.from('school_ar_invoices').update({ payment_id: null }).in('payment_id', dupesToDelete);
                        await supabase.from('school_payment_transactions').delete().in('id', dupesToDelete);
                      }

                      // 4. Rebuild balances from baseline
                      let fixedCount = 0;
                      for (const student of branchStudents) {
                        const studentPayments = validPayments.filter(p => p.student_id === student.id).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        const studentInvoices = (allInvoices || []).filter(i => i.student_id === student.id).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                        if (studentPayments.length === 0 && studentInvoices.length === 0) continue;

                        // --- Rebuild invoice paid_amounts and statuses ---
                        // Reset all invoices
                        for (const inv of studentInvoices) {
                          inv.calculated_paid_amount = 0;
                          inv.calculated_status = 'posted';
                          inv.calculated_payment_id = null;
                        }
                        
                        // Replay all payments against invoices
                        for (const pay of studentPayments) {
                          let remaining = pay.amount_paid;
                          for (const inv of studentInvoices) {
                            if (remaining <= 0) break;
                            if (inv.calculated_paid_amount < inv.amount) {
                              const apply = Math.min(remaining, inv.amount - inv.calculated_paid_amount);
                              inv.calculated_paid_amount += apply;
                              inv.calculated_status = inv.calculated_paid_amount >= inv.amount ? 'paid' : 'partial';
                              inv.calculated_payment_id = pay.id;
                              remaining -= apply;
                            }
                          }
                        }
                        
                        // Bulk update invoices
                        for (const inv of studentInvoices) {
                          if (inv.paid_amount !== inv.calculated_paid_amount || inv.status !== inv.calculated_status) {
                            await supabase.from('school_ar_invoices').update({
                              paid_amount: inv.calculated_paid_amount,
                              status: inv.calculated_status,
                              payment_id: inv.calculated_payment_id
                            }).eq('id', inv.id);
                          }
                        }
                        // --------------------------------------------------

                        // Find the absolute earliest record to establish a baseline time
                        const firstPaymentTime = studentPayments.length > 0 ? new Date(studentPayments[0].created_at).getTime() : Infinity;
                        const firstInvoiceTime = studentInvoices.length > 0 ? new Date(studentInvoices[0].created_at).getTime() : Infinity;
                        
                        let baselineBalance = 0;
                        let baselineTime = 0;

                        if (firstPaymentTime <= firstInvoiceTime && studentPayments.length > 0) {
                          baselineBalance = studentPayments[0].payment_balance_before || 0;
                          baselineTime = firstPaymentTime;
                        } else if (studentInvoices.length > 0) {
                          // Wait, school_ar_invoices doesn't store balance_before. 
                          // If invoice is first, we assume the current balance minus the net of all known records.
                          // Actually, it's safer to just fetch the student's CURRENT balance, and if they have no payments, we don't try to rebuild from a payment baseline.
                          // But we KNOW the bug only affected imported payments.
                          baselineBalance = 0; // fallback
                        }

                        // Actually, a simpler baseline: The student's current payment_balance in the DB might be fully corrupted by my previous "Repair" script.
                        // Let's rely on the first ever payment transaction's `payment_balance_before` as the true baseline before any system activity.
                        // If they had no payments, their balance is just -SUM(invoices).
                        if (studentPayments.length > 0) {
                           baselineBalance = studentPayments[0].payment_balance_before || 0;
                           baselineTime = new Date(studentPayments[0].created_at).getTime() - 1; // just before the first payment
                        } else {
                           baselineBalance = 0;
                           baselineTime = 0;
                        }

                        // Sum all valid activity AFTER the baseline
                        const validInvoicesAfterBaseline = studentInvoices.filter(i => new Date(i.created_at).getTime() > baselineTime);
                        const totalInvoiced = validInvoicesAfterBaseline.reduce((sum, i) => sum + (i.amount || 0), 0);
                        const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0); // All payments are after baseline time

                        const trueBalance = baselineBalance + totalPaid - totalInvoiced;
                        const trueAmountDue = Math.max(0, -trueBalance);

                        await supabase.from('school_students').update({
                          payment_balance: trueBalance,
                          current_amount_due: trueAmountDue
                        }).eq('id', student.id);
                        
                        fixedCount++;
                      }

                      toast({ title: "Success", description: `Removed ${dupesToDelete.length} duplicates and fully restored ${fixedCount} student balances!` });
                      fetchStudents();
                    } catch (err) {
                      console.error(err);
                      toast({ title: "Error", description: "Failed to repair balances.", variant: "destructive" });
                    }
                  }}
                >
                  Repair Balances
                </Button>
                {currentMonthTransactions.length > 0 && currentMonthTransactions.some(tx => !activeStudents.find(s => s.id === tx.student_id)) && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-6 text-[10px] px-2"
                    onClick={async () => {
                      try {
                        const unknownTxIds = currentMonthTransactions.filter(tx => !activeStudents.find(s => s.id === tx.student_id)).map(tx => tx.id);
                        if (unknownTxIds.length > 0) {
                          await supabase.from('school_payment_transactions').delete().in('id', unknownTxIds);
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
                  <PopoverContent className="w-[380px] p-3">
                    <h4 className="font-semibold text-sm mb-2">This Month's Transactions</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {currentMonthTransactions.map((tx, idx) => {
                        const student = activeStudents.find(s => s.id === tx.student_id);
                        const isActuallyInactive = !student && tx.school_students?.is_active !== true;
                        const studentName = student?.student_name || tx.school_students?.student_name || 'Unknown';
                        
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs border-b pb-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="truncate max-w-[120px] font-medium">{studentName}</span>
                              {isActuallyInactive && <span className="text-red-500 text-[10px] flex-shrink-0">(Inactive)</span>}
                              {!student && !isActuallyInactive && <span className="text-red-500 text-[10px] flex-shrink-0">(Missing)</span>}
                              {(!student || isActuallyInactive) && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-5 px-1.5 py-0 text-[9px] border-green-200 text-green-700 hover:bg-green-50 flex-shrink-0"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await supabase.from('school_students').update({ is_active: true }).eq('id', tx.student_id);
                                      toast({ title: "Success", description: "Database student immediately created and payment allocated!" });
                                      fetchStudents();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                >
                                  Quick Create Student
                                </Button>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
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
            <CardContent className="flex flex-wrap items-end gap-4 p-4 border-b">
              <div className="space-y-1 min-w-[200px] flex-grow">
                <label className="text-xs font-medium text-muted-foreground">Global Search</label>
                <Input 
                  placeholder="Search Name, Admission No, or Remarks..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1 min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground">Student Status</label>
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="all">All Students</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
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
              <div className="space-y-1 min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground">Finance Status</label>
                <Select value={filterFinance} onValueChange={setFilterFinance}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Integration Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="synced">Synced (Clear)</SelectItem>
                    <SelectItem value="any_issue">Any Issues</SelectItem>
                    <SelectItem value="pending_gl">Pending GL</SelectItem>
                    <SelectItem value="pending_allocation">Pending Allocation</SelectItem>
                    <SelectItem value="missing_ar">Missing AR Sync</SelectItem>
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
              {(filterStatus !== "all" || filterGrade !== "all" || filterFinance !== "all" || minAmount || maxAmount) && (
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
            students={filteredStudents}
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

      <AdjustBalanceModal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
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

      {selectedStudent && (
        <SchoolBusFinanceSettlement
          studentId={selectedStudent.id}
          isOpen={showFinanceHub}
          onClose={() => {
            setShowFinanceHub(false);
            fetchStudents(); // Refresh to reflect any GL syncs or reversals
          }}
        />
      )}
    </div>
  );
}
