import { useState, useEffect } from "react";
import { Copy, ExternalLink, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export function ReceiptUploadQRGenerator() {
  const [qrValue, setQrValue] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    generatePublicURL();
  }, []);

  const generatePublicURL = () => {
    const currentOrigin = window.location.origin;
    const publicUrl = `${currentOrigin}/public/receipt-upload`;
    setQrValue(publicUrl);
  };

  const isPreviewEnvironment = window.location.hostname.includes('lovable.app') || 
                                window.location.hostname.includes('localhost');

  const handleCustomUrlApply = () => {
    if (customUrl.trim()) {
      try {
        const url = new URL(customUrl);
        const fullUrl = `${url.origin}/public/receipt-upload`;
        setQrValue(fullUrl);
        setIsEditing(false);
        toast({
          title: "URL Updated",
          description: "QR code now uses your production URL",
        });
      } catch {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid URL (e.g., https://yourdomain.com)",
          variant: "destructive",
        });
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("receipt-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "receipt-upload-qr-code.png";
          a.click();
          URL.revokeObjectURL(url);
          toast({
            title: "QR Code Downloaded",
            description: "QR code saved successfully",
          });
        }
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const openPublicForm = () => {
    window.open(qrValue, "_blank");
  };

  if (!qrValue) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Public Receipt Upload Link
        </CardTitle>
        <CardDescription>
          Share this link or QR code with parents to upload payment receipts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Warning */}
        {isPreviewEnvironment && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
              ⚠️ Preview/Development Environment Detected
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You're on a preview URL. For production use, enter your live domain below to generate the correct QR code.
            </p>
          </div>
        )}

        {/* Custom URL Override */}
        {isEditing ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Production URL Override</label>
            <div className="flex gap-2">
              <Input 
                value={customUrl} 
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="flex-1"
              />
              <Button onClick={handleCustomUrlApply} size="sm">
                Apply
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your production domain to generate QR code for live use
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Current Public Link</label>
              {isPreviewEnvironment && (
                <Button onClick={() => setIsEditing(true)} variant="link" size="sm">
                  Set Production URL
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input value={qrValue} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(qrValue)}
                title="Copy link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={openPublicForm}
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4 p-6 bg-muted/30 rounded-lg">
          <QRCodeSVG
            id="receipt-qr-code"
            value={qrValue}
            size={200}
            level="H"
            includeMargin
          />
          <Button onClick={downloadQR} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-100">
          <p className="font-medium mb-2">How to use:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-200">
            <li>Share the link via WhatsApp, email, or SMS with parents</li>
            <li>Print the QR code and display it at the school entrance or office</li>
            <li>Parents can scan the QR code to access the upload form directly</li>
            <li>All submissions will appear in the receipt management table for verification</li>
            <li className="font-medium">No login required - Parents can upload receipts anonymously</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
