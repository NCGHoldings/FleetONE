import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Calculator, MapPin, Truck } from 'lucide-react';
import { CostCalculator } from "@/components/special-hire/CostCalculator";
import { EnhancedCostCalculator } from "@/components/special-hire/EnhancedCostCalculator";
import { ConfirmedTripsTable } from "@/components/special-hire/ConfirmedTripsTable";
import { RateCardsAdmin } from "@/components/special-hire/RateCardsAdmin";
import { BusTypesAdmin } from "@/components/special-hire/BusTypesAdmin";
import { FuelSettingsAdmin } from "@/components/special-hire/FuelSettingsAdmin";
import { QuotationsList } from "@/components/special-hire/QuotationsList";
import { SpecialHireForm } from "@/components/special-hire/SpecialHireForm";
import { RateCoverageMaps } from "@/components/special-hire/RateCoverageMaps";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  confirmedTrips: number;
  totalRevenue: number;
}

export default function SpecialHire() {
  const [activeTab, setActiveTab] = useState('quotations');
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    confirmedTrips: 0,
    totalRevenue: 0
  });
  const { toast } = useToast();

  const loadStats = async () => {
    try {
      const { data: quotations, error } = await supabase
        .from('special_hire_quotations')
        .select('status, gross_revenue');

      if (error) throw error;

      const total = quotations?.length || 0;
      const pending = quotations?.filter(q => ['draft', 'sent'].includes(q.status)).length || 0;
      const confirmed = quotations?.filter(q => q.status === 'confirmed').length || 0;
      const revenue = quotations?.reduce((sum, q) => sum + (q.gross_revenue || 0), 0) || 0;

      setStats({
        totalQuotations: total,
        pendingQuotations: pending,
        confirmedTrips: confirmed,
        totalRevenue: revenue
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleFormSubmit = () => {
    setShowForm(false);
    loadStats();
    toast({
      title: "Success",
      description: "Quotation created successfully"
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Special Hire Management</h1>
          <p className="text-muted-foreground">Manage special hire bookings, quotations, and pricing</p>
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
            <CardTitle className="text-sm font-medium">Confirmed Trips</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmedTrips}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="trip-calculator">Trip Calculator</TabsTrigger>
          <TabsTrigger value="confirmed-trips">Confirmed Trips</TabsTrigger>
          <TabsTrigger value="bus-types">Bus Types</TabsTrigger>
          <TabsTrigger value="rate-cards">Rate Cards</TabsTrigger>
          <TabsTrigger value="fuel-settings">Fuel Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="space-y-4">
          <QuotationsList onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="trip-calculator" className="space-y-4">
          <EnhancedCostCalculator />
        </TabsContent>

        <TabsContent value="confirmed-trips" className="space-y-4">
          <ConfirmedTripsTable />
        </TabsContent>

        <TabsContent value="bus-types" className="space-y-4">
          <BusTypesAdmin />
        </TabsContent>

        <TabsContent value="rate-cards" className="space-y-4">
          <div className="space-y-6">
            <RateCoverageMaps />
            <RateCardsAdmin />
          </div>
        </TabsContent>

        <TabsContent value="fuel-settings" className="space-y-4">
          <FuelSettingsAdmin />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Reports and analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Modal */}
      {showForm && (
        <SpecialHireForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}