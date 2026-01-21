import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fetch all document template types
export const useDocumentTemplateTypes = () => {
  return useQuery({
    queryKey: ["document-template-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_template_types")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
  });
};

// Fetch templates for a specific company and/or type
export const useDocumentTemplates = (companyId?: string, typeId?: string) => {
  return useQuery({
    queryKey: ["document-templates", companyId, typeId],
    queryFn: async () => {
      let query = supabase
        .from("document_templates")
        .select(`
          *,
          companies(id, name, short_code),
          document_template_types(id, type_code, type_name, module, available_placeholders)
        `)
        .order("created_at", { ascending: false });
      
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      if (typeId) {
        query = query.eq("template_type_id", typeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
};

// Create a new template
export const useCreateDocumentTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: {
      company_id: string;
      template_type_id: string;
      template_name: string;
      template_code?: string;
      html_content: string;
      header_image_url?: string;
      footer_text?: string;
      css_styles?: string;
      paper_size?: string;
      orientation?: string;
      margins?: Record<string, number>;
      is_default?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("document_templates")
        .insert([template])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create template");
    },
  });
};

// Update an existing template
export const useUpdateDocumentTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      template_name?: string;
      template_code?: string;
      html_content?: string;
      header_image_url?: string;
      footer_text?: string;
      css_styles?: string;
      paper_size?: string;
      orientation?: string;
      margins?: Record<string, number>;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("document_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update template");
    },
  });
};

// Delete a template
export const useDeleteDocumentTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });
};

// Upload header image
export const useUploadHeaderImage = () => {
  return useMutation({
    mutationFn: async ({ file, companyId }: { file: File; companyId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("document-headers")
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from("document-headers")
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload image");
    },
  });
};
