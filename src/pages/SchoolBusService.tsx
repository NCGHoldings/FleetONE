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

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-sm">Bulk Import</div>
                <div className="text-xs text-muted-foreground">Upload student data from Excel</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-sm">Send Reminders</div>
                <div className="text-xs text-muted-foreground">SMS & Email notifications</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold text-sm">Analytics</div>
                <div className="text-xs text-muted-foreground">Revenue & performance reports</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="font-semibold text-sm">System Settings</div>
                <div className="text-xs text-muted-foreground">Configure routes & pricing</div>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Enhanced Branch Cards */}
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
          const statusColor = paymentRate >= 80 ? "text-green-600" : paymentRate >= 60 ? "text-yellow-600" : "text-red-600";

          return (
            <Card key={branch.id} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 hover:border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <School className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold">{branch.branch_name}</div>
                      <div className="text-xs text-muted-foreground">{branch.manager_name}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">{branch.branch_code}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{branch.address}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border-l-2 border-blue-500">
                    <div className="text-xs font-medium text-blue-700">Total Students</div>
                    <div className="text-xl font-bold text-blue-900">{stats.totalStudents}</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border-l-2 border-green-500">
                    <div className="text-xs font-medium text-green-700">Revenue (LKR)</div>
                    <div className="text-xl font-bold text-green-900">{stats.totalRevenue.toLocaleString()}</div>
                  </div>
                </div>

                {/* Payment Rate Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">Payment Rate</span>
                    <span className={`font-bold ${statusColor}`}>{paymentRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={paymentRate} className="h-2" />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></div>
                    {stats.paidStudents} Paid
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-1"></div>
                    {stats.pendingStudents} Pending
                  </Badge>
                  {stats.overduePayments > 0 && (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                      {stats.overduePayments} Overdue
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleBranchClick(branch)}
                    size="sm"
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Bus className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/school-bus/branch/${branch.id}/reports`)}
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Reports
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-between text-xs">
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <Phone className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <Mail className="h-3 w-3 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <Bell className="h-3 w-3 text-orange-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <Download className="h-3 w-3 text-purple-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}