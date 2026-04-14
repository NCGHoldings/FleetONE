import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

// ============ Inspection Templates ============
export const useInspectionTemplates = (inspectionType?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["inspection-templates", inspectionType, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("inspection_templates")
        .select("*")
        .eq("is_active", true)
        .order("template_name");
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      if (inspectionType) {
        query = query.eq("inspection_type", inspectionType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useInspectionTemplateCriteria = (templateId: string) => {
  return useQuery({
    queryKey: ["inspection-template-criteria", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_template_criteria")
        .select("*")
        .eq("template_id", templateId)
        .order("sequence");
      
      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
};

export const useCreateInspectionTemplate = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (template: {
      template_name: string;
      template_code?: string;
      inspection_type: "incoming" | "outgoing" | "in_process";
      applicable_to?: string;
      criteria: {
        criteria_name: string;
        criteria_type: "pass_fail" | "numeric" | "text";
        acceptance_criteria?: string;
        min_value?: number;
        max_value?: number;
        is_mandatory: boolean;
        sequence: number;
      }[];
    }) => {
      const { criteria, ...templateData } = template;
      
      const { data: newTemplate, error: templateError } = await supabase
        .from("inspection_templates")
        .insert({
          ...templateData,
          company_id: selectedCompanyId,
        })
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      const templateCriteria = criteria.map(c => ({
        template_id: newTemplate.id,
        criteria_name: c.criteria_name,
        criteria_type: c.criteria_type,
        acceptance_criteria: c.acceptance_criteria,
        min_value: c.min_value,
        max_value: c.max_value,
        is_mandatory: c.is_mandatory,
        sequence: c.sequence,
      }));
      
      const { error: criteriaError } = await supabase
        .from("inspection_template_criteria")
        .insert(templateCriteria);
      
      if (criteriaError) throw criteriaError;
      
      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      toast({ title: "Inspection template created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });
};

// ============ Quality Inspections ============
export const useQualityInspections = (status?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["quality-inspections", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("quality_inspections")
        .select(`
          *,
          inspection_templates (
            template_name,
            inspection_type
          ),
          items (
            item_code,
            item_name
          )
        `)
        .order("inspection_date", { ascending: false });
      
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

export const useQualityInspectionReadings = (inspectionId: string) => {
  return useQuery({
    queryKey: ["quality-inspection-readings", inspectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_inspection_readings")
        .select(`
          *,
          inspection_template_criteria (
            criteria_name,
            criteria_type,
            acceptance_criteria,
            min_value,
            max_value,
            is_mandatory
          )
        `)
        .eq("inspection_id", inspectionId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!inspectionId,
  });
};

export const useCreateQualityInspection = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (inspection: {
      inspection_number: string;
      template_id: string;
      reference_type?: "grn" | "delivery_note" | "production";
      reference_id?: string;
      item_id: string;
      inspection_date: string;
      inspected_qty: number;
      notes?: string;
    }) => {
      const { data: newInspection, error: inspectionError } = await supabase
        .from("quality_inspections")
        .insert({
          ...inspection,
          company_id: selectedCompanyId,
          status: "pending",
          accepted_qty: 0,
          rejected_qty: 0,
        })
        .select()
        .single();
      
      if (inspectionError) throw inspectionError;
      
      // Get template criteria and create readings
      const { data: criteria } = await supabase
        .from("inspection_template_criteria")
        .select("*")
        .eq("template_id", inspection.template_id)
        .order("sequence");
      
      if (criteria && criteria.length > 0) {
        const readings = criteria.map(c => ({
          inspection_id: newInspection.id,
          criteria_id: c.id,
          status: "pending",
        }));
        
        await supabase
          .from("quality_inspection_readings")
          .insert(readings);
      }
      
      return newInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
      toast({ title: "Quality inspection created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create inspection", description: error.message, variant: "destructive" });
    },
  });
};

export const useCompleteInspection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      inspectionId, 
      readings,
      accepted_qty,
      rejected_qty,
    }: { 
      inspectionId: string;
      readings: { id: string; reading_value?: string; numeric_value?: number; status: "passed" | "failed"; remarks?: string }[];
      accepted_qty: number;
      rejected_qty: number;
    }) => {
      // Update readings
      for (const reading of readings) {
        await supabase
          .from("quality_inspection_readings")
          .update({
            reading_value: reading.reading_value,
            numeric_value: reading.numeric_value,
            status: reading.status,
            remarks: reading.remarks,
          })
          .eq("id", reading.id);
      }
      
      // Determine overall status
      const hasFailed = readings.some(r => r.status === "failed");
      const status = hasFailed ? "failed" : "passed";
      
      // Update inspection
      await supabase
        .from("quality_inspections")
        .update({
          status,
          accepted_qty,
          rejected_qty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inspectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["quality-inspection-readings"] });
      toast({ title: "Inspection completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete inspection", description: error.message, variant: "destructive" });
    },
  });
};
