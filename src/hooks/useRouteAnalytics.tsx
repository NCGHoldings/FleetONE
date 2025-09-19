import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RouteAnalytics {
  routeId: string;
  routeName: string;
  busRegNos: string[];
  totalBuses: number;
  drivers: { name?: string; contact?: string; busRegNo?: string }[];
  totalStudents: number;
  totalIncome: number;
  outstandingAmount: number;
  totalExpenses: number;
  staffCosts: number;
  netProfit: number;
  profitMargin: number;
  students: any[];
}

interface ExpenseBreakdown {
  maintenance: number;
  fuel: number;
  parking: number;
  other: number;
}

export function useRouteAnalytics(branchId?: string) {
  const [routes, setRoutes] = useState<RouteAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRouteAnalytics = async () => {
    if (!branchId) return;

    try {
      setLoading(true);
      setError(null);

      // First, get all students with route information for the branch
      const { data: students, error: studentsError } = await supabase
        .from("school_students")
        .select(`
          *,
          school_branches!inner(
            id,
            branch_name
          )
        `)
        .eq("branch_id", branchId)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      // Group students by route name only (not by bus)
      const routeGroups = new Map<string, any[]>();
      
      students?.forEach(student => {
        const routeKey = student.route || 'No Route';
        if (!routeGroups.has(routeKey)) {
          routeGroups.set(routeKey, []);
        }
        routeGroups.get(routeKey)?.push(student);
      });

      // Calculate analytics for each route
      const routeAnalytics: RouteAnalytics[] = [];

      for (const [routeKey, routeStudents] of routeGroups.entries()) {
        const routeName = routeKey;
        
        // Collect all unique buses and drivers for this route
        const busInfo = new Map<string, { driverName?: string }>();
        routeStudents.forEach(student => {
          const busRegNo = student.bus_reg_no;
          if (busRegNo && busRegNo !== 'No Bus') {
            if (!busInfo.has(busRegNo)) {
              busInfo.set(busRegNo, { driverName: student.driver_name });
            }
          }
        });

        const busRegNos = Array.from(busInfo.keys());
        const drivers = Array.from(busInfo.entries()).map(([busRegNo, info]) => ({
          name: info.driverName,
          contact: undefined, // Will be filled from route record
          busRegNo
        }));

        // Get or create route record (use first bus for route creation)
        const firstBusRegNo = busRegNos.length > 0 ? busRegNos[0] : 'No Bus';
        let routeRecord = await getOrCreateRoute(branchId, routeName, firstBusRegNo, routeStudents);
        
        // Calculate financial metrics for all students on this route
        const totalStudents = routeStudents.length;
        const paidStudents = routeStudents.filter(s => s.payment_status === "paid");
        const pendingStudents = routeStudents.filter(s => s.payment_status !== "paid");
        
        const totalIncome = paidStudents.reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0);
        const outstandingAmount = pendingStudents.reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0);

        // Get expenses for this route
        const { expenses, staffCosts } = await getRouteExpenses(routeRecord.id);
        const totalExpenses = expenses + staffCosts;
        
        const netProfit = totalIncome - totalExpenses;
        const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

        // Update route record with calculated values
        await updateRouteFinancials(routeRecord.id, {
          total_students: totalStudents,
          total_income: totalIncome,
          outstanding_amount: outstandingAmount,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          profit_margin: profitMargin
        });

        routeAnalytics.push({
          routeId: routeRecord.id,
          routeName: routeName,
          busRegNos: busRegNos,
          totalBuses: busRegNos.length,
          drivers: drivers.map(d => ({
            name: d.name,
            contact: routeRecord.driver_contact, // Use route record contact
            busRegNo: d.busRegNo
          })),
          totalStudents,
          totalIncome,
          outstandingAmount,
          totalExpenses,
          staffCosts,
          netProfit,
          profitMargin,
          students: routeStudents
        });
      }

      setRoutes(routeAnalytics);

    } catch (err: any) {
      console.error("Error fetching route analytics:", err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load route analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateRoute = async (branchId: string, routeName: string, busRegNo: string, students: any[]) => {
    // First try to find existing route
    const { data: existingRoute } = await supabase
      .from("school_routes")
      .select("*")
      .eq("branch_id", branchId)
      .eq("route_name", routeName)
      .eq("is_active", true)
      .maybeSingle();

    if (existingRoute) {
      // Update with bus info if not set
      if (!existingRoute.bus_reg_no && busRegNo !== 'No Bus') {
        await supabase
          .from("school_routes")
          .update({ 
            bus_reg_no: busRegNo,
            driver_name: students[0]?.driver_name 
          })
          .eq("id", existingRoute.id);
      }
      return existingRoute;
    }

    // Create new route
    const { data: newRoute, error } = await supabase
      .from("school_routes")
      .insert({
        branch_id: branchId,
        route_name: routeName,
        route_code: routeName.toUpperCase().replace(/\s+/g, '_'),
        bus_reg_no: busRegNo !== 'No Bus' ? busRegNo : null,
        driver_name: students[0]?.driver_name || null,
        start_location: students[0]?.pickup_point || 'Not specified',
        end_location: students[0]?.dropoff_point || 'Not specified',
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return newRoute;
  };

  const getRouteExpenses = async (routeId: string) => {
    // Get route expenses
    const { data: expenses } = await supabase
      .from("route_expenses")
      .select("amount")
      .eq("route_id", routeId);

    // Get staff costs
    const { data: staffCosts } = await supabase
      .from("route_staff_costs")
      .select("monthly_salary")
      .eq("route_id", routeId)
      .eq("is_active", true);

    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalStaffCosts = staffCosts?.reduce((sum, s) => sum + Number(s.monthly_salary), 0) || 0;

    return { 
      expenses: totalExpenses, 
      staffCosts: totalStaffCosts 
    };
  };

  const updateRouteFinancials = async (routeId: string, financials: any) => {
    await supabase
      .from("school_routes")
      .update({
        ...financials,
        last_calculated_at: new Date().toISOString()
      })
      .eq("id", routeId);
  };

  const addRouteExpense = async (routeId: string, expense: {
    expense_type: string;
    description: string;
    amount: number;
    expense_date?: string;
    expense_category?: string;
  }) => {
    const { error } = await supabase
      .from("route_expenses")
      .insert({
        route_id: routeId,
        branch_id: branchId,
        ...expense,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) throw error;
    
    // Refresh analytics
    await fetchRouteAnalytics();
    
    toast({
      title: "Success",
      description: "Expense added successfully"
    });
  };

  const addStaffCost = async (routeId: string, staff: {
    staff_type: string;
    staff_name: string;
    monthly_salary: number;
    daily_rate?: number;
    contact_number?: string;
  }) => {
    const { error } = await supabase
      .from("route_staff_costs")
      .insert({
        route_id: routeId,
        branch_id: branchId,
        ...staff,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) throw error;
    
    // Refresh analytics
    await fetchRouteAnalytics();
    
    toast({
      title: "Success",
      description: "Staff member added successfully"
    });
  };

  const updateRouteInfo = async (routeId: string, updates: {
    driver_name?: string;
    driver_contact?: string;
    bus_reg_no?: string;
  }) => {
    const { error } = await supabase
      .from("school_routes")
      .update(updates)
      .eq("id", routeId);

    if (error) throw error;
    
    // Refresh analytics
    await fetchRouteAnalytics();
    
    toast({
      title: "Success",
      description: "Route information updated"
    });
  };

  useEffect(() => {
    fetchRouteAnalytics();
  }, [branchId]);

  return {
    routes,
    loading,
    error,
    refetch: fetchRouteAnalytics,
    addRouteExpense,
    addStaffCost,
    updateRouteInfo
  };
}