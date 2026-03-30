import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QuotationCardData {
  customerName: string;
  companyName: string | null;
  quotationCount: number;
  totalValue: number;
  latestQuotationDate: string | null;
  subCustomerNames: string[];
}

export function useSinotrukQuotationCards() {
  const [cards, setCards] = useState<QuotationCardData[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCards = async () => {
    try {
      setLoading(true);

      // Fetch all quotations with their customer names
      const { data: quotations, error } = await supabase
        .from("sinotruck_quotations")
        .select("customer_name, company_name, total_price, created_at, is_sub_customer, main_customer_name")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group quotations by customer name
      const groupedData: { [key: string]: any } = {};

      quotations?.forEach((q) => {
        // Determine the main customer name for this quotation
        const mainName = q.is_sub_customer && q.main_customer_name 
          ? q.main_customer_name 
          : q.customer_name;

        if (!groupedData[mainName]) {
          groupedData[mainName] = {
            customerName: mainName,
            companyName: q.company_name,
            directQuotations: [],
            subCustomers: new Set<string>(),
          };
        }

        // Add to direct quotations or track sub-customer
        if (q.customer_name === mainName) {
          groupedData[mainName].directQuotations.push(q);
        } else {
          groupedData[mainName].subCustomers.add(q.customer_name);
          groupedData[mainName].directQuotations.push(q); // Include sub-customer quotations in total
        }
      });

      // Convert to card format
      const cardData: QuotationCardData[] = Object.values(groupedData).map((group) => {
        const allQuotations = group.directQuotations;
        
        return {
          customerName: group.customerName,
          companyName: group.companyName,
          quotationCount: allQuotations.length,
          totalValue: allQuotations.reduce((sum: number, q: any) => sum + (q.total_price || 0), 0),
          latestQuotationDate: allQuotations.length > 0 
            ? allQuotations.reduce((latest: string, q: any) => 
                new Date(q.created_at) > new Date(latest) ? q.created_at : latest
              , allQuotations[0].created_at)
            : null,
          subCustomerNames: Array.from(group.subCustomers),
        };
      });

      setCards(cardData.sort((a, b) => b.totalValue - a.totalValue));
    } catch (error: any) {
      console.error("Error loading customer cards:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const linkSubCustomer = async (
    subCustomerName: string,
    mainCustomerName: string,
    notes: string
  ) => {
    // Validation
    if (subCustomerName === mainCustomerName) {
      throw new Error("Cannot link a customer to itself");
    }

    // Check if sub-customer is already a main customer for others
    const { data: existingMain } = await supabase
      .from("sinotruck_quotations")
      .select("id")
      .eq("main_customer_name", subCustomerName)
      .eq("is_sub_customer", true)
      .limit(1);

    if (existingMain && existingMain.length > 0) {
      throw new Error("This customer is already a main customer and cannot be linked as a sub-customer");
    }

    // Update all quotations with this customer name
    const { error } = await supabase
      .from("sinotruck_quotations")
      .update({
        main_customer_name: mainCustomerName,
        is_sub_customer: true,
        relationship_notes: notes,
      })
      .eq("customer_name", subCustomerName);

    if (error) throw error;
  };

  const unlinkSubCustomer = async (subCustomerName: string) => {
    const { error } = await supabase
      .from("sinotruck_quotations")
      .update({
        main_customer_name: null,
        is_sub_customer: false,
        relationship_notes: null,
      })
      .eq("customer_name", subCustomerName);

    if (error) throw error;
  };

  return {
    cards,
    loading,
    loadCards,
    linkSubCustomer,
    unlinkSubCustomer,
  };
}
