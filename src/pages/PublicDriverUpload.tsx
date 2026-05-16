import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Bus, Route, ArrowRight, ArrowLeft, Send, CheckCircle, Navigation, Camera, Loader2, Play, Flag, Lock, Check, X } from "lucide-react";
import { createAnonymousClient } from '@/integrations/supabase/public-client';
import { GamificationBanner } from '@/components/trips/GamificationBanner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrewAuth } from '@/contexts/CrewAuthContext';

type Language = 'en' | 'si' | 'ta';

const translations = {
  en: {
    title: "Driver Dashboard",
    subtitle: "Submit your daily odometers",
    driverName: "Driver Name *",
    busNumber: "Bus Number *",
    routeName: "Route Name",
    tripDate: "Date *",
    tripTitle: "Trip",
    startOdo: "Start Odometer",
    endOdo: "End Odometer",
    submit: "Submit Odometers",
    submitting: "Submitting...",
    successTitle: "Submission Received!",
    successDesc: "Odometers successfully submitted.",
    bannerReady: [
      "Ready for the road? 🚌",
      "The steering wheel is in your hands - the responsibility of a thousand lives is in your heart.",
      "A watchful eye - a safe destination.",
      "Let's prioritize responsibility over speed."
    ],
  },
  si: {
    title: "රියදුරු පුවරුව",
    subtitle: "ඔබගේ දෛනික මීටර් කියවීම් ඇතුලත් කරන්න",
    driverName: "රියදුරුගේ නම *",
    busNumber: "බස් රථයේ අංකය *",
    routeName: "මාර්ගය",
    tripDate: "දිනය *",
    tripTitle: "ගමන",
    startOdo: "ආරම්භක මීටරය",
    endOdo: "අවසන් මීටරය",
    submit: "ඉදිරිපත් කරන්න",
    submitting: "ඉදිරිපත් කරමින්...",
    successTitle: "සාර්ථකයි!",
    successDesc: "මීටර් කියවීම් සාර්ථකව ඉදිරිපත් කරන ලදී.",
    bannerReady: [
      "රෝද කැරකෙන තරමටයි ජීවිතේ දුවන්නේ! 🚌",
      "සුක්කානම ඔබේ අතේ - ජීවිත දහසක වගකීම ඔබේ හිතේ.",
      "සුපරීක්ෂාකාරී දෑසක් - සුරක්ෂිත ගමනාන්තයක්.",
      "වේගයට වඩා - වගකීමට මුල්තැන දෙමු."
    ],
  },
  ta: {
    title: "ஓட்டுனர் பலகை",
    subtitle: "உங்கள் தினசரி மீட்டர்களை சமர்ப்பிக்கவும்",
    driverName: "ஓட்டுனர் பெயர் *",
    busNumber: "பேருந்து எண் *",
    routeName: "பாதை",
    tripDate: "தேதி *",
    tripTitle: "பயணம்",
    startOdo: "தொடக்க மீட்டர்",
    endOdo: "முடிவு மீட்டர்",
    submit: "சமர்ப்பிக்கவும்",
    submitting: "சமர்ப்பிக்கிறது...",
    successTitle: "வெற்றி!",
    successDesc: "உங்கள் மீட்டர்கள் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டன.",
    bannerReady: [
      "பயணத்திற்கு தயாரா? 🚌",
      "திசைமாற்றி உங்கள் கைகளில் - ஆயிரம் உயிர்களின் பொறுப்பு உங்கள் இதயத்தில்.",
      "கவனமான கண்கள் - பாதுகாப்பான இலக்கு.",
      "வேகத்தை விட பொறுப்புக்கு முன்னுரிமை கொடுப்போம்."
    ],
  }
};

interface Trip {
  id: string;
  startOdo: string;
  endOdo: string;
}

