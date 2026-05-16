import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, QrCode, MessageSquare, Mail, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export const ConductorPortalQuickActions = () => {
  const { toast } = useToast();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [isPortalExpanded, setIsPortalExpanded] = useState(false);
  const uploadUrl = `${window.location.origin}/public/conductor-upload`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const downloadQR = () => {
    const canvas = document.createElement('canvas');
    const svg = document.getElementById('conductor-qr-code') as unknown as SVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = 'conductor-upload-qr.png';
            link.href = URL.createObjectURL(blob);
            link.click();
          }
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;

    toast({
      title: "Downloaded",
      description: "QR code saved as PNG",
    });
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `🚌 Conductor Trip Sheet Upload\n\n` +
      `Please upload your trip sheet images using this link:\n${uploadUrl}\n\n` +
      `Instructions:\n` +
      `1. Open the link\n` +
      `2. Fill in your details (Name, Phone, Bus Number)\n` +
      `3. Upload clear photos of your trip sheet\n` +
      `4. Submit\n\n` +
      `Thank you!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Conductor Trip Sheet Upload Link');
    const body = encodeURIComponent(
      `Hello,\n\n` +
      `Please use the following link to upload your trip sheet images:\n\n` +
      `${uploadUrl}\n\n` +
      `Instructions:\n` +
      `1. Open the link above\n` +
      `2. Fill in your name, phone number, and bus number\n` +
      `3. Upload clear photos of your trip sheet\n` +
      `4. Click Submit\n\n` +
      `Your submission will be reviewed by our team.\n\n` +
      `Thank you!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <Collapsible open={isPortalExpanded} onOpenChange={setIsPortalExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Conductor Upload Portal
                  </CardTitle>
                  <CardDescription>
                    Share this link or QR code with conductors to submit trip sheets
                  </CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isPortalExpanded ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Mini QR Code Preview */}
              <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg">
                  <QRCodeSVG value={uploadUrl} size={80} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">Upload URL</p>
                  <p className="text-xs text-muted-foreground break-all mb-3">{uploadUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(uploadUrl, "Upload link")}
                    >
                      <Copy className="mr-2 h-3 w-3" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(uploadUrl, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQrModalOpen(true)}
                    >
                      <QrCode className="mr-2 h-3 w-3" />
                      Full QR
                    </Button>
                  </div>
                </div>
              </div>

              {/* Share Actions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Share via:</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={shareViaWhatsApp}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={shareViaEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                  <ChevronDown className={`h-4 w-4 transition-transform ${instructionsOpen ? 'rotate-180' : ''}`} />
                  Instructions for Conductors
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open the upload link or scan the QR code</li>
                    <li>Enter your name and phone number</li>
                    <li>Enter the bus number</li>
                    <li>Take clear photos of your trip sheet (both sides if needed)</li>
                    <li>Upload the images (up to 5 images)</li>
                    <li>Click Submit and save your submission code</li>
                  </ol>
                  <p className="text-xs mt-2 italic">
                    Submissions will be processed and reviewed by our team. You'll be notified once reviewed.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Full QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conductor Upload QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 bg-white rounded-lg">
              <QRCodeSVG
                id="conductor-qr-code"
                value={uploadUrl}
                size={256}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Scan this QR code to upload trip sheets
            </p>
            <div className="flex gap-2 w-full">
              <Button onClick={downloadQR} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
              <Button variant="outline" onClick={() => copyToClipboard(uploadUrl, "Link")} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
