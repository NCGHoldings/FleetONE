import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LightVehicleOrderInvoiceGenerator } from './LightVehicleOrderInvoiceGenerator';
import { LightVehicleCashReceiptModal } from './LightVehicleCashReceiptModal';
import { useLightVehicleCashReceipts, LightVehicleCashReceipt } from '@/hooks/useLightVehicleCashReceipts';
import { supabase } from '@/integrations/supabase/client';
import { 
  Car, User, Phone, Mail, MapPin, Calendar, DollarSign, 
  FileText, Receipt, CreditCard, Package, Clock, CheckCircle,
  Eye, Plus, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OrderData {
  id: string;
  order_no?: string;
  order_number?: string;
  quotation_no?: string;
  order_date?: string;
  status: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_name?: string;
  brand?: string;
  year_of_manufacture?: string;
  color_scheme?: string;
  engine_number?: string;
  chassis_number?: string;
  engine_capacity?: string;
  transmission?: string;
  fuel_type?: string;
  mileage?: string;
  vehicle_condition?: string;
  unit_price?: number;
  quantity: number;
  total_price?: number;
  total_amount?: number;
  total_paid?: number;
  balance_due?: number;
  notes?: string;
  created_at?: string;
}

interface EnhancedLightVehicleOrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onRefresh?: () => void;
}

