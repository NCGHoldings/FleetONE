import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Eye, User, Building2, Bus, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { LightVehicleOrder } from '@/hooks/useLightVehicleOrderManagement';

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

const phaseColors: Record<string, string> = {
  'order_confirmation': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'lc_issuance': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'production_order': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'manufacturing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'shipping_booking': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'customs_clearance': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'port_operations': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  'vehicle_processing': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'rmv_registration': 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  'final_inspection': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'delivery': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
};

interface LightVehicleOrderCardProps {
  order: LightVehicleOrder & { lightvehicle_quotations?: any };
  onViewDetails: (order: LightVehicleOrder) => void;
  compact?: boolean;
}

export function LightVehicleOrderCard({ order, onViewDetails, compact = false }: LightVehicleOrderCardProps) {
  if (!order) return null;
  
  const quotation = order.lightvehicle_quotations;
  const customerName = quotation?.customer_name || 'N/A';
  const companyName = quotation?.company_name;
  const paymentPercentage = order.total_amount > 0 ? (order.total_paid / order.total_amount) * 100 : 0;

  if (compact) {
    return (
      <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-sm font-medium">{(order as any).order_no}</span>
          <Badge className={phaseColors[order.current_phase] || 'bg-muted text-muted-foreground'} variant="secondary">
            {phaseLabels[order.current_phase] || order.current_phase}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mb-2">{(order as any).bus_model}</div>
        <div className="flex items-center justify-between">
          <Progress value={paymentPercentage} className="h-2 flex-1 mr-2" />
          <span className="text-xs text-muted-foreground">{Math.round(paymentPercentage)}%</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30 bg-gradient-to-br from-card to-card/80">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-mono font-semibold text-lg">{(order as any).order_no}</h3>
            <Badge className={phaseColors[order.current_phase] || 'bg-muted'} variant="secondary">
              {phaseLabels[order.current_phase] || order.current_phase}
            </Badge>
          </div>
          <Badge 
            variant={order.status === 'confirmed' ? 'default' : 'secondary'}
            className={order.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
          >
            {order.status}
          </Badge>
        </div>

        {/* Customer Info */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{customerName}</span>
          </div>
          {companyName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{companyName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bus className="h-4 w-4" />
            <span>{(order as any).bus_model} × {order.quantity}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date((order as any).order_date), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {/* Financial Info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">LKR {order.total_amount.toLocaleString()}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid: LKR {order.total_paid.toLocaleString()}</span>
              <span>{Math.round(paymentPercentage)}%</span>
            </div>
            <Progress value={paymentPercentage} className="h-2" />
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Order Progress</span>
            <span>{order.progress_percentage}%</span>
          </div>
          <Progress value={order.progress_percentage} className="h-2" />
        </div>

        {/* Actions */}
        <Button 
          variant="outline" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={() => onViewDetails(order)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
