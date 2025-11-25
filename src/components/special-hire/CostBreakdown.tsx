
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
  totalDistance?: number; // Total distance including additional distance from charges
  busTypeEfficiency?: number;
  fuelPricePerLiter?: number;
  fuelPrice?: number; // Alternative fuel price field
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
    rateCardRange?: string;
    rateCardId?: string;
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
  // Additional charges with per-bus support
  additionalCharges?: Array<{ 
    type: string; 
    amount: number; 
    distance?: number; // For additional_distance type
    reason?: string;
    applyPerBus?: boolean;
    busesCount?: number;
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
  // Multi-parking support
  busCalculations?: Array<{
    busNumber: number;
    parkingLocationName: string;
    kmParkingToPickup: number;
    kmDropToParking: number;
  }>;
  isMultiParking?: boolean;
  // Multi-bus fleet support
  busFleetDetails?: {
    buses: Array<{
      bus_type_id: string;
      bus_type_name: string;
      quantity: number;
      seating_capacity: number;
      hire_charge_per_bus: number;
      fuel_cost_per_bus: number;
      maintenance_cost_per_bus: number;
      subtotal_per_bus: number;
      subtotal_all_buses: number;
    }>;
    total_buses: number;
    total_capacity: number;
    combined_subtotal: number;
  };
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
    totalTripDistance: data.totalDistance || ((data.kmParkingToPickup || 0) + (data.kmTrip || 0) + (data.kmDropToParking || 0)),
    busTypeEfficiency: data.busTypeEfficiency || 8,
    fuelPricePerLiter: data.fuelPricePerLiter || data.fuelPrice || 350,
    maintenanceRatePerKm: data.maintenanceRatePerKm || 20,
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
    rateCardDetails: data.rateCardDetails,
    numberOfBuses: data.numberOfBuses || 1
  };

  // Calculate customer fuel cost (only parking to pickup + drop to parking - for customer billing)
  const customerFuelDistance = safeData.kmParkingToPickup + safeData.kmDropToParking;
  const isMultiParking = data.isMultiParking || (data.busCalculations && data.busCalculations.length > 0);
  const customerFuelCost = isMultiParking 
    ? (customerFuelDistance / safeData.busTypeEfficiency) * safeData.fuelPricePerLiter
    : ((customerFuelDistance / safeData.busTypeEfficiency) * safeData.fuelPricePerLiter) * safeData.numberOfBuses;
  
  // Calculate additional distance from charges
  const additionalDistanceFromCharges = Array.isArray(data.additionalCharges) 
    ? data.additionalCharges
        .filter(charge => charge.type === 'additional_distance')
        .reduce((sum, charge) => sum + (charge.distance || 0), 0)
    : 0;

  // Use actual km if post-trip adjustment exists
  // For regular quotations, use passed totalDistance (already includes additional distance)
  const actualTripDistance = data.postTripAdjustment 
    ? data.postTripAdjustment.actualKmTraveled + safeData.kmParkingToPickup + safeData.kmDropToParking + additionalDistanceFromCharges
    : (data.totalDistance || safeData.totalTripDistance);
  
  // Calculate total fuel cost for internal tracking (all distances)
  const calculatedFuelCost = isMultiParking
    ? ((actualTripDistance / safeData.busTypeEfficiency) * safeData.fuelPricePerLiter)
    : ((actualTripDistance / safeData.busTypeEfficiency) * safeData.fuelPricePerLiter) * safeData.numberOfBuses;
  
  // Calculate deductions fuel cost - ALWAYS multiply by number of buses for expense tracking
  const deductionsFuelCost = ((actualTripDistance / safeData.busTypeEfficiency) * safeData.fuelPricePerLiter) * safeData.numberOfBuses;
  
  // Calculate maintenance cost (for all buses)  
  // For multi-parking, divide parking distances by number of buses, then add trip distance
  const distancePerBus = isMultiParking 
    ? ((safeData.kmParkingToPickup + safeData.kmDropToParking) / safeData.numberOfBuses) + 
      (data.postTripAdjustment ? data.postTripAdjustment.actualKmTraveled : safeData.kmTrip) + 
      additionalDistanceFromCharges
    : actualTripDistance;
  const calculatedMaintenanceCost = (distancePerBus * safeData.maintenanceRatePerKm) * safeData.numberOfBuses;
  
  // Calculate additional charges total with per-bus support (exclude pass-through charges from expenses)
  const additionalChargesTotal = Array.isArray(data.additionalCharges) 
    ? data.additionalCharges.reduce((sum, charge) => {
        // Skip pass-through charges in expense calculations
        if (charge.type === 'pass_through') return sum;
        
        const effectiveAmount = (charge.applyPerBus && charge.busesCount) 
          ? charge.amount * charge.busesCount 
          : charge.amount;
        return sum + effectiveAmount;
      }, 0)
    : 0;
  
  // Calculate other expenses total
  const otherExpensesTotal = safeData.otherExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Add post-trip additional expenses to total expenses
  const postTripExpensesTotal = data.postTripAdjustment?.totalAdditionalExpenses || 0;
  
  // Calculate correct total expenses (align with deductions section - use deductions fuel cost)
  const correctTotalExpenses = deductionsFuelCost + calculatedMaintenanceCost + additionalChargesTotal + otherExpensesTotal + safeData.commissionAmount + postTripExpensesTotal;
  
  // Calculate correct net profit - use final trip amount if adjustment exists
  const finalCustomerAmount = data.postTripAdjustment?.finalTripAmount || safeData.customerTotalWithFuel;
  const correctNetProfit = finalCustomerAmount - correctTotalExpenses;
  
  // Calculate net profit per bus
  const netProfitPerBus = correctNetProfit / safeData.numberOfBuses;

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
        {/* Multi-Bus Fleet Breakdown */}
        {data.busFleetDetails?.buses && data.busFleetDetails.buses.length > 0 && (
          <div>
            <h4 className="font-medium mb-4 text-lg">Bus Fleet Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left">Bus Type</th>
                    <th className="border border-border p-2 text-center">Qty</th>
                    <th className="border border-border p-2 text-center">Capacity</th>
                    <th className="border border-border p-2 text-right">Hire/Bus</th>
                    <th className="border border-border p-2 text-right">Fuel/Bus</th>
                    <th className="border border-border p-2 text-right">Maintenance/Bus</th>
                    <th className="border border-border p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.busFleetDetails.buses.map((bus, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="border border-border p-2 font-medium">{bus.bus_type_name}</td>
                      <td className="border border-border p-2 text-center">{bus.quantity}x</td>
                      <td className="border border-border p-2 text-center">
                        {bus.seating_capacity * bus.quantity} seats
                      </td>
                      <td className="border border-border p-2 text-right">
                        LKR {bus.hire_charge_per_bus.toLocaleString()}
                      </td>
                      <td className="border border-border p-2 text-right">
                        LKR {bus.fuel_cost_per_bus.toLocaleString()}
                      </td>
                      <td className="border border-border p-2 text-right">
                        LKR {bus.maintenance_cost_per_bus.toLocaleString()}
                      </td>
                      <td className="border border-border p-2 text-right font-semibold text-primary">
                        LKR {bus.subtotal_all_buses.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary/10 font-bold">
                    <td className="border border-border p-2" colSpan={2}>Total Fleet</td>
                    <td className="border border-border p-2 text-center">
                      {data.busFleetDetails.total_capacity} seats
                    </td>
                    <td className="border border-border p-2" colSpan={3}></td>
                    <td className="border border-border p-2 text-right text-lg text-primary">
                      LKR {data.busFleetDetails.combined_subtotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Separator className="my-4" />
          </div>
        )}

        {/* Distance Breakdown */}
        <div>
          <h4 className="font-medium mb-2">Distance Analysis</h4>
          {(() => {
            // Calculate additional distance from charges
            const additionalDistance = Array.isArray(data.additionalCharges) 
              ? data.additionalCharges
                  .filter(charge => charge.type === 'additional_distance')
                  .reduce((sum, charge) => sum + (charge.distance || 0), 0)
              : 0;
            
            const hasAdditionalDistance = additionalDistance > 0;
            const finalTotalDistance = safeData.totalTripDistance + additionalDistance;
            
            return (
              <>
                <div className={`grid ${hasAdditionalDistance ? 'grid-cols-5' : 'grid-cols-4'} gap-4 text-sm`}>
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
                  {hasAdditionalDistance && (
                    <div className="text-center">
                      <div className="font-medium text-purple-600">+{additionalDistance} km</div>
                      <div className="text-muted-foreground">Additional KM</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="font-medium text-orange-600">{finalTotalDistance.toFixed(1)} km</div>
                    <div className="text-muted-foreground">Total Distance</div>
                  </div>
                </div>
                {hasAdditionalDistance && (
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    Base: {safeData.totalTripDistance.toFixed(1)} km + Additional: {additionalDistance} km = Total: {finalTotalDistance.toFixed(1)} km
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <Separator />

        {/* Post-Trip Adjustments Section */}
        {data.postTripAdjustment && data.postTripAdjustment.adjustmentStatus === 'finalized' && (
          <>
            <div className="border-2 border-orange-200 bg-orange-50 rounded-md p-4">
              <h4 className="font-medium mb-3 text-orange-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Post-Trip Adjustments
              </h4>
              
              {/* KM Comparison */}
              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                <div className="text-center">
                  <div className="font-medium">Original Quoted</div>
                  <div className="text-muted-foreground">{data.postTripAdjustment.originalQuotedKm} km</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Actual Traveled</div>
                  <div className="text-muted-foreground">{data.postTripAdjustment.actualKmTraveled} km</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-orange-600">Extra KM</div>
                  <div className="text-orange-600">{data.postTripAdjustment.extraKm} km</div>
                </div>
              </div>
              
              {/* Extra KM Charges */}
              {data.postTripAdjustment.extraKm > 0 && (
                <div className="flex justify-between mb-2">
                  <span>Extra KM Charge ({data.postTripAdjustment.extraKm} km × LKR {data.postTripAdjustment.extraKmChargePerKm})</span>
                  <span className="text-orange-600 font-medium">LKR {data.postTripAdjustment.extraKmTotalCharge.toLocaleString()}</span>
                </div>
              )}
              
              {/* Additional Trip Expenses */}
              {data.postTripAdjustment.additionalExpenses && data.postTripAdjustment.additionalExpenses.length > 0 && (
                <div className="space-y-1 mb-2">
                  <div className="text-sm font-medium text-orange-600">Additional Trip Expenses:</div>
                  {data.postTripAdjustment.additionalExpenses.map((expense, index) => (
                    <div key={index} className="flex justify-between pl-4 text-sm">
                      <span>{expense.description} ({expense.category})</span>
                      <span>LKR {expense.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-orange-600">
                <span>Total Adjustment</span>
                <span>LKR {data.postTripAdjustment.adjustmentAmount.toLocaleString()}</span>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Revenue Section */}
        <div>
          <h4 className="font-medium mb-2">Hire Charges Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>
                {safeData.rateCardDetails?.rateCardRange ? 
                  `Base Rate (${safeData.rateCardDetails.rateCardRange} range)` :
                  'Base Rate (First 100 km)'
                }
              </span>
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
              <span>Fuel Cost (Parking to Pickup + Drop to Parking - {customerFuelDistance.toFixed(1)} km{isMultiParking ? ' (calculated per bus)' : ` × ${safeData.numberOfBuses} bus${safeData.numberOfBuses > 1 ? 'es' : ''}`})</span>
              <span>LKR {customerFuelCost.toLocaleString()}</span>
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
            {(Array.isArray(data.additionalCharges) && data.additionalCharges.length > 0) && (
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
                       pass_through: 'Pass-Through Charge',
                       internal_cost: charge.reason || 'Internal Cost',
                       other: charge.reason || 'Other'
                     };
                     
                     const effectiveAmount = (charge.applyPerBus && charge.busesCount) 
                       ? charge.amount * charge.busesCount 
                       : charge.amount;
                     
                     const displayLabel = chargeTypeLabels[charge.type as keyof typeof chargeTypeLabels] || charge.type;
                     const busInfo = (charge.applyPerBus && charge.busesCount) 
                       ? ` (${charge.amount.toLocaleString()} × ${charge.busesCount} bus${charge.busesCount > 1 ? 'es' : ''})`
                       : '';
                     
                     // Add indicator for pass-through charges
                     const isPassThrough = charge.type === 'pass_through';
                     
                     return (
                       <div key={index} className="flex justify-between pl-4">
                         <span className={isPassThrough ? 'font-medium text-green-600' : ''}>
                           {displayLabel}{busInfo}
                           {isPassThrough && <span className="ml-2 text-xs">(Revenue Only)</span>}
                         </span>
                         <span className={isPassThrough ? 'text-green-600' : ''}>
                           LKR {effectiveAmount.toLocaleString()}
                         </span>
                       </div>
                     );
                   })}
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg text-green-600 bg-green-50 p-3 rounded-md border-2 border-green-200">
              <span>ORIGINAL QUOTE - Customer Pays</span>
              <span>LKR {safeData.customerTotalWithFuel.toLocaleString()}</span>
            </div>

            {/* Post-Trip Adjustments to Customer Total */}
            {data.postTripAdjustment && data.postTripAdjustment.adjustmentStatus === 'finalized' && (
              <>
                <div className="flex justify-between text-orange-600 mt-2">
                  <span>Post-Trip Adjustment</span>
                  <span>+LKR {data.postTripAdjustment.adjustmentAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg text-blue-600 bg-blue-50 p-3 rounded-md border-2 border-blue-200 mt-2">
                  <span>FINAL TRIP AMOUNT</span>
                  <span>LKR {data.postTripAdjustment.finalTripAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-muted-foreground mt-2">
                  <span>Advance Already Paid</span>
                  <span>-LKR {data.postTripAdjustment.advanceAlreadyPaid.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg text-purple-600 bg-purple-50 p-3 rounded-md border-2 border-purple-200 mt-2">
                  <span>BALANCE DUE</span>
                  <span>LKR {data.postTripAdjustment.balanceDue.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Working Hours Analysis */}
        <div>
          <h4 className="font-medium mb-2">Working Hours Analysis</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">
                {safeData.rateCardDetails?.standardHours || 
                 (data.pickupDateTime && data.dropDateTime ? 
                   (() => {
                     const pickup = new Date(data.pickupDateTime);
                     const drop = new Date(data.dropDateTime);
                     const diffHours = (drop.getTime() - pickup.getTime()) / (1000 * 60 * 60);
                     return Math.min(diffHours, 8);
                   })() : 8)} hrs
              </div>
              <div className="text-muted-foreground">Standard</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-600">
                {(() => {
                  const additionalDistance = Array.isArray(data.additionalCharges) 
                    ? data.additionalCharges
                        .filter(charge => charge.type === 'additional_distance')
                        .reduce((sum, charge) => sum + (charge.distance || 0), 0)
                    : 0;
                  
                  const totalDistanceForHours = safeData.kmTrip + additionalDistance;
                  return safeData.rateCardDetails?.availableHours?.toFixed(1) || 
                         (totalDistanceForHours > 0 ? (totalDistanceForHours / 10).toFixed(1) : '0.0');
                })()} hrs
              </div>
              <div className="text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">
                {safeData.rateCardDetails?.actualHours || 
                 (data.pickupDateTime && data.dropDateTime ? 
                   (() => {
                     const pickup = new Date(data.pickupDateTime);
                     const drop = new Date(data.dropDateTime);
                     return ((drop.getTime() - pickup.getTime()) / (1000 * 60 * 60)).toFixed(1);
                   })() : 0)} hrs
              </div>
              <div className="text-muted-foreground">Actual</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center">
            {(() => {
              const additionalDistance = Array.isArray(data.additionalCharges) 
                ? data.additionalCharges
                    .filter(charge => charge.type === 'additional_distance')
                    .reduce((sum, charge) => sum + (charge.distance || 0), 0)
                : 0;
              
              const availableHours = safeData.rateCardDetails?.availableHours || (safeData.kmTrip / 10);
              
              if (additionalDistance > 0) {
                return `Available: ${safeData.kmTrip}km + ${additionalDistance}km additional = ${(safeData.kmTrip + additionalDistance).toFixed(1)}km total, calculated as ${safeData.kmTrip}km ÷ 10 kmph = ${availableHours.toFixed(1)} hrs`;
              } else {
                return safeData.rateCardDetails?.availableHours ? 
                  `Available: ${safeData.kmTrip}km ÷ 10 kmph = ${safeData.rateCardDetails.availableHours.toFixed(1)} hrs` :
                  safeData.kmTrip > 0 ? `Available: ${safeData.kmTrip}km ÷ 10 kmph = ${(safeData.kmTrip / 10).toFixed(1)} hrs` : '';
              }
            })()}
          </div>
        </div>

        <Separator />

        {/* Expenses Section */}
        <div>
          <h4 className="font-medium mb-2">Deductions</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>
                Fuel Cost (Total Trip - {actualTripDistance.toFixed(1)} km ÷ {safeData.busTypeEfficiency} km/L × LKR {safeData.fuelPricePerLiter} × {safeData.numberOfBuses} bus{safeData.numberOfBuses > 1 ? 'es' : ''})
                {data.postTripAdjustment && (
                  <span className="ml-2 text-xs text-orange-600">
                    (Recalculated: quoted {safeData.totalTripDistance.toFixed(1)} km → actual {actualTripDistance.toFixed(1)} km)
                  </span>
                )}
              </span>
              <span>LKR {deductionsFuelCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>
                Maintenance Cost (Internal - {distancePerBus.toFixed(1)} km per bus × LKR {safeData.maintenanceRatePerKm} × {safeData.numberOfBuses} bus{safeData.numberOfBuses > 1 ? 'es' : ''})
                {data.postTripAdjustment && (
                  <span className="ml-2 text-xs text-orange-600">
                    (Recalculated on actual km)
                  </span>
                )}
              </span>
              <span>LKR {calculatedMaintenanceCost.toLocaleString()}</span>
            </div>
            {(Array.isArray(data.additionalCharges) && data.additionalCharges.length > 0) && (
              <>
                {data.additionalCharges
                  .filter(charge => charge.type !== 'pass_through') // Exclude pass-through charges from deductions
                  .map((charge, index) => {
                    const chargeTypeLabels = {
                      permits: 'Permits Cost',
                      highway: 'Highway Charges',
                      additional_fuel: 'Additional Fuel Costs',
                      driver_charges: 'Driver Charges',
                      additional_distance: 'Additional Distance/KM',
                      internal_cost: charge.reason || 'Internal Cost',
                      other: charge.reason || 'Other'
                    };
                    
                    const effectiveAmount = (charge.applyPerBus && charge.busesCount) 
                      ? charge.amount * charge.busesCount 
                      : charge.amount;
                      
                    const displayLabel = chargeTypeLabels[charge.type as keyof typeof chargeTypeLabels] || charge.type;
                    const isInternalCost = charge.type === 'internal_cost';
                    
                    let busInfo = '';
                    if (charge.applyPerBus && charge.busesCount) {
                      busInfo = ` (${charge.amount.toLocaleString()} × ${charge.busesCount} bus${charge.busesCount > 1 ? 'es' : ''})`;
                    }
                    
                    // Special display for distance-based charges
                    if (charge.type === 'additional_distance' && charge.distance) {
                      busInfo = ` (${charge.distance} KM × Rate)${busInfo}`;
                    }
                    
                    return (
                      <div key={index} className="flex justify-between">
                        <span>
                          {displayLabel}{busInfo}
                          {isInternalCost && (
                            <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                              Internal Only
                            </span>
                          )}
                        </span>
                        <span>LKR {effectiveAmount.toLocaleString()}</span>
                      </div>
                    );
                  })}
              </>
            )}
            {safeData.otherExpenses.map((expense, index) => (
              <div key={index} className="flex justify-between">
                <span>{expense.label}</span>
                <span>LKR {expense.amount.toLocaleString()}</span>
              </div>
            ))}
            {/* Post-Trip Additional Expenses in Deductions */}
            {data.postTripAdjustment?.additionalExpenses && data.postTripAdjustment.additionalExpenses.length > 0 && (
              <>
                {data.postTripAdjustment.additionalExpenses.map((expense, index) => (
                  <div key={`post-trip-${index}`} className="flex justify-between text-orange-600">
                    <span>{expense.description} (Post-Trip - {expense.category})</span>
                    <span>LKR {expense.amount.toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
            <div className="flex justify-between">
              <span>Commission to pay ({safeData.commissionPct}%)</span>
              <span>LKR {safeData.commissionAmount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-red-600">
              <span>Total Expenses</span>
              <span>LKR {correctTotalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Net Profit */}
        <div className="bg-green-50 p-3 rounded-md border-2 border-green-200">
          <div className="flex justify-between items-center text-lg font-bold text-green-600">
            <span>Net Profit</span>
            <span>
              LKR {correctNetProfit.toLocaleString()}
            </span>
          </div>
          {safeData.numberOfBuses > 1 && (
            <div className="flex justify-between items-center text-sm text-green-700 mt-1">
              <span>Net Profit per Bus ({safeData.numberOfBuses} buses)</span>
              <span>
                LKR {netProfitPerBus.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Net Profit per Day - show only if trip is more than 1 day */}
        {(() => {
          if (!data.pickupDateTime || !data.dropDateTime) return null;
          
          const pickupDate = new Date(data.pickupDateTime);
          const dropDate = new Date(data.dropDateTime);
          const tripDurationMs = dropDate.getTime() - pickupDate.getTime();
          const tripDurationDays = Math.ceil(tripDurationMs / (1000 * 60 * 60 * 24));
          
          if (tripDurationDays <= 1) return null;
          
          const netProfitPerDay = correctNetProfit / tripDurationDays;
          const netProfitPerBusPerDay = netProfitPerBus / tripDurationDays;
          
          return (
            <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
              <span>Net Profit per Day ({tripDurationDays} days)</span>
              <span className="text-green-600 font-medium">
                LKR {netProfitPerDay.toLocaleString()}
              </span>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
