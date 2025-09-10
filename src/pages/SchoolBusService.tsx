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
  BarChart3,
  Settings,
  RefreshCw,
  Plus
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Clean Header Section */}
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <School className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">School Bus Service</h1>
                  <p className="text-muted-foreground">Manage student transportation efficiently</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/school-bus/import")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Students
              </Button>
              <Button onClick={() => navigate("/school-bus/payments")}>
                Manage Payments
              </Button>
            </div>
          </div>
        </div>

        {/* Clean KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/60 backdrop-blur border shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">{overallStats.totalStudents}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur border shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue (LKR)</p>
                  <p className="text-2xl font-bold text-foreground">{overallStats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur border shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {overallStats.totalStudents > 0 ? ((overallStats.paidStudents / overallStats.totalStudents) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur border shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{overallStats.pendingStudents}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Dashboard Card */}
        {totalBranch && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {totalBranch.branch_name}
              </CardTitle>
              <CardDescription>
                View comprehensive analytics across all branches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => handleBranchClick(totalBranch)}
                className="w-full"
                size="lg"
              >
                Open Total Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Clean Branch Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Branch Overview</h2>
            <Button variant="ghost" size="sm" onClick={fetchBranches}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
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
                <Card key={branch.id} className="bg-card border hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => handleBranchClick(branch)}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <School className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{branch.branch_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{branch.branch_code}</p>
                        </div>
                      </div>
                      <Bus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-lg font-semibold text-foreground">{stats.totalStudents}</div>
                        <div className="text-xs text-muted-foreground">Students</div>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-lg font-semibold text-foreground">{stats.totalRevenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                    </div>

                    {/* Payment Rate */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Rate</span>
                        <span className="font-medium">{paymentRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={paymentRate} className="h-2" />
                    </div>
                    
                    {/* Status Badges */}
                    <div className="flex gap-2 flex-wrap">
                      {stats.paidStudents > 0 && (
                        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                          {stats.paidStudents} Paid
                        </Badge>
                      )}
                      {stats.pendingStudents > 0 && (
                        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                          {stats.pendingStudents} Pending
                        </Badge>
                      )}
                      {stats.overduePayments > 0 && (
                        <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
                          {stats.overduePayments} Overdue
                        </Badge>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button 
                      size="sm"
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBranchClick(branch);
                      }}
                    >
                      Manage Branch
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}