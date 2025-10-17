import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, SkipForward, ChevronRight } from "lucide-react";

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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Bus: {busNo}</h2>
        {route && <p className="text-muted-foreground">{route}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Section */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Bus Collection</Label>
              <Input
                type="number"
                value={income.bus_collection || ''}
                onChange={(e) => setIncome({ ...income, bus_collection: safeParseNumber(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Call Booking</Label>
              <Input
                type="number"
                value={income.call_booking || ''}
                onChange={(e) => setIncome({ ...income, call_booking: safeParseNumber(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Agent Booking</Label>
              <Input
                type="number"
                value={income.agent_booking || ''}
                onChange={(e) => setIncome({ ...income, agent_booking: safeParseNumber(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Luggage Income</Label>
              <Input
                type="number"
                value={income.luggage_income || ''}
                onChange={(e) => setIncome({ ...income, luggage_income: safeParseNumber(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Miscellaneous Income</Label>
              <Input
                type="number"
                value={income.miscellaneous_income || ''}
                onChange={(e) => setIncome({ ...income, miscellaneous_income: safeParseNumber(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Others</Label>
              <Input
                type="number"
                value={income.others || ''}
                onChange={(e) => setIncome({ ...income, others: safeParseNumber(e.target.value) })}
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Expenses Section */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
              <div>
                <Label>Fuel Expenses</Label>
                <Input
                  type="number"
                  value={expenses.fuel || ''}
                  onChange={(e) => setExpenses({ ...expenses, fuel: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Bus Maintenance & Repair</Label>
                <Input
                  type="number"
                  value={expenses.repair || ''}
                  onChange={(e) => setExpenses({ ...expenses, repair: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Tyre & Tube</Label>
                <Input
                  type="number"
                  value={expenses.tyre_tube || ''}
                  onChange={(e) => setExpenses({ ...expenses, tyre_tube: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Wages - Drivers & Assistants</Label>
                <Input
                  type="number"
                  value={expenses.salary || ''}
                  onChange={(e) => setExpenses({ ...expenses, salary: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Fines and Penalties</Label>
                <Input
                  type="number"
                  value={expenses.police || ''}
                  onChange={(e) => setExpenses({ ...expenses, police: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Staff Meals & Welfare</Label>
                <Input
                  type="number"
                  value={expenses.food || ''}
                  onChange={(e) => setExpenses({ ...expenses, food: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Emission Reports/Fitness</Label>
                <Input
                  type="number"
                  value={expenses.emission_fitness || ''}
                  onChange={(e) => setExpenses({ ...expenses, emission_fitness: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Permits Renewal Charges</Label>
                <Input
                  type="number"
                  value={expenses.permits_renewal || ''}
                  onChange={(e) => setExpenses({ ...expenses, permits_renewal: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Staff Accommodation</Label>
                <Input
                  type="number"
                  value={expenses.staff_accommodation || ''}
                  onChange={(e) => setExpenses({ ...expenses, staff_accommodation: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Highway Charges</Label>
                <Input
                  type="number"
                  value={expenses.highway_charges || ''}
                  onChange={(e) => setExpenses({ ...expenses, highway_charges: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Accident Compensation</Label>
                <Input
                  type="number"
                  value={expenses.accident_compensation || ''}
                  onChange={(e) => setExpenses({ ...expenses, accident_compensation: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Parking Fee</Label>
                <Input
                  type="number"
                  value={expenses.parking || ''}
                  onChange={(e) => setExpenses({ ...expenses, parking: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Log Sheet Charges</Label>
                <Input
                  type="number"
                  value={expenses.log_sheet || ''}
                  onChange={(e) => setExpenses({ ...expenses, log_sheet: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Vehicle Hire Charges</Label>
                <Input
                  type="number"
                  value={expenses.vehicle_hire || ''}
                  onChange={(e) => setExpenses({ ...expenses, vehicle_hire: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>NTC</Label>
                <Input
                  type="number"
                  value={expenses.ntc || ''}
                  onChange={(e) => setExpenses({ ...expenses, ntc: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Runner</Label>
                <Input
                  type="number"
                  value={expenses.runner || ''}
                  onChange={(e) => setExpenses({ ...expenses, runner: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Short - Miscellaneous</Label>
                <Input
                  type="number"
                  value={expenses.short_misc || ''}
                  onChange={(e) => setExpenses({ ...expenses, short_misc: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Temporary Permit</Label>
                <Input
                  type="number"
                  value={expenses.temporary_permit || ''}
                  onChange={(e) => setExpenses({ ...expenses, temporary_permit: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Body Wash and Service</Label>
                <Input
                  type="number"
                  value={expenses.body_wash || ''}
                  onChange={(e) => setExpenses({ ...expenses, body_wash: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Legal & Court Fee</Label>
                <Input
                  type="number"
                  value={expenses.legal_court || ''}
                  onChange={(e) => setExpenses({ ...expenses, legal_court: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Other</Label>
                <Input
                  type="number"
                  value={expenses.other || ''}
                  onChange={(e) => setExpenses({ ...expenses, other: safeParseNumber(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center text-lg">
            <div>
              <span className="text-muted-foreground">Total Revenue:</span>
              <span className="ml-2 font-semibold">₨ {totalRevenue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Expenses:</span>
              <span className="ml-2 font-semibold">₨ {totalExpenses.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Net Profit:</span>
              <span className={`ml-2 font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₨ {netProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          Save & Stay
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            "Saving..."
          ) : (
            <>
              Save & Next Bus
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}