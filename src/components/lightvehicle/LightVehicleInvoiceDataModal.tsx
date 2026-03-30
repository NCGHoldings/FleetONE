// @ts-nocheck
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VehicleData {
  engineNumber?: string;
  chassisNumber?: string;
  engineCapacity?: string;
  vehicleColor?: string;
  vehicleYear?: string;
  mileage?: string;
  transmission?: string;
  fuelType?: string;
}

interface LightVehicleInvoiceDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: VehicleData) => void;
  existingData?: VehicleData;
}

export function LightVehicleInvoiceDataModal({
  open,
  onOpenChange,
  onConfirm,
  existingData
}: LightVehicleInvoiceDataModalProps) {
  const [engineNumber, setEngineNumber] = useState(existingData?.engineNumber || '');
  const [chassisNumber, setChassisNumber] = useState(existingData?.chassisNumber || '');
  const [engineCapacity, setEngineCapacity] = useState(existingData?.engineCapacity || '');
  const [vehicleColor, setVehicleColor] = useState(existingData?.vehicleColor || '');
  const [vehicleYear, setVehicleYear] = useState(existingData?.vehicleYear || '');
  const [mileage, setMileage] = useState(existingData?.mileage || '');
  const [transmission, setTransmission] = useState(existingData?.transmission || '');
  const [fuelType, setFuelType] = useState(existingData?.fuelType || '');

  const handleConfirm = () => {
    onConfirm({
      engineNumber,
      chassisNumber,
      engineCapacity,
      vehicleColor,
      vehicleYear,
      mileage,
      transmission,
      fuelType
    });
    onOpenChange(false);
  };

  const isValid = engineNumber && chassisNumber;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Vehicle Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Engine Number *</Label>
            <Input
              value={engineNumber}
              onChange={(e) => setEngineNumber(e.target.value)}
              placeholder="Enter engine number"
            />
          </div>

          <div className="space-y-2">
            <Label>Chassis Number *</Label>
            <Input
              value={chassisNumber}
              onChange={(e) => setChassisNumber(e.target.value)}
              placeholder="Enter chassis number"
            />
          </div>

          <div className="space-y-2">
            <Label>Engine Capacity (CC)</Label>
            <Input
              value={engineCapacity}
              onChange={(e) => setEngineCapacity(e.target.value)}
              placeholder="e.g., 2000cc"
            />
          </div>

          <div className="space-y-2">
            <Label>Vehicle Color</Label>
            <Input
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              placeholder="e.g., White"
            />
          </div>

          <div className="space-y-2">
            <Label>Year of Manufacture</Label>
            <Input
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
              placeholder="e.g., 2024"
            />
          </div>

          <div className="space-y-2">
            <Label>Mileage</Label>
            <Input
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="e.g., 50,000 km"
            />
          </div>

          <div className="space-y-2">
            <Label>Transmission</Label>
            <Select value={transmission} onValueChange={setTransmission}>
              <SelectTrigger>
                <SelectValue placeholder="Select transmission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="cvt">CVT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fuel Type</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="electric">Electric</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
