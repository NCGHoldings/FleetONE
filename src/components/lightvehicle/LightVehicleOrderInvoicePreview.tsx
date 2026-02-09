import React, { useEffect, useState } from 'react';
import { generateLightVehicleOrderInvoiceHTML, LightVehicleOrderInvoiceData } from '@/lib/lightvehicle-order-invoice-generator';
import { Loader2 } from 'lucide-react';
import { useVehicleSalesTemplateByType, VehicleSalesTemplate } from '@/hooks/useVehicleSalesTemplates';

interface LightVehicleOrderInvoicePreviewProps {
  invoiceData: LightVehicleOrderInvoiceData;
  selectedTemplate?: VehicleSalesTemplate | null;
}

export function LightVehicleOrderInvoicePreview({ invoiceData, selectedTemplate }: LightVehicleOrderInvoicePreviewProps) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Fetch default template if no template is selected
  const { data: defaultTemplate } = useVehicleSalesTemplateByType('light_vehicle_invoice');
  
  // Use selected template or fall back to default
  const activeTemplate = selectedTemplate !== undefined ? selectedTemplate : defaultTemplate;

  useEffect(() => {
    setLoading(true);
    try {
      // Merge template header into invoice data
      const dataWithTemplate = {
        ...invoiceData,
        customHeaderImageUrl: activeTemplate?.header_image_url || undefined,
      };
      const generatedHtml = generateLightVehicleOrderInvoiceHTML(dataWithTemplate);
      setHtml(generatedHtml);
    } catch (error) {
      console.error('Error generating invoice HTML:', error);
    } finally {
      setLoading(false);
    }
  }, [invoiceData, activeTemplate]);

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
