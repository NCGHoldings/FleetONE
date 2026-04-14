// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Ship, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Package,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ShipmentGroup } from '@/hooks/useSinotrukShipmentGroupManagement';
import { SinotrukOrderCard } from './SinotrukOrderCard';

const statusColors: Record<string, string> = {
  'planning': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'confirmed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'in_transit': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'customs': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'delivered': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  'planning': 'Planning',
  'confirmed': 'Confirmed',
  'in_transit': 'In Transit',
  'customs': 'Customs',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
};

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

interface SinotrukShipmentGroupCardProps {
  shipment: ShipmentGroup;
  onEdit: (shipment: ShipmentGroup) => void;
  onDelete: (shipment: ShipmentGroup) => void;
  onAddOrders: (shipment: ShipmentGroup) => void;
  onBulkUpdate: (shipment: ShipmentGroup) => void;
  onViewOrder: (order: any) => void;
}

export function SinotrukShipmentGroupCard({
  shipment,
  onEdit,
  onDelete,
  onAddOrders,
  onBulkUpdate,
  onViewOrder
}: SinotrukShipmentGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const orders = shipment.orders || [];
  const totalAmount = orders.reduce((sum, o) => sum + (o.order?.total_amount || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.order?.total_paid || 0), 0);
  const paymentPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-all duration-200 bg-gradient-to-br from-card to-card/90">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Ship className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-mono font-semibold text-lg">{shipment.shipment_no}</h3>
                  <p className="text-sm text-muted-foreground">{shipment.shipment_name}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={statusColors[shipment.status]} variant="secondary">
                  {statusLabels[shipment.status]}
                </Badge>
                {shipment.current_phase && (
                  <Badge variant="outline">
                    {phaseLabels[shipment.current_phase] || shipment.current_phase}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <Package className="h-3 w-3" />
                  {orders.length} Order{orders.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Summary Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
            <div className="text-sm">
              <div className="text-muted-foreground mb-1 flex items-center gap-1">
                <Ship className="h-3 w-3" />
                Vessel
              </div>
              <div className="font-medium">{shipment.vessel_name || 'Not assigned'}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Departure
              </div>
              <div className="font-medium">
                {shipment.expected_departure_date 
                  ? format(new Date(shipment.expected_departure_date), 'MMM dd, yyyy')
                  : 'TBD'}
              </div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Arrival
              </div>
              <div className="font-medium">
                {shipment.expected_arrival_date 
                  ? format(new Date(shipment.expected_arrival_date), 'MMM dd, yyyy')
                  : 'TBD'}
              </div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground mb-1">Total Value</div>
              <div className="font-medium">LKR {totalAmount.toLocaleString()}</div>
            </div>
          </div>

          {/* Payment Progress */}
          {orders.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Payment Progress</span>
                <span>{Math.round(paymentPercentage)}%</span>
              </div>
              <Progress value={paymentPercentage} className="h-2" />
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Orders Grid */}
            {orders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {orders.map((orderLink) => (
                  <SinotrukOrderCard
                    key={orderLink.id}
                    order={orderLink.order}
                    onViewDetails={onViewOrder}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg mb-4">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No orders in this shipment</p>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => onAddOrders(shipment)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add orders now
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => onEdit(shipment)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onAddOrders(shipment)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Orders
              </Button>
              {orders.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => onBulkUpdate(shipment)}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Bulk Update
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(shipment)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
