import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
import { canvasToMultiPagePDF } from '@/lib/pdf-multi-page';

export interface RegenerateQuotationOptions {
  quotationId: string;
  quotationElement: HTMLElement;
  includeSignatures?: boolean;
}

export const regenerateYutongQuotationPDF = async ({
  quotationId,
  quotationElement,
  includeSignatures = true
}: RegenerateQuotationOptions): Promise<{ success: boolean; pdfBase64?: string; error?: string }> => {
  try {
    // Fetch latest signatures if needed
    if (includeSignatures) {
      const { data: signatures, error: sigError } = await supabase
        .from('yutong_quotation_signatures')
        .select('*')
        .eq('quotation_id', quotationId);

      if (sigError) {
        console.error('Error fetching signatures:', sigError);
      }

      // Signatures are already rendered in the quotationElement
      // This function just generates the PDF
    }

    // Generate PDF from the element
    const canvas = await html2canvas(quotationElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const pdf = canvasToMultiPagePDF(canvas);
    const pdfBase64 = pdf.output('dataurlstring');

    return {
      success: true,
      pdfBase64
    };
  } catch (error) {
    console.error('Error regenerating quotation PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const downloadRegeneratedPDF = (pdfBase64: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = pdfBase64;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
