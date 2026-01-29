import React, { useEffect, useState } from 'react';
import { generateLightVehicleOrderInvoiceHTML, LightVehicleOrderInvoiceData } from '@/lib/lightvehicle-order-invoice-generator';
import { Loader2 } from 'lucide-react';

interface LightVehicleOrderInvoicePreviewProps {
  invoiceData: LightVehicleOrderInvoiceData;
}

export function LightVehicleOrderInvoicePreview({ invoiceData }: LightVehicleOrderInvoicePreviewProps) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const generatedHtml = generateLightVehicleOrderInvoiceHTML(invoiceData);
      setHtml(generatedHtml);
    } catch (error) {
      console.error('Error generating invoice HTML:', error);
    } finally {
      setLoading(false);
    }
  }, [invoiceData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <iframe
        srcDoc={html}
        title="Invoice Preview"
        className="w-full h-[700px] border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
