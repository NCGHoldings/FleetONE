import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/ui/signature-canvas';
import { useSignatureManagement, ApprovalData, NameSuggestion } from '@/hooks/useSignatureManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eraser, Save, User, Calendar, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ApprovalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  approvalType: 'prepared_by' | 'checked_by' | 'approved_by';
  title: string;
  onSave: (approvalData: ApprovalData) => void;
  existingApproval?: ApprovalData;
}

export const ApprovalSignatureModal: React.FC<ApprovalSignatureModalProps> = ({
  isOpen,
  onClose,
  documentId,
  approvalType,
  title,
  onSave,
  existingApproval,
}) => {
  const [approverName, setApproverName] = useState(existingApproval?.approver_name || '');
  const [approvalDate, setApprovalDate] = useState(
    existingApproval?.approval_date || format(new Date(), 'yyyy-MM-dd')
  );
  const [nameSuggestions, setNameSuggestions] = useState<NameSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [signatureTab, setSignatureTab] = useState<'draw' | 'upload' | 'none'>('draw');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  
  const signatureCanvasRef = useRef<SignatureCanvasRef>(null);
  const { isLoading, saveApproval, getNameSuggestions } = useSignatureManagement();

  useEffect(() => {
    if (isOpen) {
      loadNameSuggestions();
      // Load existing signature for preview
      if (existingApproval?.signature_data) {
        setPreviewSignature(existingApproval.signature_data);
        if (existingApproval.signature_data.startsWith('data:image/')) {
          setUploadedSignature(existingApproval.signature_data);
          setSignatureTab('upload');
        }
      }
    } else {
      // Reset state when modal closes
      setUploadedSignature(null);
      setPreviewSignature(null);
      setSignatureTab('draw');
    }
  }, [isOpen, existingApproval]);

  const loadNameSuggestions = async () => {
    const suggestions = await getNameSuggestions();
    setNameSuggestions(suggestions);
  };

  const handleNameChange = (value: string) => {
    setApproverName(value);
    if (value.length > 0) {
      const filtered = nameSuggestions.filter(s => 
        s.name.toLowerCase().includes(value.toLowerCase())
      );
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectNameSuggestion = (name: string) => {
    setApproverName(name);
    setShowSuggestions(false);
  };

  const clearSignature = () => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Create an image to resize it
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set max dimensions for signature
            const maxWidth = 300;
            const maxHeight = 100;
            
            let { width, height } = img;
            
            // Calculate scaling to fit within max dimensions
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width *= ratio;
              height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and resize image
            ctx?.drawImage(img, 0, 0, width, height);
            
            const resizedDataUrl = canvas.toDataURL('image/png', 0.8);
            setUploadedSignature(resizedDataUrl);
            setPreviewSignature(resizedDataUrl);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedSignature = () => {
    setUploadedSignature(null);
    setPreviewSignature(null);
  };

  const handleSave = async () => {
    if (!approverName.trim()) {
      return;
    }

    let signatureData: string | undefined;
    
    if (signatureTab === 'draw' && signatureCanvasRef.current && !signatureCanvasRef.current.isEmpty()) {
      signatureData = signatureCanvasRef.current.toDataURL('image/png');
    } else if (signatureTab === 'upload' && uploadedSignature) {
      signatureData = uploadedSignature;
    }

    const approvalData: ApprovalData = {
      id: existingApproval?.id,
      document_id: documentId,
      approval_type: approvalType,
      approver_name: approverName.trim(),
      signature_data: signatureData,
      approval_date: approvalDate,
    };

    const result = await saveApproval(approvalData);
    if (result.success) {
      onSave(approvalData);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Name Input with Suggestions */}
          <div className="space-y-2 relative">
            <Label htmlFor="approver-name">Name *</Label>
            <Input
              id="approver-name"
              value={approverName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your name"
              className="w-full"
            />
            
            {/* Name Suggestions Dropdown */}
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {nameSuggestions
                  .filter(s => s.name.toLowerCase().includes(approverName.toLowerCase()))
                  .map((suggestion) => (
                    <button
                      key={suggestion.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                      onClick={() => selectNameSuggestion(suggestion.name)}
                    >
                      {suggestion.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        (used {suggestion.usage_count} times)
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="approval-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date *
            </Label>
            <Input
              id="approval-date"
              type="date"
              value={approvalDate}
              onChange={(e) => setApprovalDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Signature Section */}
          <div className="space-y-4">
            <Label>Signature</Label>
            
            <Tabs value={signatureTab} onValueChange={(v) => setSignatureTab(v as 'draw' | 'upload' | 'none')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="none">No Signature</TabsTrigger>
              </TabsList>
              
              <TabsContent value="draw" className="space-y-4">
                <div className="border border-border rounded-lg p-4 bg-muted/20">
                  <SignatureCanvas
                    ref={signatureCanvasRef}
                    width={500}
                    height={200}
                    className="w-full"
                    backgroundColor="#ffffff"
                  />
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="flex items-center gap-2"
                >
                  <Eraser className="h-4 w-4" />
                  Clear Signature
                </Button>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                {!uploadedSignature ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a signature image (PNG, JPG, max 2MB)
                    </p>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Choose Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-border rounded-lg p-4 bg-muted/20 text-center">
                      <img 
                        src={uploadedSignature} 
                        alt="Uploaded Signature" 
                        className="max-h-24 mx-auto border border-border rounded"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Replace Image
                        </Button>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={removeUploadedSignature}
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="none" className="text-sm text-muted-foreground">
                No signature will be added. Only name and date will be included.
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !approverName.trim()}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Approval'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};