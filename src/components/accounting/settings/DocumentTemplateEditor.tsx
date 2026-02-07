import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateDocumentTemplate, useUpdateDocumentTemplate, useUploadHeaderImage, HeaderMode } from "@/hooks/useDocumentTemplates";
import { Upload, Code, Eye, Copy, X, Info, Image, FileText, Type, Layout } from "lucide-react";
import { toast } from "sonner";

interface DocumentTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  companies: any[];
  templateTypes: any[];
}

const defaultHtmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header img { max-height: 80px; }
    .document-title { font-size: 24px; font-weight: bold; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .info-item { padding: 5px 0; }
    .info-label { font-weight: bold; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #f5f5f5; }
    .totals { text-align: right; margin-top: 20px; }
    .totals-row { display: flex; justify-content: flex-end; gap: 20px; padding: 5px 0; }
    .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
    .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
    .signature-line { border-top: 1px solid #333; padding-top: 5px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    {{company_logo}}
    <h1>{{company_name}}</h1>
    <p>{{company_address}}</p>
    <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
  </div>

  <div class="document-title">INVOICE</div>

  <div class="info-grid">
    <div class="info-item">
      <span class="info-label">Invoice No:</span> {{invoice_number}}
    </div>
    <div class="info-item">
      <span class="info-label">Date:</span> {{invoice_date}}
    </div>
    <div class="info-item">
      <span class="info-label">Customer:</span> {{customer_name}}
    </div>
    <div class="info-item">
      <span class="info-label">Due Date:</span> {{due_date}}
    </div>
  </div>

  {{line_items}}

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div class="totals-row">
      <span>Tax:</span>
      <span>{{tax_amount}}</span>
    </div>
    <div class="totals-row grand-total">
      <span>Total:</span>
      <span>{{total_amount}}</span>
    </div>
  </div>

  <div class="signature-area">
    <div>
      <div class="signature-line">Prepared By</div>
    </div>
    <div>
      <div class="signature-line">Authorized Signature</div>
    </div>
  </div>

  <div class="footer">
    {{notes}}
  </div>
</body>
</html>`;

export const DocumentTemplateEditor = ({
  open,
  onOpenChange,
  template,
  companies,
  templateTypes,
}: DocumentTemplateEditorProps) => {
  const [formData, setFormData] = useState({
    company_id: "",
    template_type_id: "",
    template_name: "",
    template_code: "",
    html_content: defaultHtmlTemplate,
    header_image_url: "",
    header_mode: "logo_and_html" as HeaderMode,
    footer_text: "",
    paper_size: "A4",
    orientation: "portrait",
    is_default: false,
  });
  const [activeTab, setActiveTab] = useState("editor");
  const [selectedPlaceholders, setSelectedPlaceholders] = useState<string[]>([]);

  const createTemplate = useCreateDocumentTemplate();
  const updateTemplate = useUpdateDocumentTemplate();
  const uploadImage = useUploadHeaderImage();

  useEffect(() => {
    if (template) {
      setFormData({
        company_id: template.company_id || "",
        template_type_id: template.template_type_id || "",
        template_name: template.template_name || "",
        template_code: template.template_code || "",
        html_content: template.html_content || defaultHtmlTemplate,
        header_image_url: template.header_image_url || "",
        header_mode: (template.header_mode as HeaderMode) || "logo_and_html",
        footer_text: template.footer_text || "",
        paper_size: template.paper_size || "A4",
        orientation: template.orientation || "portrait",
        is_default: template.is_default || false,
      });
    } else {
      setFormData({
        company_id: companies[0]?.id || "",
        template_type_id: templateTypes[0]?.id || "",
        template_name: "",
        template_code: "",
        html_content: defaultHtmlTemplate,
        header_image_url: "",
        header_mode: "logo_and_html",
        footer_text: "",
        paper_size: "A4",
        orientation: "portrait",
        is_default: false,
      });
    }
  }, [template, companies, templateTypes, open]);

  useEffect(() => {
    const selectedType = templateTypes.find((t) => t.id === formData.template_type_id);
    if (selectedType?.available_placeholders) {
      setSelectedPlaceholders(selectedType.available_placeholders);
    }
  }, [formData.template_type_id, templateTypes]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.company_id) {
      toast.error("Please select a company first");
      return;
    }

    try {
      const url = await uploadImage.mutateAsync({ file, companyId: formData.company_id });
      setFormData((prev) => ({ ...prev, header_image_url: url }));
      toast.success("Header image uploaded");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById("html-editor") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = formData.html_content;
      const newContent = content.substring(0, start) + placeholder + content.substring(end);
      setFormData((prev) => ({ ...prev, html_content: newContent }));
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  const copyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    toast.success(`Copied: ${placeholder}`);
  };

  const handleSave = async () => {
    if (!formData.company_id || !formData.template_type_id || !formData.template_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (template) {
        await updateTemplate.mutateAsync({ id: template.id, ...formData });
      } else {
        await createTemplate.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const renderPreview = () => {
    let html = formData.html_content;
    
    // Generate header/logo placeholders based on header mode
    let logoPlaceholder = '';
    let headerPlaceholder = '';
    
    switch (formData.header_mode) {
      case 'header_image':
        headerPlaceholder = formData.header_image_url 
          ? `<div class="full-header-image" style="width: 100%; margin-bottom: 10px;"><img src="${formData.header_image_url}" style="width: 100%; max-height: 150px; object-fit: contain; display: block;" alt="Document Header" /></div>`
          : '';
        logoPlaceholder = '';
        break;
      case 'logo_only':
        logoPlaceholder = formData.header_image_url 
          ? `<img src="${formData.header_image_url}" style="max-height: 100px; display: block; margin: 0 auto;" alt="Company Logo" />`
          : '';
        headerPlaceholder = '';
        break;
      case 'html_only':
        logoPlaceholder = '';
        headerPlaceholder = '';
        break;
      case 'logo_and_html':
      default:
        logoPlaceholder = formData.header_image_url 
          ? `<img src="${formData.header_image_url}" style="max-height: 80px; max-width: 200px; object-fit: contain;" alt="Company Logo" />` 
          : '';
        headerPlaceholder = '';
        break;
    }
    
    // Replace placeholders with sample data
    const sampleData: Record<string, string> = {
      "{{invoice_number}}": "INV-2024-0001",
      "{{invoice_date}}": "January 15, 2024",
      "{{due_date}}": "February 14, 2024",
      "{{customer_name}}": "Sample Customer Ltd.",
      "{{customer_code}}": "CUST-001",
      "{{customer_address}}": "123 Sample Street, Colombo 03",
      "{{company_name}}": companies.find((c) => c.id === formData.company_id)?.name || "Your Company",
      "{{company_address}}": "Company Address Here",
      "{{company_phone}}": "+94 11 234 5678",
      "{{company_email}}": "info@company.com",
      "{{company_logo}}": logoPlaceholder,
      "{{document_header}}": headerPlaceholder,
      "{{subtotal}}": "LKR 100,000.00",
      "{{tax_amount}}": "LKR 8,000.00",
      "{{discount_amount}}": "LKR 0.00",
      "{{total_amount}}": "LKR 108,000.00",
      "{{balance}}": "LKR 108,000.00",
      "{{notes}}": "Thank you for your business!",
      "{{prepared_by}}": "John Doe",
      "{{line_items}}": `
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sample Product A</td>
              <td>2</td>
              <td>LKR 25,000.00</td>
              <td>LKR 50,000.00</td>
            </tr>
            <tr>
              <td>Sample Service B</td>
              <td>1</td>
              <td>LKR 50,000.00</td>
              <td>LKR 50,000.00</td>
            </tr>
          </tbody>
        </table>
      `,
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    });

    return html;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create New Template"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, company_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select
                  value={formData.template_type_id}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, template_type_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template_name: e.target.value }))}
                  placeholder="Standard Invoice"
                />
              </div>

              <div className="space-y-2">
                <Label>Template Code</Label>
                <Input
                  value={formData.template_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template_code: e.target.value.toUpperCase() }))}
                  placeholder="STD-INV-01"
                />
              </div>
            </div>

            {/* Header Configuration */}
            <Card className="p-4 space-y-4">
              <div>
                <Label className="text-base font-semibold">Header Configuration</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose how the document header should display
                </p>
              </div>

              {/* Header Display Mode */}
              <div className="space-y-3">
                <Label>Header Display Mode</Label>
                <RadioGroup 
                  value={formData.header_mode} 
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, header_mode: val as HeaderMode }))}
                  className="grid grid-cols-2 gap-3"
                >
                  {/* Full Header Image */}
                  <div className="relative">
                    <RadioGroupItem value="header_image" id="header_image" className="peer sr-only" />
                    <Label
                      htmlFor="header_image"
                      className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                    >
                      <div className="w-full h-8 bg-gradient-to-r from-primary/30 to-primary/10 rounded flex items-center justify-center">
                        <Image className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">Full Header Image</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Full-width banner with embedded logos/title
                      </span>
                    </Label>
                  </div>

                  {/* Logo + Company Info */}
                  <div className="relative">
                    <RadioGroupItem value="logo_and_html" id="logo_and_html" className="peer sr-only" />
                    <Label
                      htmlFor="logo_and_html"
                      className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                    >
                      <div className="w-full h-8 flex items-center gap-2">
                        <div className="w-8 h-6 bg-primary/20 rounded flex items-center justify-center">
                          <Layout className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="h-2 bg-muted-foreground/20 rounded w-3/4"></div>
                          <div className="h-1.5 bg-muted-foreground/10 rounded w-1/2"></div>
                        </div>
                      </div>
                      <span className="font-medium text-sm">Logo + Company Info</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Logo on left, company details on right
                      </span>
                    </Label>
                  </div>

                  {/* Logo Only */}
                  <div className="relative">
                    <RadioGroupItem value="logo_only" id="logo_only" className="peer sr-only" />
                    <Label
                      htmlFor="logo_only"
                      className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                    >
                      <div className="w-full h-8 flex items-center justify-center">
                        <div className="w-12 h-6 bg-primary/20 rounded flex items-center justify-center">
                          <Image className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                      <span className="font-medium text-sm">Logo Only</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Centered logo, no company text
                      </span>
                    </Label>
                  </div>

                  {/* HTML/Text Only */}
                  <div className="relative">
                    <RadioGroupItem value="html_only" id="html_only" className="peer sr-only" />
                    <Label
                      htmlFor="html_only"
                      className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                    >
                      <div className="w-full h-8 flex flex-col items-center justify-center gap-1">
                        <div className="h-2 bg-muted-foreground/30 rounded w-1/2"></div>
                        <div className="h-1.5 bg-muted-foreground/15 rounded w-3/4"></div>
                      </div>
                      <span className="font-medium text-sm">Text Only</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Company info from template HTML
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Header Image Upload - shown for all modes except html_only */}
              {formData.header_mode !== 'html_only' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>
                    {formData.header_mode === 'header_image' ? 'Header Banner Image' : 'Company Logo'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {formData.header_mode === 'header_image' 
                      ? 'Upload a pre-designed banner with document title, company name, and logos embedded'
                      : 'Upload your company logo to display in the document header'
                    }
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {formData.header_image_url ? (
                      <div className="relative h-16 flex-shrink-0 bg-muted rounded overflow-hidden" style={{ width: formData.header_mode === 'header_image' ? '240px' : '120px' }}>
                        <img
                          src={formData.header_image_url}
                          alt="Header"
                          className="h-full w-full object-contain"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setFormData((prev) => ({ ...prev, header_image_url: "" }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm" style={{ width: formData.header_mode === 'header_image' ? '240px' : '120px' }}>
                        No image uploaded
                      </div>
                    )}
                    <div>
                      <Label htmlFor="header-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </div>
                      </Label>
                      <input
                        id="header-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={!formData.company_id}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode-specific tips */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-muted-foreground">
                    {formData.header_mode === 'header_image' && (
                      <span>Use <code className="bg-muted px-1 rounded">{'{{document_header}}'}</code> in your template to place the full-width banner. The <code className="bg-muted px-1 rounded">{'{{company_logo}}'}</code> will be empty in this mode.</span>
                    )}
                    {formData.header_mode === 'logo_and_html' && (
                      <span>Use <code className="bg-muted px-1 rounded">{'{{company_logo}}'}</code> to place the logo. Combine with <code className="bg-muted px-1 rounded">{'{{company_name}}'}</code>, <code className="bg-muted px-1 rounded">{'{{company_address}}'}</code> etc. for company details.</span>
                    )}
                    {formData.header_mode === 'logo_only' && (
                      <span>Use <code className="bg-muted px-1 rounded">{'{{company_logo}}'}</code> to place the centered logo. It will automatically be displayed without company text.</span>
                    )}
                    {formData.header_mode === 'html_only' && (
                      <span>No images will be rendered. Use company placeholders like <code className="bg-muted px-1 rounded">{'{{company_name}}'}</code> and <code className="bg-muted px-1 rounded">{'{{company_address}}'}</code> for a text-only header.</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Template Editor Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="editor">
                  <Code className="h-4 w-4 mr-2" />
                  HTML Editor
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="placeholders">
                  <Info className="h-4 w-4 mr-2" />
                  Placeholders
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="mt-4">
                <Textarea
                  id="html-editor"
                  value={formData.html_content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, html_content: e.target.value }))}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder="Enter your HTML template here..."
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg bg-white overflow-hidden">
                  <iframe
                    srcDoc={renderPreview()}
                    className="w-full min-h-[500px]"
                    title="Template Preview"
                  />
                </div>
              </TabsContent>

              <TabsContent value="placeholders" className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click a placeholder to insert it at cursor position, or copy to clipboard.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlaceholders.map((placeholder) => (
                      <div key={placeholder} className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => insertPlaceholder(placeholder)}
                        >
                          {placeholder}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyPlaceholder(placeholder)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Additional Settings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select
                  value={formData.paper_size}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, paper_size: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A5">A5</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select
                  value={formData.orientation}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, orientation: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Footer Text</Label>
                <Input
                  value={formData.footer_text}
                  onChange={(e) => setFormData((prev) => ({ ...prev, footer_text: e.target.value }))}
                  placeholder="Thank you for your business!"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is-default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_default: checked }))}
              />
              <Label htmlFor="is-default">Set as default template for this document type</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createTemplate.isPending || updateTemplate.isPending}
          >
            {(createTemplate.isPending || updateTemplate.isPending) ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
