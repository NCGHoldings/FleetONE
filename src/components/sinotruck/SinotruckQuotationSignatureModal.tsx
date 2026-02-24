import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/ui/signature-canvas';
import { Pencil, Type, Upload, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SinotruckQuotationSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  defaultRole?: 'customer' | 'finance_department' | 'sales_manager';
  defaultSignerName?: string;
  onSignatureSaved: () => void;
}

export const SinotruckQuotationSignatureModal = ({
  isOpen,
  onClose,
  quotationId,
  defaultRole,
  defaultSignerName,
  onSignatureSaved
}: SinotruckQuotationSignatureModalProps) => {
  const [signatureRole, setSignatureRole] = useState<'customer' | 'finance_department' | 'sales_manager'>(
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
  const [loading, setLoading] = useState(false);

  const signatureRef = useRef<SignatureCanvasRef>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfileSignature();
    }
  }, [isOpen]);

  const loadProfileSignature = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('signature_data, signature_type')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfileSignature({ 
        data: data?.signature_data || null, 
        type: data?.signature_type || null 
      });
    } catch (error) {
      console.error('Error loading profile signature:', error);
    }
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
      toast.error('Please enter signer name');
      return;
    }

    let signatureData = '';
    let signatureType: 'drawing' | 'text' | 'image' = 'drawing';

    if (activeTab === 'profile' && profileSignature.data) {
      signatureData = profileSignature.data;
      signatureType = profileSignature.type as any;
    } else if (activeTab === 'drawing') {
      if (signatureRef.current?.isEmpty()) {
        toast.error('Please draw a signature');
        return;
      }
      signatureData = signatureRef.current?.toDataURL() || '';
      signatureType = 'drawing';
    } else if (activeTab === 'text') {
      if (!textSignature.trim()) {
        toast.error('Please enter text signature');
        return;
      }
      signatureData = textSignature;
      signatureType = 'text';
    } else if (activeTab === 'image') {
      if (!imagePreview) {
        toast.error('Please upload signature image');
        return;
      }
      signatureData = imagePreview;
      signatureType = 'image';
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('sinotruck_quotation_signatures')
        .upsert({
          quotation_id: quotationId,
          signature_role: signatureRole,
          signer_name: signerName,
          signature_data: signatureData,
          signature_type: signatureType,
          signed_by: user?.id || null,
          signed_at: new Date().toISOString()
        }, {
          onConflict: 'quotation_id,signature_role'
        });

      if (error) throw error;

      toast.success('Signature saved successfully');
      onSignatureSaved();
      handleClose();
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature');
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Signature</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Signature Role</Label>
              <Select value={signatureRole} onValueChange={(v: any) => setSignatureRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="finance_department">Finance Department</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Signer Name</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">
                <UserCheck className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="drawing">
                <Pencil className="w-4 h-4 mr-2" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="w-4 h-4 mr-2" />
                Type
              </TabsTrigger>
              <TabsTrigger value="image">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg p-6">
                {profileSignature.data ? (
                  <div className="space-y-4 w-full">
                    <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                      {profileSignature.type === 'drawing' || profileSignature.type === 'image' ? (
                        <img 
                          src={profileSignature.data} 
                          alt="Profile signature"
                          className="max-h-[150px] object-contain"
                        />
                      ) : (
                        <div className="text-3xl font-signature" style={{ fontFamily: 'cursive' }}>
                          {profileSignature.data}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      This is your saved signature
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <UserCheck className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No signature saved in your profile
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use other tabs or go to Profile page to add signature
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="drawing" className="space-y-4 mt-4">
              <div className="border rounded-lg p-4 bg-white">
                <SignatureCanvas ref={signatureRef} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signatureRef.current?.clear()}
                className="w-full"
              >
                Clear Canvas
              </Button>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Type Your Signature</Label>
                <Input
                  value={textSignature}
                  onChange={(e) => setTextSignature(e.target.value)}
                  placeholder="Enter your signature"
                  className="text-2xl font-signature"
                  style={{ fontFamily: 'cursive' }}
                />
              </div>
              {textSignature && (
                <div className="border rounded-lg p-8 bg-muted/50 text-center">
                  <div className="text-4xl font-signature" style={{ fontFamily: 'cursive' }}>
                    {textSignature}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="image" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Upload Signature Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              {imagePreview && (
                <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Signature preview"
                    className="max-h-[200px] object-contain"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !signerName.trim()}>
            {loading ? 'Saving...' : 'Save Signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
