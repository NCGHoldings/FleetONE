import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Chrome,
  AlertTriangle,
  ExternalLink
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
  const [isSafari, setIsSafari] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Check if app is already installed (works for both Android and iOS)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
    setIsInStandaloneMode(isStandalone);

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(/android/.test(userAgent));

    // Detect if Safari on iOS (not Chrome, Firefox, etc.)
    // Safari on iOS doesn't include "chrome", "crios", "fxios", "edgios" in user agent
    const isSafariBrowser = isIOSDevice && 
      /safari/i.test(userAgent) && 
      !/chrome|crios|fxios|edgios|opios/i.test(userAgent);
    setIsSafari(isSafariBrowser);

    // Listen for install prompt (Android/Chrome only)
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

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
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
                      Add to Home Screen via Safari
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Safari Warning for iOS users not in Safari */}
                {isIOS && !isSafari && (
                  <Alert className="bg-amber-500/20 border-amber-500/30 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <AlertDescription className="text-amber-200 ml-2">
                      <strong className="block mb-1">Open in Safari Required</strong>
                      <span className="text-xs">
                        PWAs can only be installed through Safari on iPhone/iPad. 
                        Copy this URL and paste it in Safari.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {isIOS && !isSafari && (
                  <Button 
                    onClick={copyUrlToClipboard}
                    className="w-full mb-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200"
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Copy URL for Safari
                  </Button>
                )}

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      1
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Open in Safari</p>
                      <p className="text-xs text-blue-200">Must use Safari browser (not Chrome/Firefox)</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded bg-blue-500/30 flex items-center justify-center">
                          <span className="text-xs">🧭</span>
                        </div>
                        <span className="text-xs text-blue-300">Safari</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      2
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Tap Share button</p>
                      <p className="text-xs text-blue-200">Bottom center of Safari</p>
                      <div className="flex items-center gap-2 mt-1 bg-white/10 rounded-lg px-3 py-2">
                        <Share className="w-5 h-5 text-blue-300" />
                        <span className="text-xs text-blue-200">Tap this icon ↑</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      3
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Add to Home Screen</p>
                      <p className="text-xs text-blue-200">Scroll down in share menu and tap</p>
                      <div className="flex items-center gap-2 mt-1 bg-white/10 rounded-lg px-3 py-2">
                        <Plus className="w-5 h-5 text-blue-300" />
                        <span className="text-xs text-blue-200">Add to Home Screen</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-bold text-green-300">
                      4
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Tap "Add"</p>
                      <p className="text-xs text-blue-200">Top right corner to confirm</p>
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-1" />
                    </div>
                  </div>
                </div>

                {/* Safari confirmation badge */}
                {isIOS && isSafari && (
                  <div className="mt-4 p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-300 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>You're in Safari - Ready to install!</span>
                    </div>
                  </div>
                )}
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
