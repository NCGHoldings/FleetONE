import { Bell, Search, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonalThemeContext } from "../seasonal/SeasonalThemeProvider";
import { getBreadcrumbs } from "@/lib/route-names";

export function Header() {
  const { user, userProfile, userRoles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTheme, isThemeActive } = useSeasonalThemeContext();
  
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getRoleDisplay = (roles: string[]) => {
    if (roles.includes("super_admin")) return "Super Admin";
    if (roles.includes("admin")) return "Admin";
    if (roles.includes("supervisor")) return "Supervisor";
    if (roles.includes("driver")) return "Driver";
    if (roles.includes("conductor")) return "Conductor";
    if (roles.includes("mechanic")) return "Mechanic";
    return "Staff";
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const headerStyle = isThemeActive && activeTheme?.theme_config.colors.headerOverlay
    ? { background: activeTheme.theme_config.colors.headerOverlay }
    : {};

  return (
    <header 
      className="h-16 border-b border-border/50 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-md flex items-center justify-between px-6 shadow-sm animate-slide-down transition-all duration-500"
      style={headerStyle}
    >
      {isThemeActive && activeTheme?.theme_config.greeting && (
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground px-4 py-1 rounded-b-lg text-sm font-medium shadow-lg animate-bounce-in">
          {activeTheme.theme_config.greeting}
        </div>
      )}
      <div className="flex items-center gap-6 flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm animate-slide-in" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const Icon = crumb.icon;
            
            return (
              <div key={crumb.path} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                {isLast ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    {Icon && <Icon className="w-4 h-4 text-primary" />}
                    <span className="font-semibold text-primary">{crumb.name}</span>
                  </div>
                ) : (
                  <Link
                    to={crumb.path}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{crumb.name}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Search Bar - Hidden on smaller screens */}
        <div className="relative w-80 animate-scale-in hidden lg:block ml-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-pulse-subtle" />
          <Input 
            placeholder="Search..." 
            className="pl-10 bg-gradient-to-r from-muted/30 to-muted/60 border-border/50 focus:bg-gradient-to-r focus:from-primary/5 focus:to-accent/5 transition-all duration-300 hover:shadow-md focus:shadow-primary/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative hover:scale-110 transition-all duration-300 hover:bg-primary/10">
          <Bell className="w-5 h-5 animate-wiggle" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-destructive to-warning rounded-full text-xs flex items-center justify-center text-destructive-foreground animate-bounce-notification">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-300 hover:scale-105">
              <Avatar className="w-8 h-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300">
                <AvatarImage src={userProfile?.avatar_url} alt="User" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                  {getInitials(userProfile?.first_name, userProfile?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium">
                  {userProfile?.first_name && userProfile?.last_name
                    ? `${userProfile.first_name} ${userProfile.last_name}`
                    : user?.email || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getRoleDisplay(userRoles)}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}