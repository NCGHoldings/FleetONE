import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AnalyticsData {
  totalStudents: number;
  totalRevenue: number;
  paymentRate: number;
  monthlyGrowth: number;
  branchComparison: BranchStats[];
  monthlyTrends: MonthlyTrend[];
}

interface BranchStats {
  branchId: string;
  branchName: string;
  students: number;
  revenue: number;
  paymentRate: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  students: number;
  paymentRate: number;
}

export function useSchoolAnalytics(branchId?: string, timeRange: string = "6months") {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Base query for students
      let studentsQuery = supabase
        .from("school_students")
        .select(`
          *,
          school_branches!inner(
            id,
            branch_name,
            branch_code
          )
        `)
        .eq("is_active", true);

      // Filter by branch if specified
      if (branchId) {
        studentsQuery = studentsQuery.eq("branch_id", branchId);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Calculate overall statistics
      const totalStudents = students?.length || 0;
      const paidStudents = students?.filter(s => (s.payment_balance as number) >= 0 && (Number(s.current_amount_due) || 0) > 0) || [];
      const outstandingStudents = students?.filter(s => (s.payment_balance as number) < 0) || [];
      const totalRevenue = outstandingStudents.length > 0 
        ? students!.reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0) 
        : 0;
      const paymentRate = totalStudents > 0 ? (paidStudents.length / totalStudents) * 100 : 0;

      // Calculate monthly growth (mock data for now)
      const monthlyGrowth = 8.5; // This would be calculated from historical data

      // Branch comparison
      const branchMap = new Map<string, {
        branchName: string;
        students: any[];
      }>();

      students?.forEach(student => {
        const branchId = student.school_branches.id;
        const branchName = student.school_branches.branch_name;
        
        if (!branchMap.has(branchId)) {
          branchMap.set(branchId, {
            branchName,
            students: []
          });
        }
        branchMap.get(branchId)?.students.push(student);
      });

      const branchComparison: BranchStats[] = Array.from(branchMap.entries()).map(([branchId, data]) => {
        const branchStudents = data.students;
        const branchPaid = branchStudents.filter(s => s.payment_status === "paid");
        const branchRevenue = branchPaid.reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0);
        const branchPaymentRate = branchStudents.length > 0 ? (branchPaid.length / branchStudents.length) * 100 : 0;

        return {
          branchId,
          branchName: data.branchName,
          students: branchStudents.length,
          revenue: branchRevenue,
          paymentRate: branchPaymentRate
        };
      });

      // Generate monthly trends (this would come from historical data)
      const monthlyTrends: MonthlyTrend[] = [
        { month: "Jan", revenue: totalRevenue * 0.8, students: Math.floor(totalStudents * 0.85), paymentRate: paymentRate * 0.9 },
        { month: "Feb", revenue: totalRevenue * 0.85, students: Math.floor(totalStudents * 0.9), paymentRate: paymentRate * 0.92 },
        { month: "Mar", revenue: totalRevenue * 0.9, students: Math.floor(totalStudents * 0.93), paymentRate: paymentRate * 0.94 },
        { month: "Apr", revenue: totalRevenue * 0.95, students: Math.floor(totalStudents * 0.96), paymentRate: paymentRate * 0.96 },
        { month: "May", revenue: totalRevenue, students: totalStudents, paymentRate: paymentRate },
        { month: "Jun", revenue: totalRevenue * 1.05, students: Math.floor(totalStudents * 1.02), paymentRate: Math.min(paymentRate * 1.02, 100) }
      ];

      setAnalytics({
        totalStudents,
        totalRevenue,
        paymentRate,
        monthlyGrowth,
        branchComparison,
        monthlyTrends
      });

    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [branchId, timeRange]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  };
}