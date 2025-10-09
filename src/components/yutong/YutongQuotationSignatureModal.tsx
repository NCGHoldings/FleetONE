import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/ui/signature-canvas';
import { useYutongSignatures } from '@/hooks/useYutongSignatures';
import { Pencil, Type, Upload, UserCheck } from 'lucide-react';

interface YutongQuotationSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  defaultRole?: 'sales_manager' | 'approved_by' | 'customer';
  defaultSignerName?: string;
  onSignatureSaved: () => void;
}

export const YutongQuotationSignatureModal = ({
  isOpen,
  onClose,
  quotationId,
  defaultRole,
  defaultSignerName,
  onSignatureSaved
}: YutongQuotationSignatureModalProps) => {
  const [signatureRole, setSignatureRole] = useState<'sales_manager' | 'approved_by' | 'customer'>(
    defaultRole || 'sales_manager'
  );
  const [signerName, setSignerName] = useState(defaultSignerName || '');
  const [activeTab, setActiveTab] = useState<'profile' | 'drawing' | 'text' | 'image'>('profile');
  const [textSignature, setTextSignature] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileSignature, setProfileSignature] = useState<{
    data: string | null;
    type: string | null;
  }>({ data: null, type: null });

  const signatureRef = useRef<SignatureCanvasRef>(null);
  const { loading, saveSignature, getProfileSignature } = useYutongSignatures();

  useEffect(() => {
    if (isOpen) {
      loadProfileSignature();
    }
  }, [isOpen]);

  const loadProfileSignature = async () => {
    const signature = await getProfileSignature();
    setProfileSignature({ data: signature.signature_data, type: signature.signature_type });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!signerName.trim()) {
      return;
    }

    let signatureData = '';
    let signatureType: 'drawing' | 'text' | 'image' = 'drawing';

    if (activeTab === 'profile' && profileSignature.data) {
      signatureData = profileSignature.data;
      signatureType = profileSignature.type as any;
    } else if (activeTab === 'drawing') {
      if (signatureRef.current?.isEmpty()) return;
      signatureData = signatureRef.current?.toDataURL() || '';
      signatureType = 'drawing';
    } else if (activeTab === 'text') {
      if (!textSignature.trim()) return;
      signatureData = textSignature;
      signatureType = 'text';
    } else if (activeTab === 'image') {
      if (!imagePreview) return;
      signatureData = imagePreview;
      signatureType = 'image';
    }

    const success = await saveSignature(
      quotationId,
      signatureRole,
      signerName,
      signatureData,
      signatureType
    );

    if (success) {
      onSignatureSaved();
      handleClose();
    }
  };

  const handleClose = () => {
    setSignatureRole(defaultRole || 'sales_manager');
    setSignerName(defaultSignerName || '');
    setTextSignature('');
    setImageFile(null);
    setImagePreview(null);
    setActiveTab('profile');
    signatureRef.current?.clear();
    onClose();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'sales_manager': return 'Sales Manager';
      case 'approved_by': return 'Approved By';
      case 'customer': return 'Customer';
      default: return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add/Update Signature</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signature-role">Signature Position</Label>
              <Select value={signatureRole} onValueChange={(v: any) => setSignatureRole(v)}>
                <SelectTrigger id="signature-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="approved_by">Approved By</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="signer-name">Signer Name</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="drawing" className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Type
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              {profileSignature.data ? (
                <div className="p-6 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-medium mb-3 block">Your Profile Signature</Label>
                  <div className="flex items-center justify-center min-h-[150px] bg-background rounded-md p-4">
                    {profileSignature.type === 'drawing' || profileSignature.type === 'image' ? (
                      <img 
                        src={profileSignature.data} 
                        alt="Profile signature" 
                        className="max-h-[120px] object-contain"
                      />
                    ) : (
                      <div className="text-3xl" style={{ fontFamily: 'cursive' }}>
                        {profileSignature.data}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 border rounded-lg bg-muted/50 text-center">
                  <p className="text-muted-foreground">
                    No profile signature found. Please add one in your profile settings or use another method.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="drawing" className="space-y-4">
              <div className="flex justify-center">
                <SignatureCanvas
                  ref={signatureRef}
                  width={600}
                  height={200}
                  penColor="#000000"
                  backgroundColor="#ffffff"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div>
                <Label htmlFor="text-signature">Type signature</Label>
                <Input
                  id="text-signature"
                  value={textSignature}
                  onChange={(e) => setTextSignature(e.target.value)}
                  placeholder="Signature text"
                  className="text-2xl"
                  style={{ fontFamily: 'cursive' }}
                />
              </div>
              {textSignature && (
                <div className="p-4 border rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <div className="text-4xl" style={{ fontFamily: 'cursive' }}>
                    {textSignature}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <div>
                <Label htmlFor="image-upload">Upload signature image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              {imagePreview && (
                <div className="p-4 border rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <img 
                    src={imagePreview} 
                    alt="Signature preview" 
                    className="max-h-[150px] mx-auto object-contain"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !signerName.trim()}>
            Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
