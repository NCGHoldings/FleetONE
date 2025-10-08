import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerCard {
  customer: {
    id: string;
    customer_code: string;
    company_name: string;
  };
  subCustomersCount: number;
  totalQuotations: number;
  totalValue: number;
  latestQuotationDate: string | null;
}

export function useYutongCustomerCards() {
  const [customerCards, setCustomerCards] = useState<CustomerCard[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCustomerCards = async () => {
    setLoading(true);
    try {
      // Get all main customers
      const { data: customers, error: customersError } = await supabase
        .from("yutong_customers")
        .select("id, customer_code, company_name")
        .or("is_main_customer.eq.true,parent_customer_id.is.null")
        .order("company_name");

      if (customersError) throw customersError;

      // For each customer, get sub-customers count and quotation stats
      const cardsPromises = (customers || []).map(async (customer) => {
        // Get sub-customers count
        const { count: subCount } = await supabase
          .from("yutong_customers")
          .select("id", { count: "exact", head: true })
          .eq("parent_customer_id", customer.id);

        // Get sub-customer IDs
        const { data: subCustomers } = await supabase
          .from("yutong_customers")
          .select("id")
          .eq("parent_customer_id", customer.id);

        const allCustomerIds = [customer.id, ...(subCustomers || []).map((sub) => sub.id)];

        // Get quotations for this customer and sub-customers
        const { data: quotations } = await supabase
          .from("yutong_quotations")
          .select("total_price, created_at")
          .in("customer_id", allCustomerIds);

        const totalQuotations = quotations?.length || 0;
        const totalValue = quotations?.reduce((sum, q) => sum + (q.total_price || 0), 0) || 0;
        const latestQuotationDate = quotations?.[0]?.created_at || null;

        return {
          customer,
          subCustomersCount: subCount || 0,
          totalQuotations,
          totalValue,
          latestQuotationDate,
        };
      });

      const cards = await Promise.all(cardsPromises);
      setCustomerCards(cards);
    } catch (error: any) {
      console.error("Error loading customer cards:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const linkSubCustomer = async (
    subCustomerId: string,
    mainCustomerId: string,
    relationshipNotes: string
  ) => {
    // Validation: Check if sub-customer has existing sub-customers
    const { count } = await supabase
      .from("yutong_customers")
      .select("id", { count: "exact", head: true })
      .eq("parent_customer_id", subCustomerId);

    if (count && count > 0) {
      throw new Error("Cannot link a customer that has sub-customers");
    }

    // Validation: Check for circular reference
    if (subCustomerId === mainCustomerId) {
      throw new Error("Cannot link a customer to itself");
    }

    // Check if main customer is itself a sub-customer
    const { data: mainCustomer } = await supabase
      .from("yutong_customers")
      .select("parent_customer_id")
      .eq("id", mainCustomerId)
      .single();

    if (mainCustomer?.parent_customer_id) {
      throw new Error("Cannot link to a customer that is itself a sub-customer");
    }

    // Update the sub-customer
    const { error } = await supabase
      .from("yutong_customers")
      .update({
        parent_customer_id: mainCustomerId,
        is_main_customer: false,
        relationship_notes: relationshipNotes,
      })
      .eq("id", subCustomerId);

    if (error) throw error;
  };

  const unlinkSubCustomer = async (subCustomerId: string) => {
    const { error } = await supabase
      .from("yutong_customers")
      .update({
        parent_customer_id: null,
        is_main_customer: true,
        relationship_notes: null,
      })
      .eq("id", subCustomerId);

    if (error) throw error;
  };

  return {
    customerCards,
    loading,
    loadCustomerCards,
    linkSubCustomer,
    unlinkSubCustomer,
  };
}
