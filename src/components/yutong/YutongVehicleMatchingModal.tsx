import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Link2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useYutongVehicleDataManagement, VehicleRecord } from '@/hooks/useYutongVehicleDataManagement';
import { toast } from 'sonner';

interface Props {
  vehicle: VehicleRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  model_name: string;
  status: string;
  matchScore: number;
}

export function YutongVehicleMatchingModal({ vehicle, isOpen, onClose, onSuccess }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const { matchVehicleToOrder } = useYutongVehicleDataManagement();

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('yutong_orders')
        .select(`
          id,
          order_no,
          bus_model,
          status,
          quotation:yutong_quotations(customer_name, model_name)
        `)
        .in('status', ['confirmed', 'in_progress', 'production'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate match scores
      const ordersWithScores = (data || []).map((order: any) => {
        let score = 0;
        const orderCustomer = (order.quotation?.customer_name || '').toLowerCase();
        const vehicleCustomer = vehicle.customer_name?.toLowerCase() || '';
        const orderModel = (order.quotation?.model_name || order.bus_model || '').toLowerCase();
        const vehicleModel = vehicle.model?.toLowerCase() || '';

        // Customer name match (40 points max)
        if (vehicleCustomer && orderCustomer) {
          if (orderCustomer === vehicleCustomer) {
            score += 40;
          } else if (orderCustomer.includes(vehicleCustomer) || vehicleCustomer.includes(orderCustomer)) {
            score += 25;
          }
        }

        // Model match (60 points max)
        if (vehicleModel && orderModel) {
          if (orderModel.includes(vehicleModel) || vehicleModel.includes(orderModel)) {
            score += 60;
          }
        }

        return {
          id: order.id,
          order_no: order.order_no,
          customer_name: order.quotation?.customer_name || 'Unknown',
          model_name: order.quotation?.model_name || order.bus_model || 'Unknown',
          status: order.status,
          matchScore: score
        };
      });

      // Sort by match score
      ordersWithScores.sort((a, b) => b.matchScore - a.matchScore);
      setOrders(ordersWithScores);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      o.order_no.toLowerCase().includes(searchLower) ||
      o.customer_name.toLowerCase().includes(searchLower) ||
      o.model_name.toLowerCase().includes(searchLower)
    );
  });

  const handleMatch = async () => {
    if (!selectedOrder) return;
    
    setIsMatching(true);
    try {
      const isAutoMatch = selectedOrder.matchScore >= 80;
      const success = await matchVehicleToOrder(vehicle.id, selectedOrder.id, isAutoMatch);
      if (success) {
        onSuccess();
      }
    } finally {
      setIsMatching(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-500">Excellent Match ({score}%)</Badge>;
    } else if (score >= 50) {
      return <Badge className="bg-yellow-500">Good Match ({score}%)</Badge>;
    } else if (score > 0) {
      return <Badge variant="secondary">Partial Match ({score}%)</Badge>;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Match Vehicle to Order
          </DialogTitle>
          <DialogDescription>
            Select an order to link this vehicle record
          </DialogDescription>
        </DialogHeader>

        {/* Vehicle Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Model</p>
                <p className="font-medium">{vehicle.model}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Engine No</p>
                <p className="font-mono text-xs">{vehicle.engine_no || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Chassis No</p>
                <p className="font-mono text-xs">{vehicle.chassis_no || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Customer</p>
                <p className="font-medium">{vehicle.customer_name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by number, customer, or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Orders List */}
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No matching orders found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map(order => (
                <Card
                  key={order.id}
                  className={`cursor-pointer transition-all ${
                    selectedOrder?.id === order.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{order.order_no}</p>
                          {getScoreBadge(order.matchScore)}
                        </div>
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                        <p className="text-sm">{order.model_name}</p>
                      </div>
                      {selectedOrder?.id === order.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleMatch} disabled={!selectedOrder || isMatching}>
            {isMatching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Match to Order
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
