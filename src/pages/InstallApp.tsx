import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Download, 
  Share, 
  Plus, 
  CheckCircle2, 
  Zap, 
  Wifi, 
  Shield,
  Bus,
  ArrowRight,
  Monitor,
  Apple,
  Chrome
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Zap,
      title: "Fast Launch",
      description: "Opens instantly from your home screen"
    },
    {
      icon: Wifi,
      title: "Works Offline",
      description: "Access core features without internet"
    },
    {
      icon: Shield,
      title: "Secure",
      description: "Enterprise-grade security protocols"
    },
    {
      icon: Bus,
      title: "Full Features",
      description: "Complete fleet management on mobile"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl mb-6 border border-white/20">
            <Bus className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            NCG Speed TMS
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Install our app for the best experience - fast, offline-capable, and always accessible from your home screen.
          </p>
        </div>

        {/* Installation Status */}
        {isInstalled ? (
          <Card className="max-w-lg mx-auto bg-green-500/20 border-green-500/30 backdrop-blur-sm mb-12">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 text-green-300">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-xl font-semibold">App Already Installed!</span>
              </div>
              <p className="text-center text-green-200 mt-2">
                You can access NCG Speed from your home screen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            {/* Android/Chrome Install */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Chrome className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Android / Chrome</CardTitle>
                    <CardDescription className="text-blue-200">
                      Quick one-tap install
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {deferredPrompt ? (
                  <Button 
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install Now
                  </Button>
                ) : isAndroid ? (
                  <div className="space-y-3">
                    <p className="text-sm text-blue-200">
                      Tap the menu button in Chrome and select "Install app" or "Add to Home screen"
                    </p>
                    <div className="flex items-center gap-2 text-xs text-blue-300">
                      <Badge variant="outline" className="border-blue-400 text-blue-300">
                        <Monitor className="w-3 h-3 mr-1" />
                        Menu
                      </Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge variant="outline" className="border-blue-400 text-blue-300">
                        <Plus className="w-3 h-3 mr-1" />
                        Install
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-200">
                    Open this page in Chrome on Android for the best install experience.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* iOS Install */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Apple className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">iPhone / iPad</CardTitle>
                    <CardDescription className="text-blue-200">
                      Add to Home Screen
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      1
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Tap Share button</p>
                      <p className="text-xs text-blue-200">Bottom of Safari browser</p>
                      <Share className="w-5 h-5 text-blue-300 mt-1" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      2
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Add to Home Screen</p>
                      <p className="text-xs text-blue-200">Scroll down in share menu</p>
                      <Plus className="w-5 h-5 text-blue-300 mt-1" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      3
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Tap Add</p>
                      <p className="text-xs text-blue-200">Confirm to install</p>
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-1" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Why Install?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm text-center">
                <CardContent className="pt-6">
                  <feature.icon className="w-8 h-8 mx-auto mb-3 text-blue-300" />
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-xs text-blue-200">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Back to App Link */}
        <div className="text-center mt-12">
          <Button 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10"
            onClick={() => window.location.href = '/'}
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to App
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
