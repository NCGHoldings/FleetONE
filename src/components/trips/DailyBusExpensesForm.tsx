import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Save, Copy, Info } from "lucide-react";
import { DailyBusExpense } from "@/hooks/useDailyBusExpenses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Bus {
  id: string;
  bus_no: string;
}

interface Props {
  date: Date;
  onSave: (expense: DailyBusExpense) => Promise<boolean>;
  existingExpense?: DailyBusExpense & { buses?: { bus_no: string } };
  readOnly?: boolean;
  initialBusId?: string;
}

export function DailyBusExpensesForm({ date, onSave, existingExpense, readOnly = false, initialBusId }: Props) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [tripCount, setTripCount] = useState(0);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);

  const [expenses, setExpenses] = useState<Omit<DailyBusExpense, 'expense_date' | 'bus_id'>>({
    fuel_cost: 0,
    diesel_price_per_liter: 350,
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
    notes: ""
  });

  useEffect(() => {
    fetchBuses();
  }, []);

  // Auto-select initial bus if provided
  useEffect(() => {
    if (initialBusId && !selectedBusId) {
      setSelectedBusId(initialBusId);
    }
  }, [initialBusId]);

  useEffect(() => {
    if (existingExpense) {
      setSelectedBusId(existingExpense.bus_id);
      setExpenses({
        fuel_cost: existingExpense.fuel_cost || 0,
        diesel_price_per_liter: existingExpense.diesel_price_per_liter || 350,
        repair: existingExpense.repair || 0,
        tyre_tube: existingExpense.tyre_tube || 0,
        salary: existingExpense.salary || 0,
        police: existingExpense.police || 0,
        food: existingExpense.food || 0,
        emission_fitness: existingExpense.emission_fitness || 0,
        permits_renewal: existingExpense.permits_renewal || 0,
        staff_accommodation: existingExpense.staff_accommodation || 0,
        highway_charges: existingExpense.highway_charges || 0,
        accident_compensation: existingExpense.accident_compensation || 0,
        parking: existingExpense.parking || 0,
        log_sheet: existingExpense.log_sheet || 0,
        vehicle_hire: existingExpense.vehicle_hire || 0,
        ntc: existingExpense.ntc || 0,
        runner: existingExpense.runner || 0,
        short_misc: existingExpense.short_misc || 0,
        temporary_permit: existingExpense.temporary_permit || 0,
        body_wash: existingExpense.body_wash || 0,
        legal_court: existingExpense.legal_court || 0,
        other: existingExpense.other || 0,
        notes: existingExpense.notes || ""
      });
    }
  }, [existingExpense]);

  useEffect(() => {
    if (selectedBusId) {
      fetchTripCount();
      // Auto-fetch expenses for this bus/date (for view-only mode)
      fetchExpensesForBusDate();
    }
  }, [selectedBusId, date]);

  const fetchExpensesForBusDate = async () => {
    if (!selectedBusId) return;
    
    const dateStr = format(date, 'yyyy-MM-dd'); // Fix: Use format instead of toISOString
    const { data, error } = await supabase
      .from("daily_bus_expenses")
      .select("*")
      .eq("bus_id", selectedBusId)
      .eq("expense_date", dateStr)
      .maybeSingle();

    if (data && !error) {
      console.log(`📊 Fetching expenses for bus ${selectedBusId} on ${dateStr}`);
      console.log('   Query result:', data);
      console.log('   Fuel cost from DB:', data.fuel_cost);
      setExpenses({
        fuel_cost: data.fuel_cost || 0,
        diesel_price_per_liter: data.diesel_price_per_liter || 350,
        repair: data.repair || 0,
        tyre_tube: data.tyre_tube || 0,
        salary: data.salary || 0,
        police: data.police || 0,
        food: data.food || 0,
        emission_fitness: data.emission_fitness || 0,
        permits_renewal: data.permits_renewal || 0,
        staff_accommodation: data.staff_accommodation || 0,
        highway_charges: data.highway_charges || 0,
        accident_compensation: data.accident_compensation || 0,
        parking: data.parking || 0,
        log_sheet: data.log_sheet || 0,
        vehicle_hire: data.vehicle_hire || 0,
        ntc: data.ntc || 0,
        runner: data.runner || 0,
        short_misc: data.short_misc || 0,
        temporary_permit: data.temporary_permit || 0,
        body_wash: data.body_wash || 0,
        legal_court: data.legal_court || 0,
        other: data.other || 0,
        notes: data.notes || ""
      });
    }
  };

  const fetchBuses = async () => {
    const { data } = await supabase
      .from("buses")
      .select("id, bus_no")
      .eq("status", "active")
      .order("bus_no");
    
    if (data) setBuses(data);
  };

  const fetchTripCount = async () => {
    const dateStr = date.toISOString().split('T')[0];
    const { count } = await supabase
      .from("daily_trips")
      .select("*", { count: "exact", head: true })
      .eq("bus_id", selectedBusId)
      .eq("trip_date", dateStr);
    
    setTripCount(count || 0);
  };

  const copyPreviousDayExpenses = async () => {
    if (!selectedBusId) {
      toast({
        title: "Error",
        description: "Please select a bus first",
        variant: "destructive"
      });
      return;
    }

    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("daily_bus_expenses")
      .select("*")
      .eq("bus_id", selectedBusId)
      .eq("expense_date", prevDateStr)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Info",
        description: "No expenses found for previous day",
      });
      return;
    }

    setExpenses({
      fuel_cost: data.fuel_cost || 0,
      diesel_price_per_liter: data.diesel_price_per_liter || 350,
      repair: data.repair || 0,
      tyre_tube: data.tyre_tube || 0,
      salary: data.salary || 0,
      police: data.police || 0,
      food: data.food || 0,
      emission_fitness: data.emission_fitness || 0,
      permits_renewal: data.permits_renewal || 0,
      staff_accommodation: data.staff_accommodation || 0,
      highway_charges: data.highway_charges || 0,
      accident_compensation: data.accident_compensation || 0,
      parking: data.parking || 0,
      log_sheet: data.log_sheet || 0,
      vehicle_hire: data.vehicle_hire || 0,
      ntc: data.ntc || 0,
      runner: data.runner || 0,
      short_misc: data.short_misc || 0,
      temporary_permit: data.temporary_permit || 0,
      body_wash: data.body_wash || 0,
      legal_court: data.legal_court || 0,
      other: data.other || 0,
      notes: ""
    });

    toast({
      title: "Success",
      description: "Copied expenses from previous day"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBusId) {
      toast({
        title: "Error",
        description: "Please select a bus",
        variant: "destructive"
      });
      return;
    }

    const expenseData: DailyBusExpense = {
      expense_date: date.toISOString().split('T')[0],
      bus_id: selectedBusId,
      ...expenses
    };

    if (existingExpense?.id) {
      expenseData.id = existingExpense.id;
    }

    const success = await onSave(expenseData);
    if (success) {
      // Reset form if it was a new entry
      if (!existingExpense) {
        setSelectedBusId("");
        setExpenses({
          fuel_cost: 0,
          diesel_price_per_liter: 350,
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
          notes: ""
        });
      }
    }
  };

  const totalExpenses = Object.entries(expenses)
    .filter(([key]) => key !== 'notes' && key !== 'diesel_price_per_liter')
    .reduce((sum, [, value]) => sum + (Number(value) || 0), 0);

  const fuelLiters = expenses.diesel_price_per_liter > 0 
    ? expenses.fuel_cost / expenses.diesel_price_per_liter 
    : 0;

  return (
    <Card className="p-6">
      {readOnly && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Auto-filled by OCR (View Only)</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Bus Number</Label>
            <Select value={selectedBusId} onValueChange={setSelectedBusId} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select bus" />
              </SelectTrigger>
              <SelectContent>
                {buses.map((bus) => (
                  <SelectItem key={bus.id} value={bus.id}>
                    {bus.bus_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedBusId && (
            <div className="text-sm text-muted-foreground">
              Total Trips: <span className="font-semibold">{tripCount}</span>
            </div>
          )}
          {!readOnly && (
            <Button type="button" variant="outline" onClick={copyPreviousDayExpenses}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Previous Day
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">⛽ Fuel Expenses</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Fuel Cost (Rs.)</Label>
              <Input
                type="number"
                value={expenses.fuel_cost}
                onChange={(e) => setExpenses({ ...expenses, fuel_cost: parseFloat(e.target.value) || 0 })}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Diesel Price (Rs./L)</Label>
              <Input
                type="number"
                value={expenses.diesel_price_per_liter}
                onChange={(e) => setExpenses({ ...expenses, diesel_price_per_liter: parseFloat(e.target.value) || 0 })}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Fuel Liters</Label>
              <Input type="number" value={fuelLiters.toFixed(2)} disabled />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">💰 Common Expenses</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'police', label: 'Police' },
              { key: 'food', label: 'Food' },
              { key: 'parking', label: 'Parking' },
              { key: 'highway_charges', label: 'Highway' }
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label} (Rs.)</Label>
                <Input
                  type="number"
                  value={expenses[key as keyof typeof expenses] as number}
                  onChange={(e) => setExpenses({ ...expenses, [key]: parseFloat(e.target.value) || 0 })}
                  disabled={readOnly}
                />
              </div>
            ))}
          </div>
        </div>

        <Collapsible open={isOtherExpanded} onOpenChange={setIsOtherExpanded}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              <ChevronDown className="mr-2 h-4 w-4" />
              Other Expenses
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'repair', label: 'Repair' },
                { key: 'tyre_tube', label: 'Tyre/Tube' },
                { key: 'salary', label: 'Salary' },
                { key: 'emission_fitness', label: 'Emission/Fitness' },
                { key: 'permits_renewal', label: 'Permits' },
                { key: 'staff_accommodation', label: 'Accommodation' },
                { key: 'accident_compensation', label: 'Accident' },
                { key: 'log_sheet', label: 'Log Sheet' },
                { key: 'vehicle_hire', label: 'Vehicle Hire' },
                { key: 'ntc', label: 'NTC' },
                { key: 'runner', label: 'Runner' },
                { key: 'short_misc', label: 'Short/Misc' },
                { key: 'temporary_permit', label: 'Temp Permit' },
                { key: 'body_wash', label: 'Body Wash' },
                { key: 'legal_court', label: 'Legal/Court' },
                { key: 'other', label: 'Other' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label>{label} (Rs.)</Label>
                  <Input
                    type="number"
                    value={expenses[key as keyof typeof expenses] as number}
                    onChange={(e) => setExpenses({ ...expenses, [key]: parseFloat(e.target.value) || 0 })}
                    disabled={readOnly}
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={expenses.notes}
            onChange={(e) => setExpenses({ ...expenses, notes: e.target.value })}
            placeholder="Any additional notes..."
            disabled={readOnly}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-lg font-semibold">
            Total Daily Expenses: <span className="text-primary">Rs. {totalExpenses.toLocaleString()}</span>
          </div>
          {!readOnly && (
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Expenses
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
