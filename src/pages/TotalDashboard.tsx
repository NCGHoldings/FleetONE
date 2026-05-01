import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KPICard } from "@/components/dashboard/KPICard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft,
  Users, 
  CreditCard, 
  TrendingUp,
  AlertCircle,
  School,
  Bus,
  MapPin,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Database
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Cell, LineChart, Line, Pie } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalStudentList, GlobalStudentRow } from "@/components/school/GlobalStudentList";
import { startOfMonth, endOfMonth } from "date-fns";

interface BranchData {
  id: string;
  branch_name: string;
  branch_code: string;
  address: string;
  totalStudents: number;
  paidStudents: number;
  pendingStudents: number;
  overdueStudents: number;
  totalRevenue: number;
  paymentRate: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  students: number;
  paymentRate: number;
}

export default function TotalDashboard() {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [globalStudents, setGlobalStudents] = useState<GlobalStudentRow[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalRevenue: 0,
    averagePaymentRate: 0,
    totalBranches: 0,
    bestPerformingBranch: '',
    worstPerformingBranch: ''
  });

  useEffect(() => {
    fetchDashboardData();
    generateMonthlyTrends();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();
      
      // 1. Fetch all branches
      const { data: branchesData, error: branchError } = await supabase
        .from("school_branches")
        .select("*")
        .eq("is_active", true)
        .eq("is_total_branch", false);

      if (branchError) throw branchError;

      // 2. Fetch all students globally (with pagination to bypass 1000 row limits)
      let allStudents: any[] = [];
      let hasMoreStudents = true;
      let studentPage = 0;
      const pageSize = 1000;
      
      while (hasMoreStudents) {
        const { data, error } = await supabase
          .from("school_students")
          .select("*")
          .range(studentPage * pageSize, (studentPage + 1) * pageSize - 1);

        if (error) throw error;
        allStudents = [...allStudents, ...(data || [])];
        hasMoreStudents = data && data.length === pageSize;
        studentPage++;
      }

      // 3. Fetch all current month transactions globally (with pagination)
      let allTransactions: any[] = [];
      let hasMoreTxs = true;
      let txPage = 0;

      while (hasMoreTxs) {
        const { data, error } = await supabase
          .from("school_payment_transactions")
          .select("*, school_students(student_name, branch_id, is_active, admission_no, grade)")
          .gte("payment_date", monthStart)
          .lte("payment_date", monthEnd)
          .range(txPage * pageSize, (txPage + 1) * pageSize - 1);

        if (error) throw error;
        allTransactions = [...allTransactions, ...(data || [])];
        hasMoreTxs = data && data.length === pageSize;
        txPage++;
      }

      const branchStats: BranchData[] = [];
      let totalStudentsCount = 0;
      let totalRevenueCount = 0;
      let totalPaymentRate = 0;

      const branchMap = new Map((branchesData || []).map(b => [b.id, b.branch_name]));
      const globalRowMap = new Map<string, GlobalStudentRow>();

      // Process students first
      (allStudents || []).forEach(student => {
        const branchName = branchMap.get(student.branch_id) || "Unknown Branch";
        
        // Find if this student has transactions this month
        const studentTxs = (allTransactions || []).filter(tx => tx.student_id === student.id);
        const actualRevenue = studentTxs.reduce((sum, tx) => sum + (Number(tx.amount_paid) || 0), 0);
        
        const due = student.current_amount_due || 0;
        const balance = student.payment_balance || 0;
        const isActive = student.is_active !== false;

        let status = (student.payment_status as any) || 'pending';
        const hasPaymentHistory = Number(student.payment_amount) > 0 || balance > 0;
        const isMathematicallyPaid = due <= 0 && balance >= 0 && hasPaymentHistory;

        if (!isActive) {
          status = 'missing'; // mark inactive students as missing if they appear in our checks
        } else if (isMathematicallyPaid) {
          status = 'paid';
        } else if (status !== 'paid') {
          status = 'pending';
        }

        if (isActive || actualRevenue > 0) {
          globalRowMap.set(student.id, {
            id: student.id,
            student_name: student.student_name,
            admission_no: student.admission_no || "-",
            grade: student.grade || "-",
            branch_name: branchName,
            payment_status: status,
            payment_amount: actualRevenue > 0 ? actualRevenue : (Number(student.payment_amount) || 0),
            last_payment_date: student.last_payment_date || "-",
            is_orphaned: false,
            is_inactive: !isActive,
            transaction_ids: studentTxs.map(t => t.id)
          });
        }
      });

      // Process orphaned transactions (transactions without a valid student record in `allStudents`)
      const orphanedTxs = (allTransactions || []).filter(tx => !globalRowMap.has(tx.student_id));
      
      // Group orphaned transactions by student_id to show them as single rows
      const orphanedGroups = new Map<string, any[]>();
      orphanedTxs.forEach(tx => {
        const sid = tx.student_id || "unknown";
        if (!orphanedGroups.has(sid)) orphanedGroups.set(sid, []);
        orphanedGroups.get(sid)!.push(tx);
      });

      orphanedGroups.forEach((txs, sid) => {
        const firstTx = txs[0];
        const studentRef = firstTx.school_students;
        const branchName = studentRef?.branch_id ? (branchMap.get(studentRef.branch_id) || "Unknown") : "Unknown";
        const actualRevenue = txs.reduce((sum, tx) => sum + (Number(tx.amount_paid) || 0), 0);

        globalRowMap.set(`orphan-${sid}`, {
          id: sid,
          student_name: studentRef?.student_name || "Unknown Student (Deleted/Missing)",
          admission_no: studentRef?.admission_no || "-",
          grade: studentRef?.grade || "-",
          branch_name: branchName,
          payment_status: 'missing',
          payment_amount: actualRevenue,
          last_payment_date: firstTx.payment_date || "-",
          is_orphaned: true,
          is_inactive: false,
          transaction_ids: txs.map(t => t.id)
        });
      });

      // Calculate Branch KPIs
      for (const branch of branchesData || []) {
        // Only count active students for branch KPIs
        const activeBranchStudents = Array.from(globalRowMap.values()).filter(s => 
          s.branch_name === branch.branch_name && !s.is_inactive && !s.is_orphaned
        );

        const branchTotalStudents = activeBranchStudents.length;
        const branchPaidStudents = activeBranchStudents.filter(s => s.payment_status === "paid").length;
        const branchPendingStudents = activeBranchStudents.filter(s => s.payment_status === "pending").length;
        const branchOverdueStudents = activeBranchStudents.filter(s => s.payment_status === "overdue").length;
        const branchRevenue = activeBranchStudents.reduce((sum, s) => sum + s.payment_amount, 0);
        const branchPaymentRate = branchTotalStudents > 0 ? (branchPaidStudents / branchTotalStudents) * 100 : 0;

        branchStats.push({
          ...branch,
          totalStudents: branchTotalStudents,
          paidStudents: branchPaidStudents,
          pendingStudents: branchPendingStudents,
          overdueStudents: branchOverdueStudents,
          totalRevenue: branchRevenue,
          paymentRate: branchPaymentRate
        });

        totalStudentsCount += branchTotalStudents;
        totalRevenueCount += branchRevenue;
        totalPaymentRate += branchPaymentRate;
      }

      setBranches(branchStats);
      setGlobalStudents(Array.from(globalRowMap.values()));

      // Calculate overall statistics
      const averagePaymentRate = branchStats.length > 0 ? totalPaymentRate / branchStats.length : 0;
      const bestBranch = branchStats.reduce((prev, current) => 
        (prev.paymentRate > current.paymentRate) ? prev : current, branchStats[0]);
      const worstBranch = branchStats.reduce((prev, current) => 
        (prev.paymentRate < current.paymentRate) ? prev : current, branchStats[0]);

      setOverallStats({
        totalStudents: totalStudentsCount,
        totalRevenue: totalRevenueCount,
        averagePaymentRate,
        totalBranches: branchStats.length,
        bestPerformingBranch: bestBranch?.branch_name || '',
        worstPerformingBranch: worstBranch?.branch_name || ''
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMonthlyTrends = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const trends = months.map(month => ({
      month,
      revenue: Math.floor(Math.random() * 100000) + 200000,
      students: Math.floor(Math.random() * 50) + 300,
      paymentRate: Math.floor(Math.random() * 20) + 75
    }));
    setMonthlyTrends(trends);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading global dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/school-bus-service")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Total Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive analytics across all {overallStats.totalBranches} branches
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchDashboardData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            All Students Database
            <Badge variant="secondary" className="ml-2">{globalStudents.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overall KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Active Students"
              value={overallStats.totalStudents.toString()}
              description="Across all branches"
              icon={<Users className="h-4 w-4" />}
            />
            <KPICard
              title="Total Revenue"
              value={`LKR ${overallStats.totalRevenue.toLocaleString()}`}
              description="Collected this month"
              icon={<CreditCard className="h-4 w-4" />}
            />
            <KPICard
              title="Average Payment Rate"
              value={`${overallStats.averagePaymentRate.toFixed(1)}%`}
              description="Across all branches"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KPICard
              title="Active Branches"
              value={overallStats.totalBranches.toString()}
              description="Operational locations"
              icon={<School className="h-4 w-4" />}
            />
          </div>

          {/* Analytics Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue by Branch
                </CardTitle>
                <CardDescription>Monthly revenue comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={branches}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="branch_code" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalRevenue" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Payment Status Distribution
                </CardTitle>
                <CardDescription>Overall payment breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={[
                        { name: 'Paid', value: branches.reduce((sum, b) => sum + b.paidStudents, 0) },
                        { name: 'Pending', value: branches.reduce((sum, b) => sum + b.pendingStudents, 0) },
                        { name: 'Overdue', value: branches.reduce((sum, b) => sum + b.overdueStudents, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {branches.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Branch Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Branch Performance Overview</CardTitle>
              <CardDescription>Detailed breakdown by branch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <School className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-semibold">{branch.branch_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {branch.address}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{branch.totalStudents}</div>
                        <div className="text-xs text-muted-foreground">Students</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">LKR {branch.totalRevenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                      <div className="text-center min-w-[100px]">
                        <div className="text-sm font-medium">{branch.paymentRate.toFixed(1)}%</div>
                        <Progress value={branch.paymentRate} className="w-20 h-2 mt-1" />
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/school-bus/branch/${branch.id}`)}
                      >
                        <Bus className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700">Best Performing Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800">{overallStats.bestPerformingBranch}</div>
                <p className="text-green-600 text-sm">Highest payment collection rate</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-700">Needs Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-800">{overallStats.worstPerformingBranch}</div>
                <p className="text-amber-600 text-sm">Requires payment collection support</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <GlobalStudentList 
            data={globalStudents} 
            branches={branches}
            onRefresh={fetchDashboardData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}