// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, CreditCard, Calendar, TrendingUp } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

interface Customer {
  id: string;
  customer_code: string;
  company_name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  customer_type: string;
  credit_limit: number;
  payment_terms: number;
  created_at: string;
}

interface PurchaseHistory {
  id: string;
  quotation_number: string;
  purchase_date: string;
  total_amount: number;
  status: string;
  bus_model: string;
  quantity: number;
}

interface CustomerAnalytics {
  total_purchases: number;
  total_amount: number;
  average_order_value: number;
  last_purchase_date: string | null;
  favorite_models: string[];
}

interface CustomerProfileModalProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerProfileModal({ customer, open, onOpenChange }: CustomerProfileModalProps) {
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [analytics, setAnalytics] = useState<CustomerAnalytics>({
    total_purchases: 0,
    total_amount: 0,
    average_order_value: 0,
    last_purchase_date: null,
    favorite_models: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCustomerData = async () => {
    if (!customer) return;

    try {
      // Load purchase history
      const { data: purchases, error: purchaseError } = await (supabase as any)
        .from('lightvehicle_quotations')
        .select(`
          id,
          quotation_no,
          created_at,
          total_price,
          status,
          quantity,
          bus_model,
          lightvehicle_bus_models (
            bus_name,
            model_name
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (purchaseError) throw purchaseError;

      const formattedPurchases: PurchaseHistory[] = (purchases as any[] || []).map((p: any) => ({
        id: p.id,
        quotation_number: p.quotation_no || 'N/A',
        purchase_date: p.created_at,
        total_amount: p.total_price || 0,
        status: p.status || 'draft',
        bus_model: p.lightvehicle_bus_models ? 
          `${p.lightvehicle_bus_models.bus_name} ${p.lightvehicle_bus_models.model_name}` : 
          p.bus_model || 'N/A',
        quantity: p.quantity || 1,
      }));

      setPurchaseHistory(formattedPurchases);

      // Calculate analytics
      const completedPurchases = formattedPurchases.filter(p => p.status === 'confirmed');
      const totalAmount = completedPurchases.reduce((sum, p) => sum + p.total_amount, 0);
      const averageOrderValue = completedPurchases.length > 0 ? totalAmount / completedPurchases.length : 0;

      const modelCounts = completedPurchases.reduce((acc, p) => {
        acc[p.bus_model] = (acc[p.bus_model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const favoriteModels = Object.entries(modelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([model]) => model);

      setAnalytics({
        total_purchases: completedPurchases.length,
        total_amount: totalAmount,
        average_order_value: averageOrderValue,
        last_purchase_date: completedPurchases[0]?.purchase_date || null,
        favorite_models: favoriteModels,
      });

    } catch (error) {
      console.error('Error loading customer data:', error);
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer && open) {
      setLoading(true);
      loadCustomerData();
    }
  }, [customer, open]);

  if (!customer) return null;

  const purchaseColumns: ColumnDef<PurchaseHistory>[] = [
    {
      accessorKey: 'quotation_number',
      header: 'Quotation #',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('quotation_number')}</span>
      ),
    },
    {
      accessorKey: 'purchase_date',
      header: 'Date',
      cell: ({ row }) => (
        <span>{new Date(row.getValue('purchase_date')).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: 'bus_model',
      header: 'Bus Model',
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => (
        <span className="text-center">{row.getValue('quantity')}</span>
      ),
    },
    {
      accessorKey: 'total_amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span>LKR {Number(row.getValue('total_amount')).toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge 
            variant={status === 'confirmed' ? 'default' : status === 'draft' ? 'secondary' : 'destructive'}
            className="capitalize"
          >
            {status}
          </Badge>
        );
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Profile - {customer.company_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="history">Purchase History</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Customer Code:</span>
                    <span className="ml-2 font-mono">{customer.customer_code}</span>
                  </div>
                  <div>
                    <span className="font-medium">Company:</span>
                    <span className="ml-2">{customer.company_name}</span>
                  </div>
                  {customer.contact_person && (
                    <div>
                      <span className="font-medium">Contact Person:</span>
                      <span className="ml-2">{customer.contact_person}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Phone:</span>
                    <span className="ml-2">{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div>
                      <span className="font-medium">Email:</span>
                      <span className="ml-2">{customer.email}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Customer Type:</span>
                    <Badge variant="secondary" className="ml-2 capitalize">
                      {customer.customer_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Credit Limit:</span>
                    <span className="ml-2">LKR {customer.credit_limit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Payment Terms:</span>
                    <span className="ml-2">{customer.payment_terms} days</span>
                  </div>
                  <div>
                    <span className="font-medium">Customer Since:</span>
                    <span className="ml-2">{new Date(customer.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(customer.address || customer.city) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.address && <div>{customer.address}</div>}
                  {customer.city && <div>{customer.city}</div>}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Purchase Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Purchases:</span>
                    <span className="font-semibold">{analytics.total_purchases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">LKR {analytics.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Order Value:</span>
                    <span className="font-semibold">LKR {Math.round(analytics.average_order_value).toLocaleString()}</span>
                  </div>
                  {analytics.last_purchase_date && (
                    <div className="flex justify-between">
                      <span>Last Purchase:</span>
                      <span className="font-semibold">{new Date(analytics.last_purchase_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Favorite Bus Models</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.favorite_models.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.favorite_models.map((model, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span>{model}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No purchase history available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Purchase History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={purchaseColumns}
                  data={purchaseHistory}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}