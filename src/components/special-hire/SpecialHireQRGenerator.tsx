import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, ExternalLink, Bus } from "lucide-react";

export function SpecialHireQRGenerator() {
  const [qrValue, setQrValue] = useState("");
  const [customProductionUrl, setCustomProductionUrl] = useState("");
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const { toast } = useToast();

  // Load saved production URL from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('specialHireProductionUrl');
    if (savedUrl) {
      setCustomProductionUrl(savedUrl);
      const publicURL = `${savedUrl}/public/special-hire`;
      setQrValue(publicURL);
    }
  }, []);

  // Generate the public special hire URL
  const generatePublicURL = () => {
    const baseURL = customProductionUrl || window.location.origin;
    const publicURL = `${baseURL}/public/special-hire`;
    setQrValue(publicURL);
    return publicURL;
  };

  const handleCustomUrlApply = () => {
    if (customProductionUrl && !customProductionUrl.startsWith('http')) {
      toast({
        title: "Invalid URL",
        description: "Please enter a full URL starting with https://",
        variant: "destructive",
      });
      return;
    }
    
    localStorage.setItem('specialHireProductionUrl', customProductionUrl);
    generatePublicURL();
    setIsEditingUrl(false);
    
    toast({
      title: "Production URL Updated",
      description: "QR code will now use your custom domain",
    });
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
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("special-hire-qr");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "special-hire-qr-code.png";
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  const openPublicForm = () => {
    const url = generatePublicURL();
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bus className="w-5 h-5" />
          Public Special Hire Request Link
        </CardTitle>
        <CardDescription>
          Generate a shareable link and QR code for customers to submit special hire requests directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Production Domain Configuration */}
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Production Domain</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingUrl(!isEditingUrl)}
              >
                {isEditingUrl ? 'Cancel' : 'Edit'}
              </Button>
            </div>
            
            {isEditingUrl ? (
              <div className="space-y-2">
                <Input
                  placeholder="https://ncg-fleetflow.lovable.app"
                  value={customProductionUrl}
                  onChange={(e) => setCustomProductionUrl(e.target.value)}
                />
                <Button onClick={handleCustomUrlApply} size="sm">
                  Apply Production URL
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {customProductionUrl || 'Using current domain (preview/staging)'}
              </div>
            )}
            
            {!customProductionUrl && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-3 mt-2">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ You're using a preview/staging domain. Set your production domain above 
                  to generate QR codes with your custom domain (e.g., ncg-fleetflow.lovable.app).
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="public-url">Public Request URL</Label>
            <div className="flex gap-2">
              <Input
                id="public-url"
                value={qrValue || generatePublicURL()}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(qrValue || generatePublicURL())}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={openPublicForm}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeSVG
                id="special-hire-qr"
                value={qrValue || generatePublicURL()}
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={() => generatePublicURL()}>
              Generate New Link
            </Button>
            <Button variant="outline" onClick={downloadQR}>
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How to use:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. Share the link or QR code with customers</li>
            <li>2. Customers fill out the request form with trip details</li>
            <li>3. View submitted requests in the "Submissions" tab</li>
            <li>4. Select a submission to auto-fill the quotation form</li>
            <li>5. Complete the quotation with pricing and send to customer</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}