import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign, TrendingDown, TrendingUp, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface QuickEntryPanelProps {
  tripId?: string;
  allowTripSelection?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface IncomeDetails {
  bus_collection: number;
  call_booking: number;
  agent_booking: number;
  luggage_income: number;
  miscellaneous_income: number;
  others: number;
  others_description: string;
}

interface ExpenseDetails {
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
  other_description: string;
}

export function QuickEntryPanel({ tripId, allowTripSelection = false, onSuccess, onCancel }: QuickEntryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | undefined>(tripId);
  const [tripInfo, setTripInfo] = useState<any>(null);

  const [income, setIncome] = useState<IncomeDetails>({
    bus_collection: 0,
    call_booking: 0,
    agent_booking: 0,
    luggage_income: 0,
    miscellaneous_income: 0,
    others: 0,
    others_description: '',
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
    other_description: '',
  });

  useEffect(() => {
    if (currentTripId) {
      loadTripData();
    }
  }, [currentTripId]);

  useEffect(() => {
    if (allowTripSelection && selectedDate) {
      loadTripsForDate(selectedDate);
    }
  }, [selectedDate, allowTripSelection]);

  useEffect(() => {
    if (allowTripSelection && selectedDate && selectedBusId) {
      const trip = availableTrips.find(t => t.bus_id === selectedBusId);
      if (trip) {
        setCurrentTripId(trip.id);
      }
    }
  }, [selectedBusId, selectedDate, availableTrips, allowTripSelection]);

  const loadTripsForDate = async (date: Date) => {
    try {
      setLoading(true);
      const formattedDate = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_trips')
        .select(`
          id,
          trip_no,
          trip_date,
          bus_id,
          buses!inner(bus_no)
        `)
        .eq('trip_date', formattedDate)
        .order('trip_no');
      
      if (error) throw error;
      setAvailableTrips(data || []);
    } catch (error: any) {
      console.error('Error loading trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trips for selected date',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTripData = async () => {
    if (!currentTripId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_trips')
        .select('*, buses(bus_no)')
        .eq('id', currentTripId)
        .single();

      if (error) throw error;

      setTripInfo(data);

      // Load existing income details (with backward compatibility)
      if (data.income_details && typeof data.income_details === 'object') {
        const incomeData = data.income_details as any;
        setIncome({
          bus_collection: Number(incomeData.bus_collection || incomeData.daily_collection) || 0,
          call_booking: Number(incomeData.call_booking || incomeData.call_collection) || 0,
          agent_booking: Number(incomeData.agent_booking || incomeData.agent_collection) || 0,
          luggage_income: Number(incomeData.luggage_income || incomeData.luggage_collection) || 0,
          miscellaneous_income: Number(incomeData.miscellaneous_income || incomeData.missional) || 0,
          others: Number(incomeData.others) || 0,
          others_description: String(incomeData.others_description || ''),
        });
      }

      // Load existing expense details (with backward compatibility)
      if (data.other_expenses_details && typeof data.other_expenses_details === 'object') {
        const expenseData = data.other_expenses_details as any;
        setExpenses({
          fuel: Number(expenseData.fuel || data.fuel_cost || 0),
          repair: Number(expenseData.repair) || 0,
          tyre_tube: Number(expenseData.tyre_tube) || 0,
          salary: Number(expenseData.salary) || 0,
          police: Number(expenseData.police) || 0,
          food: Number(expenseData.food) || 0,
          emission_fitness: Number(expenseData.emission_fitness) || 0,
          permits_renewal: Number(expenseData.permits_renewal) || 0,
          staff_accommodation: Number(expenseData.staff_accommodation) || 0,
          highway_charges: Number(expenseData.highway_charges || expenseData.toll) || 0,
          accident_compensation: Number(expenseData.accident_compensation) || 0,
          parking: Number(expenseData.parking) || 0,
          log_sheet: Number(expenseData.log_sheet) || 0,
          vehicle_hire: Number(expenseData.vehicle_hire) || 0,
          ntc: Number(expenseData.ntc) || 0,
          runner: Number(expenseData.runner) || 0,
          short_misc: Number(expenseData.short_misc) || 0,
          temporary_permit: Number(expenseData.temporary_permit) || 0,
          body_wash: Number(expenseData.body_wash) || 0,
          legal_court: Number(expenseData.legal_court) || 0,
          other: Number(expenseData.other || expenseData.phone || expenseData.water) || 0,
          other_description: String(expenseData.other_description || ''),
        });
      }
    } catch (error: any) {
      console.error('Error loading trip:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalRevenue = () => {
    return (
      income.bus_collection +
      income.call_booking +
      income.agent_booking +
      income.luggage_income +
      income.miscellaneous_income +
      income.others
    );
  };

  const calculateTotalExpenses = () => {
    return (
      expenses.fuel +
      expenses.repair +
      expenses.tyre_tube +
      expenses.salary +
      expenses.police +
      expenses.food +
      expenses.emission_fitness +
      expenses.permits_renewal +
      expenses.staff_accommodation +
      expenses.highway_charges +
      expenses.accident_compensation +
      expenses.parking +
      expenses.log_sheet +
      expenses.vehicle_hire +
      expenses.ntc +
      expenses.runner +
      expenses.short_misc +
      expenses.temporary_permit +
      expenses.body_wash +
      expenses.legal_court +
      expenses.other
    );
  };

  const calculateNetProfit = () => {
    return calculateTotalRevenue() - calculateTotalExpenses();
  };

  const handleSave = async () => {
    if (!currentTripId) {
      toast({
        title: 'Error',
        description: 'Please select a trip first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('daily_trips')
        .update({
          income_details: income as any,
          other_expenses_details: expenses as any,
          fuel_cost: expenses.fuel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentTripId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Income and expenses updated successfully',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !allowTripSelection) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trip Selector (when allowTripSelection is true and no trip selected yet) */}
      {allowTripSelection && !currentTripId && (
        <div className="bg-muted/50 p-6 rounded-lg space-y-4">
          <h3 className="font-semibold text-lg mb-4">Select Trip</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Trip Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Bus Number</Label>
              <Select
                value={selectedBusId}
                onValueChange={setSelectedBusId}
                disabled={!selectedDate || availableTrips.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedDate 
                      ? "Select date first" 
                      : availableTrips.length === 0 
                        ? "No trips found for this date"
                        : "Select bus"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableTrips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.bus_id}>
                      {(trip.buses as any).bus_no} - Trip #{trip.trip_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedDate && (
            <p className="text-sm text-muted-foreground mt-4">
              ⚠️ Please select a date and bus number to continue
            </p>
          )}
        </div>
      )}

      {/* Trip Info Header (shown when trip is selected) */}
      {tripInfo && currentTripId && (
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold">
            Trip: {tripInfo?.trip_no || 'N/A'} | Bus: {tripInfo?.buses?.bus_no || 'N/A'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Date: {new Date(tripInfo?.trip_date).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Income & Expense Sections (only show when trip is selected) */}
      {currentTripId && (
        <>
          {/* Two Column Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">REVENUE (₨)</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="bus_collection">Bus Collection</Label>
                  <Input
                    id="bus_collection"
                    type="number"
                    value={income.bus_collection}
                    onChange={(e) =>
                      setIncome({ ...income, bus_collection: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="call_booking">Call Booking</Label>
                  <Input
                    id="call_booking"
                    type="number"
                    value={income.call_booking}
                    onChange={(e) =>
                      setIncome({ ...income, call_booking: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="agent_booking">Agent Booking</Label>
                  <Input
                    id="agent_booking"
                    type="number"
                    value={income.agent_booking}
                    onChange={(e) =>
                      setIncome({ ...income, agent_booking: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="luggage_income">Luggage Income</Label>
                  <Input
                    id="luggage_income"
                    type="number"
                    value={income.luggage_income}
                    onChange={(e) =>
                      setIncome({ ...income, luggage_income: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="miscellaneous_income">Miscellaneous Income</Label>
                  <Input
                    id="miscellaneous_income"
                    type="number"
                    value={income.miscellaneous_income}
                    onChange={(e) =>
                      setIncome({ ...income, miscellaneous_income: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="others_income">Others</Label>
                  <Input
                    id="others_income"
                    type="number"
                    value={income.others}
                    onChange={(e) => setIncome({ ...income, others: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <Textarea
                    className="mt-2"
                    value={income.others_description}
                    onChange={(e) => setIncome({ ...income, others_description: e.target.value })}
                    placeholder="Description..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Revenue:</span>
                  <span className="text-green-600">₨ {calculateTotalRevenue().toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold">EXPENSES (₨)</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="fuel">Fuel Expenses</Label>
                  <Input
                    id="fuel"
                    type="number"
                    value={expenses.fuel}
                    onChange={(e) => setExpenses({ ...expenses, fuel: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="repair">Bus Maintenance & Repair</Label>
                  <Input
                    id="repair"
                    type="number"
                    value={expenses.repair}
                    onChange={(e) =>
                      setExpenses({ ...expenses, repair: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="tyre_tube">Tyre & Tube Expenses</Label>
                  <Input
                    id="tyre_tube"
                    type="number"
                    value={expenses.tyre_tube}
                    onChange={(e) =>
                      setExpenses({ ...expenses, tyre_tube: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="salary">Wages - Drivers & Assistants</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={expenses.salary}
                    onChange={(e) =>
                      setExpenses({ ...expenses, salary: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="police">Fines and Penalties</Label>
                  <Input
                    id="police"
                    type="number"
                    value={expenses.police}
                    onChange={(e) =>
                      setExpenses({ ...expenses, police: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="food">Staff Meals & Welfare</Label>
                  <Input
                    id="food"
                    type="number"
                    value={expenses.food}
                    onChange={(e) => setExpenses({ ...expenses, food: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="emission_fitness">Emission Reports/Fitness</Label>
                  <Input
                    id="emission_fitness"
                    type="number"
                    value={expenses.emission_fitness}
                    onChange={(e) =>
                      setExpenses({ ...expenses, emission_fitness: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="permits_renewal">Permits Renewal Charges</Label>
                  <Input
                    id="permits_renewal"
                    type="number"
                    value={expenses.permits_renewal}
                    onChange={(e) =>
                      setExpenses({ ...expenses, permits_renewal: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="staff_accommodation">Staff Accommodation</Label>
                  <Input
                    id="staff_accommodation"
                    type="number"
                    value={expenses.staff_accommodation}
                    onChange={(e) =>
                      setExpenses({ ...expenses, staff_accommodation: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="highway_charges">Highway Charges</Label>
                  <Input
                    id="highway_charges"
                    type="number"
                    value={expenses.highway_charges}
                    onChange={(e) =>
                      setExpenses({ ...expenses, highway_charges: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="accident_compensation">Accident Compensation</Label>
                  <Input
                    id="accident_compensation"
                    type="number"
                    value={expenses.accident_compensation}
                    onChange={(e) =>
                      setExpenses({ ...expenses, accident_compensation: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="parking">Parking Fee</Label>
                  <Input
                    id="parking"
                    type="number"
                    value={expenses.parking}
                    onChange={(e) =>
                      setExpenses({ ...expenses, parking: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="log_sheet">Log Sheet Charges</Label>
                  <Input
                    id="log_sheet"
                    type="number"
                    value={expenses.log_sheet}
                    onChange={(e) =>
                      setExpenses({ ...expenses, log_sheet: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="vehicle_hire">Vehicle Hire Charges</Label>
                  <Input
                    id="vehicle_hire"
                    type="number"
                    value={expenses.vehicle_hire}
                    onChange={(e) =>
                      setExpenses({ ...expenses, vehicle_hire: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="ntc">NTC</Label>
                  <Input
                    id="ntc"
                    type="number"
                    value={expenses.ntc}
                    onChange={(e) =>
                      setExpenses({ ...expenses, ntc: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="runner">Runner</Label>
                  <Input
                    id="runner"
                    type="number"
                    value={expenses.runner}
                    onChange={(e) =>
                      setExpenses({ ...expenses, runner: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="short_misc">Short - Miscellaneous</Label>
                  <Input
                    id="short_misc"
                    type="number"
                    value={expenses.short_misc}
                    onChange={(e) =>
                      setExpenses({ ...expenses, short_misc: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="temporary_permit">Temporary Permit</Label>
                  <Input
                    id="temporary_permit"
                    type="number"
                    value={expenses.temporary_permit}
                    onChange={(e) =>
                      setExpenses({ ...expenses, temporary_permit: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="body_wash">Body Wash and Service</Label>
                  <Input
                    id="body_wash"
                    type="number"
                    value={expenses.body_wash}
                    onChange={(e) =>
                      setExpenses({ ...expenses, body_wash: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="legal_court">Legal & Court Fee</Label>
                  <Input
                    id="legal_court"
                    type="number"
                    value={expenses.legal_court}
                    onChange={(e) =>
                      setExpenses({ ...expenses, legal_court: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="other_expense">Other</Label>
                  <Input
                    id="other_expense"
                    type="number"
                    value={expenses.other}
                    onChange={(e) => setExpenses({ ...expenses, other: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <Textarea
                    className="mt-2"
                    value={expenses.other_description}
                    onChange={(e) => setExpenses({ ...expenses, other_description: e.target.value })}
                    placeholder="Description..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Expenses:</span>
                  <span className="text-red-600">₨ {calculateTotalExpenses().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Profit Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                <span className="text-xl font-bold">NET PROFIT:</span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  calculateNetProfit() >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ₨ {calculateNetProfit().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
