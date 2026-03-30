// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSinotrukLogisticsManagement, ShippingPartner } from '@/hooks/useSinotrukLogisticsManagement';
import { useSinotrukOrderManagement, SinotrukOrder } from '@/hooks/useSinotrukOrderManagement';
import { Ship } from 'lucide-react';

interface SinotrukCreateShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SinotrukCreateShipmentModal({
  open,
  onClose,
  onSuccess
}: SinotrukCreateShipmentModalProps) {
  const [shippingPartners, setShippingPartners] = useState<ShippingPartner[]>([]);
  const [orders, setOrders] = useState<SinotrukOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    shipping_partner_id: '',
    shipping_method: '',
    container_number: '',
    vessel_name: '',
    scheduled_departure_date: '',
    scheduled_arrival_date: '',
    shipping_cost: '',
    insurance_amount: '',
    special_instructions: '',
  });

  const { 
    getShippingPartners, 
    createShipment 
  } = useSinotrukLogisticsManagement();
  
  const { getOrdersWithDetails } = useSinotrukOrderManagement();

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load shipping partners
      const partnersResult = await getShippingPartners();
      if (partnersResult.success) {
        setShippingPartners(partnersResult.data || []);
      }
      
      // Load orders that don't have shipments yet
      const ordersResult = await getOrdersWithDetails();
      if (ordersResult.success) {
        setOrders((ordersResult.orders || []) as SinotrukOrder[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.order_id || !formData.shipping_partner_id || !formData.shipping_method) {
      return;
    }

    const shipmentData = {
      order_id: formData.order_id,
      shipping_partner_id: formData.shipping_partner_id,
      shipping_method: formData.shipping_method,
      container_number: formData.container_number || undefined,
      vessel_name: formData.vessel_name || undefined,
      scheduled_departure_date: formData.scheduled_departure_date || undefined,
      scheduled_arrival_date: formData.scheduled_arrival_date || undefined,
      shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : undefined,
      insurance_amount: formData.insurance_amount ? parseFloat(formData.insurance_amount) : undefined,
      special_instructions: formData.special_instructions || undefined,
    };

    const result = await createShipment(shipmentData);
    if (result.success) {
      onSuccess();
    }
  };

  const selectedPartner = shippingPartners.find(p => p.id === formData.shipping_partner_id);
  const supportedMethods = selectedPartner?.supported_shipping_methods || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Create New Shipment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order">Order *</Label>
              <Select
                value={formData.order_id}
                onValueChange={(value) => setFormData({ ...formData, order_id: value })}
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_no} - {order.bus_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="partner">Shipping Partner *</Label>
              <Select
                value={formData.shipping_partner_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, shipping_partner_id: value, shipping_method: '' });
                }}
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select shipping partner" />
                </SelectTrigger>
                <SelectContent>
                  {shippingPartners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.partner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="method">Shipping Method *</Label>
              <Select
                value={formData.shipping_method}
                onValueChange={(value) => setFormData({ ...formData, shipping_method: value })}
                required
                disabled={!selectedPartner}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select shipping method" />
                </SelectTrigger>
                <SelectContent>
                  {supportedMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method === 'roro' ? 'RoRo (Roll-on/Roll-off)' : 'Container'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="container">Container Number</Label>
              <Input
                id="container"
                value={formData.container_number}
                onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                placeholder="Enter container number"
                className="mt-1"
                disabled={formData.shipping_method === 'roro'}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vessel">Vessel Name</Label>
            <Input
              id="vessel"
              value={formData.vessel_name}
              onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
              placeholder="Enter vessel name"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departure">Scheduled Departure Date</Label>
              <Input
                id="departure"
                type="date"
                value={formData.scheduled_departure_date}
                onChange={(e) => setFormData({ ...formData, scheduled_departure_date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="arrival">Scheduled Arrival Date</Label>
              <Input
                id="arrival"
                type="date"
                value={formData.scheduled_arrival_date}
                onChange={(e) => setFormData({ ...formData, scheduled_arrival_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shippingCost">Shipping Cost (USD)</Label>
              <Input
                id="shippingCost"
                type="number"
                step="0.01"
                value={formData.shipping_cost}
                onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="insurance">Insurance Amount (USD)</Label>
              <Input
                id="insurance"
                type="number"
                step="0.01"
                value={formData.insurance_amount}
                onChange={(e) => setFormData({ ...formData, insurance_amount: e.target.value })}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              placeholder="Enter any special shipping instructions..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Shipment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}