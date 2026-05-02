import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, Send, Languages, Calculator, Plus, Trash2, ChevronDown, ChevronUp, Upload, CreditCard, Banknote, Camera } from 'lucide-react';
import { createAnonymousClient } from '@/integrations/supabase/public-client';
import { GamificationBanner } from '@/components/trips/GamificationBanner';

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
    submit: "Submit Details",
    submitting: "Submitting...",
    successTitle: "Submission Received!",
    successDesc: "Your trip details have been successfully submitted.",
    trackingCode: "Your tracking code:",
    submitAnother: "Submit Another Day"
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
    submit: "ගමන් විස්තර ඉදිරිපත් කරන්න",
    submitting: "ඉදිරිපත් කරමින්...",
    successTitle: "සාර්ථකයි!",
    successDesc: "ඔබගේ ගමන් විස්තර සාර්ථකව ඉදිරිපත් කරන ලදී.",
    trackingCode: "ඔබේ ලුහුබැඳීමේ කේතය:",
    submitAnother: "තවත් දිනක් ඇතුලත් කරන්න"
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
    submitting: "சமர்ப்பிக்கிறது...",
    successTitle: "வெற்றி!",
    successDesc: "உங்கள் பயண விவரங்கள் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டன.",
    trackingCode: "உங்கள் கண்காணிப்பு குறியீடு:",
    submitAnother: "மற்றொரு நாள் சமர்ப்பிக்கவும்"
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
  expanded: boolean;
}

