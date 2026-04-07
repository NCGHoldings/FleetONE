import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import type { ParsedDocumentSection } from '@/utils/documentTemplateParser';
import { parseHTMLDocumentTemplate, parsedSectionsToTopics } from '@/utils/htmlDocumentTemplateParser';

export interface DocumentTemplate {
  id: string;
  document_type_code: string;
  template_code: string;
  template_name: string;
  html_template: string;
  html_content?: string;
  header_image_url?: string;
  header_mode?: HeaderMode;
  footer_text?: string;
  css_styles?: string;
  paper_size?: string;
  orientation?: string;
  margins?: Record<string, number>;
  is_default?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  version?: number;
  company_id?: string;
  template_type_id?: string;
  default_workflow_id?: string;
  companies?: { name: string; short_code?: string } | null;
  document_template_types?: { type_name: string; type_code: string; module?: string } | null;
  section_mappings: {
    sections: ParsedDocumentSection[];
    systemPlaceholders: string[];
    hasHierarchicalNumbering: boolean;
  };
}

export type HeaderMode = 'header_image' | 'logo_only' | 'html_only' | 'logo_and_html';

export function useDocumentTemplates(documentTypeCode?: string) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast: uiToast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('document_type_code', { ascending: true });

      if (documentTypeCode) {
        query = query.eq('document_type_code', documentTypeCode);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const parsedTemplates = (data || []).map((template: any) => {
        if (template.html_template) {
          const parsed = parseHTMLDocumentTemplate(template.html_template);
          const topics = parsedSectionsToTopics(parsed.sections, template.document_type_code);
          
          return {
            ...template,
            parsed_topics: topics,
            parsed_sections: parsed.sections,
            section_mappings: {
              sections: parsed.sections,
              systemPlaceholders: parsed.systemPlaceholders,
              hasHierarchicalNumbering: parsed.hasHierarchicalNumbering
            }
          };
        }
        return template;
      });
      
      setTemplates(parsedTemplates);
    } catch (error: any) {
      uiToast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [documentTypeCode]);

  return {
    templates,
    loading,
    refetch: fetchTemplates
  };
}

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

// Header mode re-exported from interface above
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
      header_mode?: HeaderMode;
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
      header_mode?: HeaderMode;
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
