import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateSinotruckOrderInvoiceHTML, SinotruckOrderInvoiceData } from '@/lib/sinotruck-order-invoice-generator';

interface SinotruckOrderInvoicePreviewProps {
  invoiceRecordId: string;
  invoiceData: SinotruckOrderInvoiceData;
}

export function SinotruckOrderInvoicePreview({
  invoiceRecordId,
  invoiceData
}: SinotruckOrderInvoicePreviewProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    loadInvoiceWithSignatures();
  }, [invoiceRecordId, invoiceData]);

  const loadInvoiceWithSignatures = async () => {
    // Fetch current signatures
    const { data: signatures } = await supabase
      .from('sinotruck_invoice_signatures')
      .select('*')
      .eq('invoice_record_id', invoiceRecordId)
      .order('created_at', { ascending: true });

    const preparedSig = signatures?.find(s => s.signature_role === 'prepared_by');
    const approvedSig = signatures?.find(s => s.signature_role === 'approved_by');
    const receivedSig = signatures?.find(s => s.signature_role === 'received_by');

    // Merge signatures into invoice data
    const mergedData: SinotruckOrderInvoiceData = {
      ...invoiceData,
      preparedBy: preparedSig ? {
        approver_name: preparedSig.signer_name,
        signature_data: preparedSig.signature_data,
        approval_date: preparedSig.signed_at
      } : undefined,
      approvedBy: approvedSig ? {
        approver_name: approvedSig.signer_name,
        signature_data: approvedSig.signature_data,
        approval_date: approvedSig.signed_at
      } : undefined,
      receivedBy: receivedSig ? {
        approver_name: receivedSig.signer_name,
        signature_data: receivedSig.signature_data,
        approval_date: receivedSig.signed_at
      } : undefined
    };

    const html = generateSinotruckOrderInvoiceHTML(mergedData);
    setHtmlContent(html);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <iframe
        srcDoc={htmlContent}
        className="w-full"
        style={{ minHeight: '800px', border: 'none' }}
        title="Invoice Preview"
      />
    </div>
  );
}
