
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
  // Separated Commission and Discount
  commissionPct: number;
  commissionAmount: number;
  commissionPassThroughPct?: number;
  commissionPassThroughAmount?: number;
  discountType?: string;
  discountPct?: number;
  discountAmount?: number;
  totalExpenses: number;
  netProfit: number;
  // Additional charges
  additionalCharges?: Array<{ type: string; amount: number; reason?: string }>;
  totalAdditionalCharges?: number;
}

interface Props {
  data: CostData;
}

export function CostBreakdown({ data }: Props) {
  // Provide default values to prevent undefined errors
  const safeData = {
    kmParkingToPickup: data.kmParkingToPickup || 0,
    kmTrip: data.kmTrip || 0,
    kmDropToParking: data.kmDropToParking || 0,
    fuelCostFuelOnly: data.fuelCostFuelOnly || 0,
    hireCharge: data.hireCharge || 0,
    fixedRate: data.fixedRate || 0,
    overtimeCharge: data.overtimeCharge || 0,
    overnightCharge: data.overnightCharge || 0,
    exceedingDistanceCharge: data.exceedingDistanceCharge || 0,
    maintenanceCost: data.maintenanceCost || 0,
    totalTripDistance: (data.kmParkingToPickup || 0) + (data.kmTrip || 0) + (data.kmDropToParking || 0),
    grossRevenue: data.grossRevenue || 0,
    customerTotalWithFuel: data.customerTotalWithFuel || 0,
    driverCharge: data.driverCharge || 0,
    commissionAmount: data.commissionAmount || 0,
    commissionPct: data.commissionPct || 0,
    commissionPassThroughPct: data.commissionPassThroughPct || 0,
    commissionPassThroughAmount: data.commissionPassThroughAmount || 0,
    discountType: data.discountType || 'percentage',
    discountPct: data.discountPct || 0,
    discountAmount: data.discountAmount || 0,
    totalExpenses: data.totalExpenses || 0,
    netProfit: data.netProfit || 0,
    otherExpenses: data.otherExpenses || [],
    rateCardDetails: data.rateCardDetails
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Cost Breakdown
          <Badge variant="outline" className="ml-2">
            Live Calculation
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Distance Breakdown */}
        <div>
          <h4 className="font-medium mb-2">Distance Analysis</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">{safeData.kmParkingToPickup} km</div>
              <div className="text-muted-foreground">Parking → Pickup</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{safeData.kmTrip} km</div>
              <div className="text-muted-foreground">Trip Distance</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-600">{safeData.kmDropToParking} km</div>
              <div className="text-muted-foreground">Drop → Parking</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-600">{safeData.totalTripDistance.toFixed(1)} km</div>
              <div className="text-muted-foreground">Total Distance</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Revenue Section */}
        <div>
          <h4 className="font-medium mb-2">Hire Charges Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Flat Fee (First 100 km)</span>
              <span>LKR {safeData.fixedRate.toLocaleString()}</span>
            </div>
            {safeData.overtimeCharge > 0 && (
              <div className="flex justify-between">
                <span>Overtime ({safeData.rateCardDetails?.overtimeHours || 0} hrs)</span>
                <span>LKR {safeData.overtimeCharge.toLocaleString()}</span>
              </div>
            )}
            {safeData.overnightCharge > 0 && (
              <div className="flex justify-between">
                <span>Overnight Charges</span>
                <span>LKR {safeData.overnightCharge.toLocaleString()}</span>
              </div>
            )}
            {safeData.exceedingDistanceCharge > 0 && (
              <div className="flex justify-between">
                <span>Exceeding Distance ({safeData.rateCardDetails?.chargeableExceedingKm || 0} km)</span>
                <span>LKR {safeData.exceedingDistanceCharge.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium text-blue-600">
              <span>Total Hire Charge</span>
              <span>LKR {safeData.hireCharge.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-blue-600">
              <span>Gross Revenue</span>
              <span>LKR {safeData.grossRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel Cost</span>
              <span>LKR {safeData.fuelCostFuelOnly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Maintenance Cost ({safeData.totalTripDistance.toFixed(1)} km × LKR 20)</span>
              <span>LKR {(safeData.totalTripDistance * 20).toLocaleString()}</span>
            </div>
            {safeData.commissionPassThroughAmount > 0 && (
              <div className="flex justify-between">
                <span>Commission passed to customer ({safeData.commissionPassThroughPct}%)</span>
                <span>LKR {safeData.commissionPassThroughAmount.toLocaleString()}</span>
              </div>
            )}
            {safeData.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount {safeData.discountType === 'percentage' 
                    ? `(${safeData.discountPct}%)` 
                    : '(Fixed Amount)'}
                </span>
                <span>-LKR {safeData.discountAmount.toLocaleString()}</span>
              </div>
            )}
            {(data.additionalCharges && data.additionalCharges.length > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-orange-600">Additional Charges:</div>
                  {data.additionalCharges.map((charge, index) => {
                    const chargeTypeLabels = {
                      permits: 'Permits Cost',
                      highway: 'Highway Charges',
                      additional_fuel: 'Additional Fuel Costs',
                      driver_charges: 'Driver Charges',
                      other: charge.reason || 'Other'
                    };
                    return (
                      <div key={index} className="flex justify-between pl-4">
                        <span>{chargeTypeLabels[charge.type as keyof typeof chargeTypeLabels] || charge.type}</span>
                        <span>LKR {charge.amount.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pl-4 font-medium text-orange-600">
                    <span>Total Additional Charges</span>
                    <span>LKR {(data.totalAdditionalCharges || 0).toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg text-green-600 bg-green-50 p-3 rounded-md border-2 border-green-200">
              <span>FINAL TOTAL - Customer Pays</span>
              <span>LKR {safeData.customerTotalWithFuel.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Working Hours Analysis */}
        <div>
          <h4 className="font-medium mb-2">Working Hours Analysis</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">{safeData.rateCardDetails?.standardHours || 0} hrs</div>
              <div className="text-muted-foreground">Standard</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-600">{safeData.rateCardDetails?.availableHours?.toFixed(1) || '0.0'} hrs</div>
              <div className="text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{safeData.rateCardDetails?.actualHours || 0} hrs</div>
              <div className="text-muted-foreground">Actual</div>
            </div>
          </div>
          {safeData.rateCardDetails?.availableHours && (
            <div className="text-xs text-muted-foreground mt-1 text-center">
              Available: {safeData.kmTrip}km ÷ 10 kmph = {safeData.rateCardDetails.availableHours.toFixed(1)} hrs
            </div>
          )}
        </div>

        <Separator />

        {/* Expenses Section */}
        <div>
          <h4 className="font-medium mb-2">Deductions</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Driver Charge</span>
              <span>LKR {safeData.driverCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel Cost (Internal)</span>
              <span>LKR {safeData.fuelCostFuelOnly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Maintenance Cost (Internal - {safeData.totalTripDistance.toFixed(1)} km × LKR 20)</span>
              <span>LKR {(safeData.totalTripDistance * 20).toLocaleString()}</span>
            </div>
            {safeData.otherExpenses.map((expense, index) => (
              <div key={index} className="flex justify-between">
                <span>{expense.label}</span>
                <span>LKR {expense.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Commission to pay ({safeData.commissionPct}%)</span>
              <span>LKR {safeData.commissionAmount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-red-600">
              <span>Total Expenses</span>
              <span>LKR {safeData.totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Net Profit */}
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Net Profit</span>
          <span className={safeData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
            LKR {safeData.netProfit.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
