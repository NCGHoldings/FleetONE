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
  extraCharges: number;
  grossRevenue: number;
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
          <h4 className="font-medium mb-2">Revenue</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Fuel Cost (Parking legs)</span>
              <span>LKR {data.fuelCostFuelOnly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Hire Charge ({data.kmTrip} km)</span>
              <span>LKR {data.hireCharge.toLocaleString()}</span>
            </div>
            {data.extraCharges > 0 && (
              <div className="flex justify-between">
                <span>Extra Charges</span>
                <span>LKR {data.extraCharges.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium text-green-600">
              <span>Gross Revenue</span>
              <span>LKR {data.grossRevenue.toLocaleString()}</span>
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