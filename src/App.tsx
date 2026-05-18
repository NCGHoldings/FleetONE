import React from "react";
console.log("[DEBUG] App.tsx module is executing");

import { Toaster } from "@/components/ui/toaster"; 
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PageAccessGuard } from "./components/auth/PageAccessGuard";
import { SeasonalThemeProvider } from "./components/seasonal/SeasonalThemeProvider";
import { CompanyProvider } from "./contexts/CompanyContext";
import { CrewAuthProvider } from "./contexts/CrewAuthContext";
import { ThemeProvider } from "next-themes";
import { SystemErrorBoundary } from "./components/safety/SystemErrorBoundary";
import { MFAGuard } from "./components/auth/MFAGuard";
import { toast } from "sonner";
import "@/styles/professional-erp.css";

// Pages — Core (eagerly loaded for instant auth flow)
import Auth from "./pages/Auth";
import TwoFactorVerify from "./pages/TwoFactorVerify";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";
import Welcome from "./pages/Welcome";

// Pages — Lazy loaded (code-split per route for fast startup)
const InstallApp = React.lazy(() => import("./pages/InstallApp"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const DailyTrips = React.lazy(() => import("./pages/DailyTrips"));
const TripsAnalytics = React.lazy(() => import("./pages/TripsAnalytics"));
const FleetManagement = React.lazy(() => import("./pages/FleetManagement"));
const StaffManagement = React.lazy(() => import("./pages/StaffManagement"));
const Insurance = React.lazy(() => import("./pages/Insurance"));
const Maintenance = React.lazy(() => import("./pages/Maintenance"));
const RoutePermits = React.lazy(() => import("./pages/RoutePermits"));
const DriverTraining = React.lazy(() => import("./pages/DriverTraining"));
const RealTimeTracking = React.lazy(() => import("./pages/RealTimeTracking"));
const DriverAllocation = React.lazy(() => import("./pages/DriverAllocation"));
const StaffAttendancePayroll = React.lazy(() => import("./pages/StaffAttendancePayroll"));
const DocumentManager = React.lazy(() => import("./pages/DocumentManager"));
const SpecialHire = React.lazy(() => import("./pages/SpecialHire"));
const SchoolBusService = React.lazy(() => import("./pages/SchoolBusService"));
const BranchDashboard = React.lazy(() => import("./pages/BranchDashboard"));
const SchoolStudentDatabase = React.lazy(() => import("./pages/SchoolStudentDatabase"));
const SchoolPayments = React.lazy(() => import("./pages/SchoolPayments"));
const SchoolPaymentImport = React.lazy(() => import("./pages/SchoolPaymentImport"));
const SchoolPaymentSettings = React.lazy(() => import("./pages/SchoolPaymentSettings"));
const ReceiptUpload = React.lazy(() => import("./pages/ReceiptUpload"));
const SchoolReports = React.lazy(() => import("./pages/SchoolReports"));
const YutongQuotations = React.lazy(() => import("./pages/YutongQuotations"));
const SinotruckQuotations = React.lazy(() => import("./pages/SinotruckQuotations"));
const LightVehicleQuotations = React.lazy(() => import("./pages/LightVehicleQuotations"));
const Complaints = React.lazy(() => import("./pages/Complaints"));
const FeedbackModule = React.lazy(() => import("./pages/FeedbackModule"));
const StaffPerformance = React.lazy(() => import("./pages/StaffPerformance"));
const PublicComplaint = React.lazy(() => import("./pages/PublicComplaint"));
const PublicSpecialHire = React.lazy(() => import("./pages/PublicSpecialHire"));
const PublicReceiptUpload = React.lazy(() => import("./pages/PublicReceiptUpload"));
const PublicConductorUpload = React.lazy(() => import("./pages/PublicConductorUpload"));
const PublicDriverUpload = React.lazy(() => import("./pages/PublicDriverUpload"));
const ConductorSubmissionsReview = React.lazy(() => import("./components/trips/ConductorSubmissionsReview").then(m => ({ default: m.ConductorSubmissionsReview })));
const LateEntryApprovalInterface = React.lazy(() => import("./components/trips/LateEntryApprovalInterface").then(m => ({ default: m.LateEntryApprovalInterface })));
const CrewLogin = React.lazy(() => import("./pages/CrewLogin"));
const CrewAppLayout = React.lazy(() => import("./components/layouts/CrewAppLayout"));
const CrewHistory = React.lazy(() => import("./pages/CrewHistory"));
const CrewSchedule = React.lazy(() => import("./pages/CrewSchedule"));
const CrewProfile = React.lazy(() => import("./pages/CrewProfile"));
const CrewPerformance = React.lazy(() => import("./pages/CrewPerformance"));
const CrewFinance = React.lazy(() => import("./pages/CrewFinance"));
const SchoolImportPage = React.lazy(() => import("./pages/SchoolImportPage"));
const SchoolBusExpenseImport = React.lazy(() => import("./pages/SchoolBusExpenseImport"));
const CustomerManagement = React.lazy(() => import("./pages/CustomerManagement"));
const AddStudentForm = React.lazy(() => import("./pages/AddStudentForm"));
const SchoolRouteManagement = React.lazy(() => import("./pages/SchoolRouteManagement"));
const SchoolReceiptManagement = React.lazy(() => import("./pages/SchoolReceiptManagement"));
const SchoolBranchReports = React.lazy(() => import("./pages/SchoolBranchReports"));
const GlobalSchoolImport = React.lazy(() => import("./pages/GlobalSchoolImport"));
const GlobalSchoolPayments = React.lazy(() => import("./pages/GlobalSchoolPayments"));
const TotalDashboard = React.lazy(() => import("./pages/TotalDashboard"));
const NSPDailySales = React.lazy(() => import("./pages/NSPDailySales"));
const NSPSalesSummary = React.lazy(() => import("./pages/NSPSalesSummary"));
const QuickTripsEntry = React.lazy(() => import("./pages/QuickTripsEntry"));
const GovernanceCalendar = React.lazy(() => import("./pages/GovernanceCalendar"));
const HolidayManagement = React.lazy(() => import("./pages/HolidayManagement"));
const SeasonalThemes = React.lazy(() => import("./pages/SeasonalThemes"));
const DailyBusExpenses = React.lazy(() => import("./pages/DailyBusExpenses"));
const Accounting = React.lazy(() => import("./pages/Accounting"));
const Budgeting = React.lazy(() => import("./pages/Budgeting"));
const TyreManagement = React.lazy(() => import("./pages/TyreManagement"));
const FleetAnalytics = React.lazy(() => import("./pages/FleetAnalytics"));
const VehicleInquiryHub = React.lazy(() => import("./pages/VehicleInquiryHub"));
const ScheduledTasks = React.lazy(() => import("./pages/ScheduledTasks"));
const ApiUsageMonitoring = React.lazy(() => import("./pages/ApiUsageMonitoring"));
const VerifyHubView = React.lazy(() => import("./components/system-monitor/VerifyHubView").then(m => ({ default: m.VerifyHubView })));
const ExecutiveDashboard = React.lazy(() => import("./pages/ExecutiveDashboard"));
const SystemHealthDashboard = React.lazy(() => import("./pages/SystemHealthDashboard"));
const Marketing = React.lazy(() => import("./pages/Marketing"));
const CustomerPortal = React.lazy(() => import("./pages/CustomerPortal"));
const VendorPortal = React.lazy(() => import("./pages/VendorPortal"));
const WhatsAppHub = React.lazy(() => import("./pages/WhatsAppHub"));
const SystemIssueTracker = React.lazy(() => import("./pages/SystemIssueTracker"));
const PublicYutongReport = React.lazy(() => import("./pages/PublicYutongReport"));
const PublicYutongSpreadsheet = React.lazy(() => import("./pages/PublicYutongSpreadsheet"));
const RouteManagement = React.lazy(() => import("./pages/RouteManagement"));
const MagiyaReports = React.lazy(() => import("./pages/MagiyaReports"));
const PersonalDiary = React.lazy(() => import("./pages/PersonalDiary"));
const HRHub = React.lazy(() => import("./pages/HRHub"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes — prevents duplicate fetches across components
      gcTime: 10 * 60 * 1000,
      refetchOnReconnect: false, // Don't stampede after network recovery
    },
  },
  queryCache: new QueryCache({
    onError: (() => {
      // Throttle: only show one toast per 10 seconds
      let lastToastTime = 0;
      return (error: any) => {
        console.error("[Query System Error]:", error);
        const now = Date.now();
        if (now - lastToastTime < 10_000) return; // Throttle
        lastToastTime = now;

        // Distinguish real network issues from schema/data errors
        const msg = error?.message || "";
        if (msg.includes("column") && msg.includes("does not exist")) {
          toast.error("Data configuration error detected. Please contact support.", { duration: 5000 });
        } else if (msg.includes("fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("Failed to fetch")) {
          toast.error("Network issue detected. We are recovering your connection.");
        } else {
          // Suppress non-critical query errors from spamming the user
          console.warn("[Query] Non-critical error suppressed from toast:", msg);
        }
      };
    })(),
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("[Mutation System Error]:", error);
      toast.error(error.message || "Failed to save records. Please try again.");
    },
  }),
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="ncg-theme">
    <QueryClientProvider client={queryClient}>
      <CompanyProvider>
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <SeasonalThemeProvider>
              <SystemErrorBoundary>
                <BrowserRouter>
                  <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
                    <Routes>
                      {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/verify-mfa" element={<TwoFactorVerify />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/install" element={<InstallApp />} />
            <Route path="/public/complaint" element={<PublicComplaint />} />
            <Route path="/public/special-hire" element={<PublicSpecialHire />} />
            <Route path="/public/receipt-upload" element={<PublicReceiptUpload />} />
            {/* Deprecated public route, redirect to secure portal */}
            <Route path="/public/conductor-upload" element={<Navigate to="/public/crew-login" replace />} />
            <Route path="/customer-portal" element={<CustomerPortal />} />
            <Route path="/vendor-portal" element={<VendorPortal />} />
            <Route path="/public/yutong-report" element={<PublicYutongReport />} />
            <Route path="/public/yutong-spreadsheet" element={<PublicYutongSpreadsheet />} />
            
            {/* Admin/Master Data Routes */}
            
            {/* Crew App Routes */}
            <Route path="/public/crew-login" element={
              <CrewAuthProvider>
                <CrewLogin />
              </CrewAuthProvider>
            } />
            <Route path="/public/crew" element={
              <CrewAuthProvider>
                <CrewAppLayout />
              </CrewAuthProvider>
            }>
              <Route index element={<PublicConductorUpload />} />
              <Route path="upload" element={<PublicConductorUpload />} />
              <Route path="driver-upload" element={<PublicDriverUpload />} />
              <Route path="performance" element={<CrewPerformance />} />
              <Route path="finance" element={<CrewFinance />} />
              <Route path="history" element={<CrewHistory />} />
              <Route path="schedule" element={<CrewSchedule />} />
              <Route path="profile" element={<CrewProfile />} />
            </Route>

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
                    <MFAGuard>
                      <AppLayout>
                        <ExecutiveDashboard />
                      </AppLayout>
                    </MFAGuard>
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
                  <MFAGuard>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </MFAGuard>
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
              path="/partner-reports" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MagiyaReports />
                  </AppLayout>
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
            <Route 
              path="/routes" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="route_permits">
                    <AppLayout>
                      <RouteManagement />
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
          path="/school-bus/import-expenses" 
          element={
            <ProtectedRoute>
              <SchoolBusExpenseImport />
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
              path="/feedback-module" 
              element={
                <ProtectedRoute>
                  <PageAccessGuard pageId="feedback_module">
                    <AppLayout>
                      <FeedbackModule />
                    </AppLayout>
                  </PageAccessGuard>
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
              path="/diary" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PersonalDiary />
                  </AppLayout>
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
                  <MFAGuard>
                    <AppLayout>
                      <Accounting />
                    </AppLayout>
                  </MFAGuard>
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
            <Route 
              path="/verify-hub" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <AppLayout>
                    <VerifyHubView />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/system-health" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <AppLayout>
                    <SystemHealthDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/marketing" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Marketing />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/whatsapp" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <WhatsAppHub />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/system-issues" 
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                  <PageAccessGuard pageId="system_issues">
                    <AppLayout>
                      <SystemIssueTracker />
                    </AppLayout>
                  </PageAccessGuard>
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
                  </React.Suspense>
                </BrowserRouter>
              </SystemErrorBoundary>
            </SeasonalThemeProvider>
          </AuthProvider>
        </TooltipProvider>
      </CompanyProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
 
