import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, Users, DollarSign, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BranchStats {
  branchId: string;
  branchName: string;
  branchCode: string;
  totalStudents: number;
  paidStudents: number;
  pendingStudents: number;
  overdueStudents: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  payments: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SchoolReports() {
  const { toast } = useToast();
  const [branchStats, setBranchStats] = useState<BranchStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalStudents: 0,
    totalRevenue: 0,
    totalPending: 0,
    totalOverdue: 0
  });

  useEffect(() => {
    fetchReportsData();
    fetchMonthlyTrends();
  }, [selectedPeriod, dateRange]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      // Fetch all branches
      const { data: branches, error: branchesError } = await supabase
        .from('school_branches')
        .select('id, branch_name, branch_code')
        .eq('is_active', true);

      if (branchesError) throw branchesError;

      // Fetch statistics for each branch
      const statsPromises = (branches || []).map(async (branch) => {
        const { data: students, error } = await supabase
          .from('school_students')
          .select('payment_status, payment_amount, update_new')
          .eq('branch_id', branch.id)
          .eq('is_active', true);

        if (error) throw error;

        const totalStudents = students?.length || 0;
        const paidStudents = students?.filter(s => s.payment_status === 'paid').length || 0;
        const pendingStudents = students?.filter(s => s.payment_status === 'pending').length || 0;
        const overdueStudents = students?.filter(s => s.payment_status === 'overdue').length || 0;
        
        const totalRevenue = students
          ?.filter(s => s.payment_status === 'paid')
          ?.reduce((sum, s) => sum + (s.payment_amount || 0), 0) || 0;
        
        const pendingAmount = students
          ?.filter(s => s.payment_status === 'pending')
          ?.reduce((sum, s) => sum + (s.update_new || 0), 0) || 0;
        
        const overdueAmount = students
          ?.filter(s => s.payment_status === 'overdue')
          ?.reduce((sum, s) => sum + (s.update_new || 0), 0) || 0;

        return {
          branchId: branch.id,
          branchName: branch.branch_name,
          branchCode: branch.branch_code,
          totalStudents,
          paidStudents,
          pendingStudents,
          overdueStudents,
          totalRevenue,
          pendingAmount,
          overdueAmount
        };
      });

      const stats = await Promise.all(statsPromises);
      setBranchStats(stats);

      // Calculate totals
      const totals = stats.reduce((acc, branch) => ({
        totalStudents: acc.totalStudents + branch.totalStudents,
        totalRevenue: acc.totalRevenue + branch.totalRevenue,
        totalPending: acc.totalPending + branch.pendingAmount,
        totalOverdue: acc.totalOverdue + branch.overdueAmount
      }), { totalStudents: 0, totalRevenue: 0, totalPending: 0, totalOverdue: 0 });

      setTotalStats(totals);

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast({
        title: "Error",
        description: "Failed to load reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyTrends = async () => {
    try {
      // Generate last 6 months of data
      const months = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: Math.floor(Math.random() * 500000) + 200000, // Mock data
          payments: Math.floor(Math.random() * 100) + 50 // Mock data
        });
      }
      
      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
    }
  };

  const handleExportReport = () => {
    // Mock export functionality
    toast({
      title: "Export Started",
      description: "Report is being generated and will be downloaded shortly",
    });
  };

  const paymentStatusData = branchStats.map(branch => ({
    name: branch.branchCode,
    paid: branch.paidStudents,
    pending: branch.pendingStudents,
    overdue: branch.overdueStudents
  }));

  const revenueData = branchStats.map(branch => ({
    name: branch.branchCode,
    revenue: branch.totalRevenue,
    pending: branch.pendingAmount,
    overdue: branch.overdueAmount
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">School Bus Service Reports</h1>
          <p className="text-muted-foreground">Analytics and performance insights</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Across all branches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Collected payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">LKR {totalStats.totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">LKR {totalStats.totalOverdue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Past due payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status by Branch */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="paid" fill="#22c55e" name="Paid" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Branch */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Analysis by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `LKR ${Number(value).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#3b82f6" name="Collected" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `LKR ${Number(value).toLocaleString()}`} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Payment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Paid', value: branchStats.reduce((sum, b) => sum + b.paidStudents, 0), fill: '#22c55e' },
                    { name: 'Pending', value: branchStats.reduce((sum, b) => sum + b.pendingStudents, 0), fill: '#f59e0b' },
                    { name: 'Overdue', value: branchStats.reduce((sum, b) => sum + b.overdueStudents, 0), fill: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Branch</th>
                  <th className="text-right p-2">Total Students</th>
                  <th className="text-right p-2">Paid</th>
                  <th className="text-right p-2">Pending</th>
                  <th className="text-right p-2">Overdue</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.map((branch) => (
                  <tr key={branch.branchId} className="border-b">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{branch.branchName}</div>
                        <div className="text-sm text-muted-foreground">{branch.branchCode}</div>
                      </div>
                    </td>
                    <td className="text-right p-2">{branch.totalStudents}</td>
                    <td className="text-right p-2 text-success">{branch.paidStudents}</td>
                    <td className="text-right p-2 text-warning">{branch.pendingStudents}</td>
                    <td className="text-right p-2 text-destructive">{branch.overdueStudents}</td>
                    <td className="text-right p-2">LKR {branch.totalRevenue.toLocaleString()}</td>
                    <td className="text-right p-2">
                      {branch.totalStudents > 0 
                        ? ((branch.paidStudents / branch.totalStudents) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}