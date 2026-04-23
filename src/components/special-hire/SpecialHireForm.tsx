 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Plus, X, Trash2, Eye, Calculator, Save, Users, TrendingUp, DollarSign, Phone } from 'lucide-react';
import { AddReferralAgentModal } from './AddReferralAgentModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn, safeParseJSON } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { buildSpecialHireQuotationBankSnapshot, SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS } from '@/lib/special-hire-bank-details';
import { CostBreakdown } from './CostBreakdown';
import { CustomerDetailsSection } from './form-sections/CustomerDetailsSection';
import { TripDetailsSection } from './form-sections/TripDetailsSection';
import { AdditionalChargesSection } from './form-sections/AdditionalChargesSection';
import { FinancialSettingsSection } from './form-sections/FinancialSettingsSection';
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';
import { useCustomerBridge } from '@/hooks/useCustomerBridge';

const formSchema = z.object({
  // Customer Details
  companyName: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  specialRequest: z.string().optional(),

  // Trip Details
  busTypeId: z.string().optional(), // Made optional for multi-bus mode
  hireType: z.enum(['Outside', 'Lyceum', 'Internal']),
  numberOfBuses: z.number().min(1, 'At least 1 bus is required'),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  dropLocation: z.string().min(1, 'Drop location is required'),

  numberOfPassengers: z.number().min(1, 'Number of passengers is required'),
  pickupDateTime: z.date(),
  dropDateTime: z.date(),
  parkingLocationId: z.string().min(1, 'Parking location is required'),

  // Commission Settings (company expenses)
  commissionPct: z.number().min(0, 'Commission percentage must be positive').max(100, 'Commission cannot exceed 100%'),
  commissionPassThroughPct: z.number().min(0, 'Pass-through percentage must be positive').max(100, 'Pass-through cannot exceed 100%'),

  // Discount Settings (requires admin approval if > 0)
  discountType: z.enum(['percentage', 'amount']).default('percentage'),
  discountPct: z.number().min(0, 'Discount percentage must be positive').max(100, 'Discount cannot exceed 100%').default(0),
  discountAmount: z.number().min(0, 'Discount amount must be positive').default(0),

  // Referral Agent (optional)
  referralAgentId: z.string().optional(),
  referralCommissionPct: z.number().min(0).max(100).default(3.0),
}).refine((data) => data.commissionPassThroughPct <= data.commissionPct, {
  message: "Commission pass-through cannot exceed commission percentage",
  path: ["commissionPassThroughPct"],
});

// Additional charge types
const additionalChargeTypes = [
  { value: 'permits', label: 'Permits Cost' },
  { value: 'highway', label: 'Highway Charges' },
  { value: 'additional_fuel', label: 'Additional Fuel Costs' },
  { value: 'driver_charges', label: 'Driver Charges' },
  { value: 'additional_distance', label: 'Additional Distance/KM' },
  { value: 'pass_through', label: 'Pass-Through Charge (No Cost)' },
  { value: 'internal_cost', label: 'Internal Cost (Not Charged to Customer)' },
  { value: 'refund', label: 'Refund/Adjustment' },
  { value: 'other', label: 'Other' }
];

interface AdditionalCharge {
  id: string;
  type: string;
  amount: number;
  distance?: number; // For additional_distance type
  reason?: string;
  applyPerBus: boolean;
  busesCount: number;
}

interface OtherExpense {
  id: string;
  label: string;
  amount: number;
}

interface SelectedBusFleet {
  id: string;
  busTypeId: string;
  quantity: number;
}

type FormData = z.infer<typeof formSchema>;

interface BusType {
  id: string;
  name: string;
  capacity: number;
  avg_km_per_l: number;
  features: string;
}

interface ParkingLocation {
  id: string;
  parking_location_name: string;
  parking_lat: number;
  parking_lng: number;
  is_default: boolean;
}

interface IntermediateStop {
  id: string;
  location: string;
  lat?: number;
  lng?: number;
}

interface Props {
  onSubmit: (formData?: any) => void;
  onCancel: () => void;
  initialData?: any;
  isEditing?: boolean;
  submissionData?: any;
  editConfig?: {
    editType: 'staff_edit' | 'customer_request';
    reason?: string;
  };
}

