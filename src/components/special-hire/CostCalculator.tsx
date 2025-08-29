import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calculator, MapPin } from 'lucide-react';
import { CostBreakdown } from './CostBreakdown';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function CostCalculator() {
  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropLocation: '',
    busType: '',
    hireType: 'Outside',
    numberOfBuses: 1,
    driverCharge: 1500,
    commissionPct: 5,
    expectedWorkHours: 8,
    overnightDays: 0,
    agreedDistance: 0
  });
  
  const [costData, setCostData] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [busTypes, setBusTypes] = useState<any[]>([]);
  const [fuelSettings, setFuelSettings] = useState<any>(null);
  const [intermediateStops, setIntermediateStops] = useState<Array<{id: string, location: string}>>([]);
  const [selectedRateCard, setSelectedRateCard] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBusTypes();
    fetchFuelSettings();
  }, []);

  const fetchBusTypes = async () => {
    const { data } = await supabase
      .from('bus_types')
      .select('*')
      .eq('is_active', true);
    if (data) setBusTypes(data);
  };

  const fetchFuelSettings = async () => {
    const { data } = await supabase
      .from('fuel_settings')
      .select('*')
      .eq('is_default', true)
      .single();
    if (data) setFuelSettings(data);
  };

  const calculateCosts = async () => {
    if (!fuelSettings) {
      toast({ title: "Error", description: "Fuel settings not loaded", variant: "destructive" });
      return;
    }

    setCalculating(true);
    
    try {
      console.log('Starting distance calculation with:', {
        pickup: formData.pickupLocation,
        drop: formData.dropLocation,
        parking: { lat: fuelSettings.parking_lat, lng: fuelSettings.parking_lng }
      });

      // Call edge function to calculate distances using Mapbox API
      const { data: distanceData, error } = await supabase.functions.invoke('calculate-distance', {
        body: {
          pickupLocation: formData.pickupLocation,
          dropLocation: formData.dropLocation,
          intermediateStops,
          parkingLat: fuelSettings.parking_lat,
          parkingLng: fuelSettings.parking_lng
        }
      });

      console.log('Distance calculation result:', distanceData, error);

      if (error) {
        console.error('Distance calculation error:', error);
        throw new Error(`Distance calculation failed: ${error.message || 'Unknown error'}`);
      }

      if (!distanceData) {
        throw new Error('No distance data received from calculation service');
      }

      // Get selected bus type details
      const selectedBusType = busTypes.find(bt => bt.id === formData.busType);
      if (!selectedBusType) throw new Error('Please select a bus type');

      // Find appropriate rate card based on trip distance
      const tripDistance = distanceData.kmTrip || 0;
      
      // Get all rate cards for this hire type and bus type to find the best match
      const { data: allRateCards } = await supabase
        .from('hire_rate_cards')
        .select('*')
        .eq('hire_type', formData.hireType)
        .eq('bus_type_id', formData.busType)
        .eq('is_active', true)
        .order('from_km');

      // Find the appropriate rate card for the distance
      let rateCard = null;
      if (allRateCards && allRateCards.length > 0) {
        rateCard = allRateCards.find(card => 
          tripDistance >= card.from_km && tripDistance <= card.to_km
        );
        
        // If no exact match, find the card with the highest to_km that still covers this distance
        if (!rateCard) {
          rateCard = allRateCards
            .filter(card => tripDistance >= card.from_km)
            .sort((a, b) => b.to_km - a.to_km)[0];
        }
      }

      if (!rateCard) {
        // Show available ranges for debugging
        const ranges = allRateCards?.map(card => `${card.from_km}-${card.to_km}km`).join(', ') || 'None';
        throw new Error(`No rate card found for ${formData.hireType} hire type, ${tripDistance}km distance. Available ranges: ${ranges}`);
      }

      setSelectedRateCard(rateCard);

      // Calculate base charges
      const fixedRate = rateCard.flat_fee_lkr || 0;
      
      // Calculate overtime charges
      const overtimeHours = Math.max(0, formData.expectedWorkHours - rateCard.standard_hours);
      const overtimeCharge = overtimeHours * rateCard.overtime_rate_lkr_per_hour;
      
      // Calculate overnight charges (Outside customers only)
      const overnightCharge = formData.hireType === 'Outside' ? 
        formData.overnightDays * rateCard.overnight_charge_lkr_per_day : 0;
      
      // Calculate exceeding distance charges
      const agreedDistance = formData.agreedDistance || rateCard.to_km;
      const exceedingKm = Math.max(0, tripDistance - agreedDistance);
      const chargeableExceedingKm = Math.max(0, exceedingKm - rateCard.free_exceeding_km);
      const exceedingDistanceCharge = chargeableExceedingKm * rateCard.exceeding_km_rate_lkr;

      // Calculate total hire charge
      const hireCharge = fixedRate + overtimeCharge + overnightCharge + exceedingDistanceCharge;

      // Calculate fuel costs
      const totalDistance = (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0);
      const fuelLiters = totalDistance / selectedBusType.avg_km_per_l;
      const fuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;

      // Calculate financial breakdown (include fuel in customer total)
      const grossRevenue = hireCharge * formData.numberOfBuses;
      const customerTotalWithFuel = grossRevenue + (fuelCost * formData.numberOfBuses);
      const commissionAmount = customerTotalWithFuel * (formData.commissionPct / 100);
      const totalExpenses = (formData.driverCharge * formData.numberOfBuses) + commissionAmount + (fuelCost * formData.numberOfBuses);
      const netProfit = customerTotalWithFuel - totalExpenses;

      const result = {
        ...distanceData,
        totalDistance,
        fuelLiters: Math.round(fuelLiters * 10) / 10,
        fuelCostFuelOnly: Math.round(fuelCost),
        hireCharge: Math.round(hireCharge),
        fixedRate: Math.round(fixedRate),
        overtimeCharge: Math.round(overtimeCharge),
        overnightCharge: Math.round(overnightCharge),
        exceedingDistanceCharge: Math.round(exceedingDistanceCharge),
        rateCardDetails: {
          standardHours: rateCard.standard_hours,
          actualHours: formData.expectedWorkHours,
          overtimeHours,
          agreedDistance,
          actualDistance: tripDistance,
          exceedingKm,
          freeExceedingKm: rateCard.free_exceeding_km,
          chargeableExceedingKm,
          rateCardRange: `${rateCard.from_km}-${rateCard.to_km}km`,
          rateCardId: rateCard.id
        },
        grossRevenue: Math.round(grossRevenue),
        customerTotalWithFuel: Math.round(customerTotalWithFuel),
        driverCharge: formData.driverCharge,
        otherExpenses: [],
        commissionPct: formData.commissionPct,
        commissionAmount: Math.round(commissionAmount),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(netProfit),
        busTypeName: selectedBusType.name,
        fuelPrice: fuelSettings.diesel_price_lkr_per_l
      };

      console.log('Final cost calculation result:', result);
      setCostData(result);
      toast({ 
        title: "Cost Calculated Successfully", 
        description: `Trip: ${tripDistance}km | Fixed Rate: LKR ${fixedRate.toLocaleString()} | Overtime: LKR ${overtimeCharge.toLocaleString()} | Total: LKR ${hireCharge.toLocaleString()}`
      });
    } catch (error) {
      console.error('Error calculating costs:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to calculate costs", 
        variant: "destructive" 
      });
    }

    setCalculating(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Location</Label>
              <div className="relative">
                <Input
                  placeholder="Enter pickup location"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({...formData, pickupLocation: e.target.value})}
                />
                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Drop Location</Label>
              <div className="relative">
                <Input
                  placeholder="Enter drop location"
                  value={formData.dropLocation}
                  onChange={(e) => setFormData({...formData, dropLocation: e.target.value})}
                />
                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bus Type</Label>
              <Select onValueChange={(value) => setFormData({...formData, busType: value})}>
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

            <div className="space-y-2">
              <Label>Hire Type</Label>
              <Select onValueChange={(value) => setFormData({...formData, hireType: value})} defaultValue={formData.hireType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Outside">Outside</SelectItem>
                  <SelectItem value="Lyceum">Lyceum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Buses</Label>
              <Input
                type="number"
                min="1"
                value={formData.numberOfBuses}
                onChange={(e) => setFormData({...formData, numberOfBuses: parseInt(e.target.value) || 1})}
              />
            </div>

            <div className="space-y-2">
              <Label>Driver Charge (LKR)</Label>
              <Input
                type="number"
                value={formData.driverCharge}
                onChange={(e) => setFormData({...formData, driverCharge: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Commission (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commissionPct}
                onChange={(e) => setFormData({...formData, commissionPct: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Work Hours</Label>
              <Input
                type="number"
                min="1"
                step="0.5"
                value={formData.expectedWorkHours}
                onChange={(e) => setFormData({...formData, expectedWorkHours: parseFloat(e.target.value) || 8})}
              />
            </div>

            <div className="space-y-2">
              <Label>Overnight Days (Outside only)</Label>
              <Input
                type="number"
                min="0"
                value={formData.overnightDays}
                onChange={(e) => setFormData({...formData, overnightDays: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Agreed Distance (km)</Label>
              <Input
                type="number"
                min="0"
                placeholder="Leave empty to use trip distance"
                value={formData.agreedDistance || ''}
                onChange={(e) => setFormData({...formData, agreedDistance: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          {/* Intermediate Stops */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Intermediate Stops</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIntermediateStops([...intermediateStops, { id: Date.now().toString(), location: '' }])}
              >
                Add Stop
              </Button>
            </div>
            {intermediateStops.map((stop, index) => (
              <div key={stop.id} className="flex gap-2 items-center">
                <Input
                  placeholder={`Stop ${index + 1} location`}
                  value={stop.location}
                  onChange={(e) => {
                    const updated = [...intermediateStops];
                    updated[index].location = e.target.value;
                    setIntermediateStops(updated);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIntermediateStops(intermediateStops.filter(s => s.id !== stop.id))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Rate Card Information */}
          {selectedRateCard && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Selected Rate Card</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Range: {selectedRateCard.from_km}-{selectedRateCard.to_km}km</div>
                <div>Base Rate: LKR {selectedRateCard.flat_fee_lkr?.toLocaleString()}</div>
                <div>Standard Hours: {selectedRateCard.standard_hours}hrs</div>
                <div>Overtime Rate: LKR {selectedRateCard.overtime_rate_lkr_per_hour}/hr</div>
              </div>
            </div>
          )}

          <Button 
            onClick={calculateCosts} 
            disabled={calculating || !formData.pickupLocation || !formData.dropLocation || !formData.busType}
            className="w-full"
          >
            {calculating ? 'Calculating...' : 'Calculate Costs'}
          </Button>
        </CardContent>
      </Card>

      {costData && <CostBreakdown data={costData} />}
    </div>
  );
}