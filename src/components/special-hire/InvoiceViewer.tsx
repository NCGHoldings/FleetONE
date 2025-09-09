import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download, X } from 'lucide-react';
import { generateInvoiceHTML, type InvoiceData } from '@/lib/invoice-generator';

interface InvoiceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
  onDownload?: () => void;
}

export const InvoiceViewer = ({ isOpen, onClose, invoiceData, onDownload }: InvoiceViewerProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (onDownload) {
      setIsLoading(true);
      try {
        await onDownload();
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Invoice Preview</DialogTitle>
          <div className="flex gap-2">
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isLoading ? 'Generating...' : 'Download PDF'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-white">
          <div 
            className="text-black"
            style={{ 
              minHeight: '800px',
              width: '100%',
              overflow: 'visible'
            }}
            dangerouslySetInnerHTML={{ 
              __html: generateInvoiceHTML(invoiceData) 
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};