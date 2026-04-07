import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface NumberingSequence {
  id: string;
  company_id: string | null;
  entity_type: string;
  prefix: string;
  include_year: boolean;
  include_month: boolean;
  separator: string;
  padding_length: number;
  next_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const entityTypeLabels: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  item: "Item",
  ar_invoice: "AR Invoice",
  ap_invoice: "AP Invoice",
  payment: "Payment",
  receipt: "Receipt",
  journal: "Journal Entry",
  grn: "Goods Receipt Note",
  po: "Purchase Order",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  rfq: "Request for Quotation",
  so: "Sales Order",
  qi: "Quality Inspection",
  stock_transfer: "Stock Transfer",
  budget: "Budget",
  payment_batch: "Payment Batch",
};

export function useNumberingSequences() {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["numbering-sequences", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("numbering_sequences")
        .select("*")
        .or(`company_id.eq.${selectedCompanyId},company_id.is.null`)
        .eq("is_active", true)
        .order("entity_type");

      if (error) throw error;
      return data as NumberingSequence[];
    },
  });
}

export function useUpdateNumberingSequence() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      prefix?: string;
      include_year?: boolean;
      include_month?: boolean;
      separator?: string;
      padding_length?: number;
      next_number?: number;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("numbering_sequences")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["numbering-sequences"] });
      toast.success("Numbering configuration updated");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useGenerateNumber() {
  const { selectedCompanyId } = useCompany();

  return useCallback(async (entityType: string): Promise<string> => {
    const { data, error } = await supabase.rpc("generate_entity_number", {
      p_entity_type: entityType,
      p_company_id: selectedCompanyId,
    });

    if (error) {
      console.error("Failed to generate number:", error);
      const timestamp = Date.now().toString().slice(-6);
      return `${entityType.toUpperCase()}-${timestamp}`;
    }

    return data as string;
  }, [selectedCompanyId]);
}

export function generatePreviewNumber(config: NumberingSequence): string {
  let preview = config.prefix;
  
  if (config.include_year) {
    preview += config.separator + new Date().getFullYear();
  }
  
  if (config.include_month) {
    preview += String(new Date().getMonth() + 1).padStart(2, "0");
  }
  
  preview += config.separator + String(config.next_number).padStart(config.padding_length, "0");
  
  return preview;
}
