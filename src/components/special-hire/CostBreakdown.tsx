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
  rateCardDetails: {
    standardHours: number;
    actualHours: number;
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
  totalExpenses: number;
  netProfit: number;
}

interface Props {
  data: CostData;
}

export function CostBreakdown({ data }: Props) {
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
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">{data.kmParkingToPickup} km</div>
              <div className="text-muted-foreground">Parking → Pickup</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{data.kmTrip} km</div>
              <div className="text-muted-foreground">Trip Distance</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-600">{data.kmDropToParking} km</div>
              <div className="text-muted-foreground">Drop → Parking</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Revenue Section */}
        <div>
          <h4 className="font-medium mb-2">Hire Charges Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Fixed Rate ({data.rateCardDetails.agreedDistance} km)</span>
              <span>LKR {data.fixedRate.toLocaleString()}</span>
            </div>
            {data.overtimeCharge > 0 && (
              <div className="flex justify-between">
                <span>Overtime ({data.rateCardDetails.overtimeHours} hrs)</span>
                <span>LKR {data.overtimeCharge.toLocaleString()}</span>
              </div>
            )}
            {data.overnightCharge > 0 && (
              <div className="flex justify-between">
                <span>Overnight Charges</span>
                <span>LKR {data.overnightCharge.toLocaleString()}</span>
              </div>
            )}
            {data.exceedingDistanceCharge > 0 && (
              <div className="flex justify-between">
                <span>Exceeding Distance ({data.rateCardDetails.chargeableExceedingKm} km)</span>
                <span>LKR {data.exceedingDistanceCharge.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium text-blue-600">
              <span>Total Hire Charge</span>
              <span>LKR {data.hireCharge.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-blue-600">
              <span>Gross Revenue</span>
              <span>LKR {data.grossRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel Cost</span>
              <span>LKR {data.fuelCostFuelOnly.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-green-600">
              <span>Customer Total (incl. Fuel)</span>
              <span>LKR {data.customerTotalWithFuel.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Working Hours Analysis */}
        <div>
          <h4 className="font-medium mb-2">Working Hours Analysis</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">{data.rateCardDetails.standardHours} hrs</div>
              <div className="text-muted-foreground">Standard</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{data.rateCardDetails.actualHours} hrs</div>
              <div className="text-muted-foreground">Actual</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Expenses Section */}
        <div>
          <h4 className="font-medium mb-2">Deductions</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Driver Charge</span>
              <span>LKR {data.driverCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel Cost (Internal)</span>
              <span>LKR {data.fuelCostFuelOnly.toLocaleString()}</span>
            </div>
            {data.otherExpenses.map((expense, index) => (
              <div key={index} className="flex justify-between">
                <span>{expense.label}</span>
                <span>LKR {expense.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Commission ({data.commissionPct}%)</span>
              <span>LKR {data.commissionAmount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-red-600">
              <span>Total Expenses</span>
              <span>LKR {data.totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Net Profit */}
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Net Profit</span>
          <span className={data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
            LKR {data.netProfit.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}