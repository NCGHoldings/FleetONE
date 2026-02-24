import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { TemplateInitializerButton } from "./TemplateInitializerButton";
import { Plus, FileText, Pencil, Trash2, Eye } from "lucide-react";
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
  const queryClient = useQueryClient();
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
  const { data: templates, isLoading, refetch } = useDocumentTemplates(
    selectedCompanyId === "all" ? undefined : selectedCompanyId,
    selectedTypeId === "all" ? undefined : selectedTypeId
  );
  const deleteTemplate = useDeleteDocumentTemplate();
  
  const handleTemplatesInitialized = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["document-templates"] });
  };

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

  // Render preview with placeholder replacement
  const renderPreview = (template: any): string => {
    let html = template.html_content || "<p>No content</p>";
    
    // Get company info for placeholders
    const company = companies?.find((c) => c.id === template.company_id);
    const headerMode = template.header_mode || 'logo_and_html';
    
    // Generate header/logo placeholders based on header mode
    let logoPlaceholder = '';
    let headerPlaceholder = '';
    
    switch (headerMode) {
      case 'header_image':
        headerPlaceholder = template.header_image_url 
          ? `<div class="full-header-image" style="width: 100%; margin-bottom: 10px;"><img src="${template.header_image_url}" style="width: 100%; max-height: 150px; object-fit: contain; display: block;" alt="Document Header" /></div>`
          : '';
        logoPlaceholder = '';
        break;
      case 'logo_only':
        logoPlaceholder = template.header_image_url 
          ? `<img src="${template.header_image_url}" style="max-height: 100px; display: block; margin: 0 auto;" alt="Company Logo" />`
          : '';
        headerPlaceholder = '';
        break;
      case 'html_only':
        logoPlaceholder = '';
        headerPlaceholder = '';
        break;
      case 'logo_and_html':
      default:
        logoPlaceholder = template.header_image_url 
          ? `<img src="${template.header_image_url}" style="max-height: 80px; max-width: 200px; object-fit: contain;" alt="Company Logo" />` 
          : '';
        headerPlaceholder = '';
        break;
    }
    
    // Sample data for preview - replace placeholders with realistic data
    const sampleData: Record<string, string> = {
      "{{invoice_number}}": "INV-2024-0001",
      "{{invoice_date}}": "January 15, 2024",
      "{{due_date}}": "February 14, 2024",
      "{{customer_name}}": "Sample Customer Ltd.",
      "{{customer_address}}": "123 Customer Street, Colombo 01",
      "{{customer_phone}}": "+94 11 234 5678",
      "{{customer_email}}": "customer@example.com",
      "{{vendor_name}}": "Sample Vendor Ltd.",
      "{{vendor_address}}": "456 Vendor Road, Colombo 02",
      "{{vendor_phone}}": "+94 11 987 6543",
      "{{vendor_email}}": "vendor@example.com",
      "{{company_name}}": company?.name || "Your Company Name",
      "{{company_address}}": company?.address || "Company Address",
      "{{company_phone}}": company?.phone || "+94 11 234 5678",
      "{{company_email}}": company?.email || "info@company.com",
      "{{company_logo}}": logoPlaceholder,
      "{{document_header}}": headerPlaceholder,
      "{{receipt_number}}": "RCV-2024-0001",
      "{{receipt_date}}": "January 20, 2024",
      "{{payment_number}}": "PAY-2024-0001",
      "{{payment_date}}": "January 20, 2024",
      "{{payment_method}}": "Bank Transfer",
      "{{reference}}": "REF-123456",
      "{{subtotal}}": "LKR 100,000.00",
      "{{tax_amount}}": "LKR 8,000.00",
      "{{discount_amount}}": "LKR 5,000.00",
      "{{wht_amount}}": "LKR 2,000.00",
      "{{total_amount}}": "LKR 101,000.00",
      "{{amount_in_words}}": "One Hundred and One Thousand Rupees Only",
      "{{balance}}": "LKR 0.00",
      "{{paid_amount}}": "LKR 101,000.00",
      "{{notes}}": "Thank you for your business!",
      "{{terms}}": "Payment is due within 30 days of invoice date.",
      "{{current_date}}": format(new Date(), "MMMM dd, yyyy"),
      "{{line_items}}": `
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">Qty</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Unit Price</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">Professional Services - Consulting</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">10</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">LKR 5,000.00</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">LKR 50,000.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">Software License - Annual</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">1</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">LKR 50,000.00</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">LKR 50,000.00</td>
            </tr>
          </tbody>
        </table>
      `,
    };

    // Replace all placeholders with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      const escapedKey = key.replace(/[{}]/g, "\\$&");
      html = html.replace(new RegExp(escapedKey, "g"), value);
    });

    return html;
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
        <div className="flex gap-2">
          {companies && templateTypes && (
            <TemplateInitializerButton
              companies={companies}
              templateTypes={templateTypes}
              onComplete={handleTemplatesInitialized}
            />
          )}
          <Button onClick={openNewTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
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
                  {template.header_mode && template.header_mode !== 'logo_and_html' && (
                    <Badge variant="secondary" className="text-xs">
                      {template.header_mode === 'header_image' ? 'Full Banner' : 
                       template.header_mode === 'logo_only' ? 'Logo Only' : 'Text Only'}
                    </Badge>
                  )}
                </div>

                {template.header_image_url && template.header_mode !== 'html_only' && (
                  <div className={`bg-muted rounded overflow-hidden ${template.header_mode === 'header_image' ? 'h-20' : 'h-16'}`}>
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

      {/* Preview Dialog - Using iframe for proper HTML rendering */}
      {previewTemplate && (
        <AlertDialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh]">
            <AlertDialogHeader>
              <AlertDialogTitle>Template Preview: {previewTemplate.template_name}</AlertDialogTitle>
              <AlertDialogDescription>
                Preview with sample data - placeholders are replaced with example values
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="border rounded-lg bg-white overflow-hidden">
              <iframe
                srcDoc={renderPreview(previewTemplate)}
                className="w-full min-h-[500px] border-0"
                title="Template Preview"
                sandbox="allow-same-origin"
              />
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