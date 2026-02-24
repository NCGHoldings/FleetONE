import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser } from 'lucide-react';

interface LightVehicleInvoiceSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signerName: string, signatureData: string) => void;
  role: 'prepared_by' | 'approved_by' | 'received_by';
  existingName?: string;
}

const roleLabels = {
  prepared_by: 'Prepared By',
  approved_by: 'Approved By',
  received_by: 'Received By'
};

export function LightVehicleInvoiceSignatureModal({
  open,
  onOpenChange,
  onSave,
  role,
  existingName
}: LightVehicleInvoiceSignatureModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {roleLabels[role]} Signature</DialogTitle>
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
