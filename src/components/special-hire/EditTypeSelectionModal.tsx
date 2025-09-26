import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { User, Users } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (editType: 'staff_edit' | 'customer_request', reason?: string) => void;
  quotationNo: string;
}

export function EditTypeSelectionModal({ isOpen, onClose, onConfirm, quotationNo }: Props) {
  const [selectedType, setSelectedType] = useState<'staff_edit' | 'customer_request' | null>(null);
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!selectedType) return;
    onConfirm(selectedType, reason);
    onClose();
    setSelectedType(null);
    setReason('');
  };

  const handleCancel = () => {
    onClose();
    setSelectedType(null);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Quotation {quotationNo}</DialogTitle>
          <DialogDescription>
            Please select the type of edit you want to make. This helps us track changes and maintain proper records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff Edit Option */}
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedType === 'staff_edit' 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedType('staff_edit')}
          >
            <div className="flex items-start space-x-3">
              <Users className={`h-5 w-5 mt-0.5 ${
                selectedType === 'staff_edit' ? 'text-primary' : 'text-gray-400'
              }`} />
              <div>
                <h3 className="font-medium">Staff Edit</h3>
                <p className="text-sm text-muted-foreground">
                  Internal correction or update by staff member. This will create a new version without customer notification requirements.
                </p>
              </div>
            </div>
          </div>

          {/* Customer Request Option */}
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedType === 'customer_request' 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedType('customer_request')}
          >
            <div className="flex items-start space-x-3">
              <User className={`h-5 w-5 mt-0.5 ${
                selectedType === 'customer_request' ? 'text-primary' : 'text-gray-400'
              }`} />
              <div>
                <h3 className="font-medium">Customer Request</h3>
                <p className="text-sm text-muted-foreground">
                  Changes requested by the customer. This will create a new version with detailed edit history and may require re-approval.
                </p>
              </div>
            </div>
          </div>

          {/* Reason/Notes field - shown for customer requests */}
          {selectedType === 'customer_request' && (
            <div className="space-y-2">
              <Label htmlFor="edit-reason">Edit Reason/Details *</Label>
              <Textarea
                id="edit-reason"
                placeholder="Please describe what changes were requested by the customer and why..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {selectedType === 'staff_edit' && (
            <div className="space-y-2">
              <Label htmlFor="edit-reason">Edit Reason (Optional)</Label>
              <Textarea
                id="edit-reason"
                placeholder="Brief description of the changes being made..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedType || (selectedType === 'customer_request' && !reason.trim())}
          >
            Continue with Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}