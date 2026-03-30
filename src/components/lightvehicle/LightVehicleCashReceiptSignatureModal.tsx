// @ts-nocheck
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser } from 'lucide-react';

interface LightVehicleCashReceiptSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signerName: string, signatureData: string) => void;
  signatureType: 'customer' | 'finance';
  existingName?: string;
}

export function LightVehicleCashReceiptSignatureModal({
  open,
  onOpenChange,
  onSave,
  signatureType,
  existingName
}: LightVehicleCashReceiptSignatureModalProps) {
  const [signerName, setSignerName] = useState(existingName || '');
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSave = () => {
    if (!signerName.trim()) return;
    
    const signatureData = sigCanvasRef.current?.toDataURL('image/png') || '';
    if (!signatureData || sigCanvasRef.current?.isEmpty()) {
      return;
    }
    
    onSave(signerName, signatureData);
    onOpenChange(false);
    setSignerName('');
    sigCanvasRef.current?.clear();
  };

  const title = signatureType === 'customer' ? 'Customer Signature' : 'Finance Department Signature';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signature *</Label>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Eraser className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="border rounded-lg bg-white">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="black"
                canvasProps={{
                  width: 380,
                  height: 150,
                  className: 'rounded-lg'
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Draw your signature above</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!signerName.trim()}>
            Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
