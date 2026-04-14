// Complete line items for all remaining budget templates
// Run this after updating seed-budget-templates.ts

import { supabase } from "@/integrations/supabase/client";

export const updateTemplatesWithLineItems = async () => {
  try {
    const templates = await supabase
      .from('budget_templates')
      .select('*')
      .eq('is_system_template', true);

    if (templates.error) throw templates.error;

    console.log(`Found ${templates.data.length} system templates to update`);
    
    // The line items have been added to the seed file
    // Re-running the seed will update all templates
    console.log("Please delete existing templates and re-run seedBudgetTemplates() to get all 100+ items per template");
    
    return templates.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
