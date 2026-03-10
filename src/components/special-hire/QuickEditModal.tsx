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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  quotation: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function QuickEditModal({ quotation, onClose, onUpdate }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: quotation.customer_name || '',
    customer_phone: quotation.customer_phone || '',
    customer_email: quotation.customer_email || '',
    company_name: quotation.company_name || '',
    special_request: quotation.special_request || '',
    pickup_location: quotation.pickup_location || '',
    drop_location: quotation.drop_location || '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name and phone are required.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const changedFields: string[] = [];
      const updateData: Record<string, any> = {};

      for (const [key, value] of Object.entries(form)) {
        const original = quotation[key] || '';
        if (value !== original) {
          changedFields.push(key.replace(/_/g, ' '));
          updateData[key] = value || null;
        }
      }

      if (changedFields.length === 0) {
        toast({ title: "No Changes", description: "No fields were modified." });
        onClose();
        return;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('special_hire_quotations')
        .update(updateData)
        .eq('id', quotation.id);

      if (error) throw error;

      toast({
        title: "Updated Successfully",
        description: `Changed: ${changedFields.join(', ')}`
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Quick edit error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update quotation',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick Edit — {quotation.quotation_no}</DialogTitle>
          <DialogDescription>
            Update customer details and notes without changing the quotation price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qe-name">Customer Name *</Label>
              <Input
                id="qe-name"
                value={form.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qe-phone">Phone *</Label>
              <Input
                id="qe-phone"
                value={form.customer_phone}
                onChange={(e) => handleChange('customer_phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qe-email">Email</Label>
              <Input
                id="qe-email"
                type="email"
                value={form.customer_email}
                onChange={(e) => handleChange('customer_email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qe-company">Company Name</Label>
              <Input
                id="qe-company"
                value={form.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qe-pickup">Pickup Location (display only)</Label>
            <Input
              id="qe-pickup"
              value={form.pickup_location}
              onChange={(e) => handleChange('pickup_location', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qe-drop">Drop Location (display only)</Label>
            <Input
              id="qe-drop"
              value={form.drop_location}
              onChange={(e) => handleChange('drop_location', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qe-request">Special Request / Notes</Label>
            <Textarea
              id="qe-request"
              value={form.special_request}
              onChange={(e) => handleChange('special_request', e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            💡 This edit will <strong>not</strong> change the quotation price or create a new version. Only informational fields are updated.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
