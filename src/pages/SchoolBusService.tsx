import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KPICard } from "@/components/dashboard/KPICard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  CreditCard, 
  MapPin, 
  AlertCircle, 
  TrendingUp,
  School,
  Bus,
  Receipt,
  Download,
  Upload,
  MessageSquare,
  BarChart3,
  Calendar,
  Phone,
  Mail,
  Bell,
  Settings,
  Filter,
  Search,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  address?: string;
  contact_phone?: string;
  manager_name?: string;
  is_total_branch: boolean;
  is_active: boolean;
}

interface BranchStats {
  totalStudents: number;
  paidStudents: number;
  pendingStudents: number;
  totalRevenue: number;
  overduePayments: number;
}

export default function SchoolBusService() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchStats, setBranchStats] = useState<Record<string, BranchStats>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("school_branches")
        .select("*")
        .eq("is_active", true)
        .order("is_total_branch", { ascending: true })
        .order("branch_name");

      if (error) throw error;
      setBranches(data || []);
      
      // Fetch stats for each branch
      if (data) {
        for (const branch of data) {
          await fetchBranchStats(branch.id);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchStats = async (branchId: string) => {
    try {
      const { data: students, error: studentsError } = await supabase
        .from("school_students")
        .select("payment_status, payment_amount")
        .eq("branch_id", branchId)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      const { data: payments, error: paymentsError } = await supabase
        .from("school_payments")
        .select("amount, status")
        .eq("branch_id", branchId)
        .eq("status", "paid");

      if (paymentsError) throw paymentsError;

      const totalStudents = students?.length || 0;
      const paidStudents = students?.filter(s => s.payment_status === "paid").length || 0;
      const pendingStudents = students?.filter(s => s.payment_status === "pending").length || 0;
      const overduePayments = students?.filter(s => s.payment_status === "overdue").length || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

      setBranchStats(prev => ({
        ...prev,
        [branchId]: {
          totalStudents,
          paidStudents,
          pendingStudents,
          totalRevenue,
          overduePayments
        }
      }));
    } catch (error) {
      console.error(`Error fetching stats for branch ${branchId}:`, error);
    }
  };

  const handleBranchClick = (branch: Branch) => {
    if (branch.is_total_branch) {
      navigate("/school-bus/total-dashboard");
    } else {
      navigate(`/school-bus/branch/${branch.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading School Bus Service...</p>
        </div>
      </div>
    );
  }

  const totalBranch = branches.find(b => b.is_total_branch);
  const regularBranches = branches.filter(b => !b.is_total_branch);

  // Calculate overall totals
  const overallStats = Object.values(branchStats).reduce(
    (acc, stats) => ({
      totalStudents: acc.totalStudents + stats.totalStudents,
      paidStudents: acc.paidStudents + stats.paidStudents,
      pendingStudents: acc.pendingStudents + stats.pendingStudents,
      totalRevenue: acc.totalRevenue + stats.totalRevenue,
      overduePayments: acc.overduePayments + stats.overduePayments,
    }),
    { totalStudents: 0, paidStudents: 0, pendingStudents: 0, totalRevenue: 0, overduePayments: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Bus Service</h1>
          <p className="text-muted-foreground">
            Manage student transportation across all branches
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/school-bus/import")}>
            Import Students
          </Button>
          <Button onClick={() => navigate("/school-bus/payments")}>
            Manage Payments
          </Button>
        </div>
      </div>

      {/* Advanced KPI Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total Students"
          value={overallStats.totalStudents.toString()}
          description="Across all branches"
          icon={<Users className="h-4 w-4 text-blue-500" />}
        />
        <KPICard
          title="Revenue (LKR)"
          value={overallStats.totalRevenue.toLocaleString()}
          description="Total collected this month"
          icon={<CreditCard className="h-4 w-4 text-green-500" />}
        />
        <KPICard
          title="Payment Rate"
          value={`${overallStats.totalStudents > 0 ? ((overallStats.paidStudents / overallStats.totalStudents) * 100).toFixed(1) : 0}%`}
          description={`${overallStats.paidStudents} students paid`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        />
        <KPICard
          title="Pending Collection"
          value={overallStats.pendingStudents.toString()}
          description="Need immediate attention"
          icon={<Receipt className="h-4 w-4 text-amber-500" />}
        />
        <KPICard
          title="Urgent Follow-up"
          value={overallStats.overduePayments.toString()}
          description="Overdue payments"
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
        />
      </div>


      {/* Total Dashboard Card */}
      {totalBranch && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              {totalBranch.branch_name} Dashboard
            </CardTitle>
            <CardDescription>
              Consolidated view across all 7 branches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{overallStats.totalStudents}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">LKR {overallStats.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{overallStats.paidStudents}</div>
                <div className="text-sm text-muted-foreground">Students Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{overallStats.overduePayments}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={() => handleBranchClick(totalBranch)}
                className="w-full"
              >
                View Total Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch Cards - Clean Interface */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {regularBranches.map((branch) => {
          const stats = branchStats[branch.id] || {
            totalStudents: 0,
            paidStudents: 0,
            pendingStudents: 0,
            totalRevenue: 0,
            overduePayments: 0,
          };

          const paymentRate = stats.totalStudents > 0 ? (stats.paidStudents / stats.totalStudents) * 100 : 0;

          return (
            <Card key={branch.id} className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white border border-gray-100">
              {/* Branch Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <School className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{branch.branch_name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs font-medium text-gray-600 bg-gray-50">
                      {branch.branch_code}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
                  <p className="text-sm font-medium text-blue-700 mb-2">Total Students</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalStudents}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
                  <p className="text-sm font-medium text-green-700 mb-2">Revenue (LKR)</p>
                  <p className="text-3xl font-bold text-green-900">{stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Rate */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-600">Payment Rate</span>
                  <span className="text-lg font-bold text-red-500">{paymentRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${paymentRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">{stats.paidStudents} Paid</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-orange-700">{stats.pendingStudents} Pending</span>
                </div>
              </div>

              {/* Manage Button */}
              <Button 
                onClick={() => handleBranchClick(branch)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                <Bus className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}