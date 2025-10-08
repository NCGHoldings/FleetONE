import { useState, useMemo } from "react";
import { Download, Receipt, History, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';

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

interface OutstandingStudentsViewProps {
  students: Student[];
  onRecordPayment: (student: Student) => void;
  onViewHistory: (student: Student) => void;
}

export function OutstandingStudentsView({ 
  students, 
  onRecordPayment, 
  onViewHistory 
}: OutstandingStudentsViewProps) {
  const [filters, setFilters] = useState({
    paymentStatus: 'all',
    balanceType: 'owing',
    monthsBehind: 'all',
  });
  const [showFilters, setShowFilters] = useState(true);

  // Calculate months behind for a student
  const calculateMonthsBehind = (balance: number, fixedAmount: number): number => {
    if (balance >= 0) return 0;
    return Math.floor(Math.abs(balance) / fixedAmount);
  };

  // Get badge for months behind
  const getMonthsBehindBadge = (monthsBehind: number) => {
    if (monthsBehind === 0) return null;
    if (monthsBehind >= 3) {
      return { variant: 'destructive' as const, label: `${monthsBehind}+ Months Behind` };
    }
    if (monthsBehind === 2) {
      return { variant: 'secondary' as const, label: '2 Months Behind', className: 'bg-orange-500 text-white hover:bg-orange-600' };
    }
    if (monthsBehind === 1) {
      return { variant: 'secondary' as const, label: '1 Month Behind', className: 'bg-yellow-500 text-white hover:bg-yellow-600' };
    }
  };

  // Filter students based on criteria
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Balance type filter
      if (filters.balanceType === 'owing' && student.payment_balance >= 0) return false;
      if (filters.balanceType === 'advance' && student.payment_balance <= 0) return false;

      // Payment status filter
      if (filters.paymentStatus !== 'all' && student.payment_status !== filters.paymentStatus) {
        return false;
      }

      // Months behind filter
      if (filters.monthsBehind !== 'all') {
        const monthsBehind = calculateMonthsBehind(student.payment_balance, student.fixed_monthly_amount);
        if (filters.monthsBehind === '1' && monthsBehind !== 1) return false;
        if (filters.monthsBehind === '2' && monthsBehind !== 2) return false;
        if (filters.monthsBehind === '3+' && monthsBehind < 3) return false;
      }

      return true;
    });
  }, [students, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const outstandingStudents = filteredStudents.filter(s => s.payment_balance < 0);
    const totalOutstanding = outstandingStudents.reduce((sum, s) => sum + Math.abs(s.payment_balance), 0);
    const monthsBehindArr = outstandingStudents.map(s => 
      calculateMonthsBehind(s.payment_balance, s.fixed_monthly_amount)
    ).filter(m => m > 0);
    const averageMonthsBehind = monthsBehindArr.length > 0 
      ? monthsBehindArr.reduce((a, b) => a + b, 0) / monthsBehindArr.length 
      : 0;
    const urgentCount = outstandingStudents.filter(s => 
      calculateMonthsBehind(s.payment_balance, s.fixed_monthly_amount) >= 3
    ).length;

    return {
      outstandingStudents: outstandingStudents.length,
      totalOutstanding,
      averageMonthsBehind: averageMonthsBehind.toFixed(1),
      urgentCount,
    };
  }, [filteredStudents]);

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredStudents.map(student => {
      const monthsBehind = calculateMonthsBehind(student.payment_balance, student.fixed_monthly_amount);
      return {
        'Student Name': student.student_name,
        'Admission No': student.admission_no,
        'Grade': student.grade,
        'Fixed Monthly Amount': student.fixed_monthly_amount,
        'Payment Balance': student.payment_balance,
        'Months Behind': monthsBehind,
        'Total Outstanding': Math.abs(student.payment_balance),
        'Last Payment Date': student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString() : '-',
        'Parent Name': student.parent_name,
        'Contact Number': student.father_contact_no,
        'Payment Status': student.payment_status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding Payments');
    XLSX.writeFile(wb, `Outstanding_Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      paymentStatus: 'all',
      balanceType: 'owing',
      monthsBehind: 'all',
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
      id: "months_behind",
      header: "Outstanding Status",
      cell: ({ row }) => {
        const student = row.original;
        const monthsBehind = calculateMonthsBehind(student.payment_balance, student.fixed_monthly_amount);
        const badge = getMonthsBehindBadge(monthsBehind);
        
        if (!badge) {
          return <Badge variant="default">Up to Date</Badge>;
        }
        
        return (
          <Badge variant={badge.variant} className={badge.className}>
            {badge.label}
          </Badge>
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
      accessorKey: "last_payment_date",
      header: "Last Payment",
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
              onClick={() => onRecordPayment(student)}
            >
              <Receipt className="h-4 w-4 mr-1" />
              Record
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewHistory(student)}
            >
              <History className="h-4 w-4 mr-1" />
              History
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select
                  value={filters.paymentStatus}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, paymentStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Balance Type</Label>
                <Select
                  value={filters.balanceType}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, balanceType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Balances</SelectItem>
                    <SelectItem value="owing">Owing Money</SelectItem>
                    <SelectItem value="advance">Advance Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Months Behind</Label>
                <Select
                  value={filters.monthsBehind}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, monthsBehind: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="2">2 Months</SelectItem>
                    <SelectItem value="3+">3+ Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <Button variant="outline" onClick={handleResetFilters} className="w-full">
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outstandingStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              LKR {stats.totalOutstanding.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Months Behind</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageMonthsBehind}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Urgent Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.urgentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">3+ months behind</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Outstanding Students</CardTitle>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredStudents}
            searchKey="student_name"
            title="Outstanding Students"
          />
        </CardContent>
      </Card>
    </div>
  );
}
