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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mapDocumentToPlaceholders, replacePlaceholders, generatePrintableDocument, HeaderMode } from "@/lib/document-template-utils";
import { defaultTemplates, sphTemplateOverrides } from "@/lib/document-template-seeder";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { canvasToMultiPagePDF } from "@/lib/pdf-multi-page";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  const handleResetTemplate = async () => {
    if (!selectedTemplateId || selectedTemplateId === 'none') {
      toast.error("Please select a valid template to reset.");
      return;
    }

    // Use SPH-specific template for SPH business unit (ar_invoice / ar_receipt)
    const isSPH = businessUnitCode === 'SPH' 
      || resolvedCompany?.short_code === 'SPH' 
      || company?.short_code === 'SPH'
      || (documentData?.invoice_number || '').startsWith('SPH-');
    const defaultGenerator = (isSPH && sphTemplateOverrides[documentType]) || defaultTemplates[documentType];
    if (!defaultGenerator) {
      toast.error("No default layout available for this document type.");
      return;
    }

    setIsResetting(true);
    try {
      const defaultHtml = defaultGenerator();
      const { error } = await supabase
        .from('document_templates')
        .update({ html_content: defaultHtml })
        .eq('id', selectedTemplateId);

      if (error) throw error;

      toast.success("Template reset to default layout successfully!");
      
      // Update local cache manually or invalidate query
      await queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      
    } catch (e) {
      console.error(e);
      toast.error("Failed to reset template.");
    } finally {
      setIsResetting(false);
    }
  };

  // Signature persistence helpers
  const getSignatureStorageKey = () => {
    const docId = documentData?.id || documentData?.invoice_number || documentData?.receipt_number || documentData?.payment_number || '';
    return `doc_signatures_${documentType}_${docId}`;
  };

  const loadSavedSignatures = (): Record<string, { dataUrl: string; name: string }> => {
    const defaultSigs = {
      prepared_by: { dataUrl: "", name: "" },
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
    if (!templateTypeIds.includes((t as any).template_type_id) || !t.is_active) return false;
    // Filter to resolved company's templates
    if (resolvedCompanyId) {
      return (t as any).company_id === resolvedCompanyId;
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
      
      if (documentType === "purchase_order") {
        const { data, error } = await supabase
          .from("purchase_order_lines")
          .select("*, items(item_name)")
          .eq("purchase_order_id", documentData.id);
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
    enabled: !!documentData?.id && (documentType === "purchase_order" || documentType === "ar_invoice" || documentType === "ap_invoice" || !!isDirectPayment),
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
        ? availableTemplates.find((t) => (t as any).company_id === resolvedCompanyId)
        : null;
      const defaultTemplate = availableTemplates.find((t) => (t as any).is_default);
      const selectedTemplate = companyTemplate || defaultTemplate || availableTemplates[0];
      if (selectedTemplate) {
        setSelectedTemplateId(selectedTemplate.id);
      }
    }
  }, [availableTemplates, selectedTemplateId, resolvedCompanyId]);

  // ===== Bank Transfer Letter (virtual template for bank_transfer payments) =====
  const isBankTransfer = documentType === 'ap_payment_voucher'
    && (documentData?.payment_method || '').toLowerCase().replace(/[\s_-]/g, '') === 'banktransfer';
  const BANK_TRANSFER_ID = '__bank_transfer_letter__';

  const generateBankTransferLetterHtml = (): string => {
    const doc = enrichedDocumentData || documentData;
    const paymentDate = doc?.payment_date
      ? format(new Date(doc.payment_date), 'do MMMM yyyy')
      : format(new Date(), 'do MMMM yyyy');

    // Company info
    const companyName = company?.name || company?.company_name || 'NCG Holdings (Pvt) Ltd';

    // Company's own bank account (source of funds)
    // Try from bank_accounts join, or fallback
    const companyBankName = doc?.bank_accounts?.bank_name || doc?.bank_name || '';
    const companyAccountNo = doc?.bank_accounts?.account_number || doc?.account_number || '';

    // Beneficiary info
    const vba = doc?.vendor_bank_accounts;
    const isCustomerPayee = doc?.payee_type === 'customer';
    const isEmployeePayee = doc?.payee_type === 'employee';
    const beneficiaryName = isCustomerPayee
      ? (doc?.customers?.customer_name || '')
      : isEmployeePayee
        ? (doc?.employees?.staff_name || doc?.staff_registry?.staff_name || '')
        : (vba?.account_holder_name || doc?.vendors?.vendor_name || '');
    const beneficiaryBank = vba?.bank_name
      ? `${vba.bank_name}${vba.bank_branch ? ' - ' + vba.bank_branch : ''}`
      : (doc?.vendors?.bank_name || '');
    const beneficiaryAccountNo = vba?.account_number || doc?.vendors?.bank_account || '';

    const amount = doc?.amount || 0;
    const formattedAmount = `Rs.${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Amount in words
    const amountInWords = (() => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const convertHundreds = (n: number): string => {
        let result = '';
        if (n >= 100) { result += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
        if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10; }
        if (n > 0) result += ones[n] + ' ';
        return result;
      };
      const rupees = Math.floor(amount);
      const cents = Math.round((amount - rupees) * 100);
      let result = '';
      const million = Math.floor(rupees / 1000000);
      const thousand = Math.floor((rupees % 1000000) / 1000);
      const remainder = rupees % 1000;
      if (million) result += convertHundreds(million) + 'Million ';
      if (thousand) result += convertHundreds(thousand) + 'Thousand ';
      if (remainder) result += convertHundreds(remainder);
      result = result.trim() + ' Rupees';
      if (cents > 0) result += ' and ' + convertHundreds(cents).trim() + ' Cents';
      return result + ' only.';
    })();

    // The letter is addressed to the Company's Bank
    const addresseeBankName = companyBankName || 'the Bank';

    return `
      <!DOCTYPE html>
      <html><head><style>
        @page { size: A4; margin: 25mm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; margin: 0; padding: 40px 60px; }
        .date { margin-bottom: 24px; }
        .address { margin-bottom: 30px; }
        .salutation { margin-bottom: 20px; }
        .subject { font-weight: bold; text-decoration: underline; margin-bottom: 20px; font-size: 13pt; }
        .body-text { margin-bottom: 18px; text-align: justify; }
        table { border-collapse: collapse; width: 80%; margin: 20px 0; }
        th, td { border: 1.5px solid #000; padding: 8px 12px; text-align: left; font-size: 12pt; }
        th { font-weight: bold; background: #f9f9f9; }
        .amount-words { margin: 20px 0; font-weight: bold; }
        .closing { margin-top: 40px; }
        .signature-block { margin-top: 80px; }
        .signature-line { border-top: 1px dotted #000; width: 200px; padding-top: 4px; }
        @media print {
          body { padding: 0; }
        }
      </style></head><body>
        <div class="date">${paymentDate}</div>
        <div class="address">
          The Manager,<br/>
          ${addresseeBankName} PLC
        </div>
        <div class="salutation">Dear Sir/Madam,</div>
        <div class="subject">
          Fund Transfer from ${companyName} A/C No – ${companyAccountNo || '________________'}
        </div>
        <div class="body-text">
          Please be kind enough to debit below mentioned amount from The ${companyName} account and credited to following bank account.
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Bank</th><th>Account No</th><th>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>${beneficiaryName}</td>
              <td>${beneficiaryBank}</td>
              <td>${beneficiaryAccountNo}</td>
              <td>${formattedAmount}</td>
            </tr>
          </tbody>
        </table>
        <div class="amount-words">
          Total Amount In Word: ${amountInWords}
        </div>
        <div class="body-text">
          You may debit the charges if any with the transaction to the same account.
        </div>
        <div class="body-text">
          Expect you will do the needful with immediate effect and please accept our appreciation for the cooperation extended.
        </div>
        <div class="closing">
          Yours Faithfully
        </div>
        <div class="signature-block">
          <div class="signature-line">
            Authorized Signatures<br/>
            ${companyName}
          </div>
        </div>
      </body></html>
    `;
  };



  const selectedTemplate = availableTemplates?.find((t) => t.id === selectedTemplateId);
  // Use resolved company for all lookups (sub-company details: phone, email, address, logo)
  // If sub-company has no logo_url, inherit from parent company
  const resolvedCompany = companies?.find((c) => c.id === resolvedCompanyId);
  const company = useMemo(() => {
    if (!resolvedCompany) return undefined;
    let patched = { ...resolvedCompany };

    // ── Runtime Guard: Sanitize legacy "Test" prefixed company names ──
    // Ensures invoice headers show formal business names even if the DB
    // migration (20260513110000_fix_sph_company_name) has not been applied yet.
    const testNameMap: Record<string, string> = {
      'test special hire': 'NCG Express (Pvt) Ltd — Special Hire',
    };
    const nameLower = (patched.name || '').toLowerCase().trim();
    const companyNameLower = (patched.company_name || '').toLowerCase().trim();
    if (testNameMap[nameLower]) {
      patched = { ...patched, name: testNameMap[nameLower] };
    }
    if (testNameMap[companyNameLower]) {
      patched = { ...patched, company_name: testNameMap[companyNameLower] };
    }

    // Inherit logo from parent company if sub-company has none
    if (!patched.logo_url && patched.parent_company_id && companies?.length) {
      const parent = companies.find(c => c.id === patched.parent_company_id);
      if (parent?.logo_url) {
        patched = { ...patched, logo_url: parent.logo_url };
      }
    }
    return patched;
  }, [resolvedCompany, companies]);
  const hasNoTemplate = !availableTemplates || availableTemplates.length === 0;

  // Generate fallback HTML using default template
  const generateFallbackHtml = (docData: any): string => {
    // Use SPH-specific template when company is SPH (Special Hire business unit)
    const isSPH = businessUnitCode === 'SPH' 
      || resolvedCompany?.short_code === 'SPH' 
      || company?.short_code === 'SPH'
      || (documentData?.invoice_number || '').startsWith('SPH-');
    const templateGenerator = (isSPH && sphTemplateOverrides[documentType]) || defaultTemplates[documentType];
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
      docData,
      company,
      lineItems || [],
      allocations || [],
      undefined
    );

    return replacePlaceholders(defaultHtml, placeholders);
  };

  // Find all UUIDs in signature fields to fetch their names
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const signatureFields = ['prepared_by', 'verified_by', 'approved_by', 'received_by', 'finance_controller', 'authorized_by'] as const;
  
  const profileIdsToFetch = useMemo(() => {
    const ids = new Set<string>();
    if (enrichedDocumentData) {
      signatureFields.forEach(field => {
        const val = enrichedDocumentData[field];
        if (typeof val === 'string' && uuidRegex.test(val)) {
          ids.add(val);
        }
      });
    }
    return Array.from(ids);
  }, [enrichedDocumentData]);

  const { data: profileNames } = useQuery({
    queryKey: ['profiles-for-signatures', profileIdsToFetch],
    queryFn: async () => {
      if (profileIdsToFetch.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', profileIdsToFetch);
        
      if (error) {
        console.error('Failed to fetch profiles for signatures', error);
        return {};
      }
      
      const profileMap: Record<string, string> = {};
      data?.forEach(p => {
        profileMap[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.user_id;
      });
      return profileMap;
    },
    enabled: profileIdsToFetch.length > 0
  });

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

    const resolveName = (field: keyof typeof signatures, fallbackValue: any) => {
      const explicitName = signatures[field]?.name;
      if (explicitName) return explicitName;
      if (typeof fallbackValue === 'string' && uuidRegex.test(fallbackValue)) {
        return profileNames?.[fallbackValue] || fallbackValue;
      }
      return fallbackValue || '';
    };

    const enrichedDocData = {
      ...enrichedDocumentData,
      verified_by: resolveName('verified_by', enrichedDocumentData?.verified_by),
      verified_by_signature: signatures.verified_by.dataUrl || enrichedDocumentData?.verified_by_signature || '',
      approved_by: resolveName('approved_by', enrichedDocumentData?.approved_by),
      approved_by_signature: signatures.approved_by.dataUrl || enrichedDocumentData?.approved_by_signature || '',
      received_by: resolveName('received_by', enrichedDocumentData?.received_by),
      received_by_signature: signatures.received_by.dataUrl || enrichedDocumentData?.received_by_signature || '',
      finance_controller: resolveName('finance_controller', enrichedDocumentData?.finance_controller),
      finance_controller_signature: signatures.finance_controller.dataUrl || enrichedDocumentData?.finance_controller_signature || '',
      prepared_by: resolveName('prepared_by', enrichedDocumentData?.prepared_by),
      prepared_by_signature: signatures.prepared_by.dataUrl || enrichedDocumentData?.prepared_by_signature || '',
    };

    // Use Bank Transfer Letter if that virtual template is selected
    if (selectedTemplateId === BANK_TRANSFER_ID) {
      return generateBankTransferLetterHtml();
    }

    // Use selected template if available, otherwise use fallback
    if (selectedTemplate) {
      const placeholders = mapDocumentToPlaceholders(
        documentType,
        enrichedDocData,
        company,
        lineItems || [],
        allocations || [],
        (selectedTemplate as any).header_image_url || undefined,
        ((selectedTemplate as any).header_mode as HeaderMode) || 'logo_and_html'
      );

      const renderedHtml = replacePlaceholders((selectedTemplate as any).html_content || "", placeholders);
      
      // Post-process: inject signatures into rendered HTML (works with ANY template)
      const withSignatures = injectSignaturesIntoHtml(renderedHtml, signatures);
      
      return generatePrintableDocument(
        withSignatures,
        (selectedTemplate as any).css_styles || undefined,
        (selectedTemplate as any).paper_size || "A4",
        (selectedTemplate as any).orientation || "portrait"
      );
    }

    // Fallback to default template  
    const fallbackHtml = generateFallbackHtml(enrichedDocData);
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
      
      // Set a fixed width on the body so html2canvas renders at A4 proportions
      const originalWidth = body.style.width;
      body.style.width = "794px"; // A4 at 96dpi
      
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 794,
      });
      
      // Restore original width
      body.style.width = originalWidth;

      // Use multi-page utility for proper pagination instead of single-page shrinking
      const pdf = canvasToMultiPagePDF(canvas);
      
      // Generate filename
      const docNum = documentData?.invoice_number || 
                        documentData?.receipt_number || 
                        documentData?.payment_number ||
                        documentData?.credit_note_number ||
                        documentData?.debit_note_number ||
                        "document";
      pdf.save(`${docNum}.pdf`);
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
    petty_cash_voucher: "Petty Cash Voucher",
    iou_voucher: "IOU Voucher",
  }[documentType] || "Document";

  const docNumber = documentData?.invoice_number ||
                    documentData?.receipt_number || 
                    documentData?.payment_number ||
                    documentData?.credit_note_number ||
                    documentData?.debit_note_number ||
                    documentData?.voucher_number ||
                    documentData?.certificate_number ||
                    documentData?.iou_number ||
                    documentData?.grn_number ||
                    "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
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
                {isBankTransfer && (
                  <SelectItem value={BANK_TRANSFER_ID}>
                    📄 Bank Transfer Letter
                  </SelectItem>
                )}
                {availableTemplates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                    {(template as any).is_default && " (Default)"}
                  </SelectItem>
                ))}
                {(!availableTemplates || availableTemplates.length === 0) && !isBankTransfer && (
                  <SelectItem value="none" disabled>
                    No templates available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {!hasNoTemplate && selectedTemplateId && selectedTemplateId !== 'none' && (
              <Button 
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleResetTemplate}
                disabled={isResetting}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isResetting ? "Resetting..." : "Reset Layout"}
              </Button>
            )}
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
