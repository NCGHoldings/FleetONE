import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Edit, CheckCircle, Eye, Trash2, Plus, Minus, AlertCircle, AlertTriangle, CalendarIcon, Loader2 } from "lucide-react";
import { SingleTrip, DailyExpenses } from "@/lib/ocr-processor";
import { DB_EXPENSE_CATEGORIES, mapOCRExpensesToDB, DBExpenseFields, KNOWN_OCR_EXPENSE_KEYS } from "@/lib/ocr-expense-mapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, differenceInDays, subDays, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ExtractedMultiTripData {
  fileName: string;
  imageUrl: string;
  busNumber: string;
  date: string;
  confidence: number;
  trips: SingleTrip[];
  daily_expenses: DailyExpenses;
  mapped_expenses?: DBExpenseFields;
}

interface OCRExtractedDataCardProps {
  data: ExtractedMultiTripData;
  actualSaveDate: string; // The date that will be used for saving (YYYY-MM-DD)
  onApply: (data: ExtractedMultiTripData & { mapped_expenses: DBExpenseFields }) => void;
  onDiscard: () => void;
  onView: () => void;
  savedExpensesTotal?: number;
}

export const OCRExtractedDataCard = ({ data, actualSaveDate, onApply, onDiscard, onView, savedExpensesTotal }: OCRExtractedDataCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);
  const [hasEdits, setHasEdits] = useState(false);
  
  // Multi-day route detection
  const [isMultiDayRoute, setIsMultiDayRoute] = useState(false);
  const [multiDayConfig, setMultiDayConfig] = useState<any>(null);
  
  // Manual override for multi-day mode
  const [manualMultiDayEnabled, setManualMultiDayEnabled] = useState(false);
  const [showBusNumberEdit, setShowBusNumberEdit] = useState(false);
  const [availableMultiDayRoutes, setAvailableMultiDayRoutes] = useState<any[]>([]);
  
  // Initialize mapped expenses from OCR data
  const initialMappedExpenses = data.mapped_expenses || mapOCRExpensesToDB(data.daily_expenses);
  const [mappedExpenses, setMappedExpenses] = useState<DBExpenseFields>(() => initialMappedExpenses);
  const [originalMappedExpenses] = useState<DBExpenseFields>(initialMappedExpenses);
  
  // Track unmapped OCR items
  const [unmappedItems, setUnmappedItems] = useState<Record<string, number>>(() => {
    const unmapped: Record<string, number> = {};
    Object.entries(data.daily_expenses).forEach(([key, value]) => {
      if (!KNOWN_OCR_EXPENSE_KEYS.includes(key) && value > 0) {
        unmapped[key] = value;
      }
    });
    return unmapped;
  });

  // Multi-day route: Date range state
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  // Normalize route name to handle different dash characters (en-dash, em-dash, etc.)
  const normalizeRouteName = (name: string | null) => {
    if (!name) return '';
    return name.replace(/[–—−]/g, '-').trim(); // Convert all dash variants to hyphen
  };

  // Load available multi-day routes for manual selection
  useEffect(() => {
    const loadMultiDayRoutes = async () => {
      const { data: routes } = await supabase
        .from('multi_day_route_config')
        .select('*')
        .eq('is_enabled', true)
        .order('route_name');
      
      if (routes) {
        setAvailableMultiDayRoutes(routes);
      }
    };
    
    loadMultiDayRoutes();
  }, []);

  // Helper: Enable multi-day mode manually
  const enableMultiDayMode = async (routeConfig: any) => {
    console.log('🔧 Manual multi-day mode enabled:', routeConfig);
    setIsMultiDayRoute(true);
    setMultiDayConfig(routeConfig);
    
    // Set default date range
    const saveDateObj = parseISO(actualSaveDate);
    const numTrips = editedData.trips.length;
    const startDateObj = subDays(saveDateObj, numTrips - 1);
    
    const defaultStart = format(startDateObj, 'yyyy-MM-dd');
    const defaultEnd = actualSaveDate;
    
    setDateRangeStart(defaultStart);
    setDateRangeEnd(defaultEnd);
    
    // Set individual dates
    const updatedTrips = editedData.trips.map((trip, idx) => ({
      ...trip,
      individualDate: format(addDays(startDateObj, idx), 'yyyy-MM-dd')
    }));
    
    console.log('📅 Multi-day dates assigned:', updatedTrips.map(t => t.individualDate));
    
    setEditedData(prev => ({
      ...prev,
      trips: updatedTrips
    }));

    // Show success message
    toast.success(
      `✅ Multi-day mode enabled for ${routeConfig.route_name}`,
      {
        description: updatedTrips.map((t, idx) => 
          `Trip ${idx + 1} → ${format(parseISO(t.individualDate!), 'MMM d, yyyy')}`
        ).join(' • ')
      }
    );
  };

  // Helper: Re-check multi-day route when bus number changes
  const recheckMultiDayRoute = async (busNumber: string) => {
    try {
      const { data: busData } = await supabase
        .from('buses')
        .select('route, id')
        .eq('bus_no', busNumber)
        .maybeSingle();
      
      if (busData?.route) {
        const normalizedRoute = normalizeRouteName(busData.route);
        const { data } = await supabase
          .from('multi_day_route_config')
          .select('*')
          .eq('is_enabled', true)
          .or(`route_name.ilike.%${normalizedRoute}%,route_pattern.ilike.%${normalizedRoute}%`)
          .maybeSingle();
        
        if (data) {
          console.log('✅ Auto-detected multi-day route after bus correction:', data);
          await enableMultiDayMode(data);
        }
      }
    } catch (error) {
      console.error('Error rechecking route:', error);
    }
  };

  // Check if bus route is configured as multi-day
  useEffect(() => {
    const checkMultiDayRoute = async () => {
      try {
        // Get bus's route and ID
        const { data: busData } = await supabase
          .from('buses')
          .select('route, id')
          .eq('bus_no', data.busNumber)
          .single();

        let multiDayData = null;

        // Try matching by assigned route first
        if (busData?.route) {
          const normalizedRoute = normalizeRouteName(busData.route);
          const { data } = await supabase
            .from('multi_day_route_config')
            .select('*')
            .eq('is_enabled', true)
            .or(`route_name.ilike.%${normalizedRoute}%,route_pattern.ilike.%${normalizedRoute}%`)
            .maybeSingle();
          multiDayData = data;
        }

        // FALLBACK: If no route assigned, check recent trips for this bus
        if (!multiDayData && busData?.id) {
          const { data: recentTrips } = await supabase
            .from('daily_trips')
            .select('route_id, routes:route_id(route_name)')
            .eq('bus_id', busData.id)
            .not('route_id', 'is', null)
            .order('trip_date', { ascending: false })
            .limit(5);
          
          if (recentTrips && recentTrips.length > 0) {
            const mostCommonRoute = recentTrips[0].routes?.route_name;
            if (mostCommonRoute) {
              const normalizedRoute = normalizeRouteName(mostCommonRoute);
              const { data } = await supabase
                .from('multi_day_route_config')
                .select('*')
                .eq('is_enabled', true)
                .or(`route_name.ilike.%${normalizedRoute}%,route_pattern.ilike.%${normalizedRoute}%`)
                .maybeSingle();
              multiDayData = data;
            }
          }
        }

        if (multiDayData) {
          console.log('🎯 Multi-day route detected:', multiDayData);
          setIsMultiDayRoute(true);
          setMultiDayConfig(multiDayData);
          
          // Set default date range based on number of trips
          const saveDateObj = parseISO(actualSaveDate);
          const numTrips = editedData.trips.length;
          const startDateObj = subDays(saveDateObj, numTrips - 1);
          
          const defaultStart = format(startDateObj, 'yyyy-MM-dd');
          const defaultEnd = actualSaveDate;
          
          console.log('📅 Default date range:', { defaultStart, defaultEnd, numTrips });
          
          setDateRangeStart(defaultStart);
          setDateRangeEnd(defaultEnd);
          
          // IMMEDIATELY set individualDate on all trips
          const updatedTrips = editedData.trips.map((trip, idx) => ({
            ...trip,
            individualDate: format(addDays(startDateObj, idx), 'yyyy-MM-dd')
          }));
          
          console.log('🎯 Multi-day dates assigned:', updatedTrips.map(t => t.individualDate));
          
          setEditedData(prev => ({
            ...prev,
            trips: updatedTrips
          }));
        }
      } catch (error) {
        console.error('Error checking multi-day route:', error);
      }
    };

    checkMultiDayRoute();
  }, [data.busNumber, actualSaveDate]);

  // Update trip dates when date range changes - simplified sequential distribution
  useEffect(() => {
    if (isMultiDayRoute && dateRangeStart && dateRangeEnd) {
      const start = parseISO(dateRangeStart);
      const end = parseISO(dateRangeEnd);
      const totalDays = differenceInDays(end, start) + 1;
      
      // Sequential date distribution: Trip 1 → Day 1, Trip 2 → Day 2, etc.
      const updatedTrips = editedData.trips.map((trip, idx) => {
        const dayIndex = Math.min(idx, totalDays - 1); // Cap at last day if more trips than days
        const tripDate = format(addDays(start, dayIndex), 'yyyy-MM-dd');
        return {
          ...trip,
          individualDate: tripDate
        };
      });
      
      setEditedData(prev => ({
        ...prev,
        trips: updatedTrips
      }));
    }
  }, [dateRangeStart, dateRangeEnd, isMultiDayRoute]);

  const getConfidenceBadge = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">High: {percent}%</Badge>;
    if (percent >= 60) return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">Medium: {percent}%</Badge>;
    return <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Low: {percent}%</Badge>;
  };

  const getBorderColor = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) return "border-green-500/30";
    if (percent >= 60) return "border-yellow-500/30";
    return "border-red-500/30";
  };

  // Calculate totals using mapped expenses
  const totalRevenue = editedData.trips.reduce((sum, trip) => {
    return sum + Object.values(trip.income).reduce((s, v) => s + v, 0);
  }, 0);

  const totalExpenses = Object.values(mappedExpenses).reduce((sum, val) => sum + val, 0);
  const netProfit = totalRevenue - totalExpenses;

  const handleMappedExpenseChange = (field: keyof DBExpenseFields, value: number) => {
    setHasEdits(true);
    setMappedExpenses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBusNumberChange = (value: string) => {
    setHasEdits(true);
    const newBusNumber = value.toUpperCase();
    setEditedData(prev => ({
      ...prev,
      busNumber: newBusNumber
    }));
    
    // Auto re-check multi-day route when bus number changes in manual mode
    if (manualMultiDayEnabled && !isMultiDayRoute) {
      recheckMultiDayRoute(newBusNumber);
    }
  };

  const handleTripIncomeChange = (tripIndex: number, field: keyof SingleTrip['income'], value: number) => {
    setHasEdits(true);
    setEditedData(prev => ({
      ...prev,
      trips: prev.trips.map((trip, idx) =>
        idx === tripIndex
          ? { ...trip, income: { ...trip.income, [field]: value } }
          : trip
      )
    }));
  };

  const handleTripDateChange = (tripIndex: number, newDate: Date) => {
    setHasEdits(true);
    setEditedData(prev => ({
      ...prev,
      trips: prev.trips.map((trip, idx) =>
        idx === tripIndex
          ? { ...trip, individualDate: format(newDate, 'yyyy-MM-dd') }
          : trip
      )
    }));
  };

  const handleAllocateUnmapped = (unmappedKey: string, targetCategory: keyof DBExpenseFields) => {
    const amount = unmappedItems[unmappedKey];
    if (amount) {
      // Add to mapped category
      setMappedExpenses(prev => ({
        ...prev,
        [targetCategory]: prev[targetCategory] + amount
      }));
      
      // Remove from unmapped
      setUnmappedItems(prev => {
        const newUnmapped = { ...prev };
        delete newUnmapped[unmappedKey];
        return newUnmapped;
      });
    }
  };

  const handleAddTrip = () => {
    const newTripNo = editedData.trips.length + 1;
    setEditedData(prev => ({
      ...prev,
      trips: [...prev.trips, {
        trip_no: newTripNo,
        income: {
          bus_collection: 0,
          call_booking: 0,
          agent_booking: 0,
          luggage_income: 0,
          special_income: 0,
        }
      }]
    }));
  };

  const handleRemoveTrip = (tripIndex: number) => {
    if (editedData.trips.length > 1) {
      setEditedData(prev => ({
        ...prev,
        trips: prev.trips.filter((_, idx) => idx !== tripIndex)
      }));
    }
  };

  const handleConfirmEdits = () => {
    console.log('✏️ EDITS CONFIRMED - Ready to Apply');
    console.log('  Original mapped expenses:', originalMappedExpenses);
    console.log('  Edited mapped expenses:', mappedExpenses);
    setIsEditing(false);
  };

  const handleResetToOCR = () => {
    console.log('↶ RESET TO OCR VALUES');
    setEditedData(data);
    setMappedExpenses(data.mapped_expenses || mapOCRExpensesToDB(data.daily_expenses));
    setHasEdits(false);
    setIsEditing(false);
  };

  const handleApplyAll = () => {
    console.log('🎯 APPLYING DATA TO DATABASE:');
    console.log('  Bus:', editedData.busNumber, '| Date:', editedData.date);
    console.log('  Original OCR expenses:', data.daily_expenses);
    console.log('  Edited mapped expenses:', mappedExpenses);
    console.log('  Edited trips:', editedData.trips);
    console.log('  Has user edits:', hasEdits);
    
    onApply({ ...editedData, mapped_expenses: mappedExpenses });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const fieldLabels: Record<string, string> = {
    bus_collection: "Bus Collection (බස්රථ)",
    call_booking: "Call Booking (ඇවිලා)",
    agent_booking: "Agent Booking (ඒජන්ට්)",
    luggage_income: "Luggage (ගමන් මල්)",
    special_income: "Special (විශේෂ)",
  };

  // Get bus data for route warning — re-check on edited bus number with debounce
  const [busData, setBusData] = useState<any>(null);
  const [busLookupLoading, setBusLookupLoading] = useState(false);
  const busLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    const busNo = editedData.busNumber?.trim();
    if (!busNo) {
      setBusData(null);
      setBusLookupLoading(false);
      return;
    }
    setBusLookupLoading(true);
    if (busLookupTimer.current) clearTimeout(busLookupTimer.current);
    busLookupTimer.current = setTimeout(async () => {
      const { data: busInfo } = await supabase
        .from('buses')
        .select('route, id, bus_no')
        .ilike('bus_no', busNo.replace(/[-\s]/g, '%'))
        .maybeSingle();
      // If ilike didn't match, try exact
      if (!busInfo) {
        const { data: exact } = await supabase
          .from('buses')
          .select('route, id, bus_no')
          .eq('bus_no', busNo)
          .maybeSingle();
        setBusData(exact);
      } else {
        setBusData(busInfo);
      }
      setBusLookupLoading(false);
    }, 500);
    return () => { if (busLookupTimer.current) clearTimeout(busLookupTimer.current); };
  }, [editedData.busNumber]);

  return (
    <Card className={`mb-4 border-2 ${getBorderColor(data.confidence)}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <img 
                src={data.imageUrl} 
                alt="Trip sheet preview" 
                className="w-16 h-16 object-cover rounded border"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{data.fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🚌</span>
                      <Input
                        type="text"
                        value={editedData.busNumber}
                        onChange={(e) => handleBusNumberChange(e.target.value.toUpperCase())}
                        className="h-8 w-32 text-lg font-bold"
                        placeholder="Bus Number"
                      />
                      {busLookupLoading ? (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" /> Checking...
                        </Badge>
                      ) : editedData.busNumber?.trim() ? (
                        busData ? (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" /> Found{busData.route ? ` (${busData.route})` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
                            <AlertCircle className="h-3 w-3 mr-1" /> Not Found
                          </Badge>
                        )
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">🚌 {editedData.busNumber}</span>
                      {busLookupLoading ? (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" /> Checking...
                        </Badge>
                      ) : editedData.busNumber?.trim() ? (
                        busData ? (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" /> Found{busData.route ? ` (${busData.route})` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
                            <AlertCircle className="h-3 w-3 mr-1" /> Not Found
                          </Badge>
                        )
                      ) : null}
                    </div>
                  )}
                  
                  {/* MULTI-DAY DATE RANGE PREVIEW - COLLAPSED STATE */}
                  {!isOpen && isMultiDayRoute && multiDayConfig && editedData.trips.some(t => t.individualDate) && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      📅 {editedData.trips.map(t => 
                        t.individualDate ? format(parseISO(t.individualDate), 'MMM d') : '?'
                      ).join(', ')}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Sheet: <span className="line-through">{data.date}</span>
                    </span>
                    <span className="text-xs">→</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Save to: {format(parseISO(actualSaveDate), 'MMM d, yyyy')}
                    </span>
                    {(() => {
                      // Check if dates differ significantly
                      try {
                        const ocrDateParts = data.date.split(/[/-]/);
                        if (ocrDateParts.length === 3) {
                          const [first, second, third] = ocrDateParts.map(p => parseInt(p, 10));
                          const ocrYear = third > 99 ? third : 2000 + third;
                          const daysDiff = Math.abs(differenceInDays(
                            parseISO(actualSaveDate),
                            new Date(ocrYear, second - 1, first)
                          ));
                          if (daysDiff > 7) {
                            return (
                              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 text-[10px]">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Date Override
                              </Badge>
                            );
                          }
                        }
                      } catch (e) {
                        // Ignore date parsing errors
                      }
                      return null;
                    })()}
                  </div>
                  {getConfidenceBadge(data.confidence)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span>📊 {data.trips.length} trip{data.trips.length !== 1 ? 's' : ''}</span>
                  {isMultiDayRoute && multiDayConfig && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                      {multiDayConfig.route_name}
                    </Badge>
                  )}
                  <span>💰 Revenue: Rs. {formatAmount(totalRevenue)}</span>
                  <span>💸 Expenses: Rs. {formatAmount(totalExpenses)}</span>
                  <span className={netProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    📈 Net: Rs. {formatAmount(netProfit)}
                  </span>
                  {savedExpensesTotal !== undefined && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-500">
                      ✓ Saved • Rs. {formatAmount(savedExpensesTotal)}
                    </Badge>
                  )}
                </div>
                
                {/* WARNING: No route assigned + Manual Override Button */}
                {!busData?.route && !isMultiDayRoute && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs flex items-center justify-between">
                      <span>⚠️ No route assigned to this bus - Multi-day detection failed</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setManualMultiDayEnabled(true);
                          setShowBusNumberEdit(true);
                          setIsEditing(true);
                          setIsOpen(true);
                        }}
                        className="ml-2 h-7 text-xs"
                      >
                        🔧 Manual Override
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Manual Override Active Badge */}
            {manualMultiDayEnabled && (
              <div className="mb-4">
                <Badge className="bg-orange-500 text-white">
                  🔧 Manual Override Active
                </Badge>
              </div>
            )}

            {/* Enhanced Bus Number Correction - Prominent when manual override */}
            {(showBusNumberEdit || manualMultiDayEnabled) && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                <Label className="text-sm font-semibold mb-2 block">
                  ✏️ Correct Bus Number
                </Label>
                <Input
                  value={editedData.busNumber}
                  onChange={(e) => handleBusNumberChange(e.target.value)}
                  className="h-12 text-xl font-bold"
                  placeholder="e.g., NG 8247"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Update the bus number if OCR captured it incorrectly. The system will auto-detect the multi-day route.
                </p>
              </div>
            )}

            {/* Multi-Day Route Selector - Manual Mode */}
            {manualMultiDayEnabled && !isMultiDayRoute && availableMultiDayRoutes.length > 0 && (
              <Card className="mb-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700">
                <CardContent className="pt-4">
                  <Label className="text-sm font-semibold mb-2 block">
                    📍 Select Multi-Day Route
                  </Label>
                  <Select 
                    onValueChange={(routeId) => {
                      const selectedRoute = availableMultiDayRoutes.find(r => r.id === routeId);
                      if (selectedRoute) {
                        enableMultiDayMode(selectedRoute);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose a multi-day route..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMultiDayRoutes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.route_name} ({route.typical_days_per_trip} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Select the route this bus is operating on to enable multi-day trip distribution
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Image Preview */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Original Sheet</h4>
                <img 
                  src={data.imageUrl} 
                  alt="Full trip sheet" 
                  className="w-full rounded border"
                />
              </div>

              {/* Right: Extracted Data */}
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">📋 Bus {data.busNumber} • {data.date}</p>
                </div>

                {/* Multi-Day Route Date Range Picker */}
                {isMultiDayRoute && multiDayConfig && (
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1" />
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className="font-bold text-sm mb-1">
                              📅 Multi-Day Route Detected: {multiDayConfig.route_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              This route spans multiple days. Select the date range for these {editedData.trips.length} trips.
                            </p>
                          </div>
                          
                          {/* DATE RANGE PICKER */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1">Start Date (Trip 1)</Label>
                              <Input 
                                type="date"
                                value={dateRangeStart}
                                onChange={(e) => setDateRangeStart(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1">End Date (Last Trip)</Label>
                              <Input 
                                type="date"
                                value={dateRangeEnd}
                                onChange={(e) => setDateRangeEnd(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          
                          {/* TRIP DATE MAPPING PREVIEW */}
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <h5 className="font-semibold text-xs mb-2 text-blue-700 dark:text-blue-300">📋 Trip Date Mapping Preview:</h5>
                            <div className="space-y-1">
                              {editedData.trips.map((trip, idx) => {
                                const revenue = Object.values(trip.income).reduce((a, b) => a + b, 0);
                                return (
                                  <div key={idx} className="flex justify-between items-center py-1.5 border-b last:border-0 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">Trip {trip.trip_no}</span>
                                      <span className="text-muted-foreground">(Rs. {formatAmount(revenue)})</span>
                                    </div>
                                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                                      → {trip.individualDate ? format(parseISO(trip.individualDate), 'MMM d, yyyy') : '?'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 italic">
                              💡 Expenses will be saved to the sheet date: {format(parseISO(actualSaveDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Trips Section with Visual Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">📊 TRIP REVENUE (Individual)</h4>
                    {isEditing && (
                      <Button onClick={handleAddTrip} size="sm" variant="outline">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Trip
                      </Button>
                    )}
                  </div>
                  
                  {/* Quick summary of all trips */}
                  {!isEditing && editedData.trips.length > 1 && (
                    <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                      {editedData.trips.map((trip, idx) => {
                        const tripRev = Object.values(trip.income).reduce((s, v) => s + v, 0);
                        return (
                          <span key={idx} className="bg-primary/5 px-2 py-1 rounded">
                            T{trip.trip_no}: Rs. {formatAmount(tripRev)}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {editedData.trips.map((trip, tripIdx) => {
                    const tripRevenue = Object.values(trip.income).reduce((s, v) => s + v, 0);
                    return (
                      <div key={tripIdx} className="p-3 bg-primary/5 rounded-lg border">
                        {/* Per-Trip Date Picker for Multi-Day Routes */}
                        {isMultiDayRoute && trip.individualDate && (
                          <div className="mb-3 pb-3 border-b">
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Trip {trip.trip_no} Date:
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(parseISO(trip.individualDate), 'PPP')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parseISO(trip.individualDate)}
                                  onSelect={(date) => date && handleTripDateChange(tripIdx, date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">Trip {trip.trip_no}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">Rs. {formatAmount(tripRevenue)}</span>
                            {isEditing && editedData.trips.length > 1 && (
                              <Button 
                                onClick={() => handleRemoveTrip(tripIdx)} 
                                size="sm" 
                                variant="ghost"
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          {Object.entries(trip.income).map(([key, value]) => (
                            value > 0 || isEditing ? (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  {fieldLabels[key] || key}:
                                </span>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={value}
                                    onChange={(e) => handleTripIncomeChange(tripIdx, key as keyof SingleTrip['income'], Number(e.target.value))}
                                    className="h-6 w-24 text-xs text-right"
                                  />
                                ) : (
                                  <span className="font-mono">{formatAmount(value)}</span>
                                )}
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Daily Expenses Section with Mapped Categories */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">💸 DAILY EXPENSES (21 Categories)</h4>
                  
                  {/* Unmapped OCR Items */}
                  {Object.keys(unmappedItems).length > 0 && (
                    <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500/50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="space-y-2">
                        <p className="text-xs font-semibold">⚠️ Unmapped OCR Items - Please Allocate:</p>
                        <div className="space-y-2">
                          {Object.entries(unmappedItems).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-semibold min-w-[80px]">
                                Rs. {formatAmount(value)}
                              </span>
                              <span className="text-muted-foreground flex-1">{key}</span>
                              <Select onValueChange={(target) => handleAllocateUnmapped(key, target as keyof DBExpenseFields)}>
                                <SelectTrigger className="h-7 text-xs w-[160px]">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DB_EXPENSE_CATEGORIES.map(cat => (
                                    <SelectItem key={cat.key} value={cat.key} className="text-xs">
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Mapped Expenses (21 DB categories) */}
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <div className="space-y-1 text-xs max-h-[300px] overflow-y-auto">
                      {DB_EXPENSE_CATEGORIES.map(({ key, label }, index) => {
                        const currentValue = mappedExpenses[key as keyof DBExpenseFields];
                        const originalValue = originalMappedExpenses[key as keyof DBExpenseFields];
                        const hasChanged = hasEdits && currentValue !== originalValue;
                        
                        return (currentValue > 0 || isEditing) ? (
                          <div key={key} className={`flex justify-between items-center py-1.5 px-2 rounded-sm ${index % 2 === 0 ? 'bg-muted/40' : ''}`}>
                            <span className="text-muted-foreground">{label}:</span>
                            {isEditing ? (
                              <Input
                                type="number"
                                value={currentValue}
                                onChange={(e) => handleMappedExpenseChange(key as keyof DBExpenseFields, Number(e.target.value))}
                                className="h-6 w-24 text-xs text-right"
                              />
                            ) : (
                              <span className="font-mono flex items-center gap-2">
                                {hasChanged ? (
                                  <>
                                    <span className="text-muted-foreground line-through text-[10px]">
                                      {formatAmount(originalValue)}
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                      → {formatAmount(currentValue)}
                                    </span>
                                  </>
                                ) : (
                                  formatAmount(currentValue)
                                )}
                              </span>
                            )}
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-500/20">
                      <div className="flex justify-between font-semibold text-sm">
                        <span>Total Daily Expenses:</span>
                        <span className="font-mono text-amber-700 dark:text-amber-400">Rs. {formatAmount(totalExpenses)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ℹ️ Applied once per bus per day (not per trip)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Revenue</p>
                      <p className="font-mono font-bold text-lg">Rs. {formatAmount(totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Expenses</p>
                      <p className="font-mono font-bold text-lg">Rs. {formatAmount(totalExpenses)}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-muted-foreground text-sm">Net Profit</p>
                    <p className={`font-mono font-bold text-xl ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Rs. {formatAmount(netProfit)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {isEditing ? (
                    <>
                      <Button 
                        onClick={handleConfirmEdits} 
                        size="sm" 
                        className="flex-1"
                        title="Confirm your edits (does not save to database yet)"
                      >
                        ✓ Confirm Edits
                      </Button>
                      <Button 
                        onClick={handleResetToOCR} 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        title="Reset all values to OCR extracted data"
                      >
                        ↶ Reset to OCR
                      </Button>
                    </>
                  ) : (
                    <>
                      {hasEdits && (
                        <Badge variant="secondary" className="mr-2">
                          ✏️ Edited (Ready to Apply)
                        </Badge>
                      )}
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        onClick={handleApplyAll} 
                        size="sm" 
                        className="flex-1"
                        disabled={Object.keys(unmappedItems).length > 0}
                        title={Object.keys(unmappedItems).length > 0 
                          ? "Please map all unmapped items before applying" 
                          : "Save trips and expenses to database"}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Apply All (Trips + Expenses)
                      </Button>
                      <Button onClick={onView} variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button onClick={onDiscard} variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