export function SpecialHireForm({ onSubmit, onCancel, initialData, isEditing = false, submissionData, editConfig }: Props) {
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [intermediateStops, setIntermediateStops] = useState<IntermediateStop[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useMultiParking, setUseMultiParking] = useState(false);
  const [usePickupAsParking, setUsePickupAsParking] = useState(initialData?.uses_pickup_as_parking || false);

  // Manual parking distance override state
  const [useManualParkingDistance, setUseManualParkingDistance] = useState(initialData?.uses_manual_parking_distance || false);
  const [manualParkingToPickup, setManualParkingToPickup] = useState<number>(initialData?.manual_km_parking_to_pickup || 0);
  const [manualDropToParking, setManualDropToParking] = useState<number>(initialData?.manual_km_drop_to_parking || 0);
  // Store original calculated distances for reset capability
  const [originalCalculatedParkingToPickup, setOriginalCalculatedParkingToPickup] = useState<number>(0);
  const [originalCalculatedDropToParking, setOriginalCalculatedDropToParking] = useState<number>(0);

  // Manual trip distance override state
  const [useManualTripDistance, setUseManualTripDistance] = useState(initialData?.uses_manual_trip_distance || false);
  const [manualTripDistance, setManualTripDistance] = useState<number>(initialData?.manual_km_trip || 0);
  const [originalCalculatedTripDistance, setOriginalCalculatedTripDistance] = useState<number>(0);
  const [busDetails, setBusDetails] = useState<Array<{
    busNumber: number;
    parkingLocationId: string;
    parkingLocationName: string;
    parkingLat: number;
    parkingLng: number;
  }>>([]);
  const [isMultiBusMode, setIsMultiBusMode] = useState(false);
  const [selectedBusFleet, setSelectedBusFleet] = useState<SelectedBusFleet[]>([
    { id: crypto.randomUUID(), busTypeId: '', quantity: 1 }
  ]);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);

  // CRITICAL: Capture coordinates from LocationAutocomplete to avoid re-geocoding errors
  // Google can return wrong locations (e.g., "Isurupura, Malabe" instead of "Isurupura, Anuradhapura")
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null); // [lng, lat]
  const [dropCoords, setDropCoords] = useState<[number, number] | null>(null); // [lng, lat]

  // Referral Agent state
  const [referralAgents, setReferralAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;
  const { syncToAccounting } = useCustomerBridge();

  const AUTO_SAVE_KEY = 'special-hire-form-draft';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      companyName: initialData.company_name || '',
      customerName: initialData.customer_name || '',
      customerPhone: initialData.customer_phone || '',
      customerEmail: initialData.customer_email || '',
      specialRequest: initialData.special_request || '',
      busTypeId: initialData.bus_type_id || '',
      hireType: initialData.hire_type || 'Outside',
      numberOfBuses: initialData.number_of_buses || 1,
      pickupLocation: initialData.pickup_location || '',
      dropLocation: initialData.drop_location || '',

      numberOfPassengers: initialData.number_of_passengers || 1,
      pickupDateTime: initialData.pickup_datetime ? new Date(initialData.pickup_datetime) : new Date(),
      dropDateTime: initialData.drop_datetime ? new Date(initialData.drop_datetime) : new Date(),
      parkingLocationId: initialData.parking_location_id || '',
      commissionPct: initialData.commission_pct || 0,
      commissionPassThroughPct: initialData.commission_pass_through_pct || 0,
      discountType: (initialData.discount_percentage && initialData.discount_percentage > 0) ? 'percentage' : 'amount',
      discountPct: initialData.discount_percentage || 0,
      discountAmount: initialData.discount_amount_lkr || 0,
      referralAgentId: initialData.referral_agent_id || '',
      referralCommissionPct: initialData.referral_commission_pct || 3.0,
    } : {
      companyName: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      specialRequest: '',
      busTypeId: '',
      hireType: 'Outside',
      numberOfBuses: 1,
      pickupLocation: '',
      dropLocation: '',
      numberOfPassengers: 1,
      pickupDateTime: new Date(),
      dropDateTime: new Date(),
      parkingLocationId: '',
      commissionPct: 0,
      commissionPassThroughPct: 0,
      discountType: 'percentage',
      discountPct: 0,
      discountAmount: 0,
      referralAgentId: '',
      referralCommissionPct: 3.0,
    }
  });

  const watchedNumberOfBuses = form.watch('numberOfBuses');

  useEffect(() => {
    loadBusTypes();
    loadParkingLocations();
    loadReferralAgents();

    // Auto-fill form from submission data
    if (submissionData) {
      form.setValue('companyName', submissionData.company_name || '');
      form.setValue('customerName', submissionData.customer_name);
      form.setValue('customerPhone', submissionData.customer_phone);
      form.setValue('customerEmail', submissionData.customer_email || '');
      form.setValue('specialRequest', submissionData.special_request || '');
      form.setValue('hireType', submissionData.hire_type as 'Outside' | 'Lyceum' | 'Internal');
      form.setValue('numberOfBuses', submissionData.number_of_buses);
      form.setValue('pickupLocation', submissionData.pickup_location);
      form.setValue('dropLocation', submissionData.drop_location);
      form.setValue('numberOfPassengers', submissionData.number_of_passengers);
      form.setValue('pickupDateTime', new Date(submissionData.pickup_datetime));
      form.setValue('dropDateTime', new Date(submissionData.drop_datetime));

      // Parse intermediate places from special_request field
      if (submissionData.special_request) {
        const intermediateMatch = submissionData.special_request.match(/Intermediate places:\s*(.+?)(?:\n|$)/);
        if (intermediateMatch && intermediateMatch[1]) {
          const places = intermediateMatch[1]
            .split(',')
            .map((place, index) => ({
              id: `temp-${index}`,
              location: place.trim()
            }))
            .filter(stop => stop.location);
          setIntermediateStops(places);
        }
      }
    }

    // If editing, set intermediate stops, additional charges, and other expenses from initial data
    if (isEditing && initialData) {
      // Load intermediate stops
      const stops = safeParseJSON(initialData.intermediate_stops, []);
      setIntermediateStops(stops);

      // Load additional charges
      const charges = safeParseJSON(initialData.additional_charges, []);
      const formattedCharges = charges.map((charge: any, index: number) => ({
        id: `existing-${index}`,
        type: charge.type || 'other',
        amount: Number(charge.amount) || 0,
        reason: charge.reason || '',
        applyPerBus: charge.applyPerBus || false,
        busesCount: charge.busesCount || 1
      }));
      setAdditionalCharges(formattedCharges);

      // Load other expenses
      const expenses = safeParseJSON(initialData.other_expenses, []);
      const formattedExpenses = expenses.map((expense: any, index: number) => ({
        id: `existing-expense-${index}`,
        label: expense.label || expense.category || 'other',
        amount: Number(expense.amount) || 0
      }));
      setOtherExpenses(formattedExpenses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialData]);

  // Initialize costData from initialData when editing to enable submit button
  useEffect(() => {
    if (isEditing && initialData) {
      const parsedAdditionalCharges = safeParseJSON(initialData.additional_charges, []);
      const parsedOtherExpenses = safeParseJSON(initialData.other_expenses, []);

      // Calculate actual hours from pickup/drop times
      let actualHours = 0;
      if (initialData.pickup_datetime && initialData.drop_datetime) {
        const pickup = new Date(initialData.pickup_datetime);
        const drop = new Date(initialData.drop_datetime);
        actualHours = Math.round(((drop.getTime() - pickup.getTime()) / (1000 * 60 * 60)) * 100) / 100;
      }

      // Initialize costData to enable submit button
      setCostData({
        kmParkingToPickup: initialData.km_parking_to_pickup || 0,
        kmTrip: initialData.km_trip || 0,
        kmDropToParking: initialData.km_drop_to_parking || 0,
        fuelCostFuelOnly: initialData.fuel_cost_fuel_only || 0,
        hireCharge: initialData.hire_charge || 0,
        grossRevenue: initialData.gross_revenue || 0,
        customerTotalWithFuel: initialData.customer_total_with_fuel || 0,
        fixedRate: initialData.fixed_rate || 0,
        overtimeCharge: initialData.overtime_charge || 0,
        overnightCharge: initialData.overnight_charge || 0,
        exceedingDistanceCharge: initialData.exceeding_distance_charge || 0,
        pickupDateTime: initialData.pickup_datetime,
        dropDateTime: initialData.drop_datetime,
        commissionPct: initialData.commission_pct || 0,
        commissionAmount: initialData.commission_amount || 0,
        commissionPassThroughPct: initialData.commission_pass_through_pct || 0,
        commissionPassThroughAmount: initialData.commission_pass_through_amount || 0,
        discountType: (initialData.discount_percentage && initialData.discount_percentage > 0) ? 'percentage' : 'amount',
        discountPct: initialData.discount_percentage || 0,
        discountAmount: initialData.discount_amount_lkr || 0,
        driverCharge: initialData.driver_charge || 1500,
        additionalCharges: parsedAdditionalCharges,
        totalAdditionalCharges: initialData.total_additional_charges || 0,
        otherExpenses: parsedOtherExpenses,
        totalExpenses: initialData.total_expenses || 0,
        netProfit: initialData.net_profit || 0,
        numberOfBuses: initialData.number_of_buses || 1,
        // Rate card details for display
        rateCardDetails: (() => {
          // ALL hire types: available hours = trip distance / 10 km/h baseline speed
          const availableHours = (initialData.km_trip || 0) / 10;
          return {
            standardHours: initialData.standard_hours || 8,
            actualHours: actualHours,
            availableHours: Math.round(availableHours * 100) / 100,
            overtimeHours: Math.round(Math.max(0, actualHours - availableHours) * 100) / 100,
            overnightDays: 0,
          };
        })()
      });
    }
  }, [isEditing, initialData]);

  // Auto-save functionality
  const saveToLocalStorage = useCallback(() => {
    const formValues = form.getValues();
    const saveData = {
      formValues,
      intermediateStops,
      additionalCharges,
      otherExpenses,
      useMultiParking,
      busDetails,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(saveData));
    setAutoSaved(true);
    setShowAutoSaveIndicator(true);
    setTimeout(() => setShowAutoSaveIndicator(false), 2000);
  }, [form, intermediateStops, additionalCharges, otherExpenses, useMultiParking, busDetails]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(AUTO_SAVE_KEY);
      if (savedData && !isEditing && !submissionData && !initialData) {
        const parsed = safeParseJSON(savedData, null);
        if (!parsed) return;
        // Only load if saved within last 7 days
        if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
          // Set form values
          Object.keys(parsed.formValues).forEach((key) => {
            const value = parsed.formValues[key];
            if (key === 'pickupDateTime' || key === 'dropDateTime') {
              form.setValue(key as any, new Date(value));
            } else {
              form.setValue(key as any, value);
            }
          });

          // Set other state
          if (parsed.intermediateStops) setIntermediateStops(parsed.intermediateStops);
          if (parsed.additionalCharges) setAdditionalCharges(parsed.additionalCharges);
          if (parsed.otherExpenses) setOtherExpenses(parsed.otherExpenses);
          if (parsed.useMultiParking) setUseMultiParking(parsed.useMultiParking);
          if (parsed.busDetails) setBusDetails(parsed.busDetails);

          toast({
            title: "Draft Restored",
            description: "Your previous form data has been restored.",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
    }
  }, [form, isEditing, submissionData, initialData, toast]);

  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    setAutoSaved(false);
  }, []);

  // Load auto-saved data on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Auto-save form data when it changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't auto-save if editing existing data or loading from submission
    if (!isEditing && !submissionData && !initialData) {
      saveTimeoutRef.current = setTimeout(() => {
        const formValues = form.getValues();
        // Only save if form has some meaningful data
        if (formValues.customerName || formValues.pickupLocation || formValues.dropLocation) {
          saveToLocalStorage();
        }
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intermediateStops, additionalCharges, otherExpenses, useMultiParking, busDetails, isEditing, submissionData, initialData, saveToLocalStorage]);

  // Auto-clamp commission pass-through to not exceed commission percentage
  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      if (name === 'commissionPct' || name === 'commissionPassThroughPct') {
        const commissionPct = values.commissionPct || 0;
        const passThroughPct = values.commissionPassThroughPct || 0;

        if (passThroughPct > commissionPct) {
          form.setValue('commissionPassThroughPct', commissionPct, { shouldValidate: true });
          toast({
            title: "Commission Pass-through Adjusted",
            description: `Pass-through percentage cannot exceed commission percentage (${commissionPct}%)`,
            variant: "default"
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, toast]);

  // Manage bus details when number of buses changes
  useEffect(() => {
    if (useMultiParking && watchedNumberOfBuses) {
      const currentBusCount = busDetails.length;
      if (currentBusCount < watchedNumberOfBuses) {
        // Add new bus details
        const newBuses = [];
        for (let i = currentBusCount; i < watchedNumberOfBuses; i++) {
          const defaultLocation = parkingLocations.find(loc => loc.is_default) || parkingLocations[0];
          if (defaultLocation) {
            newBuses.push({
              busNumber: i + 1,
              parkingLocationId: defaultLocation.id,
              parkingLocationName: defaultLocation.parking_location_name,
              parkingLat: defaultLocation.parking_lat,
              parkingLng: defaultLocation.parking_lng,
            });
          }
        }
        setBusDetails([...busDetails, ...newBuses]);
      } else if (currentBusCount > watchedNumberOfBuses) {
        // Remove excess bus details
        setBusDetails(busDetails.slice(0, watchedNumberOfBuses));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedNumberOfBuses, useMultiParking, busDetails.length, parkingLocations]);

  const handleMultiParkingToggle = (enabled: boolean) => {
    setUseMultiParking(enabled);
    if (enabled) {
      // Initialize bus details for current number of buses
      const buses = [];
      const defaultLocation = parkingLocations.find(loc => loc.is_default) || parkingLocations[0];

      for (let i = 0; i < watchedNumberOfBuses; i++) {
        if (defaultLocation) {
          buses.push({
            busNumber: i + 1,
            parkingLocationId: defaultLocation.id,
            parkingLocationName: defaultLocation.parking_location_name,
            parkingLat: defaultLocation.parking_lat,
            parkingLng: defaultLocation.parking_lng,
          });
        }
      }
      setBusDetails(buses);
    } else {
      setBusDetails([]);
      // Reset to single parking mode - user can select parking location manually
    }
  };

  const updateBusParking = (busNumber: number, parkingLocationId: string) => {
    const location = parkingLocations.find(loc => loc.id === parkingLocationId);
    if (location) {
      setBusDetails(prev => prev.map(bus =>
        bus.busNumber === busNumber
          ? {
            ...bus,
            parkingLocationId: location.id,
            parkingLocationName: location.parking_location_name,
            parkingLat: location.parking_lat,
            parkingLng: location.parking_lng,
          }
          : bus
      ));
    }
  };

  const loadBusTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBusTypes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bus types",
        variant: "destructive"
      });
    }
  };

  const loadParkingLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_settings')
        .select('*')
        .order('parking_location_name');

      if (error) throw error;
      setParkingLocations(data || []);

      // Set default parking location if not editing
      if (!isEditing && data && data.length > 0) {
        const defaultLocation = data.find(loc => loc.is_default) || data[0];
        if (defaultLocation) {
          form.setValue('parkingLocationId', defaultLocation.id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load parking locations",
        variant: "destructive"
      });
    }
  };

  const loadReferralAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_agents')
        .select('*')
        .eq('status', 'active')
        .order('agent_name');

      if (error) throw error;
      setReferralAgents(data || []);
    } catch (error: any) {
      console.error('Error loading referral agents:', error);
      // Silently fail - agents are optional
    }
  };

  const handleAgentSelect = async (agentId: string) => {
    if (!agentId) {
      setSelectedAgent(null);
      form.setValue('referralCommissionPct', 3.0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('referral_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;

      setSelectedAgent(data);
      // Auto-fill commission percentage with agent's default rate
      form.setValue('referralCommissionPct', data.default_commission_pct || 3.0);
    } catch (error: any) {
      console.error('Error loading agent details:', error);
      toast({
        title: "Error",
        description: "Failed to load agent details",
        variant: "destructive"
      });
    }
  };

  const handleAgentAdded = async (agentId: string) => {
    // Reload agents list
    await loadReferralAgents();
    // Select the newly added agent
    form.setValue('referralAgentId', agentId);
    handleAgentSelect(agentId);
  };

  const addIntermediateStop = () => {
    const newStop: IntermediateStop = {
      id: Date.now().toString(),
      location: ''
    };
    setIntermediateStops([...intermediateStops, newStop]);
  };

  const removeIntermediateStop = (id: string) => {
    setIntermediateStops(intermediateStops.filter(stop => stop.id !== id));
  };

  // CRITICAL: Accept coordinates from LocationAutocomplete to avoid re-geocoding errors
  const updateIntermediateStop = (id: string, location: string, coords?: [number, number]) => {
    setIntermediateStops(intermediateStops.map(stop =>
      stop.id === id
        ? { ...stop, location, lat: coords?.[1], lng: coords?.[0] }
        : stop
    ));
  };

  const addAdditionalCharge = () => {
    const newCharge: AdditionalCharge = {
      id: Date.now().toString(),
      type: 'permits',
      amount: 0,
      reason: '',
      applyPerBus: false,
      busesCount: 1
    };
    setAdditionalCharges(charges => [...charges, newCharge]);
  };

  const updateAdditionalCharge = async (id: string, field: keyof AdditionalCharge, value: any) => {
    setAdditionalCharges(charges =>
      charges.map(charge => {
        if (charge.id === id) {
          const updatedCharge = { ...charge, [field]: value };

          // Set default reason to "wages" when type is changed to "internal_cost"
          if (field === 'type' && value === 'internal_cost' && !charge.reason) {
            updatedCharge.reason = 'wages';
          }

          // Auto-calculate amount for additional_distance type
          if (updatedCharge.type === 'additional_distance' && field === 'distance' && value > 0) {
            // Get the exceeding KM rate from hire rate cards
            const calculateDistanceAmount = async () => {
              const watchedBusTypeId = form.watch('busTypeId');
              const watchedHireType = form.watch('hireType');

              if (watchedBusTypeId && watchedHireType) {
                // Use Lyceum rates for both Lyceum and Internal hire types
                const rateCardHireType = watchedHireType === 'Internal' ? 'Lyceum' : watchedHireType;
                // FIX: Use .not() to filter for cards that have exceeding_km_rate set,
                // and .maybeSingle() to handle multiple range-based rate cards gracefully
                const { data: rateCard, error: rateError } = await supabase
                  .from('hire_rate_cards')
                  .select('exceeding_km_rate_lkr')
                  .eq('hire_type', rateCardHireType)
                  .eq('bus_type_id', watchedBusTypeId)
                  .eq('is_active', true)
                  .not('exceeding_km_rate_lkr', 'is', null)
                  .limit(1)
                  .maybeSingle();

                if (rateError) {
                  console.error('Error fetching exceeding KM rate:', rateError);
                  toast({
                    title: "Rate Card Error",
                    description: "Could not fetch exceeding KM rate. Please check rate card configuration.",
                    variant: "destructive",
                  });
                  return;
                }

                if (rateCard && rateCard.exceeding_km_rate_lkr) {
                  const calculatedAmount = value * rateCard.exceeding_km_rate_lkr;
                  setAdditionalCharges(prevCharges =>
                    prevCharges.map(prevCharge =>
                      prevCharge.id === id
                        ? { ...prevCharge, amount: calculatedAmount }
                        : prevCharge
                    )
                  );
                } else {
                  toast({
                    title: "No Exceeding KM Rate",
                    description: `No exceeding KM rate configured for ${rateCardHireType} hire type. Please set it in Rate Cards.`,
                    variant: "destructive",
                  });
                }
              }
            };
            calculateDistanceAmount();
          }

          // Reset amount when changing away from additional_distance type
          if (field === 'type' && charge.type === 'additional_distance' && value !== 'additional_distance') {
            updatedCharge.amount = 0;
            updatedCharge.distance = 0;
          }

          return updatedCharge;
        }
        return charge;
      })
    );
  };

  const removeAdditionalCharge = (id: string) => {
    setAdditionalCharges(charges => charges.filter(charge => charge.id !== id));
  };

  const addOtherExpense = () => {
    const newExpense: OtherExpense = {
      id: Date.now().toString(),
      label: '',
      amount: 0
    };
    setOtherExpenses(expenses => [...expenses, newExpense]);
  };

  const updateOtherExpense = (id: string, field: keyof OtherExpense, value: any) => {
    setOtherExpenses(expenses =>
      expenses.map(expense =>
        expense.id === id
          ? { ...expense, [field]: value }
          : expense
      )
    );
  };

  const removeOtherExpense = (id: string) => {
    setOtherExpenses(expenses => expenses.filter(expense => expense.id !== id));
  };

  const calculateMultiBusFleetCosts = async (data: FormData, fuelSettings: any) => {
    try {
      // Validate all buses have type selected
      if (selectedBusFleet.some(b => !b.busTypeId || b.quantity < 1)) {
        throw new Error('Please select a bus type and quantity for all fleet entries');
      }

      // Calculate distances (same for all buses)
      const validIntermediateStops = intermediateStops.filter(stop => stop.location?.trim());
      // Build intermediate stops with coordinates for accurate geocoding
      const stopsWithCoords = validIntermediateStops.map(stop => ({
        location: stop.location,
        lat: stop.lat || undefined,
        lng: stop.lng || undefined,
      }));

      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: {
          pickupLocation: data.pickupLocation,
          dropLocation: data.dropLocation,
          intermediateStops: stopsWithCoords,
          parkingLat: fuelSettings.parking_lat,
          parkingLng: fuelSettings.parking_lng,
          pickupCoords: pickupCoords,
          dropCoords: dropCoords,
        }
      });

      if (error || !distanceData) {
        throw new Error('Distance calculation failed');
      }

      const tripDistance = distanceData.kmTrip || 0;
      const busFleetDetails = [];
      let combinedSubtotal = 0;
      let totalHireCharge = 0;
      let totalBuses = 0;
      let totalCapacity = 0;
      let totalFuelCost = 0;
      let totalMaintenanceCost = 0;
      let totalOvertimeCharge = 0;
      let totalOvernightCharge = 0;
      let totalFuelLiters = 0;
      let totalFixedRate = 0;
      let totalExceedingCharge = 0;
      let firstBusEfficiency = 8; // Default, updated from first bus type

      // Loop through each bus type in the fleet
      for (const bus of selectedBusFleet) {
        const { data: busTypeData } = await supabase
          .from('bus_types')
          .select('*')
          .eq('id', bus.busTypeId)
          .single();

        if (!busTypeData) continue;

        // Get rate cards for this specific bus type
        const rateCardHireType = data.hireType === 'Internal' ? 'Lyceum' : data.hireType;
        const { data: allRateCards } = await supabase
          .from('hire_rate_cards')
          .select('*')
          .eq('hire_type', rateCardHireType)
          .eq('bus_type_id', bus.busTypeId)
          .eq('is_active', true)
          .order('from_km');

        if (!allRateCards || allRateCards.length === 0) {
          throw new Error(`No rate cards found for ${busTypeData.name}`);
        }

        // Calculate hire charge for this bus type (same logic as single bus)
        let hireChargePerBus = 0;
        let rateCard = null;
        let overtimeCharge = 0;
        let overnightCharge = 0;
        let exceedingChargePerBus = 0;
        let fixedRatePerBus = 0;

        if (data.hireType === 'Outside') {
          // Outside hire: flat rate + exceeding km
          rateCard = allRateCards.find(c => c.flat_fee_lkr != null) || allRateCards[0];
          fixedRatePerBus = rateCard.flat_fee_lkr || 0;
          const baseCoverageKm = rateCard.exceeding_km_threshold || 100;
          const exceedingKm = Math.max(0, tripDistance - baseCoverageKm);
          exceedingChargePerBus = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);
          hireChargePerBus = fixedRatePerBus + exceedingChargePerBus;

          totalFixedRate += fixedRatePerBus * bus.quantity;
          totalExceedingCharge += exceedingChargePerBus * bus.quantity;

          // FIX: Use calculateExtraTimeCharge for correct overtime/overnight calculation
          const extraTimeResult = calculateExtraTimeCharge(
            tripDistance,
            data.pickupDateTime,
            data.dropDateTime,
            {
              baselineSpeedKmph: 10,
              hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
              nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
              useStandardHours: false
            }
          );

          overtimeCharge = extraTimeResult.overtimeCharge;
          overnightCharge = extraTimeResult.overnightCharge;
          hireChargePerBus += extraTimeResult.totalExtraCharge;
        } else {
          // Lyceum/Internal: range-based rates
          rateCard = allRateCards.find(card =>
            tripDistance >= (card.from_km || 0) &&
            (card.to_km === null || tripDistance <= card.to_km)
          ) || allRateCards[0];

          fixedRatePerBus = rateCard?.flat_fee_lkr || 0;
          hireChargePerBus = fixedRatePerBus;
          totalFixedRate += fixedRatePerBus * bus.quantity;

          // Lyceum/Internal hire: use km/10 distance-based available hours (same as Outside)
          const extraTimeResult = calculateExtraTimeCharge(
            tripDistance,
            data.pickupDateTime,
            data.dropDateTime,
            {
              baselineSpeedKmph: 10,
              hourlyRate: rateCard?.overtime_rate_lkr_per_hour || 500,
              nightBlockFee: rateCard?.overnight_charge_lkr_per_day || 10000,
              useStandardHours: false  // Use km/10 same as Outside
            }
          );

          overtimeCharge = extraTimeResult.overtimeCharge;
          overnightCharge = extraTimeResult.overnightCharge;
          hireChargePerBus += extraTimeResult.totalExtraCharge;

          // Handle exceeding km for distances > 100km
          if (tripDistance > 100) {
            const exceedingCard = allRateCards.find(c => c.from_km >= 101 && c.exceeding_km_rate_lkr);
            if (exceedingCard) {
              const exceedingKm = tripDistance - 100;
              exceedingChargePerBus = exceedingKm * (exceedingCard.exceeding_km_rate_lkr || 0);
              hireChargePerBus += exceedingChargePerBus;
              totalExceedingCharge += exceedingChargePerBus * bus.quantity;
            }
          }
        }

        // Calculate fuel cost (empty running only)
        const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
        const fuelLitersPerBus = emptyRunKm / (busTypeData.avg_km_per_l || 8);
        const fuelCostPerBus = fuelLitersPerBus * fuelSettings.diesel_price_lkr_per_l;

        // Calculate maintenance cost (total distance)
        const totalTripKm = (distanceData.kmParkingToPickup || 0) + tripDistance + (distanceData.kmDropToParking || 0);
        const maintenanceCostPerBus = totalTripKm * (fuelSettings.maintenance_rate_lkr_per_km || 20);

        // Subtotals for this bus type
        const subtotalPerBus = hireChargePerBus + fuelCostPerBus + maintenanceCostPerBus;
        const subtotalAllBuses = subtotalPerBus * bus.quantity;

        // Add to fleet details — include per-bus-type breakdown for CostBreakdown display
        busFleetDetails.push({
          bus_type_id: busTypeData.id,
          bus_type_name: busTypeData.name,
          quantity: bus.quantity,
          seating_capacity: busTypeData.capacity,
          hire_charge_per_bus: Math.round(hireChargePerBus),
          fuel_cost_per_bus: Math.round(fuelCostPerBus),
          maintenance_cost_per_bus: Math.round(maintenanceCostPerBus),
          subtotal_per_bus: Math.round(subtotalPerBus),
          subtotal_all_buses: Math.round(subtotalAllBuses),
          // Per-bus-type hire charge breakdown
          fixed_rate_per_bus: Math.round(fixedRatePerBus),
          overtime_charge_per_bus: Math.round(overtimeCharge),
          overnight_charge_per_bus: Math.round(overnightCharge),
          exceeding_charge_per_bus: Math.round(exceedingChargePerBus),
          bus_type_efficiency: busTypeData.avg_km_per_l || 8,
          fuel_liters_per_bus: Math.round(fuelLitersPerBus * 10) / 10,
        });

        // Aggregate totals
        combinedSubtotal += subtotalAllBuses;
        totalHireCharge += hireChargePerBus * bus.quantity;
        totalBuses += bus.quantity;
        totalCapacity += busTypeData.capacity * bus.quantity;
        totalFuelCost += fuelCostPerBus * bus.quantity;
        totalMaintenanceCost += maintenanceCostPerBus * bus.quantity;
        totalOvertimeCharge += overtimeCharge * bus.quantity;
        totalOvernightCharge += overnightCharge * bus.quantity;
        totalFuelLiters += fuelLitersPerBus * bus.quantity;
        // Use first bus type's efficiency for CostBreakdown display
        if (busFleetDetails.length === 1) {
          firstBusEfficiency = busTypeData.avg_km_per_l || 8;
        }
      }

      // Apply additional charges BEFORE commission (exclude internal_cost from customer total)
      const customerAdditionalCharges = additionalCharges.filter(charge =>
        charge.type !== 'internal_cost'
      );
      const totalAdditionalCharges = customerAdditionalCharges.reduce((sum, charge) => {
        if (charge.applyPerBus) {
          return sum + (charge.amount * charge.busesCount);
        }
        return sum + charge.amount;
      }, 0);

      // Calculate pre-commission total (includes all charges except commission)
      // FIXED: grossRevenue = hire charges only (not fuel+maintenance), matching single-bus behavior
      // This prevents QuotationPreview.calculateFinalCustomerTotal from double-counting fuel
      const grossRevenue = totalHireCharge;

      let discountAmount = 0;
      if (data.discountType === 'percentage') {
        discountAmount = grossRevenue * (data.discountPct / 100);
      } else {
        discountAmount = data.discountAmount;
      }

      // Pre-commission total = hire revenue + fuel + additional charges - discount
      // FIXED: fuel added here explicitly (was previously hidden inside grossRevenue=combinedSubtotal)
      const preCommissionTotal = grossRevenue + totalFuelCost + totalAdditionalCharges - discountAmount;

      // Calculate commission on the FULL pre-commission total
      const commissionExpenseAmount = preCommissionTotal * (data.commissionPct / 100);
      const commissionPassThroughAmount = preCommissionTotal * (Math.min(data.commissionPassThroughPct, data.commissionPct) / 100);

      const finalCustomerTotal = preCommissionTotal + commissionPassThroughAmount;

      // Calculate total expenses (include ALL charges including internal_cost in deductions)
      const internalExpenses = additionalCharges
        .filter(charge => charge.type !== 'pass_through') // Exclude only pass-through
        .reduce((sum, charge) => {
          const effectiveAmount = charge.applyPerBus ? charge.amount * charge.busesCount : charge.amount;
          return sum + effectiveAmount;
        }, 0);

      const driverChargeTotal = totalBuses * 1500; // Default driver charge per bus
      const totalOtherExpenses = otherExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalExpenses = driverChargeTotal + totalFuelCost + totalMaintenanceCost +
        commissionExpenseAmount + totalOtherExpenses + internalExpenses;

      const netProfit = finalCustomerTotal - totalExpenses;

      // Set cost data with bus fleet details
      const costs = {
        km_parking_to_pickup: Math.round((distanceData.kmParkingToPickup || 0) * 10) / 10,
        km_trip: Math.round((distanceData.kmTrip || 0) * 10) / 10,
        km_drop_to_parking: Math.round((distanceData.kmDropToParking || 0) * 10) / 10,
        bus_fleet_details: busFleetDetails,
        fuel_cost_fuel_only: Math.round(totalFuelCost),
        hire_charge: Math.round(totalHireCharge),
        extra_charges: 0, // Multi-bus doesn't have separate extra charges
        // FIXED: Add fields that were missing for multi-bus (saved to DB)
        fixed_rate: Math.round(totalFixedRate / totalBuses), // Average per bus for DB
        overtime_charge: Math.round(totalOvertimeCharge / totalBuses),
        overnight_charge: Math.round(totalOvernightCharge / totalBuses),
        exceeding_distance_charge: Math.round(totalExceedingCharge / totalBuses),
        gross_revenue: Math.round(grossRevenue),
        commission_pct: data.commissionPct,
        commission_pass_through_pct: Math.min(data.commissionPassThroughPct, data.commissionPct),
        commission_pass_through_amount: Math.round(commissionPassThroughAmount),
        discount_percentage: data.discountPct,
        discount_amount: Math.round(discountAmount),
        discount_type: data.discountType,
        driver_charge: 1500,
        other_expenses: otherExpenses.map(expense => ({
          label: expense.label,
          amount: expense.amount
        })),
        commission_amount: Math.round(commissionExpenseAmount),
        additional_charges: additionalCharges.map(charge => ({
          type: charge.type,
          amount: charge.amount,
          reason: charge.reason,
          applyPerBus: charge.applyPerBus,
          busesCount: charge.busesCount
        })),
        total_additional_charges: Math.round(totalAdditionalCharges),
        total_expenses: Math.round(totalExpenses),
        net_profit: Math.round(netProfit),
        customerTotalWithFuel: Math.round(finalCustomerTotal)
      };

      // Calculate total trip distance for display
      const totalTripKm = (distanceData.kmParkingToPickup || 0) + tripDistance + (distanceData.kmDropToParking || 0);
      const totalAdditionalDistance = additionalCharges
        .filter(charge => charge.type === 'additional_distance')
        .reduce((sum, charge) => sum + (charge.distance || 0), 0);

      setCostData({
        kmParkingToPickup: costs.km_parking_to_pickup,
        kmTrip: costs.km_trip,
        kmDropToParking: costs.km_drop_to_parking,
        busFleetDetails: {
          buses: busFleetDetails,
          total_buses: totalBuses,
          total_capacity: totalCapacity,
          combined_subtotal: Math.round(combinedSubtotal)
        },
        // FIXED: Populate hire charge fields for CostBreakdown display
        hireCharge: Math.round(totalHireCharge / totalBuses), // Average total hire per bus (includes base + overtime + overnight + exceeding)
        fixedRate: Math.round(totalFixedRate / totalBuses), // Average base rate only (flat fee without extras)
        exceedingDistanceCharge: Math.round(totalExceedingCharge / totalBuses),
        overtimeCharge: Math.round(totalOvertimeCharge / totalBuses),
        overnightCharge: Math.round(totalOvernightCharge / totalBuses),
        // Time data for Working Hours Analysis
        pickupDateTime: data.pickupDateTime.toISOString(),
        dropDateTime: data.dropDateTime.toISOString(),
        grossRevenue: Math.round(grossRevenue),
        customerTotalWithFuel: Math.round(finalCustomerTotal),
        fuelCostFuelOnly: Math.round(totalFuelCost),
        maintenanceCost: Math.round(totalMaintenanceCost),
        commissionPct: data.commissionPct,
        commissionAmount: Math.round(commissionExpenseAmount),
        commissionPassThroughPct: Math.min(data.commissionPassThroughPct, data.commissionPct),
        commissionPassThroughAmount: Math.round(commissionPassThroughAmount),
        discountType: data.discountType,
        discountPct: data.discountType === 'percentage' ? data.discountPct : 0,
        discountAmount: Math.round(discountAmount),
        additionalCharges: costs.additional_charges,
        totalAdditionalCharges: costs.total_additional_charges,
        driverCharge: 1500,
        otherExpenses: costs.other_expenses,
        totalExpenses: costs.total_expenses,
        netProfit: costs.net_profit,
        numberOfBuses: totalBuses,
        isMultiParking: false,
        // FIXED: Add missing fields for CostBreakdown calculations
        totalTripDistance: totalTripKm,
        totalDistance: totalTripKm + totalAdditionalDistance,
        fuelLiters: Math.round(totalFuelLiters * 10) / 10,
        busTypeEfficiency: firstBusEfficiency,
        fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
        maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20,
        fuelPrice: fuelSettings.diesel_price_lkr_per_l,
      });

      toast({
        title: "Multi-Bus Fleet Cost Calculated",
        description: `${totalBuses} buses | ${totalCapacity} seats | LKR ${Math.round(finalCustomerTotal).toLocaleString()}`
      });

      return { costs, distanceData };
    } catch (error: any) {
      console.error('Error calculating multi-bus costs:', error);
      throw error;
    }
  };

  const calculateCosts = async (data: FormData) => {
    try {
      // Get selected parking location
      const { data: fuelSettings } = await supabase
        .from('fuel_settings')
        .select('*')
        .eq('id', data.parkingLocationId)
        .single();

      if (!fuelSettings) {
        throw new Error('Selected parking location not found');
      }

      // Check if multi-bus mode is active
      if (isMultiBusMode && selectedBusFleet.length > 0) {
        return await calculateMultiBusFleetCosts(data, fuelSettings);
      }

      // Single bus validation
      if (!data.busTypeId) {
        throw new Error('Please select a bus type');
      }

      console.log('Calculating distance with real Mapbox API:', {
        pickup: data.pickupLocation,
        drop: data.dropLocation,
        parking: { lat: fuelSettings.parking_lat, lng: fuelSettings.parking_lng }
      });

      // Filter out empty intermediate stops
      const validIntermediateStops = intermediateStops.filter(stop => stop.location && stop.location.trim());

      // Prepare distance calculation parameters
      const distanceCalculationBody: Record<string, unknown> = {
        pickupLocation: data.pickupLocation,
        dropLocation: data.dropLocation,
        intermediateStops: validIntermediateStops,
        numberOfBuses: data.numberOfBuses,
      };

      // CRITICAL: Pass captured coordinates to skip re-geocoding API calls
      // This prevents Google from returning wrong locations (e.g., "Isurupura, Malabe" instead of "Isurupura, Anuradhapura")
      // Priority: 1. Freshly captured coordinates from autocomplete selection
      //           2. Coordinates from initialData when editing
      if (pickupCoords) {
        distanceCalculationBody.pickupCoords = pickupCoords;
      } else if (isEditing && initialData?.pickup_lat && initialData?.pickup_lng) {
        distanceCalculationBody.pickupCoords = [initialData.pickup_lng, initialData.pickup_lat];
      }

      if (dropCoords) {
        distanceCalculationBody.dropCoords = dropCoords;
      } else if (isEditing && initialData?.drop_lat && initialData?.drop_lng) {
        distanceCalculationBody.dropCoords = [initialData.drop_lng, initialData.drop_lat];
      }

      if (useMultiParking && busDetails.length > 0) {
        // Multi-parking mode: send bus details with individual parking locations
        distanceCalculationBody.busDetails = busDetails.map(bus => ({
          busNumber: bus.busNumber,
          parkingLocationName: bus.parkingLocationName,
          parkingLat: bus.parkingLat,
          parkingLng: bus.parkingLng,
        }));
      } else {
        // Single parking mode: use selected parking location for all buses
        distanceCalculationBody.parkingLat = fuelSettings.parking_lat;
        distanceCalculationBody.parkingLng = fuelSettings.parking_lng;
      }

      // NEW: Pass usePickupAsParking flag to skip empty run calculations
      if (usePickupAsParking) {
        distanceCalculationBody.usePickupAsParking = true;
      }

      // Call edge function to calculate real distances
      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: distanceCalculationBody
      });

      if (error) {
        console.error('Distance calculation error:', error);
        throw new Error(`Distance calculation failed: ${error.message || 'Unknown error'}`);
      }

      if (!distanceData) {
        throw new Error('No distance data received from calculation service');
      }

      console.log('Distance calculation result:', distanceData);

      // Get bus type details
      const { data: busTypeData } = await supabase
        .from('bus_types')
        .select('*')
        .eq('id', data.busTypeId)
        .single();

      if (!busTypeData) {
        throw new Error('Bus type not found');
      }

      // Get rate cards for the hire type and bus type
      // Use Lyceum rates for both Lyceum and Internal hire types
      const rateCardHireType = data.hireType === 'Internal' ? 'Lyceum' : data.hireType;
      const { data: allRateCards } = await supabase
        .from('hire_rate_cards')
        .select('*')
        .eq('hire_type', rateCardHireType)
        .eq('bus_type_id', data.busTypeId)
        .eq('is_active', true)
        .order('from_km');

      if (!allRateCards || allRateCards.length === 0) {
        throw new Error(`No rate cards found for ${data.hireType} hire type. Please configure rate cards first.`);
      }

      // Round trip distance to 1 decimal place to avoid floating-point precision errors
      const calculatedTripDistance = Math.round((distanceData.kmTrip || 0) * 10) / 10;
      const tripDistance = useManualTripDistance && manualTripDistance > 0
        ? manualTripDistance
        : calculatedTripDistance;
      let rateCard = null;
      let fixedRate = 0;
      let exceedingDistanceCharge = 0;
      let baseCoverageKm = 100;
      let exceedingKm = 0;

      // Handle different hire types with proper rate card logic
      if (data.hireType !== 'Outside') {
        // For Other hire types (Lyceum, etc.) - use range-based rates
        rateCard = allRateCards.find(card =>
          tripDistance >= (card.from_km || 0) &&
          (card.to_km === null || tripDistance <= card.to_km)
        );

        if (!rateCard) {
          // Fallback to first available rate card
          rateCard = allRateCards[0];
        }

        if (!rateCard) {
          throw new Error(`No suitable rate card found for ${data.hireType} hire type and ${tripDistance}km distance.`);
        }

        // Use flat fee from the range-based rate card
        fixedRate = rateCard.flat_fee_lkr || 0;

        // Handle exceeding km for distances beyond 100km
        if (tripDistance > 100) {
          const exceedingRateCard = allRateCards.find(card =>
            card.from_km >= 101 && card.exceeding_km_rate_lkr != null
          );
          if (exceedingRateCard) {
            baseCoverageKm = exceedingRateCard.exceeding_km_threshold || 100;
            // Round exceeding km to 1 decimal place
            exceedingKm = Math.round(Math.max(0, tripDistance - baseCoverageKm) * 10) / 10;
            exceedingDistanceCharge = exceedingKm * (exceedingRateCard.exceeding_km_rate_lkr || 0);
          }
        }
      } else {
        // Outside hire logic - unified flat fee + exceeding rate
        rateCard = allRateCards.find(c => c.flat_fee_lkr != null && c.exceeding_km_rate_lkr != null) || allRateCards[0];
        if (!rateCard) {
          throw new Error(`No rate card found for ${data.hireType} hire type. Please configure flat fee and exceeding km rate.`);
        }

        fixedRate = rateCard.flat_fee_lkr || 0;
        baseCoverageKm = rateCard.exceeding_km_threshold || 100;
        // Round exceeding km to 1 decimal place
        exceedingKm = Math.round(Math.max(0, tripDistance - baseCoverageKm) * 10) / 10;
        exceedingDistanceCharge = exceedingKm * (rateCard.exceeding_km_rate_lkr || 0);
      }

      // Calculate total additional distance from additional_distance charges
      const totalAdditionalDistance = additionalCharges
        .filter(charge => charge.type === 'additional_distance')
        .reduce((sum, charge) => sum + (charge.distance || 0), 0);

      // Use trip distance + additional distance for extra time calculations
      const totalTripDistanceForCalculation = tripDistance + totalAdditionalDistance;

      // Calculate extra time charges for ALL hire types
      let overtimeCharge = 0;
      let overnightCharge = 0;
      let totalExtraTimeCharge = 0;

      if (data.hireType === 'Outside') {
        // Outside hire: distance-based available hours (km / 10 km/h baseline)
        const extraTimeResult = calculateExtraTimeCharge(
          totalTripDistanceForCalculation, // Include additional distance
          data.pickupDateTime,
          data.dropDateTime,
          {
            baselineSpeedKmph: 10,
            hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
            nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
            useStandardHours: false
          }
        );

        overtimeCharge = extraTimeResult.overtimeCharge;
        overnightCharge = extraTimeResult.overnightCharge;
        totalExtraTimeCharge = extraTimeResult.totalExtraCharge;
      } else {
        // Lyceum/Internal hire: use km/10 distance-based available hours (same as Outside)
        const extraTimeResult = calculateExtraTimeCharge(
          tripDistance,
          data.pickupDateTime,
          data.dropDateTime,
          {
            baselineSpeedKmph: 10,
            hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
            nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
            useStandardHours: false  // Use km/10 same as Outside
          }
        );

        overtimeCharge = extraTimeResult.overtimeCharge;
        overnightCharge = extraTimeResult.overnightCharge;
        totalExtraTimeCharge = extraTimeResult.totalExtraCharge;
      }

      const hireCharge = fixedRate + exceedingDistanceCharge + totalExtraTimeCharge;

      // Fuel cost calculation - different for single vs multi-parking
      let totalFuelCost = 0;
      let fuelLiters = 0;

      if (useMultiParking && distanceData.isMultiParking && distanceData.busCalculations) {
        // Multi-parking: calculate fuel cost per bus based on individual distances
        for (const busCalc of distanceData.busCalculations) {
          const busEmptyRunKm = busCalc.kmParkingToPickup + busCalc.kmDropToParking;
          const busFuelLiters = busEmptyRunKm / (busTypeData.avg_km_per_l || 8);
          const busFuelCost = busFuelLiters * fuelSettings.diesel_price_lkr_per_l;
          totalFuelCost += busFuelCost;
          fuelLiters += busFuelLiters;
        }
      } else {
        // Single parking: calculate fuel cost for all buses using same empty run distance
        const emptyRunKm = (distanceData.kmParkingToPickup || 0) + (distanceData.kmDropToParking || 0);
        fuelLiters = (emptyRunKm / (busTypeData.avg_km_per_l || 8)) * data.numberOfBuses;
        totalFuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;
      }

      const grossRevenue = hireCharge * data.numberOfBuses;

      // Calculate additional charges BEFORE commission (exclude internal_cost from customer total)
      const customerAdditionalCharges = additionalCharges.filter(charge =>
        charge.type !== 'internal_cost'
      );
      const totalAdditionalCharges = customerAdditionalCharges.reduce((sum, charge) => {
        const chargeAmount = charge.type === 'additional_distance' ? (charge.amount || 0) : charge.amount;
        return sum + (charge.applyPerBus ? chargeAmount * charge.busesCount : chargeAmount);
      }, 0);

      // Discount (subtracted from customer bill)
      const discountAmount = data.discountType === 'percentage'
        ? grossRevenue * (data.discountPct / 100)
        : data.discountAmount;

      // Pre-commission total = revenue + fuel + additional charges - discount
      const preCommissionTotal = grossRevenue + totalFuelCost + totalAdditionalCharges - discountAmount;

      // Commission calculations on FULL pre-commission total
      // Ensure pass-through percentage never exceeds commission percentage
      const safePassThroughPct = Math.min(data.commissionPassThroughPct, data.commissionPct);
      const commissionPassThroughAmount = preCommissionTotal * (safePassThroughPct / 100);
      const commissionExpense = preCommissionTotal * (data.commissionPct / 100); // Total commission company pays

      const finalCustomerTotal = preCommissionTotal + commissionPassThroughAmount;

      // Company expenses (include ALL charges including internal_cost in deductions)
      const internalExpenses = additionalCharges
        .filter(charge => charge.type !== 'pass_through' && charge.type !== 'additional_distance') // Exclude pass-through and additional_distance
        .reduce((sum, charge) => {
          const effectiveAmount = charge.applyPerBus ? charge.amount * charge.busesCount : charge.amount;
          return sum + effectiveAmount;
        }, 0);
      const driverCharge = 1500; // Default driver charge
      const totalExpenses = (driverCharge * data.numberOfBuses) + commissionExpense + totalFuelCost + internalExpenses;
      const netProfit = finalCustomerTotal - totalExpenses;

      const costs = {
        km_parking_to_pickup: Math.round((distanceData.kmParkingToPickup || 0) * 10) / 10,
        km_trip: tripDistance,
        km_drop_to_parking: Math.round((distanceData.kmDropToParking || 0) * 10) / 10,
        bus_fleet_details: null, // Single bus mode doesn't use fleet details
        fuel_cost_fuel_only: Math.round(totalFuelCost),
        hire_charge: Math.round(hireCharge),
        extra_charges: Math.round(totalExtraTimeCharge),
        // Store individual time charge components for display
        fixed_rate: Math.round(fixedRate),
        overtime_charge: Math.round(overtimeCharge),
        overnight_charge: Math.round(overnightCharge),
        exceeding_distance_charge: Math.round(exceedingDistanceCharge),
        gross_revenue: Math.round(grossRevenue), // Base hire charges
        commission_pct: data.commissionPct,
        commission_pass_through_pct: data.commissionPassThroughPct,
        commission_pass_through_amount: Math.round(commissionPassThroughAmount),
        discount_percentage: data.discountPct,
        discount_amount: Math.round(discountAmount),
        driver_charge: driverCharge,
        other_expenses: otherExpenses.map(expense => ({
          label: expense.label,
          amount: expense.amount
        })),
        commission_amount: Math.round(commissionExpense),
        additional_charges: additionalCharges.map(charge => ({
          type: charge.type,
          amount: charge.type === 'additional_distance' ? (charge.amount || 0) : charge.amount,
          distance: charge.type === 'additional_distance' ? charge.distance : undefined,
          reason: charge.reason || additionalChargeTypes.find(t => t.value === charge.type)?.label,
          applyPerBus: charge.applyPerBus,
          busesCount: charge.busesCount
        })),
        total_additional_charges: Math.round(totalAdditionalCharges),
        total_expenses: Math.round(totalExpenses),
        net_profit: Math.round(netProfit),
        customerTotalWithFuel: Math.round(finalCustomerTotal),
        fuel_price_per_liter: fuelSettings.diesel_price_lkr_per_l,
      };

      // Also set display data for UI
      setCostData({
        kmParkingToPickup: costs.km_parking_to_pickup,
        kmTrip: costs.km_trip,
        kmDropToParking: costs.km_drop_to_parking,
        fuelCostFuelOnly: costs.fuel_cost_fuel_only,
        hireCharge: Math.round(hireCharge),
        fixedRate: Math.round(fixedRate),
        exceedingDistanceCharge: Math.round(exceedingDistanceCharge),
        overtimeCharge: Math.round(overtimeCharge),
        overnightCharge: Math.round(overnightCharge),
        pickupDateTime: data.pickupDateTime.toISOString(),
        dropDateTime: data.dropDateTime.toISOString(),
        rateCardDetails: (() => {
          // FIXED: Always calculate actual hours from pickup/drop times for ALL hire types
          const actualHrs = (new Date(data.dropDateTime).getTime() - new Date(data.pickupDateTime).getTime()) / (1000 * 60 * 60);
          // ALL hire types: available hours = trip distance / 10 km/h baseline speed
          const availableHrs = tripDistance / 10;
          // FIXED: Calculate overtime for ALL hire types
          const overtimeHrs = Math.max(0, actualHrs - availableHrs);
          return {
            standardHours: rateCard.standard_hours || 8,
            actualHours: Math.round(actualHrs * 100) / 100,
            availableHours: Math.round(availableHrs * 100) / 100,
            overtimeHours: Math.round(overtimeHrs * 100) / 100,
            agreedDistance: baseCoverageKm,
            actualDistance: tripDistance,
            exceedingKm,
            freeExceedingKm: 0,
            chargeableExceedingKm: exceedingKm
          };
        })(),
        grossRevenue: Math.round(hireCharge * data.numberOfBuses),
        customerTotalWithFuel: Math.round(finalCustomerTotal),
        commissionPassThroughPct: data.commissionPassThroughPct,
        commissionPassThroughAmount: Math.round(commissionPassThroughAmount),
        discountType: data.discountType,
        discountPct: data.discountType === 'percentage' ? data.discountPct : 0,
        discountAmount: Math.round(discountAmount),
        additionalCharges: costs.additional_charges,
        totalAdditionalCharges: costs.total_additional_charges,
        driverCharge: costs.driver_charge,
        otherExpenses: costs.other_expenses,
        commissionPct: costs.commission_pct,
        commissionAmount: costs.commission_amount,
        totalExpenses: costs.total_expenses,
        netProfit: costs.net_profit,
        numberOfBuses: data.numberOfBuses,
        totalTripDistance: (distanceData.kmParkingToPickup || 0) + tripDistance + (distanceData.kmDropToParking || 0),
        totalDistance: (distanceData.kmParkingToPickup || 0) + tripDistance + (distanceData.kmDropToParking || 0) + totalAdditionalDistance,
        fuelLiters: Math.round(fuelLiters * 10) / 10,
        busTypeName: busTypeData.name,
        busTypeEfficiency: busTypeData.avg_km_per_l || 8,
        fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
        maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20,
        fuelPrice: fuelSettings.diesel_price_lkr_per_l,
        pickupAddress: distanceData.pickupAddress,
        dropAddress: distanceData.dropAddress,
        // Multi-parking metadata for correct fuel calculation display
        busCalculations: distanceData.busCalculations,
        isMultiParking: !!distanceData.isMultiParking,
        // Pickup as parking flag for display
        usePickupAsParking: usePickupAsParking || !!distanceData.usePickupAsParking,
      });

      const discountText = data.discountType === 'percentage' && data.discountPct > 0
        ? `(${data.discountPct}% discount)`
        : data.discountType === 'amount' && data.discountAmount > 0
          ? `(LKR ${data.discountAmount} discount)`
          : '';

      toast({
        title: "Cost Calculated",
        description: `Trip: ${tripDistance}km | Total: LKR ${Math.round(finalCustomerTotal).toLocaleString()} ${discountText}`
      });

      return { costs, distanceData };
    } catch (error: any) {
      console.error('Error calculating costs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to calculate distance",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Helper function to check if route-affecting fields have changed
  const hasRouteChanged = (currentData: FormData, originalData: any): boolean => {
    if (!originalData) return true;

    // Check location changes
    if (currentData.pickupLocation !== originalData.pickup_location) return true;
    if (currentData.dropLocation !== originalData.drop_location) return true;
    if (currentData.parkingLocationId !== originalData.parking_location_id) return true;

    // Check usePickupAsParking changes
    if (usePickupAsParking !== (originalData.uses_pickup_as_parking || false)) return true;

    // Check useManualParkingDistance changes
    if (useManualParkingDistance !== (originalData.uses_manual_parking_distance || false)) return true;
    if (useManualParkingDistance) {
      if (manualParkingToPickup !== (originalData.manual_km_parking_to_pickup || 0)) return true;
      if (manualDropToParking !== (originalData.manual_km_drop_to_parking || 0)) return true;
    }

    // Check useManualTripDistance changes
    if (useManualTripDistance !== (originalData.uses_manual_trip_distance || false)) return true;
    if (useManualTripDistance) {
      if (manualTripDistance !== (originalData.manual_km_trip || originalData.km_trip || 0)) return true;
    }

    // Check bus configuration changes
    if (currentData.busTypeId !== originalData.bus_type_id) return true;
    if (currentData.numberOfBuses !== originalData.number_of_buses) return true;
    if (currentData.hireType !== originalData.hire_type) return true;

    // Check date/time changes (affects extra time calculations)
    const currentPickup = new Date(currentData.pickupDateTime).getTime();
    const originalPickup = new Date(originalData.pickup_datetime).getTime();
    if (Math.abs(currentPickup - originalPickup) > 60000) return true; // 1 minute tolerance

    const currentDrop = new Date(currentData.dropDateTime).getTime();
    const originalDrop = new Date(originalData.drop_datetime).getTime();
    if (Math.abs(currentDrop - originalDrop) > 60000) return true;

    // Check intermediate stops changes
    const currentStops = intermediateStops.filter(s => s.location && s.location.trim());
    const originalStops = safeParseJSON(originalData.intermediate_stops, []);
    if (currentStops.length !== originalStops.length) return true;
    for (let i = 0; i < currentStops.length; i++) {
      if (currentStops[i].location !== originalStops[i]?.location) return true;
    }

    // Check ALL additional charges (pass-through, permits, highway, fuel, driver, distance, etc.)
    const originalCharges = safeParseJSON(originalData.additional_charges, []);
    if (additionalCharges.length !== originalCharges.length) return true;
    for (let i = 0; i < additionalCharges.length; i++) {
      const current = additionalCharges[i];
      const original = originalCharges[i];
      if (!original) return true;
      if (current.type !== original.type) return true;
      if (current.amount !== original.amount) return true;
      if (current.applyPerBus !== original.applyPerBus) return true;
      if (current.busesCount !== original.busesCount) return true;
      if ((current.distance || 0) !== (original.distance || 0)) return true;
      if ((current.reason || '') !== (original.reason || '')) return true;
    }

    // Check commission changes (affects cost calculations)
    if (currentData.commissionPct !== (originalData.commission_pct || 0)) return true;
    if (currentData.commissionPassThroughPct !== (originalData.commission_pass_through_pct || 0)) return true;

    // Check discount changes
    if (currentData.discountPct !== (originalData.discount_percentage || 0)) return true;
    if (currentData.discountAmount !== (originalData.discount_amount_lkr || 0)) return true;

    return false;
  };

  const handleSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Get current user data for created_by field
      const { data: userData } = await supabase.auth.getUser();

      // Check if discount requires admin approval
      if ((data.discountType === 'percentage' && data.discountPct > 0) ||
        (data.discountType === 'amount' && data.discountAmount > 0)) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user?.id);

        const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');

        if (!isAdmin) {
          toast({
            title: "Admin Approval Required",
            description: "Quotations with discounts require admin approval. This quotation will be marked as pending approval.",
            variant: "default"
          });
        }
      }

      // Check if route-affecting fields have changed (only for edits)
      const routeChanged = isEditing && initialData ? hasRouteChanged(data, initialData) : true;

      let costs: any;
      let distanceData: any;

      if (routeChanged) {
        // Recalculate everything - route or cost-affecting fields changed
        const result = await calculateCosts(data);
        costs = result.costs;
        distanceData = result.distanceData;
      } else {
        // PRESERVE original calculations for non-route/cost edits (e.g., company name, customer phone)
        console.log('Preserving original calculations - no route-affecting changes detected');

        costs = {
          km_parking_to_pickup: initialData.km_parking_to_pickup,
          km_trip: initialData.km_trip,
          km_drop_to_parking: initialData.km_drop_to_parking,
          fuel_cost_fuel_only: initialData.fuel_cost_fuel_only,
          hire_charge: initialData.hire_charge,
          extra_charges: initialData.extra_charges,
          gross_revenue: initialData.gross_revenue,
          driver_charge: initialData.driver_charge || 1500,
          other_expenses: safeParseJSON(initialData.other_expenses, []),
          commission_pct: initialData.commission_pct,
          commission_pass_through_pct: initialData.commission_pass_through_pct,
          commission_pass_through_amount: initialData.commission_pass_through_amount,
          commission_amount: initialData.commission_amount,
          discount_percentage: initialData.discount_percentage,
          discount_amount: initialData.discount_amount_lkr,
          // IMPORTANT: Always use CURRENT additional charges from the form state, not stale initialData
          additional_charges: additionalCharges.map(charge => ({
            type: charge.type,
            amount: charge.type === 'additional_distance' ? (charge.amount || 0) : charge.amount,
            distance: charge.type === 'additional_distance' ? charge.distance : undefined,
            reason: charge.reason || additionalChargeTypes.find(t => t.value === charge.type)?.label,
            applyPerBus: charge.applyPerBus,
            busesCount: charge.busesCount
          })),
          total_additional_charges: additionalCharges
            .filter(charge => charge.type !== 'internal_cost')
            .reduce((sum, charge) => {
              const chargeAmount = charge.type === 'additional_distance' ? (charge.amount || 0) : charge.amount;
              return sum + (charge.applyPerBus ? chargeAmount * charge.busesCount : chargeAmount);
            }, 0),
          total_expenses: initialData.total_expenses,
          net_profit: initialData.net_profit,
          customerTotalWithFuel: initialData.customer_total_with_fuel,
          bus_fleet_details: safeParseJSON(initialData.bus_fleet_details, null),
          fixed_rate: initialData.fixed_rate ?? 0,
          overtime_charge: initialData.overtime_charge ?? 0,
          overnight_charge: initialData.overnight_charge ?? 0,
          exceeding_distance_charge: initialData.exceeding_distance_charge ?? 0,
          fuel_price_per_liter: initialData.fuel_price_per_liter,
        };

        distanceData = {
          pickupCoords: [initialData.pickup_lng, initialData.pickup_lat],
          dropCoords: [initialData.drop_lng, initialData.drop_lat],
        };

        toast({
          title: "Calculations Preserved",
          description: "Original cost calculations maintained (no route changes detected)"
        });
      }

      // Filter out empty intermediate stops before creating quotation
      const validIntermediateStops = intermediateStops.filter(stop => stop.location && stop.location.trim());

      // Create audit log entry for editing
      let auditEntry = null;
      if (isEditing && initialData) {
        const currentUser = await supabase.auth.getUser();
        auditEntry = {
          action: 'UPDATE',
          timestamp: new Date().toISOString(),
          user_id: currentUser.data.user?.id,
          user_email: currentUser.data.user?.email,
          changes: {
            // Track what fields were changed
            customer_name: data.customerName !== initialData.customer_name ? { from: initialData.customer_name, to: data.customerName } : undefined,
            pickup_location: data.pickupLocation !== initialData.pickup_location ? { from: initialData.pickup_location, to: data.pickupLocation } : undefined,
            drop_location: data.dropLocation !== initialData.drop_location ? { from: initialData.drop_location, to: data.dropLocation } : undefined,

            commission_pct: data.commissionPct !== (initialData.commission_pct || 5) ? { from: initialData.commission_pct || 5, to: data.commissionPct } : undefined,
            discount_type: data.discountType !== (initialData.discount_type || 'percentage') ? { from: initialData.discount_type || 'percentage', to: data.discountType } : undefined,
            discount_percentage: data.discountPct !== (initialData.discount_percentage || 0) ? { from: initialData.discount_percentage || 0, to: data.discountPct } : undefined,
            discount_amount_lkr: data.discountAmount !== (initialData.discount_amount_lkr || 0) ? { from: initialData.discount_amount_lkr || 0, to: data.discountAmount } : undefined,
          }
        };
      }

      // Fetch current bank details from finance settings for point-in-time capture
      let bankDetails: { payment_bank_name?: string; payment_account_name?: string; payment_account_no?: string } = {};
      if (!isEditing) {
        if (effectiveCompanyId) {
          const { data: finSettings } = await supabase
            .from('special_hire_finance_settings')
            .select('quotation_bank_name, quotation_account_name, quotation_account_no')
            .eq('company_id', effectiveCompanyId)
            .limit(1)
            .maybeSingle();

          bankDetails = buildSpecialHireQuotationBankSnapshot(finSettings);
        } else {
          bankDetails = { ...SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS };
        }
      }

      // Create quotation data
      const quotationData = {
        company_name: data.companyName || null,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail || null,
        special_request: data.specialRequest || null,
        bus_type_id: isMultiBusMode ? null : (data.busTypeId || null),
        hire_type: data.hireType,
        number_of_buses: data.numberOfBuses,
        pickup_location: data.pickupLocation,
        drop_location: data.dropLocation,

        intermediate_stops: JSON.stringify(validIntermediateStops),
        number_of_passengers: data.numberOfPassengers,
        pickup_datetime: data.pickupDateTime.toISOString(),
        drop_datetime: data.dropDateTime.toISOString(),
        parking_location_id: data.parkingLocationId,
        uses_multi_parking: useMultiParking,
        uses_pickup_as_parking: usePickupAsParking,
        uses_manual_parking_distance: useManualParkingDistance,
        manual_km_parking_to_pickup: useManualParkingDistance ? manualParkingToPickup : 0,
        manual_km_drop_to_parking: useManualParkingDistance ? manualDropToParking : 0,
        pickup_lat: distanceData?.pickupCoords?.[1] || null,
        pickup_lng: distanceData?.pickupCoords?.[0] || null,
        drop_lat: distanceData?.dropCoords?.[1] || null,
        drop_lng: distanceData?.dropCoords?.[0] || null,
        // Use manual distances if enabled, otherwise use calculated
        km_parking_to_pickup: useManualParkingDistance ? manualParkingToPickup : costs.km_parking_to_pickup,
        km_trip: useManualTripDistance ? manualTripDistance : costs.km_trip,
        km_drop_to_parking: useManualParkingDistance ? manualDropToParking : costs.km_drop_to_parking,
        fuel_cost_fuel_only: costs.fuel_cost_fuel_only,
        uses_manual_trip_distance: useManualTripDistance,
        manual_km_trip: useManualTripDistance ? manualTripDistance : 0,
        hire_charge: costs.hire_charge,
        extra_charges: costs.extra_charges,
        // Store individual time charge components for retrieval/display
        fixed_rate: costs.fixed_rate || 0,
        overtime_charge: costs.overtime_charge || 0,
        overnight_charge: costs.overnight_charge || 0,
        exceeding_distance_charge: costs.exceeding_distance_charge || 0,
        gross_revenue: costs.gross_revenue,
        driver_charge: costs.driver_charge,
        other_expenses: typeof costs.other_expenses === 'string' ? costs.other_expenses : JSON.stringify(costs.other_expenses || []),
        commission_pct: costs.commission_pct,
        commission_pass_through_pct: Math.min(costs.commission_pass_through_pct, costs.commission_pct),
        commission_pass_through_amount: costs.commission_pass_through_amount,
        commission_amount: costs.commission_amount,
        discount_type: data.discountType,
        discount_percentage: costs.discount_percentage,
        discount_amount_lkr: costs.discount_amount,
        additional_charges: JSON.stringify(costs.additional_charges),
        total_additional_charges: costs.total_additional_charges,
        total_expenses: costs.total_expenses,
        net_profit: costs.net_profit,
        fuel_price_per_liter: costs.fuel_price_per_liter || costData?.fuelPricePerLiter || null,
        customer_total_with_fuel: costs.customerTotalWithFuel,
        bus_fleet_details: isMultiBusMode && costs.bus_fleet_details
          ? JSON.stringify(
            // Ensure we're saving the full object structure with buses, total_buses, etc.
            Array.isArray(costs.bus_fleet_details)
              ? {
                buses: costs.bus_fleet_details,
                total_buses: costs.bus_fleet_details.reduce((sum, b) => sum + (b.quantity || 0), 0),
                total_capacity: costs.bus_fleet_details.reduce((sum, b) => sum + ((b.seating_capacity || 0) * (b.quantity || 1)), 0),
                combined_subtotal: costs.bus_fleet_details.reduce((sum, b) => sum + (b.subtotal_all_buses || 0), 0)
              }
              : costs.bus_fleet_details
          )
          : null,
        approval_status: ((data.discountType === 'percentage' && data.discountPct > 0) ||
          (data.discountType === 'amount' && data.discountAmount > 0) ? 'pending' : 'approved') as 'pending' | 'approved' | 'rejected',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        audit_log: isEditing ? [...(initialData?.audit_log || []), auditEntry].filter(Boolean) : [],
        // Link to submission if created from one
        submission_id: submissionData?.id || null,
        // Set created_by and bank details for new quotations
        ...(isEditing ? {} : { 
          created_by: userData.user?.id,
          ...bankDetails,
        })
      };

      if (isEditing && initialData) {
        // For versioning system, don't directly update - let the parent handle it
        if (editConfig) {
          // Pass the quotation data to parent for versioning
          onSubmit(quotationData);
          return;
        }

        // Regular edit - update existing quotation
        const { error } = await supabase
          .from('special_hire_quotations')
          .update(quotationData)
          .eq('id', initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Quotation updated successfully"
        });
      } else {
        const { data: insertedQuotation, error } = await supabase
          .from('special_hire_quotations')
          .insert([quotationData])
          .select()
          .single();

        if (error) throw error;

        // Update submission with quotation_id if created from submission
        if (submissionData?.id && insertedQuotation) {
          await supabase
            .from('special_hire_submissions')
            .update({
              quotation_id: insertedQuotation.id,
              submission_status: 'processed'
            })
            .eq('id', submissionData.id);
        }

        toast({
          title: "Success",
          description: "Quotation created successfully"
        });
      }

      // Clear auto-saved data on successful submission
      clearAutoSave();

      // Auto-sync customer to accounting (non-blocking, only for new quotations)
      if (!isEditing) {
        try {
          const syncResult = await syncToAccounting({
            customer_name: data.companyName || data.customerName,
            contact_phone: data.customerPhone,
            contact_email: data.customerEmail || undefined,
            billing_address: data.pickupLocation || undefined,
            customer_type: data.companyName ? 'business' : 'individual',
            source_module: 'special_hire',
          });
          if (syncResult.success) {
            console.log(`[CustomerBridge] Special Hire customer ${syncResult.isNew ? 'created' : 'linked'} in accounting: ${syncResult.customerId}`);
          }
        } catch (syncError) {
          console.warn('[CustomerBridge] Non-blocking sync error:', syncError);
        }
      }

      // For versioning system, pass the quotation data to onSubmit
      if (editConfig) {
        onSubmit(quotationData);
      } else {
        onSubmit();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create quotation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={() => onCancel()}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] max-w-7xl h-[100dvh] sm:h-auto sm:max-h-[95vh] overflow-y-auto p-3 sm:p-4 md:p-6 rounded-none sm:rounded-xl flex flex-col bg-slate-50 dark:bg-slate-950">
          <DialogHeader className="pb-2 sm:pb-3 shrink-0 border-b mb-2">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">{isEditing ? 'Edit Special Hire Quotation' : 'New Special Hire Quotation'}</DialogTitle>
              {showAutoSaveIndicator && (
                <div className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <Save className="h-3 w-3" />
                  <span className="hidden sm:inline">Auto-saved</span>
                </div>
              )}
              {autoSaved && !showAutoSaveIndicator && (
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  <Save className="h-3 w-3" />
                  <span className="hidden sm:inline">Draft saved</span>
                </div>
              )}
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pr-1 pb-4">
                <div className="lg:col-span-8 space-y-6">
                  <Tabs defaultValue="trip" className="w-full">
                    <TabsList className="w-full grid grid-cols-1 sm:grid-cols-3 mb-6 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl h-auto gap-1">
                      <TabsTrigger value="trip" className="rounded-lg text-sm sm:text-base font-bold py-3 whitespace-normal h-auto data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">1. Trip & Customer</TabsTrigger>
                      <TabsTrigger value="charges" className="rounded-lg text-sm sm:text-base font-bold py-3 whitespace-normal h-auto data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">2. Additional Charges</TabsTrigger>
                      <TabsTrigger value="settings" className="rounded-lg text-sm sm:text-base font-bold py-3 whitespace-normal h-auto data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">3. Financial Settings</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="trip" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      {/* Customer Details */}
                      <CustomerDetailsSection />

              {/* Trip Details */}
              <TripDetailsSection
                busTypes={busTypes}
                parkingLocations={parkingLocations}
                intermediateStops={intermediateStops}
                addIntermediateStop={addIntermediateStop}
                removeIntermediateStop={removeIntermediateStop}
                updateIntermediateStop={updateIntermediateStop}
                busDetails={busDetails}
                updateBusParking={updateBusParking}
                isMultiBusMode={isMultiBusMode}
                setIsMultiBusMode={setIsMultiBusMode}
                selectedBusFleet={selectedBusFleet}
                setSelectedBusFleet={setSelectedBusFleet}
                useMultiParking={useMultiParking}
                setUseMultiParking={setUseMultiParking}
                handleMultiParkingToggle={handleMultiParkingToggle}
                usePickupAsParking={usePickupAsParking}
                setUsePickupAsParking={setUsePickupAsParking}
                useManualParkingDistance={useManualParkingDistance}
                setUseManualParkingDistance={setUseManualParkingDistance}
                manualParkingToPickup={manualParkingToPickup}
                setManualParkingToPickup={setManualParkingToPickup}
                manualDropToParking={manualDropToParking}
                setManualDropToParking={setManualDropToParking}
                originalCalculatedParkingToPickup={originalCalculatedParkingToPickup}
                originalCalculatedDropToParking={originalCalculatedDropToParking}
                useManualTripDistance={useManualTripDistance}
                setUseManualTripDistance={setUseManualTripDistance}
                manualTripDistance={manualTripDistance}
                setManualTripDistance={setManualTripDistance}
                originalCalculatedTripDistance={originalCalculatedTripDistance}
                setPickupCoords={setPickupCoords}
                setDropCoords={setDropCoords}
                costData={costData}
                setCostData={setCostData}
                watchedNumberOfBuses={watchedNumberOfBuses}
                additionalCharges={additionalCharges}
              />
              </TabsContent>

              <TabsContent value="charges" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <AdditionalChargesSection
                  additionalCharges={additionalCharges}
                  addAdditionalCharge={addAdditionalCharge}
                  removeAdditionalCharge={removeAdditionalCharge}
                  updateAdditionalCharge={updateAdditionalCharge}
                  watchedNumberOfBuses={watchedNumberOfBuses}
                  otherExpenses={otherExpenses}
                  addOtherExpense={addOtherExpense}
                  removeOtherExpense={removeOtherExpense}
                  updateOtherExpense={updateOtherExpense}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <FinancialSettingsSection
                  referralAgents={referralAgents}
                  selectedAgent={selectedAgent}
                  setShowAddAgentModal={setShowAddAgentModal}
                  handleAgentSelect={handleAgentSelect}
                  costData={costData}
                />
              </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar for Live Preview & Actions */}
        <div className="lg:col-span-4 sticky top-0 space-y-6 flex flex-col h-full pb-4">
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 rounded-xl shadow-sm border-2 border-slate-200 dark:border-slate-800 p-1">
            {/* Cost Breakdown */}
            {costData ? (
              <CostBreakdown data={costData} />
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground h-full min-h-[300px]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                  <Calculator className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No Calculations Yet</h3>
                <p className="text-sm">Fill out the trip details and click Calculate Costs to see the full financial breakdown.</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-[0.98]"
              onClick={() => form.handleSubmit(calculateCosts)()}
            >
              <Calculator className="h-5 w-5 mr-2" />
              Calculate Costs
            </Button>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <Button type="button" variant="outline" size="lg" onClick={onCancel} className="w-full h-12 text-base font-bold border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-[0.98]">
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={loading || !costData} className="w-full h-12 text-base font-bold shadow-sm transition-all active:scale-[0.98]">
                {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create Quotation')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </Form>
</DialogContent>
      </Dialog>

      {/* Add Referral Agent Modal */}
      <AddReferralAgentModal
        open={showAddAgentModal}
        onOpenChange={setShowAddAgentModal}
        onAgentAdded={handleAgentAdded}
      />
    </>
  );
}