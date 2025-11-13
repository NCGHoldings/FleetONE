import { 
  LayoutDashboard, Users, Bus, Wrench, Calendar, Shield, 
  FileText, Route, ClipboardList, School, DollarSign, 
  TrendingUp, Settings, Briefcase, PackageOpen, ShoppingCart,
  AlertCircle, Receipt, UserCheck, Clock, MapPin, BarChart3,
  FileSpreadsheet, Building2, CreditCard, BookOpen, LucideIcon
} from "lucide-react";

export interface RouteInfo {
  name: string;
  category: string;
  icon?: LucideIcon;
  parent?: string;
}

export const ROUTE_NAMES: Record<string, RouteInfo> = {
  // Main
  '/': { name: 'Home', category: 'Main', icon: LayoutDashboard },
  '/dashboard': { name: 'Dashboard', category: 'Main', icon: BarChart3 },
  '/total-dashboard': { name: 'Total Dashboard', category: 'Main', icon: BarChart3 },
  '/branch-dashboard': { name: 'Branch Dashboard', category: 'Main', icon: Building2 },
  
  // Governance & Compliance
  '/governance-calendar': { name: 'Governance Calendar', category: 'Governance', icon: Calendar },
  '/route-permits': { name: 'Route Permits', category: 'Governance', icon: FileText },
  '/insurance': { name: 'Insurance Management', category: 'Governance', icon: Shield },
  '/holiday-management': { name: 'Holiday Management', category: 'Governance', icon: Calendar },
  
  // Operations
  '/daily-trips': { name: 'Daily Trips', category: 'Operations', icon: Route },
  '/quick-trips-entry': { name: 'Quick Trips Entry', category: 'Operations', icon: Clock },
  '/trips/analytics': { name: 'Trip Analytics', category: 'Operations', icon: TrendingUp },
  '/daily-bus-expenses': { name: 'Daily Bus Expenses', category: 'Operations', icon: Receipt },
  '/driver-allocation': { name: 'Driver Allocation', category: 'Operations', icon: UserCheck },
  '/real-time-tracking': { name: 'Real-Time Tracking', category: 'Operations', icon: MapPin },
  
  // Fleet Management
  '/fleet-management': { name: 'Fleet Management', category: 'Fleet', icon: Bus },
  '/maintenance': { name: 'Maintenance', category: 'Fleet', icon: Wrench },
  
  // Staff Management
  '/staff-management': { name: 'Staff Management', category: 'Staff', icon: Users },
  '/staff-performance': { name: 'Staff Performance', category: 'Staff', icon: TrendingUp },
  '/staff-attendance-payroll': { name: 'Attendance & Payroll', category: 'Staff', icon: Clock },
  '/driver-training': { name: 'Driver Training', category: 'Staff', icon: BookOpen },
  
  // Business Development
  '/special-hire': { name: 'Special Hire', category: 'Business', icon: Briefcase },
  '/school-bus-service': { name: 'School Bus Service', category: 'Business', icon: School },
  '/school-route-management': { name: 'School Route Management', category: 'Business', icon: Route, parent: '/school-bus-service' },
  '/school-payments': { name: 'School Payments', category: 'Business', icon: DollarSign, parent: '/school-bus-service' },
  '/school-student-database': { name: 'Student Database', category: 'Business', icon: Users, parent: '/school-bus-service' },
  '/school-reports': { name: 'School Reports', category: 'Business', icon: FileText, parent: '/school-bus-service' },
  '/school-branch-reports': { name: 'School Branch Reports', category: 'Business', icon: Building2, parent: '/school-bus-service' },
  '/global-school-payments': { name: 'Global School Payments', category: 'Business', icon: CreditCard, parent: '/school-bus-service' },
  '/customer-management': { name: 'Customer Management', category: 'Business', icon: Users },
  '/complaints': { name: 'Complaints Management', category: 'Business', icon: AlertCircle },
  
  // Yutong Sales
  '/yutong-quotations': { name: 'Yutong Quotations', category: 'Yutong', icon: FileText },
  
  // NSP
  '/nsp-daily-sales': { name: 'NSP Daily Sales', category: 'NSP', icon: ShoppingCart },
  '/nsp-sales-summary': { name: 'NSP Sales Summary', category: 'NSP', icon: TrendingUp },
  
  // Finance & Accounting
  '/accounting': { name: 'Accounting', category: 'Finance', icon: FileSpreadsheet },
  
  // Settings & Admin
  '/settings': { name: 'Settings', category: 'Admin', icon: Settings },
  '/profile': { name: 'My Profile', category: 'Admin', icon: Users },
  '/seasonal-themes': { name: 'Seasonal Themes', category: 'Admin', icon: Settings },
  '/document-manager': { name: 'Document Manager', category: 'Admin', icon: FileText },
};

export const getRouteInfo = (pathname: string): RouteInfo | null => {
  return ROUTE_NAMES[pathname] || null;
};

export const getBreadcrumbs = (pathname: string): Array<{ name: string; path: string; icon?: LucideIcon }> => {
  const breadcrumbs: Array<{ name: string; path: string; icon?: LucideIcon }> = [
    { name: 'Home', path: '/', icon: LayoutDashboard }
  ];

  const routeInfo = getRouteInfo(pathname);
  
  if (!routeInfo || pathname === '/') {
    return breadcrumbs;
  }

  // If route has a parent, add parent first
  if (routeInfo.parent) {
    const parentInfo = getRouteInfo(routeInfo.parent);
    if (parentInfo) {
      breadcrumbs.push({
        name: parentInfo.name,
        path: routeInfo.parent,
        icon: parentInfo.icon
      });
    }
  }

  // Add current route
  breadcrumbs.push({
    name: routeInfo.name,
    path: pathname,
    icon: routeInfo.icon
  });

  return breadcrumbs;
};
