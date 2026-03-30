import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Package } from 'lucide-react';
import { ShipmentGroup, useLightVehicleShipmentGroupManagement } from '@/hooks/useLightVehicleShipmentGroupManagement';

const phaseLabels: Record<string, string> = {
  'order_confirmation': 'Order Confirmation',
  'lc_issuance': 'LC Issuance',
  'production_order': 'Production Order',
  'manufacturing': 'Manufacturing',
  'shipping_booking': 'Shipping Booking',
  'customs_clearance': 'Customs Clearance',
  'port_operations': 'Port Operations',
  'vehicle_processing': 'Vehicle Processing',
  'rmv_registration': 'RMV Registration',
  'final_inspection': 'Final Inspection',
  'delivery': 'Delivery'
};

const phases = Object.keys(phaseLabels);

interface LightVehicleBulkUpdateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shipment: ShipmentGroup;
}

export function LightVehicleBulkUpdateModal({
  open,
  onClose,
  onSuccess,
  shipment
}: LightVehicleBulkUpdateModalProps) {
  const [selectedPhase, setSelectedPhase] = useState('');
  const { bulkUpdateOrdersPhase, updateShipmentGroup, isLoading } = useLightVehicleShipmentGroupManagement();

  const orders = shipment.orders || [];
  const orderIds = orders.map(o => o.order_id);

  const handleSubmit = async () => {
    if (!selectedPhase || orderIds.length === 0) return;

    const phaseIndex = phases.indexOf(selectedPhase);
    const progressPercentage = Math.round(((phaseIndex + 1) / phases.length) * 100);

    // Update all orders in the shipment
    const result = await bulkUpdateOrdersPhase(orderIds, selectedPhase, progressPercentage);

    if (result.success) {
      // Also update shipment status based on phase
      let newStatus = shipment.status;
      if (selectedPhase === 'shipping_booking' || selectedPhase === 'customs_clearance') {
        newStatus = 'in_transit';
      } else if (selectedPhase === 'delivery') {
        newStatus = 'delivered';
      }

      if (newStatus !== shipment.status) {
        await updateShipmentGroup(shipment.id, { status: newStatus });
      }

      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Bulk Update Orders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{shipment.shipment_name}</span>
            </div>
            <Badge variant="secondary">
              {orderIds.length} Order{orderIds.length !== 1 ? 's' : ''} will be updated
            </Badge>
          </div>

          <div>
            <Label htmlFor="phase">New Phase for All Orders</Label>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select new phase" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(phaseLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPhase && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
              <p className="font-medium mb-1">Phase Change Impact:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>All {orderIds.length} orders will move to "{phaseLabels[selectedPhase]}"</li>
                <li>Progress percentage will update automatically</li>
                {(selectedPhase === 'shipping_booking' || selectedPhase === 'customs_clearance') && (
                  <li>Shipment status will change to "In Transit"</li>
                )}
                {selectedPhase === 'delivery' && (
                  <li>Shipment status will change to "Delivered"</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedPhase || isLoading}
          >
            {isLoading ? 'Updating...' : 'Update All Orders'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
