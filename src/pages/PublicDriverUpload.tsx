import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { User, Bus, Route, ArrowRight, ArrowLeft, Send, CheckCircle, Navigation, Camera, Loader2, Play, Flag, Lock, Check, X, ChevronsUpDown } from "lucide-react";
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
      "වේගයට වඩා - වගකීමට මුල්තැන දෙමු.",
      "සුක්කානම අතැති ඔබට, දහසක් ජීවිතවල බරක් ඇත.",
      "රෝදය කැරකෙන රිද්මය, ඔබේ හදවතේ රිද්මයයි.",
      "සුපරීක්ෂාකාරී දෑස, අනතුරු වළක්වන පළමු පලිහයි.",
      "දුර ගමනක් වුවත්, ඔබේ ඉවසීම ගමනාන්තය ළං කරයි.",
      "මහමඟ ඔබේ නිවසයි, සුක්කානම ඔබේ සවියයි.",
      "නිවැරදි තීරණ, නිවැරදි ගමනාන්තයට මඟ පෙන්වයි.",
      "හිරු උදාවට පෙර ඇරඹෙන ඔබේ ගමන, රටම අවදි කරයි.",
      "මහා මාර්ගයේ නියමුවා ඔබයි.",
      "රියදුරු අසුන යනු, වගකීම් සහගතම අසුනයි.",
      "දෑස පාරටත්, සිත වගකීමටත් යොමු කරන්න.",
      "බස් රථයේ හදවත සුක්කානමයි, එහි ජීවය ඔබයි.",
      "හැම ගමනක්ම අලුත් අත්දැකීමක්, සුරක්ෂිතව අරඹන්න.",
      "පාරේ බාධක මැදින්, නොසැලී ඉදිරියටම යන්න.",
      "ඔබේ ඉවසීම මගීන්ගේ සැනසීමයි.",
      "මගියාගේ ජීවිතය ඔබේ දෑතේ පවතින උතුම්ම වස්තුවයි.",
      "වේගයට වඩා ආරක්ෂාවට මුල්තැන දෙන ඔබ නියම වීරයෙකි.",
      "නීතියට ගරු කරමින් පදවන රථය, සැබෑම රජදහනකි.",
      "එකම අරමුණක්, එකම ගමනක්, එකම කණ්ඩායමක්.",
      "අන්‍යෝන්‍ය අවබෝධය, සාර්ථක ගමනක රහසයි.",
      "ඔබේ සංඥාවත්, ඔහුගේ ක්‍රියාකාරීත්වයත් එකට බැඳී ඇත.",
      "දෙදෙනාගේම එකමුතුවෙන්, දවසේ ඉලක්කය ජයගත හැක.",
      "එකිනෙකාට සහය වීම, බාධක ජයගැනීමේ මාවතයි.",
      "විශ්වාසය මත පදනම් වූ කණ්ඩායම් හැඟීම නිරතුරුවම දිනයි.",
      "එකම බෝට්ටුවේ ගමනක්, සමබරතාව රකින්නේ ඔබ දෙදෙනායි.",
      "අපහසු අවස්ථාවලදී එකිනෙකාට ශක්තියක් වන්න.",
      "සාර්ථක ගමනාන්තයක සතුට දෙදෙනාටම හිමිය.",
      "එකම පවුලක් සේ රාජකාරියට මුහුණ දෙන්න.",
      "රියදුරුගේ දෑසත්, කොන්දොස්තරගේ කටහඬත් ගමන මෙහෙයවයි.",
      "ජයග්‍රහණය හවුලේ භුක්ති විඳින්න.",
      "කණ්ඩායම් හැඟීමෙන් කරන රාජකාරිය විඩාවක් ගෙන දෙන්නේ නැත.",
      "එකිනෙකාගේ අඩුපාඩු හදාගනිමින් ඉදිරියටම යන්න.",
      "රථයේ සාර්ථකත්වය රඳා පවතින්නේ ඔබේ සහයෝගය මතයි.",
      "දෙපසින් හිඳ වුවද, බලන්නේ එකම දිශාවකටයි.",
      "එකට වැඩ කිරීමෙන් අසීරුම ගමනක් වුවද පහසු වේ.",
      "ඔබ කරන්නේ රැකියාවක් පමණක් නොවේ, එය සමාජ මෙහෙවරකි.",
      "අද දවසේ මහන්සිය, හෙට දවසේ අභිමානයයි.",
      "ලාභයට වඩා විශ්වාසය වටී.",
      "ඔබගේ වෘත්තියට ගරු කරන්න, එය ඔබට ගරු කරාවි.",
      "විශ්වාසය දිනාගැනීම අපහසුය, එය සුරැකීම ඔබේ වගකීමකි.",
      "රාත්‍රියේ නිදි වර්ජිතව ඔබ කරන සේවය අමිලයි.",
      "දූවිලි සහ දුමාරය මැද, ඔබ රකින්නේ පවුල් දහසක සිනහවයි.",
      "පාරේ අන් අයටත් ආදර්ශයක් වන සේ රථය හසුරුවන්න.",
      "රාජකාරිය දේවකාරියක් සේ සලකන්න.",
      "වෘත්තීය ගෞරවය කිසිවිටෙකත් පාවා නොදෙන්න.",
      "මගියාගේ සිනහව ඔබේ සේවයේ වටිනාකම කියාපායි.",
      "සුරක්ෂිතව ගොස්, සුරක්ෂිතව නැවත එන්න.",
      "ඔබේ කැපවීම මහා මාර්ගයේ රන් අකුරින් ලියවෙනු ඇත.",
      "මහජන සේවයේ යෙදෙන ඔබට, ජාතියේ ප්‍රණාමය හිමිය.",
      "නිවැරදි දත්ත ඇතුළත් කිරීම, හෙට දවසේ කාර්යයන් පහසු කරයි.",
      "තාක්ෂණය ඔබේ සහයටයි - එයින් උපරිම ප්‍රයෝජන ගන්න.",
      "අද දවසේ සටහන, හෙට දවසේ සැලසුමයි.",
      "පද්ධතියට දෙන නිවැරදි තොරතුර, මෙහෙයුමේ කොඳුනාරටියයි.",
      "ඩිජිටල් සටහන්, ඔබේ රාජකාරියේ විනිවිදභාවය තහවුරු කරයි.",
      "ගමනාන්තය සේම, දත්ත සටහන් කිරීමත් අනිවාර්ය වේ.",
      "තත්පරයක් වැය කර දත්ත යාවත්කාලීන කිරීම, පැය ගණනක කාලය ඉතිරි කරයි.",
      "අනාගතය ඩිජිටල්ය, එයට අදම සූදානම් වන්න.",
      "කාර්යක්ෂම පද්ධතියක් - සාර්ථක ප්‍රවාහන ජාලයක්.",
      "ඔබේ ඇඟිලි තුඩින් ඇතුළත් කරන දත්ත, ඉදිරි ගමන තීරණය කරයි.",
      "හැම වාරයක්ම නිවැරදිව සටහන් වුණාම, වගවීම සම්පූර්ණයි.",
      "පද්ධතියේ විශ්වසනීයත්වය, ඔබ ඇතුළත් කරන දත්ත මත රඳා පවතී.",
      "අලුත් තාක්ෂණයට බිය නොවන්න, එය ඔබේ රාජකාරිය සරල කරාවි.",
      "කාලය රන් හා සමානය, පද්ධතිය එය ඉතිරි කර දෙයි.",
      "ඔබේ දවසේ මෙහෙයුම, දැන් ඇත්තේ ඔබේ ස්මාර්ට් දුරකථනයේය.",
      "නිවැරදි ගණනය කිරීම් සඳහා, නිවැරදි දත්ත අත්‍යවශ්‍ය වේ.",
      "දත්ත වාර්තා කිරීම ගමනේම තවත් එක් වැදගත් අංගයකි.",
      "වැඩ ලේසි කරගන්න, ඇප් එක හරියට පාවිච්චි කරන්න.",
      "කඩදාසිවලින් තිරයට - ඔබේ රාජකාරිය දැන් වඩාත් පහසුයි.",
      "පද්ධතිය යාවත්කාලීන කරන්න, ගමන සාර්ථකව නිම කරන්න.",
      "ඔබගේ නිවැරදි සටහන්, ඊළඟ මාරුවට ලොකු පහසුවක් ගෙනදේවි."
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

  const [routeOpen, setRouteOpen] = useState(false);
  const [activeRoutes, setActiveRoutes] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const supabasePublic = createAnonymousClient();
        const { data, error } = await supabasePublic.rpc('get_public_route_targets');
        if (data && !error) {
          setActiveRoutes(data);
        }
      } catch (err) {
        console.log("RPC fetch failed, will fallback to history.", err);
      }
    };
    fetchRoutes();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setQuoteIndex(prev => (prev + 1) % t.bannerReady.length), 5000);
    return () => clearInterval(interval);
  }, [t.bannerReady.length]);

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
                <Popover open={routeOpen} onOpenChange={setRouteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={routeOpen}
                      className={`w-full h-12 px-3 justify-between bg-slate-50 border-slate-200 focus:ring-blue-500 rounded-md shadow-sm ${!formData.routeName ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'}`}
                    >
                      <div className="flex items-center truncate">
                        <Route className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                        <span className="truncate">{formData.routeName || (lang === 'si' ? 'මාර්ගය තෝරන්න' : 'e.g. Colombo - Kandy')}</span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={lang === 'si' ? 'මාර්ගය සොයන්න...' : 'Search route...'} />
                      <CommandList>
                        <CommandEmpty>No route found.</CommandEmpty>
                        <CommandGroup>
                          {activeRoutes.length > 0 ? (
                            activeRoutes.map(r => (
                              <CommandItem
                                key={r.route_name}
                                value={r.route_name}
                                onSelect={() => {
                                  setFormData({ ...formData, routeName: r.route_name });
                                  setRouteOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${formData.routeName === r.route_name ? "opacity-100" : "opacity-0"}`}
                                />
                                {r.route_name}
                              </CommandItem>
                            ))
                          ) : history.routes && history.routes.length > 0 ? (
                            history.routes.map((r: string) => (
                              <CommandItem
                                key={r}
                                value={r}
                                onSelect={() => {
                                  setFormData({ ...formData, routeName: r });
                                  setRouteOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${formData.routeName === r ? "opacity-100" : "opacity-0"}`}
                                />
                                {r}
                              </CommandItem>
                            ))
                          ) : (
                            <CommandItem disabled>Loading routes...</CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
