import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateExtraTimeCharge } from "@/lib/extra-time-calculator";

export interface AdditionalExpense {
  description: string;
  amount: number;
  category: "toll" | "parking" | "waiting" | "driver_meals" | "other";
}

export interface TimeAdjustmentResult {
  originalHours: number;
  actualHours: number;
  availableHours: number;
  extraHours: number;
  originalOvertimeCharge: number;
  originalOvernightCharge: number;
  actualOvertimeCharge: number;
  actualOvernightCharge: number;
  overtimeAdjustment: number;
  overnightAdjustment: number;
  totalTimeAdjustment: number;
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
  // Time adjustment fields
  original_pickup_datetime?: string;
  original_drop_datetime?: string;
  actual_pickup_datetime?: string;
  actual_drop_datetime?: string;
  original_hours?: number;
  actual_hours?: number;
  extra_hours?: number;
  original_overtime_charge?: number;
  original_overnight_charge?: number;
  actual_overtime_charge?: number;
  actual_overnight_charge?: number;
  overtime_charge_adjustment?: number;
  overnight_charge_adjustment?: number;
  total_time_adjustment?: number;
}

export interface TimeAdjustmentConfig {
  baselineSpeedKmph?: number;
  hourlyRate?: number;
  nightBlockFee?: number;
  // Support for Lyceum/Internal hire types
  useStandardHours?: boolean;
  standardHours?: number;
}

export const usePostTripAdjustment = () => {
  const [loading, setLoading] = useState(false);

  const calculateTimeAdjustment = (
    originalDistanceKm: number,
    actualDistanceKm: number, // Used for display only, NOT for available hours calculation
    originalPickupDatetime: string | Date,
    originalDropDatetime: string | Date,
    actualPickupDatetime: string | Date,
    actualDropDatetime: string | Date,
    config: TimeAdjustmentConfig = {}
  ): TimeAdjustmentResult => {
    const {
      baselineSpeedKmph = 10,
      hourlyRate = 500,
      nightBlockFee = 3000,
      useStandardHours = false,
      standardHours = 8,
    } = config;

    // Calculate original time charges based on original quoted distance and times
    const originalTimeResult = calculateExtraTimeCharge(
      originalDistanceKm,
      originalPickupDatetime,
      originalDropDatetime,
      { baselineSpeedKmph, hourlyRate, nightBlockFee, useStandardHours, standardHours }
    );

    // FIX: Use ORIGINAL distance for available hours baseline (not actualDistanceKm)
    // Available hours should ALWAYS be based on quoted distance - extra KM doesn't give more time
    const actualTimeResult = calculateExtraTimeCharge(
      originalDistanceKm, // Use ORIGINAL distance, not actualDistanceKm
      actualPickupDatetime,
      actualDropDatetime,
      { baselineSpeedKmph, hourlyRate, nightBlockFee, useStandardHours, standardHours }
    );

    // Calculate adjustments (difference between actual and original)
    const overtimeAdjustment = actualTimeResult.overtimeCharge - originalTimeResult.overtimeCharge;
    const overnightAdjustment = actualTimeResult.overnightCharge - originalTimeResult.overnightCharge;
    const totalTimeAdjustment = overtimeAdjustment + overnightAdjustment;

    return {
      originalHours: originalTimeResult.actualHours,
      actualHours: actualTimeResult.actualHours,
      availableHours: originalTimeResult.availableHours, // Use original available hours (based on quoted distance)
      extraHours: actualTimeResult.extraHours,
      originalOvertimeCharge: originalTimeResult.overtimeCharge,
      originalOvernightCharge: originalTimeResult.overnightCharge,
      actualOvertimeCharge: actualTimeResult.overtimeCharge,
      actualOvernightCharge: actualTimeResult.overnightCharge,
      overtimeAdjustment,
      overnightAdjustment,
      totalTimeAdjustment,
    };
  };

  const calculateTotals = (
    originalAmount: number,
    extraKm: number,
    extraKmRate: number,
    additionalExpenses: AdditionalExpense[],
    advancePaid: number,
    timeAdjustment: number = 0
  ) => {
    const extraKmCharge = extraKm * extraKmRate;
    const totalAdditionalExpenses = additionalExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const adjustmentAmount = extraKmCharge + totalAdditionalExpenses + timeAdjustment;
    const finalAmount = originalAmount + adjustmentAmount;
    const balanceDue = finalAmount - advancePaid;

    return {
      extra_km_total_charge: extraKmCharge,
      total_additional_expenses: totalAdditionalExpenses,
      total_time_adjustment: timeAdjustment,
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
    calculateTimeAdjustment,
    calculateTotals,
    saveAdjustmentDraft,
    finalizeAdjustment,
    getAdjustment,
    deleteAdjustment,
  };
};
