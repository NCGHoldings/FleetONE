import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calculator, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CostBreakdown } from './CostBreakdown';

interface QuotationData {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime: string;
  bus_type_id: string;
  number_of_buses: number;
  number_of_passengers: number;
  hire_type: string;
  status: string;
  gross_revenue: number;
  km_trip: number;
  km_parking_to_pickup: number;
  km_drop_to_parking: number;
  // Additional fields for complete cost breakdown
  fuel_cost_fuel_only?: number;
  commission_pct?: number;
  commission_amount?: number;
  commission_pass_through_pct?: number;
  commission_pass_through_amount?: number;
  discount_type?: string;
  discount_pct?: number;
  discount_amount_lkr?: number;
  additional_charges?: any;
  other_expenses?: any;
  total_additional_charges?: number;
  driver_charge?: number;
  overtime_charge?: number;
  overnight_charge?: number;
  exceeding_distance_charge?: number;
  final_customer_total?: number;
}

interface ExpenseItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  isEstimated: boolean;
}

interface TripCalculation {
  totalDistance: number;
  actualFuelCost: number;
  maintenanceCost: number;
  quotedAmount: number;
  totalExpenses: number;
  netProfit: number;
  dailyProfit?: number;
  profitMargin: number;
  expenses: ExpenseItem[];
  costBreakdownData?: any;
}

