import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ArrowLeft, Download, FileText, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";

interface ReportData {
  totalStudents: number;
  paidStudents: number;
  pendingStudents: number;
  overdueStudents: number;
  totalRevenue: number;
  pendingRevenue: number;
  monthlyPayments: any[];
  routeStats: any[];
}

export default function SchoolBranchReports() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [reportType, setReportType] = useState("summary");

  useEffect(() => {
    fetchReportData();
  }, [branchId, dateRange]);

  const fetchReportData = async () => {
    try {
      // Fetch student data
      const { data: students, error: studentsError } = await supabase
        .from("school_students")
        .select("*")
        .eq("branch_id", branchId)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      // Fetch payment data
      const { data: payments, error: paymentsError } = await supabase
        .from("school_payments")
        .select("*")
        .eq("branch_id", branchId)
        .gte("payment_date", dateRange?.from?.toISOString().split("T")[0])
        .lte("payment_date", dateRange?.to?.toISOString().split("T")[0]);

      if (paymentsError) throw paymentsError;

      // Calculate statistics
      const totalStudents = students?.length || 0;
      const paidStudents = students?.filter(s => s.payment_status === "paid").length || 0;
      const pendingStudents = students?.filter(s => s.payment_status === "pending").length || 0;
      const overdueStudents = students?.filter(s => s.payment_status === "overdue").length || 0;

      const totalRevenue = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      const pendingRevenue = students?.filter(s => s.payment_status === "pending")
        .reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0) || 0;

      // Route statistics
      const routeGroups = students?.reduce((groups: any, student) => {
        const route = student.route || "No Route";
        if (!groups[route]) {
          groups[route] = {
            route: route,
            totalStudents: 0,
            paidStudents: 0,
            revenue: 0
          };
        }
        groups[route].totalStudents++;
        if (student.payment_status === "paid") {
          groups[route].paidStudents++;
          groups[route].revenue += Number(student.payment_amount) || 0;
        }
        return groups;
      }, {});

      const routeStats = Object.values(routeGroups || {});

      setReportData({
        totalStudents,
        paidStudents,
        pendingStudents,
        overdueStudents,
        totalRevenue,
        pendingRevenue,
        monthlyPayments: payments || [],
        routeStats,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: "csv" | "pdf") => {
    try {
      // For now, just show success message
      // In a real implementation, you would generate and download the file
      toast({
        title: "Export Started",
        description: `Report export in ${format.toUpperCase()} format is being prepared`,
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Failed to Load Report</h2>
        <Button onClick={() => navigate(`/school-bus/branch/${branchId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Branch
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
            onClick={() => navigate(`/school-bus/branch/${branchId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Branch
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branch Reports</h1>
            <p className="text-muted-foreground">
              Analytics and insights for branch performance
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DateRangePicker
                onDateRangeChange={(range) => setDateRange(range as DateRange)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                  <SelectItem value="routes">Route Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchReportData}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reportData.totalStudents}</div>
            <div className="text-sm text-muted-foreground">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              LKR {reportData.totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {reportData.totalStudents > 0 ? 
                ((reportData.paidStudents / reportData.totalStudents) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Payment Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              LKR {reportData.pendingRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Pending Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Route Statistics */}
      {reportType === "routes" && (
        <Card>
          <CardHeader>
            <CardTitle>Route Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.routeStats.map((route: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{route.route}</div>
                    <div className="text-sm text-muted-foreground">
                      {route.paidStudents}/{route.totalStudents} students paid
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">LKR {route.revenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {route.totalStudents > 0 ? 
                        ((route.paidStudents / route.totalStudents) * 100).toFixed(1) : 0}% paid
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{reportData.paidStudents}</div>
              <div className="text-sm text-muted-foreground">Paid Students</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{reportData.pendingStudents}</div>
              <div className="text-sm text-muted-foreground">Pending Payments</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{reportData.overdueStudents}</div>
              <div className="text-sm text-muted-foreground">Overdue Payments</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}