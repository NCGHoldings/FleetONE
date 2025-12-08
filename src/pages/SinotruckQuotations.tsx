import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Truck, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SinotruckQuotationForm } from "@/components/sinotruck/SinotruckQuotationForm";
import { SinotruckQuotationsList } from "@/components/sinotruck/SinotruckQuotationsList";
import { SinotruckTruckModelsAdmin } from "@/components/sinotruck/SinotruckTruckModelsAdmin";
import { SinotruckCustomersAdmin } from "@/components/sinotruck/SinotruckCustomersAdmin";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  confirmedSales: number;
  totalValue: number;
}

// Interface for inquiry data passed via URL
interface InquiryInitialData {
  inquiryId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName: string;
  address: string;
  interestedModel: string;
  quantity: number;
}

const SinotruckQuotations = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [inquiryData, setInquiryData] = useState<InquiryInitialData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    confirmedSales: 0,
    totalValue: 0,
  });

  const activeTab = searchParams.get("tab") || "quotations";

  const loadStats = async () => {
    const { data: quotations } = await supabase
      .from("sinotruck_quotations")
      .select("status, total_price");

    if (quotations) {
      const total = quotations.length;
      const pending = quotations.filter((q) => q.status === "draft" || q.status === "sent").length;
      const confirmed = quotations.filter((q) => q.status === "confirmed").length;
      const totalValue = quotations.reduce((sum, q) => sum + (q.total_price || 0), 0);

      setStats({
        totalQuotations: total,
        pendingQuotations: pending,
        confirmedSales: confirmed,
        totalValue: totalValue,
      });
    }
  };

  // Check for inquiry data in URL params and auto-open form
  useEffect(() => {
    const fromInquiry = searchParams.get('fromInquiry');
    if (fromInquiry) {
      const data: InquiryInitialData = {
        inquiryId: fromInquiry,
        customerName: searchParams.get('customerName') || '',
        customerPhone: searchParams.get('customerPhone') || '',
        customerEmail: searchParams.get('customerEmail') || '',
        companyName: searchParams.get('companyName') || '',
        address: searchParams.get('address') || '',
        interestedModel: searchParams.get('interestedModel') || '',
        quantity: parseInt(searchParams.get('quantity') || '1', 10),
      };
      setInquiryData(data);
      setShowForm(true);
      
      // Clear the URL params after reading
      const newParams = new URLSearchParams();
      if (activeTab !== 'quotations') newParams.set('tab', activeTab);
      navigate(`/sinotruck-quotations${newParams.toString() ? '?' + newParams.toString() : ''}`, { replace: true });
    }
  }, [searchParams, navigate, activeTab]);

  useEffect(() => {
    loadStats();
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setInquiryData(null);
    loadStats();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setInquiryData(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Sinotruck Operations
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage electric truck quotations, models, and customer relationships
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          New Quotation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotations}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingQuotations}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Sales</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmedSales}</div>
            <p className="text-xs text-muted-foreground">Successful deals</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Combined quotation value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quotations" className="gap-2">
            <FileText className="w-4 h-4" />
            Quotations
          </TabsTrigger>
          <TabsTrigger value="truck-models" className="gap-2">
            <Truck className="w-4 h-4" />
            Truck Models
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="w-4 h-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="space-y-4">
          <SinotruckQuotationsList onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="truck-models" className="space-y-4">
          <SinotruckTruckModelsAdmin />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <SinotruckCustomersAdmin />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure Sinotruck operations settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settings configuration coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showForm && (
        <SinotruckQuotationForm
          open={showForm}
          onClose={handleFormCancel}
          onSuccess={handleFormSubmit}
          initialData={inquiryData}
        />
      )}
    </div>
  );
};

export default SinotruckQuotations;
