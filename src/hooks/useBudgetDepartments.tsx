import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface BudgetDepartment {
  id: string;
  budget_id: string;
  department_name: string;
  department_code?: string;
  manager_id?: string;
  parent_department_id?: string;
  allocated_amount: number;
  spent_amount: number;
  variance_amount: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBudgetDepartments = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchDepartments = async (budgetId: string) => {
    try {
      const { data, error } = await supabase
        .from("budget_departments")
        .select("*")
        .eq("budget_id", budgetId)
        .order("display_order");

      if (error) throw error;
      return data as BudgetDepartment[];
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to fetch departments");
      throw error;
    }
  };

  const addDepartment = async (departmentData: Partial<BudgetDepartment>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("budget_departments")
        .insert([departmentData] as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Department added successfully");
      queryClient.invalidateQueries({ queryKey: ["budget_departments", departmentData.budget_id] });
      return data;
    } catch (error: any) {
      console.error("Error adding department:", error);
      toast.error("Failed to add department");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDepartment = async (departmentId: string, updates: Partial<BudgetDepartment>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("budget_departments")
        .update(updates)
        .eq("id", departmentId)
        .select()
        .single();

      if (error) throw error;

      toast.success("Department updated successfully");
      return data;
    } catch (error: any) {
      console.error("Error updating department:", error);
      toast.error("Failed to update department");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDepartment = async (departmentId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("budget_departments")
        .delete()
        .eq("id", departmentId);

      if (error) throw error;

      toast.success("Department deleted successfully");
      return true;
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast.error("Failed to delete department");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    isLoading,
  };
};
