import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/ui/signature-canvas';
import { useYutongSignatures } from '@/hooks/useYutongSignatures';
import { Pencil, Type, Upload, Trash2 } from 'lucide-react';

export const ProfileSignatureManager = () => {
  const [activeTab, setActiveTab] = useState<'drawing' | 'text' | 'image'>('drawing');
  const [textSignature, setTextSignature] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentSignature, setCurrentSignature] = useState<{
    data: string | null;
    type: string | null;
  }>({ data: null, type: null });

  const signatureRef = useRef<SignatureCanvasRef>(null);
  const { loading, getProfileSignature, saveProfileSignature } = useYutongSignatures();

  useEffect(() => {
    loadCurrentSignature();
  }, []);

  const loadCurrentSignature = async () => {
    const signature = await getProfileSignature();
    setCurrentSignature({ data: signature.signature_data, type: signature.signature_type });
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
    let signatureData = '';
    let signatureType: 'drawing' | 'text' | 'image' = activeTab;

    if (activeTab === 'drawing') {
      if (signatureRef.current?.isEmpty()) {
        return;
      }
      signatureData = signatureRef.current?.toDataURL() || '';
    } else if (activeTab === 'text') {
      if (!textSignature.trim()) return;
      signatureData = textSignature;
    } else if (activeTab === 'image') {
      if (!imagePreview) return;
      signatureData = imagePreview;
    }

    const success = await saveProfileSignature(signatureData, signatureType);
    if (success) {
      await loadCurrentSignature();
    }
  };

  const handleClear = () => {
    if (activeTab === 'drawing') {
      signatureRef.current?.clear();
    } else if (activeTab === 'text') {
      setTextSignature('');
    } else if (activeTab === 'image') {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Signature</CardTitle>
        <CardDescription>
          Create your signature to use in Yutong quotations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentSignature.data && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <Label className="text-sm font-medium mb-2 block">Current Signature</Label>
            <div className="flex items-center justify-center min-h-[100px] bg-background rounded-md p-4">
              {currentSignature.type === 'drawing' || currentSignature.type === 'image' ? (
                <img 
                  src={currentSignature.data} 
                  alt="Current signature" 
                  className="max-h-[80px] object-contain"
                />
              ) : (
                <div className="text-2xl" style={{ fontFamily: 'cursive' }}>
                  {currentSignature.data}
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
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

          <TabsContent value="drawing" className="space-y-4">
            <div className="flex justify-center">
              <SignatureCanvas
                ref={signatureRef}
                width={500}
                height={200}
                penColor="#000000"
                backgroundColor="#ffffff"
              />
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div>
              <Label htmlFor="text-signature">Type your signature</Label>
              <Input
                id="text-signature"
                value={textSignature}
                onChange={(e) => setTextSignature(e.target.value)}
                placeholder="Your Name"
                className="text-xl"
                style={{ fontFamily: 'cursive' }}
              />
            </div>
            {textSignature && (
              <div className="p-4 border rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <div className="text-3xl" style={{ fontFamily: 'cursive' }}>
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

        <div className="flex gap-2">
          <Button onClick={handleClear} variant="outline" className="flex-1">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            Save Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