export function EnhancedLightVehicleOrderDetailsModal({
  open,
  onOpenChange,
  orderId,
  onRefresh
}: EnhancedLightVehicleOrderDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<LightVehicleCashReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<LightVehicleCashReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  
  const { fetchReceiptsForOrder, createReceipt, isCreating } = useLightVehicleCashReceipts();

  const loadOrder = async () => {
    setLoading(true);
    try {
      // Fetch order with related quotation data
      const { data, error } = await supabase
        .from('lightvehicle_orders')
        .select(`
          *,
          quotation:lightvehicle_quotations!quotation_id (
            quotation_number,
            customer_address,
            customer_phone,
            customer_email,
            engine_cc,
            transmission,
            fuel_type,
            color,
            year
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      // Map database fields to display fields
      const mappedOrder: OrderData = {
        id: data.id,
        order_no: data.order_number,
        order_number: data.order_number,
        quotation_no: data.quotation?.quotation_number || '',
        order_date: data.created_at,
        status: data.status,
        customer_name: data.customer_name,
        customer_address: data.quotation?.customer_address || '',
        customer_phone: data.quotation?.customer_phone || '',
        customer_email: data.quotation?.customer_email || '',
        vehicle_make: data.brand || '',
        vehicle_model: data.vehicle_name || '',
        vehicle_name: data.vehicle_name,
        brand: data.brand,
        year_of_manufacture: data.quotation?.year?.toString() || '',
        color_scheme: data.quotation?.color || '',
        engine_capacity: data.quotation?.engine_cc || '',
        transmission: data.quotation?.transmission || '',
        fuel_type: data.quotation?.fuel_type || '',
        unit_price: data.unit_price,
        quantity: data.quantity,
        total_price: data.total_amount,
        total_amount: data.total_amount,
        total_paid: data.total_paid || 0,
        balance_due: data.balance_due || 0,
        notes: data.notes,
        created_at: data.created_at
      };
      
      setOrder(mappedOrder);

      // Load receipts
      const receiptData = await fetchReceiptsForOrder(orderId);
      setReceipts(receiptData);

      // Load payments
      const { data: paymentData } = await supabase
        .from('lightvehicle_customer_payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      setPayments(paymentData || []);
    } catch (error: any) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && orderId) {
      loadOrder();
    }
  }, [open, orderId]);

  const handleGenerateReceipt = async (payment: any) => {
    if (!order) return;

    const receipt = await createReceipt({
      orderId: order.id,
      paymentId: payment.id,
      amount: payment.amount,
      paymentMethod: payment.payment_method || 'Bank Transfer',
      productDescription: `${order.vehicle_make} ${order.vehicle_model} ${order.year_of_manufacture || ''}`.trim(),
      quotationNo: order.quotation_no,
      customerName: order.customer_name,
      customerAddress: order.customer_address,
      customerContact: order.customer_phone
    });

    if (receipt) {
      setReceipts(prev => [receipt, ...prev]);
      setSelectedReceipt(receipt);
      setReceiptModalOpen(true);
    }
  };

  const handleViewReceipt = (receipt: LightVehicleCashReceipt) => {
    setSelectedReceipt(receipt);
    setReceiptModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading || !order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getPaymentReceipt = (paymentId: string) => {
    return receipts.find(r => r.payment_id === paymentId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{order.order_no}</DialogTitle>
              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                {order.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Customer Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Customer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium text-base">{order.customer_name}</p>
                  {order.customer_phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" /> {order.customer_phone}
                    </p>
                  )}
                  {order.customer_email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" /> {order.customer_email}
                    </p>
                  )}
                  {order.customer_address && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {order.customer_address}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Vehicle Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    Vehicle Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium text-base">{order.vehicle_make} {order.vehicle_model}</p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <p>Year: {order.year_of_manufacture || 'N/A'}</p>
                    <p>Color: {order.color_scheme || 'N/A'}</p>
                    <p>Condition: {order.vehicle_condition || 'N/A'}</p>
                    <p>Transmission: {order.transmission || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technical Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Engine Number</p>
                    <p className="font-medium">{order.engine_number || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Chassis Number</p>
                    <p className="font-medium">{order.chassis_number || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Engine Capacity</p>
                    <p className="font-medium">{order.engine_capacity || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mileage</p>
                    <p className="font-medium">{order.mileage || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Unit Price</p>
                    <p className="font-semibold">{formatCurrency(order.unit_price)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-semibold">{order.quantity}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">Total Price</p>
                    <p className="font-bold text-blue-700">{formatCurrency(order.total_price)}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">Paid</p>
                    <p className="font-bold text-green-700">{formatCurrency(order.total_paid || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="mt-4 space-y-4">
            {/* Payment Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Total Amount</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(order.total_price)}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Amount Paid</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(order.total_paid || 0)}</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600">Balance Due</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(order.balance_due || (order.total_price - (order.total_paid || 0)))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  Payment History & Receipts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No payments recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => {
                      const receipt = getPaymentReceipt(payment.id);
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount || 0)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.payment_date || payment.created_at), 'MMM dd, yyyy')} • {payment.payment_method || 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={payment.status === 'verified' || payment.verified ? 'default' : 'secondary'}>
                              {payment.status || (payment.verified ? 'verified' : 'pending')}
                            </Badge>
                            {receipt ? (
                              <Button variant="outline" size="sm" onClick={() => handleViewReceipt(receipt)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View Receipt
                              </Button>
                            ) : (payment.status === 'verified' || payment.verified) ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleGenerateReceipt(payment)}
                                disabled={isCreating}
                              >
                                {isCreating ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-1" />
                                )}
                                Generate Receipt
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Existing Receipts */}
            {receipts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">All Receipts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {receipts.map((receipt) => (
                      <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div>
                          <p className="font-medium">{receipt.receipt_no}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(receipt.receipt_date), 'MMM dd, yyyy')} • {formatCurrency(receipt.amount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={receipt.status === 'finalized' ? 'default' : 'secondary'}>
                            {receipt.status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(receipt)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-4">
            <LightVehicleOrderInvoiceGenerator
              order={{
                id: order.id,
                order_no: order.order_no,
                quotation_no: order.quotation_no,
                customer_name: order.customer_name,
                customer_address: order.customer_address,
                customer_phone: order.customer_phone,
                customer_email: order.customer_email,
                vehicle_make: order.vehicle_make,
                vehicle_model: order.vehicle_model,
                year_of_manufacture: order.year_of_manufacture,
                color_scheme: order.color_scheme,
                engine_number: order.engine_number,
                chassis_number: order.chassis_number,
                engine_capacity: order.engine_capacity,
                transmission: order.transmission,
                fuel_type: order.fuel_type,
                mileage: order.mileage,
                vehicle_condition: order.vehicle_condition,
                unit_price: order.unit_price,
                quantity: order.quantity,
                total_price: order.total_price,
                total_paid: order.total_paid
              }}
              onRefresh={loadOrder}
            />
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.order_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  {(order.total_paid || 0) > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Payment Received</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(order.total_paid || 0)} of {formatCurrency(order.total_price)}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.status === 'completed' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Order Completed</p>
                        <p className="text-sm text-muted-foreground">Vehicle delivered to customer</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedReceipt && (
          <LightVehicleCashReceiptModal
            open={receiptModalOpen}
            onOpenChange={setReceiptModalOpen}
            receipt={selectedReceipt}
            onRefresh={loadOrder}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
