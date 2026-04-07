import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Printer, Download, FileText, AlertTriangle, Wand2, Pen } from "lucide-react";
import { DocumentSignaturePad, injectSignaturesIntoHtml } from "./DocumentSignaturePad";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import { useCompanies } from "@/hooks/useAccountingData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { mapDocumentToPlaceholders, replacePlaceholders, generatePrintableDocument, HeaderMode } from "@/lib/document-template-utils";
import { defaultTemplates } from "@/lib/document-template-seeder";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface FinanceDocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string; // All 12 document types supported
  documentData: any;
  companyId?: string;
  businessUnitCode?: string; // For consolidated GL - resolves sub-company by short_code
}

export const FinanceDocumentPreviewModal = ({
  open,
  onOpenChange,
  documentType,
  documentData,
  companyId,
  businessUnitCode,
}: FinanceDocumentPreviewModalProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Signature persistence helpers
  const getSignatureStorageKey = () => {
    const docId = documentData?.id || documentData?.invoice_number || documentData?.receipt_number || documentData?.payment_number || '';
    return `doc_signatures_${documentType}_${docId}`;
  };

  const loadSavedSignatures = (): Record<string, { dataUrl: string; name: string }> => {
    const defaultSigs = {
      verified_by: { dataUrl: "", name: "" },
      approved_by: { dataUrl: "", name: "" },
      received_by: { dataUrl: "", name: "" },
      finance_controller: { dataUrl: "", name: "" },
    };
    try {
      const key = getSignatureStorageKey();
      if (!key || key === `doc_signatures_${documentType}_`) return defaultSigs;
      const saved = localStorage.getItem(key);
      if (saved) {
        return { ...defaultSigs, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Failed to load saved signatures:", e);
    }
    return defaultSigs;
  };

  const saveSignaturesToStorage = (sigs: Record<string, { dataUrl: string; name: string }>) => {
    try {
      const key = getSignatureStorageKey();
      if (!key || key === `doc_signatures_${documentType}_`) return;
      localStorage.setItem(key, JSON.stringify(sigs));
    } catch (e) {
      console.warn("Failed to save signatures:", e);
    }
  };

  // Signature state — initialized from localStorage
  const [signatures, setSignatures] = useState<Record<string, { dataUrl: string; name: string }>>(() => loadSavedSignatures());
  const [signaturePadOpen, setSignaturePadOpen] = useState(false);
  const [activeSignatureRole, setActiveSignatureRole] = useState("");

  // Reload saved signatures when modal opens or document changes
  useEffect(() => {
    if (open && documentData?.id) {
      setSignatures(loadSavedSignatures());
    }
  }, [open, documentData?.id]);

  const { data: companies } = useCompanies();
  const { templates: allTemplates } = useDocumentTemplates();

  // Resolve actual company: If businessUnitCode provided, find sub-company by short_code
  const resolvedCompanyId = useMemo(() => {
    if (businessUnitCode && companies?.length) {
      // Find sub-company by short_code (YUT, SBO, SNT, LTV, SPH, etc.)
      const subCompany = companies.find(c => c.short_code === businessUnitCode);
      if (subCompany) return subCompany.id;
    }
    // Fallback to companyId prop or documentData.company_id
    return companyId || documentData?.company_id;
  }, [businessUnitCode, companyId, documentData?.company_id, companies]);

  // Fetch template type to filter templates
  // For ar_invoice, also fetch tax_invoice type so both appear in the dropdown
  const relatedTypeCodes = documentType === 'ar_invoice' 
    ? ['ar_invoice', 'tax_invoice'] 
    : [documentType];

  const { data: templateTypes } = useQuery({
    queryKey: ["template-types-by-codes", ...relatedTypeCodes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_template_types")
        .select("*")
        .in("type_code", relatedTypeCodes)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!documentType,
  });

  // Keep backward compat: templateType is the primary type (used for fallback logic)
  const templateType = templateTypes?.find(t => t.type_code === documentType);
  const templateTypeIds = templateTypes?.map(t => t.id) || [];

  // Filter templates for this document type (+ related types) AND resolved company
  const availableTemplates = allTemplates?.filter((t) => {
    // Must match one of the template type IDs and be active
    if (!templateTypeIds.includes(t.template_type_id) || !t.is_active) return false;
    // Filter to resolved company's templates
    if (resolvedCompanyId) {
      return t.company_id === resolvedCompanyId;
    }
    return true;
  });

  // Fetch line items for invoices and direct payments
  const isDirectPayment = documentType === "ap_payment_voucher" && documentData?.is_direct_payment;
  const { data: lineItems } = useQuery({
    queryKey: ["doc-line-items", documentType, documentData?.id, isDirectPayment],
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

      // Fetch ap_payment_lines for direct payments with account info
      if (isDirectPayment) {
        const { data, error } = await supabase
          .from("ap_payment_lines")
          .select("*, chart_of_accounts(account_code, account_name)")
          .eq("payment_id", documentData.id);
        if (error) throw error;
        return data;
      }
      
      return [];
    },
    enabled: !!documentData?.id && (documentType === "ar_invoice" || documentType === "ap_invoice" || !!isDirectPayment),
  });

  // Fetch vendor's default bank account as fallback when payment has no vendor_bank_account_id
  const vendorIdForBankFallback = documentType === 'ap_payment_voucher' && !documentData?.vendor_bank_accounts && documentData?.vendor_id
    ? documentData.vendor_id
    : undefined;

  const { data: fallbackVendorBank } = useQuery({
    queryKey: ["vendor-bank-fallback", vendorIdForBankFallback],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_bank_accounts")
        .select("*")
        .eq("vendor_id", vendorIdForBankFallback!)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vendorIdForBankFallback,
  });

  // Enrich documentData with fallback vendor bank if needed
  const enrichedDocumentData = useMemo(() => {
    if (!documentData) return documentData;
    if (documentType === 'ap_payment_voucher' && !documentData.vendor_bank_accounts && fallbackVendorBank) {
      return { ...documentData, vendor_bank_accounts: fallbackVendorBank };
    }
    return documentData;
  }, [documentData, documentType, fallbackVendorBank]);

  // Fetch allocations for receipts/payments
  const { data: allocations } = useQuery({
    queryKey: ["doc-allocations", documentType, documentData?.id],
    queryFn: async () => {
      if (!documentData?.id) return [];
      
      if (documentType === "ar_receipt") {
        const { data, error } = await supabase
          .from("ar_receipt_allocations")
          .select("*, ar_invoices(invoice_number, notes)")
          .eq("receipt_id", documentData.id);
        if (error) throw error;
        return data;
      }
      
      if (documentType === "ap_payment_voucher") {
        const { data, error } = await supabase
          .from("ap_payment_allocations")
          .select("*, ap_invoices(invoice_number, notes, ap_invoice_lines(description))")
          .eq("payment_id", documentData.id);
        if (error) throw error;
        return data;
      }
      
      return [];
    },
    enabled: !!documentData?.id && (documentType === "ar_receipt" || documentType === "ap_payment_voucher"),
  });

  // Reset template selection when resolved company or document type changes
  useEffect(() => {
    setSelectedTemplateId("");
  }, [resolvedCompanyId, documentType]);

  // Auto-select company template as default
  useEffect(() => {
    if (availableTemplates?.length && !selectedTemplateId) {
      // Prefer resolved company-specific template, then any default, then first available
      const companyTemplate = resolvedCompanyId 
        ? availableTemplates.find((t) => t.company_id === resolvedCompanyId)
        : null;
      const defaultTemplate = availableTemplates.find((t) => t.is_default);
      const selectedTemplate = companyTemplate || defaultTemplate || availableTemplates[0];
      if (selectedTemplate) {
        setSelectedTemplateId(selectedTemplate.id);
      }
    }
  }, [availableTemplates, selectedTemplateId, resolvedCompanyId]);



  const selectedTemplate = availableTemplates?.find((t) => t.id === selectedTemplateId);
  // Use resolved company for all lookups (sub-company details: phone, email, address, logo)
  // If sub-company has no logo_url, inherit from parent company
  const resolvedCompany = companies?.find((c) => c.id === resolvedCompanyId);
  const company = useMemo(() => {
    if (!resolvedCompany) return undefined;
    if (resolvedCompany.logo_url) return resolvedCompany;
    // Inherit logo from parent company
    if (resolvedCompany.parent_company_id && companies?.length) {
      const parent = companies.find(c => c.id === resolvedCompany.parent_company_id);
      if (parent?.logo_url) {
        return { ...resolvedCompany, logo_url: parent.logo_url };
      }
    }
    return resolvedCompany;
  }, [resolvedCompany, companies]);
  const hasNoTemplate = !availableTemplates || availableTemplates.length === 0;

  // Generate fallback HTML using default template
  const generateFallbackHtml = (): string => {
    const templateGenerator = defaultTemplates[documentType];
    if (!templateGenerator) {
      return `
        <div style="text-align: center; padding: 40px; font-family: sans-serif;">
          <h2 style="color: #dc2626;">⚠️ No Template Available</h2>
          <p style="color: #666;">Document type "${documentType.replace(/_/g, ' ').toUpperCase()}" is not configured.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Go to <strong>Settings → Document Templates → Initialize All Templates</strong> to create default templates.
          </p>
        </div>
      `;
    }

    // Use default template with available data
    const defaultHtml = templateGenerator();
    const placeholders = mapDocumentToPlaceholders(
      documentType,
      enrichedDocumentData,
      company,
      lineItems || [],
      allocations || [],
      undefined
    );

    return replacePlaceholders(defaultHtml, placeholders);
  };

  // Generate rendered HTML
  const getRenderedHtml = (): string => {
    if (!documentData) {
      return generatePrintableDocument(`
        <div style="text-align: center; padding: 40px;">
          <h2 style="color: #666;">No Document Data</h2>
          <p>Unable to preview document - no data provided.</p>
        </div>
      `);
    }

    // Use selected template if available, otherwise use fallback
    if (selectedTemplate) {
      const enrichedDocData = {
        ...enrichedDocumentData,
        verified_by: signatures.verified_by.name || enrichedDocumentData?.verified_by || '',
        verified_by_signature: signatures.verified_by.dataUrl || enrichedDocumentData?.verified_by_signature || '',
        approved_by: signatures.approved_by.name || enrichedDocumentData?.approved_by || '',
        approved_by_signature: signatures.approved_by.dataUrl || enrichedDocumentData?.approved_by_signature || '',
        received_by: signatures.received_by.name || enrichedDocumentData?.received_by || '',
        received_by_signature: signatures.received_by.dataUrl || enrichedDocumentData?.received_by_signature || '',
        finance_controller: signatures.finance_controller.name || enrichedDocumentData?.finance_controller || '',
        finance_controller_signature: signatures.finance_controller.dataUrl || enrichedDocumentData?.finance_controller_signature || '',
        prepared_by: signatures.verified_by.name || enrichedDocumentData?.prepared_by || '', // Alias
      };

    const placeholders = mapDocumentToPlaceholders(
      documentType,
      enrichedDocData,
      company,
      lineItems || [],
      allocations || [],
      selectedTemplate.header_image_url || undefined,
      (selectedTemplate.header_mode as HeaderMode) || 'logo_and_html'
    );

      const renderedHtml = replacePlaceholders(selectedTemplate.html_content || "", placeholders);
      
      // Post-process: inject signatures into rendered HTML (works with ANY template)
      const withSignatures = injectSignaturesIntoHtml(renderedHtml, signatures);
      
      return generatePrintableDocument(
        withSignatures,
        selectedTemplate.css_styles || undefined,
        selectedTemplate.paper_size || "A4",
        selectedTemplate.orientation || "portrait"
      );
    }

    // Fallback to default template  
    const fallbackHtml = generateFallbackHtml();
    const fallbackWithSigs = injectSignaturesIntoHtml(fallbackHtml, signatures);
    return generatePrintableDocument(fallbackWithSigs);
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
        scale: 1.5,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
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

      pdf.addImage(imgData, "JPEG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
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
    tax_invoice: "Tax Invoice",
    ar_receipt: "AR Receipt",
    ar_credit_note: "Credit Note",
    ap_invoice: "AP Invoice",
    ap_payment_voucher: "Payment Voucher",
    ap_debit_note: "Debit Note",
    advance_receipt: "Advance Receipt",
    advance_payment: "Advance Payment",
    journal_voucher: "Journal Voucher",
    cheque_voucher: "Cheque Voucher",
    wht_certificate: "WHT Certificate",
    grn: "Goods Receipt Note",
  }[documentType] || "Document";

  const docNumber = documentData?.invoice_number ||
                    documentData?.receipt_number || 
                    documentData?.payment_number ||
                    documentData?.credit_note_number ||
                    documentData?.debit_note_number ||
                    documentData?.voucher_number ||
                    documentData?.certificate_number ||
                    documentData?.grn_number ||
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
              disabled={isGeneratingPdf}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPdf ? "Generating..." : "Download PDF"}
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Fallback Template Warning */}
        {hasNoTemplate && (
          <Alert variant="default" className="bg-warning/10 border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning-foreground">Using Default Template</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              No custom template found for this document type. Using system default.
              Go to <strong>Settings → Document Templates → Initialize All Templates</strong> to create customizable templates.
            </AlertDescription>
          </Alert>
        )}

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
        {/* Signature Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t">
          <span className="text-sm font-medium text-muted-foreground mr-2">
            <Pen className="h-4 w-4 inline mr-1" />
            Sign:
          </span>
          {[
            { key: "prepared_by", label: "Prepared By" },
            { key: "verified_by", label: "Verified By" },
            { key: "approved_by", label: "Authorized By" },
            { key: "finance_controller", label: "Finance Controller" },
            { key: "received_by", label: "Received By" },
          ].map((role) => (
            <Button
              key={role.key}
              variant={signatures[role.key]?.dataUrl ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveSignatureRole(role.key);
                setSignaturePadOpen(true);
              }}
              className={signatures[role.key]?.dataUrl ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            >
              <Pen className="h-3.5 w-3.5 mr-1" />
              {signatures[role.key]?.dataUrl ? `✓ ${role.label}` : role.label}
            </Button>
          ))}
        </div>
      </DialogContent>

      {/* Signature Pad Dialog */}
      <DocumentSignaturePad
        open={signaturePadOpen}
        onOpenChange={setSignaturePadOpen}
        signerLabel={
          activeSignatureRole === "prepared_by" ? "Prepared By" :
          activeSignatureRole === "verified_by" ? "Verified By" :
          activeSignatureRole === "approved_by" ? "Authorized By" :
          activeSignatureRole === "finance_controller" ? "Finance Controller" :
          "Received By"
        }
        onSave={(dataUrl, name) => {
          const newSigs = {
            ...signatures,
            [activeSignatureRole]: { dataUrl, name },
          };
          setSignatures(newSigs);
          saveSignaturesToStorage(newSigs);
        }}
      />
    </Dialog>
  );
};
