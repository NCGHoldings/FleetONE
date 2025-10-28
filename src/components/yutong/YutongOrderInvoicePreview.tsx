import { useEffect, useState } from 'react';
import { useYutongInvoiceSignatures, YutongInvoiceSignature } from '@/hooks/useYutongInvoiceSignatures';
import { generateYutongOrderInvoiceHTML } from '@/lib/yutong-order-invoice-generator';

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

  // Merge signatures into invoice data
  const mergedInvoiceData = {
    ...invoiceData,
    preparedBy: preparedSig ? {
      name: preparedSig.signer_name,
      signature: preparedSig.signature_data,
      signatureType: preparedSig.signature_type,
      date: preparedSig.signed_at ? new Date(preparedSig.signed_at).toLocaleDateString() : undefined
    } : undefined,
    approvedBy: approvedSig ? {
      name: approvedSig.signer_name,
      signature: approvedSig.signature_data,
      signatureType: approvedSig.signature_type,
      date: approvedSig.signed_at ? new Date(approvedSig.signed_at).toLocaleDateString() : undefined
    } : undefined,
    receivedBy: receivedSig ? {
      name: receivedSig.signer_name,
      signature: receivedSig.signature_data,
      signatureType: receivedSig.signature_type,
      date: receivedSig.signed_at ? new Date(receivedSig.signed_at).toLocaleDateString() : undefined
    } : undefined
  };

  // Generate HTML with merged signature data
  const invoiceHTML = generateYutongOrderInvoiceHTML(mergedInvoiceData);

  return (
    <div 
      className="border rounded-lg p-6 overflow-auto max-h-[calc(90vh-280px)] bg-background"
      dangerouslySetInnerHTML={{ __html: invoiceHTML }}
    />
  );
}
