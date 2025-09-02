
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calculator, Truck } from 'lucide-react';
import { YutongQuotationsList } from "@/components/yutong/YutongQuotationsList";
import { YutongQuotationForm } from "@/components/yutong/YutongQuotationForm";
import { YutongBusModelsAdmin } from "@/components/yutong/YutongBusModelsAdmin";
import { YutongAddOnsAdmin } from "@/components/yutong/YutongAddOnsAdmin";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  confirmedSales: number;
  totalValue: number;
}

export default function YutongQuotations() {
  const [activeTab, setActiveTab] = useState('quotations');
  const [showForm, setShowForm] = useState(false);
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
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="bus-models">Bus Models</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="space-y-4">
          <YutongQuotationsList onRefresh={loadStats} />
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
