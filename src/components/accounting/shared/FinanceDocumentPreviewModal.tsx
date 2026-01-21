import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, FileText } from "lucide-react";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import { useCompanies } from "@/hooks/useAccountingData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { mapDocumentToPlaceholders, replacePlaceholders, generatePrintableDocument } from "@/lib/document-template-utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface FinanceDocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string; // "ar_invoice" | "ar_receipt" | "ar_credit_note" | "ap_invoice" | "ap_payment_voucher" | "ap_debit_note"
  documentData: any;
  companyId?: string;
}

export const FinanceDocumentPreviewModal = ({
  open,
  onOpenChange,
  documentType,
  documentData,
  companyId,
}: FinanceDocumentPreviewModalProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: companies } = useCompanies();
  const { data: allTemplates } = useDocumentTemplates();

  // Fetch template type to filter templates
  const { data: templateType } = useQuery({
    queryKey: ["template-type-by-code", documentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_template_types")
        .select("*")
        .eq("type_code", documentType)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!documentType,
  });

  // Filter templates for this document type
  const availableTemplates = allTemplates?.filter(
    (t) => t.template_type_id === templateType?.id && t.is_active
  );

  // Fetch line items for invoices
  const { data: lineItems } = useQuery({
    queryKey: ["doc-line-items", documentType, documentData?.id],
    queryFn: async () => {
      if (!documentData?.id) return [];
      
      if (documentType === "ar_invoice") {
        const { data, error } = await supabase
          .from("ar_invoice_lines")
          .select("*")
          .eq("invoice_id", documentData.id);
        if (error) throw error;
        return data;
      }
      
      if (documentType === "ap_invoice") {
        const { data, error } = await supabase
          .from("ap_invoice_lines")
          .select("*")
          .eq("invoice_id", documentData.id);
        if (error) throw error;
        return data;
      }
      
      return [];
    },
    enabled: !!documentData?.id && (documentType === "ar_invoice" || documentType === "ap_invoice"),
  });

  // Fetch allocations for receipts/payments
  const { data: allocations } = useQuery({
    queryKey: ["doc-allocations", documentType, documentData?.id],
    queryFn: async () => {
      if (!documentData?.id) return [];
      
      if (documentType === "ar_receipt") {
        const { data, error } = await supabase
          .from("ar_receipt_allocations")
          .select("*, ar_invoices(invoice_number)")
          .eq("receipt_id", documentData.id);
        if (error) throw error;
        return data;
      }
      
      if (documentType === "ap_payment_voucher") {
        const { data, error } = await supabase
          .from("ap_payment_allocations")
          .select("*, ap_invoices(invoice_number)")
          .eq("payment_id", documentData.id);
        if (error) throw error;
        return data;
      }
      
      return [];
    },
    enabled: !!documentData?.id && (documentType === "ar_receipt" || documentType === "ap_payment_voucher"),
  });

  // Auto-select default template
  useEffect(() => {
    if (availableTemplates?.length && !selectedTemplateId) {
      const defaultTemplate = availableTemplates.find((t) => t.is_default) || availableTemplates[0];
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [availableTemplates, selectedTemplateId]);

  const selectedTemplate = availableTemplates?.find((t) => t.id === selectedTemplateId);
  const company = companies?.find((c) => c.id === (companyId || selectedTemplate?.company_id));

  // Generate rendered HTML
  const getRenderedHtml = (): string => {
    if (!selectedTemplate || !documentData) {
      return generatePrintableDocument(`
        <div style="text-align: center; padding: 40px;">
          <h2 style="color: #666;">No Template Available</h2>
          <p>Please create a template for "${documentType.replace('_', ' ')}" in Document Settings.</p>
        </div>
      `);
    }

    const placeholders = mapDocumentToPlaceholders(
      documentType,
      documentData,
      company,
      lineItems || [],
      allocations || [],
      selectedTemplate.header_image_url || undefined
    );

    const renderedHtml = replacePlaceholders(selectedTemplate.html_content || "", placeholders);
    
    return generatePrintableDocument(
      renderedHtml,
      selectedTemplate.css_styles || undefined,
      selectedTemplate.paper_size || "A4",
      selectedTemplate.orientation || "portrait"
    );
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!iframeRef.current?.contentDocument?.body) {
      toast.error("Unable to generate PDF");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const body = iframeRef.current.contentDocument.body;
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: selectedTemplate?.orientation === "landscape" ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Generate filename
      const docNumber = documentData?.invoice_number || 
                        documentData?.receipt_number || 
                        documentData?.payment_number ||
                        documentData?.credit_note_number ||
                        documentData?.debit_note_number ||
                        "document";
      pdf.save(`${docNumber}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const documentTitle = {
    ar_invoice: "AR Invoice",
    ar_receipt: "AR Receipt",
    ar_credit_note: "Credit Note",
    ap_invoice: "AP Invoice",
    ap_payment_voucher: "Payment Voucher",
    ap_debit_note: "Debit Note",
  }[documentType] || "Document";

  const docNumber = documentData?.invoice_number || 
                    documentData?.receipt_number || 
                    documentData?.payment_number ||
                    documentData?.credit_note_number ||
                    documentData?.debit_note_number ||
                    "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {documentTitle} Preview
          </DialogTitle>
          <DialogDescription>
            {docNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Template Selector and Actions */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="flex-1">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                    {template.is_default && " (Default)"}
                  </SelectItem>
                ))}
                {(!availableTemplates || availableTemplates.length === 0) && (
                  <SelectItem value="none" disabled>
                    No templates available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || !selectedTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPdf ? "Generating..." : "Download PDF"}
            </Button>
            <Button onClick={handlePrint} disabled={!selectedTemplate}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex-1 overflow-hidden border rounded-lg bg-white">
          <iframe
            ref={iframeRef}
            srcDoc={getRenderedHtml()}
            className="w-full h-[600px]"
            title="Document Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
