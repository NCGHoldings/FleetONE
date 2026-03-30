// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Package, Search, User, Building2, Bus } from 'lucide-react';
import { format } from 'date-fns';
import { ShipmentGroup, useSinotrukShipmentGroupManagement } from '@/hooks/useSinotrukShipmentGroupManagement';

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

interface SinotrukAddOrdersToShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shipment: ShipmentGroup;
}

export function SinotrukAddOrdersToShipmentModal({
  open,
  onClose,
  onSuccess,
  shipment
}: SinotrukAddOrdersToShipmentModalProps) {
  const [unassignedOrders, setUnassignedOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const { getUnassignedOrders, addOrdersToGroup, isLoading } = useSinotrukShipmentGroupManagement();

  useEffect(() => {
    if (open) {
      loadUnassignedOrders();
    }
  }, [open]);

  const loadUnassignedOrders = async () => {
    setLoading(true);
    const result = await getUnassignedOrders();
    if (result.success) {
      setUnassignedOrders(result.data || []);
    }
    setLoading(false);
  };

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedOrderIds.length === 0) return;

    const result = await addOrdersToGroup(shipment.id, selectedOrderIds);
    if (result.success) {
      setSelectedOrderIds([]);
      onSuccess();
      onClose();
    }
  };

  const filteredOrders = unassignedOrders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    const quotation = order.sinotruck_quotations;
    return (
      order.order_no?.toLowerCase().includes(searchLower) ||
      order.bus_model?.toLowerCase().includes(searchLower) ||
      quotation?.customer_name?.toLowerCase().includes(searchLower) ||
      quotation?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Orders to {shipment.shipment_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders by number, model, or customer..."
              className="pl-10"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredOrders.length === 0}
            >
              {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Button>
            <Badge variant="secondary">
              {selectedOrderIds.length} selected
            </Badge>
          </div>

          {/* Orders List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="h-10 w-10 mb-2 opacity-50" />
                <p>No unassigned orders available</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const quotation = order.sinotruck_quotations;
                  const isSelected = selectedOrderIds.includes(order.id);

                  return (
                    <div
                      key={order.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleToggleOrder(order.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleOrder(order.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-medium">{order.order_no}</span>
                            <Badge variant="outline">
                              {phaseLabels[order.current_phase] || order.current_phase}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Bus className="h-3 w-3" />
                              {order.bus_model} × {order.quantity}
                            </div>
                            {quotation?.customer_name && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {quotation.customer_name}
                              </div>
                            )}
                            {quotation?.company_name && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {quotation.company_name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Order Date: {format(new Date(order.order_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedOrderIds.length === 0 || isLoading}
          >
            {isLoading 
              ? 'Adding...' 
              : `Add ${selectedOrderIds.length} Order${selectedOrderIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
