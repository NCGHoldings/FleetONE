import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  useDocumentTemplateTypes, 
  useDocumentTemplates, 
  useDeleteDocumentTemplate 
} from "@/hooks/useDocumentTemplates";
import { DocumentTemplateEditor } from "./DocumentTemplateEditor";
import { Plus, FileText, Pencil, Trash2, Eye, Copy } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const DocumentTemplateManager = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: templateTypes } = useDocumentTemplateTypes();
  const { data: templates, isLoading } = useDocumentTemplates(
    selectedCompanyId === "all" ? undefined : selectedCompanyId,
    selectedTypeId === "all" ? undefined : selectedTypeId
  );
  const deleteTemplate = useDeleteDocumentTemplate();

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const openEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteTemplate.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const getModuleBadgeColor = (module: string) => {
    const colors: Record<string, string> = {
      ar: "bg-green-100 text-green-800",
      ap: "bg-orange-100 text-orange-800",
      gl: "bg-blue-100 text-blue-800",
      banking: "bg-purple-100 text-purple-800",
      inventory: "bg-yellow-100 text-yellow-800",
      tax: "bg-red-100 text-red-800",
    };
    return colors[module] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Document Templates</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage HTML templates for invoices, receipts, vouchers, and other documents
          </p>
        </div>
        <Button onClick={openNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Filter by Company</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name} {company.short_code && `(${company.short_code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Filter by Document Type</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Document Types</SelectItem>
                {templateTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{template.template_name}</h3>
                      {template.template_code && (
                        <code className="text-xs text-muted-foreground">{template.template_code}</code>
                      )}
                    </div>
                  </div>
                  {template.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={getModuleBadgeColor(template.document_template_types?.module || "")}>
                    {template.document_template_types?.type_name || "Unknown"}
                  </Badge>
                  <Badge variant="outline">
                    {template.companies?.short_code || template.companies?.name || "No Company"}
                  </Badge>
                </div>

                {template.header_image_url && (
                  <div className="h-16 bg-muted rounded overflow-hidden">
                    <img 
                      src={template.header_image_url} 
                      alt="Header" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p>Version {template.version} • Updated {format(new Date(template.updated_at), "MMM dd, yyyy")}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEditTemplate(template)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDeleteConfirmId(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No Templates Found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCompanyId !== "all" || selectedTypeId !== "all"
              ? "No templates match the selected filters. Try adjusting your filters or create a new template."
              : "Create your first document template to get started."
            }
          </p>
          <Button onClick={openNewTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      )}

      {/* Template Editor Dialog */}
      <DocumentTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        companies={companies || []}
        templateTypes={templateTypes || []}
      />

      {/* Preview Dialog */}
      {previewTemplate && (
        <AlertDialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Template Preview: {previewTemplate.template_name}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="border rounded-lg p-4 bg-white min-h-[400px]">
              {previewTemplate.header_image_url && (
                <div className="mb-4">
                  <img 
                    src={previewTemplate.header_image_url} 
                    alt="Header" 
                    className="max-h-24 object-contain"
                  />
                </div>
              )}
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: previewTemplate.html_content || "<p>No content</p>" 
                }}
              />
              {previewTemplate.footer_text && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  {previewTemplate.footer_text}
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
