import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { DataTable } from "@/components/ui/data-table";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  CreditCard, 
  AlertCircle, 
  TrendingUp,
  ArrowLeft,
  Upload,
  Download,
  Plus,
  Receipt,
  FileText,
  Trash
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  address?: string;
  contact_phone?: string;
  manager_name?: string;
}

interface Student {
  id: string;
  student_name: string;
  admission_no?: string;
  grade?: string;
  parent_name?: string;
  father_contact_no?: string;
  mother_contact_no?: string;
  payment_status: string;
  payment_amount?: number;
  last_payment_date?: string;
  route?: string;
  bus_reg_no?: string;
  service_type?: string;
}

export default function BranchDashboard() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidStudents: 0,
    pendingStudents: 0,
    overdueStudents: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
  });
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (branchId) {
      fetchBranchData();
      fetchStudents();
    }
  }, [branchId]);

  const fetchBranchData = async () => {
    try {
      const { data, error } = await supabase
        .from("school_branches")
        .select("*")
        .eq("id", branchId)
        .single();

      if (error) throw error;
      setBranch(data);
    } catch (error) {
      console.error("Error fetching branch:", error);
      toast({
        title: "Error",
        description: "Failed to load branch data",
        variant: "destructive",
      });
    }
  };

  const fetchStudents = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("school_students")
        .select("*")
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .order("student_name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Calculate stats
      const totalStudents = studentsData?.length || 0;
      const paidStudents = studentsData?.filter(s => s.payment_status === "paid").length || 0;
      const pendingStudents = studentsData?.filter(s => s.payment_status === "pending").length || 0;
      const overdueStudents = studentsData?.filter(s => s.payment_status === "overdue").length || 0;

      // Calculate revenue
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("school_payments")
        .select("amount")
        .eq("branch_id", branchId)
        .eq("status", "paid");

      const totalRevenue = paymentsData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      const pendingRevenue = studentsData?.filter(s => s.payment_status === "pending")
        .reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0) || 0;

      setStats({
        totalStudents,
        paidStudents,
        pendingStudents,
        overdueStudents,
        totalRevenue,
        pendingRevenue,
      });
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const purgeInactiveStudents = async () => {
    if (!confirm("Are you sure you want to permanently delete all inactive students for this branch? This action cannot be undone.")) return;
    
    setPurging(true);
    try {
      const { error } = await supabase
        .from("school_students")
        .delete()
        .eq("branch_id", branchId)
        .eq("is_active", false);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Inactive students have been permanently deleted from the database.",
      });
      fetchStudents();
    } catch (error: any) {
      console.error("Error purging inactive students:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to purge inactive students",
        variant: "destructive",
      });
    } finally {
      setPurging(false);
    }
  };

  const columns = [
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
      accessorKey: "parent_name",
      header: "Parent",
    },
    {
      accessorKey: "route",
      header: "Route",
    },
    {
      accessorKey: "service_type",
      header: "Service",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue("service_type")}</Badge>
      ),
    },
    {
      accessorKey: "payment_status",
      header: "Payment Status",
      cell: ({ row }: any) => {
        const status = row.getValue("payment_status") as string;
        const variant = status === "paid" ? "default" : 
                      status === "overdue" ? "destructive" : "secondary";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "payment_amount",
      header: "Amount (LKR)",
      cell: ({ row }: any) => {
        const amount = row.getValue("payment_amount") as number;
        return amount ? amount.toLocaleString() : "-";
      },
    },
    {
      accessorKey: "last_payment_date",
      header: "Last Payment",
      cell: ({ row }: any) => {
        const date = row.getValue("last_payment_date") as string;
        return date ? format(new Date(date), "MMM dd, yyyy") : "-";
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading branch dashboard...</p>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Branch Not Found</h2>
        <Button onClick={() => navigate("/school-bus-service")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to School Bus Service
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/school-bus-service")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {branch.branch_name} Branch
            </h1>
            <p className="text-muted-foreground">
              {branch.address && `${branch.address} • `}
              {branch.contact_phone && `Phone: ${branch.contact_phone}`}
              {branch.manager_name && ` • Manager: ${branch.manager_name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={purgeInactiveStudents}
            disabled={purging}
          >
            {purging ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Trash className="h-4 w-4 mr-2" />
            )}
            Purge Inactive
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(`/school-bus/branch/${branchId}/import`)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={() => navigate(`/school-bus/branch/${branchId}/payments`)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Payments
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Students"
          value={stats.totalStudents.toString()}
          description="Enrolled in branch"
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          title="Revenue (LKR)"
          value={stats.totalRevenue.toLocaleString()}
          description="Total collected"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <KPICard
          title="Payment Rate"
          value={`${stats.totalStudents > 0 ? ((stats.paidStudents / stats.totalStudents) * 100).toFixed(1) : 0}%`}
          description={`${stats.paidStudents} of ${stats.totalStudents} paid`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          title="Pending Revenue"
          value={stats.pendingRevenue.toLocaleString()}
          description={`${stats.pendingStudents + stats.overdueStudents} payments pending`}
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate(`/school-bus/branch/${branchId}/students`)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="font-medium">Manage Students</div>
                <div className="text-sm text-muted-foreground">View & edit student data</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/school-bus/branch/${branchId}/receipts`)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Receipt className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-medium">Receipt Uploads</div>
                <div className="text-sm text-muted-foreground">Parent receipt verification</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/school-bus/branch/${branchId}/reports`)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <div className="font-medium">Reports</div>
                <div className="text-sm text-muted-foreground">Export & analytics</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/school-bus/branch/${branchId}/routes`)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Download className="h-8 w-8 text-orange-500" />
              <div>
                <div className="font-medium">Routes</div>
                <div className="text-sm text-muted-foreground">Manage bus routes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students Overview</CardTitle>
          <CardDescription>
            Recent student registrations and payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={students.slice(0, 10)} // Show first 10 students
            searchKey="student_name"
            title="Students"
            onAdd={() => navigate(`/school-bus/branch/${branchId}/students/add`)}
            onExport={() => {
              // Export functionality
              toast({
                title: "Export Started",
                description: "Student data export is being prepared",
              });
            }}
          />
          {students.length > 10 && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/school-bus/branch/${branchId}/students`)}
              >
                View All {stats.totalStudents} Students
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}