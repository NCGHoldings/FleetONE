import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

export const ConductorSubmissionQRGenerator = () => {
  const uploadUrl = `${window.location.origin}/public/conductor-upload`;

  const downloadQR = () => {
    const svg = document.getElementById('conductor-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = 'conductor-upload-qr.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <CardTitle>Conductor Upload QR Code</CardTitle>
        </div>
        <CardDescription>
          Share this QR code with conductors to allow them to upload trip sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-white rounded-lg border">
          <QRCodeSVG
            id="conductor-qr-code"
            value={uploadUrl}
            size={200}
            level="H"
            includeMargin
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Upload URL:</p>
          <code className="block p-2 rounded bg-muted text-xs break-all">
            {uploadUrl}
          </code>
        </div>

        <Button onClick={downloadQR} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Download QR Code
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Conductors can scan this code to access the upload form
        </p>
      </CardContent>
    </Card>
  );
};