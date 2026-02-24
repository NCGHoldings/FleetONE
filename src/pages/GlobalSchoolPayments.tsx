import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Users, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";

interface Payment {
  id: string;
  student_name: string;
  branch_name: string;
  payment_amount: number;
  payment_status: string;
  payment_date: string | null;
  last_payment_date: string | null;
}

export default function GlobalSchoolPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("school_students")
        .select(`
          id,
          student_name,
          payment_amount,
          payment_status,
          payment_date,
          last_payment_date,
          school_branches!inner(branch_name)
        `)
        .eq("is_active", true)
        .order("last_payment_date", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const formattedPayments = data?.map(student => ({
        id: student.id,
        student_name: student.student_name,
        branch_name: (student.school_branches as any)?.branch_name || "Unknown",
        payment_amount: student.payment_amount || 0,
        payment_status: student.payment_status || "pending",
        payment_date: student.payment_date,
        last_payment_date: student.last_payment_date,
      })) || [];

      setPayments(formattedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: "student_name",
      header: "Student Name",
    },
    {
      accessorKey: "branch_name",
      header: "Branch",
    },
    {
      accessorKey: "payment_amount",
      header: "Amount (LKR)",
      cell: ({ row }) => {
        const amount = row.getValue("payment_amount") as number;
        return amount ? amount.toLocaleString() : "-";
      },
    },
    {
      accessorKey: "payment_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("payment_status") as string;
        const variant = status === "paid" ? "default" : 
                      status === "overdue" ? "destructive" : "secondary";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "last_payment_date",
      header: "Last Payment",
      cell: ({ row }) => {
        const date = row.getValue("last_payment_date") as string;
        return date ? new Date(date).toLocaleDateString() : "No payment";
      },
    },
  ];

  const stats = {
    totalPayments: payments.length,
    paidStudents: payments.filter(p => p.payment_status === "paid").length,
    pendingPayments: payments.filter(p => p.payment_status === "pending").length,
    overduePayments: payments.filter(p => p.payment_status === "overdue").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/school-bus-service")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to School Bus Service
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Management</h1>
          <p className="text-muted-foreground">
            Manage student payments across all branches
          </p>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overduePayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Student Payments</CardTitle>
          <CardDescription>
            Overview of payment status across all branches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={payments}
            searchKey="student_name"
          />
        </CardContent>
      </Card>
    </div>
  );
}