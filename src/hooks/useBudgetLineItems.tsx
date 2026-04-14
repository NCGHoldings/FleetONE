import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface BudgetLineItem {
  id: string;
  budget_id: string;
  department_id?: string;
  account_id?: string;
  category: string;
  subcategory?: string;
  line_item_name: string;
  description?: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percentage: number;
  period_type: string;
  monthly_allocation?: any;
  notes?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBudgetLineItems = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchLineItems = async (budgetId: string, departmentId?: string) => {
    try {
      let query = supabase
        .from("budget_line_items")
        .select("*")
        .eq("budget_id", budgetId)
        .order("display_order");

      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BudgetLineItem[];
    } catch (error: any) {
      console.error("Error fetching line items:", error);
      toast.error("Failed to fetch line items");
      throw error;
    }
  };

  const addLineItem = async (itemData: Partial<BudgetLineItem>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("budget_line_items")
        .insert([itemData] as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Line item added successfully");
      queryClient.invalidateQueries({ queryKey: ["budget_line_items", itemData.budget_id] });
      return data;
    } catch (error: any) {
      console.error("Error adding line item:", error);
      toast.error("Failed to add line item");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLineItem = async (itemId: string, updates: Partial<BudgetLineItem>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("budget_line_items")
        .update(updates)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      toast.success("Line item updated successfully");
      return data;
    } catch (error: any) {
      console.error("Error updating line item:", error);
      toast.error("Failed to update line item");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLineItem = async (itemId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("budget_line_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Line item deleted successfully");
      return true;
    } catch (error: any) {
      console.error("Error deleting line item:", error);
      toast.error("Failed to delete line item");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkImportLineItems = async (budgetId: string, items: Partial<BudgetLineItem>[]) => {
    setIsLoading(true);
    try {
      const itemsWithBudgetId = items.map(item => ({
        ...item,
        budget_id: budgetId,
      }));

      const { data, error } = await supabase
        .from("budget_line_items")
        .insert(itemsWithBudgetId as any)
        .select();

      if (error) throw error;

      toast.success(`${items.length} line items imported successfully`);
      queryClient.invalidateQueries({ queryKey: ["budget_line_items", budgetId] });
      return data;
    } catch (error: any) {
      console.error("Error importing line items:", error);
      toast.error("Failed to import line items");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchLineItems,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    bulkImportLineItems,
    isLoading,
  };
};
