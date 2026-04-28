import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

export const EXPENSE_CATEGORIES = [
  { value: "fuel", label: "Fuel/Diesel", group: "Operational" },
  { value: "highway", label: "Highway Charges", group: "Operational" },
  { value: "parking", label: "Parking", group: "Operational" },
  { value: "vehicle_hire", label: "Vehicle Hire", group: "Operational" },
  { value: "salary", label: "Salary/Wages", group: "Staff" },
  { value: "food", label: "Food/Meals", group: "Staff" },
  { value: "runner", label: "Runner Charges", group: "Staff" },
  { value: "accommodation", label: "Staff Accommodation", group: "Staff" },
  { value: "repairs", label: "Repairs", group: "Maintenance" },
  { value: "tyre", label: "Tyre/Tube", group: "Maintenance" },
  { value: "body_wash", label: "Body Wash/Cleaning", group: "Maintenance" },
  { value: "police_fines", label: "Police/Fines", group: "Administrative" },
  { value: "emission", label: "Emission/Fitness", group: "Administrative" },
  { value: "permits_renewal", label: "Permits Renewal", group: "Administrative" },
  { value: "temp_permits", label: "Temporary Permits", group: "Administrative" },
  { value: "log_sheet", label: "Log Sheet", group: "Administrative" },
  { value: "ntc_charges", label: "NTC Charges", group: "Administrative" },
  { value: "legal", label: "Legal/Court", group: "Administrative" },
  { value: "accident", label: "Accident Compensation", group: "Other" },
  { value: "short_misc", label: "Short/Misc", group: "Other" },
  { value: "other", label: "Other", group: "Other" },
];

export const BUSINESS_UNITS = [
  { value: "SBO", label: "School Bus Operations" },
  { value: "SPH", label: "Special Hire" },
  { value: "YUT", label: "Yutong Sales" },
  { value: "SNT", label: "Sinotruck Sales" },
  { value: "LTV", label: "Light Vehicles" },
  { value: "NCGE", label: "NCG Express" },
  { value: "NCGH", label: "NCG Holding" },
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash - Paid directly" },
  { value: "bank", label: "Bank Transfer" },
  { value: "petty_cash", label: "Petty Cash" },
  { value: "iou", label: "IOU Settlement" },
  { value: "to_be_paid", label: "To be paid (Create AP Invoice)" },
];

export interface ExpenseRequest {
  id: string;
  request_number: string;
  request_date: string;
  business_unit_code: string;
  company_id: string | null;
  expense_category: string;
  expense_subcategory: string | null;
  description: string | null;
  amount: number;
  bus_id: string | null;
  vendor_id: string | null;
  vendor_name_draft: string | null;
  payment_method: string;
  petty_cash_fund_id: string | null;
  iou_id: string | null;
  receipt_attachment_url: string | null;
  additional_docs: any;
  notes: string | null;
  status: string;
  created_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  ap_invoice_id: string | null;
  ap_payment_id: string | null;
  gl_posted: boolean;
  journal_entry_id: string | null;
  // NEW — OCR + Bank fields
  bank_account_id: string | null;
  fuel_liters: number | null;
  fuel_price_per_liter: number | null;
  receipt_ocr_data: any;
  ocr_fields_modified: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined data
  vendor?: { vendor_name: string } | null;
  bus?: { bus_number: string } | null;
}

