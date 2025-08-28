import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calculator, MapPin } from 'lucide-react';
import { CostBreakdown } from './CostBreakdown';

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

  const calculateCosts = async () => {
    setCalculating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock calculation - in real implementation, this would call Mapbox API
    const mockResult = {
      kmParkingToPickup: 15,
      kmTrip: 120,
      kmDropToParking: 20,
      fuelCostFuelOnly: 2500,
      hireCharge: 12000,
      extraCharges: 0,
      grossRevenue: 14500,
      driverCharge: formData.driverCharge,
      otherExpenses: [],
      commissionPct: formData.commissionPct,
      commissionAmount: 14500 * (formData.commissionPct / 100),
      totalExpenses: formData.driverCharge + (14500 * (formData.commissionPct / 100)),
      netProfit: 14500 - (formData.driverCharge + (14500 * (formData.commissionPct / 100)))
    };

    setCostData(mockResult);
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
                  <SelectItem value="standard">Standard Bus (45 seats)</SelectItem>
                  <SelectItem value="luxury">Luxury Bus (35 seats)</SelectItem>
                  <SelectItem value="mini">Mini Bus (25 seats)</SelectItem>
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