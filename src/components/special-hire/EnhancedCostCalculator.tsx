import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator as CalculatorIcon, FileText, MapPin, Calendar, User, Bus, DollarSign, Printer, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CostBreakdown } from './CostBreakdown';
import { EnhancedSearch } from '@/components/ui/enhanced-search';
import { format } from 'date-fns';
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';
import { safeParseJSON } from '@/lib/utils';

interface QuotationData {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime?: string;
  bus_type_id: string;
  number_of_buses: number;
  hire_type: string;
  status: string;
  approval_status?: string;
  gross_revenue: number;
  net_profit: number;
  total_distance_km?: number;
  km_trip?: number;
  km_parking_to_pickup?: number;
  km_drop_to_parking?: number;
  km_additional?: number;
  hire_charge?: number;
  // Time-based charges stored in database
  fixed_rate?: number;
  overtime_charge?: number;
  overnight_charge?: number;
  exceeding_km_charge?: number;
  exceeding_distance_charge?: number;
  fuel_cost_fuel_only?: number;
  fuel_cost_calculated?: number;
  maintenance_cost?: number;
  total_expenses?: number;
  commission_amount?: number;
  commission_pass_through_amount?: number;
  discount_percentage?: number;
  discount_type?: string;
  discount_amount_lkr?: number;
  total_additional_charges?: number;
  additional_charges?: any; // JSONB field - can be array or string
  parking_location_id?: string;
  fuel_price_per_liter?: number;
  customer_total_with_fuel?: number;
  trip_days?: number;
  standard_hours?: number;
  available_hours?: number;
  actual_hours?: number;
  overtime_hours?: number;
  overnight_days?: number;
  // From join
  bus_type_name?: string;
  seating_capacity?: number;
  avg_km_per_l?: number;
}

interface PostTripAdjustment {
  actual_km_traveled: number;
  original_quoted_km: number;
  extra_km: number;
  extra_km_charge_per_km: number;
  extra_km_total_charge: number;
  additional_expenses: Array<{
    description: string;
    amount: number;
    category: "toll" | "parking" | "waiting" | "driver_meals" | "other";
  }>;
  total_additional_expenses: number;
  original_quotation_amount: number;
  adjustment_amount: number;
  final_trip_amount: number;
  advance_already_paid: number;
  balance_due: number;
  adjustment_status: string;
}

interface CostData {
  kmParkingToPickup: number;
  kmTrip: number;
  kmDropToParking: number;
  fuelCostFuelOnly: number;
  hireCharge: number;
  fixedRate: number;
  overtimeCharge: number;
  overnightCharge: number;
  exceedingDistanceCharge: number;
  maintenanceCost?: number;
  totalTripDistance?: number;
  totalDistance?: number; // Total distance including additional distance from charges
  busTypeEfficiency?: number;
  fuelPricePerLiter?: number;
  maintenanceRatePerKm?: number;
  pickupDateTime?: string;
  dropDateTime?: string;
  rateCardDetails?: {
    standardHours: number;
    actualHours: number;
    availableHours?: number;
    overtimeHours: number;
    agreedDistance: number;
    actualDistance: number;
    exceedingKm: number;
    freeExceedingKm: number;
    chargeableExceedingKm: number;
  };
  grossRevenue: number;
  customerTotalWithFuel: number;
  driverCharge: number;
  otherExpenses: Array<{ label: string; amount: number }>;
  commissionPct: number;
  commissionAmount: number;
  commissionPassThroughPct?: number;
  commissionPassThroughAmount?: number;
  discountType?: string;
  discountPct?: number;
  discountAmount?: number;
  totalExpenses: number;
  netProfit: number;
  additionalCharges?: Array<{ 
    type: string; 
    amount: number; 
    distance?: number; // For additional_distance type
    reason?: string;
  }>;
  totalAdditionalCharges?: number;
  numberOfBuses?: number;
  postTripAdjustment?: {
    actualKmTraveled: number;
    originalQuotedKm: number;
    extraKm: number;
    extraKmChargePerKm: number;
    extraKmTotalCharge: number;
    additionalExpenses: Array<{description: string; amount: number; category: string}>;
    totalAdditionalExpenses: number;
    originalQuotationAmount: number;
    adjustmentAmount: number;
    finalTripAmount: number;
    advanceAlreadyPaid: number;
    balanceDue: number;
    adjustmentStatus: string;
  };
}

