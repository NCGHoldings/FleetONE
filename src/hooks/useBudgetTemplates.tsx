import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BudgetTemplate {
  id: string;
  template_name: string;
  industry_type: string;
  description?: string;
  template_structure: any;
  is_system_template: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export const useBudgetTemplates = () => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async (industryType?: string) => {
    try {
      let query = supabase
        .from("budget_templates")
        .select("*")
        .eq("is_active", true)
        .order("template_name");

      if (industryType) {
        query = query.eq("industry_type", industryType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BudgetTemplate[];
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
      throw error;
    }
  };

  const getTemplateById = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from("budget_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data as BudgetTemplate;
    } catch (error: any) {
      console.error("Error fetching template:", error);
      toast.error("Failed to fetch template");
      throw error;
    }
  };

  const createCustomTemplate = async (templateData: Partial<BudgetTemplate>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("budget_templates")
        .insert([{
          ...templateData,
          is_system_template: false,
          created_by: user?.id,
        }] as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Template created successfully");
      return data;
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchTemplates,
    getTemplateById,
    createCustomTemplate,
    isLoading,
  };
};
