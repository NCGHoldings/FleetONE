import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Calendar,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';

interface AnalyticsData {
  totalStudents: number;
  monthlyRevenue: number;
  paymentRate: number;
  collectionEfficiency: number;
  monthlyTrends: MonthlyTrend[];
  branchComparison: BranchData[];
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  students: number;
  paymentRate: number;
}

interface BranchData {
  name: string;
  students: number;
  revenue: number;
  paymentRate: number;
}

interface Props {
  branchId?: string;
  timeRange?: string;
}

export function EnhancedAnalyticsDashboard({ branchId, timeRange = "6months" }: Props) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  useEffect(() => {
    fetchAnalyticsData();
  }, [branchId, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch students data
      const studentsQuery = supabase
        .from("school_students")
        .select("*")
        .eq("is_active", true);

      if (branchId) {
        studentsQuery.eq("branch_id", branchId);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Fetch branches for comparison
      const { data: branches, error: branchesError } = await supabase
        .from("school_branches")
        .select("*")
        .eq("is_active", true)
        .eq("is_total_branch", false);

      if (branchesError) throw branchesError;

      // Calculate analytics
      const totalStudents = students?.length || 0;
      const paidStudents = students?.filter(s => s.payment_status === "paid").length || 0;
      const monthlyRevenue = students?.filter(s => s.payment_status === "paid")
        .reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0) || 0;
      
      const paymentRate = totalStudents > 0 ? (paidStudents / totalStudents) * 100 : 0;
      const collectionEfficiency = paymentRate; // Simplified calculation

      // Generate monthly trends (mock data for demo)
      const monthlyTrends = [
        { month: "Jan", revenue: monthlyRevenue * 0.8, students: Math.floor(totalStudents * 0.9), paymentRate: paymentRate * 0.85 },
        { month: "Feb", revenue: monthlyRevenue * 0.85, students: Math.floor(totalStudents * 0.92), paymentRate: paymentRate * 0.88 },
        { month: "Mar", revenue: monthlyRevenue * 0.9, students: Math.floor(totalStudents * 0.95), paymentRate: paymentRate * 0.92 },
        { month: "Apr", revenue: monthlyRevenue * 0.95, students: Math.floor(totalStudents * 0.97), paymentRate: paymentRate * 0.96 },
        { month: "May", revenue: monthlyRevenue, students: totalStudents, paymentRate: paymentRate },
        { month: "Jun", revenue: monthlyRevenue * 1.05, students: Math.floor(totalStudents * 1.02), paymentRate: paymentRate * 1.02 }
      ];

      // Generate branch comparison data
      const branchComparison: BranchData[] = [];
      for (const branch of branches || []) {
        const branchStudents = students?.filter(s => s.branch_id === branch.id) || [];
        const branchPaid = branchStudents.filter(s => s.payment_status === "paid").length;
        const branchRevenue = branchStudents.filter(s => s.payment_status === "paid")
          .reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0);
        const branchPaymentRate = branchStudents.length > 0 ? (branchPaid / branchStudents.length) * 100 : 0;

        branchComparison.push({
          name: branch.branch_name,
          students: branchStudents.length,
          revenue: branchRevenue,
          paymentRate: branchPaymentRate
        });
      }

      setAnalytics({
        totalStudents,
        monthlyRevenue,
        paymentRate,
        collectionEfficiency,
        monthlyTrends,
        branchComparison
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Students</p>
                <p className="text-2xl font-bold text-blue-900">{analytics.totalStudents}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5.2% from last month
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-900">LKR {analytics.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.1% from last month
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Payment Rate</p>
                <p className="text-2xl font-bold text-purple-900">{analytics.paymentRate.toFixed(1)}%</p>
                <div className="mt-2">
                  <Progress value={analytics.paymentRate} className="h-2" />
                </div>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Collection Efficiency</p>
                <p className="text-2xl font-bold text-amber-900">{analytics.collectionEfficiency.toFixed(1)}%</p>
                <p className="text-xs text-amber-600 flex items-center mt-1">
                  {analytics.collectionEfficiency > 80 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {analytics.collectionEfficiency > 80 ? "Excellent" : "Needs Improvement"}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Trends
            </CardTitle>
            <CardDescription>Revenue and payment rate over time</CardDescription>
            <div className="flex gap-2">
              <Button
                variant={selectedMetric === "revenue" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric("revenue")}
              >
                Revenue
              </Button>
              <Button
                variant={selectedMetric === "paymentRate" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric("paymentRate")}
              >
                Payment Rate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {selectedMetric === "revenue" ? (
                <AreaChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#0088FE" fill="#0088FE20" />
                </AreaChart>
              ) : (
                <LineChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="paymentRate" stroke="#00C49F" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Branch Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Branch Comparison
            </CardTitle>
            <CardDescription>Performance across different branches</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.branchComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="paymentRate" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>AI-powered recommendations to improve collection rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.paymentRate < 80 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-800">Payment Rate Below Target</div>
                  <div className="text-amber-700 text-sm">
                    Current payment rate is {analytics.paymentRate.toFixed(1)}%. Consider sending automated reminders to improve collection efficiency.
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-semibold text-green-800 mb-2">Strengths</div>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• Consistent monthly revenue growth</li>
                  <li>• Strong parent communication</li>
                  <li>• Efficient route management</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-semibold text-blue-800 mb-2">Opportunities</div>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Implement automated payment reminders</li>
                  <li>• Introduce family discounts</li>
                  <li>• Digital payment integration</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}