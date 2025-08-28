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
    commissionPct: 5
  });
  
  const [costData, setCostData] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [busTypes, setBusTypes] = useState<any[]>([]);
  const [fuelSettings, setFuelSettings] = useState<any>(null);
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

      // Get rate card for this hire type and bus type
      const { data: rateCard } = await supabase
        .from('hire_rate_cards')
        .select('*')
        .eq('hire_type', formData.hireType)
        .eq('bus_type_id', formData.busType)
        .eq('is_active', true)
        .gte('to_km', distanceData.kmTrip || 0)
        .order('from_km', { ascending: true })
        .limit(1)
        .maybeSingle();

      const totalDistance = (distanceData.kmParkingToPickup || 0) + (distanceData.kmTrip || 0) + (distanceData.kmDropToParking || 0);
      const fuelLiters = totalDistance / selectedBusType.avg_km_per_l;
      const fuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;

      let hireCharge = 0;
      if (rateCard) {
        if (rateCard.flat_fee_lkr) {
          hireCharge = rateCard.flat_fee_lkr;
        } else if (rateCard.rate_per_km_lkr) {
          hireCharge = (distanceData.kmTrip || 0) * rateCard.rate_per_km_lkr;
        }
      } else {
        // Fallback rate if no rate card found
        hireCharge = (distanceData.kmTrip || 0) * 50; // 50 LKR per km as fallback
      }

      const grossRevenue = hireCharge * formData.numberOfBuses;
      const commissionAmount = grossRevenue * (formData.commissionPct / 100);
      const totalExpenses = (formData.driverCharge * formData.numberOfBuses) + commissionAmount + (fuelCost * formData.numberOfBuses);
      const netProfit = grossRevenue - totalExpenses;

      const result = {
        ...distanceData,
        totalDistance,
        fuelLiters: Math.round(fuelLiters * 10) / 10,
        fuelCostFuelOnly: Math.round(fuelCost),
        hireCharge: Math.round(hireCharge),
        extraCharges: 0,
        grossRevenue: Math.round(grossRevenue),
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
      toast({ title: "Success", description: `Distance calculated: Pickup ${distanceData.kmParkingToPickup}km + Trip ${distanceData.kmTrip}km + Return ${distanceData.kmDropToParking}km` });
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
          </div>

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