import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PageAccessGuard } from "./components/auth/PageAccessGuard";
import { SeasonalThemeProvider } from "./components/seasonal/SeasonalThemeProvider";

// Pages
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import InstallApp from "./pages/InstallApp";
import Welcome from "./pages/Welcome";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import DailyTrips from "./pages/DailyTrips";
import TripsAnalytics from "./pages/TripsAnalytics";
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
import SchoolPayments from "./pages/SchoolPayments";
import SchoolPaymentImport from "./pages/SchoolPaymentImport";
import SchoolPaymentSettings from "./pages/SchoolPaymentSettings";
import ReceiptUpload from "./pages/ReceiptUpload";
import SchoolReports from "./pages/SchoolReports";
import YutongQuotations from "./pages/YutongQuotations";
import SinotruckQuotations from "./pages/SinotruckQuotations";
import LightVehicleQuotations from "./pages/LightVehicleQuotations";
import Complaints from "./pages/Complaints";
import StaffPerformance from "./pages/StaffPerformance";
import PublicComplaint from "./pages/PublicComplaint";
import PublicSpecialHire from "./pages/PublicSpecialHire";
import PublicReceiptUpload from "./pages/PublicReceiptUpload";
import PublicConductorUpload from "./pages/PublicConductorUpload";
import { ConductorSubmissionsReview } from "./components/trips/ConductorSubmissionsReview";
import { LateEntryApprovalInterface } from "./components/trips/LateEntryApprovalInterface";
import SchoolImportPage from "./pages/SchoolImportPage";
import CustomerManagement from "./pages/CustomerManagement";
import AddStudentForm from "./pages/AddStudentForm";
import SchoolRouteManagement from "./pages/SchoolRouteManagement";
import SchoolReceiptManagement from "./pages/SchoolReceiptManagement";
import SchoolBranchReports from "./pages/SchoolBranchReports";
import GlobalSchoolImport from "./pages/GlobalSchoolImport";
import GlobalSchoolPayments from "./pages/GlobalSchoolPayments";
import TotalDashboard from "./pages/TotalDashboard";
import NSPDailySales from "./pages/NSPDailySales";
import NSPSalesSummary from "./pages/NSPSalesSummary";
import QuickTripsEntry from "./pages/QuickTripsEntry";
import GovernanceCalendar from "./pages/GovernanceCalendar";
import HolidayManagement from "./pages/HolidayManagement";
import SeasonalThemes from "./pages/SeasonalThemes";
import DailyBusExpenses from "./pages/DailyBusExpenses";
import Accounting from "./pages/Accounting";
import Budgeting from "./pages/Budgeting";
import TyreManagement from "./pages/TyreManagement";
import FleetAnalytics from "./pages/FleetAnalytics";
import VehicleInquiryHub from "./pages/VehicleInquiryHub";
import ScheduledTasks from "./pages/ScheduledTasks";
import ApiUsageMonitoring from "./pages/ApiUsageMonitoring";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SeasonalThemeProvider>
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/install" element={<InstallApp />} />
            <Route path="/public/complaint" element={<PublicComplaint />} />
            <Route path="/public/special-hire" element={<PublicSpecialHire />} />
            <Route path="/public/receipt-upload" element={<PublicReceiptUpload />} />
            <Route path="/public/conductor-upload" element={<PublicConductorUpload />} />
            
            {/* Protected routes wrapped in AppLayout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Welcome />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="dashboard">
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/executive-dashboard" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="executive_dashboard">
                    <AppLayout>
                      <ExecutiveDashboard />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customers" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="customers">
                    <AppLayout>
                      <CustomerManagement />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="daily_trips">
                    <AppLayout>
                      <DailyTrips />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips/quick-entry" 
              element={
                <ProtectedRoute>
                  <QuickTripsEntry />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips/conductor-submissions" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="conductor_submissions">
                    <AppLayout>
                      <ConductorSubmissionsReview />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips/late-entry-requests" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <PageAccessGuard pageId="late_entry_requests">
                    <AppLayout>
                      <LateEntryApprovalInterface />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips/analytics" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="trips_analytics">
                    <AppLayout>
                      <TripsAnalytics />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/daily-bus-expenses" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="daily_trips">
                    <DailyBusExpenses />
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fleet"
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="fleet_management">
                    <AppLayout>
                      <FleetManagement />
                    </AppLayout>
                  </PageAccessGuard>
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
                  <PageAccessGuard pageId="maintenance">
                    <AppLayout>
                      <Maintenance />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            {/* General protected routes */}
            <Route 
              path="/insurance" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="insurance">
                    <AppLayout>
                      <Insurance />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/permits" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="route_permits">
                    <AppLayout>
                      <RoutePermits />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/training" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="driver_training">
                    <AppLayout>
                      <DriverTraining />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tracking" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="real_time_tracking">
                    <AppLayout>
                      <RealTimeTracking />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fleet-analytics" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="fleet_management">
                    <AppLayout>
                      <FleetAnalytics />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/allocation" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="driver_allocation">
                    <AppLayout>
                      <DriverAllocation />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="staff_attendance">
                    <AppLayout>
                      <StaffAttendancePayroll />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
        <Route 
          path="/special-hire" 
          element={
            <ProtectedRoute>
              <PageAccessGuard pageId="special_hire">
                <AppLayout>
                  <SpecialHire />
                </AppLayout>
              </PageAccessGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus-service" 
          element={
            <ProtectedRoute>
              <PageAccessGuard pageId="school_bus_service">
                <AppLayout>
                  <SchoolBusService />
                </AppLayout>
              </PageAccessGuard>
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
          path="/school-bus/branch/:branchId/import" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolImportPage />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/students/add" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <AddStudentForm />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/routes" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolRouteManagement />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/receipts" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolReceiptManagement />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/reports" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolBranchReports />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/payments" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolPayments />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/payment-import" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolPaymentImport />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/branch/:branchId/payment-settings" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SchoolPaymentSettings />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/receipts/upload" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <ReceiptUpload />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/reports" 
          element={
            <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
              <AppLayout>
                <SchoolReports />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/import" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <GlobalSchoolImport />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/payments" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <GlobalSchoolPayments />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/school-bus/total-dashboard" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <TotalDashboard />
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
                  <PageAccessGuard pageId="document_manager">
                    <AppLayout>
                      <DocumentManager />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/complaints" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="complaints">
                    <AppLayout>
                      <Complaints />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/staff-performance" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="staff_performance">
                    <AppLayout>
                      <StaffPerformance />
                    </AppLayout>
                  </PageAccessGuard>
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
                  <PageAccessGuard pageId="yutong_quotations">
                    <AppLayout>
                      <YutongQuotations />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/sinotruck-quotations" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="sinotruck_quotations">
                    <AppLayout>
                      <SinotruckQuotations />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/lightvehicle-quotations" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="lightvehicle_quotations">
                    <AppLayout>
                      <LightVehicleQuotations />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/vehicle-inquiries" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="vehicle_inquiries">
                    <AppLayout>
                      <VehicleInquiryHub />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route
              path="/nsp-daily-sales"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="nsp_daily_sales">
                    <AppLayout>
                      <NSPDailySales />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/nsp-summary" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="nsp_summary">
                    <AppLayout>
                      <NSPSalesSummary />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/tyre-management" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'supervisor']}>
                  <PageAccessGuard pageId="tyre_management">
                    <AppLayout>
                      <TyreManagement />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route
              path="/governance/calendar" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'governance_admin', 'governance_manager', 'governance_viewer']}>
                  <PageAccessGuard pageId="governance_calendar">
                    <AppLayout>
                      <GovernanceCalendar />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/governance/holidays" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'governance_admin']}>
                  <PageAccessGuard pageId="governance_holidays">
                    <AppLayout>
                      <HolidayManagement />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/seasonal-themes" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <PageAccessGuard pageId="seasonal_themes">
                    <AppLayout>
                      <SeasonalThemes />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/scheduled-tasks" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <PageAccessGuard pageId="scheduled_tasks">
                    <AppLayout>
                      <ScheduledTasks />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/accounting"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'finance']}>
                  <Accounting />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/budgeting" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin', 'finance']}>
                  <AppLayout>
                    <Budgeting />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/api-usage" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <AppLayout>
                    <ApiUsageMonitoring />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SeasonalThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
