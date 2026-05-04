import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bus, Loader2 } from 'lucide-react';
import { useCrewAuth } from '@/contexts/CrewAuthContext';

export default function CrewLogin() {
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, isAuthenticated, isLoading } = useCrewAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  React.useEffect(() => {
    localStorage.setItem('app_mode', 'crew');
    if (isAuthenticated && !isLoading) {
      navigate('/public/crew', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nic.trim() || !phone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both NIC and Phone Number.",
        variant: "destructive"
      });
      return;
    }

    setIsLoggingIn(true);
    
    const success = await login(nic, phone);
    
    setIsLoggingIn(false);

    if (success) {
      toast({
        title: "Welcome Back",
        description: "Successfully logged in to Crew App.",
      });
      navigate('/public/crew');
    } else {
      toast({
        title: "Login Failed",
        description: "Could not find a crew record matching this NIC and Phone Number. Please ask HR to verify your details.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="bg-blue-600 p-6 flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-black text-white text-center">NCG Speed Crew</CardTitle>
          <CardDescription className="text-blue-100 text-center mt-2">
            Enter your details to access your daily targets, history, and schedule.
          </CardDescription>
        </div>
        
        {!window.matchMedia('(display-mode: standalone)').matches && (
          <div className="bg-amber-50 p-3 flex items-center justify-between border-b border-amber-100">
            <div className="text-sm text-amber-800 font-medium">For the best experience, install our app!</div>
            <Button size="sm" variant="outline" className="bg-white hover:bg-amber-100 text-amber-700 border-amber-200" onClick={() => navigate('/install?app=crew')}>
              Install App
            </Button>
          </div>
        )}
        
        <CardContent className="p-6 sm:p-8 bg-white">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nic" className="text-slate-600 font-bold">NIC Number</Label>
              <Input 
                id="nic"
                placeholder="e.g. 199012345678 or 901234567V" 
                value={nic}
                onChange={(e) => setNic(e.target.value.toUpperCase())}
                className="h-12 bg-slate-50 border-slate-200"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-600 font-bold">Phone Number</Label>
              <Input 
                id="phone"
                type="tel"
                placeholder="e.g. 0712345678" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 bg-slate-50 border-slate-200"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 mt-4"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Access Portal'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
