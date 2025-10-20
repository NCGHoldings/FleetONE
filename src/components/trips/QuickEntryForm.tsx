import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";

interface QuickEntryFormProps {
  tripId: string;
  busNo: string;
  route?: string;
  onSuccess: () => void;
  onSaveAndNext: () => void;
}

interface IncomeDetails {
  [key: string]: number;
  bus_collection: number;
  call_booking: number;
  agent_booking: number;
  luggage_income: number;
  miscellaneous_income: number;
  others: number;
}

interface ExpenseDetails {
  [key: string]: number;
  repair: number;
  tyre_tube: number;
  salary: number;
  police: number;
  food: number;
  emission_fitness: number;
  permits_renewal: number;
  staff_accommodation: number;
  highway_charges: number;
  accident_compensation: number;
  parking: number;
  log_sheet: number;
  vehicle_hire: number;
  ntc: number;
  runner: number;
  short_misc: number;
  temporary_permit: number;
  body_wash: number;
  legal_court: number;
  other: number;
}

export function QuickEntryForm({
  tripId,
  busNo,
  route,
  onSuccess,
  onSaveAndNext,
}: QuickEntryFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Separate fuel tracking
  const [fuelCost, setFuelCost] = useState(0);
  const [dieselPrice, setDieselPrice] = useState(0);
  const [distance, setDistance] = useState(0);

  const [income, setIncome] = useState<IncomeDetails>({
    bus_collection: 0,
    call_booking: 0,
    agent_booking: 0,
    luggage_income: 0,
    miscellaneous_income: 0,
    others: 0,
  });

  const [expenses, setExpenses] = useState<ExpenseDetails>({
    repair: 0,
    tyre_tube: 0,
    salary: 0,
    police: 0,
    food: 0,
    emission_fitness: 0,
    permits_renewal: 0,
    staff_accommodation: 0,
    highway_charges: 0,
    accident_compensation: 0,
    parking: 0,
    log_sheet: 0,
    vehicle_hire: 0,
    ntc: 0,
    runner: 0,
    short_misc: 0,
    temporary_permit: 0,
    body_wash: 0,
    legal_court: 0,
    other: 0,
  });

  useEffect(() => {
    loadTripData();
  }, [tripId]);

  // Helper function to safely parse numbers from database
  const safeParseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const loadTripData = async () => {
    setLoading(true);
    try {
      // Fetch diesel price from fuel_settings (get the most recent one)
      const { data: fuelSettings } = await supabase
        .from('fuel_settings')
        .select('diesel_price_lkr_per_l')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (fuelSettings?.diesel_price_lkr_per_l) {
        setDieselPrice(fuelSettings.diesel_price_lkr_per_l);
      }

      // Fetch trip data
      const { data, error } = await supabase
        .from('daily_trips')
        .select('income_details, other_expenses_details, fuel_cost, diesel_price_per_liter, distance_km')
        .eq('id', tripId)
        .single();

      if (error) throw error;

      // Load distance
      if (data?.distance_km) {
        setDistance(safeParseNumber(data.distance_km));
      }

      // Load fuel cost (from dedicated column, not from other_expenses_details)
      if (data?.fuel_cost) {
        setFuelCost(safeParseNumber(data.fuel_cost));
      }

      // Load diesel price used for this trip if available
      if (data?.diesel_price_per_liter) {
        setDieselPrice(safeParseNumber(data.diesel_price_per_liter));
      }

      if (data?.income_details && typeof data.income_details === 'object' && !Array.isArray(data.income_details)) {
        const incomeData = data.income_details as any;
        const parsedIncome: IncomeDetails = {
          bus_collection: safeParseNumber(incomeData.bus_collection),
          call_booking: safeParseNumber(incomeData.call_booking),
          agent_booking: safeParseNumber(incomeData.agent_booking),
          luggage_income: safeParseNumber(incomeData.luggage_income),
          miscellaneous_income: safeParseNumber(incomeData.miscellaneous_income),
          others: safeParseNumber(incomeData.others),
        };
        setIncome(parsedIncome);
      }
      
      if (data?.other_expenses_details && typeof data.other_expenses_details === 'object' && !Array.isArray(data.other_expenses_details)) {
        const expensesData = data.other_expenses_details as any;
        const parsedExpenses: ExpenseDetails = {
          repair: safeParseNumber(expensesData.repair),
          tyre_tube: safeParseNumber(expensesData.tyre_tube),
          salary: safeParseNumber(expensesData.salary),
          police: safeParseNumber(expensesData.police),
          food: safeParseNumber(expensesData.food),
          emission_fitness: safeParseNumber(expensesData.emission_fitness),
          permits_renewal: safeParseNumber(expensesData.permits_renewal),
          staff_accommodation: safeParseNumber(expensesData.staff_accommodation),
          highway_charges: safeParseNumber(expensesData.highway_charges),
          accident_compensation: safeParseNumber(expensesData.accident_compensation),
          parking: safeParseNumber(expensesData.parking),
          log_sheet: safeParseNumber(expensesData.log_sheet),
          vehicle_hire: safeParseNumber(expensesData.vehicle_hire),
          ntc: safeParseNumber(expensesData.ntc),
          runner: safeParseNumber(expensesData.runner),
          short_misc: safeParseNumber(expensesData.short_misc),
          temporary_permit: safeParseNumber(expensesData.temporary_permit),
          body_wash: safeParseNumber(expensesData.body_wash),
          legal_court: safeParseNumber(expensesData.legal_court),
          other: safeParseNumber(expensesData.other),
        };
        setExpenses(parsedExpenses);
      }
    } catch (error) {
      console.error('Error loading trip data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (obj: Record<string, number>): number => {
    return Object.values(obj).reduce((sum, val) => sum + (Number(val) || 0), 0 as number);
  };

  const handleSave = async (andNext: boolean = false) => {
    setSaving(true);
    try {
      const totalIncome = calculateTotal(income);
      const totalOtherExpenses = calculateTotal(expenses);
      
      // Calculate fuel metrics
      const fuelLiters = fuelCost > 0 && dieselPrice > 0 ? fuelCost / dieselPrice : 0;
      const kmPerLiter = distance > 0 && fuelLiters > 0 ? distance / fuelLiters : 0;
      
      // Total expenses now includes fuel + other expenses
      const totalExpenses = fuelCost + totalOtherExpenses;
      const netIncome = totalIncome - totalExpenses;

      console.log('💾 Saving Quick Entry Data:', {
        tripId,
        income_details: income,
        other_expenses_details: expenses,
        fuel_cost: fuelCost,
        fuel_liters: fuelLiters,
        diesel_price_per_liter: dieselPrice,
        km_per_liter: kmPerLiter,
        totalIncome,
        totalOtherExpenses,
        totalExpenses,
        netIncome
      });

      const { error } = await supabase
        .from('daily_trips')
        .update({
          income_details: income as any,
          other_expenses_details: expenses as any,
          income: totalIncome,
          other_expenses: totalOtherExpenses,
          
          // Separate fuel tracking in dedicated columns
          fuel_cost: fuelCost,
          fuel_liters: fuelLiters,
          diesel_price_per_liter: dieselPrice,
          km_per_liter: kmPerLiter,
          
          // Total calculations
          total_expenses: totalExpenses,
          net_income: netIncome,
        })
        .eq('id', tripId);

      if (error) throw error;

      console.log('✅ Data saved successfully to database');

      if (totalIncome === 0 && totalExpenses === 0) {
        toast({
          title: "Warning",
          description: "All values are zero. Please verify your entries.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Saved: Income LKR ${totalIncome.toLocaleString()}, Total Expenses LKR ${totalExpenses.toLocaleString()} (Fuel: ${fuelCost.toLocaleString()}, Other: ${totalOtherExpenses.toLocaleString()})`,
        });
      }

      onSuccess();
      if (andNext) {
        onSaveAndNext();
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      toast({
        title: "Error",
        description: "Failed to save trip data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalRevenue = calculateTotal(income);
  const totalOtherExpenses = calculateTotal(expenses);
  const fuelLiters = fuelCost > 0 && dieselPrice > 0 ? fuelCost / dieselPrice : 0;
  const kmPerLiter = distance > 0 && fuelLiters > 0 ? distance / fuelLiters : 0;
  const totalExpenses = fuelCost + totalOtherExpenses;
  const netProfit = totalRevenue - totalExpenses;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-auto p-2 md:p-3 pb-24 md:pb-6">
        <div className="max-w-6xl mx-auto space-y-3 md:space-y-4">
          {/* Fuel Details Section - Full Width */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-sm md:text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Fuel Details
                </span>
                <Badge variant="outline" className="text-xs">
                  Diesel Price: LKR {dieselPrice.toFixed(2)}/L
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-1">
                  <Label htmlFor="dieselPrice" className="text-xs">Diesel Price (LKR/L)</Label>
                  <Input
                    id="dieselPrice"
                    type="number"
                    value={dieselPrice || ''}
                    onChange={(e) => setDieselPrice(safeParseNumber(e.target.value))}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Current rate per liter</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fuelCost" className="text-xs">Fuel Cost (LKR)</Label>
                  <Input
                    id="fuelCost"
                    type="number"
                    value={fuelCost || ''}
                    onChange={(e) => setFuelCost(safeParseNumber(e.target.value))}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="distance" className="text-xs">Distance (KM)</Label>
                  <Input
                    id="distance"
                    type="number"
                    value={distance || ''}
                    disabled
                    className="h-8 text-xs bg-muted"
                  />
                  <p className="text-[10px] text-muted-foreground">From trip record</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Efficiency</Label>
                  <div className="h-8 px-3 flex items-center border rounded-md bg-muted text-xs font-medium">
                    {fuelCost > 0 && dieselPrice > 0 ? (
                      <span>
                        {fuelLiters.toFixed(2)} L • {kmPerLiter > 0 ? `${kmPerLiter.toFixed(2)} Km/L` : 'N/A'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Enter fuel cost</span>
                    )}
                  </div>
                </div>
              </div>
              
              {fuelCost > 0 && dieselPrice > 0 && (
                <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liters Used:</span>
                    <span className="font-medium">{fuelLiters.toFixed(2)} L</span>
                  </div>
                  {distance > 0 && fuelLiters > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel Efficiency:</span>
                      <span className="font-medium text-green-600">{kmPerLiter.toFixed(2)} Km/L</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Revenue Section */}
          <Card>
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-sm md:text-base">Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bus_collection" className="text-xs">Bus Collection</Label>
                  <Input
                    id="bus_collection"
                    type="number"
                    value={income.bus_collection || ''}
                    onChange={(e) => setIncome({ ...income, bus_collection: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="call_booking" className="text-xs">Call Booking</Label>
                  <Input
                    id="call_booking"
                    type="number"
                    value={income.call_booking || ''}
                    onChange={(e) => setIncome({ ...income, call_booking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="agent_booking" className="text-xs">Agent Booking</Label>
                  <Input
                    id="agent_booking"
                    type="number"
                    value={income.agent_booking || ''}
                    onChange={(e) => setIncome({ ...income, agent_booking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="luggage_income" className="text-xs">Luggage Income</Label>
                  <Input
                    id="luggage_income"
                    type="number"
                    value={income.luggage_income || ''}
                    onChange={(e) => setIncome({ ...income, luggage_income: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="miscellaneous_income" className="text-xs">Miscellaneous Income</Label>
                  <Input
                    id="miscellaneous_income"
                    type="number"
                    value={income.miscellaneous_income || ''}
                    onChange={(e) => setIncome({ ...income, miscellaneous_income: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="others" className="text-xs">Others</Label>
                  <Input
                    id="others"
                    type="number"
                    value={income.others || ''}
                    onChange={(e) => setIncome({ ...income, others: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card>
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-sm md:text-base">Expenses</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                <div className="space-y-1">
                  <Label htmlFor="repair" className="text-xs">Bus Maintenance & Repair</Label>
                  <Input
                    id="repair"
                    type="number"
                    value={expenses.repair || ''}
                    onChange={(e) => setExpenses({ ...expenses, repair: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tyre_tube" className="text-xs">Tyre & Tube</Label>
                  <Input
                    id="tyre_tube"
                    type="number"
                    value={expenses.tyre_tube || ''}
                    onChange={(e) => setExpenses({ ...expenses, tyre_tube: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="salary" className="text-xs">Wages - Drivers & Assistants</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={expenses.salary || ''}
                    onChange={(e) => setExpenses({ ...expenses, salary: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="police" className="text-xs">Fines and Penalties</Label>
                  <Input
                    id="police"
                    type="number"
                    value={expenses.police || ''}
                    onChange={(e) => setExpenses({ ...expenses, police: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="food" className="text-xs">Staff Meals & Welfare</Label>
                  <Input
                    id="food"
                    type="number"
                    value={expenses.food || ''}
                    onChange={(e) => setExpenses({ ...expenses, food: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emission_fitness" className="text-xs">Emission Reports/Fitness</Label>
                  <Input
                    id="emission_fitness"
                    type="number"
                    value={expenses.emission_fitness || ''}
                    onChange={(e) => setExpenses({ ...expenses, emission_fitness: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="permits_renewal" className="text-xs">Permits Renewal Charges</Label>
                  <Input
                    id="permits_renewal"
                    type="number"
                    value={expenses.permits_renewal || ''}
                    onChange={(e) => setExpenses({ ...expenses, permits_renewal: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="staff_accommodation" className="text-xs">Staff Accommodation</Label>
                  <Input
                    id="staff_accommodation"
                    type="number"
                    value={expenses.staff_accommodation || ''}
                    onChange={(e) => setExpenses({ ...expenses, staff_accommodation: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="highway_charges" className="text-xs">Highway Charges</Label>
                  <Input
                    id="highway_charges"
                    type="number"
                    value={expenses.highway_charges || ''}
                    onChange={(e) => setExpenses({ ...expenses, highway_charges: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="accident_compensation" className="text-xs">Accident Compensation</Label>
                  <Input
                    id="accident_compensation"
                    type="number"
                    value={expenses.accident_compensation || ''}
                    onChange={(e) => setExpenses({ ...expenses, accident_compensation: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="parking" className="text-xs">Parking Fee</Label>
                  <Input
                    id="parking"
                    type="number"
                    value={expenses.parking || ''}
                    onChange={(e) => setExpenses({ ...expenses, parking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="log_sheet" className="text-xs">Log Sheet Charges</Label>
                  <Input
                    id="log_sheet"
                    type="number"
                    value={expenses.log_sheet || ''}
                    onChange={(e) => setExpenses({ ...expenses, log_sheet: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vehicle_hire" className="text-xs">Vehicle Hire Charges</Label>
                  <Input
                    id="vehicle_hire"
                    type="number"
                    value={expenses.vehicle_hire || ''}
                    onChange={(e) => setExpenses({ ...expenses, vehicle_hire: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ntc" className="text-xs">NTC</Label>
                  <Input
                    id="ntc"
                    type="number"
                    value={expenses.ntc || ''}
                    onChange={(e) => setExpenses({ ...expenses, ntc: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="runner" className="text-xs">Runner</Label>
                  <Input
                    id="runner"
                    type="number"
                    value={expenses.runner || ''}
                    onChange={(e) => setExpenses({ ...expenses, runner: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="short_misc" className="text-xs">Short - Miscellaneous</Label>
                  <Input
                    id="short_misc"
                    type="number"
                    value={expenses.short_misc || ''}
                    onChange={(e) => setExpenses({ ...expenses, short_misc: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="temporary_permit" className="text-xs">Temporary Permit</Label>
                  <Input
                    id="temporary_permit"
                    type="number"
                    value={expenses.temporary_permit || ''}
                    onChange={(e) => setExpenses({ ...expenses, temporary_permit: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="body_wash" className="text-xs">Body Wash and Service</Label>
                  <Input
                    id="body_wash"
                    type="number"
                    value={expenses.body_wash || ''}
                    onChange={(e) => setExpenses({ ...expenses, body_wash: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="legal_court" className="text-xs">Legal & Court Fee</Label>
                  <Input
                    id="legal_court"
                    type="number"
                    value={expenses.legal_court || ''}
                    onChange={(e) => setExpenses({ ...expenses, legal_court: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="other" className="text-xs">Other</Label>
                  <Input
                    id="other"
                    type="number"
                    value={expenses.other || ''}
                    onChange={(e) => setExpenses({ ...expenses, other: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

      {/* Sticky Footer with Summary and Actions - Ultra Compact */}
      <div className="fixed md:static bottom-0 left-0 right-0 border-t bg-card p-1.5 md:p-2 shadow-lg md:shadow-none">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-1.5 md:gap-3 mb-1.5 md:mb-2">
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0">Revenue</p>
              <p className="text-xs md:text-sm font-bold text-green-600">
                Rs {totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0">Fuel</p>
              <p className="text-xs md:text-sm font-bold text-orange-600">
                Rs {fuelCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0">Other Exp</p>
              <p className="text-xs md:text-sm font-bold text-red-600">
                Rs {totalOtherExpenses.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0">Net Profit</p>
              <p className={cn(
                "text-xs md:text-sm font-bold",
                netProfit >= 0 ? "text-green-600" : "text-red-600"
              )}>
                Rs {netProfit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-1.5 md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full md:w-auto h-8 text-xs"
            >
              {saving ? "Saving..." : "Save & Stay"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-full md:w-auto h-8 text-xs"
            >
              {saving ? "Saving..." : "Save & Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}