import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  fuel: number;
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

  const [income, setIncome] = useState<IncomeDetails>({
    bus_collection: 0,
    call_booking: 0,
    agent_booking: 0,
    luggage_income: 0,
    miscellaneous_income: 0,
    others: 0,
  });

  const [expenses, setExpenses] = useState<ExpenseDetails>({
    fuel: 0,
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
      const { data, error } = await supabase
        .from('daily_trips')
        .select('income_details, other_expenses_details')
        .eq('id', tripId)
        .single();

      if (error) throw error;

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
          fuel: safeParseNumber(expensesData.fuel),
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
      const totalExpenses = calculateTotal(expenses);
      const netIncome = totalIncome - totalExpenses;

      console.log('💾 Saving Quick Entry Data:', {
        tripId,
        income_details: income,
        other_expenses_details: expenses,
        totalIncome,
        totalExpenses,
        netIncome
      });

      const { error } = await supabase
        .from('daily_trips')
        .update({
          income_details: income as any,
          other_expenses_details: expenses as any,
          income: totalIncome,
          other_expenses: totalExpenses,
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
          description: `Saved: Income LKR ${totalIncome.toLocaleString()}, Expenses LKR ${totalExpenses.toLocaleString()}`,
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
  const totalExpenses = calculateTotal(expenses);
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
      {/* Header */}
      <div className="border-b bg-card p-3 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Bus {busNo}</h2>
            {route && <p className="text-xs md:text-sm text-muted-foreground mt-1">{route}</p>}
          </div>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-auto p-3 md:p-6 pb-32 md:pb-6">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          {/* Revenue Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bus_collection" className="text-sm md:text-base">Bus Collection</Label>
                  <Input
                    id="bus_collection"
                    type="number"
                    value={income.bus_collection || ''}
                    onChange={(e) => setIncome({ ...income, bus_collection: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call_booking" className="text-sm md:text-base">Call Booking</Label>
                  <Input
                    id="call_booking"
                    type="number"
                    value={income.call_booking || ''}
                    onChange={(e) => setIncome({ ...income, call_booking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent_booking" className="text-sm md:text-base">Agent Booking</Label>
                  <Input
                    id="agent_booking"
                    type="number"
                    value={income.agent_booking || ''}
                    onChange={(e) => setIncome({ ...income, agent_booking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="luggage_income" className="text-sm md:text-base">Luggage Income</Label>
                  <Input
                    id="luggage_income"
                    type="number"
                    value={income.luggage_income || ''}
                    onChange={(e) => setIncome({ ...income, luggage_income: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="miscellaneous_income" className="text-sm md:text-base">Miscellaneous Income</Label>
                  <Input
                    id="miscellaneous_income"
                    type="number"
                    value={income.miscellaneous_income || ''}
                    onChange={(e) => setIncome({ ...income, miscellaneous_income: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="others" className="text-sm md:text-base">Others</Label>
                  <Input
                    id="others"
                    type="number"
                    value={income.others || ''}
                    onChange={(e) => setIncome({ ...income, others: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel" className="text-sm md:text-base">Fuel Expenses</Label>
                  <Input
                    id="fuel"
                    type="number"
                    value={expenses.fuel || ''}
                    onChange={(e) => setExpenses({ ...expenses, fuel: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repair" className="text-sm md:text-base">Bus Maintenance & Repair</Label>
                  <Input
                    id="repair"
                    type="number"
                    value={expenses.repair || ''}
                    onChange={(e) => setExpenses({ ...expenses, repair: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tyre_tube" className="text-sm md:text-base">Tyre & Tube</Label>
                  <Input
                    id="tyre_tube"
                    type="number"
                    value={expenses.tyre_tube || ''}
                    onChange={(e) => setExpenses({ ...expenses, tyre_tube: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm md:text-base">Wages - Drivers & Assistants</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={expenses.salary || ''}
                    onChange={(e) => setExpenses({ ...expenses, salary: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="police" className="text-sm md:text-base">Fines and Penalties</Label>
                  <Input
                    id="police"
                    type="number"
                    value={expenses.police || ''}
                    onChange={(e) => setExpenses({ ...expenses, police: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="food" className="text-sm md:text-base">Staff Meals & Welfare</Label>
                  <Input
                    id="food"
                    type="number"
                    value={expenses.food || ''}
                    onChange={(e) => setExpenses({ ...expenses, food: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emission_fitness" className="text-sm md:text-base">Emission Reports/Fitness</Label>
                  <Input
                    id="emission_fitness"
                    type="number"
                    value={expenses.emission_fitness || ''}
                    onChange={(e) => setExpenses({ ...expenses, emission_fitness: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permits_renewal" className="text-sm md:text-base">Permits Renewal Charges</Label>
                  <Input
                    id="permits_renewal"
                    type="number"
                    value={expenses.permits_renewal || ''}
                    onChange={(e) => setExpenses({ ...expenses, permits_renewal: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff_accommodation" className="text-sm md:text-base">Staff Accommodation</Label>
                  <Input
                    id="staff_accommodation"
                    type="number"
                    value={expenses.staff_accommodation || ''}
                    onChange={(e) => setExpenses({ ...expenses, staff_accommodation: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highway_charges" className="text-sm md:text-base">Highway Charges</Label>
                  <Input
                    id="highway_charges"
                    type="number"
                    value={expenses.highway_charges || ''}
                    onChange={(e) => setExpenses({ ...expenses, highway_charges: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accident_compensation" className="text-sm md:text-base">Accident Compensation</Label>
                  <Input
                    id="accident_compensation"
                    type="number"
                    value={expenses.accident_compensation || ''}
                    onChange={(e) => setExpenses({ ...expenses, accident_compensation: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parking" className="text-sm md:text-base">Parking Fee</Label>
                  <Input
                    id="parking"
                    type="number"
                    value={expenses.parking || ''}
                    onChange={(e) => setExpenses({ ...expenses, parking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="log_sheet" className="text-sm md:text-base">Log Sheet Charges</Label>
                  <Input
                    id="log_sheet"
                    type="number"
                    value={expenses.log_sheet || ''}
                    onChange={(e) => setExpenses({ ...expenses, log_sheet: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_hire" className="text-sm md:text-base">Vehicle Hire Charges</Label>
                  <Input
                    id="vehicle_hire"
                    type="number"
                    value={expenses.vehicle_hire || ''}
                    onChange={(e) => setExpenses({ ...expenses, vehicle_hire: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ntc" className="text-sm md:text-base">NTC</Label>
                  <Input
                    id="ntc"
                    type="number"
                    value={expenses.ntc || ''}
                    onChange={(e) => setExpenses({ ...expenses, ntc: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="runner" className="text-sm md:text-base">Runner</Label>
                  <Input
                    id="runner"
                    type="number"
                    value={expenses.runner || ''}
                    onChange={(e) => setExpenses({ ...expenses, runner: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_misc" className="text-sm md:text-base">Short - Miscellaneous</Label>
                  <Input
                    id="short_misc"
                    type="number"
                    value={expenses.short_misc || ''}
                    onChange={(e) => setExpenses({ ...expenses, short_misc: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temporary_permit" className="text-sm md:text-base">Temporary Permit</Label>
                  <Input
                    id="temporary_permit"
                    type="number"
                    value={expenses.temporary_permit || ''}
                    onChange={(e) => setExpenses({ ...expenses, temporary_permit: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body_wash" className="text-sm md:text-base">Body Wash and Service</Label>
                  <Input
                    id="body_wash"
                    type="number"
                    value={expenses.body_wash || ''}
                    onChange={(e) => setExpenses({ ...expenses, body_wash: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_court" className="text-sm md:text-base">Legal & Court Fee</Label>
                  <Input
                    id="legal_court"
                    type="number"
                    value={expenses.legal_court || ''}
                    onChange={(e) => setExpenses({ ...expenses, legal_court: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other" className="text-sm md:text-base">Other</Label>
                  <Input
                    id="other"
                    type="number"
                    value={expenses.other || ''}
                    onChange={(e) => setExpenses({ ...expenses, other: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-11 md:h-10 text-base"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Footer with Summary and Actions - Mobile Optimized */}
      <div className="fixed md:static bottom-0 left-0 right-0 border-t bg-card p-3 md:p-6 shadow-lg md:shadow-none">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-2 md:gap-8 mb-3 md:mb-6">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Revenue</p>
              <p className="text-sm md:text-2xl font-bold text-green-600">
                {totalRevenue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Expenses</p>
              <p className="text-sm md:text-2xl font-bold text-red-600">
                {totalExpenses.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Net Profit</p>
              <p className={cn(
                "text-sm md:text-2xl font-bold",
                netProfit >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:gap-3 md:justify-end">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full md:w-auto h-11 md:h-10"
            >
              {saving ? "Saving..." : "Save & Stay"}
            </Button>
            <Button
              size="lg"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-full md:w-auto h-11 md:h-10"
            >
              {saving ? "Saving..." : "Save & Next Bus"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}