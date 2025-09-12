// Centralized list of navigation pages for access control and sidebar rendering
// Each page has a stable id used in permissions, a title, url, and category

export type PageItem = {
  id: string;
  title: string;
  url: string;
};

export type PageCategories = {
  main: PageItem[];
  operations: PageItem[];
  business: PageItem[];
  yutong: PageItem[];
};

export const PAGES: PageCategories = {
  main: [
    { id: "dashboard", title: "Dashboard", url: "/" },
    { id: "customers", title: "Customers", url: "/customers" },
    { id: "daily_trips", title: "Daily Trips", url: "/trips" },
    { id: "fleet_management", title: "Fleet Management", url: "/fleet" },
    { id: "maintenance", title: "Maintenance", url: "/maintenance" },
    { id: "insurance", title: "Insurance", url: "/insurance" },
    { id: "staff_management", title: "Staff Management", url: "/staff" },
    { id: "staff_performance", title: "Staff Performance", url: "/staff-performance" },
  ],
  operations: [
    { id: "route_permits", title: "Route Permits", url: "/permits" },
    { id: "driver_training", title: "Driver Training", url: "/training" },
    { id: "real_time_tracking", title: "Real-Time Tracking", url: "/tracking" },
    { id: "driver_allocation", title: "Driver Allocation", url: "/allocation" },
    { id: "staff_attendance", title: "Staff Attendance", url: "/attendance" },
    { id: "school_bus_service", title: "School Bus Service", url: "/school-bus-service" },
    { id: "complaints", title: "Complaints", url: "/complaints" },
  ],
  business: [
    { id: "special_hire", title: "Special Hire", url: "/special-hire" },
    { id: "business_ideas", title: "Business Ideas", url: "/business" },
    { id: "document_manager", title: "Document Manager", url: "/documents" },
    { id: "feedback", title: "Feedback", url: "/feedback" },
  ],
  yutong: [
    { id: "yutong_quotations", title: "Quotations", url: "/yutong-quotations" },
    { id: "yutong_bus_models", title: "Bus Models", url: "/yutong-quotations?tab=bus-models" },
    { id: "yutong_addons", title: "Add-ons", url: "/yutong-quotations?tab=addons" },
  ],
};

export const ALL_PAGES_FLAT: PageItem[] = [
  ...PAGES.main,
  ...PAGES.operations,
  ...PAGES.business,
  ...PAGES.yutong,
];
