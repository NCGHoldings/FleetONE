import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Only allow English letters, numbers, spaces, dots, and dashes
const englishOnly = (val: string) => val.replace(/[^a-zA-Z0-9\s.\-]/g, '');

const formatBusNumber = (val: string) => {
  // Remove non-alphanumeric chars
  let cleaned = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Extract up to 2 letters, then up to 4 digits
  let letters = cleaned.replace(/[^A-Z]/g, '').slice(0, 2);
  let numbers = cleaned.replace(/[^0-9]/g, '').slice(0, 4);
  
  if (numbers.length > 0) {
     return `${letters}-${numbers}`;
  }
  return letters;
};

export default function CrewLogin() {
  const [nic, setNic] = useState('');
  
  // Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regCallingName, setRegCallingName] = useState('');
  const [regNic, setRegNic] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regEmploymentType, setRegEmploymentType] = useState('');
  const [regSalaryType, setRegSalaryType] = useState('');
  const [regAssignedBus, setRegAssignedBus] = useState('');

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
    
    if (!regFullName || !regCallingName || !regNic || !regPhone || !regRole || !regEmploymentType || !regAssignedBus) {
      toast({ title: "Missing Information", description: "Please fill in all mandatory fields including Assigned Bus.", variant: "destructive" });
      return;
    }

    if (regEmploymentType === 'casual' && !regSalaryType) {
      toast({ title: "Missing Information", description: "Please select a Salary Basis for casual employment.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const cleanRegNic = regNic.replace(/\s/g, '');
    
    const finalAssignedBus = formatBusNumber(regAssignedBus);

    // Strict validation: Must be exactly 2 letters, a hyphen, and exactly 4 numbers.
    if (regEmploymentType !== 'temporary' || finalAssignedBus.length > 0) {
      if (!/^[A-Z]{2}-\d{4}$/.test(finalAssignedBus)) {
        toast({ title: "Invalid Bus Format", description: "Bus number must be exactly 2 English letters followed by a hyphen and exactly 4 numbers (e.g., ND-3456).", variant: "destructive" });
        setIsProcessing(false);
        return;
      }
    }

    // For permanent, default salary basis to monthly to satisfy the db constraints
    const finalSalaryType = regEmploymentType === 'permanent' ? 'monthly' : regSalaryType;
    
    const result = await register(regFullName, regCallingName, cleanRegNic, regPhone, regRole, finalSalaryType, regEmploymentType, finalAssignedBus);
    setIsProcessing(false);

    if (result.success) {
      toast({ title: "Registration Successful", description: "Welcome to NCG LIFE!" });
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
        <Card className="w-full shadow-2xl border-white/20 overflow-hidden rounded-[2rem] bg-white/90 backdrop-blur-2xl ring-1 ring-white/50">
          <div className="bg-gradient-to-br from-blue-600 via-blue-800 to-slate-900 p-8 sm:p-10 flex flex-col items-center justify-center text-white relative overflow-hidden">
            {/* Inner animated shapes */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute -right-20 -top-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl mix-blend-screen" 
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -left-20 -bottom-20 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl mix-blend-screen" 
            />
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
              className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-5 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20 relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <Bus className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </motion.div>
            <CardTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 text-center tracking-tight drop-shadow-sm mb-2">
              NCG LIFE
            </CardTitle>
            <CardDescription className="text-blue-100/90 text-center text-sm font-medium max-w-[280px] leading-relaxed relative z-10">
              Manage your trips, track performance & stay connected.
              <br />
              <span className="text-[11px] text-blue-200/60 font-semibold tracking-wide">ඔබේ ගමන් කළමනාකරණය, කාර්ය සාධනය හා සම්බන්ධතා.</span>
              <br />
              <span className="text-[11px] text-blue-200/60 font-semibold tracking-wide">உங்கள் பயணங்கள், செயல்திறன் மற்றும் இணைப்பு.</span>
            </CardDescription>
          </div>
          
          {!window.matchMedia('(display-mode: standalone)').matches && (
          <div className="bg-amber-50/80 backdrop-blur-sm p-4 flex items-center justify-between border-b border-amber-200/50 shadow-inner">
            <div className="text-sm text-amber-800 font-semibold flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              For the best experience, install our app!
            </div>
            <Button size="sm" variant="outline" className="bg-white hover:bg-amber-100 text-amber-700 border-amber-200 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 rounded-xl font-bold" onClick={() => navigate('/install?app=crew')}>
              Install App
            </Button>
          </div>
        )}
        
          <CardContent className="p-6 sm:p-8 bg-transparent">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full grid grid-cols-2 p-1 rounded-2xl bg-slate-100 mb-6 border border-slate-200/80">
                <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/25 text-sm font-bold py-3 transition-all duration-300 text-slate-500 hover:text-slate-700 gap-2">
                  <KeyRound className="w-4 h-4" />
                  Log In
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/25 text-sm font-bold py-3 transition-all duration-300 text-slate-500 hover:text-slate-700 gap-2">
                  <User className="w-4 h-4" />
                  Create Profile
                </TabsTrigger>
              </TabsList>

              <div className="relative overflow-hidden">
                <TabsContent value="login" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="nic" className="text-slate-700 font-bold text-sm tracking-wide">ID Card Number (NIC)</Label>
                      <div className="relative group">
                        <CreditCard className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                          id="nic"
                          placeholder="e.g. 1990 1234 5678 or 9012 3456 7V" 
                          value={nic}
                          onChange={(e) => setNic(formatNIC(e.target.value))}
                          className="h-12 pl-11 bg-white/50 hover:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 tracking-wider shadow-sm transition-all rounded-xl font-medium"
                          required
                        />
                      </div>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <Button 
                        type="submit" 
                        className="w-full h-12 rounded-xl text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white mt-4 shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] border border-blue-500"
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
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold text-xs flex flex-col gap-0.5">
                        <span className="text-sm">Full Name <span className="text-red-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">සම්පූර්ණ නම / முழு பெயர்</span>
                      </Label>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                          placeholder="John Doe" 
                          value={regFullName}
                          onChange={(e) => setRegFullName(toTitleCase(englishOnly(e.target.value)))}
                          className="h-10 pl-10 bg-white/50 hover:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all rounded-xl text-sm"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic">English letters only / ඉංග්‍රීසි අකුරු පමණි / ஆங்கில எழுத்துகள் மட்டும்</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold text-xs flex flex-col gap-0.5">
                        <span className="text-sm">Calling Name <span className="text-red-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">කැඳවන නම / அழைப்பு பெயர்</span>
                      </Label>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                          placeholder="John" 
                          value={regCallingName}
                          onChange={(e) => setRegCallingName(toTitleCase(englishOnly(e.target.value)))}
                          className="h-10 pl-10 bg-white/50 hover:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all rounded-xl text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold text-xs flex flex-col gap-0.5">
                        <span className="text-sm">ID Card Number (NIC) <span className="text-red-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">හැඳුනුම්පත් අංකය / அடையாள அட்டை எண்</span>
                      </Label>
                      <div className="relative group">
                        <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                          placeholder="1990 1234 5678 or 9012 3456 7V" 
                          value={regNic}
                          onChange={(e) => setRegNic(formatNIC(e.target.value))}
                          className="h-10 pl-10 bg-white/50 hover:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm tracking-wider transition-all rounded-xl text-sm font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold text-xs flex flex-col gap-0.5">
                        <span className="text-sm">Phone Number <span className="text-red-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">දුරකථන අංකය / தொலைபேசி எண்</span>
                      </Label>
                      <div className="relative group">
                        <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                          type="tel"
                          placeholder="0712345678" 
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          className="h-10 pl-10 bg-white/50 hover:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all rounded-xl text-sm"
                          required
                          maxLength={10}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label className="text-slate-700 font-bold text-xs flex flex-col gap-0.5">
                          <span className="text-sm">Role <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide">තනතුර / பதவி</span>
                        </Label>
                        <Select value={regRole} onValueChange={setRegRole}>
                          <SelectTrigger className="h-10 bg-white/50 hover:bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 rounded-xl shadow-sm text-sm transition-all">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            <SelectItem value="driver" className="rounded-lg cursor-pointer">Driver</SelectItem>
                            <SelectItem value="conductor" className="rounded-lg cursor-pointer">Conductor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label className="text-slate-700 font-bold text-xs flex flex-col gap-0.5">
                          <span className="text-sm">Employment Type <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide">රැකියා වර්ගය / வேலை வகை</span>
                        </Label>
                        <Select value={regEmploymentType} onValueChange={(val) => { setRegEmploymentType(val); setRegSalaryType(''); }}>
                          <SelectTrigger className="h-10 bg-white/50 hover:bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 rounded-xl shadow-sm text-sm transition-all">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            <SelectItem value="permanent" className="rounded-lg cursor-pointer">Permanent</SelectItem>
                            <SelectItem value="casual" className="rounded-lg cursor-pointer">Casual</SelectItem>
                            <SelectItem value="temporary" className="rounded-lg cursor-pointer">Temporary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(regEmploymentType === 'casual' || regEmploymentType === 'temporary') && (
                        <div className="space-y-2 col-span-2">
                          <Label className="text-slate-700 font-bold text-sm">Salary Basis <span className="text-red-500">*</span></Label>
                          <Select value={regSalaryType} onValueChange={setRegSalaryType}>
                            <SelectTrigger className="h-10 bg-white/50 hover:bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 rounded-xl shadow-sm text-sm transition-all">
                              <SelectValue placeholder="Select basis" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              <SelectItem value="daily" className="rounded-lg cursor-pointer">Daily Wage</SelectItem>
                              <SelectItem value="monthly" className="rounded-lg cursor-pointer">Monthly Wage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mt-2">
                      <Label className="text-slate-700 font-bold text-xs flex flex-col gap-0.5">
                        <span className="text-sm">Assigned Bus {regEmploymentType !== 'temporary' && <span className="text-red-500">*</span>}</span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">පවරා ඇති බස් රථය / ஒதுக்கப்பட்ட பேருந்து</span>
                      </Label>
                      <div className="relative group">
                        <Bus className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                          placeholder={regEmploymentType === 'temporary' ? "e.g. ND-3456 (Optional)" : "e.g. ND-3456"} 
                          value={regAssignedBus}
                          onChange={(e) => setRegAssignedBus(formatBusNumber(e.target.value))}
                          className="h-10 pl-10 bg-white/50 hover:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm font-bold tracking-wider uppercase transition-all rounded-xl text-sm"
                          required={regEmploymentType !== 'temporary'}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Format: XX-1234 / ආකෘතිය: XX-1234 / வடிவம்: XX-1234</p>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="pt-3">
                      <Button 
                        type="submit" 
                        className="w-full h-14 rounded-2xl text-base font-black bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white shadow-[0_8px_30px_-6px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_40px_-6px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-0.5 active:scale-[0.98] border border-blue-500/30 tracking-wide"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registering...</>
                        ) : (
                          <span className="flex flex-col items-center leading-tight">
                            <span>Create Profile & Login</span>
                            <span className="text-[9px] font-semibold text-blue-200/80 tracking-wider">ගිණුම සාදා පිවිසෙන්න / சுயவிவரத்தை உருவாக்கு</span>
                          </span>
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
