import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Plus, Trash2, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';

// Add interfaces for the props
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

interface AdditionalCharge {
  type: string;
  distance?: number;
}

interface SelectedBusFleet {
  id: string;
  busTypeId: string;
  quantity: number;
}

interface TripDetailsSectionProps {
  busTypes: BusType[];
  parkingLocations: ParkingLocation[];
  intermediateStops: IntermediateStop[];
  addIntermediateStop: () => void;
  removeIntermediateStop: (id: string) => void;
  updateIntermediateStop: (id: string, location: string, coords?: [number, number]) => void;
  busDetails: any[];
  updateBusParking: (busNumber: number, locationId: string) => void;
  isMultiBusMode: boolean;
  setIsMultiBusMode: (value: boolean) => void;
  selectedBusFleet: SelectedBusFleet[];
  setSelectedBusFleet: (fleet: SelectedBusFleet[]) => void;
  useMultiParking: boolean;
  setUseMultiParking: (value: boolean) => void;
  handleMultiParkingToggle: (enabled: boolean) => void;
  usePickupAsParking: boolean;
  setUsePickupAsParking: (value: boolean) => void;
  useManualParkingDistance: boolean;
  setUseManualParkingDistance: (value: boolean) => void;
  manualParkingToPickup: number;
  setManualParkingToPickup: (value: number) => void;
  manualDropToParking: number;
  setManualDropToParking: (value: number) => void;
  originalCalculatedParkingToPickup: number;
  originalCalculatedDropToParking: number;
  useManualTripDistance: boolean;
  setUseManualTripDistance: (value: boolean) => void;
  manualTripDistance: number;
  setManualTripDistance: (value: number) => void;
  originalCalculatedTripDistance: number;
  setPickupCoords: (coords: [number, number] | null) => void;
  setDropCoords: (coords: [number, number] | null) => void;
  costData: any;
  setCostData: (data: any) => void;
  watchedNumberOfBuses: number;
  additionalCharges: AdditionalCharge[];
}

export function TripDetailsSection({
  busTypes,
  parkingLocations,
  intermediateStops,
  addIntermediateStop,
  removeIntermediateStop,
  updateIntermediateStop,
  busDetails,
  updateBusParking,
  isMultiBusMode,
  setIsMultiBusMode,
  selectedBusFleet,
  setSelectedBusFleet,
  useMultiParking,
  setUseMultiParking,
  handleMultiParkingToggle,
  usePickupAsParking,
  setUsePickupAsParking,
  useManualParkingDistance,
  setUseManualParkingDistance,
  manualParkingToPickup,
  setManualParkingToPickup,
  manualDropToParking,
  setManualDropToParking,
  originalCalculatedParkingToPickup,
  originalCalculatedDropToParking,
  useManualTripDistance,
  setUseManualTripDistance,
  manualTripDistance,
  setManualTripDistance,
  originalCalculatedTripDistance,
  setPickupCoords,
  setDropCoords,
  costData,
  setCostData,
  watchedNumberOfBuses,
  additionalCharges
}: TripDetailsSectionProps) {
  const form = useFormContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  return (
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
          {additionalCharges.some(charge => charge.type === 'additional_distance' && (charge.distance || 0) > 0) && (
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
        </div>
      </CardContent>
    </Card>
  );
}