const AutocompleteInput = ({ 
  value = '', 
  onChange, 
  options = [], 
  placeholder, 
  uppercase = false,
  autoFormat,
  icon,
  disabled = false
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: string[]; 
  placeholder?: string;
  uppercase?: boolean;
  autoFormat?: 'bus';
  icon?: React.ReactNode;
  disabled?: boolean;
}) => {
  const [show, setShow] = useState(false);
  const filtered = options.filter(o => o?.toLowerCase().includes(value?.toLowerCase() || ''));

  const formatBusNumber = (val: string) => {
    let cleaned = val.replace(/[\s-]/g, '').toUpperCase();
    const match = cleaned.match(/^([A-Z0-9]+?)(\d{4})$/);
    if (match) cleaned = `${match[1]}-${match[2]}`;
    return cleaned;
  };

  return (
    <div className="relative">
      <div className="relative">
        {icon && <div className="absolute left-3 top-3.5 text-slate-400">{icon}</div>}
        <Input 
          value={value} 
          onChange={(e) => {
            let val = e.target.value;
            if (uppercase) val = val.toUpperCase();
            if (autoFormat === 'bus') val = formatBusNumber(val);
            onChange(val);
            setShow(true);
          }}
          onFocus={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-12 border-slate-200 focus-visible:ring-blue-500 shadow-sm ${icon ? 'pl-10' : ''} ${autoFormat === 'bus' ? 'font-bold tracking-wider uppercase' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {show && filtered.length > 0 && value && (
        <div className="absolute z-50 w-full bg-white mt-1 border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
          {filtered.map((h, i) => (
            <div 
              key={i} 
              className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-100 text-sm"
              onClick={() => {
                onChange(autoFormat === 'bus' ? formatBusNumber(h) : h);
                setShow(false);
              }}
            >
              {h}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function PublicDriverUpload() {
  const { toast } = useToast();
  let crewMember: any = null;
  try {
    const auth = useCrewAuth();
    crewMember = auth.crewMember;
  } catch (e) {
    // Failsafe
  }
  
  const loadState = (key: string, defaultVal: any) => {
    try {
      const saved = localStorage.getItem(`driver_form_${key}`);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch { return defaultVal; }
  };

  const [lang, setLang] = useState<Language>('si');
  const t = translations[lang];

  const [loading, setLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setQuoteIndex(prev => (prev + 1) % 4), 5000);
    return () => clearInterval(interval);
  }, []);

  const [history, setHistory] = useState(() => loadState('history', { buses: [], routes: [] }));
  
  const [formData, setFormData] = useState(() => loadState('global', {
    driverName: '',
    busNumber: '',
    routeName: '',
    tripDate: new Date().toISOString().split('T')[0],
  }));

  const [currentTripNumber, setCurrentTripNumber] = useState<number>(() => {
    const completed = loadState('completedTrips', []);
    return completed.length > 0 ? Math.max(...completed.map((t: any) => t.tripNumber)) + 1 : 1;
  });

  const [trip, setTrip] = useState<Trip>(() => {
    const saved = loadState('current_trip', null);
    if (saved) return saved;
    const completed = loadState('completedTrips', []);
    const lastCompleted = completed.length > 0 ? completed[completed.length - 1] : null;
    return { id: '1', startOdo: lastCompleted?.endOdometer || '', endOdo: '' };
  });

  const [completedTrips, setCompletedTrips] = useState<{tripNumber: number, startOdometer: string, endOdometer: string}[]>(() => loadState('completedTrips', []));
  const [maxTrips, setMaxTrips] = useState(() => loadState('maxTrips', 4));
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) {
      localStorage.setItem('driver_form_global', JSON.stringify(formData));
      localStorage.setItem('driver_form_current_trip', JSON.stringify(trip));
      localStorage.setItem('driver_form_completedTrips', JSON.stringify(completedTrips));
      localStorage.setItem('driver_form_maxTrips', JSON.stringify(maxTrips));
    }
  }, [formData, trip, completedTrips, maxTrips, submitted]);

  useEffect(() => {
    if (crewMember) {
      const updates: any = {};
      if (crewMember.staff_name && formData.driverName !== crewMember.staff_name) {
        updates.driverName = crewMember.staff_name;
      }
      if (crewMember.assigned_bus && !formData.busNumber) {
        // Auto-format the bus number from profile
        let bus = crewMember.assigned_bus.replace(/[\s-]/g, '').toUpperCase();
        const match = bus.match(/^([A-Z0-9]+?)(\d{4})$/);
        if (match) bus = `${match[1]}-${match[2]}`;
        updates.busNumber = bus;
      }
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [crewMember]);

  // Track last fetched bus with a ref to avoid stale closures
  const lastFetchedBusRef = React.useRef('');
  const [fetchingAssignment, setFetchingAssignment] = useState(false);
  const [routeAutoFilled, setRouteAutoFilled] = useState(false);
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [scheduledTripId, setScheduledTripId] = useState<string | null>(null);

  useEffect(() => {
    const bus = formData.busNumber;
    if (!bus || bus.length < 7) {
      setFetchingAssignment(false);
      return;
    }
    const fetchKey = `${bus}_${formData.tripDate}`;
    if (fetchKey === lastFetchedBusRef.current) return;
    
    setFetchingAssignment(true);

    const fetchAssignment = async () => {
      try {
        const supabasePublic = createAnonymousClient();
        const queryDate = formData.tripDate || new Date().toISOString().split('T')[0];
        const { data, error } = await supabasePublic.rpc('get_public_bus_assignment', { p_bus_number: bus, p_date: queryDate });
        
        lastFetchedBusRef.current = fetchKey;
        
        if (data && data.length > 0 && !error) {
          const assignment = data[0];
          const hasRoute = assignment.route_name && assignment.route_name.trim().length > 0;
          const hasDriver = assignment.driver_name && assignment.driver_name.trim().length > 0;
          
          if (hasDriver || hasRoute) {
             setFormData(prev => ({ 
               ...prev, 
               routeName: hasRoute ? assignment.route_name : prev.routeName,
               driverName: hasDriver ? assignment.driver_name : prev.driverName
             }));
             if (hasRoute) {
               setRouteAutoFilled(true);
               setRouteConfirmed(false);
             } else {
               setRouteAutoFilled(false);
               setRouteConfirmed(false);
             }
             if (assignment.daily_trip_id) {
               setScheduledTripId(assignment.daily_trip_id);
             } else {
               setScheduledTripId(null);
             }
             const allocated = parseInt(assignment.total_allocated_trips) || 0;
             if (allocated > 0) setMaxTrips(allocated);
             else setMaxTrips(4);
          } else {
            setRouteAutoFilled(false);
            setRouteConfirmed(false);
          }
        }
      } catch (e) {
        console.log('[DRIVER-ASSIGN] Error:', e);
      } finally {
        setFetchingAssignment(false);
      }
    };
    const timeoutId = setTimeout(fetchAssignment, 400);
    return () => clearTimeout(timeoutId);
  }, [formData.busNumber, formData.tripDate]);

  const saveToHistory = (type: 'buses' | 'routes', value: string) => {
    if (!value || !value.trim()) return;
    setHistory((prev: any) => {
      const arr = prev[type] || [];
      if (!arr.includes(value.trim())) {
        const newHistory = { ...prev, [type]: [value.trim(), ...arr].slice(0, 10) };
        localStorage.setItem('driver_form_history', JSON.stringify(newHistory));
        return newHistory;
      }
      return prev;
    });
  };

  const validateGlobalFields = () => {
    if (!formData.driverName || !formData.busNumber || !formData.tripDate) {
      toast({ title: "Missing Information", description: "Please fill in all global details.", variant: "destructive" });
      return false;
    }
    if (routeAutoFilled && !routeConfirmed) {
      toast({ title: "Confirm Route", description: "Please confirm or change the suggested route before proceeding.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const submitTrip = async () => {
    if (!validateGlobalFields()) return;
    if (!trip.startOdo || !trip.endOdo) {
      toast({ title: "Missing Odometers", description: "Start and End Odometers are required.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const supabasePublic = createAnonymousClient();
      
      const payload = {
        driver_name: formData.driverName,
        bus_number: formData.busNumber,
        route_name: formData.routeName,
        trip_date: formData.tripDate,
        submission_type: 'trip_odometer',
        data_entry_method: 'driver_app_v1',
        trips: [{
          trip_number: currentTripNumber,
          start_odo: trip.startOdo,
          end_odo: trip.endOdo
        }]
      };

      const { error } = await supabasePublic.from('conductor_submissions').insert({
        bus_number: formData.busNumber,
        trip_date: formData.tripDate,
        status: 'pending',
        ocr_data: payload as any,
        applied_to_trip_id: scheduledTripId
      });

      if (error) throw error;

      saveToHistory('buses', formData.busNumber);
      saveToHistory('routes', formData.routeName);

      const newCompleted = [...completedTrips, { 
        tripNumber: currentTripNumber, 
        startOdometer: trip.startOdo,
        endOdometer: trip.endOdo
      }];
      setCompletedTrips(newCompleted);

      toast({
        title: "Trip Odometer Saved",
        description: `Trip ${currentTripNumber} odometers saved successfully.`,
      });

      setTrip({ id: Date.now().toString(), startOdo: trip.endOdo, endOdo: '' });
      setCurrentTripNumber(prev => prev + 1);

    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t.title}</h1>
            <p className="text-blue-100 mt-1 text-sm">{t.subtitle}</p>
          </div>
          <div className="flex space-x-2 bg-black/20 p-1.5 rounded-full backdrop-blur-sm">
            {(['en', 'si', 'ta'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === l ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 -mt-4 relative z-20">
        <GamificationBanner 
          message={t.bannerReady[quoteIndex]}
          variant="info" 
          icon={<Navigation className="h-5 w-5" />} 
        />

        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center text-slate-800">
              <Bus className="mr-2 h-5 w-5 text-blue-600" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t.busNumber}</Label>
                <AutocompleteInput 
                  value={formData.busNumber} 
                  onChange={v => {
                    setFormData(prev => ({...prev, busNumber: v, routeName: v !== prev.busNumber ? '' : prev.routeName}));
                    lastFetchedBusRef.current = '';
                    setRouteAutoFilled(false);
                    setRouteConfirmed(false);
                  }} 
                  options={history.buses} 
                  placeholder="e.g. ND-1234" 
                  autoFormat="bus" 
                  icon={<Bus className="h-4 w-4" />}
                  disabled={fetchingAssignment}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t.tripDate}</Label>
                <Input 
                  type="date" 
                  value={formData.tripDate} 
                  onChange={e => setFormData({...formData, tripDate: e.target.value})} 
                  disabled={fetchingAssignment}
                  className={`h-12 border-slate-200 bg-slate-50 ${fetchingAssignment ? 'opacity-50' : ''}`} 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t.driverName}</Label>
              <AutocompleteInput value={formData.driverName} onChange={v => setFormData({...formData, driverName: v})} options={[]} placeholder="e.g. Kamal" icon={<User className="h-4 w-4" />} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                {t.routeName}
                {fetchingAssignment ? (
                  <span className="flex items-center gap-1 text-blue-500 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-[9px] font-semibold tracking-wider">LOADING...</span>
                  </span>
                ) : routeAutoFilled && !routeConfirmed ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="text-[9px] font-semibold tracking-wider">CONFIRM ROUTE</span>
                  </span>
                ) : routeAutoFilled && routeConfirmed ? (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <Lock className="w-3 h-3" />
                    <span className="text-[9px] font-semibold tracking-wider">SYSTEM ASSIGNED</span>
                  </span>
                ) : null}
              </Label>
              {routeAutoFilled && !routeConfirmed ? (
                <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <Route className="w-4 h-4 text-amber-600 shrink-0" />
                    {formData.routeName}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Button 
                      type="button"
                      size="sm" 
                      onClick={() => setRouteConfirmed(true)} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" /> Confirm
                    </Button>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline" 
                      onClick={() => { 
                        setRouteAutoFilled(false); 
                        setRouteConfirmed(false);
                        setFormData(p => ({...p, routeName: ''})); 
                      }} 
                      className="h-8 flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" /> Change
                    </Button>
                  </div>
                </div>
              ) : routeAutoFilled && routeConfirmed ? (
                <div className="flex items-center gap-2 h-12 px-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm font-semibold text-emerald-800">
                  <Route className="w-4 h-4 text-emerald-500 shrink-0" />
                  {formData.routeName}
                  <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
                </div>
              ) : (
                <AutocompleteInput value={formData.routeName} onChange={v => setFormData({...formData, routeName: v})} options={history.routes} placeholder="e.g. Colombo - Kandy" icon={<Route className="h-4 w-4" />} />
              )}
            </div>
          </CardContent>
        </Card>

        {completedTrips.length > 0 && (
          <div className="space-y-2">
            {completedTrips.map((t) => (
              <div key={t.tripNumber} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Trip {t.tripNumber}</div>
                    <div className="text-xs text-slate-500">{t.startOdometer} km → {t.endOdometer} km</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {fetchingAssignment && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-700">Syncing route data...</p>
              <p className="text-[10px] text-blue-500">Please wait — loading your bus assignment details</p>
            </div>
          </div>
        )}

        <div className={fetchingAssignment ? 'opacity-40 pointer-events-none' : ''}>
        {currentTripNumber <= maxTrips && (
          <Card className="border-2 border-blue-500 shadow-xl rounded-2xl overflow-hidden bg-white">
            <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
              <div className="font-bold text-blue-800 flex items-center">
                <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                  {currentTripNumber}
                </div>
                {t.tripTitle} {currentTripNumber}
              </div>
            </div>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-bold text-xs uppercase flex items-center"><Play className="w-3 h-3 mr-1 text-emerald-500" /> {t.startOdo}</Label>
                  <Input type="number" placeholder="0" value={trip.startOdo} onChange={e => setTrip({...trip, startOdo: e.target.value})} className="h-12 text-lg font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-bold text-xs uppercase flex items-center"><Flag className="w-3 h-3 mr-1 text-red-500" /> {t.endOdo}</Label>
                  <Input type="number" placeholder="0" value={trip.endOdo} onChange={e => setTrip({...trip, endOdo: e.target.value})} className="h-12 text-lg font-bold" />
                </div>
              </div>

              <Button onClick={submitTrip} disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-transform">
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.submitting}</> : <><Send className="mr-2 h-5 w-5" /> {t.submit}</>}
              </Button>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}
