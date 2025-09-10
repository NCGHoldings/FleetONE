import React from "react";
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
import RoutePermits from "./pages/RoutePermits";
import DriverTraining from "./pages/DriverTraining";
import RealTimeTracking from "./pages/RealTimeTracking";
import DriverAllocation from "./pages/DriverAllocation";
import StaffAttendancePayroll from "./pages/StaffAttendancePayroll";
import DocumentManager from "./pages/DocumentManager";
import SpecialHire from "./pages/SpecialHire";
import SchoolBusService from "./pages/SchoolBusService";
import BranchDashboard from "./pages/BranchDashboard";
import SchoolStudentDatabase from "./pages/SchoolStudentDatabase";
import YutongQuotations from "./pages/YutongQuotations";
import Complaints from "./pages/Complaints";
import StaffPerformance from "./pages/StaffPerformance";

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
                    <RoutePermits />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/training" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DriverTraining />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tracking" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RealTimeTracking />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/allocation" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <AppLayout>
                    <DriverAllocation />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <AppLayout>
                    <StaffAttendancePayroll />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
        <Route 
          path="/special-hire" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SpecialHire />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus-service" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolBusService />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <BranchDashboard />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/students" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolStudentDatabase />
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
                    <DocumentManager />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/complaints" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <AppLayout>
                    <Complaints />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/staff-performance" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <AppLayout>
                    <StaffPerformance />
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
            
            <Route 
              path="/yutong-quotations" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <YutongQuotations />
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
