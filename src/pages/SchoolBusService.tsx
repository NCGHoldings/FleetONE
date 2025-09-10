import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Receipt
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
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
          <Button onClick={() => navigate("/school-bus/students/import")}>
            Import Students
          </Button>
          <Button onClick={() => navigate("/school-bus/payments")}>
            Manage Payments
          </Button>
        </div>
      </div>

      {/* Overall KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total Students"
          value={overallStats.totalStudents.toString()}
          description="Across all branches"
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          title="Revenue (LKR)"
          value={overallStats.totalRevenue.toLocaleString()}
          description="Total collected"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <KPICard
          title="Paid Students"
          value={overallStats.paidStudents.toString()}
          description={`${((overallStats.paidStudents / overallStats.totalStudents) * 100).toFixed(1)}% payment rate`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          title="Pending Payments"
          value={overallStats.pendingStudents.toString()}
          description="Need collection"
          icon={<Receipt className="h-4 w-4" />}
        />
        <KPICard
          title="Overdue"
          value={overallStats.overduePayments.toString()}
          description="Require attention"
          icon={<AlertCircle className="h-4 w-4" />}
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

      {/* Branch Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {regularBranches.map((branch) => {
          const stats = branchStats[branch.id] || {
            totalStudents: 0,
            paidStudents: 0,
            pendingStudents: 0,
            totalRevenue: 0,
            overduePayments: 0,
          };

          return (
            <Card key={branch.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {branch.branch_name}
                  </div>
                  <Badge variant="secondary">{branch.branch_code}</Badge>
                </CardTitle>
                <CardDescription>
                  Branch operations and student management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Students</div>
                      <div className="text-2xl font-bold">{stats.totalStudents}</div>
                    </div>
                    <div>
                      <div className="font-medium">Revenue</div>
                      <div className="text-2xl font-bold text-green-600">
                        {stats.totalRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 text-sm">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {stats.paidStudents} Paid
                    </Badge>
                    <Badge variant="secondary">
                      {stats.pendingStudents} Pending
                    </Badge>
                    {stats.overduePayments > 0 && (
                      <Badge variant="destructive">
                        {stats.overduePayments} Overdue
                      </Badge>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleBranchClick(branch)}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    <Bus className="h-4 w-4 mr-2" />
                    Manage Branch
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