import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calculator, Truck, ShoppingCart, DollarSign, Package, Cog, Users, Car, UserPlus, FileSpreadsheet, Receipt } from 'lucide-react';
import { LightVehicleQuotationsList } from "@/components/lightvehicle/LightVehicleQuotationsList";
import { LightVehicleQuotationForm } from "@/components/lightvehicle/LightVehicleQuotationForm";
import { LightVehicleModelsAdmin } from "@/components/lightvehicle/LightVehicleModelsAdmin";
import { LightVehicleAddOnsAdmin } from "@/components/lightvehicle/LightVehicleAddOnsAdmin";
import { LightVehicleCustomersAdmin } from "@/components/lightvehicle/LightVehicleCustomersAdmin";
import { LightVehicleOrdersList } from "@/components/lightvehicle/LightVehicleOrdersList";
import { LightVehicleFinanceDashboard } from "@/components/lightvehicle/LightVehicleFinanceDashboard";
import { LightVehicleResponsiblePersonsAdmin } from "@/components/lightvehicle/LightVehicleResponsiblePersonsAdmin";
import { LightVehicleReferralManagement } from "@/components/lightvehicle/LightVehicleReferralManagement";
import { LightVehicleVehicleDataManagement } from "@/components/lightvehicle/LightVehicleVehicleDataManagement";
import { LightVehicleRentalsList } from "@/components/lightvehicle/LightVehicleRentalsList";
import { LightVehicleRentalForm } from "@/components/lightvehicle/LightVehicleRentalForm";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  confirmedSales: number;
  totalValue: number;
}

export default function LightVehicleQuotations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [editingRental, setEditingRental] = useState<any>(null);
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
        .from('lightvehicle_quotations')
        .select('status, grand_total');

      if (error) throw error;

      const total = quotations?.length || 0;
      const pending = quotations?.filter(q => ['draft', 'sent'].includes(q.status)).length || 0;
      const confirmed = quotations?.filter(q => q.status === 'confirmed').length || 0;
      const value = quotations?.reduce((sum, q) => sum + (q.grand_total || 0), 0) || 0;

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
      description: "Light vehicle quotation created successfully"
    });
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Light Vehicle Sales</h1>
          <p className="text-muted-foreground">Manage light vehicle sales quotations and pricing</p>
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
            <Car className="h-4 w-4 text-muted-foreground" />
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

      {/* Main Content - Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
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
          <TabsTrigger value="rentals" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Rentals</span>
          </TabsTrigger>
          <TabsTrigger value="referral" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Referral</span>
          </TabsTrigger>
          <TabsTrigger value="vehicle-data" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Vehicle Data</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="vehicle-models" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Vehicle Models</span>
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add-ons</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="space-y-4">
          <LightVehicleQuotationsList onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <LightVehicleOrdersList />
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <LightVehicleFinanceDashboard />
        </TabsContent>

        <TabsContent value="rentals" className="space-y-4">
          <LightVehicleRentalsList 
            onNewRental={() => {
              setEditingRental(null);
              setShowRentalForm(true);
            }} 
            onEditRental={(rental) => {
              setEditingRental(rental);
              setShowRentalForm(true);
            }}
          />
        </TabsContent>

        <TabsContent value="referral" className="space-y-4">
          <LightVehicleReferralManagement />
        </TabsContent>

        <TabsContent value="vehicle-data" className="space-y-4">
          <LightVehicleVehicleDataManagement />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <LightVehicleCustomersAdmin />
        </TabsContent>

        <TabsContent value="vehicle-models" className="space-y-4">
          <LightVehicleModelsAdmin />
        </TabsContent>

        <TabsContent value="addons" className="space-y-4">
          <LightVehicleAddOnsAdmin />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <LightVehicleResponsiblePersonsAdmin />
        </TabsContent>
      </Tabs>

      {/* Form Modal */}
      {showForm && (
        <LightVehicleQuotationForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {showRentalForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <LightVehicleRentalForm
              initialData={editingRental}
              onCancel={() => {
                setShowRentalForm(false);
                setEditingRental(null);
              }}
              onSuccess={() => {
                setShowRentalForm(false);
                setEditingRental(null);
                // You could trigger a refresh here if needed
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

