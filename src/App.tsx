import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DailyTrips from "./pages/DailyTrips";
import FleetManagement from "./pages/FleetManagement";
import NotFound from "./pages/NotFound";
import StaffManagement from "./pages/StaffManagement";
import Insurance from "./pages/Insurance";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public auth route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes wrapped in AppLayout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DailyTrips />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fleet" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <FleetManagement />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Admin-only routes */}
            <Route 
              path="/staff" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <AppLayout>
                    <StaffManagement />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Supervisor+ routes */}
            <Route 
              path="/maintenance" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <AppLayout>
                    <Maintenance />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* General protected routes */}
            <Route 
              path="/insurance" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Insurance />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/permits" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Route Permits module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/training" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Driver Training module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tracking" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Real-Time Tracking module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/allocation" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Driver Allocation module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Staff Attendance module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/special-hire" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Special Hire module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/business" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Business Ideas module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Document Manager module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/feedback" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-8 text-center text-muted-foreground">Feedback module coming soon...</div>
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
