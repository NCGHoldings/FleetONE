import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureCanvas, SignatureCanvasRef } from "@/components/ui/signature-canvas";
import { useYutongSignatures } from "@/hooks/useYutongSignatures";
import { Pencil, Type, Upload, UserCheck, Check, Loader2 } from "lucide-react";

interface DocumentSignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signerLabel: string;
  onSave: (signatureDataUrl: string, signerName: string) => void;
}

export const DocumentSignaturePad = ({
  open,
  onOpenChange,
  signerLabel,
  onSave,
}: DocumentSignaturePadProps) => {
  const [activeTab, setActiveTab] = useState<"profile" | "drawing" | "text" | "image">("profile");
  const [signerName, setSignerName] = useState("");
  const [textSignature, setTextSignature] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileSignature, setProfileSignature] = useState<{
    data: string | null;
    type: string | null;
  }>({ data: null, type: null });
  const [loadingProfile, setLoadingProfile] = useState(false);

  const signatureRef = useRef<SignatureCanvasRef>(null);
  const { getProfileSignature } = useYutongSignatures();

  // Load profile signature when dialog opens
  useEffect(() => {
    if (open) {
      loadProfileSignature();
    }
  }, [open]);

  const loadProfileSignature = async () => {
    setLoadingProfile(true);
    try {
      const signature = await getProfileSignature();
      setProfileSignature({
        data: signature.signature_data,
        type: signature.signature_type,
      });
    } catch (error) {
      console.error("Error loading profile signature:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    let signatureData = "";

    if (activeTab === "profile" && profileSignature.data) {
      signatureData = profileSignature.data;
      // For text-type profile signatures, generate an image from it
      if (profileSignature.type === "text") {
        signatureData = generateTextSignatureImage(profileSignature.data);
      }
    } else if (activeTab === "drawing") {
      if (signatureRef.current?.isEmpty()) return;
      signatureData = signatureRef.current?.toDataURL() || "";
    } else if (activeTab === "text") {
      if (!textSignature.trim()) return;
      signatureData = generateTextSignatureImage(textSignature);
    } else if (activeTab === "image") {
      if (!imagePreview) return;
      signatureData = imagePreview;
    }

    if (signatureData) {
      // Avoid passing the role label as the user's name if they left it blank,
      // which causes duplicate "VERIFIED BY" text underneath the signature image.
      onSave(signatureData, signerName.trim() || "");
      handleClose();
    }
  };

  const generateTextSignatureImage = (text: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return text;

    ctx.clearRect(0, 0, 400, 100);
    ctx.font = "italic 32px Georgia, 'Times New Roman', cursive, serif";
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 200, 45);

    // Baseline
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(30, 75);
    ctx.lineTo(370, 75);
    ctx.stroke();

    return canvas.toDataURL("image/png");
  };

  const handleClose = () => {
    setSignerName("");
    setTextSignature("");
    setImagePreview(null);
    setActiveTab("profile");
    signatureRef.current?.clear();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Sign as: {signerLabel}
          </DialogTitle>
          <DialogDescription>
            Use your profile signature, draw, type, or upload
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signer Name */}
          <div>
            <Label htmlFor="signer-name-input">Signer Name</Label>
            <Input
              id="signer-name-input"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={signerLabel}
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-1 text-xs">
                <UserCheck className="h-3.5 w-3.5" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="drawing" className="flex items-center gap-1 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-1 text-xs">
                <Type className="h-3.5 w-3.5" />
                Type
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-1 text-xs">
                <Upload className="h-3.5 w-3.5" />
                Upload
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-3 mt-3">
              {loadingProfile ? (
                <div className="p-8 border rounded-lg bg-muted/50 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading profile signature...</p>
                </div>
              ) : profileSignature.data ? (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-medium mb-3 block">Your Profile Signature</Label>
                  <div className="flex items-center justify-center min-h-[120px] bg-background rounded-md p-4">
                    {profileSignature.type === "drawing" || profileSignature.type === "image" ? (
                      <img
                        src={profileSignature.data}
                        alt="Profile signature"
                        className="max-h-[100px] object-contain"
                      />
                    ) : (
                      <div className="text-3xl" style={{ fontFamily: "cursive" }}>
                        {profileSignature.data}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This signature was saved in your profile settings
                  </p>
                </div>
              ) : (
                <div className="p-6 border rounded-lg bg-muted/50 text-center">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No profile signature found. Add one in <strong>Profile → Signature</strong> or use another method.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Draw Tab */}
            <TabsContent value="drawing" className="space-y-3 mt-3">
              <div className="flex justify-center border rounded-lg overflow-hidden">
                <SignatureCanvas
                  ref={signatureRef}
                  width={420}
                  height={150}
                  penColor="#000000"
                  backgroundColor="#ffffff"
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Draw your signature above</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => signatureRef.current?.clear()}
                >
                  Clear
                </Button>
              </div>
            </TabsContent>

            {/* Type Tab */}
            <TabsContent value="text" className="space-y-3 mt-3">
              <div>
                <Label htmlFor="text-sig-input">Type your signature</Label>
                <Input
                  id="text-sig-input"
                  value={textSignature}
                  onChange={(e) => setTextSignature(e.target.value)}
                  placeholder="Your full name"
                  className="text-xl"
                  style={{ fontFamily: "cursive" }}
                />
              </div>
              {textSignature && (
                <div className="p-4 border rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div className="text-3xl" style={{ fontFamily: "cursive" }}>
                    {textSignature}
                  </div>
                  <div className="border-t border-gray-300 mt-3 mx-8" />
                </div>
              )}
            </TabsContent>

            {/* Image Tab */}
            <TabsContent value="image" className="space-y-3 mt-3">
              <div>
                <Label htmlFor="sig-image-upload">Upload signature image</Label>
                <Input
                  id="sig-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              {imagePreview && (
                <div className="p-4 border rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <img
                    src={imagePreview}
                    alt="Signature preview"
                    className="max-h-[120px] mx-auto object-contain"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={
              (activeTab === "profile" && !profileSignature.data) ||
              (activeTab === "drawing" && false) ||
              (activeTab === "text" && !textSignature.trim()) ||
              (activeTab === "image" && !imagePreview)
            }
          >
            <Check className="h-4 w-4 mr-1" />
            Apply Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Post-process rendered HTML to inject signature images near their labels.
 * This works with ANY template regardless of whether it has {{signature}} placeholders.
 */
export const injectSignaturesIntoHtml = (
  html: string,
  signatures: Record<string, { dataUrl: string; name: string }>
): string => {
  if (!html) return html;

  // Map each signature role to the label texts it should match
  const roleLabels: Record<string, string[]> = {
    prepared_by: ["Prepared By", "PREPARED BY", "Prepared by"],
    verified_by: ["Verified By", "VERIFIED BY", "Verified by"],
    approved_by: [
      "Approved By", "APPROVED BY", "Approved by",
      "Authorized By", "AUTHORIZED BY", "Authorized by",
      "Dept. Head Approval", "DEPT. HEAD APPROVAL", "Dept Head Approval",
      "Dept. Head", "DEPT. HEAD",
    ],
    finance_controller: [
      "Finance Controller", "FINANCE CONTROLLER", "Finance controller",
      "Financial Controller", "FINANCIAL CONTROLLER",
    ],
    received_by: [
      "Received By", "RECEIVED BY", "Received by",
      "Received By (Payee)", "RECEIVED BY (PAYEE)",
      "Vendor Acknowledgment", "VENDOR ACKNOWLEDGMENT"
    ],
  };

  for (const [role, sig] of Object.entries(signatures)) {
    if (!sig.dataUrl) continue;

    const labels = roleLabels[role];
    if (!labels) continue;

    const sigImgTag = `<div style="text-align: center; margin-bottom: 4px;"><img src="${sig.dataUrl}" style="max-height: 55px; max-width: 140px; object-fit: contain; display: inline-block;" alt="Signature" /></div>`;
    
    // Only print the signer's name if they provided one AND it is not identical to the role label (prevents duplicate 'VERIFIED BY' lines)
    const isSameAsLabel = labels.some(l => sig.name?.trim().toLowerCase() === l.toLowerCase());
    const nameTag = (sig.name && !isSameAsLabel)
      ? `<div style="text-align: center; font-size: 11px; font-weight: 500; margin-bottom: 2px;">${sig.name}</div>`
      : "";

    for (const label of labels) {
      // Pattern: find any HTML element containing the label text and inject signature above it
      // Handle various template patterns:
      // 1. <div class="sig-line">Label</div>
      // 2. <div>LABEL</div>
      // 3. <td>Label</td> etc.
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      
      // Try to insert before the container that has the label
      // Match: ><label text>< or >label text<
      const regex = new RegExp(
        `(>\\s*)(${escapedLabel})(\\s*<)`,
        "g"
      );
      
      const replacement = `>${sigImgTag}${nameTag}${label}<`;
      const newHtml = html.replace(regex, replacement);
      
      if (newHtml !== html) {
        html = newHtml;
        break; // Only replace the first matching label for this role
      }
    }
  }

  return html;
};
