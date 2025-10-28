import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useYutongInvoiceSignatures } from '@/hooks/useYutongInvoiceSignatures';
import { SignatureCanvasRef } from '@/components/ui/signature-canvas';
import { toast } from 'sonner';
import { Loader2, User, PenTool, Type, Image as ImageIcon } from 'lucide-react';

const SignatureCanvas = ({ width = 500, height = 200, penColor = '#000000', backgroundColor = '#ffffff', ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        setContext(ctx);
      }
    }
  }, [width, height, backgroundColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context) return;
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    context.beginPath();
    context.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    context.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    context.strokeStyle = penColor;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
  };

  const clear = () => {
    if (!context) return;
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  };

  const toDataURL = () => {
    return canvasRef.current?.toDataURL() || '';
  };

  const isEmpty = () => {
    if (!canvasRef.current || !context) return true;
    const pixelData = context.getImageData(0, 0, width, height).data;
    return !pixelData.some((channel, index) => index % 4 !== 3 && channel !== 255);
  };

  useEffect(() => {
    if (props.ref) {
      (props.ref as any).current = { clear, toDataURL, isEmpty };
    }
  }, [context]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      className="border border-border rounded-md cursor-crosshair bg-background"
    />
  );
};

interface YutongInvoiceSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceRecordId: string;
  defaultRole?: 'prepared_by' | 'approved_by' | 'received_by';
  defaultSignerName?: string;
  onSignatureSaved: () => void;
}

export function YutongInvoiceSignatureModal({
  isOpen,
  onClose,
  invoiceRecordId,
  defaultRole = 'prepared_by',
  defaultSignerName = '',
  onSignatureSaved
}: YutongInvoiceSignatureModalProps) {
  const [signatureRole, setSignatureRole] = useState<'prepared_by' | 'approved_by' | 'received_by'>(defaultRole);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [textSignature, setTextSignature] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const signatureCanvasRef = useRef<SignatureCanvasRef>(null);
  const { loading, saveSignature, getProfileSignature, saveProfileSignature } = useYutongInvoiceSignatures();

  useEffect(() => {
    if (isOpen) {
      setSignatureRole(defaultRole);
      setSignerName(defaultSignerName);
      loadProfileSignature();
    }
  }, [isOpen, defaultRole, defaultSignerName]);

  const loadProfileSignature = async () => {
    const profile = await getProfileSignature();
    if (profile.signature_data && profile.signature_type === 'profile') {
      // Profile signature is available
    }
  };

  const handleSave = async () => {
    if (!signerName.trim()) {
      toast.error('Please enter signer name');
      return;
    }

    let signatureData = '';
    let signatureType: 'drawing' | 'text' | 'image' = 'drawing';

    if (activeTab === 'profile') {
      const profile = await getProfileSignature();
      if (!profile.signature_data) {
        toast.error('No profile signature found. Please create one first.');
        return;
      }
      signatureData = profile.signature_data;
      signatureType = profile.signature_type as 'drawing' | 'text' | 'image';
    } else if (activeTab === 'draw') {
      if (signatureCanvasRef.current?.isEmpty()) {
        toast.error('Please draw a signature');
        return;
      }
      signatureData = signatureCanvasRef.current?.toDataURL() || '';
      signatureType = 'drawing';
    } else if (activeTab === 'text') {
      if (!textSignature.trim()) {
        toast.error('Please enter a text signature');
        return;
      }
      signatureData = textSignature;
      signatureType = 'text';
    } else if (activeTab === 'image') {
      if (!selectedImage) {
        toast.error('Please select an image');
        return;
      }
      signatureData = selectedImage;
      signatureType = 'image';
    }

    const success = await saveSignature(
      invoiceRecordId,
      signatureRole,
      signerName,
      signatureData,
      signatureType
    );

    if (success) {
      onSignatureSaved();
      onClose();
      resetForm();
    }
  };

  const handleSaveToProfile = async () => {
    if (activeTab === 'draw') {
      if (signatureCanvasRef.current?.isEmpty()) {
        toast.error('Please draw a signature first');
        return;
      }
      const signatureData = signatureCanvasRef.current?.toDataURL() || '';
      await saveProfileSignature(signatureData, 'drawing');
    } else if (activeTab === 'text') {
      if (!textSignature.trim()) {
        toast.error('Please enter a text signature first');
        return;
      }
      await saveProfileSignature(textSignature, 'text');
    } else if (activeTab === 'image') {
      if (!selectedImage) {
        toast.error('Please select an image first');
        return;
      }
      await saveProfileSignature(selectedImage, 'image');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setSignerName('');
    setTextSignature('');
    setSelectedImage(null);
    signatureCanvasRef.current?.clear();
    setActiveTab('profile');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'prepared_by':
        return 'Prepared By';
      case 'approved_by':
        return 'Approved By';
      case 'received_by':
        return 'Customer';
      default:
        return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Signature - {getRoleLabel(signatureRole)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Signature Role</Label>
              <select
                value={signatureRole}
                onChange={(e) => setSignatureRole(e.target.value as any)}
                className="w-full p-2 border rounded-md"
              >
                <option value="prepared_by">Prepared By</option>
                <option value="approved_by">Approved By</option>
                <option value="received_by">Customer</option>
              </select>
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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="draw" className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Text
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use your saved profile signature
              </p>
            </TabsContent>

            <TabsContent value="draw" className="space-y-4">
              <div className="flex justify-center">
                <SignatureCanvas ref={signatureCanvasRef} width={500} height={200} />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signatureCanvasRef.current?.clear()}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveToProfile}
                >
                  Save to Profile
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <Input
                value={textSignature}
                onChange={(e) => setTextSignature(e.target.value)}
                placeholder="Type your signature"
                className="text-2xl font-serif"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveToProfile}
              >
                Save to Profile
              </Button>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {selectedImage && (
                <div className="flex justify-center">
                  <img src={selectedImage} alt="Signature" className="max-h-40 border rounded" />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveToProfile}
                disabled={!selectedImage}
              >
                Save to Profile
              </Button>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Signature
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
