import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, Pen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SignatureCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ApprovalData) => void;
  approvalType: 'prepared_by' | 'checked_by' | 'approved_by';
  title: string;
  documentId: string;
}

export interface ApprovalData {
  approverName: string;
  signatureData?: string;
  approvalDate: Date;
  approvalType: 'prepared_by' | 'checked_by' | 'approved_by';
}

export const SignatureCaptureModal: React.FC<SignatureCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  approvalType,
  title,
  documentId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [approvalDate, setApprovalDate] = useState<Date>(new Date());
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadNameSuggestions();
      initializeCanvas();
    }
  }, [isOpen]);

  const loadNameSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_name_suggestions')
        .select('name')
        .order('usage_count', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNameSuggestions(data.map(item => item.name));
      }
    } catch (error) {
      console.error('Error loading name suggestions:', error);
    }
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;
    
    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureData = (): string | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // Check if canvas has any drawing (not just white)
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if there's any non-white pixel
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
        return canvas.toDataURL('image/png');
      }
    }
    
    return undefined;
  };

  const handleSave = async () => {
    if (!approverName.trim()) {
      toast.error('Please enter the approver name');
      return;
    }

    const signatureData = getSignatureData();
    
    const approvalData: ApprovalData = {
      approverName: approverName.trim(),
      signatureData,
      approvalDate,
      approvalType,
    };

    try {
      // Save approval to database
      await supabase
        .from('document_approvals')
        .insert({
          document_id: documentId,
          approval_type: approvalType,
          approver_name: approverName.trim(),
          signature_data: signatureData,
          approval_date: format(approvalDate, 'yyyy-MM-dd'),
          user_id: user?.id,
        });

      // Increment name suggestion usage
      await supabase.rpc('increment_name_suggestion', {
        p_name: approverName.trim()
      });

      onSave(approvalData);
      onClose();
      toast.success('Approval signature saved successfully');
    } catch (error) {
      console.error('Error saving approval:', error);
      toast.error('Failed to save approval');
    }
  };

  const selectSuggestion = (name: string) => {
    setApproverName(name);
    setShowSuggestions(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approver-name">Name</Label>
            <div className="relative">
              <Input
                id="approver-name"
                value={approverName}
                onChange={(e) => {
                  setApproverName(e.target.value);
                  setShowSuggestions(e.target.value.length > 0 && nameSuggestions.length > 0);
                }}
                onFocus={() => setShowSuggestions(approverName.length > 0 && nameSuggestions.length > 0)}
                placeholder="Enter your name"
                className="w-full"
              />
              
              {showSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {nameSuggestions
                    .filter(name => name.toLowerCase().includes(approverName.toLowerCase()))
                    .map((name, index) => (
                      <button
                        key={index}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                        onClick={() => selectSuggestion(name)}
                      >
                        {name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !approvalDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {approvalDate ? format(approvalDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={approvalDate}
                  onSelect={(date) => date && setApprovalDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signature (Optional)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
            <div className="border border-gray-300 rounded-md p-2">
              <canvas
                ref={canvasRef}
                className="border border-gray-200 rounded cursor-crosshair w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Pen className="h-3 w-3" />
                Click and drag to draw your signature
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};