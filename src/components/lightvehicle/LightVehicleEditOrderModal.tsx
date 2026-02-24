import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LightVehicleEditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  current_phase: string;
  progress_percentage: number;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  notes: string | null;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORDER_PHASES = [
  { value: 'order_confirmation', label: 'Order Confirmation' },
  { value: 'payment_processing', label: 'Payment Processing' },
  { value: 'vehicle_preparation', label: 'Vehicle Preparation' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'delivered', label: 'Delivered' },
];

export function LightVehicleEditOrderModal({
  open,
  onOpenChange,
  orderId,
  onSuccess
}: LightVehicleEditOrderModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  
  // Form state
  const [status, setStatus] = useState('pending');
  const [currentPhase, setCurrentPhase] = useState('order_confirmation');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [actualDeliveryDate, setActualDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && orderId) {
      loadOrder();
    }
  }, [open, orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lightvehicle_orders')
        .select('id, order_number, customer_name, status, current_phase, progress_percentage, expected_delivery_date, actual_delivery_date, notes')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setOrder(data);
      setStatus(data.status || 'pending');
      setCurrentPhase(data.current_phase || 'order_confirmation');
      setProgressPercentage(data.progress_percentage || 0);
      setExpectedDeliveryDate(data.expected_delivery_date || '');
      setActualDeliveryDate(data.actual_delivery_date || '');
      setNotes(data.notes || '');
    } catch (error: any) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!order) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('lightvehicle_orders')
        .update({
          status,
          current_phase: currentPhase,
          progress_percentage: progressPercentage,
          expected_delivery_date: expectedDeliveryDate || null,
          actual_delivery_date: actualDeliveryDate || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order updated successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Order - {order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Name (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">{order.customer_name}</p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Phase */}
          <div className="space-y-2">
            <Label htmlFor="phase">Current Phase</Label>
            <Select value={currentPhase} onValueChange={setCurrentPhase}>
              <SelectTrigger>
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_PHASES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Progress</Label>
              <span className="text-sm font-medium">{progressPercentage}%</span>
            </div>
            <Slider
              value={[progressPercentage]}
              onValueChange={(value) => setProgressPercentage(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Expected Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
            <Input
              id="expectedDelivery"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </div>

          {/* Actual Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="actualDelivery">Actual Delivery Date</Label>
            <Input
              id="actualDelivery"
              type="date"
              value={actualDeliveryDate}
              onChange={(e) => setActualDeliveryDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this order..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
