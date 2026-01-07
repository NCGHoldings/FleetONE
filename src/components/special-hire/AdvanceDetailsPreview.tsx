import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { generateAdvanceDetailsHTML, generateAdvanceDetailsPDF, downloadAdvanceDetailsPDF } from '@/lib/advance-details-generator';
import type { AdvanceDetailsData } from '@/lib/advance-details-generator';
import { toast } from 'sonner';
import { sanitizeHTML } from '@/lib/sanitize';

interface AdvanceDetailsPreviewProps {
  data: AdvanceDetailsData;
  onDownload?: (pdfBase64: string) => void;
}

export default function AdvanceDetailsPreview({ data, onDownload }: AdvanceDetailsPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!previewRef.current) return;

    setGenerating(true);
    try {
      const result = await generateAdvanceDetailsPDF(
        previewRef.current,
        `advance-details-${data.quotationNo}.pdf`
      );

      if (result.success && result.pdfBase64) {
        downloadAdvanceDetailsPDF(result.pdfBase64, `advance-details-${data.quotationNo}.pdf`);
        if (onDownload) {
          onDownload(result.pdfBase64);
        }
        toast.success('PDF downloaded successfully');
      } else {
        toast.error(result.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setGenerating(false);
    }
  };

  const htmlContent = generateAdvanceDetailsHTML(data, '/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleDownload} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      <div
        ref={previewRef}
        className="bg-white border rounded-lg p-8 shadow-sm"
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(htmlContent) }}
      />
    </div>
  );
}
