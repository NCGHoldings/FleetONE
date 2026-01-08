import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIInsightsResult {
  insights: string;
  timestamp: Date;
}

export function useAIInsights() {
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async (
    analyticsData: any,
    analysisType: "comprehensive" | "profitability" | "efficiency" | "performance" | "risks" = "comprehensive"
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "analyze-trips",
        {
          body: { analyticsData, analysisType },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const result = {
        insights: data.insights,
        timestamp: new Date(),
      };

      setInsights(result);
      toast.success("AI insights generated successfully");
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate AI insights";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("AI insights error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearInsights = () => {
    setInsights(null);
    setError(null);
  };

  return {
    generateInsights,
    clearInsights,
    isLoading,
    insights,
    error,
  };
}
