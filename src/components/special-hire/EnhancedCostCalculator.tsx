import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, MapPin, Plus, Trash2, CheckCircle, XCircle, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CostBreakdown } from './CostBreakdown';

interface QuotationData {
  id: string;
  quotation_no: string;
  customer_name: string;
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
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationData | null>(null);
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [busTypes, setBusTypes] = useState<any[]>([]);
  const [fuelSettings, setFuelSettings] = useState<any>(null);
  const [calculation, setCalculation] = useState<TripCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Trip execution data
  const [actualDistance, setActualDistance] = useState<number>(0);
  const [tripDays, setTripDays] = useState<number>(1);
  const [commissionPct, setCommissionPct] = useState<number>(0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: '1', type: 'fuel', description: 'Fuel Cost', amount: 0, isEstimated: true },
    { id: '2', type: 'wages', description: 'Driver Wages', amount: 1500, isEstimated: true },
    { id: '3', type: 'commission', description: 'Commission', amount: 0, isEstimated: true }
  ]);

  const { toast } = useToast();

  useEffect(() => {
    fetchQuotations();
    fetchBusTypes();
    fetchFuelSettings();
  }, []);

  const fetchQuotations = async () => {
    const { data } = await supabase
      .from('special_hire_quotations')
      .select('*')
      .in('status', ['sent', 'confirmed'])
      .order('created_at', { ascending: false });
    
    if (data) setQuotations(data);
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
      setSelectedQuotation(quotation);
      setActualDistance(quotation.km_trip || 0);
      calculateCosts(quotation);
    }
  };

  const calculateCosts = (quotation: QuotationData) => {
    if (!quotation || !fuelSettings) return;

    const busType = busTypes.find(bt => bt.id === quotation.bus_type_id);
    if (!busType) return;

    // Calculate actual fuel cost based on total distance and fuel efficiency
    const totalDistance = quotation.km_parking_to_pickup + actualDistance + quotation.km_drop_to_parking;
    const fuelLiters = totalDistance / (busType.avg_km_per_l || 8);
    const actualFuelCost = fuelLiters * fuelSettings.diesel_price_lkr_per_l;

    // Calculate maintenance cost based on total distance
    const maintenanceCost = totalDistance * (fuelSettings.maintenance_rate_lkr_per_km || 20);

    // Update fuel cost and maintenance cost in expenses
    const updatedExpenses = expenses.map(exp => {
      if (exp.type === 'fuel') {
        return { ...exp, amount: Math.round(actualFuelCost), isEstimated: false };
      }
      if (exp.type === 'maintenance') {
        return { ...exp, amount: Math.round(maintenanceCost), isEstimated: false };
      }
      return exp;
    });

    // Add maintenance expense if it doesn't exist
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
    const netProfit = quotation.gross_revenue - totalExpenses;
    const dailyProfit = tripDays > 1 ? netProfit / tripDays : undefined;
    const profitMargin = quotation.gross_revenue > 0 ? (netProfit / quotation.gross_revenue) * 100 : 0;

    // Calculate customer fuel cost (parking distances only)
    const customerFuelDistance = quotation.km_parking_to_pickup + quotation.km_drop_to_parking;
    const customerFuelCost = (customerFuelDistance / (busType.avg_km_per_l || 8)) * fuelSettings.diesel_price_lkr_per_l * quotation.number_of_buses;
    const customerTotal = quotation.gross_revenue + customerFuelCost;

    // Prepare data for CostBreakdown component
    const costBreakdownData = {
      kmParkingToPickup: quotation.km_parking_to_pickup,
      kmTrip: actualDistance,
      kmDropToParking: quotation.km_drop_to_parking,
      fuelCostFuelOnly: customerFuelCost,
      hireCharge: quotation.gross_revenue,
      fixedRate: quotation.gross_revenue,
      overtimeCharge: 0,
      overnightCharge: 0,
      exceedingDistanceCharge: 0,
      grossRevenue: quotation.gross_revenue,
      customerTotalWithFuel: customerTotal,
      driverCharge: updatedExpenses.find(e => e.type === 'wages')?.amount || 0,
      commissionPct: commissionPct,
      commissionAmount: updatedExpenses.find(e => e.type === 'commission')?.amount || 0,
      totalExpenses,
      netProfit,
      otherExpenses: updatedExpenses.filter(e => !['fuel', 'wages', 'commission', 'maintenance'].includes(e.type)).map(e => ({
        label: e.description,
        amount: e.amount
      })),
      busTypeEfficiency: busType.avg_km_per_l || 8,
      fuelPricePerLiter: fuelSettings.diesel_price_lkr_per_l,
      maintenanceRatePerKm: fuelSettings.maintenance_rate_lkr_per_km || 20,
      numberOfBuses: quotation.number_of_buses,
      pickupDateTime: quotation.pickup_datetime,
      dropDateTime: quotation.drop_datetime
    };

    setCalculation({
      totalDistance,
      actualFuelCost: Math.round(actualFuelCost),
      maintenanceCost: Math.round(maintenanceCost),
      quotedAmount: quotation.gross_revenue,
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
    
    // Recalculate costs when expenses change
    if (selectedQuotation) {
      setTimeout(() => calculateCosts(selectedQuotation), 100);
    }
  };

  const calculateCommissionFromPercentage = () => {
    if (!selectedQuotation || commissionPct === 0) return;
    
    const commissionAmount = Math.round((selectedQuotation.gross_revenue * commissionPct) / 100);
    const updatedExpenses = expenses.map(exp => 
      exp.type === 'commission' ? { ...exp, amount: commissionAmount, isEstimated: false } : exp
    );
    setExpenses(updatedExpenses);
    
    // Recalculate costs
    setTimeout(() => calculateCosts(selectedQuotation), 100);
  };

  const removeExpense = (id: string) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    
    // Recalculate costs when expenses are removed
    if (selectedQuotation) {
      setTimeout(() => calculateCosts(selectedQuotation), 100);
    }
  };

  const confirmTrip = async () => {
    if (!selectedQuotation || !calculation) return;

    setLoading(true);
    try {
      // Create trip confirmation
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
          actual_fuel_cost: calculation.actualFuelCost,
          confirmed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create expense records
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

      // Update quotation status
      const { error: updateError } = await supabase
        .from('special_hire_quotations')
        .update({ status: 'confirmed' })
        .eq('id', selectedQuotation.id);

      if (updateError) throw updateError;

      // Calculate advance payment (50% rounded to nearest 50)
      const advanceAmount = Math.round((selectedQuotation.gross_revenue * 0.5) / 50) * 50;
      
      // Create advance payment record
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

      // Refresh quotations
      fetchQuotations();
      setSelectedQuotation(null);
      setCalculation(null);

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
      setCalculation(null);
    }
  };

  useEffect(() => {
    if (selectedQuotation) {
      calculateCosts(selectedQuotation);
    }
  }, [expenses, actualDistance, tripDays, selectedQuotation, busTypes, fuelSettings]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Trip Cost Calculator & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quotation Selection */}
          <div className="space-y-2">
            <Label>Select Quotation</Label>
            <Select onValueChange={handleQuotationSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a quotation to calculate costs" />
              </SelectTrigger>
              <SelectContent>
                {quotations.map((quotation) => (
                  <SelectItem key={quotation.id} value={quotation.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{quotation.quotation_no} - {quotation.customer_name}</span>
                      <Badge variant={quotation.status === 'confirmed' ? 'default' : 'secondary'}>
                        {quotation.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedQuotation && (
            <>
              {/* Trip Details Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Route</Label>
                  <p className="text-sm">{selectedQuotation.pickup_location} → {selectedQuotation.drop_location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quoted Distance</Label>
                  <p className="text-sm">{selectedQuotation.km_trip} km</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quoted Amount</Label>
                  <p className="text-sm font-bold">LKR {selectedQuotation.gross_revenue?.toLocaleString()}</p>
                </div>
              </div>

              {/* Trip Execution Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Actual Trip Distance (km)</Label>
                  <Input
                    type="number"
                    value={actualDistance}
                    onChange={(e) => setActualDistance(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Days</Label>
                  <Input
                    type="number"
                    min="1"
                    value={tripDays}
                    onChange={(e) => setTripDays(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission (%) - Optional</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={calculateCommissionFromPercentage}
                      disabled={!selectedQuotation || commissionPct === 0}
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter percentage and click Apply to auto-calculate commission amount
                  </p>
                </div>
              </div>

              {/* Expenses Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Expenses Breakdown</Label>
                  <Button onClick={addExpense} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Expense
                  </Button>
                </div>

                {expenses.map((expense) => (
                  <div key={expense.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Select 
                        value={expense.type} 
                        onValueChange={(value) => updateExpense(expense.id, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fuel">Fuel Cost</SelectItem>
                          <SelectItem value="wages">Driver Wages</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="highway_fees">Highway Fees</SelectItem>
                          <SelectItem value="permit_cost">Permit Cost</SelectItem>
                          <SelectItem value="commission">Commission</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Description"
                        value={expense.description}
                        onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                        disabled={expense.type === 'fuel'}
                      />
                    </div>
                    <div className="col-span-1">
                      <Badge variant={expense.isEstimated ? 'secondary' : 'default'}>
                        {expense.isEstimated ? 'Est.' : 'Act.'}
                      </Badge>
                    </div>
                    <div className="col-span-1">
                      {expense.type !== 'fuel' && (
                        <Button
                          onClick={() => removeExpense(expense.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Cards */}
              {calculation && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{calculation.totalDistance.toFixed(1)} km</div>
                    <div className="text-sm text-muted-foreground">Total Distance</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">LKR {calculation.quotedAmount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Revenue</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="text-2xl font-bold text-red-600">LKR {calculation.totalExpenses.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Expenses</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className={`h-5 w-5 ${calculation.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className={`text-2xl font-bold ${calculation.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      LKR {calculation.netProfit.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Net Profit ({calculation.profitMargin.toFixed(1)}%)</div>
                  </Card>
                </div>
              )}

              {/* Trip Actions */}
              {calculation && (
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={confirmTrip}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {loading ? 'Confirming...' : 'Confirm Trip'}
                  </Button>
                  <Button 
                    onClick={declineTrip}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline Trip
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detailed Cost Breakdown */}
      {calculation?.costBreakdownData && (
        <CostBreakdown data={calculation.costBreakdownData} />
      )}
    </div>
  );
}