export const useExpenseRequests = (filters?: {
  status?: string;
  businessUnit?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["expense-requests", selectedCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("expense_requests")
        .select(`
          *,
          vendor:vendors(vendor_name),
          bus:buses(bus_no)
        `)
        .order("created_at", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.businessUnit && filters.businessUnit !== "all") {
        query = query.eq("business_unit_code", filters.businessUnit);
      }

      if (filters?.dateFrom) {
        query = query.gte("request_date", filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte("request_date", filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ExpenseRequest[];
    },
  });
};

import { useGenerateNumber } from "@/hooks/useNumbering";

export const useCreateExpenseRequest = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  const generateNumber = useGenerateNumber();

  return useMutation({
    mutationFn: async (data: Partial<ExpenseRequest>) => {
      // Use the Guardian for atomic number generation, fallback to timestamp ONLY if RPC fails
      const requestNumber = await generateNumber("expense_request");

      const { data: result, error } = await (supabase as any)
        .from("expense_requests")
        .insert([{
          request_number: requestNumber,
          request_date: data.request_date,
          business_unit_code: data.business_unit_code || "SBO",
          company_id: selectedCompanyId,
          expense_category: data.expense_category || "other",
          expense_subcategory: data.expense_subcategory,
          description: data.description,
          amount: data.amount || 0,
          bus_id: data.bus_id,
          vendor_id: data.vendor_id,
          vendor_name_draft: data.vendor_name_draft,
          payment_method: data.payment_method || "to_be_paid",
          petty_cash_fund_id: data.petty_cash_fund_id,
          iou_id: data.iou_id,
          notes: data.notes,
          status: data.status || "draft",
          // OCR + Bank fields
          bank_account_id: data.bank_account_id || null,
          fuel_liters: data.fuel_liters || null,
          fuel_price_per_liter: data.fuel_price_per_liter || null,
          receipt_attachment_url: data.receipt_attachment_url || null,
          receipt_ocr_data: data.receipt_ocr_data || null,
          ocr_fields_modified: data.ocr_fields_modified || null,
          additional_docs: data.additional_docs || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Auto-deduct from petty cash fund if payment_method is petty_cash
      if (data.payment_method === "petty_cash" && data.petty_cash_fund_id && (data.amount || 0) > 0) {
        try {
          const amount = data.amount || 0;

          // Get fund details
          const { data: fund } = await supabase
            .from("petty_cash_funds")
            .select("gl_account_id, current_balance, fund_name")
            .eq("id", data.petty_cash_fund_id)
            .single();

          if (fund) {
            // Create petty cash disbursement transaction
            const newBalance = (fund.current_balance || 0) - amount;
            
            await supabase
              .from("petty_cash_transactions")
              .insert({
                petty_cash_fund_id: data.petty_cash_fund_id,
                transaction_type: "disbursement",
                expense_request_id: result.id,
                amount,
                balance_after: newBalance,
                description: `Expense: ${data.description || data.expense_category || "Petty Cash Payment"}`,
                expense_category: data.expense_category || null,
                payment_method: "cash",
                status: "approved",
                company_id: selectedCompanyId,
              });

            // Update fund balance
            await supabase
              .from("petty_cash_funds")
              .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
              .eq("id", data.petty_cash_fund_id);
          }
        } catch (pcErr) {
          console.error("Petty cash auto-deduction failed (expense still saved):", pcErr);
        }
      }

      // Auto-settle IOU when payment method is "iou"
      if (data.payment_method === "iou" && data.iou_id && (data.amount || 0) > 0) {
        try {
          const amount = data.amount || 0;
          const { data: iou } = await supabase
            .from("iou_records")
            .select("amount, settled_amount, balance")
            .eq("id", data.iou_id)
            .single();

          if (iou) {
            const newSettledAmount = (iou.settled_amount || 0) + amount;
            const newBalance = (iou.amount || 0) - newSettledAmount;
            const newStatus = newBalance <= 0 ? "settled" : "partially_settled";

            await supabase
              .from("iou_records")
              .update({
                settled_amount: newSettledAmount,
                status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq("id", data.iou_id);
          }
        } catch (iouErr) {
          console.error("IOU auto-settlement failed (expense still saved):", iouErr);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-all-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["iou-records"] });
      toast({
        title: "Expense Request Created",
        description: "The expense request has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateExpenseRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ExpenseRequest> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("expense_requests")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      toast({
        title: "Expense Request Updated",
        description: "The expense request has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteExpenseRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expense_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      toast({
        title: "Expense Request Deleted",
        description: "The expense request has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook to get filtered expense categories based on company settings
export const useCompanyExpenseCategories = () => {
  const { selectedCompanyId } = useCompany();

  const { data: settings } = useQuery({
    queryKey: ["company-expense-categories", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("company_expense_categories")
        .select("category_value, is_enabled")
        .eq("company_id", selectedCompanyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  // If no settings exist for this company, return all categories (backward compatible)
  if (!settings || settings.length === 0) {
    return EXPENSE_CATEGORIES;
  }

  // Filter to only enabled categories
  const enabledValues = new Set(
    settings.filter((s: any) => s.is_enabled).map((s: any) => s.category_value)
  );

  return EXPENSE_CATEGORIES.filter((cat) => enabledValues.has(cat.value));
};
