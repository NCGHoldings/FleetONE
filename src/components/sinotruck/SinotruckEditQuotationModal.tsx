// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SinotruckQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  truck_model_id: string;
  truck_model_name: string;
  quantity: number;
  unit_price: number;
  charger_price?: number;
  total_price: number;
  payment_terms?: string;
  status: string;
  quotation_date: string;
  valid_until: string;
}

interface SinotruckEditQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: SinotruckQuotation | null;
  onUpdate: () => void;
}

export function SinotruckEditQuotationModal({
  isOpen,
  onClose,
  quotation,
  onUpdate
}: SinotruckEditQuotationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<SinotruckQuotation>>({});

  useEffect(() => {
    if (quotation) {
      setFormData(quotation);
    }
  }, [quotation]);

  if (!quotation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sinotruck_quotations')
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          customer_address: formData.customer_address,
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          charger_price: formData.charger_price,
          total_price: (formData.unit_price || 0) * (formData.quantity || 0) + ((formData.charger_price || 0) * (formData.quantity || 0)),
          payment_terms: formData.payment_terms,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', quotation.id);

      if (error) throw error;

      toast.success('Quotation updated successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating quotation:', error);
      toast.error('Failed to update quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quotation - {quotation.quotation_no}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Customer Details</h3>
            
            <div>
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name || ''}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="customer_phone">Phone *</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone || ''}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="customer_email">Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email || ''}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="customer_address">Address</Label>
              <Textarea
                id="customer_address"
                value={formData.customer_address || ''}
                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Product Details</h3>
            
            <div>
              <Label>Truck Model</Label>
              <Input value={formData.truck_model_name || ''} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="unit_price">Unit Price (LKR) *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  min="0"
                  value={formData.unit_price || ''}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="charger_price">Charger Price (LKR)</Label>
              <Input
                id="charger_price"
                type="number"
                min="0"
                value={formData.charger_price || ''}
                onChange={(e) => setFormData({ ...formData, charger_price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Total Price</Label>
              <Input
                value={((formData.unit_price || 0) * (formData.quantity || 0) + ((formData.charger_price || 0) * (formData.quantity || 0))).toLocaleString()}
                disabled
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Textarea
              id="payment_terms"
              value={formData.payment_terms || ''}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              rows={4}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Quotation'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
