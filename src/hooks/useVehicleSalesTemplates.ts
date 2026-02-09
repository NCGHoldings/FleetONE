import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleSalesTemplate {
  id: string;
  template_name: string;
  template_code: string | null;
  html_content: string;
  header_image_url: string | null;
  header_mode: 'header_image' | 'logo_only' | 'html_only' | 'logo_and_html' | null;
  footer_text: string | null;
  css_styles: string | null;
  is_default: boolean;
  is_active: boolean;
  company_id: string;
  template_type_id: string;
  companies: {
    id: string;
    name: string;
    short_code: string | null;
  } | null;
  document_template_types: {
    id: string;
    type_code: string;
    type_name: string;
    module: string;
  } | null;
}

// Fetch templates for vehicle sales modules
export const useVehicleSalesTemplates = (module: 'yutong_sales' | 'sinotruck_sales' | 'light_vehicle_sales', templateType?: string) => {
  return useQuery({
    queryKey: ["vehicle-sales-templates", module, templateType],
    queryFn: async () => {
      let query = supabase
        .from("document_templates")
        .select(`
          *,
          companies(id, name, short_code),
          document_template_types!inner(id, type_code, type_name, module)
        `)
        .eq("document_template_types.module", module)
        .eq("is_active", true)
        .order("is_default", { ascending: false });

      if (templateType) {
        query = query.eq("document_template_types.type_code", templateType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VehicleSalesTemplate[];
    },
  });
};

// Fetch a specific template by type code and company
export const useVehicleSalesTemplateByType = (typeCode: string, companyId?: string) => {
  return useQuery({
    queryKey: ["vehicle-sales-template", typeCode, companyId],
    queryFn: async () => {
      let query = supabase
        .from("document_templates")
        .select(`
          *,
          companies(id, name, short_code),
          document_template_types!inner(id, type_code, type_name, module)
        `)
        .eq("document_template_types.type_code", typeCode)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1);

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data?.[0] as VehicleSalesTemplate | null;
    },
    enabled: !!typeCode,
  });
};

// Get the default template for a specific vehicle sales document type
export const useDefaultVehicleSalesTemplate = (typeCode: string) => {
  return useQuery({
    queryKey: ["default-vehicle-sales-template", typeCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select(`
          *,
          companies(id, name, short_code),
          document_template_types!inner(id, type_code, type_name, module)
        `)
        .eq("document_template_types.type_code", typeCode)
        .eq("is_active", true)
        .eq("is_default", true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as VehicleSalesTemplate | null;
    },
    enabled: !!typeCode,
  });
};

// Helper to get header image URL from template or fallback
export function getTemplateHeaderUrl(
  template: VehicleSalesTemplate | null | undefined,
  fallbackUrl: string
): string {
  if (!template) return fallbackUrl;
  
  const headerMode = template.header_mode || 'header_image';
  
  if (headerMode === 'header_image' && template.header_image_url) {
    return template.header_image_url;
  }
  
  return fallbackUrl;
}

// Helper to determine if template uses custom header
export function templateUsesCustomHeader(
  template: VehicleSalesTemplate | null | undefined
): boolean {
  return !!template?.header_image_url && template?.header_mode === 'header_image';
}
