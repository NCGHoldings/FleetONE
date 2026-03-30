// @ts-nocheck
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { LightVehicleOrder } from '@/hooks/useLightVehicleOrderManagement';

interface LightVehicleOrderDetailsModalProps {
  order: LightVehicleOrder | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const phaseLabels = {
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

export function LightVehicleOrderDetailsModal({ order, open, onClose, onRefresh }: LightVehicleOrderDetailsModalProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - {(order as any).order_no}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Order Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Number</label>
                <p className="font-mono">{(order as any).order_no}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                <p>{format(new Date((order as any).order_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bus Model</label>
                <p className="font-medium">{(order as any).bus_model}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                <p>{order.quantity}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                <p className="font-bold text-lg">LKR {order.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Mode</label>
                <Badge variant={order.payment_mode === 'cash' ? 'default' : 'secondary'}>
                  {order.payment_mode.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Engine Type</label>
                <p>{(order as any).engine_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gearbox Type</label>
                <p>{(order as any).gearbox_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Seating Capacity</label>
                <p>{(order as any).seating_capacity || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Color Scheme</label>
                <p>{(order as any).color_scheme || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Order Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Phase</label>
                <div className="mt-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    {phaseLabels[order.current_phase as keyof typeof phaseLabels] || order.current_phase}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Progress</label>
                <div className="mt-2 space-y-2">
                  <Progress value={order.progress_percentage || 0} className="w-full" />
                  <p className="text-sm text-muted-foreground">{Math.round(order.progress_percentage || 0)}% Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                  <p className="font-bold text-lg">LKR {order.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Paid</label>
                  <p className="font-bold text-lg text-green-600">LKR {order.total_paid.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Balance Due</label>
                  <p className="font-bold text-lg text-orange-600">LKR {order.balance_due.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Progress</label>
                <div className="mt-2">
                  <Progress 
                    value={(order.total_paid / order.total_amount) * 100} 
                    className="w-full" 
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round((order.total_paid / order.total_amount) * 100)}% Paid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}