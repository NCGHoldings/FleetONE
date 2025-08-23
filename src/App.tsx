import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import DailyTrips from "./pages/DailyTrips";
import FleetManagement from "./pages/FleetManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trips" element={<DailyTrips />} />
            <Route path="/fleet" element={<FleetManagement />} />
            
            {/* Placeholder routes for other pages */}
            <Route path="/maintenance" element={<div className="p-8 text-center text-muted-foreground">Maintenance module coming soon...</div>} />
            <Route path="/insurance" element={<div className="p-8 text-center text-muted-foreground">Insurance module coming soon...</div>} />
            <Route path="/staff" element={<div className="p-8 text-center text-muted-foreground">Staff Management module coming soon...</div>} />
            <Route path="/permits" element={<div className="p-8 text-center text-muted-foreground">Route Permits module coming soon...</div>} />
            <Route path="/training" element={<div className="p-8 text-center text-muted-foreground">Driver Training module coming soon...</div>} />
            <Route path="/tracking" element={<div className="p-8 text-center text-muted-foreground">Real-Time Tracking module coming soon...</div>} />
            <Route path="/allocation" element={<div className="p-8 text-center text-muted-foreground">Driver Allocation module coming soon...</div>} />
            <Route path="/attendance" element={<div className="p-8 text-center text-muted-foreground">Staff Attendance module coming soon...</div>} />
            <Route path="/special-hire" element={<div className="p-8 text-center text-muted-foreground">Special Hire module coming soon...</div>} />
            <Route path="/business" element={<div className="p-8 text-center text-muted-foreground">Business Ideas module coming soon...</div>} />
            <Route path="/documents" element={<div className="p-8 text-center text-muted-foreground">Document Manager module coming soon...</div>} />
            <Route path="/feedback" element={<div className="p-8 text-center text-muted-foreground">Feedback module coming soon...</div>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