// Custom Autocomplete Input for mobile reliability
const AutocompleteInput = ({ 
  value = '', 
  onChange, 
  options = [], 
  placeholder, 
  uppercase = false,
  autoFormat
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: string[]; 
  placeholder?: string;
  uppercase?: boolean;
  autoFormat?: 'bus';
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
      // Remove all spaces and hyphens, force uppercase
      val = val.replace(/[\s-]/g, '').toUpperCase();
      // If it ends with 4 numbers and has letters/numbers before it, insert a hyphen
      const match = val.match(/^([A-Z0-9]+?)(\d{4})$/);
      if (match) {
        val = `${match[1]}-${match[2]}`;
      }
    }
    onChange(val);
  };

  return (
    <div className="relative">
      <Input 
        value={safeValue} 
        onChange={handleChange} 
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder={placeholder}
        required
        className="bg-slate-50 border-slate-200"
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

  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionCode, setSubmissionCode] = useState('');
  
  // Gamification & Route Master State
  const [routeTarget, setRouteTarget] = useState<number>(0);
  const [fetchingMaster, setFetchingMaster] = useState(false);
  
  // Autocomplete Memory
  const [history, setHistory] = useState(() => loadState('history', { buses: [], drivers: [], conductors: [] }));
  
  // Form State
  const [formData, setFormData] = useState(() => loadState('global', {
    driverName: '',
    conductorName: '',
    busNumber: '',
    tripDate: new Date().toISOString().split('T')[0],
  }));

  const [trips, setTrips] = useState<Trip[]>(() => loadState('trips', [{
    id: '1', startOdo: '', endOdo: '', expanded: true,
    income: { callBooking: '', agentBooking: '', busCollection: '', luggage: '', miscIncome: '' }
  }]));

  const [expenses, setExpenses] = useState<Record<string, string>>(() => loadState('expenses', {}));
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Fuel Details
  const getCurrentTime = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const [fuelDetails, setFuelDetails] = useState(() => loadState('fuelDetails', {
    time: getCurrentTime(),
    odometer: '',
    liters: '',
    paymentMethod: 'card' as 'cash' | 'card'
  }));

  // Bank Deposit Details
  const [bankDeposit, setBankDeposit] = useState(() => loadState('bankDeposit', {
    amount: '',
    bankName: ''
  }));
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  // Auto-save Effect
  useEffect(() => {
    if (!submitted) {
      localStorage.setItem('conductor_form_global', JSON.stringify(formData));
      localStorage.setItem('conductor_form_trips', JSON.stringify(trips));
      localStorage.setItem('conductor_form_expenses', JSON.stringify(expenses));
      localStorage.setItem('conductor_form_fuelDetails', JSON.stringify(fuelDetails));
      localStorage.setItem('conductor_form_bankDeposit', JSON.stringify(bankDeposit));
    }
  }, [formData, trips, expenses, fuelDetails, bankDeposit, submitted]);

  // Route Master Auto-Fill Hook
  useEffect(() => {
    const fetchMasterConfig = async () => {
      const bus = formData.busNumber?.trim().toUpperCase();
      if (!bus || bus.length < 4) return;
      
      setFetchingMaster(true);
      try {
        const supabase = createAnonymousClient();
        // Look for any route that has this bus assigned as default
        const { data, error } = await supabase
          .from('routes')
          .select('master_config')
          .eq('is_active', true);

        if (!error && data) {
          // Find the route matching this bus
          const routeMatch = data.find(r => r.master_config && r.master_config.default_bus === bus);
          
          if (routeMatch && routeMatch.master_config) {
            const config = routeMatch.master_config;
            
            // Auto-fill Gamification Targets
            if (config.revenue_target) {
              setRouteTarget(Number(config.revenue_target));
            }
            
            // Auto-fill standard expenses (only if they aren't already set)
            setExpenses(prev => ({
              ...prev,
              ...(config.meal_allowance && !prev['food'] ? { food: config.meal_allowance } : {}),
              ...(config.highway_fee && !prev['highway_charges'] ? { highway_charges: config.highway_fee } : {}),
              ...(config.runner_fee && !prev['runner'] ? { runner: config.runner_fee } : {}),
            }));

            // Auto-fill Crew if they are empty
            setFormData((prev: any) => ({
              ...prev,
              driverName: prev.driverName || config.default_driver || '',
              conductorName: prev.conductorName || config.default_conductor || ''
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch route master config:', err);
      } finally {
        setFetchingMaster(false);
      }
    };

    // Debounce the fetch slightly
    const timeoutId = setTimeout(fetchMasterConfig, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.busNumber]);

  // Derived calculations
  const calculateTripTotal = (incomeObj?: Record<string, string>) => {
    if (!incomeObj) return 0;
    return Object.values(incomeObj).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const totalIncome = trips.reduce((sum, trip) => sum + calculateTripTotal(trip.income), 0);
  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const netBalance = totalIncome - totalExpenses;
  
  // Suggested deposit includes fuel cost if it was paid by card
  const fuelCostValue = parseFloat(expenses['fuel_cost']) || 0;
  const isFuelCard = fuelDetails.paymentMethod === 'card';
  
  const suggestedDeposit = (netBalance > 0 ? netBalance : 0) + (isFuelCard ? fuelCostValue : 0);

  // Autocomplete DataLists
  const saveToHistory = (type: 'buses' | 'drivers' | 'conductors', value: string) => {
    if (!value.trim()) return;
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

  const addTrip = () => {
    const lastTrip = trips[trips.length - 1];
    const newStartOdo = lastTrip?.endOdo || '';
    
    const newTrips = trips.map(t => ({ ...t, expanded: false })); // Collapse others
    
    setTrips([...newTrips, {
      id: Date.now().toString(),
      startOdo: newStartOdo,
      endOdo: '',
      expanded: true,
      income: { callBooking: '', agentBooking: '', busCollection: '', luggage: '', miscIncome: '' }
    }]);
  };

  const updateTrip = (id: string, field: keyof Trip, value: any) => {
    setTrips(trips.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateTripIncome = (id: string, field: string, value: string) => {
    setTrips(trips.map(t => t.id === id ? { ...t, income: { ...t.income, [field]: value } } : t));
  };

  const removeTrip = (id: string) => {
    if (trips.length > 1) {
      setTrips(trips.filter(t => t.id !== id));
    }
  };

  const toggleTrip = (id: string) => {
    setTrips(trips.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t));
  };

  const handleFuelCostChange = (val: string) => {
    // Auto-sync with expenses
    setExpenses(prev => ({ ...prev, fuel_cost: val }));
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.conductorName || !formData.driverName || !formData.busNumber || !formData.tripDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields in the top section.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const supabasePublic = createAnonymousClient();
      
      // Build structured JSON
      const formattedTrips = trips.map((t, idx) => ({
        trip_number: idx + 1,
        start_odometer: parseFloat(t.startOdo) || null,
        end_odometer: parseFloat(t.endOdo) || null,
        income: {
          call_booking: parseFloat(t.income.callBooking) || 0,
          agent_booking: parseFloat(t.income.agentBooking) || 0,
          bus_collection: parseFloat(t.income.busCollection) || 0,
          luggage_income: parseFloat(t.income.luggage) || 0,
          miscellaneous_income: parseFloat(t.income.miscIncome) || 0,
          total: calculateTripTotal(t.income)
        }
      }));

      const formattedExpenses = Object.entries(expenses).reduce((acc: any, [key, val]) => {
        if (parseFloat(val) > 0) acc[key] = parseFloat(val);
        return acc;
      }, {});
      formattedExpenses.total = totalExpenses;

      let slipUrl = null;
      if (slipFile) {
        const ext = slipFile.name.split('.').pop();
        const filePath = `slips/${formData.busNumber}_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabasePublic.storage
          .from('conductor-submissions')
          .upload(filePath, slipFile);
          
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabasePublic.storage.from('conductor-submissions').getPublicUrl(uploadData.path);
          slipUrl = publicUrl;
        }
      }

      const structuredData = {
        driver_name: formData.driverName,
        bus_number: formData.busNumber,
        trip_date: formData.tripDate,
        trips: formattedTrips,
        expenses: formattedExpenses,
        fuel_details: {
          time: fuelDetails.time,
          odometer: fuelDetails.odometer,
          liters: parseFloat(fuelDetails.liters) || null,
          payment_method: fuelDetails.paymentMethod
        },
        bank_deposit: {
          suggested_amount: suggestedDeposit,
          actual_amount: parseFloat(bankDeposit.amount) || 0,
          bank_name: bankDeposit.bankName,
          slip_url: slipUrl
        },
        total_income: totalIncome,
        net_balance: netBalance,
        data_entry_method: 'manual_form_v2'
      };

      // Save to autocomplete history
      saveToHistory('buses', formData.busNumber);
      saveToHistory('drivers', formData.driverName);
      saveToHistory('conductors', formData.conductorName);

      const { error: insertError } = await supabasePublic
        .from('conductor_submissions')
        .insert({
          conductor_name: formData.conductorName,
          conductor_phone: '0000000000', // Dummy to satisfy constraint
          bus_number: formData.busNumber,
          trip_date: formData.tripDate,
          image_url: 'manual_data_entry_no_image', 
          ocr_data: structuredData,
          status: 'pending',
          submission_code: '' 
        });

      if (insertError) throw insertError;

      // We cannot select the generated code back due to RLS, so we generate a UI-only code
      const uiCode = 'SUB-' + new Date().getTime().toString().slice(-6);
      setSubmissionCode(uiCode);
      setSubmitted(true);
      
      // Clear auto-save
      localStorage.removeItem('conductor_form_global');
      localStorage.removeItem('conductor_form_trips');
      localStorage.removeItem('conductor_form_expenses');
      localStorage.removeItem('conductor_form_fuelDetails');
      localStorage.removeItem('conductor_form_bankDeposit');

      toast({ title: t.successTitle, description: t.successDesc });
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({ driverName: '', conductorName: '', busNumber: '', tripDate: new Date().toISOString().split('T')[0] });
    setTrips([{ id: '1', startOdo: '', endOdo: '', expanded: true, income: { callBooking: '', agentBooking: '', busCollection: '', luggage: '', miscIncome: '' } }]);
    setExpenses({});
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-0 sm:p-4 pb-20">
      <Card className="w-full max-w-lg shadow-2xl border-0 sm:border rounded-none sm:rounded-xl overflow-hidden">
        {/* Language Switcher */}
        <div className="bg-slate-900 text-slate-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-slate-300" />
            <span className="font-semibold text-sm">Language</span>
          </div>
          <div className="flex bg-slate-800 rounded-md p-1 gap-1">
            {(['en', 'si', 'ta'] as const).map(l => (
              <button 
                key={l} type="button" onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs font-bold rounded ${lang === l ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                {l === 'en' ? 'EN' : l === 'si' ? 'සිංහල' : 'தமிழ்'}
              </button>
            ))}
          </div>
        </div>

        <CardHeader className="text-center bg-white border-b pb-4">
          <CardTitle className="text-2xl font-black text-slate-800">{t.title}</CardTitle>
          <CardDescription className="text-sm font-medium text-slate-500">{t.subtitle}</CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step Navigation */}
            <div className="flex bg-slate-200/50 p-1 rounded-lg mb-6 shadow-inner">
              <button 
                type="button" 
                onClick={() => setCurrentStep(1)} 
                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${currentStep === 1 ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                1. Trips & Details
              </button>
              <button 
                type="button" 
                onClick={() => setCurrentStep(2)} 
                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${currentStep === 2 ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                2. {t.expenses} & Deposit
              </button>
            </div>

            {/* STEP 1: Global Details & Trips */}
            <div className={currentStep === 1 ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
              
              {/* Gamification Banner */}
              <GamificationBanner totalIncome={totalIncome} totalExpenses={totalExpenses} routeTarget={routeTarget} />

              {/* Global Details */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
                {fetchingMaster && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Auto-filling...
                  </div>
                )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                <h3 className="font-bold text-slate-800">{t.globalDetails}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.tripDate}</Label>
                  <Input type="date" value={formData.tripDate} onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })} required className="bg-slate-50 border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.busNumber}</Label>
                  <AutocompleteInput 
                    value={formData.busNumber} 
                    onChange={(v) => setFormData({ ...formData, busNumber: v })} 
                    options={history.buses || []} 
                    placeholder="NA-1234" 
                    uppercase={true} 
                    autoFormat="bus"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.driverName}</Label>
                  <AutocompleteInput 
                    value={formData.driverName} 
                    onChange={(v) => setFormData({ ...formData, driverName: v })} 
                    options={history.drivers || []} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.conductorName}</Label>
                  <AutocompleteInput 
                    value={formData.conductorName} 
                    onChange={(v) => setFormData({ ...formData, conductorName: v })} 
                    options={history.conductors || []} 
                  />
                </div>
              </div>
            </div>

            {/* Trips Accordion */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                  <h3 className="font-bold text-slate-800">{t.income} / Trips</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addTrip} className="h-8 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                  <Plus className="w-4 h-4 mr-1" /> {t.addTrip}
                </Button>
              </div>

              {trips.map((trip, index) => (
                <div key={trip.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
                  <div 
                    className={`p-3 flex items-center justify-between cursor-pointer select-none ${trip.expanded ? 'bg-emerald-50/50 border-b border-slate-100' : ''}`}
                    onClick={() => toggleTrip(trip.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-700">{t.tripTitle} {index + 1}</span>
                      {!trip.expanded && calculateTripTotal(trip.income) > 0 && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Rs. {calculateTripTotal(trip.income)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {trips.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); removeTrip(trip.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {trip.expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                  
                  {trip.expanded && (
                    <div className="p-4 space-y-4">
                      {/* Odometer */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-500">{t.startOdo}</Label>
                          <Input 
                            type="number" inputMode="decimal" placeholder="0" 
                            value={trip.startOdo} onChange={(e) => updateTrip(trip.id, 'startOdo', e.target.value)} 
                            onFocus={(e) => e.target.select()}
                            className="h-8 text-sm" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-500">{t.endOdo}</Label>
                          <Input 
                            type="number" inputMode="decimal" placeholder="0" 
                            value={trip.endOdo} onChange={(e) => updateTrip(trip.id, 'endOdo', e.target.value)} 
                            onFocus={(e) => e.target.select()}
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
                                onChange={(e) => updateTripIncome(trip.id, inc.key, e.target.value)} 
                                onFocus={(e) => e.target.select()}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Expenses Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
                  <h3 className="font-bold text-slate-800">{t.expenses}</h3>
                </div>
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
            </div>
          </div>

            {/* STEP 2: Expenses & Fuel & Bank */}
            <div className={currentStep === 2 ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>

            {/* Fuel Details Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                  <h3 className="font-bold text-slate-800">{t.fuelDetails}</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 bg-orange-50/50 p-3 rounded-lg border border-orange-100/50">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 flex justify-between">
                    {t.fuelTime}
                    <button type="button" onClick={() => setFuelDetails({...fuelDetails, time: getCurrentTime()})} className="text-[10px] text-blue-600 hover:underline">Now</button>
                  </Label>
                  <Input type="time" value={fuelDetails.time} onChange={e => setFuelDetails({...fuelDetails, time: e.target.value})} className="h-9 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.fuelOdo}</Label>
                  <Input type="number" inputMode="decimal" placeholder="0" value={fuelDetails.odometer} onChange={e => setFuelDetails({...fuelDetails, odometer: e.target.value})} className="h-9 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.fuelLiters}</Label>
                  <Input type="number" inputMode="decimal" placeholder="0.0" value={fuelDetails.liters} onChange={e => setFuelDetails({...fuelDetails, liters: e.target.value})} className="h-9 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.fuelCost}</Label>
                  <Input type="number" inputMode="decimal" placeholder="0.00" value={expenses['fuel_cost'] || ''} onChange={e => handleFuelCostChange(e.target.value)} className="h-9 bg-white" />
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
                {isFuelCard && (
                  <p className="text-[10px] text-orange-600 font-medium px-1">
                    * Card payment will not be deducted from the cash handover amount.
                  </p>
                )}
              </div>
            </div>

            {/* Bank Deposit Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-purple-500 rounded-full" />
                  <h3 className="font-bold text-slate-800">{t.bankDeposit}</h3>
                </div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-purple-800 flex flex-col">
                  {t.suggestedDeposit}
                  {isFuelCard && fuelCostValue > 0 && (
                    <span className="text-[10px] text-purple-600/80 font-normal mt-0.5">+ Rs. {fuelCostValue.toFixed(2)} Card Fuel added to deposit</span>
                  )}
                </span>
                <span className="text-lg font-black text-purple-700">Rs. {suggestedDeposit.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.actualDeposit}</Label>
                  <Input 
                    type="number" inputMode="decimal" placeholder="0.00" 
                    value={bankDeposit.amount} onChange={e => setBankDeposit({...bankDeposit, amount: e.target.value})} 
                    className="h-10 text-lg font-bold" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t.bankName}</Label>
                  <Input 
                    placeholder="e.g. BOC / Commercial Bank" 
                    value={bankDeposit.bankName} onChange={e => setBankDeposit({...bankDeposit, bankName: e.target.value})} 
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-600">{t.uploadSlip}</Label>
                    <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
                  </div>
                  
                  {!slipPreview ? (
                    <div className="flex gap-2">
                      {/* Camera Button */}
                      <div className="relative flex-1">
                        <input 
                          type="file" accept="image/*" capture="environment"
                          onChange={handleSlipChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center gap-1 p-3 border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors h-full text-center">
                          <Camera className="w-5 h-5 text-slate-500" />
                          <span className="text-[11px] font-bold text-slate-600">Take Photo</span>
                        </div>
                      </div>

                      {/* Gallery / File Button */}
                      <div className="relative flex-1">
                        <input 
                          type="file" accept="image/*"
                          onChange={handleSlipChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center gap-1 p-3 border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors h-full text-center">
                          <Upload className="w-5 h-5 text-slate-500" />
                          <span className="text-[11px] font-bold text-slate-600">Upload Slip</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-3 animate-in zoom-in-95 duration-200">
                      <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-black/5 flex justify-center p-2">
                        <img src={slipPreview} alt="Bank Slip Preview" className="w-auto h-auto max-h-48 object-contain rounded-md shadow-sm" />
                        <button 
                          type="button" 
                          onClick={() => { setSlipFile(null); setSlipPreview(null); }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-all active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => { setSlipFile(null); setSlipPreview(null); }}
                          className="flex-1 text-xs border-slate-300 text-slate-600 h-10 hover:bg-slate-100"
                        >
                          Re-upload
                        </Button>
                        <Button 
                          type="button" 
                          className="flex-[2] text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10 shadow-lg shadow-emerald-600/20"
                          onClick={(e) => { e.preventDefault(); }}
                        >
                          <Check className="w-4 h-4 mr-1.5" /> Use this Photo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
            {/* End Step 2 */}

            {/* Fixed Bottom Summary & Submit */}
            <div className="sticky bottom-4 z-10 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl space-y-3 mt-8 border border-slate-700/50 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-1 opacity-80">
                <Calculator className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Summary</h3>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <span className="text-emerald-400 text-sm font-medium">{t.totalIncome}</span>
                <span className="font-mono text-emerald-400 font-bold">Rs. {totalIncome.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <span className="text-rose-400 text-sm font-medium">{t.totalExpenses}</span>
                <span className="font-mono text-rose-400 font-bold">- Rs. {totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 pb-3 border-b border-slate-700/50">
                <span className="font-black text-slate-100">{t.netBalance}</span>
                <span className="font-mono font-black text-xl text-white">Rs. {netBalance.toFixed(2)}</span>
              </div>

              <div className="pt-2 flex gap-3">
                {currentStep === 2 && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)} 
                    className="flex-1 h-14 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    ← Back
                  </Button>
                )}
                
                {currentStep === 1 ? (
                  <Button 
                    type="button"
                    onClick={() => setCurrentStep(2)} 
                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] border-0"
                  >
                    Next: Expenses →
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] border-0"
                  >
                    {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.submitting}</> : <><Send className="mr-2 h-5 w-5" /> {t.submit}</>}
                  </Button>
                )}
              </div>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}