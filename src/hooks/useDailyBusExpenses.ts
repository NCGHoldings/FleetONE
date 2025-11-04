import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DailyBusExpense {
  id?: string;
  expense_date: string;
  bus_id: string;
  fuel_cost: number;
  diesel_price_per_liter?: number;
  repair: number;
  tyre_tube: number;
  salary: number;
  police: number;
  food: number;
  emission_fitness: number;
  permits_renewal: number;
  staff_accommodation: number;
  highway_charges: number;
  accident_compensation: number;
  parking: number;
  log_sheet: number;
  vehicle_hire: number;
  ntc: number;
  runner: number;
  short_misc: number;
  temporary_permit: number;
  body_wash: number;
  legal_court: number;
  other: number;
  notes?: string;
}

export function useDailyBusExpenses(date: Date) {
  const [expenses, setExpenses] = useState<(DailyBusExpense & { buses: { bus_no: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const dateStr = date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("daily_bus_expenses")
        .select(`
          *,
          buses!inner(bus_no)
        `)
        .eq("expense_date", dateStr)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error fetching daily expenses:", error);
      toast({
        title: "Error",
        description: "Failed to load daily expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveExpense = async (expense: DailyBusExpense) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const expenseData = {
        ...expense,
        created_by: user.user?.id
      };

      const { error } = await supabase
        .from("daily_bus_expenses")
        .upsert(expenseData, {
          onConflict: "bus_id,expense_date"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Daily expenses saved successfully"
      });

      await fetchExpenses();
      return true;
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save expenses",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from("daily_bus_expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });

      await fetchExpenses();
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [date]);

  return {
    expenses,
    loading,
    saveExpense,
    deleteExpense,
    refetch: fetchExpenses
  };
}
