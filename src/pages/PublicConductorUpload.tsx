import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, CheckCircle, Loader2, Send, Calculator, Trash2, Upload, CreditCard, Banknote, Camera, Route, Sun, Moon, Sparkles, Navigation, Bus, User, Receipt, ArrowLeft } from 'lucide-react';
import { createAnonymousClient } from '@/integrations/supabase/public-client';
import { GamificationBanner } from '@/components/trips/GamificationBanner';
import { motion, AnimatePresence } from 'framer-motion';

type Language = 'en' | 'si' | 'ta';

const translations = {
  en: {
    title: "Upload Trip Details",
    subtitle: "Submit your daily trip information",
    globalDetails: "General Details",
    income: "Income",
    expenses: "Expenses",
    driverName: "Driver Name *",
    conductorName: "Conductor Name *",
    busNumber: "Bus Number *",
    routeName: "Route Name",
    tripDate: "Date *",
    addTrip: "Add Trip",
    tripTitle: "Trip",
    startOdo: "Start Odometer",
    endOdo: "End Odometer",
    callBooking: "CALL BOOKING",
    agentBooking: "AGENT BOOKING",
    busCollection: "BUS COLLECTION",
    luggage: "LUGGAGE INCOME",
    miscIncome: "MISCELLANEOUS INCOME",
    showAllExpenses: "Show All Expenses",
    hideExpenses: "Hide Extra Expenses",
    totalIncome: "Total Income",
    totalExpenses: "Total Expenses",
    netBalance: "Net Balance (Cash to handover)",
    fuelDetails: "Fuel Details",
    fuelTime: "Fuel Time",
    fuelOdo: "Fuel Odometer",
    fuelLiters: "Fuel Liters",
    fuelCost: "Fuel Cost",
    fuelPayment: "Fuel Payment Method",
    cash: "Cash",
    card: "Card",
    bankDeposit: "Bank Deposit",
    suggestedDeposit: "Suggested Deposit",
    actualDeposit: "Actual Deposit Amount",
    bankName: "Bank / Branch Name",
    uploadSlip: "Upload Bank Slip",
    submit: "Submit",
    submitTrip: "Submit Trip",
    submitFuel: "Submit Fuel",
    submitExpenses: "Submit Expenses",
    submitting: "Submitting...",
    successTitle: "Submission Received!",
    successDesc: "Your details have been successfully submitted.",
    trackingCode: "Your tracking code:",
    submitAnother: "Back to Hub"
  },
  si: {
    title: "ගමන් විස්තර ඉදිරිපත් කිරීම",
    subtitle: "ඔබගේ දෛනික ගමන් විස්තර ඇතුලත් කරන්න",
    globalDetails: "පොදු විස්තර",
    income: "ආදායම්",
    expenses: "වියදම්",
    driverName: "රියදුරුගේ නම *",
    conductorName: "කොන්දොස්තරගේ නම *",
    busNumber: "බස් රථයේ අංකය *",
    routeName: "මාර්ගය",
    tripDate: "දිනය *",
    addTrip: "ගමනක් එකතු කරන්න",
    tripTitle: "ගමන",
    startOdo: "ආරම්භක මීටරය",
    endOdo: "අවසන් මීටරය",
    callBooking: "දුරකථන ඇණවුම් (Call Booking)",
    agentBooking: "නියෝජිත ඇණවුම් (Agent Booking)",
    busCollection: "බස් එකතු කිරීම (Bus Collection)",
    luggage: "ගමන් මලු ආදායම (Luggage Income)",
    miscIncome: "වෙනත් ආදායම් (Misc Income)",
    showAllExpenses: "සියලුම වියදම් පෙන්වන්න",
    hideExpenses: "අමතර වියදම් සඟවන්න",
    totalIncome: "මුළු ආදායම",
    totalExpenses: "මුළු වියදම",
    netBalance: "ශුද්ධ ශේෂය (භාර දිය යුතු මුදල)",
    fuelDetails: "ඉන්ධන විස්තර",
    fuelTime: "ඉන්ධන ලබාගත් වේලාව",
    fuelOdo: "මීටරය",
    fuelLiters: "ලීටර",
    fuelCost: "මුළු මුදල",
    fuelPayment: "ගෙවීම් ක්‍රමය",
    cash: "මුදල්",
    card: "කාඩ්පත",
    bankDeposit: "බැංකු තැන්පතුව",
    suggestedDeposit: "යෝජිත තැන්පතුව",
    actualDeposit: "තැන්පත් කළ මුදල",
    bankName: "බැංකුවේ නම / ශාඛාව",
    uploadSlip: "බැංකු රිසිට්පත යොදන්න",
    submit: "ඉදිරිපත් කරන්න",
    submitTrip: "ගමන ඉදිරිපත් කරන්න",
    submitFuel: "ඉන්ධන ඉදිරිපත් කරන්න",
    submitExpenses: "වියදම් ඉදිරිපත් කරන්න",
    submitting: "ඉදිරිපත් කරමින්...",
    successTitle: "සාර්ථකයි!",
    successDesc: "ඔබගේ විස්තර සාර්ථකව ඉදිරිපත් කරන ලදී.",
    trackingCode: "ඔබේ ලුහුබැඳීමේ කේතය:",
    submitAnother: "ප්‍රධාන මෙනුවට"
  },
  ta: {
    title: "பயண விவரங்கள்",
    subtitle: "உங்கள் தினசரி பயண விவரங்களை சமர்ப்பிக்கவும்",
    globalDetails: "பொது விவரங்கள்",
    income: "வருமானம்",
    expenses: "செலவுகள்",
    driverName: "ஓட்டுனர் பெயர் *",
    conductorName: "நடத்துனர் பெயர் *",
    busNumber: "பேருந்து எண் *",
    routeName: "பாதை",
    tripDate: "தேதி *",
    addTrip: "பயணம் சேர்க்க",
    tripTitle: "பயணம்",
    startOdo: "தொடக்க மீட்டர்",
    endOdo: "முடிவு மீட்டர்",
    callBooking: "தொலைபேசி முன்பதிவு (Call Booking)",
    agentBooking: "முகவர் முன்பதிவு (Agent Booking)",
    busCollection: "பேருந்து வசூல் (Bus Collection)",
    luggage: "பொருட்கள் வருமானம் (Luggage)",
    miscIncome: "இதர வருமானம் (Misc Income)",
    showAllExpenses: "அனைத்து செலவுகளையும் காட்டு",
    hideExpenses: "கூடுதல் செலவுகளை மறை",
    totalIncome: "மொத்த வருமானம்",
    totalExpenses: "மொத்த செலவுகள்",
    netBalance: "நிகர இருப்பு",
    fuelDetails: "எரிபொருள் விவரங்கள்",
    fuelTime: "எரிபொருள் நேரம்",
    fuelOdo: "மீட்டர்",
    fuelLiters: "லிட்டர்",
    fuelCost: "எரிபொருள் செலவு",
    fuelPayment: "செலுத்தும் முறை",
    cash: "ரொக்கம்",
    card: "அட்டை",
    bankDeposit: "வங்கி வைப்பு",
    suggestedDeposit: "பரிந்துரைக்கப்பட்ட வைப்பு",
    actualDeposit: "உண்மையான வைப்பு தொகை",
    bankName: "வங்கி / கிளை பெயர்",
    uploadSlip: "ரசீதை பதிவேற்றவும்",
    submit: "சமர்ப்பிக்கவும்",
    submitTrip: "பயணத்தை சமர்ப்பிக்கவும்",
    submitFuel: "எரிபொருளை சமர்ப்பிக்கவும்",
    submitExpenses: "செலவுகளை சமர்ப்பிக்கவும்",
    submitting: "சமர்ப்பிக்கிறது...",
    successTitle: "வெற்றி!",
    successDesc: "உங்கள் விவரங்கள் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டன.",
    trackingCode: "உங்கள் கண்காணிப்பு குறியீடு:",
    submitAnother: "பிரதான மெனுவிற்கு"
  }
};

