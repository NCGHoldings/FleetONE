import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eraser, Save, Pen, Type, Image } from 'lucide-react';

interface AdvanceDetailsSignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { data: string; type: 'drawing' | 'text' | 'image' }) => void;
  title: string;
}

export default function AdvanceDetailsSignatureModal({
  open,
  onClose,
  onSave,
  title,
}: AdvanceDetailsSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'drawing' | 'text' | 'image'>('profile');
  const [textSignature, setTextSignature] = useState('');
  const [imageSignature, setImageSignature] = useState<string | null>(null);
  const [profileSignature, setProfileSignature] = useState<{
    data: string | null;
    type: string | null;
  }>({ data: null, type: null });

  useEffect(() => {
    if (open) {
      loadProfileSignature();
      if (activeTab === 'drawing') {
        initializeCanvas();
      }
    }
  }, [open, activeTab]);

  const loadProfileSignature = async () => {
    // Note: This would need the useSignatureManagement hook imported
    // For now, using a placeholder. In production, import and use the hook.
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('signature_data, signature_type')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfileSignature({ 
          data: data.signature_data, 
          type: data.signature_type 
        });
      }
    } catch (error) {
      console.error('Error loading profile signature:', error);
    }
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    initializeCanvas();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSignature(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (activeTab === 'profile') {
      if (!profileSignature.data) return;
      onSave({ data: profileSignature.data, type: profileSignature.type as any });
    } else if (activeTab === 'drawing') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSave({ data: dataUrl, type: 'drawing' });
    } else if (activeTab === 'text') {
      if (!textSignature.trim()) return;
      onSave({ data: textSignature, type: 'text' });
    } else if (activeTab === 'image') {
      if (!imageSignature) return;
      onSave({ data: imageSignature, type: 'image' });
    }
    handleClose();
  };

  const handleClose = () => {
    setTextSignature('');
    setImageSignature(null);
    clearCanvas();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <Pen className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="drawing">
              <Pen className="w-4 h-4 mr-2" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="text">
              <Type className="w-4 h-4 mr-2" />
              Type
            </TabsTrigger>
            <TabsTrigger value="image">
              <Image className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
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
                    Your saved signature will be used
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Pen className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No profile signature found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use other tabs or add signature to your profile
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="drawing" className="space-y-4">
            <div className="border-2 border-border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={700}
                height={200}
                className="cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <Eraser className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div>
              <Label>Type your signature</Label>
              <Input
                value={textSignature}
                onChange={(e) => setTextSignature(e.target.value)}
                placeholder="Enter your name"
                className="text-2xl font-cursive"
                style={{ fontFamily: "'Brush Script MT', cursive" }}
              />
            </div>
            {textSignature && (
              <div className="p-4 border rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <div className="text-3xl" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                  {textSignature}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <div>
              <Label htmlFor="signature-upload">Upload signature image</Label>
              <Input
                id="signature-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            {imageSignature && (
              <div className="p-4 border rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img
                  src={imageSignature}
                  alt="Signature"
                  className="max-h-32 object-contain"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
