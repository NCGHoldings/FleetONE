import { 
  BarChart3, 
  Bus, 
  Calendar, 
  Settings, 
  Users, 
  Wrench,
  Shield,
  MessageSquare,
  FileText,
  MapPin,
  UserCheck,
  DollarSign,
  Lightbulb,
  Star,
  ChevronDown,
  Truck,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "Daily Trips", url: "/trips", icon: Calendar },
  { title: "Fleet Management", url: "/fleet", icon: Bus },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Insurance", url: "/insurance", icon: Shield },
  { title: "Staff Management", url: "/staff", icon: Users },
  { title: "Staff Performance", url: "/staff-performance", icon: TrendingUp },
];

const operationsItems = [
  { title: "Route Permits", url: "/permits", icon: FileText },
  { title: "Driver Training", url: "/training", icon: UserCheck },
  { title: "Real-Time Tracking", url: "/tracking", icon: MapPin },
  { title: "Driver Allocation", url: "/allocation", icon: UserCheck },
  { title: "Staff Attendance", url: "/attendance", icon: Calendar },
  { title: "Complaints", url: "/complaints", icon: AlertTriangle },
];

const businessItems = [
  { title: "Special Hire", url: "/special-hire", icon: Star },
  { title: "Business Ideas", url: "/business", icon: Lightbulb },
  { title: "Document Manager", url: "/documents", icon: FileText },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-medium shadow-primary animate-pulse-subtle" 
      : "hover:bg-accent/10 text-sidebar-foreground hover:text-primary hover:bg-gradient-to-r hover:from-accent/5 hover:to-primary/5 transition-all duration-300 ease-out hover:shadow-sm hover:scale-[1.02]";

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-4 bg-gradient-to-r from-sidebar-background to-sidebar-accent/30">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary-hover to-accent rounded-xl flex items-center justify-center shadow-primary animate-logo-glow">
            <Truck className="w-6 h-6 text-primary-foreground animate-bounce-subtle" />
          </div>
          {!collapsed && (
            <div className="animate-slide-in-right">
              <h2 className="font-bold text-sidebar-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">NCG Speed</h2>
              <p className="text-xs text-sidebar-foreground/70">Transport Management</p>
            </div>
          )}
        </div>
        <SidebarTrigger className="ml-auto hover:scale-110 transition-transform duration-200 hover:rotate-180" />
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"></div>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="w-5 h-5 transition-all duration-300" />
                      {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-5 h-5 transition-all duration-300" />
                      {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
              {businessItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-5 h-5 transition-all duration-300" />
                      {!collapsed && <span className="font-medium transition-all duration-300">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}