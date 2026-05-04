import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Bus, MapPin, Clock } from "lucide-react";
import luxuryBusHero from "@/assets/luxury-bus-hero.jpg";

export default function Welcome() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.search.includes('source=pwa_crew')) {
      navigate('/public/crew', { replace: true });
    }
  }, [navigate]);

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${luxuryBusHero})` }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-background/90" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full max-w-2xl mx-4 animate-fade-in">
          {/* Glassmorphism Card */}
          <Card className="backdrop-blur-xl bg-white/85 dark:bg-background/85 border-white/30 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Welcome to NCG Speed
              </CardTitle>
              <CardDescription className="text-lg">
                {userProfile?.first_name && (
                  <span className="block mb-2 font-medium text-foreground">
                    Hello, {userProfile.first_name} {userProfile.last_name}!
                  </span>
                )}
                Your account has been successfully created.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 space-y-4 border border-border/50">
                <h3 className="font-semibold text-lg">Account Setup in Progress</h3>
                <p className="text-muted-foreground">
                  Your account is currently being configured by our administrators. 
                  You will receive access to the system modules shortly.
                </p>
                
                <div className="flex items-start gap-3 mt-4 p-4 bg-background/80 rounded-lg border border-border/30">
                  <Mail className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Need Access?</p>
                    <p className="text-sm text-muted-foreground">
                      Please contact your system administrator to request access to specific modules.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
                Once access is granted, you'll be able to navigate to your assigned pages using the sidebar menu.
              </div>
            </CardContent>
          </Card>

          {/* Stats Bar */}
          <div className="mt-6 flex justify-center gap-8 text-white/90">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5" />
              <span className="text-sm font-medium">100+ Buses</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium">50+ Routes</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">24/7 Operations</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}