
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calculator, Truck, ShoppingCart, DollarSign, Package, Shield, Cog, FileCheck, MapPin, Wrench, Users, Bus, BarChart3 } from 'lucide-react';
import { YutongQuotationsList } from "@/components/yutong/YutongQuotationsList";
import { YutongQuotationForm } from "@/components/yutong/YutongQuotationFormUpdated";
import { YutongBusModelsAdmin } from "@/components/yutong/YutongBusModelsAdmin";
import { YutongAddOnsAdmin } from "@/components/yutong/YutongAddOnsAdmin";
import YutongCustomersAdmin from "@/components/yutong/YutongCustomersAdmin";
import { YutongOrdersList } from "@/components/yutong/YutongOrdersList";
import { YutongFinanceDashboard } from "@/components/yutong/YutongFinanceDashboard";
import { YutongSupplierManagement } from '@/components/yutong/YutongSupplierManagement';
import { YutongLogisticsManagement } from '@/components/yutong/YutongLogisticsManagement';
import { YutongCustomsManagement } from '@/components/yutong/YutongCustomsManagement';
import { YutongVehicleProcessingManagement } from '@/components/yutong/YutongVehicleProcessingManagement';
import { YutongRMVRegistrationManagement } from '@/components/yutong/YutongRMVRegistrationManagement';
import { YutongDeliveryManagement } from '@/components/yutong/YutongDeliveryManagement';
import { YutongAfterSalesManagement } from '@/components/yutong/YutongAfterSalesManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  confirmedSales: number;
  totalValue: number;
}

export default function YutongQuotations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const activeTab = searchParams.get('tab') || 'quotations';
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    confirmedSales: 0,
    totalValue: 0
  });
  const { toast } = useToast();

  const loadStats = async () => {
    try {
      const { data: quotations, error } = await supabase
        .from('yutong_quotations')
        .select('status, total_price');

      if (error) throw error;

      const total = quotations?.length || 0;
      const pending = quotations?.filter(q => ['draft', 'sent'].includes(q.status)).length || 0;
      const confirmed = quotations?.filter(q => q.status === 'confirmed').length || 0;
      const value = quotations?.reduce((sum, q) => sum + (q.total_price || 0), 0) || 0;

      setStats({
        totalQuotations: total,
        pendingQuotations: pending,
        confirmedSales: confirmed,
        totalValue: value
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    loadStats();
    toast({
      title: "Success",
      description: "Yutong quotation created successfully"
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Yutong Bus Sales</h1>
          <p className="text-muted-foreground">Manage Yutong bus sales quotations and pricing</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Quotation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingQuotations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Sales</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmedSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-14">
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Quotations</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Finance</span>
          </TabsTrigger>
          <TabsTrigger value="supplier" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Supplier</span>
          </TabsTrigger>
          <TabsTrigger value="logistics" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Logistics</span>
          </TabsTrigger>
          <TabsTrigger value="customs" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Customs</span>
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            <span className="hidden sm:inline">Processing</span>
          </TabsTrigger>
          <TabsTrigger value="rmv" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">RMV</span>
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="after-sales" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">After-Sales</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="bus-models" className="flex items-center gap-2">
            <Bus className="h-4 w-4" />
            <span className="hidden sm:inline">Bus Models</span>
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add-ons</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="space-y-4">
          <YutongQuotationsList onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <YutongOrdersList />
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <YutongFinanceDashboard />
        </TabsContent>

        <TabsContent value="supplier" className="space-y-4">
          <YutongSupplierManagement />
        </TabsContent>

        <TabsContent value="logistics" className="space-y-4">
          <YutongLogisticsManagement />
        </TabsContent>

        <TabsContent value="customs" className="space-y-4">
          <YutongCustomsManagement onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <YutongVehicleProcessingManagement onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="rmv" className="space-y-4">
          <YutongRMVRegistrationManagement onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <YutongDeliveryManagement onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="after-sales" className="space-y-4">
          <YutongAfterSalesManagement onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <YutongCustomersAdmin />
        </TabsContent>

        <TabsContent value="bus-models" className="space-y-4">
          <YutongBusModelsAdmin />
        </TabsContent>

        <TabsContent value="addons" className="space-y-4">
          <YutongAddOnsAdmin />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sales reports and analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Modal */}
      {showForm && (
        <YutongQuotationForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
