import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OldSalesRecord } from '@/hooks/useLightVehicleOldSalesManagement';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface LightVehicleOldSalesEditModalProps {
  record: OldSalesRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<OldSalesRecord>) => Promise<boolean>;
}

export function LightVehicleOldSalesEditModal({ record, open, onClose, onSave }: LightVehicleOldSalesEditModalProps) {
  const [formData, setFormData] = useState<Partial<OldSalesRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    }
  }, [record]);

  const handleChange = (field: keyof OldSalesRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericChange = (field: keyof OldSalesRecord, value: string) => {
    const num = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: num }));
  };

  const handleSubmit = async () => {
    if (!record?.id) return;
    setIsSaving(true);
    const success = await onSave(record.id, formData);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Old Sales Record</DialogTitle>
          <DialogDescription>
            Modify details for legacy imported quotation: {record?.quotation_no}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Quotation No</Label>
              <Input 
                value={formData.quotation_no || ''} 
                onChange={e => handleChange('quotation_no', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Quoted Date</Label>
              <Input 
                type="date"
                value={formData.quoted_date || ''} 
                onChange={e => handleChange('quoted_date', e.target.value)} 
              />
            </div>
            
            <div className="col-span-2 space-y-2 pt-2 border-t">
              <Label className="text-primary font-semibold">Customer Information</Label>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input 
                value={formData.customer_name || ''} 
                onChange={e => handleChange('customer_name', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                value={formData.company_name || ''} 
                onChange={e => handleChange('company_name', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={formData.customer_phone || ''} 
                onChange={e => handleChange('customer_phone', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={formData.customer_email || ''} 
                onChange={e => handleChange('customer_email', e.target.value)} 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Textarea 
                value={formData.customer_address || ''} 
                onChange={e => handleChange('customer_address', e.target.value)} 
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-2 pt-2 border-t">
              <Label className="text-primary font-semibold">Vehicle & Pricing</Label>
            </div>
            <div className="space-y-2">
              <Label>Bus Model</Label>
              <Input 
                value={formData.bus_model || ''} 
                onChange={e => handleChange('bus_model', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number"
                value={formData.quantity || 0} 
                onChange={e => handleNumericChange('quantity', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Base Price</Label>
              <Input 
                type="number"
                value={formData.base_price || 0} 
                onChange={e => handleNumericChange('base_price', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>VAT Amount</Label>
              <Input 
                type="number"
                value={formData.vat_amount || 0} 
                onChange={e => handleNumericChange('vat_amount', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Amount</Label>
              <Input 
                type="number"
                value={formData.discount_amount || 0} 
                onChange={e => handleNumericChange('discount_amount', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Final Price</Label>
              <Input 
                type="number"
                value={formData.final_price || 0} 
                onChange={e => handleNumericChange('final_price', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Advance Payment</Label>
              <Input 
                type="number"
                value={formData.advance_payment || 0} 
                onChange={e => handleNumericChange('advance_payment', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Sales Person</Label>
              <Input 
                value={formData.sales_person || ''} 
                onChange={e => handleChange('sales_person', e.target.value)} 
              />
            </div>

            <div className="col-span-2 space-y-2 pt-2 border-t">
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes || ''} 
                onChange={e => handleChange('notes', e.target.value)} 
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
