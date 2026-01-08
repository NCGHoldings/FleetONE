// Testable routes extracted from src/lib/pages.ts
// Each route includes metadata for reporting

export interface TestableRoute {
  id: string;
  title: string;
  url: string;
  category: string;
}

export const TESTABLE_ROUTES: TestableRoute[] = [
  // Main
  { id: 'dashboard', title: 'Dashboard', url: '/', category: 'Main' },
  { id: 'executive_dashboard', title: 'Executive Dashboard', url: '/executive-dashboard', category: 'Main' },
  { id: 'customers', title: 'Customers', url: '/customers', category: 'Main' },
  { id: 'daily_trips', title: 'Daily Trips', url: '/trips', category: 'Main' },
  { id: 'trips_analytics', title: 'Trips Analytics', url: '/trips/analytics', category: 'Main' },
  { id: 'fleet_management', title: 'Fleet Management', url: '/fleet', category: 'Main' },
  { id: 'fleet_analytics', title: 'Fleet Analytics', url: '/fleet-analytics', category: 'Main' },
  { id: 'maintenance', title: 'Maintenance', url: '/maintenance', category: 'Main' },
  { id: 'insurance', title: 'Insurance', url: '/insurance', category: 'Main' },
  { id: 'staff_management', title: 'Staff Management', url: '/staff', category: 'Main' },
  { id: 'staff_performance', title: 'Staff Performance', url: '/staff-performance', category: 'Main' },

  // Operations
  { id: 'route_permits', title: 'Route Permits', url: '/permits', category: 'Operations' },
  { id: 'driver_training', title: 'Driver Training', url: '/training', category: 'Operations' },
  { id: 'real_time_tracking', title: 'Real-Time Tracking', url: '/tracking', category: 'Operations' },
  { id: 'driver_allocation', title: 'Driver Allocation', url: '/allocation', category: 'Operations' },
  { id: 'staff_attendance', title: 'Staff Attendance', url: '/attendance', category: 'Operations' },
  { id: 'school_bus_service', title: 'School Bus Service', url: '/school-bus-service', category: 'Operations' },
  { id: 'complaints', title: 'Complaints', url: '/complaints', category: 'Operations' },

  // Business
  { id: 'special_hire', title: 'Special Hire', url: '/special-hire', category: 'Business' },
  { id: 'business_ideas', title: 'Business Ideas', url: '/business', category: 'Business' },
  { id: 'document_manager', title: 'Document Manager', url: '/documents', category: 'Business' },
  { id: 'feedback', title: 'Feedback', url: '/feedback', category: 'Business' },
  { id: 'vehicle_inquiries', title: 'Vehicle Inquiries', url: '/vehicle-inquiries', category: 'Business' },

  // Finance
  { id: 'accounting', title: 'Accounting & GL', url: '/accounting', category: 'Finance' },
  { id: 'budgeting', title: 'Budgeting', url: '/budgeting', category: 'Finance' },
  { id: 'api_usage', title: 'API Usage', url: '/api-usage', category: 'Finance' },

  // Yutong
  { id: 'yutong_quotations', title: 'Yutong Quotations', url: '/yutong-quotations', category: 'Yutong' },

  // Sinotruck
  { id: 'sinotruck_quotations', title: 'Sinotruck Quotations', url: '/sinotruck-quotations', category: 'Sinotruck' },

  // NSP
  { id: 'nsp_daily_sales', title: 'NSP Daily Sales', url: '/nsp-daily-sales', category: 'NSP' },
  { id: 'nsp_summary', title: 'NSP Summary & Reports', url: '/nsp-summary', category: 'NSP' },
  { id: 'tyre_management', title: 'Tyre Management', url: '/tyre-management', category: 'NSP' },

  // Governance
  { id: 'governance_calendar', title: 'Governance Calendar', url: '/governance/calendar', category: 'Governance' },
  { id: 'governance_holidays', title: 'Holiday Management', url: '/governance/holidays', category: 'Governance' },
  { id: 'seasonal_themes', title: 'Seasonal Themes', url: '/seasonal-themes', category: 'Governance' },
  { id: 'scheduled_tasks', title: 'Scheduled Tasks', url: '/scheduled-tasks', category: 'Governance' },

  // Settings
  { id: 'settings', title: 'Settings', url: '/settings', category: 'Settings' },
];

// Routes that should be skipped (require special handling or are external)
export const SKIP_ROUTES = [
  '/auth',
  '/welcome',
  '/install',
];

// Get all testable routes
export function getTestableRoutes(): TestableRoute[] {
  return TESTABLE_ROUTES.filter(route => !SKIP_ROUTES.includes(route.url));
}