export function EnhancedCostCalculator() {
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationData | null>(null);
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [busTypes, setBusTypes] = useState<any[]>([]);
  const [fuelSettings, setFuelSettings] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<TripCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [actualDistance, setActualDistance] = useState<number>(0);
  const [tripDays, setTripDays] = useState<number>(1);
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchQuotations();
    fetchBusTypes();
    fetchFuelSettings();
  }, []);

  // Recalculate costs when inputs change
  useEffect(() => {
    if (selectedQuotation && fuelSettings && busTypes.length > 0) {
      calculateCosts(selectedQuotation);
    }
  }, [actualDistance, tripDays, commissionAmount, commissionPercentage, expenses, selectedQuotation, fuelSettings, busTypes]);

  const fetchQuotations = async () => {
    const { data } = await supabase
      .from('special_hire_quotations')
      .select(`
        *,
        additional_charges,
        other_expenses
      `)
      .in('status', ['sent', 'confirmed'])
      .order('created_at', { ascending: false });
    
    if (data) setQuotations(data as QuotationData[]);
  };

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

  const handleQuotationSelect = (quotationId: string) => {
    const quotation = quotations.find(q => q.id === quotationId);
    if (quotation) {
      setSelectedQuotationId(quotationId);
      setSelectedQuotation(quotation);
      setActualDistance(quotation.km_trip || 0);
      
      const initialExpenses: ExpenseItem[] = [
        { id: '1', type: 'fuel', description: 'Fuel Cost', amount: 0, isEstimated: true },
        { id: '2', type: 'wages', description: 'Driver Wages', amount: 1500, isEstimated: true },
        { id: '3', type: 'commission', description: 'Commission', amount: 0, isEstimated: true }
      ];
      setExpenses(initialExpenses);
      
      const pickup = new Date(quotation.pickup_datetime);
      const drop = new Date(quotation.drop_datetime);
      const daysDiff = Math.max(1, Math.ceil((drop.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));
      setTripDays(daysDiff);
      
      calculateCosts(quotation);
    }
  };

  const calculateCosts = (quotation: QuotationData) => {
    if (!quotation || !fuelSettings) return;

    const busType = busTypes.find(bt => bt.id === quotation.bus_type_id);
    if (!busType) return;

    const totalDistance = quotation.km_parking_to_pickup + actualDistance + quotation.km_drop_to_parking;
    const fuelLiters = totalDistance / (busType.avg_km_per_l || 8);
    const actualFuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;
    const maintenanceCost = totalDistance * (fuelSettings.maintenance_rate_lkr_per_km || 20);

    // Use original quotation financial data to preserve the exact breakdown shown to customer
    const originalHireCharge = quotation.gross_revenue / quotation.number_of_buses;
    const originalGrossRevenue = quotation.gross_revenue;
    const originalFuelCostFuelOnly = quotation.fuel_cost_fuel_only || 0;
    const originalOvertimeCharge = quotation.overtime_charge || 0;
    const originalOvernightCharge = quotation.overnight_charge || 0;
    const originalExceedingDistanceCharge = quotation.exceeding_distance_charge || 0;
    const originalCommissionPassThroughAmount = quotation.commission_pass_through_amount || 0;
    const originalDiscountAmount = quotation.discount_amount_lkr || 0;
    const originalAdditionalCharges = quotation.additional_charges || [];
    const originalTotalAdditionalCharges = quotation.total_additional_charges || 0;
    const originalFinalCustomerTotal = quotation.final_customer_total || (originalGrossRevenue + originalFuelCostFuelOnly + originalCommissionPassThroughAmount + originalTotalAdditionalCharges - originalDiscountAmount);

    // Update expenses based on actual data but preserve original structure
    const updatedExpenses = expenses.map(exp => {
      if (exp.type === 'fuel') {
        return { ...exp, amount: Math.round(actualFuelCost), isEstimated: false };
      }
      if (exp.type === 'maintenance') {
        return { ...exp, amount: Math.round(maintenanceCost), isEstimated: false };
      }
      if (exp.type === 'commission') {
        const originalCommissionAmount = quotation.commission_amount || 0;
        const newCommissionAmount = commissionPercentage > 0 
          ? (originalGrossRevenue * (commissionPercentage / 100))
          : originalCommissionAmount;
        return { ...exp, amount: Math.round(newCommissionAmount), isEstimated: false };
      }
      return exp;
    });

    if (!updatedExpenses.find(exp => exp.type === 'maintenance')) {
      updatedExpenses.push({
        id: 'maintenance-auto',
        type: 'maintenance',
        description: `Maintenance (${totalDistance.toFixed(1)} km)`,
        amount: Math.round(maintenanceCost),
        isEstimated: false
      });
    }

    setExpenses(updatedExpenses);

    const totalExpenses = updatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = originalFinalCustomerTotal - totalExpenses;
    const dailyProfit = tripDays > 1 ? netProfit / tripDays : undefined;
    const profitMargin = originalFinalCustomerTotal > 0 ? (netProfit / originalFinalCustomerTotal) * 100 : 0;

    // Build comprehensive cost breakdown matching original quotation structure
    const costBreakdownData = {
      kmParkingToPickup: quotation.km_parking_to_pickup,
      kmTrip: actualDistance,
      kmDropToParking: quotation.km_drop_to_parking,
      totalTripDistance: totalDistance,
      fuelCostFuelOnly: originalFuelCostFuelOnly,
      hireCharge: originalGrossRevenue,
      fixedRate: originalHireCharge,
      overtimeCharge: originalOvertimeCharge,
      overnightCharge: originalOvernightCharge,
      exceedingDistanceCharge: originalExceedingDistanceCharge,
      grossRevenue: originalGrossRevenue,
      customerTotalWithFuel: originalFinalCustomerTotal,
      driverCharge: quotation.driver_charge || updatedExpenses.find(e => e.type === 'wages')?.amount || 0,
      commissionPct: quotation.commission_pct || commissionPercentage,
      commissionAmount: quotation.commission_amount || updatedExpenses.find(e => e.type === 'commission')?.amount || 0,
      commissionPassThroughPct: quotation.commission_pass_through_pct || 0,
      commissionPassThroughAmount: originalCommissionPassThroughAmount,
      discountType: quotation.discount_type || 'percentage',
      discountPct: quotation.discount_pct || 0,
      discountAmount: originalDiscountAmount,
      totalExpenses,
      netProfit,
      otherExpenses: (quotation.other_expenses || []).concat(
        updatedExpenses
          .filter(e => !['fuel', 'wages', 'commission', 'maintenance'].includes(e.type))
          .map(e => ({ label: e.description, amount: e.amount }))
      ),
      additionalCharges: originalAdditionalCharges,
      totalAdditionalCharges: originalTotalAdditionalCharges,
      busTypeEfficiency: busType.avg_km_per_l || 8,
      fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
      maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20,
      numberOfBuses: quotation.number_of_buses,
      pickupDateTime: quotation.pickup_datetime,
      dropDateTime: quotation.drop_datetime,
      rateCardDetails: {
        standardHours: 8,
        actualHours: (() => {
          const pickup = new Date(quotation.pickup_datetime);
          const drop = new Date(quotation.drop_datetime);
          return Math.round(((drop.getTime() - pickup.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        })(),
        availableHours: Math.round((actualDistance / 10) * 100) / 100,
        overtimeHours: originalOvertimeCharge > 0 ? Math.round(((originalOvertimeCharge / 500) || 0) * 100) / 100 : 0,
        agreedDistance: Math.min(quotation.km_trip || actualDistance, 100),
        actualDistance: actualDistance,
        exceedingKm: Math.max(0, actualDistance - 100),
        freeExceedingKm: 0,
        chargeableExceedingKm: Math.max(0, actualDistance - 100)
      }
    };

    setCalculationResult({
      totalDistance,
      actualFuelCost: Math.round(actualFuelCost),
      maintenanceCost: Math.round(maintenanceCost),
      quotedAmount: originalGrossRevenue,
      totalExpenses,
      netProfit,
      dailyProfit,
      profitMargin,
      expenses: updatedExpenses,
      costBreakdownData
    });
  };

  const addExpense = () => {
    const newExpense: ExpenseItem = {
      id: Date.now().toString(),
      type: 'other',
      description: 'Other Expense',
      amount: 0,
      isEstimated: true
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (id: string, field: keyof ExpenseItem, value: any) => {
    const updatedExpenses = expenses.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    setExpenses(updatedExpenses);
    
    if (selectedQuotation) {
      setTimeout(() => calculateCosts(selectedQuotation), 100);
    }
  };

  const removeExpense = (id: string) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    
    if (selectedQuotation) {
      setTimeout(() => calculateCosts(selectedQuotation), 100);
    }
  };

  const calculateCommissionFromPercentage = (percentage: number) => {
    if (!selectedQuotation || percentage === 0) return;
    
    const commissionAmountCalc = Math.round((selectedQuotation.gross_revenue * percentage) / 100);
    setCommissionAmount(commissionAmountCalc);
    
    const updatedExpenses = expenses.map(exp => 
      exp.type === 'commission' ? { ...exp, amount: commissionAmountCalc, isEstimated: false } : exp
    );
    setExpenses(updatedExpenses);
    
    setTimeout(() => calculateCosts(selectedQuotation), 100);
  };

  const confirmTrip = async () => {
    if (!selectedQuotation || !calculationResult) return;

    setLoading(true);
    try {
      const { data: tripConfirmation, error: tripError } = await supabase
        .from('trip_confirmations')
        .insert({
          quotation_id: selectedQuotation.id,
          quotation_no: selectedQuotation.quotation_no,
          customer_name: selectedQuotation.customer_name,
          pickup_location: selectedQuotation.pickup_location,
          drop_location: selectedQuotation.drop_location,
          pickup_datetime: selectedQuotation.pickup_datetime,
          drop_datetime: selectedQuotation.drop_datetime,
          bus_type_id: selectedQuotation.bus_type_id,
          number_of_buses: selectedQuotation.number_of_buses,
          number_of_passengers: selectedQuotation.number_of_passengers,
          actual_distance_km: actualDistance,
          actual_fuel_cost: calculationResult.actualFuelCost,
          confirmed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (tripError) throw tripError;

      const expenseRecords = expenses.map(exp => ({
        trip_confirmation_id: tripConfirmation.id,
        expense_type: exp.type,
        expense_description: exp.description,
        amount: exp.amount,
        is_estimated: exp.isEstimated
      }));

      const { error: expenseError } = await supabase
        .from('trip_expenses')
        .insert(expenseRecords);

      if (expenseError) throw expenseError;

      const { error: updateError } = await supabase
        .from('special_hire_quotations')
        .update({ status: 'confirmed' })
        .eq('id', selectedQuotation.id);

      if (updateError) throw updateError;

      const advanceAmount = Math.round((selectedQuotation.gross_revenue * 0.5) / 50) * 50;
      
      const { error: paymentError } = await supabase
        .from('trip_payments')
        .insert({
          trip_confirmation_id: tripConfirmation.id,
          quotation_no: selectedQuotation.quotation_no,
          payment_type: 'advance',
          amount: selectedQuotation.gross_revenue * 0.5,
          rounded_amount: advanceAmount
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Trip Confirmed Successfully",
        description: `Advance payment required: LKR ${advanceAmount.toLocaleString()}`
      });

      fetchQuotations();
      setSelectedQuotation(null);
      setCalculationResult(null);

    } catch (error: any) {
      console.error('Error confirming trip:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm trip",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const declineTrip = async () => {
    if (!selectedQuotation) return;

    const { error } = await supabase
      .from('special_hire_quotations')
      .update({ status: 'declined' })
      .eq('id', selectedQuotation.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to decline trip",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Trip Declined",
        description: "The quotation has been declined"
      });
      fetchQuotations();
      setSelectedQuotation(null);
      setCalculationResult(null);
    }
  };

  useEffect(() => {
    if (selectedQuotation) {
      calculateCosts(selectedQuotation);
    }
  }, [expenses, actualDistance, tripDays, selectedQuotation, busTypes, fuelSettings]);

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Trip Cost Calculator & Analysis</CardTitle>
        <CardDescription>
          Calculate actual costs, manage expenses, and analyze profit margins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quotation-select">Select Quotation</Label>
            <Select value={selectedQuotationId} onValueChange={handleQuotationSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a quotation..." />
              </SelectTrigger>
              <SelectContent>
                {quotations.map((quotation) => (
                  <SelectItem key={quotation.id} value={quotation.id}>
                    {quotation.quotation_no} - {quotation.customer_name} (LKR {quotation.gross_revenue?.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedQuotation && (
          <>
            <div className="bg-muted/30 p-6 rounded-lg border">
              <h3 className="font-semibold mb-4 text-lg">Quotation Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-muted-foreground text-sm">Customer</p>
                  <p className="font-medium">{selectedQuotation.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedQuotation.customer_phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Route</p>
                  <p className="font-medium text-sm">{selectedQuotation.pickup_location}</p>
                  <p className="text-xs text-muted-foreground">↓</p>
                  <p className="font-medium text-sm">{selectedQuotation.drop_location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Fleet Details</p>
                  <p className="font-medium">{selectedQuotation.number_of_buses} Bus{selectedQuotation.number_of_buses > 1 ? 'es' : ''}</p>
                  <p className="text-xs text-muted-foreground">{selectedQuotation.number_of_passengers} passengers</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Original Quote</p>
                  <p className="font-medium text-lg text-green-600">LKR {selectedQuotation.gross_revenue?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{selectedQuotation.km_trip} km trip</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="actual-distance">Actual Distance (km)</Label>
                <Input
                  id="actual-distance"
                  type="number"
                  step="0.1"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(Number(e.target.value))}
                  placeholder={`Original: ${selectedQuotation.km_trip} km`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-days">Trip Days</Label>
                <Input
                  id="trip-days"
                  type="number"
                  value={tripDays}
                  onChange={(e) => setTripDays(Number(e.target.value))}
                  placeholder="Number of days"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission (LKR)</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(Number(e.target.value))}
                  placeholder="Commission amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Commission %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={commissionPercentage}
                  onChange={(e) => {
                    const percentage = Number(e.target.value);
                    setCommissionPercentage(percentage);
                    calculateCommissionFromPercentage(percentage);
                  }}
                  placeholder="Commission %"
                />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-orange-50/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Trip Expenses Management</h3>
                  <p className="text-sm text-muted-foreground">Add, edit, or remove actual trip expenses</p>
                </div>
                <Button onClick={addExpense} size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>
              
              {expenses.length > 0 && (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm">
                      <div className="flex-1 min-w-0">
                        <Input
                          placeholder="Expense description"
                          value={expense.description}
                          onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-1"
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={expense.amount}
                          onChange={(e) => updateExpense(expense.id, 'amount', Number(e.target.value))}
                          className="text-right"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">LKR {expense.amount.toLocaleString()}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeExpense(expense.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {calculationResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {actualDistance || selectedQuotation.km_trip}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Distance (km)</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        LKR {selectedQuotation.gross_revenue?.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Gross Revenue</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        LKR {calculationResult?.totalExpenses?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        LKR {calculationResult?.netProfit?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                      <p className="text-xs text-muted-foreground">
                        Margin: {calculationResult?.profitMargin || 0}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t">
              <Button onClick={confirmTrip} className="flex-1" size="lg">
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirm Trip
              </Button>
              <Button variant="destructive" onClick={declineTrip} className="flex-1" size="lg">
                <XCircle className="w-5 h-5 mr-2" />
                Decline Trip
              </Button>
            </div>

            {calculationResult?.costBreakdownData && (
              <div className="mt-6">
                <CostBreakdown data={calculationResult.costBreakdownData} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}