const EXPENSE_CATEGORIES = [
  { key: 'fuel_cost', en: 'FUEL EXPENSES', si: 'ඉන්ධන / ඩීසල්', ta: 'எரிபொருள்', primary: true },
  { key: 'food', en: 'STAFF MEALS & WELFARE', si: 'ආහාර', ta: 'உணவு', primary: true },
  { key: 'salary', en: 'WAGES - DRIVERS & ASSISTA', si: 'වැටුප්', ta: 'சம்பளம்', primary: true },
  { key: 'runner', en: 'RUNNER', si: 'ටයිම් කීපර්', ta: 'டைம்கீப்பர்', primary: true },
  { key: 'parking', en: 'PARKING FEE', si: 'වාහන නැවැත්වීම', ta: 'வாகன நிறுத்தம்', primary: true },
  { key: 'highway_charges', en: 'HIGHWAY CHARGES', si: 'අධිවේගී මාර්ග ගාස්තු', ta: 'நெடுஞ்சாலை கட்டணம்', primary: true },
  { key: 'police', en: 'FINES AND PENALTIES', si: 'දඩ / පොලිස්', ta: 'காவல்துறை', primary: true },
  { key: 'other', en: 'OTHER EXPENSES', si: 'වෙනත් වියදම්', ta: 'மற்றவை', primary: true },
  { key: 'body_wash', en: 'BODY WASH AND SERVICE', si: 'පිරිසිදු කිරීම', ta: 'சுத்தம் செய்தல்', primary: false },
  { key: 'repair', en: 'BUS MAINTENANCE & REPAIR', si: 'සුළු අලුත්වැඩියා', ta: 'சிறிய பழுதுகள்', primary: false },
  { key: 'tyre_tube', en: 'TYRE & TUBE EXPENSES', si: 'ටයර් / හුළං', ta: 'டயர் பஞ்சர்', primary: false },
  { key: 'emission_fitness', en: 'EMISSION REPORTS/ FITNESS', si: 'දුම් සහතිකය', ta: 'புகை சான்றிதழ்', primary: false },
  { key: 'permits_renewal', en: 'PERMITS RENEWAL CHARGES', si: 'බලපත්‍ර', ta: 'அனுமதி', primary: false },
  { key: 'staff_accommodation', en: 'STAFF ACCOMMODATION', si: 'නවාතැන්', ta: 'தங்குமிடம்', primary: false },
  { key: 'accident_compensation', en: 'ACCIDENT COMPENSATION', si: 'අනතුරු වන්දි', ta: 'விபத்து இழப்பீடு', primary: false },
  { key: 'log_sheet', en: 'LOG SHEET CHARGES', si: 'ලොග් සටහන්', ta: 'பதிவேடு', primary: false },
  { key: 'vehicle_hire', en: 'VEHICLE HIRE CHARGES', si: 'වාහන කුලී', ta: 'வாகன வாடகை', primary: false },
  { key: 'ntc', en: 'NTC', si: 'NTC', ta: 'NTC', primary: false },
  { key: 'short_misc', en: 'SHORT - MISCELLANIOUS', si: 'විවිධ', ta: 'இதர', primary: false },
  { key: 'temporary_permit', en: 'TEMPORY PERMIT', si: 'තාවකාලික බලපත්‍රය', ta: 'தற்காலிக அனுமதி', primary: false },
  { key: 'legal_court', en: 'LEGAL & COURT FEE', si: 'නීති / උසාවි ගාස්තු', ta: 'சட்ட கட்டணம்', primary: false },
];

