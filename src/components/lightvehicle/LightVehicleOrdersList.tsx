import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, Edit, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
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
            <div className="text-muted-foreground">Loading orders...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Light Vehicle Orders</CardTitle>
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
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold">LKR {order.total_amount.toLocaleString()}</p>
                    <p className="text-sm text-green-600">Paid: LKR {order.total_paid.toLocaleString()}</p>
                    <p className="text-sm text-red-600">Balance: LKR {order.balance_due.toLocaleString()}</p>
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
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
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
  );
}