export function EnhancedCostCalculator({ preselectedQuotationId }: { preselectedQuotationId?: string } = {}) {
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>(preselectedQuotationId || '');
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationData | null>(null);
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<QuotationData[]>([]);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    fetchQuotations();
  }, []);

  // Preselect quotation if provided
  useEffect(() => {
    if (preselectedQuotationId && quotations.length > 0) {
      setSelectedQuotationId(preselectedQuotationId);
    }
  }, [preselectedQuotationId, quotations]);

  // Filter quotations based on search and status
  useEffect(() => {
    let filtered = quotations;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.quotation_no?.toLowerCase().includes(query) ||
        q.customer_name?.toLowerCase().includes(query) ||
        q.pickup_location?.toLowerCase().includes(query) ||
        q.drop_location?.toLowerCase().includes(query)
      );
    }

    setFilteredQuotations(filtered);
  }, [quotations, statusFilter, searchQuery]);

  const fetchQuotations = async () => {
    const { data, error } = await supabase
      .from('special_hire_quotations')
      .select(`
        *,
        bus_types!bus_type_id (
          name,
          capacity,
          avg_km_per_l
        )
      `)
      .eq('is_active_version', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotations:', error);
      return;
    }

    const transformedData = (data || []).map(item => ({
      ...item,
      bus_type_name: item.bus_types?.name || 'Unknown',
      seating_capacity: item.bus_types?.capacity || 54,
      avg_km_per_l: item.bus_types?.avg_km_per_l || 8
    }));

    setQuotations(transformedData);
    setFilteredQuotations(transformedData);
  };

  useEffect(() => {
    if (selectedQuotationId && quotations.length > 0) {
      const quotation = quotations.find(q => q.id === selectedQuotationId);
      setSelectedQuotation(quotation || null);
      
      // Automatically show the original cost breakdown
      if (quotation) {
        displayOriginalCostBreakdown(quotation);
      }
    } else {
      setSelectedQuotation(null);
      setCostData(null);
    }
  }, [selectedQuotationId, quotations]);

  const displayOriginalCostBreakdown = async (quotation: QuotationData) => {
    try {
      // Fetch rate card data for correct base rate and exceeding km calculations
      const { data: rateCard } = await supabase
        .from('hire_rate_cards')
        .select('*')
        .eq('bus_type_id', quotation.bus_type_id)
        .eq('hire_type', quotation.hire_type)
        .eq('is_active', true)
        .maybeSingle();

    // Fetch fuel settings for correct fuel price
    // Order by created_at ASC to get the oldest default record (matches FuelSettingsAdmin logic)
    // Fetch fuel settings by quotation's parking location first, fallback to default
    let fuelSettings: { diesel_price_lkr_per_l: number; maintenance_rate_lkr_per_km: number } | null = null;
    if (quotation.parking_location_id) {
      const { data: fuelSettingsByParking } = await supabase
        .from('fuel_settings')
        .select('diesel_price_lkr_per_l, maintenance_rate_lkr_per_km')
        .eq('id', quotation.parking_location_id)
        .limit(1);
      fuelSettings = fuelSettingsByParking?.[0] || null;
    }
    if (!fuelSettings) {
      const { data: fuelSettingsDefault } = await supabase
        .from('fuel_settings')
        .select('diesel_price_lkr_per_l, maintenance_rate_lkr_per_km')
        .eq('is_default', true)
        .order('created_at', { ascending: true })
        .limit(1);
      fuelSettings = fuelSettingsDefault?.[0] || null;
    }

      // Fetch post-trip adjustment if exists
      const { data: adjustment } = await supabase
        .from('special_hire_trip_adjustments')
        .select('*')
        .eq('quotation_id', quotation.id)
        .eq('adjustment_status', 'finalized')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Parse additional charges from quotation (stored as JSONB)
      const additionalCharges: Array<{ type: string; amount: number; distance?: number; reason?: string }> = 
        safeParseJSON(quotation.additional_charges, []);

      // Calculate base rate from rate card (NOT from hire_charge)
      const fixedRate = quotation.fixed_rate ?? rateCard?.flat_fee_lkr ?? 0;

      // Calculate exceeding distance correctly
      const exceedingKmThreshold = rateCard?.exceeding_km_threshold || 100;
      const tripDistance = quotation.km_trip || 0;
      const exceedingKm = Math.max(0, tripDistance - exceedingKmThreshold);
      const exceedingDistanceCharge = exceedingKm * (rateCard?.exceeding_km_rate_lkr ?? 0);

      const fuelPricePerLiter = quotation.fuel_price_per_liter || fuelSettings?.diesel_price_lkr_per_l || 277;
      const maintenanceRatePerKm = fuelSettings?.maintenance_rate_lkr_per_km || 20;

      // Recalculate commission on full pre-commission total (includes additional charges)
      const preCommissionTotal = (quotation.gross_revenue || 0) + 
                                (quotation.fuel_cost_fuel_only || 0) + 
                                (quotation.total_additional_charges || 0) - 
                                (quotation.discount_amount_lkr || 0);

      // Calculate commission percentages from stored amounts (reverse calculate)
      const storedCommissionAmount = quotation.commission_amount || 0;
      const storedPassThroughAmount = quotation.commission_pass_through_amount || 0;
      
      // If we have stored amounts but no total, estimate percentage
      const commissionPct = preCommissionTotal > 0 
        ? (storedCommissionAmount / preCommissionTotal) * 100 
        : 0;
      const commissionPassThroughPct = preCommissionTotal > 0 
        ? (storedPassThroughAmount / preCommissionTotal) * 100 
        : 0;
      
      // Recalculate commission on the full pre-commission total
      const recalculatedCommissionAmount = preCommissionTotal * (commissionPct / 100);
      const recalculatedPassThroughAmount = preCommissionTotal * (commissionPassThroughPct / 100);

      // Calculate base trip distance (without additional distance from charges)
      const baseTripDistance = (quotation.km_parking_to_pickup || 0) + (quotation.km_trip || 0) + (quotation.km_drop_to_parking || 0);
      
      // Calculate additional distance from charges
      const additionalDistanceFromCharges = additionalCharges
        .filter(charge => charge.type === 'additional_distance')
        .reduce((sum, charge) => sum + (charge.distance || 0), 0);
      
      // Prepare the cost breakdown data from the quotation to match CostBreakdown props
      // Use stored values first, then recalculate as fallback for historical data
      const storedFixedRate = quotation.fixed_rate ?? fixedRate;
      let storedOvertimeCharge = quotation.overtime_charge ?? 0;
      let storedOvernightCharge = quotation.overnight_charge ?? 0;
      const storedExceedingDistanceCharge = quotation.exceeding_distance_charge ?? exceedingDistanceCharge;
      
      // Recalculate overtime/overnight if stored values are 0 (historical data)
      if (storedOvertimeCharge === 0 && 
          storedOvernightCharge === 0 && 
          quotation.pickup_datetime && 
          quotation.drop_datetime) {
        
        if (quotation.hire_type === 'Outside') {
          // Outside hire: distance-based available hours (km / 10 km/h)
          const extraTimeResult = calculateExtraTimeCharge(
            tripDistance, // Use quoted trip distance only
            quotation.pickup_datetime,
            quotation.drop_datetime,
            {
              baselineSpeedKmph: 10,
              hourlyRate: rateCard?.overtime_rate_lkr_per_hour || 500,
              nightBlockFee: rateCard?.overnight_charge_lkr_per_day || 10000,
              useStandardHours: false
            }
          );
          
          storedOvertimeCharge = extraTimeResult.overtimeCharge;
          storedOvernightCharge = extraTimeResult.overnightCharge;
        } else {
          // Lyceum/Internal hire: use km/10 distance-based (same as Outside)
          const extraTimeResult = calculateExtraTimeCharge(
            tripDistance,
            quotation.pickup_datetime,
            quotation.drop_datetime,
            {
              baselineSpeedKmph: 10,
              hourlyRate: rateCard?.overtime_rate_lkr_per_hour || 500,
              nightBlockFee: rateCard?.overnight_charge_lkr_per_day || 10000,
              useStandardHours: false  // Use km/10 same as Outside
            }
          );
          
          storedOvertimeCharge = extraTimeResult.overtimeCharge;
          storedOvernightCharge = extraTimeResult.overnightCharge;
        }
      }
      
      const data: CostData = {
        kmParkingToPickup: quotation.km_parking_to_pickup || 0,
        kmTrip: quotation.km_trip || 0,
        kmDropToParking: quotation.km_drop_to_parking || 0,
        fuelCostFuelOnly: quotation.fuel_cost_fuel_only || 0,
        hireCharge: quotation.gross_revenue || 0,
        fixedRate: storedFixedRate,
        overtimeCharge: storedOvertimeCharge,
        overnightCharge: storedOvernightCharge,
        exceedingDistanceCharge: storedExceedingDistanceCharge,
        maintenanceCost: quotation.maintenance_cost || 0,
        // Use base trip distance for totalTripDistance (without additional km)
        totalTripDistance: baseTripDistance,
        // Use full distance including additional km for totalDistance
        totalDistance: baseTripDistance + additionalDistanceFromCharges,
        busTypeEfficiency: quotation.avg_km_per_l || 8,
        fuelPricePerLiter: fuelPricePerLiter,
        maintenanceRatePerKm: maintenanceRatePerKm,
        pickupDateTime: quotation.pickup_datetime,
        dropDateTime: quotation.drop_datetime,
        postTripAdjustment: adjustment ? {
          actualKmTraveled: adjustment.actual_km_traveled || 0,
          originalQuotedKm: adjustment.original_quoted_km || quotation.km_trip || 0,
          extraKm: adjustment.extra_km || 0,
          extraKmChargePerKm: adjustment.extra_km_charge_per_km || 0,
          extraKmTotalCharge: adjustment.extra_km_total_charge || 0,
          additionalExpenses: Array.isArray(adjustment.additional_expenses) 
            ? adjustment.additional_expenses as Array<{description: string; amount: number; category: string}>
            : [],
          totalAdditionalExpenses: adjustment.total_additional_expenses || 0,
          originalQuotationAmount: adjustment.original_quotation_amount || 0,
          adjustmentAmount: adjustment.adjustment_amount || 0,
          finalTripAmount: adjustment.final_trip_amount || 0,
          advanceAlreadyPaid: adjustment.advance_already_paid || 0,
          balanceDue: adjustment.balance_due || 0,
          adjustmentStatus: adjustment.adjustment_status || 'draft',
        } : undefined,
        rateCardDetails: (() => {
          // Calculate actual hours from datetime fields
          let actualHours = 8;
          let availableHours = 8;
          // Get standard hours from rate card or use database stored value
          const standardHours = rateCard?.standard_hours || quotation.standard_hours || 8;
          
          if (quotation.pickup_datetime && quotation.drop_datetime) {
            const pickupTime = new Date(quotation.pickup_datetime);
            const dropTime = new Date(quotation.drop_datetime);
            actualHours = Math.max(0, (dropTime.getTime() - pickupTime.getTime()) / (1000 * 60 * 60));
          }
          
          // ALL hire types: available hours = trip distance / 10 km/h baseline speed
          const baselineSpeed = 10; // km/h
          availableHours = tripDistance / baselineSpeed;
          
          // Calculate overtime hours
          const overtimeHours = Math.max(0, actualHours - availableHours);
          
          return {
            standardHours,
            actualHours,
            availableHours,
            overtimeHours,
            agreedDistance: tripDistance,
            actualDistance: tripDistance,
            exceedingKm: exceedingKm,
            freeExceedingKm: 0,
            chargeableExceedingKm: exceedingKm,
            rateCardRange: rateCard ? (
              // For Outside hire, show the threshold coverage (0-100 km)
              // For other hire types (Lyceum, Inside), show the actual km range
              rateCard.hire_type === 'Outside' 
                ? `0-${rateCard.exceeding_km_threshold || 100} km`
                : `${rateCard.from_km || 0}-${rateCard.to_km || 999999} km`
            ) : undefined
          };
        })(),
        grossRevenue: quotation.gross_revenue || 0,
        customerTotalWithFuel: quotation.customer_total_with_fuel ?? ((quotation.gross_revenue || 0) + (quotation.fuel_cost_fuel_only || 0) + (quotation.commission_pass_through_amount || 0) + (quotation.total_additional_charges || 0) - (quotation.discount_amount_lkr || 0)),
        driverCharge: 0,
        otherExpenses: [],
        commissionPct: commissionPct,
        commissionAmount: recalculatedCommissionAmount,
        commissionPassThroughPct: commissionPassThroughPct,
        commissionPassThroughAmount: recalculatedPassThroughAmount,
        discountType: quotation.discount_type || 'none',
        discountPct: quotation.discount_percentage || 0,
        discountAmount: quotation.discount_amount_lkr || 0,
        totalExpenses: quotation.total_expenses || 0,
        netProfit: quotation.net_profit || 0,
        additionalCharges: additionalCharges,
        totalAdditionalCharges: quotation.total_additional_charges || 0,
        numberOfBuses: quotation.number_of_buses || 1
      };

      setCostData(data);
    } catch (error) {
      console.error('Error displaying cost breakdown:', error);
      toast({
        title: "Error",
        description: "Failed to load cost breakdown details",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      pending: "secondary",
      sent: "secondary",
      accepted: "default",
      confirmed: "default",
      rejected: "destructive",
      declined: "destructive"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast({
      title: "Export Feature",
      description: "PDF export coming soon!",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="h-5 w-5" />
                Cost Breakdown Calculator
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                View detailed cost breakdown for any quotation
              </p>
            </div>
            {selectedQuotation && (
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filter Section */}
          <div className="space-y-4 print:hidden">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <EnhancedSearch
                  onSearch={setSearchQuery}
                  placeholder="Search by quotation no, customer, location..."
                  searchKeys={["quotation no", "customer", "location"]}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('confirmed')}
                >
                  Confirmed
                </Button>
                <Button
                  variant={statusFilter === 'sent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('sent')}
                >
                  Sent
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quotation">Select Quotation</Label>
              <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a quotation to view cost breakdown" />
                </SelectTrigger>
                <SelectContent>
                  {filteredQuotations.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No quotations found
                    </div>
                  ) : (
                    filteredQuotations.map((quotation) => (
                      <SelectItem key={quotation.id} value={quotation.id}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-medium">{quotation.quotation_no}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{quotation.customer_name}</span>
                          <span className="text-muted-foreground">-</span>
                          <Badge variant="outline" className="text-xs">
                            {quotation.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedQuotation && (
            <>
              {/* Quotation Details Card */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Quotation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <User className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-xs text-muted-foreground">Customer</p>
                          <p className="font-medium">{selectedQuotation.customer_name}</p>
                          {selectedQuotation.customer_phone && (
                            <p className="text-sm text-muted-foreground">{selectedQuotation.customer_phone}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-xs text-muted-foreground">Quotation No</p>
                          <p className="font-medium">{selectedQuotation.quotation_no}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(selectedQuotation.status || 'pending')}
                            {selectedQuotation.approval_status && (
                              <Badge variant={selectedQuotation.approval_status === 'approved' ? 'default' : 'secondary'}>
                                {selectedQuotation.approval_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Bus className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-xs text-muted-foreground">Bus Details</p>
                          <p className="font-medium">{selectedQuotation.bus_type_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedQuotation.number_of_buses || 1} bus(es) × {selectedQuotation.seating_capacity || 54} seats
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-xs text-muted-foreground">Route</p>
                          <p className="font-medium text-sm">{selectedQuotation.pickup_location}</p>
                          <p className="text-muted-foreground text-sm">↓</p>
                          <p className="font-medium text-sm">{selectedQuotation.drop_location}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Total: {(selectedQuotation.km_parking_to_pickup || 0) + (selectedQuotation.km_trip || 0) + (selectedQuotation.km_drop_to_parking || 0)} km
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-xs text-muted-foreground">Trip Schedule</p>
                          {selectedQuotation.pickup_datetime && (
                            <>
                              <p className="font-medium text-sm">
                                {format(new Date(selectedQuotation.pickup_datetime), 'PPp')}
                              </p>
                              {selectedQuotation.drop_datetime && (
                                <>
                                  <p className="text-muted-foreground text-sm">to</p>
                                  <p className="font-medium text-sm">
                                    {format(new Date(selectedQuotation.drop_datetime), 'PPp')}
                                  </p>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-xs text-muted-foreground">Financial Summary</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Gross Revenue:</span>
                              <span className="font-medium">LKR {(selectedQuotation.gross_revenue || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Net Profit:</span>
                              <span className="font-medium text-green-600">
                                LKR {(selectedQuotation.net_profit || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Original Cost Breakdown */}
              {costData && (
                <div className="print:break-inside-avoid">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CalculatorIcon className="h-5 w-5" />
                      Original Cost Breakdown
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Complete financial analysis as calculated during quotation creation
                    </p>
                  </div>
                  <CostBreakdown data={costData} />
                </div>
              )}
            </>
          )}

          {!selectedQuotation && (
            <div className="text-center py-12 text-muted-foreground">
              <CalculatorIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Quotation Selected</p>
              <p className="text-sm mt-2">
                Select a quotation from the dropdown above to view its detailed cost breakdown
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
