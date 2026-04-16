import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

// ============ Payment Terms ============
export const usePaymentTerms = () => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["payment-terms", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("payment_terms")
        .select("*")
        .order("term_name");
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useCreatePaymentTerm = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (term: {
      term_name: string;
      description?: string;
      due_days: number;
      discount_percentage?: number;
      discount_days?: number;
      is_default?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("payment_terms")
        .insert({ ...term, company_id: selectedCompanyId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
      toast({ title: "Payment term created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create payment term", description: error.message, variant: "destructive" });
    },
  });
};

// ============ Sales Orders ============
export const useSalesOrders = (status?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["sales-orders", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("sales_orders")
        .select(`
          *,
          customers (
            customer_code,
            customer_name
          ),
          payment_terms (
            term_name,
            due_days
          )
        `)
        .order("order_date", { ascending: false });
      
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

export const useSalesOrderLines = (orderId: string) => {
  return useQuery({
    queryKey: ["sales-order-lines", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_order_lines")
        .select(`
          *,
          items (
            item_code,
            item_name,
            unit_of_measure
          )
        `)
        .eq("sales_order_id", orderId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (order: {
      so_number: string;
      customer_id: string;
      order_date: string;
      delivery_date?: string;
      payment_terms_id?: string;
      shipping_address?: string;
      billing_address?: string;
      notes?: string;
      lines: {
        item_id: string;
        description?: string;
        quantity: number;
        unit_price: number;
        discount_percent?: number;
        tax_rate?: number;
      }[];
    }) => {
      const { lines, ...orderData } = order;
      
      // Calculate totals
      const subtotal = lines.reduce((sum, line) => {
        const lineTotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);
        return sum + lineTotal;
      }, 0);
      
      const taxAmount = lines.reduce((sum, line) => {
        const lineTotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);
        return sum + lineTotal * ((line.tax_rate || 0) / 100);
      }, 0);
      
      // Create order
      const { data: salesOrder, error: orderError } = await supabase
        .from("sales_orders")
        .insert({
          ...orderData,
          company_id: selectedCompanyId,
          subtotal,
          tax_amount: taxAmount,
          total_amount: subtotal + taxAmount,
          status: "draft",
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create lines
      const orderLines = lines.map(line => ({
        sales_order_id: salesOrder.id,
        item_id: line.item_id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent || 0,
        tax_rate: line.tax_rate || 0,
        tax_amount: line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100) * ((line.tax_rate || 0) / 100),
        line_total: line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100),
      }));
      
      const { error: linesError } = await supabase
        .from("sales_order_lines")
        .insert(orderLines);
      
      if (linesError) throw linesError;
      
      return salesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast({ title: "Sales order created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create sales order", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateSalesOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("sales_orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast({ title: "Sales order status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });
};

// ============ Delivery Notes ============
export const useDeliveryNotes = (status?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["delivery-notes", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("delivery_notes")
        .select(`
          *,
          customers (
            customer_code,
            customer_name
          ),
          sales_orders (
            so_number
          )
        `)
        .order("delivery_date", { ascending: false });
      
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

export const useDeliveryNoteLines = (noteId: string) => {
  return useQuery({
    queryKey: ["delivery-note-lines", noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_note_lines")
        .select(`
          *,
          items (
            item_code,
            item_name,
            unit_of_measure
          )
        `)
        .eq("delivery_note_id", noteId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!noteId,
  });
};

export const useCreateDeliveryNote = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (note: {
      dn_number: string;
      sales_order_id: string;
      customer_id: string;
      delivery_date: string;
      shipping_address?: string;
      driver_name?: string;
      vehicle_number?: string;
      notes?: string;
      lines: {
        so_line_id: string;
        item_id: string;
        quantity: number;
        warehouse_id?: string;
        batch_number?: string;
      }[];
    }) => {
      const { lines, ...noteData } = note;
      
      // Create delivery note
      const { data: deliveryNote, error: noteError } = await supabase
        .from("delivery_notes")
        .insert({
          ...noteData,
          company_id: selectedCompanyId,
          status: "draft",
        })
        .select()
        .single();
      
      if (noteError) throw noteError;
      
      // Create lines
      const noteLines = lines.map(line => ({
        delivery_note_id: deliveryNote.id,
        so_line_id: line.so_line_id,
        item_id: line.item_id,
        quantity: line.quantity,
        warehouse_id: line.warehouse_id,
        batch_number: line.batch_number,
      }));
      
      const { error: linesError } = await supabase
        .from("delivery_note_lines")
        .insert(noteLines);
      
      if (linesError) throw linesError;
      
      // Update SO line delivered quantities
      for (const line of lines) {
        const { data: soLine } = await supabase
          .from("sales_order_lines")
          .select("delivered_qty")
          .eq("id", line.so_line_id)
          .single();
        
        if (soLine) {
          await supabase
            .from("sales_order_lines")
            .update({ delivered_qty: (soLine.delivered_qty || 0) + line.quantity })
            .eq("id", line.so_line_id);
        }
      }
      
      return deliveryNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast({ title: "Delivery note created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create delivery note", description: error.message, variant: "destructive" });
    },
  });
};
