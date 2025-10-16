import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

interface QuickEntryPanelProps {
  tripId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface IncomeDetails {
  daily_collection: number;
  call_collection: number;
  agent_collection: number;
  luggage_collection: number;
  missional: number;
  others: number;
  others_description: string;
}

interface ExpenseDetails {
  fuel: number;
  food: number;
  salary: number;
  runner: number;
  police: number;
  phone: number;
  water: number;
  parking: number;
  toll: number;
  repair: number;
  other: number;
  other_description: string;
}

export function QuickEntryPanel({ tripId, onSuccess, onCancel }: QuickEntryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tripInfo, setTripInfo] = useState<any>(null);

  const [income, setIncome] = useState<IncomeDetails>({
    daily_collection: 0,
    call_collection: 0,
    agent_collection: 0,
    luggage_collection: 0,
    missional: 0,
    others: 0,
    others_description: '',
  });

  const [expenses, setExpenses] = useState<ExpenseDetails>({
    fuel: 0,
    food: 0,
    salary: 0,
    runner: 0,
    police: 0,
    phone: 0,
    water: 0,
    parking: 0,
    toll: 0,
    repair: 0,
    other: 0,
    other_description: '',
  });

  useEffect(() => {
    loadTripData();
  }, [tripId]);

  const loadTripData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_trips')
        .select('*, buses(bus_no)')
        .eq('id', tripId)
        .single();

      if (error) throw error;

      setTripInfo(data);

      // Load existing income details
      if (data.income_details && typeof data.income_details === 'object') {
        const incomeData = data.income_details as any;
        setIncome({
          daily_collection: Number(incomeData.daily_collection) || 0,
          call_collection: Number(incomeData.call_collection) || 0,
          agent_collection: Number(incomeData.agent_collection) || 0,
          luggage_collection: Number(incomeData.luggage_collection) || 0,
          missional: Number(incomeData.missional) || 0,
          others: Number(incomeData.others) || 0,
          others_description: String(incomeData.others_description || ''),
        });
      }

      // Load existing expense details
      if (data.other_expenses_details && typeof data.other_expenses_details === 'object') {
        const expenseData = data.other_expenses_details as any;
        setExpenses({
          fuel: Number(expenseData.fuel || data.fuel_cost || 0),
          food: Number(expenseData.food) || 0,
          salary: Number(expenseData.salary) || 0,
          runner: Number(expenseData.runner) || 0,
          police: Number(expenseData.police) || 0,
          phone: Number(expenseData.phone) || 0,
          water: Number(expenseData.water) || 0,
          parking: Number(expenseData.parking) || 0,
          toll: Number(expenseData.toll) || 0,
          repair: Number(expenseData.repair) || 0,
          other: Number(expenseData.other) || 0,
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
      income.daily_collection +
      income.call_collection +
      income.agent_collection +
      income.luggage_collection +
      income.missional +
      income.others
    );
  };

  const calculateTotalExpenses = () => {
    return (
      expenses.fuel +
      expenses.food +
      expenses.salary +
      expenses.runner +
      expenses.police +
      expenses.phone +
      expenses.water +
      expenses.parking +
      expenses.toll +
      expenses.repair +
      expenses.other
    );
  };

  const calculateNetProfit = () => {
    return calculateTotalRevenue() - calculateTotalExpenses();
  };

  const handleSave = async () => {
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
        .eq('id', tripId);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trip Info Header */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold">
          Trip: {tripInfo?.trip_no || 'N/A'} | Bus: {tripInfo?.buses?.bus_no || 'N/A'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Date: {new Date(tripInfo?.trip_date).toLocaleDateString()}
        </p>
      </div>

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
              <Label htmlFor="daily_collection">Daily Collection</Label>
              <Input
                id="daily_collection"
                type="number"
                value={income.daily_collection}
                onChange={(e) =>
                  setIncome({ ...income, daily_collection: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="call_collection">Call Collection</Label>
              <Input
                id="call_collection"
                type="number"
                value={income.call_collection}
                onChange={(e) =>
                  setIncome({ ...income, call_collection: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="agent_collection">Agent Collection</Label>
              <Input
                id="agent_collection"
                type="number"
                value={income.agent_collection}
                onChange={(e) =>
                  setIncome({ ...income, agent_collection: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="luggage_collection">Luggage Collection</Label>
              <Input
                id="luggage_collection"
                type="number"
                value={income.luggage_collection}
                onChange={(e) =>
                  setIncome({ ...income, luggage_collection: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="missional">Missional</Label>
              <Input
                id="missional"
                type="number"
                value={income.missional}
                onChange={(e) =>
                  setIncome({ ...income, missional: parseFloat(e.target.value) || 0 })
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
              <Label htmlFor="fuel">Fuel</Label>
              <Input
                id="fuel"
                type="number"
                value={expenses.fuel}
                onChange={(e) => setExpenses({ ...expenses, fuel: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="food">Food</Label>
              <Input
                id="food"
                type="number"
                value={expenses.food}
                onChange={(e) => setExpenses({ ...expenses, food: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="salary">Salary</Label>
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
              <Label htmlFor="police">Police</Label>
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="number"
                value={expenses.phone}
                onChange={(e) => setExpenses({ ...expenses, phone: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="water">Water</Label>
              <Input
                id="water"
                type="number"
                value={expenses.water}
                onChange={(e) => setExpenses({ ...expenses, water: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="parking">Parking</Label>
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
              <Label htmlFor="toll">Toll</Label>
              <Input
                id="toll"
                type="number"
                value={expenses.toll}
                onChange={(e) => setExpenses({ ...expenses, toll: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="repair">Repair</Label>
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
    </div>
  );
}
