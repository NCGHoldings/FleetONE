import { Map, BarChart3, Bus, Calendar, Settings, Users, Wrench, Shield, MessageSquare, FileText, MapPin, UserCheck, DollarSign, Lightbulb, Star, ChevronDown, Truck, TrendingUp, AlertTriangle, Package, Settings2, GraduationCap, ShoppingCart, FileSpreadsheet, Home, Sparkles, BookOpen, Upload, Clock, Activity, Monitor, Car, Megaphone, CheckSquare, FolderKanban, Share2, Store, Search, X } from "lucide-react";
import { useExternalSystem } from "./ExternalSystemContext";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar, SidebarHeader } from "@/components/ui/sidebar";
import { LogoUpload } from "./LogoUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePagePermissions } from "@/hooks/usePagePermissions";
const mainItems = [{
  id: "dashboard",
  title: "Dashboard",
  url: "/dashboard",
  icon: BarChart3
}, {
  id: "executive_dashboard",
  title: "Executive Dashboard",
  url: "/executive-dashboard",
  icon: Monitor
}, {
  id: "customers",
  title: "Customers",
  url: "/customers",
  icon: DollarSign
}, {
  id: "daily_trips",
  title: "Daily Trips",
  url: "/trips",
  icon: Calendar
}, {
  id: "trips_analytics",
  title: "Trips Analytics",
  url: "/trips/analytics",
  icon: TrendingUp
}, {
  id: "fleet_management",
  title: "Fleet Management",
  url: "/fleet",
  icon: Bus
}, {
  id: "fleet_analytics",
  title: "Fleet Analytics",
  url: "/fleet-analytics",
  icon: BarChart3
}, {
  id: "maintenance",
  title: "Maintenance",
  url: "/maintenance",
  icon: Wrench
}, {
  id: "insurance",
  title: "Insurance",
  url: "/insurance",
  icon: Shield
}, {
  id: "staff_management",
  title: "Staff Management",
  url: "/staff",
  icon: Users
}, {
  id: "staff_performance",
  title: "Staff Performance",
  url: "/staff-performance",
  icon: TrendingUp
}, {
  id: "system_issues",
  title: "System Issues",
  url: "/system-issues",
  icon: AlertTriangle
}];
const governanceItems = [{
  id: "governance_calendar",
  title: "Governance Calendar",
  url: "/governance/calendar",
  icon: Calendar
}, {
  id: "seasonal_themes",
  title: "Seasonal Themes",
  url: "/seasonal-themes",
  icon: Sparkles
}];
const operationsItems = [{
  id: "route_dictionary",
  title: "Route Dictionary",
  url: "/routes",
  icon: Map
}, {
  id: "route_permits",
  title: "Route Permits",
  url: "/permits",
  icon: FileText
}, {
  id: "driver_training",
  title: "Driver Training",
  url: "/training",
  icon: UserCheck
}, {
  id: "real_time_tracking",
  title: "Real-Time Tracking",
  url: "/tracking",
  icon: MapPin
}, {
  id: "driver_allocation",
  title: "Driver Allocation",
  url: "/allocation",
  icon: UserCheck
}, {
  id: "staff_attendance",
  title: "Staff Attendance",
  url: "/attendance",
  icon: Calendar
}, {
  id: "school_bus_service",
  title: "School Bus Service",
  url: "/school-bus-service",
  icon: GraduationCap
}, {
  id: "complaints",
  title: "Complaints",
  url: "/complaints",
  icon: AlertTriangle
}, {
  id: "conductor_submissions",
  title: "Conductor Submissions",
  url: "/trips/conductor-submissions",
  icon: Upload
}, {
  id: "late_entry_requests",
  title: "Late Entry Requests",
  url: "/trips/late-entry-requests",
  icon: Clock
}];
const businessItems = [{
  id: "special_hire",
  title: "Special Hire",
  url: "/special-hire",
  icon: Star
}, {
  id: "business_ideas",
  title: "Business Ideas",
  url: "/business",
  icon: Lightbulb
}, {
  id: "document_manager",
  title: "Document Manager",
  url: "/documents",
  icon: FileText
}, {
  id: "feedback_module",
  title: "Feedback Module",
  url: "/feedback-module",
  icon: MessageSquare
}, {
  id: "vehicle_inquiries",
  title: "Vehicle Inquiries",
  url: "/vehicle-inquiries",
  icon: Users
}, {
  id: "whatsapp_hub",
  title: "WhatsApp Hub",
  url: "/whatsapp",
  icon: MessageSquare
}];
const yutongItems = [{
  id: "yutong_quotations",
  title: "Quotations",
  url: "/yutong-quotations",
  icon: FileText
}, {
  id: "yutong_bus_models",
  title: "Bus Models",
  url: "/yutong-quotations?tab=bus-models",
  icon: Truck
}, {
  id: "yutong_addons",
  title: "Add-ons",
  url: "/yutong-quotations?tab=addons",
  icon: Package
}, {
  id: "yutong_vehicle_data",
  title: "Vehicle Data",
  url: "/yutong-quotations?tab=vehicle-data",
  icon: FileSpreadsheet
}, {
  id: "yutong_referral",
  title: "Referral Agents",
  url: "/yutong-quotations?tab=referral",
  icon: Users
}];
const sinotruckItems = [{
  id: "sinotruck_quotations",
  title: "Quotations",
  url: "/sinotruck-quotations",
  icon: FileText
}, {
  id: "sinotruck_truck_models",
  title: "Truck Models",
  url: "/sinotruck-quotations?tab=truck-models",
  icon: Truck
}, {
  id: "sinotruck_customers",
  title: "Customers",
  url: "/sinotruck-quotations?tab=customers",
  icon: Users
}];
const lightVehicleItems = [{
  id: "lightvehicle_quotations",
  title: "Quotations",
  url: "/lightvehicle-quotations",
  icon: FileText
}, {
  id: "lightvehicle_vehicle_models",
  title: "Vehicle Models",
  url: "/lightvehicle-quotations?tab=vehicle-models",
  icon: Car
}, {
  id: "lightvehicle_addons",
  title: "Add-ons",
  url: "/lightvehicle-quotations?tab=addons",
  icon: Package
}, {
  id: "lightvehicle_vehicle_data",
  title: "Vehicle Data",
  url: "/lightvehicle-quotations?tab=vehicle-data",
  icon: FileSpreadsheet
}, {
  id: "lightvehicle_referral",
  title: "Referral Agents",
  url: "/lightvehicle-quotations?tab=referral",
  icon: Users
}];
const nspItems = [{
  id: "nsp_daily_sales",
  title: "Daily Sales",
  url: "/nsp-daily-sales",
  icon: ShoppingCart
}, {
  id: "nsp_summary",
  title: "Summary & Reports",
  url: "/nsp-summary",
  icon: FileSpreadsheet
}, {
  id: "tyre_management",
  title: "Tyre Management",
  url: "/tyre-management",
  icon: Wrench
}];
const financeItems = [{
  id: "accounting",
  title: "Accounting & GL",
  url: "/accounting",
  icon: BookOpen
}, {
  id: "budgeting",
  title: "Budgeting",
  url: "/budgeting",
  icon: BookOpen
}, {
  id: "api_usage",
  title: "API Usage",
  url: "/api-usage",
  icon: Activity
}, {
  id: "system_health",
  title: "System Health",
  url: "/system-health",
  icon: Monitor
}];
const marketingItems = [{
  id: "marketing_dashboard",
  title: "Marketing Hub",
  url: "/marketing",
  icon: Megaphone
}, {
  id: "marketing_job_requests",
  title: "Job Requests",
  url: "/marketing?tab=job-requests",
  icon: FileText
}, {
  id: "marketing_tasks",
  title: "Tasks",
  url: "/marketing?tab=tasks",
  icon: CheckSquare
}, {
  id: "marketing_projects",
  title: "Projects",
  url: "/marketing?tab=projects",
  icon: FolderKanban
}, {
  id: "marketing_team",
  title: "Team Profiles",
  url: "/marketing?tab=team",
  icon: Users
}, {
  id: "marketing_social",
  title: "Social Media",
  url: "/marketing?tab=social",
  icon: Share2
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const { openExternalSystem } = useExternalSystem();
  const location = useLocation();
  const currentPath = location.pathname;
  const [logoUrl, setLogoUrl] = useState<string>('');
  const {
    user
  } = useAuth();
  const {
    hasAccess
  } = usePagePermissions();

  // Load company logo on mount
  useEffect(() => {
    loadLogo();
  }, []);
  const loadLogo = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'company_logo_url').maybeSingle();
      if (error) {
        console.error('Error loading logo:', error);
        return;
      }
      if (data?.setting_value) {
        setLogoUrl(data.setting_value as string);
      }
    } catch (error) {
      console.error('Error in loadLogo:', error);
    }
  };
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-medium shadow-primary animate-pulse-subtle" : "hover:bg-accent/10 text-sidebar-foreground hover:text-primary hover:bg-gradient-to-r hover:from-accent/5 hover:to-primary/5 transition-all duration-300 ease-out hover:shadow-sm hover:scale-[1.02]";

  // Filter items based on user-specific page permissions (default allow)
  const visibleMain = mainItems.filter(i => hasAccess(i.id));
  const visibleOperations = operationsItems.filter(i => hasAccess(i.id));
  const visibleBusiness = businessItems.filter(i => hasAccess(i.id));
  const visibleFinance = financeItems.filter(i => hasAccess(i.id));
  const visibleYutong = yutongItems.filter(i => hasAccess(i.id));
  const visibleSinotruck = sinotruckItems.filter(i => hasAccess(i.id));
  const visibleLightVehicle = lightVehicleItems.filter(i => hasAccess(i.id));
  const visibleNSP = nspItems.filter(i => hasAccess(i.id));
  const visibleGovernance = governanceItems.filter(i => hasAccess(i.id));
  const visibleMarketing = marketingItems.filter(i => hasAccess(i.id));
  return <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-4 bg-gradient-to-r from-sidebar-background to-sidebar-accent/30">
        <div className="flex items-center justify-center">
          <div className="w-full h-16 bg-white rounded-xl flex items-center justify-center shadow-primary animate-logo-glow overflow-hidden p-2">
            <img alt="NCG Express Logo" className="w-full h-full object-cover" src="/lovable-uploads/63d8423d-8cb8-4a1c-a23f-ce71de1f5e5c.png" />
          </div>
        </div>
        <SidebarTrigger className="ml-auto hover:scale-110 transition-transform duration-200 hover:rotate-180" />
      </SidebarHeader>

      <SidebarContent className="py-4">
        {/* External Systems Quick Access */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => openExternalSystem({ name: "Stores One", url: "https://storesone.lovable.app" })}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium shadow-md hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg transition-all duration-300 rounded-lg w-full text-left"
                  >
                    <Store className="w-5 h-5 transition-all duration-300" />
                    {!collapsed && <span className="font-medium transition-all duration-300">Stores One</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => openExternalSystem({ name: "Document ERP", url: "https://docs.lgh.lk" })}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-md hover:from-blue-700 hover:to-blue-600 hover:shadow-lg transition-all duration-300 rounded-lg w-full text-left"
                  >
                    <BookOpen className="w-5 h-5 transition-all duration-300" />
                    {!collapsed && <span className="font-medium transition-all duration-300">Document ERP</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => openExternalSystem({ name: "Garage One", url: "https://staging.garageone.ncg.lk/login" })}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 text-white font-medium shadow-md hover:from-orange-700 hover:to-orange-600 hover:shadow-lg transition-all duration-300 rounded-lg w-full text-left"
                  >
                    <Wrench className="w-5 h-5 transition-all duration-300" />
                    {!collapsed && <span className="font-medium transition-all duration-300">Garage One</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Always visible Home link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className={getNavCls}>
                    <Home className="w-5 h-5 transition-all duration-300" />
                    {!collapsed && <span className="font-medium transition-all duration-300">Home</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"></div>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {visibleMain.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} end className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-accent to-warning rounded-full animate-pulse"></div>
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {visibleOperations.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-success to-primary rounded-full animate-pulse"></div>
            Business
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {visibleBusiness.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleMarketing.length > 0 && <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse"></div>
              Marketing
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
            {visibleMarketing.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-warning to-accent rounded-full animate-pulse"></div>
            Yutong Sales
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {visibleYutong.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse"></div>
            Sinotruck Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {visibleSinotruck.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full animate-pulse"></div>
            Light Vehicle Sales
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {visibleLightVehicle.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleFinance.length > 0 && <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
              Finance
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
            {visibleFinance.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
            NCG Spare Parts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
            {visibleNSP.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleGovernance.length > 0 && <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
              Governance
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
            {visibleGovernance.map(item => <SidebarMenuItem key={item.title}>
    <SidebarMenuButton asChild>
      <NavLink to={item.url} className={getNavCls}>
        <item.icon className="w-5 h-5 transition-all duration-300" />
        {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>
    </Sidebar>;
}