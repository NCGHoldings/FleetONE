import { useEffect, useState } from 'react';
import { useYutongInvoiceSignatures, YutongInvoiceSignature } from '@/hooks/useYutongInvoiceSignatures';
import { generateYutongOrderInvoiceHTML } from '@/lib/yutong-order-invoice-generator';
import { useVehicleSalesTemplateByType, VehicleSalesTemplate } from '@/hooks/useVehicleSalesTemplates';

interface YutongOrderInvoicePreviewProps {
  invoiceRecordId: string;
  invoiceData: any;
  selectedTemplate?: VehicleSalesTemplate | null;
}

export function YutongOrderInvoicePreview({ invoiceRecordId, invoiceData, selectedTemplate }: YutongOrderInvoicePreviewProps) {
  const [signatures, setSignatures] = useState<YutongInvoiceSignature[]>([]);
  const { fetchSignatures } = useYutongInvoiceSignatures();
  
  // Determine template type based on invoice category
  const isTaxInvoice = invoiceData?.invoice_category === 'tax_invoice' || invoiceData?.is_tax_invoice;
  const templateTypeCode = isTaxInvoice ? 'yutong_order_invoice' : 'yutong_order_invoice';
  
  // Fetch default template if no template is selected
  const { data: defaultTemplate } = useVehicleSalesTemplateByType(templateTypeCode);
  
  // Use selected template or fall back to default
  const activeTemplate = selectedTemplate !== undefined ? selectedTemplate : defaultTemplate;

  // Fetch signatures in real-time
  useEffect(() => {
    const loadSignatures = async () => {
      const sigs = await fetchSignatures(invoiceRecordId);
      setSignatures(sigs);
    };

    loadSignatures();
  }, [invoiceRecordId]);

  // Find specific signatures by role
  const preparedSig = signatures.find(s => s.signature_role === 'prepared_by');
  const approvedSig = signatures.find(s => s.signature_role === 'approved_by');
  const receivedSig = signatures.find(s => s.signature_role === 'received_by');

  // Merge signatures into invoice data with correct field names for HTML generator
  const mergedInvoiceData = {
    ...invoiceData,
    // Add custom header from template if available
    customHeaderImageUrl: activeTemplate?.header_image_url || undefined,
    preparedBy: preparedSig ? {
      approver_name: preparedSig.signer_name,
      signature_data: preparedSig.signature_data,
      signature_type: preparedSig.signature_type,
      approval_date: preparedSig.signed_at
    } : undefined,
    approvedBy: approvedSig ? {
      approver_name: approvedSig.signer_name,
      signature_data: approvedSig.signature_data,
      signature_type: approvedSig.signature_type,
      approval_date: approvedSig.signed_at
    } : undefined,
    receivedBy: receivedSig ? {
      approver_name: receivedSig.signer_name,
      signature_data: receivedSig.signature_data,
      signature_type: receivedSig.signature_type,
      approval_date: receivedSig.signed_at
    } : undefined
  };

  // Generate HTML with merged signature data and template header
  const invoiceHTML = generateYutongOrderInvoiceHTML(mergedInvoiceData);

  return (
    <div className="border rounded-lg overflow-hidden bg-white" style={{ height: 'calc(90vh - 280px)' }}>
      <iframe
        srcDoc={invoiceHTML}
        title="Invoice Preview"
        className="w-full h-full border-0"
        style={{ minHeight: '600px', background: 'white' }}
      />
    </div>
  );
}
