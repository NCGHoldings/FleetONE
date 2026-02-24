import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Copy, Download, ExternalLink } from "lucide-react";
import QRCodeLib from 'qrcode';

export default function ComplaintQRGenerator() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Get the current domain and create the public complaint URL
    const currentDomain = window.location.origin;
    const complaintUrl = `${currentDomain}/public/complaint`;
    setPublicUrl(complaintUrl);

    // Generate QR code
    generateQRCode(complaintUrl);
  }, []);

  const generateQRCode = async (url: string) => {
    try {
      const qrCode = await QRCodeLib.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrCode);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = 'complaint-form-qr-code.png';
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Downloaded!",
      description: "QR code image has been downloaded",
    });
  };

  const openPublicForm = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          <CardTitle>Public Complaint Form</CardTitle>
        </div>
        <CardDescription>
          Share this link or QR code with customers to allow them to submit complaints directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Public URL */}
        <div className="space-y-2">
          <Label>Public Complaint Form URL</Label>
          <div className="flex gap-2">
            <Input
              value={publicUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(publicUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openPublicForm}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Customers can access this form without logging in
          </p>
        </div>

        {/* QR Code Display */}
        {qrCodeUrl && (
          <div className="space-y-4">
            <Label>QR Code</Label>
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={qrCodeUrl} 
                  alt="Complaint Form QR Code" 
                  className="w-64 h-64"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadQRCode}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PNG
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(publicUrl)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How to use:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Print the QR code and place it in visible locations</li>
            <li>• Share the URL via email, SMS, or your website</li>
            <li>• Customers can submit complaints anonymously</li>
            <li>• All submissions appear in your complaints dashboard</li>
            <li>• Each complaint gets a unique reference number</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}