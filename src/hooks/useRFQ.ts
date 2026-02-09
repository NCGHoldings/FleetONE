import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

// ============ Request for Quotations ============
export const useRFQs = (status?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["rfqs", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("request_for_quotations")
        .select(`
          *,
          purchase_requisitions (
            pr_number
          )
        `)
        .order("rfq_date", { ascending: false });
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useRFQLines = (rfqId: string) => {
  return useQuery({
    queryKey: ["rfq-lines", rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_lines")
        .select(`
          *,
          items (
            item_code,
            item_name,
            unit_of_measure
          )
        `)
        .eq("rfq_id", rfqId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!rfqId,
  });
};

export const useRFQVendors = (rfqId: string) => {
  return useQuery({
    queryKey: ["rfq-vendors", rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_vendors")
        .select(`
          *,
          vendors (
            vendor_code,
            vendor_name,
            email,
            phone
          )
        `)
        .eq("rfq_id", rfqId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!rfqId,
  });
};

export const useCreateRFQ = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (rfq: {
      rfq_number: string;
      requisition_id?: string;
      rfq_date: string;
      response_deadline?: string;
      notes?: string;
      vendor_ids: string[];
      lines: {
        item_id: string;
        description?: string;
        quantity: number;
        uom?: string;
      }[];
    }) => {
      const { vendor_ids, lines, ...rfqData } = rfq;
      
      // Create RFQ
      const { data: newRFQ, error: rfqError } = await supabase
        .from("request_for_quotations")
        .insert({
          ...rfqData,
          company_id: selectedCompanyId,
          status: "draft",
        })
        .select()
        .single();
      
      if (rfqError) throw rfqError;
      
      // Create RFQ lines
      const rfqLines = lines.map(line => ({
        rfq_id: newRFQ.id,
        item_id: line.item_id,
        description: line.description,
        quantity: line.quantity,
        uom: line.uom,
      }));
      
      const { error: linesError } = await supabase
        .from("rfq_lines")
        .insert(rfqLines);
      
      if (linesError) throw linesError;
      
      // Create RFQ vendor assignments
      const rfqVendors = vendor_ids.map(vendorId => ({
        rfq_id: newRFQ.id,
        vendor_id: vendorId,
      }));
      
      const { error: vendorsError } = await supabase
        .from("rfq_vendors")
        .insert(rfqVendors);
      
      if (vendorsError) throw vendorsError;
      
      return newRFQ;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      toast({ title: "RFQ created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create RFQ", description: error.message, variant: "destructive" });
    },
  });
};

export const useSendRFQ = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ rfqId, vendorIds }: { rfqId: string; vendorIds: string[] }) => {
      // Update RFQ status
      await supabase
        .from("request_for_quotations")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", rfqId);
      
      // Update vendor sent dates
      for (const vendorId of vendorIds) {
        await supabase
          .from("rfq_vendors")
          .update({ sent_date: new Date().toISOString() })
          .eq("rfq_id", rfqId)
          .eq("vendor_id", vendorId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["rfq-vendors"] });
      toast({ title: "RFQ sent to vendors" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send RFQ", description: error.message, variant: "destructive" });
    },
  });
};

// ============ Supplier Quotations ============
export const useSupplierQuotations = (rfqId?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["supplier-quotations", rfqId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("supplier_quotations")
        .select(`
          *,
          vendors (
            vendor_code,
            vendor_name
          ),
          request_for_quotations (
            rfq_number
          )
        `)
        .order("quotation_date", { ascending: false });
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      if (rfqId) {
        query = query.eq("rfq_id", rfqId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useSupplierQuotationLines = (quotationId: string) => {
  return useQuery({
    queryKey: ["supplier-quotation-lines", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_quotation_lines")
        .select(`
          *,
          items (
            item_code,
            item_name,
            unit_of_measure
          ),
          rfq_lines (
            quantity
          )
        `)
        .eq("quotation_id", quotationId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!quotationId,
  });
};

export const useCreateSupplierQuotation = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (quotation: {
      sq_number: string;
      rfq_id: string;
      vendor_id: string;
      quotation_date: string;
      valid_until?: string;
      currency?: string;
      notes?: string;
      lines: {
        rfq_line_id: string;
        item_id: string;
        quantity: number;
        unit_price: number;
        lead_time_days?: number;
      }[];
    }) => {
      const { lines, ...quotationData } = quotation;
      
      // Calculate total
      const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
      
      // Create quotation
      const { data: newQuotation, error: quotationError } = await supabase
        .from("supplier_quotations")
        .insert({
          ...quotationData,
          company_id: selectedCompanyId,
          total_amount: totalAmount,
          status: "received",
        })
        .select()
        .single();
      
      if (quotationError) throw quotationError;
      
      // Create lines
      const quotationLines = lines.map(line => ({
        quotation_id: newQuotation.id,
        rfq_line_id: line.rfq_line_id,
        item_id: line.item_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        lead_time_days: line.lead_time_days,
        line_total: line.quantity * line.unit_price,
      }));
      
      const { error: linesError } = await supabase
        .from("supplier_quotation_lines")
        .insert(quotationLines);
      
      if (linesError) throw linesError;
      
      // Mark vendor as responded
      await supabase
        .from("rfq_vendors")
        .update({ response_received: true })
        .eq("rfq_id", quotation.rfq_id)
        .eq("vendor_id", quotation.vendor_id);
      
      return newQuotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-quotations"] });
      queryClient.invalidateQueries({ queryKey: ["rfq-vendors"] });
      toast({ title: "Supplier quotation recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record quotation", description: error.message, variant: "destructive" });
    },
  });
};

export const useSelectSupplierQuotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ quotationId, rfqId }: { quotationId: string; rfqId: string }) => {
      // Unselect all quotations for this RFQ
      await supabase
        .from("supplier_quotations")
        .update({ is_selected: false })
        .eq("rfq_id", rfqId);
      
      // Select the chosen quotation
      await supabase
        .from("supplier_quotations")
        .update({ is_selected: true, status: "accepted" })
        .eq("id", quotationId);
      
      // Update RFQ status
      await supabase
        .from("request_for_quotations")
        .update({ status: "closed" })
        .eq("id", rfqId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-quotations"] });
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      toast({ title: "Supplier quotation selected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to select quotation", description: error.message, variant: "destructive" });
    },
  });
};
