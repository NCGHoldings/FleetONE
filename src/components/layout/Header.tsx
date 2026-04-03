import { useState } from "react";
import { Bell, Search, User, Settings, LogOut, Menu } from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_VERSION } from "@/config/appVersion";
import { WhatsNewDialog, useHasNewVersion } from "./WhatsNewDialog";
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
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  const { user, userProfile, userRoles, signOut } = useAuth();
  const navigate = useNavigate();
  const { activeTheme, isThemeActive } = useSeasonalThemeContext();
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const hasNewVersion = useHasNewVersion();

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
      className="h-14 sm:h-16 border-b border-border/50 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-4 md:px-6 shadow-sm animate-slide-down transition-all duration-500"
      style={headerStyle}
    >
      {isThemeActive && activeTheme?.theme_config.greeting && (
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground px-3 sm:px-4 py-1 rounded-b-lg text-xs sm:text-sm font-medium shadow-lg animate-bounce-in z-50">
          {activeTheme.theme_config.greeting}
        </div>
      )}
      <div className="flex items-center gap-2 sm:gap-4 flex-1">
        {/* Mobile hamburger menu - visible only on mobile/tablet */}
        <SidebarTrigger className="md:hidden h-9 w-9 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors" />
        
        {/* Search bar - hidden on mobile, visible on tablet+ */}
        <div className="relative hidden sm:block w-48 md:w-64 lg:w-96 animate-scale-in">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search..." 
            className="pl-10 h-9 text-sm bg-gradient-to-r from-muted/30 to-muted/60 border-border/50 focus:bg-gradient-to-r focus:from-primary/5 focus:to-accent/5 transition-all duration-300 hover:shadow-md focus:shadow-primary/20"
          />
        </div>
        
        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9">
          <Search className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <DarkModeToggle />
        <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:scale-110 transition-all duration-300 hover:bg-primary/10">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-destructive to-warning rounded-full text-[8px] sm:text-xs flex items-center justify-center text-destructive-foreground">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-1.5 sm:px-2 hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-300">
              <Avatar className="w-7 h-7 sm:w-8 sm:h-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300">
                <AvatarImage src={userProfile?.avatar_url} alt="User" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-xs sm:text-sm">
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