interface Trip {
  id: string;
  startOdo: string;
  endOdo: string;
  income: {
    callBooking: string;
    agentBooking: string;
    busCollection: string;
    luggage: string;
    miscIncome: string;
  };
}

// Custom Autocomplete Input for mobile reliability
const AutocompleteInput = ({ 
  value = '', 
  onChange, 
  options = [], 
  placeholder, 
  uppercase = false,
  autoFormat,
  icon
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: string[]; 
  placeholder?: string;
  uppercase?: boolean;
  autoFormat?: 'bus';
  icon?: React.ReactNode;
}) => {
  const [show, setShow] = useState(false);
  
  const safeValue = value || '';
  const safeOptions = options || [];
  
  const filtered = safeOptions.filter(o => 
    o && o.toLowerCase().includes(safeValue.toLowerCase()) || !safeValue
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = uppercase ? e.target.value.toUpperCase() : e.target.value;
    
    if (autoFormat === 'bus') {
      val = val.replace(/[\s-]/g, '').toUpperCase();
      const match = val.match(/^([A-Z0-9]+?)(\d{4})$/);
      if (match) {
        val = `${match[1]}-${match[2]}`;
      }
    }
    onChange(val);
  };

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
      )}
      <Input 
        value={safeValue} 
        onChange={handleChange} 
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder={placeholder}
        required
        className={`bg-slate-50 border-slate-200 focus-visible:ring-blue-500 transition-all ${icon ? 'pl-9' : ''}`}
      />
      {show && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-md max-h-48 overflow-y-auto">
          {filtered.map(h => (
            <div 
              key={h} 
              className="px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer border-b border-slate-50 last:border-0"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(h);
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

export default function PublicConductorUpload() {
  const { toast } = useToast();
  
  // Persistent State Loaders
  const loadState = (key: string, defaultVal: any) => {
    try {
      const saved = localStorage.getItem(`conductor_form_${key}`);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch { return defaultVal; }
  };

  const [lang, setLang] = useState<Language>('si');
  const t = translations[lang];

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionCode, setSubmissionCode] = useState('');
  
  // UI State: 'hub' | 'trip' | 'fuel' | 'expenses'
  const [currentStep, setCurrentStep] = useState<'hub' | 'trip' | 'fuel' | 'expenses'>('hub');
  
  // Gamification & Route Master State
  const [fuelPrice, setFuelPrice] = useState<number>(350);
  const [routeTarget, setRouteTarget] = useState<number>(0);
  const [fetchingMaster, setFetchingMaster] = useState(false);
  
  // Autocomplete Memory
  const [history, setHistory] = useState(() => loadState('history', { buses: [], drivers: [], conductors: [], routes: [] }));
  
  // Global Form State
  const [formData, setFormData] = useState(() => loadState('global', {
    driverName: '',
    conductorName: '',
    busNumber: '',
    routeName: '',
    tripDate: new Date().toISOString().split('T')[0],
  }));

  // Trip State (Only managing one trip at a time for submission)
  const [currentTripNumber, setCurrentTripNumber] = useState<number>(() => {
    const completed = loadState('completedTrips', []);
    return completed.length > 0 ? Math.max(...completed.map((t: any) => t.tripNumber)) + 1 : 1;
  });
  const [trip, setTrip] = useState<Trip>(() => loadState('current_trip', {
    id: '1', startOdo: '', endOdo: '',
    income: { callBooking: '', agentBooking: '', busCollection: '', luggage: '', miscIncome: '' }
  }));

  // Expenses State
  const [expenses, setExpenses] = useState<Record<string, string>>(() => loadState('expenses', {}));
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  // Fuel Details State
  const getCurrentTime = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const [fuelDetails, setFuelDetails] = useState<any>(() => loadState('fuelDetails', {
    time: getCurrentTime(), odometer: '', liters: '', paymentMethod: 'cash'
  }));

  const [completedTrips, setCompletedTrips] = useState<{tripNumber: number, total: number, time: string}[]>(() => loadState('completedTrips', []));

  // Auto-save Effect
  useEffect(() => {
    if (!submitted) {
      localStorage.setItem('conductor_form_global', JSON.stringify(formData));
      localStorage.setItem('conductor_form_current_trip', JSON.stringify(trip));
      localStorage.setItem('conductor_form_expenses', JSON.stringify(expenses));
      localStorage.setItem('conductor_form_fuelDetails', JSON.stringify(fuelDetails));
      localStorage.setItem('conductor_form_completedTrips', JSON.stringify(completedTrips));
    }
  }, [formData, trip, expenses, fuelDetails, completedTrips, submitted]);

  // Fetch interconnected fuel price
  useEffect(() => {
    const fetchFuelPrice = async () => {
      try {
        const supabasePublic = createAnonymousClient();
        const { data } = await supabasePublic
          .from('fuel_settings')
          .select('diesel_price_lkr_per_l')
          .eq('is_default', true)
          .single();
        if (data && data.diesel_price_lkr_per_l) {
          setFuelPrice(data.diesel_price_lkr_per_l);
        }
      } catch (err) {
        console.error("Failed to fetch fuel price", err);
      }
    };
    fetchFuelPrice();
  }, []);

  // Auto-calculate liters based on fuel cost and price
  useEffect(() => {
    const costNum = parseFloat(expenses['fuel_cost']) || 0;
    const calculatedLiters = fuelPrice > 0 && costNum > 0 ? (costNum / fuelPrice).toFixed(2) : '';
    if (fuelDetails.liters !== calculatedLiters) {
      setFuelDetails(prev => ({ ...prev, liters: calculatedLiters }));
    }
  }, [expenses, fuelPrice]);

  // Derived calculations
  const calculateTripTotal = (incomeObj?: Record<string, string>) => {
    if (!incomeObj) return 0;
    return Object.values(incomeObj).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const totalIncome = calculateTripTotal(trip.income);
  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  const saveToHistory = (type: 'buses' | 'drivers' | 'conductors' | 'routes', value: string) => {
    if (!value || !value.trim()) return;
    setHistory((prev: any) => {
      const arr = prev[type] || [];
      if (!arr.includes(value.trim())) {
        const newHistory = { ...prev, [type]: [value.trim(), ...arr].slice(0, 10) };
        localStorage.setItem('conductor_form_history', JSON.stringify(newHistory));
        return newHistory;
      }
      return prev;
    });
  };

  const validateGlobalFields = () => {
    if (!formData.conductorName || !formData.driverName || !formData.busNumber || !formData.tripDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all global details first.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const submitPartialPayload = async (submissionType: 'trip_revenue' | 'fuel' | 'expenses', specificData: any) => {
    if (!validateGlobalFields()) return;

    setLoading(true);

    try {
      const supabasePublic = createAnonymousClient();
      
      const structuredData = {
        driver_name: formData.driverName,
        conductor_name: formData.conductorName,
        bus_number: formData.busNumber,
        route_name: formData.routeName,
        trip_date: formData.tripDate,
        submission_type: submissionType, // Tells backoffice what this payload contains
        data_entry_method: 'hub_spoke_v3',
        ...specificData
      };

      saveToHistory('buses', formData.busNumber);
      saveToHistory('drivers', formData.driverName);
      saveToHistory('conductors', formData.conductorName);
      saveToHistory('routes', formData.routeName);

      const { error: insertError } = await supabasePublic
        .from('conductor_submissions')
        .insert({
          conductor_name: formData.conductorName,
          conductor_phone: '0000000000',
          bus_number: formData.busNumber,
          trip_date: formData.tripDate,
          image_url: 'manual_data_entry_no_image', 
          ocr_data: structuredData,
          status: 'pending',
          submission_code: '' 
        });

      if (insertError) throw insertError;

      const uiCode = 'SUB-' + new Date().getTime().toString().slice(-6);
      setSubmissionCode(uiCode);
      setSubmitted(true);
      
      // Clear relevant local storage
      if (submissionType === 'trip_revenue') {
        const newCompleted = [...completedTrips, { 
          tripNumber: currentTripNumber, 
          total: calculateTripTotal(specificData?.trips?.[0]?.income), 
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
        }];
        setCompletedTrips(newCompleted);
        localStorage.setItem('conductor_form_completedTrips', JSON.stringify(newCompleted));

        localStorage.removeItem('conductor_form_current_trip');
        setCurrentTripNumber(prev => prev + 1); // Increment trip number for next time
        setTrip({ id: Date.now().toString(), startOdo: '', endOdo: '', income: { callBooking: '', agentBooking: '', busCollection: '', luggage: '', miscIncome: '' } });
      } else if (submissionType === 'fuel') {
        localStorage.removeItem('conductor_form_fuelDetails');
      } else if (submissionType === 'expenses') {
        localStorage.removeItem('conductor_form_expenses');
      }

      toast({ title: t.successTitle, description: t.successDesc });
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTrip = (e: React.FormEvent) => {
    e.preventDefault();
    submitPartialPayload('trip_revenue', {
      trips: [{
        trip_number: currentTripNumber,
        start_odometer: parseFloat(trip.startOdo) || null,
        end_odometer: parseFloat(trip.endOdo) || null,
        income: {
          call_booking: parseFloat(trip.income.callBooking) || 0,
          agent_booking: parseFloat(trip.income.agentBooking) || 0,
          bus_collection: parseFloat(trip.income.busCollection) || 0,
          luggage_income: parseFloat(trip.income.luggage) || 0,
          miscellaneous_income: parseFloat(trip.income.miscIncome) || 0,
          total: totalIncome
        }
      }],
      total_income: totalIncome
    });
  };

  const handleSubmitFuel = (e: React.FormEvent) => {
    e.preventDefault();
    submitPartialPayload('fuel', {
      fuel_details: {
        time: fuelDetails.time,
        odometer: fuelDetails.odometer,
        liters: parseFloat(fuelDetails.liters) || null,
        payment_method: fuelDetails.paymentMethod
      },
      // Automatically map fuel to expenses
      expenses: {
        fuel_cost: parseFloat(expenses['fuel_cost']) || 0
      }
    });
  };

  const handleSubmitExpenses = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedExpenses = Object.entries(expenses).reduce((acc: any, [key, val]) => {
      if (parseFloat(val) > 0) acc[key] = parseFloat(val);
      return acc;
    }, {});
    formattedExpenses.total = totalExpenses;

    submitPartialPayload('expenses', {
      expenses: formattedExpenses
    });
  };

  const updateTripIncome = (field: string, value: string) => {
    setTrip({ ...trip, income: { ...trip.income, [field]: value } });
  };

  const resetForm = () => {
    setSubmitted(false);
    setCurrentStep('hub');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">{t.successTitle}</CardTitle>
            <CardDescription>{t.successDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
              <p className="text-sm text-emerald-800 mb-2 font-medium">{t.trackingCode}</p>
              <p className="text-3xl font-bold font-mono text-emerald-600">{submissionCode}</p>
            </div>
            <Button onClick={resetForm} className="w-full h-12 text-lg" variant="outline">
              {t.submitAnother}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const displayGreeting = formData.driverName ? `${greeting}, ${formData.driverName.split(' ')[0]}!` : formData.conductorName ? `${greeting}, ${formData.conductorName.split(' ')[0]}!` : `${greeting}, Crew!`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center sm:p-4 pb-24">
      <Card className="w-full max-w-lg shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border-0 sm:border rounded-none sm:rounded-[2rem] overflow-hidden bg-white">
        
        {/* Dynamic Premium Hero Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
          {/* Abstract background blobs */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />
          
          <div className="relative p-6 pt-8 pb-10 z-10">
            {currentStep !== 'hub' && (
              <Button variant="ghost" className="mb-4 text-white hover:bg-white/10 -ml-2 h-8 px-2" onClick={() => setCurrentStep('hub')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
              </Button>
            )}

            <div className="flex justify-between items-start mb-6">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1"
              >
                <span className="flex items-center gap-2 text-blue-200 text-sm font-medium">
                  {hour < 12 ? <Sun className="w-4 h-4" /> : hour < 18 ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  NCG Speed Crew
                </span>
                <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
                  {currentStep === 'hub' ? displayGreeting : currentStep === 'trip' ? 'Trip Revenue' : currentStep === 'fuel' ? 'Fuel Entry' : 'Expenses'}
                </h1>
              </motion.div>
              
              {/* Sleek Glass Language Switcher */}
              <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/10">
                {(['en', 'si', 'ta'] as const).map(l => (
                  <button 
                    key={l} type="button" onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${lang === l ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}
                  >
                    {l === 'en' ? 'EN' : l === 'si' ? 'සිං' : 'த'}
                  </button>
                ))}
              </div>
            </div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-blue-100 text-sm max-w-[250px] leading-relaxed"
            >
              {currentStep === 'hub' ? t.subtitle : `Submit your ${currentStep} details`}
            </motion.p>
          </div>
        </div>

        <CardContent className="p-0 sm:p-2 bg-slate-50/50">
          <div className="relative pb-6">
            
            <AnimatePresence mode="wait">
              {currentStep === 'hub' && (
                <motion.div 
                  key="hub"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-6 pt-4 px-4 sm:px-5"
                >
                  {/* Global Details */}
                  <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                      <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">{t.globalDetails}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t.tripDate}</Label>
                        <Input type="date" value={formData.tripDate} onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })} required className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t.busNumber}</Label>
                        <AutocompleteInput 
                          value={formData.busNumber} 
                          onChange={(v) => setFormData({ ...formData, busNumber: v })} 
                          options={history.buses || []} 
                          placeholder="NA-1234" 
                          uppercase={true} 
                          autoFormat="bus"
                          icon={<Bus className="w-4 h-4" />}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t.routeName}</Label>
                        <AutocompleteInput 
                          value={formData.routeName} 
                          onChange={(v) => setFormData({ ...formData, routeName: v })} 
                          options={history.routes || []} 
                          placeholder={lang === 'si' ? 'කොළඹ - මහනුවර' : 'Colombo - Kandy'}
                          icon={<Route className="w-4 h-4 text-blue-500" />}
                        />
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t.driverName}</Label>
                        <AutocompleteInput 
                          value={formData.driverName} 
                          onChange={(v) => setFormData({ ...formData, driverName: v })} 
                          options={history.drivers || []} 
                          placeholder="Driver Name"
                          icon={<User className="w-4 h-4" />}
                        />
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t.conductorName}</Label>
                        <AutocompleteInput 
                          value={formData.conductorName} 
                          onChange={(v) => setFormData({ ...formData, conductorName: v })} 
                          options={history.conductors || []} 
                          placeholder="Conductor Name"
                          icon={<User className="w-4 h-4 text-emerald-500" />}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submitted Trips Summary */}
                  {completedTrips.length > 0 && (
                    <div className="bg-emerald-50 rounded-[1.5rem] p-5 border border-emerald-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-emerald-800 text-sm">Today's Submitted Trips</h4>
                        <div className="bg-white text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-bold">
                          {completedTrips.length} {completedTrips.length === 1 ? 'Trip' : 'Trips'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {completedTrips.map(ct => (
                          <div key={ct.tripNumber} className="flex justify-between items-center bg-white p-3 rounded-xl border border-emerald-100/50 text-sm text-slate-600 shadow-sm">
                            <span className="font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Trip {ct.tripNumber}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400">{ct.time}</span>
                              <span className="font-black text-emerald-700">Rs. {ct.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hub Actions */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => { if (validateGlobalFields()) setCurrentStep('trip'); }}
                      className="w-full bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <Bus className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-lg text-slate-800">{lang === 'si' ? 'ගමන් ආදායම්' : t.income}</h4>
                          <p className="text-xs text-slate-500 font-medium">Submit revenue trip by trip</p>
                        </div>
                      </div>
                      <Navigation className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors transform group-hover:translate-x-1" />
                    </button>

                    <button 
                      onClick={() => { if (validateGlobalFields()) setCurrentStep('fuel'); }}
                      className="w-full bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between hover:border-orange-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                          <Banknote className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-lg text-slate-800">{lang === 'si' ? 'ඉන්ධන' : 'Fuel Details'}</h4>
                          <p className="text-xs text-slate-500 font-medium">Record diesel and pumping details</p>
                        </div>
                      </div>
                      <Navigation className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors transform group-hover:translate-x-1" />
                    </button>

                    <button 
                      onClick={() => { if (validateGlobalFields()) setCurrentStep('expenses'); }}
                      className="w-full bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between hover:border-rose-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                          <Receipt className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-lg text-slate-800">{lang === 'si' ? 'වියදම්' : t.expenses}</h4>
                          <p className="text-xs text-slate-500 font-medium">Record daily operational costs</p>
                        </div>
                      </div>
                      <Navigation className="w-5 h-5 text-slate-300 group-hover:text-rose-500 transition-colors transform group-hover:translate-x-1" />
                    </button>

                  </div>
                </motion.div>
              )}

              {currentStep === 'trip' && (
                <motion.div 
                  key="trip"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6 pt-4 px-4 sm:px-5"
                >
                  <form onSubmit={handleSubmitTrip} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-emerald-50/50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                        <h3 className="font-bold text-slate-800">{t.tripTitle} {currentTripNumber}</h3>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Odometer */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-500">{t.startOdo}</Label>
                          <Input 
                            type="number" inputMode="decimal" placeholder="0" 
                            value={trip.startOdo} onChange={(e) => setTrip({...trip, startOdo: e.target.value})} 
                            className="h-8 text-sm" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-500">{t.endOdo}</Label>
                          <Input 
                            type="number" inputMode="decimal" placeholder="0" 
                            value={trip.endOdo} onChange={(e) => setTrip({...trip, endOdo: e.target.value})} 
                            className="h-8 text-sm" 
                          />
                        </div>
                      </div>

                      {/* Income Fields */}
                      <div className="space-y-2">
                        {[
                          { key: 'callBooking', label: t.callBooking },
                          { key: 'agentBooking', label: t.agentBooking },
                          { key: 'busCollection', label: t.busCollection },
                          { key: 'luggage', label: t.luggage },
                          { key: 'miscIncome', label: t.miscIncome },
                        ].map(inc => (
                          <div key={inc.key} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                            <Label className="text-sm font-semibold text-slate-600">{inc.label}</Label>
                            <div className="relative w-32">
                              <Input 
                                type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
                                className="h-9 text-right font-medium focus-visible:ring-emerald-500" 
                                value={trip.income?.[inc.key as keyof typeof trip.income] || ''} 
                                onChange={(e) => updateTripIncome(inc.key, e.target.value)} 
                                onFocus={(e) => e.target.select()}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-600 text-sm">Trip Subtotal</span>
                        <span className="font-black text-emerald-600 text-lg">Rs. {totalIncome.toFixed(2)}</span>
                      </div>

                      <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md">
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                        {t.submitTrip}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {currentStep === 'fuel' && (
                <motion.div 
                  key="fuel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6 pt-4 px-4 sm:px-5"
                >
                  <form onSubmit={handleSubmitFuel} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                      <h3 className="font-bold text-slate-800">{t.fuelDetails}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 bg-orange-50/50 p-3 rounded-lg border border-orange-100/50">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 flex justify-between">
                          {t.fuelTime}
                          <button type="button" onClick={() => setFuelDetails({...fuelDetails, time: getCurrentTime()})} className="text-[10px] text-blue-600 hover:underline">Now</button>
                        </Label>
                        <Input type="time" value={fuelDetails.time || ''} onChange={e => setFuelDetails({...fuelDetails, time: e.target.value})} className="h-9 bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">{t.fuelOdo}</Label>
                        <Input type="number" inputMode="decimal" placeholder="0" value={fuelDetails.odometer || ''} onChange={e => setFuelDetails({...fuelDetails, odometer: e.target.value})} className="h-9 bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">{t.fuelCost}</Label>
                        <Input 
                          type="number" 
                          inputMode="decimal" 
                          placeholder="0.00" 
                          value={expenses['fuel_cost'] || ''} 
                          onChange={e => setExpenses({...expenses, fuel_cost: e.target.value})} 
                          className="h-9 bg-white" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">{t.fuelLiters} (Auto)</Label>
                        <Input 
                          type="number" 
                          inputMode="decimal" 
                          placeholder="0.0" 
                          value={fuelDetails.liters || ''} 
                          disabled
                          className="h-9 bg-slate-100 text-slate-500 cursor-not-allowed" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">{t.fuelPayment}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          onClick={() => setFuelDetails({...fuelDetails, paymentMethod: 'cash'})}
                          className={`flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${fuelDetails.paymentMethod === 'cash' ? 'bg-orange-100 border-orange-300 text-orange-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                        >
                          <Banknote className="w-4 h-4" /> {t.cash}
                        </div>
                        <div 
                          onClick={() => setFuelDetails({...fuelDetails, paymentMethod: 'card'})}
                          className={`flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${fuelDetails.paymentMethod === 'card' ? 'bg-orange-100 border-orange-300 text-orange-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                        >
                          <CreditCard className="w-4 h-4" /> {t.card}
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md mt-4">
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                      {t.submitFuel}
                    </Button>
                  </form>
                </motion.div>
              )}

              {currentStep === 'expenses' && (
                <motion.div 
                  key="expenses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6 pt-4 px-4 sm:px-5"
                >
                  <form onSubmit={handleSubmitExpenses} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
                      <h3 className="font-bold text-slate-800">{t.expenses}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      {EXPENSE_CATEGORIES.filter(c => c.primary || showAllExpenses).map((cat) => (
                        <div key={cat.key} className="flex items-center justify-between py-1 border-b border-slate-50">
                          <Label className="text-sm font-semibold text-slate-600 truncate mr-2">
                            {lang === 'en' ? cat.en : lang === 'si' ? cat.si : cat.ta}
                          </Label>
                          <div className="relative w-28 shrink-0">
                            <Input 
                              type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
                              className="h-8 text-right font-medium text-sm focus-visible:ring-rose-500 bg-rose-50/30 border-rose-100" 
                              value={expenses[cat.key] || ''} 
                              onChange={(e) => setExpenses({...expenses, [cat.key]: e.target.value})} 
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      type="button" variant="ghost" 
                      className="w-full text-sm text-slate-500 hover:text-slate-800 mt-2" 
                      onClick={() => setShowAllExpenses(!showAllExpenses)}
                    >
                      {showAllExpenses ? t.hideExpenses : t.showAllExpenses}
                    </Button>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-slate-600 text-sm">Expenses Subtotal</span>
                      <span className="font-black text-rose-600 text-lg">Rs. {totalExpenses.toFixed(2)}</span>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full h-12 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md mt-4">
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                      {t.submitExpenses}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}