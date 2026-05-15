// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, Edit, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { EnhancedLightVehicleOrderDetailsModal } from './EnhancedLightVehicleOrderDetailsModal';
import { LightVehicleCreateOrderModal } from './LightVehicleCreateOrderModal';
import { LightVehicleEditOrderModal } from './LightVehicleEditOrderModal';

interface LightVehicleOrder {
  id: string;
  order_number: string;
  customer_name: string;
  company_name?: string;
  vehicle_name: string;
  brand?: string;
  quantity: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  status: string;
  current_phase: string;
  progress_percentage: number;
  expected_delivery_date?: string;
  created_at: string;
}

export function LightVehicleOrdersList() {
  const [orders, setOrders] = useState<LightVehicleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const { toast } = useToast();

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsModalOpen(true);
  };

  const handleEditOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setEditModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processing: 'default',
      shipped: 'default',
      delivered: 'default',
      cancelled: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Light Vehicle Orders</CardTitle>
            <Button onClick={() => setCreateOrderModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Order
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found. Orders are created from confirmed quotations.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{order.order_number}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm font-medium">{order.customer_name}</p>
                      {order.company_name && (
                        <p className="text-sm text-muted-foreground">{order.company_name}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {order.vehicle_name} {order.brand && `(${order.brand})`} x {order.quantity}
                      </p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs font-mono">
                          <span className="text-muted-foreground">ENG:</span>{' '}
                          {(order as any).engine_number ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{(order as any).engine_number}</span>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </span>
                        <span className="text-xs font-mono">
                          <span className="text-muted-foreground">CHS:</span>{' '}
                          {(order as any).chassis_number ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{(order as any).chassis_number}</span>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold">Rs {order.total_amount.toLocaleString()}</p>
                      <p className="text-sm text-green-600">Paid: Rs {order.total_paid.toLocaleString()}</p>
                      <p className="text-sm text-destructive">Balance: Rs {order.balance_due.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{order.current_phase.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{order.progress_percentage}%</span>
                    </div>
                    <Progress value={order.progress_percentage} className="h-2" />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Created: {format(new Date(order.created_at), 'dd/MM/yyyy')}
                      {order.expected_delivery_date && (
                        <span> | Expected: {format(new Date(order.expected_delivery_date), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewOrder(order.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditOrder(order.id)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrderId && (
        <>
          <EnhancedLightVehicleOrderDetailsModal
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
            orderId={selectedOrderId}
            onRefresh={loadOrders}
          />
          <LightVehicleEditOrderModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            orderId={selectedOrderId}
            onSuccess={loadOrders}
          />
        </>
      )}

      <LightVehicleCreateOrderModal
        open={createOrderModalOpen}
        onOpenChange={setCreateOrderModalOpen}
        onSuccess={loadOrders}
      />
    </>
  );
}
