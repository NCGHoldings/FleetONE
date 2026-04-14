import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, CreditCard, History, HelpCircle, LogOut } from "lucide-react";
import { PortalLogin } from "@/components/customer-portal/PortalLogin";
import { PortalDashboard } from "@/components/customer-portal/PortalDashboard";
import { InvoiceHistory } from "@/components/customer-portal/InvoiceHistory";
import { MakePayment } from "@/components/customer-portal/MakePayment";
import { AccountStatement } from "@/components/customer-portal/AccountStatement";
import { SupportRequests } from "@/components/customer-portal/SupportRequests";
import { Button } from "@/components/ui/button";

interface PortalSession {
  customerId: string;
  customerName: string;
  email: string;
  sessionToken: string;
  companyName: string;
}

const CustomerPortal = () => {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogin = (sessionData: PortalSession) => {
    setSession(sessionData);
    localStorage.setItem("portal_session", JSON.stringify(sessionData));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("portal_session");
  };

  // Check for existing session on mount
  useState(() => {
    const savedSession = localStorage.getItem("portal_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
      } catch (e) {
        localStorage.removeItem("portal_session");
      }
    }
  });

  if (!session) {
    return <PortalLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">{session.companyName}</h1>
                <p className="text-sm text-muted-foreground">Customer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{session.customerName}</p>
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
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="statement" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Statement</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Support</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PortalDashboard customerId={session.customerId} customerName={session.customerName} />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoiceHistory customerId={session.customerId} />
          </TabsContent>

          <TabsContent value="payments">
            <MakePayment customerId={session.customerId} />
          </TabsContent>

          <TabsContent value="statement">
            <AccountStatement customerId={session.customerId} customerName={session.customerName} />
          </TabsContent>

          <TabsContent value="support">
            <SupportRequests customerId={session.customerId} />
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

export default CustomerPortal;
