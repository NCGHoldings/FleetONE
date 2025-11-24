import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface Budget {
  id: string;
  budget_name: string;
  budget_code: string;
  fiscal_year: number;
  budget_period: "annual" | "quarterly" | "monthly";
  start_date: string;
  end_date: string;
  template_id?: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "active" | "closed";
  total_budget_amount: number;
  currency: string;
  approval_notes?: string;
  approved_by?: string;
  approved_at?: string;
  version_number: number;
  parent_budget_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
}

export const useBudgets = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchBudgets = async (filters?: {
    fiscal_year?: number;
    status?: string;
    search?: string;
  }) => {
    try {
      let query = supabase
        .from("budgets")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.fiscal_year) {
        query = query.eq("fiscal_year", filters.fiscal_year);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.or(`budget_name.ilike.%${filters.search}%,budget_code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Budget[];
    } catch (error: any) {
      console.error("Error fetching budgets:", error);
      toast.error("Failed to fetch budgets");
      throw error;
    }
  };

  const getBudgetById = async (budgetId: string) => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

      if (error) throw error;
      return data as Budget;
    } catch (error: any) {
      console.error("Error fetching budget:", error);
      toast.error("Failed to fetch budget details");
      throw error;
    }
  };

  const createBudget = async (budgetData: Partial<Budget>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("budgets")
        .insert([{
          ...budgetData,
          created_by: user?.id,
        }] as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Budget created successfully");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      return data;
    } catch (error: any) {
      console.error("Error creating budget:", error);
      toast.error("Failed to create budget");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBudget = async (budgetId: string, updates: Partial<Budget>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", budgetId)
        .select()
        .single();

      if (error) throw error;

      toast.success("Budget updated successfully");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
      return data;
    } catch (error: any) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBudget = async (budgetId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;

      toast.success("Budget deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      return true;
    } catch (error: any) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateBudget = async (budgetId: string, newFiscalYear: number) => {
    setIsLoading(true);
    try {
      const budget = await getBudgetById(budgetId);
      const { data: { user } } = await supabase.auth.getUser();

      const newBudget = {
        budget_name: `${budget.budget_name} (Copy)`,
        fiscal_year: newFiscalYear,
        budget_period: budget.budget_period,
        start_date: budget.start_date,
        end_date: budget.end_date,
        template_id: budget.template_id,
        currency: budget.currency,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from("budgets")
        .insert([newBudget] as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Budget duplicated successfully");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      return data;
    } catch (error: any) {
      console.error("Error duplicating budget:", error);
      toast.error("Failed to duplicate budget");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const submitForApproval = async (budgetId: string) => {
    return await updateBudget(budgetId, { status: "pending_approval" });
  };

  const approveBudget = async (budgetId: string, notes?: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("budgets")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes,
        })
        .eq("id", budgetId)
        .select()
        .single();

      if (error) throw error;

      toast.success("Budget approved successfully");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      return data;
    } catch (error: any) {
      console.error("Error approving budget:", error);
      toast.error("Failed to approve budget");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectBudget = async (budgetId: string, reason: string) => {
    return await updateBudget(budgetId, {
      status: "rejected",
      approval_notes: reason,
    });
  };

  return {
    fetchBudgets,
    getBudgetById,
    createBudget,
    updateBudget,
    deleteBudget,
    duplicateBudget,
    submitForApproval,
    approveBudget,
    rejectBudget,
    isLoading,
  };
};
