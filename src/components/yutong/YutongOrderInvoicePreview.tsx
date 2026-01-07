import { useEffect, useState } from 'react';
import { useYutongInvoiceSignatures, YutongInvoiceSignature } from '@/hooks/useYutongInvoiceSignatures';
import { generateYutongOrderInvoiceHTML } from '@/lib/yutong-order-invoice-generator';
import { sanitizeHTML } from '@/lib/sanitize';

interface YutongOrderInvoicePreviewProps {
  invoiceRecordId: string;
  invoiceData: any;
}

export function YutongOrderInvoicePreview({ invoiceRecordId, invoiceData }: YutongOrderInvoicePreviewProps) {
  const [signatures, setSignatures] = useState<YutongInvoiceSignature[]>([]);
  const { fetchSignatures } = useYutongInvoiceSignatures();

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

  // Generate HTML with merged signature data
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
