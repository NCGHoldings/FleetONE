import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, CreditCard, ClipboardList, Upload, LogOut } from "lucide-react";
import { VendorLogin } from "@/components/vendor-portal/VendorLogin";
import { VendorDashboard } from "@/components/vendor-portal/VendorDashboard";
import { PurchaseOrdersView } from "@/components/vendor-portal/PurchaseOrdersView";
import { SubmitInvoice } from "@/components/vendor-portal/SubmitInvoice";
import { PaymentTracking } from "@/components/vendor-portal/PaymentTracking";
import { Button } from "@/components/ui/button";

interface VendorSession {
  vendorId: string;
  vendorName: string;
  email: string;
  sessionToken: string;
  companyName: string;
}

const VendorPortal = () => {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogin = (sessionData: VendorSession) => {
    setSession(sessionData);
    localStorage.setItem("vendor_portal_session", JSON.stringify(sessionData));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("vendor_portal_session");
  };

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("vendor_portal_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
      } catch (e) {
        localStorage.removeItem("vendor_portal_session");
      }
    }
  }, []);

  if (!session) {
    return <VendorLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">{session.companyName}</h1>
                <p className="text-sm text-muted-foreground">Vendor Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{session.vendorName}</p>
                <p className="text-xs text-muted-foreground">{session.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Purchase Orders</span>
            </TabsTrigger>
            <TabsTrigger value="submit-invoice" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Submit Invoice</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <VendorDashboard vendorId={session.vendorId} vendorName={session.vendorName} />
          </TabsContent>

          <TabsContent value="purchase-orders">
            <PurchaseOrdersView vendorId={session.vendorId} />
          </TabsContent>

          <TabsContent value="submit-invoice">
            <SubmitInvoice vendorId={session.vendorId} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentTracking vendorId={session.vendorId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} NCG FleetFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default VendorPortal;
