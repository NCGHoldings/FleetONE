import { useState, useEffect } from "react";
import { Copy, ExternalLink, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export function ReceiptUploadQRGenerator() {
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    generatePublicURL();
  }, []);

  const generatePublicURL = () => {
    const publicUrl = `${window.location.origin}/public/receipt-upload`;
    setQrValue(publicUrl);
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
        {/* Public URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Public Link</label>
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
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
          <p className="font-medium mb-2">How to use:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Share the link via WhatsApp, email, or SMS with parents</li>
            <li>Print the QR code and display it at the school entrance or office</li>
            <li>Parents can scan the QR code to access the upload form directly</li>
            <li>All submissions will appear in the receipt management table for verification</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
