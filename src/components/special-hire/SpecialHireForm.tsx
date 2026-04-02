 
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
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';

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
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 rounded-none sm:rounded-lg">
          <DialogHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base sm:text-lg md:text-xl">{isEditing ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
              {showAutoSaveIndicator && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Save className="h-3 w-3" />
                  <span className="hidden sm:inline">Auto-saved</span>
                </div>
              )}
              {autoSaved && !showAutoSaveIndicator && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Save className="h-3 w-3" />
                  <span className="hidden sm:inline">Draft saved</span>
                </div>
              )}
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Customer Details */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
                  <CardTitle className="text-sm sm:text-base md:text-lg">Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Company (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Company name" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Customer Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Customer name" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Phone *</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Email (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Email address" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="specialRequest"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Special Request</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any special requirements..." {...field} className="min-h-[60px] sm:min-h-[80px] resize-none text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Trip Details */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
                  <CardTitle className="text-sm sm:text-base md:text-lg">Trip Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
                  {/* Multi-Bus Fleet Mode Toggle */}
                  <div>
                    <Card className="bg-muted/50">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <Label className="text-xs sm:text-sm font-semibold">Bus Fleet Selection</Label>
                            <p className="text-xs text-muted-foreground">Multiple bus types</p>
                          </div>
                          <Switch
                            checked={isMultiBusMode}
                            onCheckedChange={(checked) => {
                              setIsMultiBusMode(checked);
                              if (!checked) {
                                // Reset to single bus mode
                                setSelectedBusFleet([{ id: crypto.randomUUID(), busTypeId: '', quantity: 1 }]);
                              }
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {!isMultiBusMode ? (
                      // Single Bus Type Mode
                      <FormField
                        control={form.control}
                        name="busTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bus Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select bus type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {busTypes.map((busType) => (
                                  <SelectItem key={busType.id} value={busType.id}>
                                    {busType.name} (Capacity: {busType.capacity})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      // Multi-Bus Fleet Mode - Show fleet summary in header
                      <div className="lg:col-span-1">
                        <Label>Fleet Summary</Label>
                        <div className="text-sm mt-2 p-3 bg-primary/10 rounded-md">
                          <div className="font-medium">Total Buses: {selectedBusFleet.reduce((sum, bus) => sum + (bus.quantity || 0), 0)}</div>
                          <div className="text-muted-foreground">Total Capacity: {selectedBusFleet.reduce((sum, bus) => {
                            const busType = busTypes.find(bt => bt.id === bus.busTypeId);
                            return sum + ((busType?.capacity || 0) * (bus.quantity || 0));
                          }, 0)} seats</div>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="hireType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Outside">Outside</SelectItem>
                              <SelectItem value="Lyceum">Lyceum</SelectItem>
                              <SelectItem value="Internal">Internal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parkingLocationId"
                      render={({ field }) => (
                        <FormItem className={(useMultiParking || usePickupAsParking) ? "opacity-50 pointer-events-none" : ""}>
                          <FormLabel>Parking Location * {useMultiParking && "(Disabled - Using multi-parking)"}{usePickupAsParking && "(Using pickup location)"}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={useMultiParking || usePickupAsParking}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select parking location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parkingLocations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {location.parking_location_name}
                                    {location.is_default && <Badge variant="secondary">Default</Badge>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Pickup as Parking toggle */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Pickup Location Same as Parking</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={usePickupAsParking}
                          onCheckedChange={(enabled) => {
                            setUsePickupAsParking(enabled);
                            // Disable multi-parking when pickup=parking
                            if (enabled && useMultiParking) {
                              setUseMultiParking(false);
                            }
                          }}
                          disabled={useMultiParking}
                        />
                        <Label className="text-sm text-muted-foreground">
                          {usePickupAsParking ? "Bus starts from customer pickup - no empty run" : "Enable if bus starts from pickup point"}
                        </Label>
                      </div>

                      {/* Manual Parking Distance Override toggle */}
                      {costData && !usePickupAsParking && (
                        <div className="space-y-2 border-t pt-4">
                          <Label className="text-sm font-medium">Manual Parking Distance Override</Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={useManualParkingDistance}
                              onCheckedChange={(enabled) => {
                                setUseManualParkingDistance(enabled);
                                if (enabled) {
                                  // Initialize with current calculated distances if not already set
                                  if (manualParkingToPickup === 0 && costData?.kmParkingToPickup) {
                                    setManualParkingToPickup(costData.kmParkingToPickup);
                                  }
                                  if (manualDropToParking === 0 && costData?.kmDropToParking) {
                                    setManualDropToParking(costData.kmDropToParking);
                                  }
                                  // Store original calculated distances for reset
                                  if (costData?.kmParkingToPickup) {
                                    setOriginalCalculatedParkingToPickup(costData.kmParkingToPickup);
                                  }
                                  if (costData?.kmDropToParking) {
                                    setOriginalCalculatedDropToParking(costData.kmDropToParking);
                                  }
                                }
                              }}
                              disabled={usePickupAsParking}
                            />
                            <Label className="text-sm text-muted-foreground">
                              {useManualParkingDistance ? "Enter custom parking distances manually" : "Override Google Maps calculated distances"}
                            </Label>
                          </div>

                          {useManualParkingDistance && (
                            <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm">Parking → Pickup (km)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={manualParkingToPickup}
                                    onChange={(e) => setManualParkingToPickup(parseFloat(e.target.value) || 0)}
                                    className="h-10"
                                  />
                                  {originalCalculatedParkingToPickup > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Google calculated: {originalCalculatedParkingToPickup} km
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm">Drop → Parking (km)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={manualDropToParking}
                                    onChange={(e) => setManualDropToParking(parseFloat(e.target.value) || 0)}
                                    className="h-10"
                                  />
                                  {originalCalculatedDropToParking > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Google calculated: {originalCalculatedDropToParking} km
                                    </div>
                                  )}
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full"
                                onClick={async () => {
                                  if (!costData) return;
                                  setLoading(true);
                                  try {
                                    // Recalculate fuel costs with manual distances
                                    const totalEmptyRun = manualParkingToPickup + manualDropToParking;
                                    const { data: fuelSettings } = await supabase
                                      .from('fuel_settings')
                                      .select('*')
                                      .eq('id', form.getValues('parkingLocationId'))
                                      .single();

                                    const { data: busTypeData } = await supabase
                                      .from('bus_types')
                                      .select('avg_km_per_l')
                                      .eq('id', form.getValues('busTypeId'))
                                      .single();

                                    const busEfficiency = busTypeData?.avg_km_per_l || 8;
                                    const fuelPrice = fuelSettings?.diesel_price_lkr_per_l || 0;
                                    const numberOfBuses = form.getValues('numberOfBuses') || 1;

                                    // Calculate new fuel cost (empty run only - for customer billing)
                                    const newFuelCost = Math.round((totalEmptyRun / busEfficiency) * fuelPrice * numberOfBuses);

                                    // Update costData with manual distances
                                    setCostData({
                                      ...costData,
                                      kmParkingToPickup: manualParkingToPickup,
                                      kmDropToParking: manualDropToParking,
                                      fuelCostFuelOnly: newFuelCost,
                                      useManualParkingDistance: true,
                                      // Recalculate totals
                                      customerTotalWithFuel: (costData.hireCharge || 0) + newFuelCost +
                                        (costData.totalAdditionalCharges || 0) - (costData.discountAmount || 0) +
                                        (costData.commissionPassThroughAmount || 0),
                                    });

                                    toast({
                                      title: "Distances Updated",
                                      description: `Manual: Parking→Pickup: ${manualParkingToPickup}km, Drop→Parking: ${manualDropToParking}km`,
                                    });
                                  } catch (error) {
                                    console.error('Error recalculating with manual distances:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to recalculate with manual distances",
                                      variant: "destructive"
                                    });
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                disabled={loading}
                              >
                                <Calculator className="h-4 w-4 mr-2" />
                                Recalculate with Manual Distances
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground"
                                onClick={() => {
                                  setManualParkingToPickup(originalCalculatedParkingToPickup);
                                  setManualDropToParking(originalCalculatedDropToParking);
                                }}
                              >
                                Reset to Google Calculated Values
                              </Button>
                            </div>
                          )}

                          {useManualParkingDistance && (
                            <Badge variant="secondary" className="mt-1">
                              Manual parking distances will be saved with quotation
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Manual Trip Distance Override */}
                      {costData && !usePickupAsParking && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Manual Trip Distance Override</Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={useManualTripDistance}
                              onCheckedChange={(checked) => {
                                setUseManualTripDistance(checked);
                                if (checked && costData?.kmTrip) {
                                  // Initialize with current calculated value
                                  setManualTripDistance(costData.kmTrip);
                                  setOriginalCalculatedTripDistance(costData.kmTrip);
                                }
                              }}
                            />
                            <Label className="text-sm text-muted-foreground">
                              {useManualTripDistance ? "Enter custom trip distance manually" : "Override Google Maps trip distance"}
                            </Label>
                          </div>

                          {useManualTripDistance && (
                            <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
                              <div className="space-y-2">
                                <Label className="text-sm">Trip Distance: Pickup → Drop (km)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={manualTripDistance}
                                  onChange={(e) => setManualTripDistance(parseFloat(e.target.value) || 0)}
                                  className="h-10"
                                />
                                {originalCalculatedTripDistance > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Google calculated: {originalCalculatedTripDistance} km
                                  </div>
                                )}
                              </div>

                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full"
                                onClick={async () => {
                                  if (!costData) return;
                                  setLoading(true);
                                  try {
                                    // Get form values for recalculation
                                    const formValues = form.getValues();
                                    const kmParkingToPickup = useManualParkingDistance ? manualParkingToPickup : costData.kmParkingToPickup;
                                    const kmDropToParking = useManualParkingDistance ? manualDropToParking : costData.kmDropToParking;
                                    const totalDistance = kmParkingToPickup + manualTripDistance + kmDropToParking;
                                    const numberOfBuses = formValues.numberOfBuses || 1;

                                    // Get fuel settings for selected parking location
                                    const { data: fuelSettings } = await supabase
                                      .from('fuel_settings')
                                      .select('*')
                                      .eq('id', formValues.parkingLocationId)
                                      .single();

                                    const { data: busTypeData } = await supabase
                                      .from('bus_types')
                                      .select('avg_km_per_l')
                                      .eq('id', formValues.busTypeId)
                                      .single();

                                    // Get rate cards for hire type
                                    const rateCardHireType = formValues.hireType === 'Internal' ? 'Lyceum' : formValues.hireType;
                                    const { data: allRateCards } = await supabase
                                      .from('hire_rate_cards')
                                      .select('*')
                                      .eq('hire_type', rateCardHireType)
                                      .eq('bus_type_id', formValues.busTypeId)
                                      .eq('is_active', true)
                                      .order('from_km');

                                    if (!allRateCards || allRateCards.length === 0) {
                                      throw new Error('No rate cards found');
                                    }

                                    const busEfficiency = busTypeData?.avg_km_per_l || 8;
                                    const fuelPrice = fuelSettings?.diesel_price_lkr_per_l || 0;

                                    // FULL RECALCULATION: Rate matching, exceeding KM, and overtime
                                    let rateCard = null;
                                    let fixedRate = 0;
                                    let exceedingDistanceCharge = 0;
                                    let baseCoverageKm = 100;
                                    let exceedingKm = 0;

                                    // Match rate card based on new manual distance
                                    if (formValues.hireType !== 'Outside') {
                                      rateCard = allRateCards.find(card =>
                                        manualTripDistance >= (card.from_km || 0) &&
                                        (card.to_km === null || manualTripDistance <= card.to_km)
                                      ) || allRateCards[0];

                                      fixedRate = rateCard?.flat_fee_lkr || 0;

                                      if (manualTripDistance > 100) {
                                        const exceedingRateCard = allRateCards.find(card =>
                                          card.from_km >= 101 && card.exceeding_km_rate_lkr != null
                                        );
                                        if (exceedingRateCard) {
                                          baseCoverageKm = exceedingRateCard.exceeding_km_threshold || 100;
                                          exceedingKm = Math.max(0, manualTripDistance - baseCoverageKm);
                                          exceedingDistanceCharge = exceedingKm * (exceedingRateCard.exceeding_km_rate_lkr || 0);
                                        }
                                      }
                                    } else {
                                      rateCard = allRateCards.find(c => c.flat_fee_lkr != null && c.exceeding_km_rate_lkr != null) || allRateCards[0];
                                      fixedRate = rateCard?.flat_fee_lkr || 0;
                                      baseCoverageKm = rateCard?.exceeding_km_threshold || 100;
                                      exceedingKm = Math.max(0, manualTripDistance - baseCoverageKm);
                                      exceedingDistanceCharge = exceedingKm * (rateCard?.exceeding_km_rate_lkr || 0);
                                    }

                                    // RECALCULATE OVERTIME/OVERNIGHT with new distance
                                    let overtimeCharge = 0;
                                    let overnightCharge = 0;

                                    if (rateCard) {
                                      if (formValues.hireType === 'Outside') {
                                        // Outside hire: available hours = distance / 10 km/h
                                        const extraTimeResult = calculateExtraTimeCharge(
                                          manualTripDistance,
                                          formValues.pickupDateTime,
                                          formValues.dropDateTime,
                                          {
                                            baselineSpeedKmph: 10,
                                            hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
                                            nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
                                            useStandardHours: false
                                          }
                                        );
                                        overtimeCharge = extraTimeResult.overtimeCharge;
                                        overnightCharge = extraTimeResult.overnightCharge;
                                      } else {
                                        // Lyceum/Internal: use km/10 same as Outside
                                        const extraTimeResult = calculateExtraTimeCharge(
                                          manualTripDistance,
                                          formValues.pickupDateTime,
                                          formValues.dropDateTime,
                                          {
                                            baselineSpeedKmph: 10,
                                            hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
                                            nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
                                            useStandardHours: false  // Use km/10 same as Outside
                                          }
                                        );
                                        overtimeCharge = extraTimeResult.overtimeCharge;
                                        overnightCharge = extraTimeResult.overnightCharge;
                                      }
                                    }

                                    const totalExtraTimeCharge = overtimeCharge + overnightCharge;
                                    const hireCharge = fixedRate + exceedingDistanceCharge + totalExtraTimeCharge;
                                    const grossRevenue = hireCharge * numberOfBuses;

                                    // Calculate fuel cost (empty run only for customer billing)
                                    const emptyRunDistance = kmParkingToPickup + kmDropToParking;
                                    const newFuelCost = Math.round((emptyRunDistance / busEfficiency) * fuelPrice * numberOfBuses);

                                    // Recalculate commission on new gross revenue
                                    const preCommissionTotal = grossRevenue + newFuelCost +
                                      (costData.totalAdditionalCharges || 0) - (costData.discountAmount || 0);
                                    const safePassThroughPct = Math.min(formValues.commissionPassThroughPct, formValues.commissionPct);
                                    const commissionPassThroughAmount = preCommissionTotal * (safePassThroughPct / 100);
                                    const commissionExpense = preCommissionTotal * (formValues.commissionPct / 100);
                                    const finalCustomerTotal = preCommissionTotal + commissionPassThroughAmount;

                                    // Calculate available hours for display
                                    const actualHrs = (new Date(formValues.dropDateTime).getTime() - new Date(formValues.pickupDateTime).getTime()) / (1000 * 60 * 60);
                                    const availableHrs = manualTripDistance / 10; // km/10 for ALL hire types
                                    const overtimeHrs = Math.max(0, actualHrs - availableHrs);

                                    // Update costData with FULL recalculation
                                    setCostData({
                                      ...costData,
                                      kmTrip: manualTripDistance,
                                      totalTripDistance: totalDistance,
                                      totalDistance: totalDistance,
                                      useManualTripDistance: true,
                                      // Updated hire charges
                                      hireCharge: Math.round(hireCharge),
                                      fixedRate: Math.round(fixedRate),
                                      exceedingDistanceCharge: Math.round(exceedingDistanceCharge),
                                      overtimeCharge: Math.round(overtimeCharge),
                                      overnightCharge: Math.round(overnightCharge),
                                      grossRevenue: Math.round(grossRevenue),
                                      fuelCostFuelOnly: newFuelCost,
                                      // Updated commission
                                      commissionAmount: Math.round(commissionExpense),
                                      commissionPassThroughAmount: Math.round(commissionPassThroughAmount),
                                      customerTotalWithFuel: Math.round(finalCustomerTotal),
                                      // Updated rate card details
                                      rateCardDetails: {
                                        ...(costData.rateCardDetails || {}),
                                        standardHours: rateCard?.standard_hours || 8,
                                        actualHours: Math.round(actualHrs * 100) / 100,
                                        availableHours: Math.round(availableHrs * 100) / 100,
                                        overtimeHours: Math.round(overtimeHrs * 100) / 100,
                                        exceedingKm: exceedingKm,
                                        chargeableExceedingKm: exceedingKm,
                                      }
                                    });

                                    toast({
                                      title: "Full Recalculation Complete",
                                      description: `Manual trip: ${manualTripDistance} km | Hire: LKR ${Math.round(hireCharge).toLocaleString()} | Total: LKR ${Math.round(finalCustomerTotal).toLocaleString()}`,
                                    });
                                  } catch (error) {
                                    console.error('Error recalculating with manual trip distance:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to recalculate with manual trip distance",
                                      variant: "destructive"
                                    });
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                disabled={loading}
                              >
                                <Calculator className="h-4 w-4 mr-2" />
                                Recalculate with Manual Trip Distance
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground"
                                onClick={() => {
                                  setManualTripDistance(originalCalculatedTripDistance);
                                }}
                              >
                                Reset to Google Calculated Value
                              </Button>
                            </div>
                          )}

                          {useManualTripDistance && (
                            <Badge variant="secondary" className="mt-1">
                              Manual trip distance will be saved with quotation
                            </Badge>
                          )}
                        </div>
                      )}
                      {usePickupAsParking && (
                        <Badge variant="secondary" className="mt-1">
                          No parking → pickup & drop → parking costs
                        </Badge>
                      )}
                    </div>

                    {/* Multi-parking toggle */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Different parking locations per bus</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={useMultiParking}
                          onCheckedChange={handleMultiParkingToggle}
                          disabled={watchedNumberOfBuses === 1 || usePickupAsParking}
                        />
                        <Label className="text-sm text-muted-foreground">
                          {usePickupAsParking ? "Disabled - using pickup as parking" :
                            watchedNumberOfBuses === 1 ? "Single bus - multi-parking not needed" : "Enable for multiple bus locations"}
                        </Label>
                      </div>
                    </div>

                    {!isMultiBusMode && (
                      <FormField
                        control={form.control}
                        name="numberOfBuses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Buses *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Multi-Bus Fleet Selection UI */}
                  {isMultiBusMode && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Fleet Configuration</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBusFleet([...selectedBusFleet, {
                              id: crypto.randomUUID(),
                              busTypeId: '',
                              quantity: 1
                            }]);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Bus Type
                        </Button>
                      </div>

                      {selectedBusFleet.map((bus, index) => (
                        <Card key={bus.id} className="bg-card">
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-12 gap-4 items-end">
                              <div className="col-span-6">
                                <Label>Bus Type</Label>
                                <Select
                                  value={bus.busTypeId}
                                  onValueChange={(value) => {
                                    const updated = [...selectedBusFleet];
                                    updated[index] = { ...updated[index], busTypeId: value };
                                    setSelectedBusFleet(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select bus type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {busTypes.map((busType) => (
                                      <SelectItem key={busType.id} value={busType.id}>
                                        {busType.name} ({busType.capacity} seats)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="col-span-3">
                                <Label>Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={bus.quantity}
                                  onChange={(e) => {
                                    const updated = [...selectedBusFleet];
                                    updated[index] = { ...updated[index], quantity: parseInt(e.target.value) || 1 };
                                    setSelectedBusFleet(updated);
                                  }}
                                />
                              </div>

                              <div className="col-span-3 flex items-center gap-2">
                                {(() => {
                                  const busType = busTypes.find(bt => bt.id === bus.busTypeId);
                                  return busType ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {bus.quantity}x {busType.name} = {bus.quantity * busType.capacity} seats
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Select bus type
                                    </Badge>
                                  );
                                })()}
                                {selectedBusFleet.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedBusFleet(selectedBusFleet.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="pickupLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Location *</FormLabel>
                          <FormControl>
                            <LocationAutocomplete
                              value={field.value || ""}
                              onChange={(value, coords) => {
                                field.onChange(value);
                                // CRITICAL: Capture coordinates to prevent re-geocoding errors
                                if (coords) {
                                  setPickupCoords(coords);
                                }
                              }}
                              placeholder="Enter pickup location"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dropLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drop Location *</FormLabel>
                          <FormControl>
                            <LocationAutocomplete
                              value={field.value || ""}
                              onChange={(value, coords) => {
                                field.onChange(value);
                                // CRITICAL: Capture coordinates to prevent re-geocoding errors
                                if (coords) {
                                  setDropCoords(coords);
                                }
                              }}
                              placeholder="Enter drop location"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>


                  {/* Intermediate Stops */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Intermediate Stops</label>
                      <Button type="button" variant="outline" size="sm" onClick={addIntermediateStop}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stop
                      </Button>
                    </div>

                    {intermediateStops.map((stop, index) => (
                      <div key={stop.id} className="flex items-center gap-2">
                        <LocationAutocomplete
                          value={stop.location}
                          onChange={(value, coords) => updateIntermediateStop(stop.id, value, coords)}
                          placeholder={`Stop ${index + 1} location`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIntermediateStop(stop.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Additional Distance Summary */}
                    {additionalCharges.some(charge => charge.type === 'additional_distance' && charge.distance > 0) && (
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                        <h4 className="text-sm font-medium text-foreground mb-2">Route Distance Summary</h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Base trip distance:</span>
                            <span>{costData ? `${costData.kmTrip} KM` : 'Calculate to see'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Additional distance:</span>
                            <span>
                              {additionalCharges
                                .filter(charge => charge.type === 'additional_distance')
                                .reduce((sum, charge) => sum + (charge.distance || 0), 0)} KM
                            </span>
                          </div>
                          <div className="flex justify-between font-medium text-foreground border-t pt-1">
                            <span>Total trip distance:</span>
                            <span>
                              {costData
                                ? `${costData.kmTrip + additionalCharges
                                  .filter(charge => charge.type === 'additional_distance')
                                  .reduce((sum, charge) => sum + (charge.distance || 0), 0)} KM`
                                : 'Calculate to see'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-parking bus details */}
                  {useMultiParking && busDetails.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">Bus Parking Locations</h4>
                        <Badge variant="outline">{busDetails.length} buses</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {busDetails.map((bus) => (
                          <Card key={bus.busNumber} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Bus {bus.busNumber}</span>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Parking Location</Label>
                                <Select
                                  value={bus.parkingLocationId}
                                  onValueChange={(value) => updateBusParking(bus.busNumber, value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {parkingLocations.map((location) => (
                                      <SelectItem key={location.id} value={location.id}>
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3 w-3" />
                                          {location.parking_location_name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="numberOfPassengers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Passengers *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pickupDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Date & Time *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP HH:mm")
                                  ) : (
                                    <span>Pick date & time</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <div className="flex">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    if (date) {
                                      const newDateTime = new Date(date);
                                      if (field.value) {
                                        newDateTime.setHours(field.value.getHours());
                                        newDateTime.setMinutes(field.value.getMinutes());
                                      }
                                      field.onChange(newDateTime);
                                    }
                                  }}
                                  disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return date < today;
                                  }}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                                <div className="border-l p-3 space-y-3">
                                  <div className="text-sm font-medium">Time</div>
                                  <div className="space-y-2">
                                    <Input
                                      type="time"
                                      value={field.value ? format(field.value, "HH:mm") : ""}
                                      onChange={(e) => {
                                        if (e.target.value && field.value) {
                                          const [hours, minutes] = e.target.value.split(':');
                                          const newDateTime = new Date(field.value);
                                          newDateTime.setHours(parseInt(hours));
                                          newDateTime.setMinutes(parseInt(minutes));
                                          field.onChange(newDateTime);
                                        }
                                      }}
                                      className="w-[120px]"
                                    />
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dropDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drop Date & Time *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP HH:mm")
                                  ) : (
                                    <span>Pick date & time</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <div className="flex">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    if (date) {
                                      const newDateTime = new Date(date);
                                      if (field.value) {
                                        newDateTime.setHours(field.value.getHours());
                                        newDateTime.setMinutes(field.value.getMinutes());
                                      }
                                      field.onChange(newDateTime);
                                    }
                                  }}
                                  disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return date < today;
                                  }}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                                <div className="border-l p-3 space-y-3">
                                  <div className="text-sm font-medium">Time</div>
                                  <div className="space-y-2">
                                    <Input
                                      type="time"
                                      value={field.value ? format(field.value, "HH:mm") : ""}
                                      onChange={(e) => {
                                        if (e.target.value && field.value) {
                                          const [hours, minutes] = e.target.value.split(':');
                                          const newDateTime = new Date(field.value);
                                          newDateTime.setHours(parseInt(hours));
                                          newDateTime.setMinutes(parseInt(minutes));
                                          field.onChange(newDateTime);
                                        } else if (e.target.value) {
                                          // If no date is set, set to today with selected time
                                          const [hours, minutes] = e.target.value.split(':');
                                          const newDateTime = new Date();
                                          newDateTime.setHours(parseInt(hours));
                                          newDateTime.setMinutes(parseInt(minutes));
                                          field.onChange(newDateTime);
                                        }
                                      }}
                                      className="w-[120px]"
                                    />
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Additional Charges */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="text-xl font-bold text-foreground">
                          Additional Charges
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={addAdditionalCharge}
                          className="text-base font-medium px-6 py-3 h-12"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Add Charge
                        </Button>
                      </div>

                      {additionalCharges.map((charge, index) => (
                        <Card key={charge.id} className="p-8 border-2 border-muted bg-card shadow-lg">
                          <div className="space-y-8">
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-2xl font-bold text-foreground">Additional Charge #{index + 1}</h4>
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => removeAdditionalCharge(charge.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 px-6 py-3 h-12"
                              >
                                <Trash2 className="w-5 h-5 mr-2" />
                                Remove
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                              <div className="space-y-4">
                                <Label className="text-lg font-bold text-foreground">
                                  Charge Type *
                                </Label>
                                <Select
                                  value={charge.type}
                                  onValueChange={(value) => updateAdditionalCharge(charge.id, 'type', value)}
                                >
                                  <SelectTrigger className="h-14 text-lg">
                                    <SelectValue placeholder="Select charge type" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border border-border z-50">
                                    {additionalChargeTypes.map((type) => (
                                      <SelectItem
                                        key={type.value}
                                        value={type.value}
                                        className="cursor-pointer hover:bg-accent text-lg py-3"
                                      >
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {charge.type === 'additional_distance' ? (
                                <div className="space-y-4">
                                  <Label className="text-lg font-bold text-foreground">
                                    Additional Distance (KM) *
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={charge.distance || ''}
                                    onChange={(e) => updateAdditionalCharge(charge.id, 'distance', parseFloat(e.target.value) || 0)}
                                    placeholder="Enter additional kilometers (e.g., 50)"
                                    className="h-14 text-lg"
                                  />
                                  {charge.distance && charge.distance > 0 && (
                                    <div className="p-4 bg-muted/30 rounded-lg">
                                      <p className="text-sm text-muted-foreground">
                                        Auto-calculated charge: {charge.distance} KM × Exceeding Rate = LKR {(charge.amount || 0).toLocaleString()}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <Label className="text-lg font-bold text-foreground">
                                    Amount (LKR) *
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={charge.amount}
                                    onChange={(e) => updateAdditionalCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)}
                                    placeholder="Enter amount (negative for refunds)"
                                    className="h-14 text-lg"
                                  />
                                  {charge.amount < 0 && (
                                    <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                                      💡 Negative amounts will reduce the total cost
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {charge.type === 'other' && (
                              <div className="space-y-4">
                                <Label className="text-lg font-bold text-foreground">
                                  Reason / Description *
                                </Label>
                                <Input
                                  value={charge.reason || ''}
                                  onChange={(e) => updateAdditionalCharge(charge.id, 'reason', e.target.value)}
                                  placeholder="Please specify the reason for this charge"
                                  className="h-14 text-lg"
                                />
                              </div>
                            )}

                            {charge.type === 'internal_cost' && (
                              <div className="space-y-4">
                                <Label className="text-lg font-bold text-foreground">
                                  Cost Description *
                                </Label>
                                <Input
                                  value={charge.reason || ''}
                                  onChange={(e) => updateAdditionalCharge(charge.id, 'reason', e.target.value)}
                                  placeholder="e.g., wages, staff costs, operational expenses"
                                  className="h-14 text-lg"
                                />
                                <p className="text-sm text-muted-foreground">
                                  This cost will be deducted from profit but NOT charged to the customer
                                </p>
                              </div>
                            )}

                            {/* Per Bus Application Settings */}
                            <div className="border-t pt-6 space-y-6">
                              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <div className="space-y-2">
                                  <Label className="text-lg font-bold text-foreground">
                                    Apply to Multiple Buses
                                  </Label>
                                  <p className="text-base text-muted-foreground">
                                    Enable this if the charge should be applied per bus
                                  </p>
                                </div>
                                <Switch
                                  checked={charge.applyPerBus}
                                  onCheckedChange={(checked) => updateAdditionalCharge(charge.id, 'applyPerBus', checked)}
                                  className="scale-125"
                                />
                              </div>

                              {charge.applyPerBus && (
                                <div className="space-y-4">
                                  <Label className="text-lg font-bold text-foreground">
                                    Number of Buses *
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={watchedNumberOfBuses}
                                    value={charge.busesCount}
                                    onChange={(e) => updateAdditionalCharge(charge.id, 'busesCount', e.target.value ? parseInt(e.target.value) : 1)}
                                    placeholder="Enter number of buses"
                                    className="h-14 text-lg w-40"
                                  />
                                  <p className="text-base text-muted-foreground">
                                    Maximum: {watchedNumberOfBuses} buses (total buses for this trip)
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Other Expenses (Internal Costs) */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-2">
                          <div className="text-xl font-bold text-foreground">
                            Other Expenses (Internal Costs)
                          </div>
                          <p className="text-base text-muted-foreground">
                            Internal expenses that will be deducted from profit (not charged to customer)
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addOtherExpense}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Expense
                        </Button>
                      </div>

                      {otherExpenses.map((expense, index) => (
                        <Card key={expense.id} className="p-4 border border-muted bg-muted/20">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-sm font-medium text-foreground">Expense Description</Label>
                              <Input
                                value={expense.label}
                                onChange={(e) => updateOtherExpense(expense.id, 'label', e.target.value)}
                                placeholder="e.g., Office Expenses, Staff Costs, etc."
                                className="mt-1"
                              />
                            </div>
                            <div className="w-32">
                              <Label className="text-sm font-medium text-foreground">Amount (LKR)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={expense.amount}
                                onChange={(e) => updateOtherExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="mt-1"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeOtherExpense(expense.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-6"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>


                    {/* Commission and Discount Settings */}
                    <div className="space-y-4">
                      <div className="text-base font-semibold text-foreground">
                        Commission & Discount Settings
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="commissionPct"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-foreground">
                                Total Commission (%)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  placeholder="5.0"
                                  className="h-10 text-base"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                              <div className="text-xs text-muted-foreground">
                                Commission that company pays
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="commissionPassThroughPct"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-foreground">
                                Pass to Customer (%)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max={form.watch('commissionPct') || 100}
                                  placeholder="0.0"
                                  className="h-10 text-base"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                              <div className="text-xs text-muted-foreground">
                                Commission added to customer bill (max: {form.watch('commissionPct') || 0}%)
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="discountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-foreground">Discount Type</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue('discountPct', 0);
                                  form.setValue('discountAmount', 0);
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10 text-base">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                                  <SelectItem value="amount">Fixed Amount (LKR)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch('discountType') === 'percentage' ? (
                          <FormField
                            control={form.control}
                            name="discountPct"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-foreground">
                                  Discount Percentage (%)
                                  {field.value > 0 && (
                                    <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-300">
                                      Admin Approval Required
                                    </Badge>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="0.0"
                                    className="h-10 text-base"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                                <div className="text-xs text-muted-foreground">
                                  {field.value > 0
                                    ? `${field.value}% discount will be applied (requires admin approval)`
                                    : 'Percentage discount to subtract from total'
                                  }
                                </div>
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name="discountAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-foreground">
                                  Discount Amount (LKR)
                                  {field.value > 0 && (
                                    <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-300">
                                      Admin Approval Required
                                    </Badge>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="h-10 text-base"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                                <div className="text-xs text-muted-foreground">
                                  {field.value > 0
                                    ? `LKR ${field.value.toLocaleString()} discount will be applied (requires admin approval)`
                                    : 'Fixed amount discount to subtract from total'
                                  }
                                </div>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Referral Agent Section */}
                      <div className="col-span-2 border-t pt-8 mt-6 bg-muted/20 -mx-6 px-6 pb-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <Users className="h-6 w-6 text-primary" />
                          <div className="text-lg font-bold">Referral Agent</div>
                          <div className="text-sm text-muted-foreground font-medium">(Optional)</div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Agent Selector - Full width on large screens */}
                          <div className="lg:col-span-3">
                            <FormField
                              control={form.control}
                              name="referralAgentId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-semibold">Select Agent</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      if (value === 'add-new') {
                                        setShowAddAgentModal(true);
                                      } else {
                                        field.onChange(value);
                                        handleAgentSelect(value);
                                      }
                                    }}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-12 text-base">
                                        <SelectValue placeholder="Choose an agent or add new" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="add-new">
                                        <div className="flex items-center gap-2 py-1 font-medium text-primary">
                                          <Plus className="h-4 w-4" />
                                          Add New Agent
                                        </div>
                                      </SelectItem>
                                      {referralAgents.length > 0 && (
                                        <>
                                          <Separator className="my-1" />
                                          {referralAgents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                              <div className="py-1">
                                                <div className="font-semibold text-base">{agent.agent_name}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                  <span>{agent.phone || 'No phone'}</span>
                                                  <span>•</span>
                                                  <span className="font-medium">{agent.total_referrals} referrals</span>
                                                  <span>•</span>
                                                  <span className="font-medium">LKR {agent.total_commission_earned?.toLocaleString() || '0'}</span>
                                                </div>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Commission Percentage */}
                          <FormField
                            control={form.control}
                            name="referralCommissionPct"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Commission %</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="3.0"
                                    className="h-12 text-base font-medium"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    disabled={!form.watch('referralAgentId')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Calculated Commission Amount (Read-only) */}
                          <FormItem className="lg:col-span-2">
                            <FormLabel className="text-base font-semibold">Commission Amount</FormLabel>
                            <Input
                              type="text"
                              value={
                                form.watch('referralAgentId') && costData?.customerTotalWithFuel
                                  ? `LKR ${Math.round((costData.customerTotalWithFuel * form.watch('referralCommissionPct')) / 100).toLocaleString()}`
                                  : 'LKR 0'
                              }
                              disabled
                              className="h-12 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-lg font-bold text-green-700 dark:text-green-400"
                            />
                            <div className="text-sm text-muted-foreground mt-2 font-medium">
                              Auto-calculated from total revenue
                            </div>
                          </FormItem>
                        </div>

                        {/* Show Agent Stats */}
                        {selectedAgent && form.watch('referralAgentId') && (
                          <div className="mt-8 p-6 bg-white dark:bg-slate-900 rounded-xl border-2 shadow-sm">
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-6">
                              Agent Performance History
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Stat 1 - Total Trips */}
                              <div className="space-y-3 p-5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200/70 dark:border-blue-800/50">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                  <TrendingUp className="h-5 w-5" />
                                  <span className="text-xs font-bold uppercase tracking-wide">Total Trips</span>
                                </div>
                                <div className="text-4xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
                                  {selectedAgent.total_referrals}
                                </div>
                                <div className="text-base font-medium text-blue-700 dark:text-blue-300">
                                  Trips Referred
                                </div>
                              </div>

                              {/* Stat 2 - Commission Earned */}
                              <div className="space-y-3 p-5 rounded-lg bg-green-50/70 dark:bg-green-950/30 border-2 border-green-200/70 dark:border-green-800/50">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                  <DollarSign className="h-5 w-5" />
                                  <span className="text-xs font-bold uppercase tracking-wide">Earned</span>
                                </div>
                                <div className="text-3xl font-bold tracking-tight text-green-900 dark:text-green-100">
                                  LKR {selectedAgent.total_commission_earned?.toLocaleString() || '0'}
                                </div>
                                <div className="text-base font-medium text-green-700 dark:text-green-300">
                                  Total Commission
                                </div>
                              </div>

                              {/* Stat 3 - Contact */}
                              {selectedAgent.phone && (
                                <div className="space-y-3 p-5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border-2 border-purple-200/70 dark:border-purple-800/50">
                                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                    <Phone className="h-5 w-5" />
                                    <span className="text-xs font-bold uppercase tracking-wide">Contact</span>
                                  </div>
                                  <div className="text-2xl font-bold tracking-tight text-purple-900 dark:text-purple-100">
                                    {selectedAgent.phone}
                                  </div>
                                  <div className="text-base font-medium text-purple-700 dark:text-purple-300">
                                    Phone Number
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              {costData && (
                <CostBreakdown data={costData} />
              )}

              {/* Mobile-friendly action buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 pt-4 sm:pt-6 border-t sticky bottom-0 bg-background pb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="w-full sm:w-auto order-2 sm:order-1 h-10 sm:h-9"
                  onClick={() => form.handleSubmit(calculateCosts)()}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Costs
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
                  <Button type="button" variant="outline" size="default" onClick={onCancel} className="w-full sm:w-auto h-10 sm:h-9">
                    Cancel
                  </Button>
                  <Button type="submit" size="default" disabled={loading || !costData} className="w-full sm:w-auto h-10 sm:h-9">
                    {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create Quotation')}
                  </Button>
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