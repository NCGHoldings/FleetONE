import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdditionalExpense {
  description: string;
  amount: number;
  category: "toll" | "parking" | "waiting" | "driver_meals" | "other";
}

export interface TripAdjustment {
  id?: string;
  quotation_id: string;
  actual_km_traveled?: number;
  original_quoted_km?: number;
  extra_km?: number;
  extra_km_charge_per_km?: number;
  extra_km_total_charge?: number;
  additional_expenses: AdditionalExpense[];
  total_additional_expenses: number;
  original_quotation_amount?: number;
  adjustment_amount?: number;
  final_trip_amount?: number;
  advance_already_paid?: number;
  balance_due?: number;
  notes?: string;
  adjustment_status: "draft" | "finalized" | "invoiced";
}

export const usePostTripAdjustment = () => {
  const [loading, setLoading] = useState(false);

  const calculateTotals = (
    originalAmount: number,
    extraKm: number,
    extraKmRate: number,
    additionalExpenses: AdditionalExpense[],
    advancePaid: number
  ) => {
    const extraKmCharge = extraKm * extraKmRate;
    const totalAdditionalExpenses = additionalExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const adjustmentAmount = extraKmCharge + totalAdditionalExpenses;
    const finalAmount = originalAmount + adjustmentAmount;
    const balanceDue = finalAmount - advancePaid;

    return {
      extra_km_total_charge: extraKmCharge,
      total_additional_expenses: totalAdditionalExpenses,
      adjustment_amount: adjustmentAmount,
      final_trip_amount: finalAmount,
      balance_due: balanceDue,
    };
  };

  const saveAdjustmentDraft = async (adjustment: TripAdjustment) => {
    setLoading(true);
    try {
      const adjustmentData: any = {
        ...adjustment,
        adjusted_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from("special_hire_trip_adjustments")
        .upsert(adjustmentData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Draft saved successfully");
      return { data, error: null };
    } catch (error: any) {
      console.error("Error saving adjustment draft:", error);
      toast.error("Failed to save draft: " + error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const finalizeAdjustment = async (adjustment: TripAdjustment) => {
    setLoading(true);
    try {
      const adjustmentData: any = {
        ...adjustment,
        adjusted_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from("special_hire_trip_adjustments")
        .upsert(adjustmentData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Adjustment finalized successfully");
      return { data, error: null };
    } catch (error: any) {
      console.error("Error finalizing adjustment:", error);
      toast.error("Failed to finalize adjustment: " + error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const getAdjustment = async (quotationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("special_hire_trip_adjustments")
        .select("*")
        .eq("quotation_id", quotationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error("Error fetching adjustment:", error);
      toast.error("Failed to load adjustment: " + error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const deleteAdjustment = async (adjustmentId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("special_hire_trip_adjustments")
        .delete()
        .eq("id", adjustmentId);

      if (error) throw error;

      toast.success("Adjustment deleted successfully");
      return { error: null };
    } catch (error: any) {
      console.error("Error deleting adjustment:", error);
      toast.error("Failed to delete adjustment: " + error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    calculateTotals,
    saveAdjustmentDraft,
    finalizeAdjustment,
    getAdjustment,
    deleteAdjustment,
  };
};
