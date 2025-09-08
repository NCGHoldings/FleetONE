import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download, X, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    document_type: 'sales_receipt' | 'invoice';
    payment_type: 'advance' | 'balance' | 'full';
    document_status: 'draft' | 'approved';
    file_name: string;
    file_size?: number;
    generated_at: string;
    document_data: string; // base64 encoded PDF
  };
  onDownload?: () => void;
}

export const DocumentViewer = ({ 
  isOpen, 
  onClose, 
  document, 
  onDownload 
}: DocumentViewerProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (onDownload) {
      setIsLoading(true);
      try {
        await onDownload();
      } finally {
        setIsLoading(false);
      }
    } else {
      // Default download behavior (robust decoding)
      const arr = toUint8FromAny(document.document_data);
      if (!arr) {
        console.error('Unable to decode document for download');
        return;
      }
      const blob = new Blob([arr], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const normalizeBase64 = (str: string) => {
    let s = (str || '').trim().replace(/\s/g, '');
    if (s.startsWith('data:')) s = s.substring(s.indexOf(',') + 1);
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4;
    if (pad) s += '='.repeat(4 - pad);
    return s;
  };

  const isHexString = (str: string) => /^\\x?[0-9a-fA-F]+$/.test((str || '').trim());

  const hexToUint8Array = (hex: string) => {
    let h = (hex || '').trim();
    if (h.startsWith('\\x')) h = h.slice(2);
    if (h.length % 2 !== 0) return new Uint8Array();
    const arr = new Uint8Array(h.length / 2);
    for (let i = 0; i < h.length; i += 2) arr[i / 2] = parseInt(h.substring(i, i + 2), 16);
    return arr;
  };

  const bufferJsonToUint8 = (str: string): Uint8Array | null => {
    try {
      const obj = JSON.parse(str);
      if (obj && obj.type === 'Buffer' && Array.isArray(obj.data)) return new Uint8Array(obj.data);
    } catch {}
    return null;
  };

  const toUint8FromAny = (raw: string): Uint8Array | null => {
    if (!raw) return null;
    // JSON Buffer format
    const jsonArr = bufferJsonToUint8(raw);
    if (jsonArr) return jsonArr;
    // Hex format (e.g. "\\x25504446...")
    if (isHexString(raw)) return hexToUint8Array(raw);
    // Base64 (normalize first)
    try {
      const b64 = normalizeBase64(raw);
      const byteStr = atob(b64);
      const nums = new Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) nums[i] = byteStr.charCodeAt(i);
      return new Uint8Array(nums);
    } catch (err) {
      console.error('Failed to decode document data', err);
      return null;
    }
  };

  const createPdfBlobUrl = (arr: Uint8Array) => {
    const blob = new Blob([arr], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  const getPdfDataUrl = () => {
    try {
      if (!document.document_data) return '';
      const arr = toUint8FromAny(document.document_data);
      if (!arr) return '';
      // Prefer blob URL for consistent rendering
      return createPdfBlobUrl(arr);
    } catch (error) {
      console.error('Error creating PDF URL:', error);
      return '';
    }
  };

  const getPdfBlob = () => {
    try {
      if (!document.document_data) return '';
      const arr = toUint8FromAny(document.document_data);
      if (!arr) return '';
      return createPdfBlobUrl(arr);
    } catch (error) {
      console.error('Error creating PDF blob URL:', error);
      return '';
    }
  };

  const getDocumentTitle = () => {
    const type = document.document_type === 'sales_receipt' ? 'Sales Receipt' : 'Invoice';
    const status = document.document_status === 'draft' ? ' (DRAFT)' : '';
    return `${type}${status}`;
  };

  const getStatusBadge = () => {
    if (document.document_status === 'draft') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">DRAFT</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">APPROVED</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <DialogTitle>{getDocumentTitle()}</DialogTitle>
            {getStatusBadge()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isLoading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border rounded-lg bg-gray-50">
          {(() => {
            if (!document.document_data) {
              return (
                <div className="flex items-center justify-center h-[70vh] text-muted-foreground">
                  <div className="text-center">
                    <p>Document data not available</p>
                    <p className="text-sm">Please try regenerating the document</p>
                  </div>
                </div>
              );
            }

            const pdfUrl = getPdfDataUrl();
            const blobUrl = getPdfBlob();
            
            if (!pdfUrl && !blobUrl) {
              return (
                <div className="flex items-center justify-center h-[70vh] text-muted-foreground">
                  <div className="text-center">
                    <p>Unable to display document</p>
                    <p className="text-sm">The document data appears to be corrupted</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={handleDownload}
                    >
                      Try Download Instead
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <iframe
                src={blobUrl || pdfUrl}
                className="w-full h-[70vh]"
                title={`${document.document_type} Preview`}
                onError={() => {
                  console.error('Failed to load PDF in iframe');
                }}
              />
            );
          })()}
        </div>

        <div className="text-xs text-muted-foreground pt-2">
          Generated: {new Date(document.generated_at).toLocaleString()} | 
          Size: {document.file_size ? `${(document.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
        </div>
      </DialogContent>
    </Dialog>
  );
};