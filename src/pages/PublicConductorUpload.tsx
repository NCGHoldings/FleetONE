import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar as CalendarIcon, User, Bus, Route, ArrowRight, ArrowLeft, Sun, Moon, CheckCircle, ChevronRight, Check, Plus, Minus, FileText, Banknote, Receipt, Navigation, PartyPopper, Sparkles, Loader2, Send, Calculator, Trash2, Upload, CreditCard, Camera, Lock, X, ChevronsUpDown } from "lucide-react";
import { createAnonymousClient } from '@/integrations/supabase/public-client';
import { GamificationBanner } from '@/components/trips/GamificationBanner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import CrewLogin from './CrewLogin';

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
    magiyaCollection: "MAGIYA COLLECTION",
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
    submitAnother: "Back to Hub",
    bannerReady: [
      "Ready for the road? 🚌",
      "Even if the road is long, with big dreams the journey is not tiring.",
      "The steering wheel is in your hands - the responsibility of a thousand lives is in your heart.",
      "The rhythm of the road is at your feet - the trust of passengers is in your hands.",
      "A watchful eye - a safe destination.",
      "Let's prioritize responsibility over speed."
    ],
    bannerKeepUp: "Keep it up! 💪",
    bannerDone: "Incredible work! 🎉",
    bannerRemaining: "You have {remaining} more trip(s) to go today. Let's make it a great one!",
    bannerCompleted: "You've completed all your scheduled trips today. Drive safe!"
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
    magiyaCollection: "මගිය එකතුව (Magiya Collection)",
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
    submitAnother: "ප්‍රධාන මෙනුවට",
    bannerReady: [
      "රෝද කැරකෙන තරමටයි ජීවිතේ දුවන්නේ! 🚌",
      "පාර දිග වුණත්, හීන ලොකු නම් ගමන මහන්සි නැත",
      "සුක්කානම ඔබේ අතේ - ජීවිත දහසක වගකීම ඔබේ හිතේ.",
      "පාරේ රිද්මය ඔබේ දෙපයේ - මගීන්ගේ විශ්වාසය ඔබේ දෑතේ.",
      "සුපරීක්ෂාකාරී දෑසක් - සුරක්ෂිත ගමනාන්තයක්.",
      "වේගයට වඩා - වගකීමට මුල්තැන දෙමු.",
      "ඔබේ හිනාව, මගියෙකුගේ දවසේ විඩාව නිවන්නකි.",
      "ටිකට් පත යනු, ඔවුන් අප කෙරෙහි තැබූ විශ්වාසයේ සහතිකයයි.",
      "සෙනඟ මැද ඔබේ මෙහෙයුම, බස් රථයේ සාර්ථකත්වයයි.",
      "නිවැරදි ඉතිරි මුදල, ඔබේ අවංකභාවයේ කැඩපතයි.",
      "මගීන්ට මඟ පෙන්වන ඔබ, ගමනේ දෙවන නියමුවායි.",
      "එක වචනයකින් මගියෙකුගේ හිත හැදීමට ඔබට පුළුවන.",
      "මගීන්ට පහසුකම් සැලසීම ඔබේ ප්‍රමුඛ රාජකාරියයි.",
      "ඔබේ කඩිසරකම, ගමනේ වේගය තීරණය කරයි.",
      "ඉවසීමෙන් කතා කිරීම, හොඳම පාරිභෝගික සේවාවයි.",
      "බස් රථයේ පිළිවෙළ රැකගැනීම ඔබේ වගකීමකි.",
      "සෑම මගියෙක්ම වැදගත්ය, සෑම ටිකට් පතක්ම වටී.",
      "ඔබ දෙන සංඥාව රියදුරුගේ ඇසයි.",
      "වගකීමෙන් යුතුව මුදල් හැසිරවීම ඔබේ දක්ෂකමයි.",
      "සුහදශීලී බවින් දවසම ජයගත හැක.",
      "ගමන නිමවන තුරුම අවධානය ගිලිහී යාමට ඉඩ නොදෙන්න.",
      "ඔබේ සේවය නැතිව මේ ගමන සම්පූර්ණ වන්නේ නැත.",
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
    bannerKeepUp: "කට්ට කාගෙන ඉස්සරහටම යමු! 💪",
    bannerDone: "අද දවසේ වැඩ ඉවරයි, සුපිරියි! 🎉",
    bannerRemaining: "අද දිනට තවත් ගමන් {remaining} ක්. පරිස්සමින් ගිහින් එන්න!",
    bannerCompleted: "අදට නියමිත ගමන් සියල්ල අවසන්. පරිස්සමින් ගෙදර යන්න."
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
    magiyaCollection: "மகியா சேகரிப்பு (Magiya Collection)",
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
    submitAnother: "பிரதான மெனுவிற்கு",
    bannerReady: [
      "பயணத்திற்கு தயாரா? 🚌",
      "பாதை நீளமாக இருந்தாலும், பெரிய கனவுகளுடன் பயணம் சோர்வடையாது.",
      "திசைமாற்றி உங்கள் கைகளில் - ஆயிரம் உயிர்களின் பொறுப்பு உங்கள் இதயத்தில்.",
      "பாதையின் தாளம் உங்கள் காலடியில் - பயணிகளின் நம்பிக்கை உங்கள் கைகளில்.",
      "கவனமான கண்கள் - பாதுகாப்பான இலக்கு.",
      "வேகத்தை விட பொறுப்புக்கு முன்னுரிமை கொடுப்போம்."
    ],
    bannerKeepUp: "தொடர்ந்து முன்னேறுங்கள்! 💪",
    bannerDone: "சிறப்பான பணி! இலக்கு முடிந்தது! 🎉",
    bannerRemaining: "இன்று இன்னும் {remaining} பயணங்கள் உள்ளன. பாதுகாப்பான பயணம்!",
    bannerCompleted: "இன்றைய பயணங்கள் முடிவடைந்தன. பத்திரமாக செல்லுங்கள்!"
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
    magiyaCollection: string;
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
        disabled={disabled}
        className={`bg-slate-50 border-slate-200 focus-visible:ring-blue-500 transition-all ${icon ? 'pl-9' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
  let crewMember: any = null;
  let isAuthenticated = false;
  try {
    const auth = useCrewAuth();
    crewMember = auth.crewMember;
    isAuthenticated = auth.isAuthenticated;
  } catch (e) {
    // Failsafe if used outside of CrewAuthProvider
  }

  if (!isAuthenticated) {
    return <CrewLogin />;
  }
  
  // Persistent State Loaders
  const loadState = (key: string, defaultVal: any) => {
    try {
      const saved = localStorage.getItem(`conductor_form_${key}`);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch { return defaultVal; }
  };

  const [lang, setLang] = useState<Language>('si');
  const t = translations[lang];

  const [routeOpen, setRouteOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % t.bannerReady.length);
    }, 5000); // Change quote every 5 seconds
    return () => clearInterval(interval);
  }, [t.bannerReady.length]);
  const [submitted, setSubmitted] = useState(false);
  const [submissionCode, setSubmissionCode] = useState('');
  
  // UI State: 'hub' | 'trip' | 'fuel' | 'expenses'
  const [currentStep, setCurrentStep] = useState<'hub' | 'trip' | 'fuel' | 'expenses'>('hub');
  
  // Gamification & Route Master State
  const [fuelPrice, setFuelPrice] = useState<number>(392);
  const [routeTarget, setRouteTarget] = useState<number>(0);
  const [fetchingMaster, setFetchingMaster] = useState(false);
  const [activeRoutes, setActiveRoutes] = useState<any[]>([]);
  const [selectedRouteTarget, setSelectedRouteTarget] = useState<any>(null);
  
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
  const [trip, setTrip] = useState<Trip>(() => {
    const saved = loadState('current_trip', null);
    if (saved) return saved;
    const completed = loadState('completedTrips', []);
    const lastCompleted = completed.length > 0 ? completed[completed.length - 1] : null;
    return {
      id: '1', startOdo: lastCompleted?.endOdometer || '', endOdo: '',
      income: { callBooking: '', agentBooking: '', busCollection: '', magiyaCollection: '', luggage: '', miscIncome: '' }
    };
  });

  // Expenses State
  const [expenses, setExpenses] = useState<Record<string, string>>(() => loadState('expenses', {}));
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  // Fuel Details State
  const getCurrentTime = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const [fuelDetails, setFuelDetails] = useState<any>(() => loadState('fuelDetails', {
    time: getCurrentTime(), odometer: '', liters: '', paymentMethod: ''
  }));

  const [completedTrips, setCompletedTrips] = useState<{tripNumber: number, total: number, time: string, endOdometer?: string}[]>(() => loadState('completedTrips', []));
  const [maxTrips, setMaxTrips] = useState(() => loadState('maxTrips', 4));
  const [overrideRequested, setOverrideRequested] = useState(() => loadState('overrideRequested', false));
  const [submittedCategories, setSubmittedCategories] = useState<{trip: boolean, fuel: boolean, expenses: boolean}>(() => loadState('submitted_categories', { trip: false, fuel: false, expenses: false }));
  const [submittedAmounts, setSubmittedAmounts] = useState<{tripTotal: number, fuelTotal: number, expenseTotal: number}>(() => loadState('submitted_amounts', { tripTotal: 0, fuelTotal: 0, expenseTotal: 0 }));

  // Auto-save Effect
  useEffect(() => {
    if (!submitted) {
      localStorage.setItem('conductor_form_global', JSON.stringify(formData));
      localStorage.setItem('conductor_form_current_trip', JSON.stringify(trip));
      localStorage.setItem('conductor_form_expenses', JSON.stringify(expenses));
      localStorage.setItem('conductor_form_fuelDetails', JSON.stringify(fuelDetails));
      localStorage.setItem('conductor_form_completedTrips', JSON.stringify(completedTrips));
      localStorage.setItem('conductor_form_maxTrips', JSON.stringify(maxTrips));
      localStorage.setItem('conductor_form_overrideRequested', JSON.stringify(overrideRequested));
      localStorage.setItem('conductor_form_submitted_categories', JSON.stringify(submittedCategories));
      localStorage.setItem('conductor_form_submitted_amounts', JSON.stringify(submittedAmounts));
    }
  }, [formData, trip, expenses, fuelDetails, completedTrips, maxTrips, overrideRequested, submitted, submittedCategories, submittedAmounts]);

  // Reusable function to clear all form data (used by 24-hour refresh and manual "New Sheet")
  const clearAllFormData = (showToastMsg = true) => {
    localStorage.removeItem('conductor_form_global');
    localStorage.removeItem('conductor_form_current_trip');
    localStorage.removeItem('conductor_form_expenses');
    localStorage.removeItem('conductor_form_fuelDetails');
    localStorage.removeItem('conductor_form_completedTrips');
    localStorage.removeItem('conductor_form_maxTrips');
    localStorage.removeItem('conductor_form_overrideRequested');
    localStorage.removeItem('conductor_form_submitted_categories');
    localStorage.removeItem('conductor_form_submitted_amounts');
    setFormData({ driverName: '', conductorName: crewMember?.staff_name || '', busNumber: '', routeName: '', tripDate: new Date().toISOString().split('T')[0] });
    setCompletedTrips([]);
    setExpenses({});
    setFuelDetails({ time: getCurrentTime(), odometer: '', liters: '', paymentMethod: '' });
    setCurrentTripNumber(1);
    setMaxTrips(4);
    setOverrideRequested(false);
    setSubmittedCategories({ trip: false, fuel: false, expenses: false });
    setSubmittedAmounts({ tripTotal: 0, fuelTotal: 0, expenseTotal: 0 });
    setTrip({ id: Date.now().toString(), startOdo: '', endOdo: '', income: { callBooking: '', agentBooking: '', busCollection: '', magiyaCollection: '', luggage: '', miscIncome: '' } });
    localStorage.setItem('conductor_form_session_start', Date.now().toString());
    localStorage.setItem('conductor_form_session_date', new Date().toISOString().split('T')[0]);
    if (showToastMsg) {
      toast({ title: '🔄 New Day, Fresh Sheet!', description: 'Previous data cleared. Start your new day\'s entries.' });
    }
  };

  // 24-Hour Auto-Refresh: Clear form if session expired or new calendar day
  useEffect(() => {
    const sessionStart = localStorage.getItem('conductor_form_session_start');
    const today = new Date().toISOString().split('T')[0];
    if (sessionStart) {
      const elapsed = Date.now() - parseInt(sessionStart);
      const hoursElapsed = elapsed / (1000 * 60 * 60);
      const storedDate = localStorage.getItem('conductor_form_session_date');
      if (hoursElapsed >= 24 || (storedDate && storedDate !== today)) {
        clearAllFormData(true);
      }
    } else {
      localStorage.setItem('conductor_form_session_start', Date.now().toString());
      localStorage.setItem('conductor_form_session_date', today);
    }
  }, []);

  // QR Code URL Parameter Parsing
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const busParam = params.get('bus');
      if (busParam && !formData.busNumber) {
        setFormData(prev => ({ ...prev, busNumber: busParam.toUpperCase() }));
      }
    } catch (e) {
      console.log('Error parsing URL params', e);
    }
  }, []);

  // Auto-fill from Authenticated Crew Session (name + bus)
  useEffect(() => {
    if (crewMember) {
      const updates: any = {};
      if (crewMember.staff_name && formData.conductorName !== crewMember.staff_name) {
        updates.conductorName = crewMember.staff_name;
      }
      if (crewMember.assigned_bus && !formData.busNumber) {
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

  // Bus Assignment Auto-Fill Logic (Debounced)
  useEffect(() => {
    const bus = formData.busNumber;
    if (!bus || bus.length < 7) {
      setFetchingAssignment(false);
      return;
    }
    const fetchKey = `${bus}_${formData.tripDate}`;
    if (fetchKey === lastFetchedBusRef.current) return;
    
    // Show loading immediately
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
          const hasConductor = assignment.conductor_name && assignment.conductor_name.trim().length > 0;
          
          if (hasDriver || hasConductor || hasRoute) {
             setFormData(prev => ({ 
               ...prev, 
               routeName: hasRoute ? assignment.route_name : prev.routeName,
               driverName: hasDriver ? assignment.driver_name : prev.driverName,
               conductorName: hasConductor ? assignment.conductor_name : prev.conductorName
             }));
             
             // Lock route if auto-filled, require confirmation
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
             if (allocated > 0) {
                 setMaxTrips(allocated);
             } else {
                 setMaxTrips(4);
             }
             
             toast({
               title: "Assignment Loaded",
               description: `Route: ${hasRoute ? assignment.route_name : 'N/A'} | Trips: ${allocated > 0 ? allocated : 4}`,
             });
          } else {
            setRouteAutoFilled(false);
          }
        }
      } catch (e) {
        console.log('[BUS-ASSIGN] Error:', e);
      } finally {
        setFetchingAssignment(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchAssignment();
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [formData.busNumber, formData.tripDate]);

  // Fetch official routes and targets
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

  // Update selected route config when routeName changes
  useEffect(() => {
    if (formData.routeName && activeRoutes.length > 0) {
      const match = activeRoutes.find(r => r.route_name === formData.routeName);
      setSelectedRouteTarget(match || null);
    } else {
      setSelectedRouteTarget(null);
    }
  }, [formData.routeName, activeRoutes]);

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

  const handleDeleteTrip = (tripNumber: number) => {
    if (window.confirm(`Are you sure you want to delete Trip ${tripNumber}? You will need to re-enter it.`)) {
      const newCompleted = completedTrips.filter(t => t.tripNumber !== tripNumber);
      setCompletedTrips(newCompleted);
      localStorage.setItem('conductor_form_completedTrips', JSON.stringify(newCompleted));
      // Try to keep currentTripNumber sequential if we delete the latest one
      if (tripNumber === currentTripNumber - 1) {
        setCurrentTripNumber(tripNumber);
      }
    }
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
    if (routeAutoFilled && !routeConfirmed) {
      toast({
        title: "Confirm Route",
        description: "Please confirm or change the suggested route before proceeding.",
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
      
      // -- DUPLICATE & 0 LKR SUBMISSION CHECK --
      const { data: existingSubs } = await supabasePublic
        .from('conductor_submissions')
        .select('ocr_data, created_at')
        .eq('bus_number', formData.busNumber)
        .eq('trip_date', formData.tripDate)
        .order('created_at', { ascending: false })
        .limit(10);

      if (existingSubs && existingSubs.length > 0) {
        let isDuplicate = false;
        
        for (const sub of existingSubs) {
          const ocr = sub.ocr_data;
          if (ocr?.submission_type !== submissionType) continue;

          if (submissionType === 'trip_revenue') {
             // Check if same exact total income, especially 0
             if (ocr.total_income === specificData.total_income) {
               isDuplicate = true; break;
             }
          } else if (submissionType === 'expenses') {
             if (ocr.expenses?.total === specificData.expenses?.total) {
               isDuplicate = true; break;
             }
          } else if (submissionType === 'fuel') {
             if (ocr.fuel_details?.liters === specificData.fuel_details?.liters && ocr.fuel_details?.odometer === specificData.fuel_details?.odometer) {
               isDuplicate = true; break;
             }
          }
        }

        if (isDuplicate) {
          // Pause loading so the confirm dialog doesn't look weird
          setLoading(false);
          const isZero = (submissionType === 'trip_revenue' && specificData.total_income === 0) || 
                         (submissionType === 'expenses' && specificData.expenses?.total === 0);
          
          const msg = isZero 
            ? `⚠️ WARNING: You already submitted a 0 (Zero) amount for ${formData.busNumber} today.\n\nAre you sure you want to submit ANOTHER 0 amount?`
            : `⚠️ WARNING: You already submitted the exact same values for ${formData.busNumber} today.\n\nAre you sure you want to submit a duplicate?`;
            
          const confirmed = window.confirm(msg);
          if (!confirmed) {
            return; // Abort submission
          }
          setLoading(true); // Resume loading if they confirmed
        }
      }
      // -- END CHECK --

      const structuredData = {
        driver_name: formData.driverName,
        conductor_name: formData.conductorName,
        bus_number: formData.busNumber,
        route_name: formData.routeName,
        trip_date: formData.tripDate,
        submission_type: submissionType, // Tells backoffice what this payload contains
        data_entry_method: 'hub_spoke_v3',
        expected_targets: selectedRouteTarget || null,
        calculated_commission: submissionType === 'trip_revenue' ? (selectedRouteTarget ? (calculateTripTotal(specificData?.trips?.[0]?.income) * (selectedRouteTarget.conductor_commission_percent / 100)) : 0) : 0,
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
          submission_code: '',
          applied_to_trip_id: scheduledTripId
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
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          endOdometer: trip.endOdo
        }];
        setCompletedTrips(newCompleted);
        localStorage.setItem('conductor_form_completedTrips', JSON.stringify(newCompleted));

        localStorage.removeItem('conductor_form_current_trip');
        setCurrentTripNumber(prev => prev + 1); // Increment trip number for next time
        setTrip({ id: Date.now().toString(), startOdo: trip.endOdo, endOdo: '', income: { callBooking: '', agentBooking: '', busCollection: '', magiyaCollection: '', luggage: '', miscIncome: '' } });
      } else if (submissionType === 'fuel') {
        localStorage.removeItem('conductor_form_fuelDetails');
      } else if (submissionType === 'expenses') {
        localStorage.removeItem('conductor_form_expenses');
      }

      // Track submitted categories to prevent re-submission
      const catKey = submissionType === 'trip_revenue' ? 'trip' : submissionType;
      if (submissionType === 'fuel') {
        setSubmittedCategories(prev => ({ ...prev, fuel: true }));
        setSubmittedAmounts(prev => ({ ...prev, fuelTotal: parseFloat(expenses['fuel_cost']) || 0 }));
      } else if (submissionType === 'expenses') {
        setSubmittedCategories(prev => ({ ...prev, expenses: true }));
        setSubmittedAmounts(prev => ({ ...prev, expenseTotal: totalExpenses }));
      } else if (submissionType === 'trip_revenue') {
        setSubmittedAmounts(prev => ({ ...prev, tripTotal: prev.tripTotal + totalIncome }));
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

    // NEXT LEVEL VALIDATION: Block empty or unrealistically low trip submissions
    if (totalIncome < 500) {
      toast({
        title: "Invalid Revenue Amount",
        description: "Trip revenue cannot be less than Rs. 500. Please enter the correct collections before submitting.",
        variant: "destructive"
      });
      return;
    }

    submitPartialPayload('trip_revenue', {
      trips: [{
        trip_number: currentTripNumber,
        income: {
          call_booking: parseFloat(trip.income.callBooking) || 0,
          agent_booking: parseFloat(trip.income.agentBooking) || 0,
          bus_collection: parseFloat(trip.income.busCollection) || 0,
          magiya_collection: parseFloat(trip.income.magiyaCollection) || 0,
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
    
    const liters = parseFloat(fuelDetails.liters) || 0;
    if (liters <= 0) {
      toast({
        title: "Invalid Fuel Details",
        description: "Please enter a valid amount of liters before submitting.",
        variant: "destructive"
      });
      return;
    }

    submitPartialPayload('fuel', {
      fuel_details: {
        time: fuelDetails.time,
        odometer: fuelDetails.odometer,
        liters: liters,
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
    
    if (totalExpenses <= 0) {
      toast({
        title: "Empty Expenses",
        description: "Please enter at least one expense amount before submitting.",
        variant: "destructive"
      });
      return;
    }

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Confetti/Sparkles effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-blue-900">
           <div className="absolute top-10 left-10 animate-bounce delay-100"><Sparkles className="w-12 h-12 text-yellow-400 opacity-50" /></div>
           <div className="absolute top-20 right-20 animate-pulse delay-300"><Sparkles className="w-8 h-8 text-emerald-400 opacity-50" /></div>
           <div className="absolute bottom-20 left-1/4 animate-bounce delay-500"><Sparkles className="w-10 h-10 text-blue-400 opacity-50" /></div>
           <div className="absolute bottom-10 right-1/3 animate-pulse delay-700"><Sparkles className="w-16 h-16 text-purple-400 opacity-30" /></div>
        </div>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card className="w-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm rounded-[2rem]">
            <CardHeader className="text-center pt-10">
              <div className="mx-auto w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <PartyPopper className="h-12 w-12 text-emerald-600 animate-pulse" />
              </div>
              <CardTitle className="text-3xl font-black text-slate-800 tracking-tight">{t.successTitle}</CardTitle>
              <CardDescription className="text-lg mt-2 text-slate-600 font-medium">{t.successDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-10">
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-8 text-center shadow-inner">
                <p className="text-sm text-emerald-800 mb-3 font-bold tracking-widest uppercase">{t.trackingCode}</p>
                <p className="text-4xl font-black font-mono text-emerald-600 tracking-wider">{submissionCode}</p>
              </div>
              <Button onClick={resetForm} className="w-full h-14 text-lg font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-transform active:scale-95">
                {t.submitAnother}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
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
                  NCG LIFE
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
                        <Input 
                          type="date" 
                          value={formData.tripDate} 
                          onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })} 
                          required 
                          disabled={fetchingAssignment}
                          className={`bg-slate-50 border-slate-200 focus-visible:ring-blue-500 transition-all ${fetchingAssignment ? 'opacity-50' : ''}`} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t.busNumber}</Label>
                        <AutocompleteInput 
                          value={formData.busNumber} 
                          onChange={(v) => {
                            // Clear route when bus number changes so RPC can fetch the correct one
                            setFormData(prev => ({ ...prev, busNumber: v, routeName: v !== prev.busNumber ? '' : prev.routeName }));
                            lastFetchedBusRef.current = ''; // Reset so RPC re-fetches for new bus
                            setRouteAutoFilled(false); // Unlock route for new bus
                            setRouteConfirmed(false);
                          }} 
                          options={history.buses || []} 
                          placeholder="ND-1234" 
                          uppercase={true} 
                          autoFormat="bus"
                          icon={<Bus className="w-4 h-4" />}
                          disabled={fetchingAssignment}
                        />
                      </div>
                      <div className="space-y-2 col-span-2 relative">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
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
                          <div className="flex items-center gap-2 h-10 px-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm font-semibold text-emerald-800">
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
                                className={`w-full h-10 px-3 justify-between bg-white border-slate-200 focus:ring-blue-500 rounded-md shadow-sm ${!formData.routeName ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'}`}
                              >
                                <div className="flex items-center truncate">
                                  <Route className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                                  <span className="truncate">{formData.routeName || (lang === 'si' ? 'මාර්ගය තෝරන්න' : 'Select Route')}</span>
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
                          {completedTrips.length} / {maxTrips} {completedTrips.length === 1 ? 'Trip' : 'Trips'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {completedTrips.map(ct => (
                          <div key={ct.tripNumber} className="flex justify-between items-center bg-white p-3 rounded-xl border border-emerald-100/50 text-sm text-slate-600 shadow-sm">
                            <span className="font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Trip {ct.tripNumber}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400">{ct.time}</span>
                              <span className="font-black text-emerald-700">Rs. {ct.total.toFixed(2)}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full" onClick={() => handleDeleteTrip(ct.tripNumber)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {completedTrips.length >= maxTrips && !overrideRequested && (
                        <Button 
                          variant="outline" 
                          className="w-full mt-2 text-orange-600 border-orange-200 hover:bg-orange-50 text-xs font-bold"
                          onClick={async () => {
                            if (window.confirm("Are you sure you ran an extra trip today? This will send an override request to your Group Leader.")) {
                              setOverrideRequested(true);
                              setMaxTrips(prev => prev + 1);
                              toast({ title: "Override Requested", description: "You can now add an extra trip." });
                              
                              try {
                                const supabasePublic = createAnonymousClient();
                                await supabasePublic.from('conductor_submissions').insert({
                                  conductor_name: formData.conductorName || 'Unknown',
                                  conductor_phone: 'N/A',
                                  bus_number: formData.busNumber,
                                  trip_date: formData.tripDate,
                                  image_url: 'override_request',
                                  status: 'pending',
                                  ocr_data: {
                                    submission_type: 'override_request',
                                    message: `Requested extra trip (Trip ${maxTrips + 1})`,
                                    route_name: formData.routeName
                                  }
                                });
                              } catch (e) {
                                console.error('Failed to notify group leader:', e);
                              }
                            }
                          }}
                        >
                          Request Extra Trip (Override)
                        </Button>
                      )}
                      {overrideRequested && (
                        <div className="text-center text-xs text-orange-600 font-bold bg-orange-100/50 rounded-lg p-2 mt-2 border border-orange-200">
                          Override Active - Group Leader Notified
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hub Actions */}
                  {fetchingAssignment && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm animate-pulse">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-blue-700">Syncing route data...</p>
                        <p className="text-[10px] text-blue-500">Please wait — loading your bus assignment details</p>
                      </div>
                    </div>
                  )}
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                    className={`space-y-3 ${fetchingAssignment ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <motion.button 
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { 
                        if (!validateGlobalFields()) return; 
                        if (completedTrips.length >= maxTrips) {
                          toast({
                            title: "Trip Limit Reached",
                            description: `You have completed your allocated ${maxTrips} trips for today. Request an override if you ran extra.`,
                            variant: "destructive"
                          });
                          return;
                        }
                        setCurrentStep('trip'); 
                      }}
                      className={`w-full bg-white p-5 rounded-[1.5rem] border shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between transition-all group ${completedTrips.length >= maxTrips ? 'opacity-50 cursor-not-allowed border-slate-100' : 'border-slate-100 hover:border-emerald-200 hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <Bus className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <h4 className={`font-bold text-lg ${completedTrips.length >= maxTrips ? 'text-slate-400' : 'text-slate-800'}`}>{lang === 'si' ? 'ගමන් ආදායම්' : t.income}</h4>
                          <p className="text-xs text-slate-500 font-medium">{completedTrips.length >= maxTrips ? 'Trip allocation completed' : 'Submit revenue trip by trip'}</p>
                        </div>
                      </div>
                      <Navigation className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors transform group-hover:translate-x-1" />
                    </motion.button>

                    <motion.button 
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { 
                        if (submittedCategories.fuel) {
                          toast({ title: 'Already Submitted', description: 'Fuel details already submitted for today. Start a new sheet if needed.', variant: 'destructive' });
                          return;
                        }
                        if (validateGlobalFields()) setCurrentStep('fuel'); 
                      }}
                      className={`w-full p-5 rounded-[1.5rem] border shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between transition-all group ${submittedCategories.fuel ? 'bg-orange-50 border-orange-200 opacity-70 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-orange-200 hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${submittedCategories.fuel ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'}`}>
                          {submittedCategories.fuel ? <CheckCircle className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
                        </div>
                        <div className="text-left">
                          <h4 className={`font-bold text-lg ${submittedCategories.fuel ? 'text-orange-700' : 'text-slate-800'}`}>{lang === 'si' ? 'ඉන්ධන' : 'Fuel Details'}</h4>
                          <p className="text-xs font-medium text-slate-500">
                            {submittedCategories.fuel ? `✅ Submitted — Rs. ${submittedAmounts.fuelTotal.toFixed(2)}` : 'Record diesel and pumping details'}
                          </p>
                        </div>
                      </div>
                      <Navigation className={`w-5 h-5 transition-colors transform group-hover:translate-x-1 ${submittedCategories.fuel ? 'text-orange-400' : 'text-slate-300 group-hover:text-orange-500'}`} />
                    </motion.button>

                    <motion.button 
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { 
                        if (submittedCategories.expenses) {
                          toast({ title: 'Already Submitted', description: 'Expenses already submitted for today. Start a new sheet if needed.', variant: 'destructive' });
                          return;
                        }
                        if (validateGlobalFields()) setCurrentStep('expenses'); 
                      }}
                      className={`w-full p-5 rounded-[1.5rem] border shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between transition-all group ${submittedCategories.expenses ? 'bg-rose-50 border-rose-200 opacity-70 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-rose-200 hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${submittedCategories.expenses ? 'bg-rose-100 text-rose-600' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
                          {submittedCategories.expenses ? <CheckCircle className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                        </div>
                        <div className="text-left">
                          <h4 className={`font-bold text-lg ${submittedCategories.expenses ? 'text-rose-700' : 'text-slate-800'}`}>{lang === 'si' ? 'වියදම්' : t.expenses}</h4>
                          <p className="text-xs font-medium text-slate-500">
                            {submittedCategories.expenses ? `✅ Submitted — Rs. ${submittedAmounts.expenseTotal.toFixed(2)}` : 'Record daily operational costs'}
                          </p>
                        </div>
                      </div>
                      <Navigation className={`w-5 h-5 transition-colors transform group-hover:translate-x-1 ${submittedCategories.expenses ? 'text-rose-400' : 'text-slate-300 group-hover:text-rose-500'}`} />
                    </motion.button>

                  </motion.div>

                  {/* Cash Settlement Dashboard */}
                  {(submittedCategories.trip || submittedCategories.fuel || submittedCategories.expenses) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[1.5rem] p-5 shadow-sm mt-6 mb-2"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                        <h3 className="font-bold text-slate-800 text-lg">Cash Settlement (මුදල් පියවීම)</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                          <span>Total Cash Collected (ආදායම)</span>
                          <span className="text-emerald-600">Rs. {(submittedAmounts.tripTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                          <span>Less: Total Expenses (වියදම්)</span>
                          <span className="text-rose-600">- Rs. {(submittedAmounts.expenseTotal || 0).toFixed(2)}</span>
                        </div>
                        {(fuelDetails.paymentMethod === 'card' && submittedCategories.expenses) && (
                          <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                            <span>Add: Fuel Paid by Card (කාඩ්පත් ගෙවීම්)</span>
                            <span className="text-blue-600">+ Rs. {(parseFloat(expenses['fuel_cost']) || 0).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="pt-3 border-t border-blue-200 flex justify-between items-center">
                          <span className="font-black text-slate-800 text-base">Net Cash to Settle</span>
                          <span className="font-black text-blue-700 text-xl">
                            Rs. {((submittedAmounts.tripTotal || 0) - ((submittedAmounts.expenseTotal || 0) - (fuelDetails.paymentMethod === 'card' && submittedCategories.expenses ? (parseFloat(expenses['fuel_cost']) || 0) : 0))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Start New Sheet Button */}
                  <div className="flex justify-center pt-4 pb-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to start a new sheet? This will clear your current local data so you can enter a new bus or date.")) {
                          clearAllFormData();
                          toast({ title: "New Sheet Started", description: "You can now enter data for a new bus or date." });
                        }
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold underline"
                    >
                      Refresh / Start New Data Sheet
                    </Button>
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
                  {/* Gamification / Guidance Message */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg mb-1">
                          {completedTrips.length === 0 ? t.bannerReady[quoteIndex] : 
                           completedTrips.length >= maxTrips ? t.bannerDone : 
                           t.bannerKeepUp}
                        </h3>
                        <p className="text-emerald-50 text-sm font-medium">
                          {completedTrips.length >= maxTrips 
                            ? t.bannerCompleted 
                            : t.bannerRemaining.replace('{remaining}', (maxTrips - completedTrips.length).toString())}
                        </p>
                      </div>
                      <div className="bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm text-center">
                        <span className="block text-2xl font-black leading-none">{completedTrips.length}/{maxTrips}</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitTrip} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-emerald-50/50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                        <h3 className="font-bold text-slate-800">{t.tripTitle} {currentTripNumber}</h3>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Income Fields */}
                      <div className="space-y-5">
                        {/* Passenger Collections - Creative Design */}
                        <div className="space-y-2 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-xl p-4 border border-amber-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                          <div className="relative z-10">
                            <div className="flex flex-col items-start mb-3 pb-3 border-b border-amber-200/60">
                              <div className="flex justify-between items-center w-full">
                                <h4 className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent pb-1" 
                                    style={{ 
                                      fontFamily: lang === 'si' ? "'Abhaya Libre', serif" : lang === 'ta' ? "'Kavivanar', cursive" : "'Caveat', cursive", 
                                      letterSpacing: lang === 'en' ? '0.5px' : 'normal',
                                      lineHeight: '1.2'
                                    }}>
                                  {lang === 'si' ? 'මගී ප්‍රවේශපත්‍ර ආදායම' : lang === 'ta' ? 'பயணிகள் பயணச்சீட்டு வருமானம்' : 'Passenger Ticket Income'}
                                </h4>
                                <span className="text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 rounded-md text-white shadow-sm whitespace-nowrap ml-2">
                                  Rs. {((parseFloat(trip.income?.busCollection) || 0) + (parseFloat(trip.income?.callBooking) || 0) + (parseFloat(trip.income?.agentBooking) || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              {[
                                { key: 'busCollection', labelSi: 'බස් රථයේ එකතු කිරීම', labelTa: 'பஸ் சேகரிப்பு', labelEn: 'Bus Collection' },
                                { key: 'callBooking', labelSi: 'දුරකථන වෙන්කිරීම්', labelTa: 'தொலைபேசி முன்பதிவு', labelEn: 'Call Booking' },
                                { key: 'agentBooking', labelSi: 'නියෝජිත වෙන්කිරීම්', labelTa: 'முகவர் முன்பதிவு', labelEn: 'Agent Booking' },
                              ].map(inc => (
                                <div key={inc.key} className="flex items-center justify-between py-2 border-b border-amber-100/50 last:border-0">
                                  <div className="flex flex-col">
                                    <Label className="text-[20px] font-bold text-amber-900" 
                                           style={{ fontFamily: lang === 'si' ? "'Abhaya Libre', serif" : lang === 'ta' ? "'Kavivanar', cursive" : "'Caveat', cursive" }}>
                                      {lang === 'si' ? inc.labelSi : lang === 'ta' ? inc.labelTa : inc.labelEn}
                                    </Label>
                                    {lang !== 'en' && <span className="text-[10px] font-semibold text-amber-600/70 uppercase tracking-wider">{inc.labelEn}</span>}
                                  </div>
                                  <div className="relative w-32">
                                    <Input 
                                      type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
                                      className="h-10 text-right font-bold text-amber-950 bg-white/80 focus-visible:ring-amber-500 border-amber-200 shadow-sm" 
                                      value={trip.income?.[inc.key as keyof typeof trip.income] || ''} 
                                      onChange={(e) => updateTripIncome(inc.key, e.target.value)} 
                                      onFocus={(e) => e.target.select()}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Magiya Collection - Orange Section */}
                        <div className="space-y-2 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-xl p-4 border border-orange-300 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                          <div className="relative z-10">
                            <div className="flex flex-col items-start mb-3 pb-3 border-b border-orange-200/60">
                              <div className="flex justify-between items-center w-full">
                                <h4 className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent pb-1"
                                    style={{ 
                                      fontFamily: lang === 'si' ? "'Abhaya Libre', serif" : lang === 'ta' ? "'Kavivanar', cursive" : "'Caveat', cursive", 
                                      letterSpacing: lang === 'en' ? '0.5px' : 'normal',
                                      lineHeight: '1.2'
                                    }}>
                                  {lang === 'si' ? 'මගිය එකතුව' : lang === 'ta' ? 'மகியா சேகரிப்பு' : 'Magiya Collection'}
                                </h4>
                                <span className="text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 rounded-md text-white shadow-sm whitespace-nowrap ml-2">
                                  Rs. {(parseFloat(trip.income?.magiyaCollection) || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between py-2">
                                <div className="flex flex-col">
                                  <Label className="text-[20px] font-bold text-orange-900"
                                         style={{ fontFamily: lang === 'si' ? "'Abhaya Libre', serif" : lang === 'ta' ? "'Kavivanar', cursive" : "'Caveat', cursive" }}>
                                    {lang === 'si' ? 'මගිය එකතුව' : lang === 'ta' ? 'மகியா சேகரிப்பு' : 'Magiya Collection'}
                                  </Label>
                                  {lang !== 'en' && <span className="text-[10px] font-semibold text-orange-600/70 uppercase tracking-wider">Magiya Collection</span>}
                                </div>
                                <div className="relative w-32">
                                  <Input 
                                    type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
                                    className="h-10 text-right font-bold text-orange-950 bg-white/80 focus-visible:ring-orange-500 border-orange-200 shadow-sm" 
                                    value={trip.income?.magiyaCollection || ''} 
                                    onChange={(e) => updateTripIncome('magiyaCollection', e.target.value)} 
                                    onFocus={(e) => e.target.select()}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Other Income (Separated) - Creative Design */}
                        <div className="space-y-2 bg-gradient-to-br from-fuchsia-50 to-purple-50/50 rounded-xl p-4 border border-fuchsia-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-200/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                          <div className="relative z-10">
                            <div className="flex flex-col items-start mb-3 pb-3 border-b border-fuchsia-200/60">
                              <div className="flex justify-between items-center w-full">
                                <h4 className="text-3xl font-black bg-gradient-to-r from-fuchsia-600 to-purple-500 bg-clip-text text-transparent pb-1"
                                    style={{ 
                                      fontFamily: lang === 'si' ? "'Abhaya Libre', serif" : lang === 'ta' ? "'Kavivanar', cursive" : "'Caveat', cursive", 
                                      letterSpacing: lang === 'en' ? '0.5px' : 'normal',
                                      lineHeight: '1.2'
                                    }}>
                                  {lang === 'si' ? 'වෙනත් ආදායම්' : lang === 'ta' ? 'பிற வருமானங்கள்' : 'Other Income'}
                                </h4>
                                <span className="text-sm font-bold bg-gradient-to-r from-fuchsia-500 to-purple-500 px-2.5 py-1 rounded-md text-white shadow-sm whitespace-nowrap ml-2">
                                  Rs. {((parseFloat(trip.income?.luggage) || 0) + (parseFloat(trip.income?.miscIncome) || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              {[
                                { key: 'luggage', labelSi: 'ගමන් මලු ආදායම', labelTa: 'சாமான்கள் வருமானம்', labelEn: 'Luggage Income' },
                                { key: 'miscIncome', labelSi: 'විවිධ ආදායම්', labelTa: 'இதர வருமானம்', labelEn: 'Miscellaneous Income' },
                              ].map(inc => (
                                <div key={inc.key} className="flex items-center justify-between py-2 border-b border-fuchsia-100/50 last:border-0">
                                  <div className="flex flex-col">
                                    <Label className="text-[20px] font-bold text-fuchsia-900"
                                           style={{ fontFamily: lang === 'si' ? "'Abhaya Libre', serif" : lang === 'ta' ? "'Kavivanar', cursive" : "'Caveat', cursive" }}>
                                      {lang === 'si' ? inc.labelSi : lang === 'ta' ? inc.labelTa : inc.labelEn}
                                    </Label>
                                    {lang !== 'en' && <span className="text-[10px] font-semibold text-fuchsia-600/70 uppercase tracking-wider">{inc.labelEn}</span>}
                                  </div>
                                  <div className="relative w-32">
                                    <Input 
                                      type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
                                      className="h-10 text-right font-bold text-fuchsia-950 bg-white/80 focus-visible:ring-fuchsia-500 border-fuchsia-200 shadow-sm" 
                                      value={trip.income?.[inc.key as keyof typeof trip.income] || ''} 
                                      onChange={(e) => updateTripIncome(inc.key, e.target.value)} 
                                      onFocus={(e) => e.target.select()}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-fuchsia-500/80 leading-tight pt-2 font-medium">
                              * Income from luggage and miscellaneous items are tracked separately.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-slate-500 uppercase">Total Passenger Revenue</span>
                          <span className="text-sm font-bold text-slate-700">Rs. {((parseFloat(trip.income?.busCollection) || 0) + (parseFloat(trip.income?.callBooking) || 0) + (parseFloat(trip.income?.agentBooking) || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-orange-500 uppercase">Magiya Collection</span>
                          <span className="text-sm font-bold text-orange-700">Rs. {(parseFloat(trip.income?.magiyaCollection) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-semibold text-indigo-500 uppercase">Total Other Income</span>
                          <span className="text-sm font-bold text-indigo-700">Rs. {((parseFloat(trip.income?.luggage) || 0) + (parseFloat(trip.income?.miscIncome) || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-3 border-t border-slate-100">
                          <div className="space-y-1">
                            <span className="block font-black text-slate-800 text-sm">Grand Total</span>
                            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Passenger + Magiya + Other Income</span>
                          </div>
                          <span className="font-black text-emerald-600 text-2xl tracking-tight">Rs. {totalIncome.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* NEXT LEVEL: Live Commission Gamification */}
                      {selectedRouteTarget && selectedRouteTarget.conductor_commission_percent > 0 && (
                        <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex justify-between items-center shadow-inner">
                          <span className="font-bold text-emerald-800 text-xs uppercase tracking-wider">Live Commission ({selectedRouteTarget.conductor_commission_percent}%)</span>
                          <span className="font-black text-emerald-700 text-xl drop-shadow-sm">
                            Rs. {(totalIncome * (selectedRouteTarget.conductor_commission_percent / 100)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-xl">💰</span>
                          </span>
                        </div>
                      )}

                      <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md mt-2">
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

                    {/* Step 1: Payment Method MUST be selected first */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">{t.fuelPayment} <span className="text-rose-500">*</span></Label>
                      <Select 
                        value={fuelDetails.paymentMethod || ''} 
                        onValueChange={(val: 'cash'|'card') => setFuelDetails({...fuelDetails, paymentMethod: val})}
                      >
                        <SelectTrigger className={`w-full h-12 rounded-xl transition-all ${fuelDetails.paymentMethod ? 'bg-orange-50 border-orange-200 text-orange-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <SelectValue placeholder="Select Payment Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2"><Banknote className="w-4 h-4 text-orange-600" /> {t.cash}</div>
                          </SelectItem>
                          <SelectItem value="card">
                            <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-orange-600" /> {t.card}</div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Step 2: Show details ONLY after payment method is selected */}
                    {fuelDetails.paymentMethod && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-2"
                      >
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
                        
                        <Button type="submit" disabled={loading} className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md mt-4">
                          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                          {t.submitFuel}
                        </Button>
                      </motion.div>
                    )}
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
                      {EXPENSE_CATEGORIES.filter(c => c.primary || showAllExpenses).map((cat) => {
                        const val = parseFloat(expenses[cat.key]) || 0;
                        // NEXT LEVEL: Expense Guardrails
                        const isOverLimit = cat.key === 'food' && val > 1500;
                        return (
                          <div key={cat.key} className="flex flex-col py-1 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                              <Label className={`text-sm font-semibold truncate mr-2 ${isOverLimit ? 'text-orange-600' : 'text-slate-600'}`}>
                                {lang === 'en' ? cat.en : lang === 'si' ? cat.si : cat.ta}
                              </Label>
                              <div className="relative w-28 shrink-0">
                                <Input 
                                  type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
                                  className={`h-8 text-right font-medium text-sm focus-visible:ring-rose-500 ${isOverLimit ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-rose-50/30 border-rose-100'}`} 
                                  value={expenses[cat.key] || ''} 
                                  onChange={(e) => setExpenses({...expenses, [cat.key]: e.target.value})} 
                                  onFocus={(e) => e.target.select()}
                                />
                              </div>
                            </div>
                            {isOverLimit && (
                              <p className="text-[10px] text-orange-600 font-bold mt-1 text-right tracking-wide">⚠️ EXCEEDS ROUTE LIMIT (1,500)</p>
                            )}
                          </div>
                        );
                      })}
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