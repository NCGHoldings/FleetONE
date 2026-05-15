import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bus, Loader2, KeyRound, Phone, User, CreditCard } from 'lucide-react';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};

const formatNIC = (val: string) => {
  const cleaned = val.replace(/\s/g, '').toUpperCase();
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

export default function CrewLogin() {
  const [nic, setNic] = useState('');
  
  // Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regCallingName, setRegCallingName] = useState('');
  const [regNic, setRegNic] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const { login, register, isAuthenticated, isLoading } = useCrewAuth();
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
    
    if (!nic.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your NIC.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    const cleanNic = nic.replace(/\s/g, '');
    const success = await login(cleanNic);
    setIsProcessing(false);

    if (success) {
      toast({
        title: "Welcome Back",
        description: "Successfully logged in to Crew App.",
      });
      navigate('/public/crew');
    } else {
      toast({
        title: "Login Failed",
        description: "Could not find a matching record. Please verify your NIC.",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regFullName || !regCallingName || !regNic || !regPhone) {
      toast({ title: "Missing Information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const cleanRegNic = regNic.replace(/\s/g, '');
    const result = await register(regFullName, regCallingName, cleanRegNic, regPhone);
    setIsProcessing(false);

    if (result.success) {
      toast({ title: "Registration Successful", description: "Welcome to NCG Speed Crew!" });
      navigate('/public/crew');
    } else {
      toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4 relative overflow-x-hidden overflow-y-auto">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/20 blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="w-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border-white/10 overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-xl">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-6 sm:p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
            {/* Inner abstract shape */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
              className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner border border-white/20"
            >
              <Bus className="w-8 h-8 text-white drop-shadow-md" />
            </motion.div>
            <CardTitle className="text-2xl font-black text-white text-center tracking-tight drop-shadow-sm">NCG Speed Crew</CardTitle>
            <CardDescription className="text-blue-100/90 text-center mt-2 text-sm font-medium max-w-[250px] leading-relaxed">
              Your gateway to targets, history, and daily dispatches.
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
        
          <CardContent className="p-5 sm:p-8 bg-transparent">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full grid grid-cols-2 p-1.5 rounded-xl bg-slate-100/80 mb-5 shadow-inner">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow text-sm font-bold py-2 transition-all">
                  Log In
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow text-sm font-bold py-2 transition-all">
                  Create Profile
                </TabsTrigger>
              </TabsList>

              <div className="relative overflow-hidden">
                <TabsContent value="login" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nic" className="text-slate-600 font-bold text-sm">ID Card Number (NIC)</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input 
                      id="nic"
                      placeholder="e.g. 1990 1234 5678 or 9012 3456 7V" 
                      value={nic}
                      onChange={(e) => setNic(formatNIC(e.target.value))}
                      className="h-11 pl-10 bg-slate-50 border-slate-200 tracking-wider"
                      required
                    />
                  </div>
                </div>

                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl text-lg font-bold bg-blue-600 hover:bg-blue-700 mt-2 shadow-lg shadow-blue-600/20 transition-transform active:scale-[0.98]"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                      ) : (
                        'Access Portal'
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-bold text-sm">Full Name</Label>
                  <Input 
                    placeholder="John Doe" 
                    value={regFullName}
                    onChange={(e) => setRegFullName(toTitleCase(e.target.value))}
                    className="h-11 bg-slate-50 border-slate-200"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-bold text-sm">Calling Name (Nickname)</Label>
                  <Input 
                    placeholder="John" 
                    value={regCallingName}
                    onChange={(e) => setRegCallingName(toTitleCase(e.target.value))}
                    className="h-11 bg-slate-50 border-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-bold text-sm">ID Card Number (NIC)</Label>
                  <Input 
                    placeholder="1990 1234 5678 or 9012 3456 7V" 
                    value={regNic}
                    onChange={(e) => setRegNic(formatNIC(e.target.value))}
                    className="h-11 bg-slate-50 border-slate-200 tracking-wider"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-bold text-sm">Phone Number</Label>
                  <Input 
                    type="tel"
                    placeholder="0712345678" 
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="h-11 bg-slate-50 border-slate-200"
                    required
                  />
                </div>

                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white mt-4 shadow-xl shadow-slate-900/20 transition-transform active:scale-[0.98]"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registering...</>
                      ) : (
                        'Create Profile & Login'
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
}
