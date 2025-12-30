import { Fuel, Utensils, Wrench, FileText, Car, AlertTriangle, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DailyExpenseData {
  fuel_cost?: number | null;
  fuel_liters?: number | null;
  salary?: number | null;
  food?: number | null;
  runner?: number | null;
  staff_accommodation?: number | null;
  repair?: number | null;
  tyre_tube?: number | null;
  body_wash?: number | null;
  parking?: number | null;
  highway_charges?: number | null;
  police?: number | null;
  emission_fitness?: number | null;
  permits_renewal?: number | null;
  log_sheet?: number | null;
  ntc?: number | null;
  legal_court?: number | null;
  temporary_permit?: number | null;
  accident_compensation?: number | null;
  vehicle_hire?: number | null;
  short_misc?: number | null;
  other?: number | null;
  total_daily_expenses?: number | null;
}

interface ExpenseBreakdownPreviewProps {
  expenses: DailyExpenseData | null;
  busId: string;
  busNo: string;
  date: string;
}

const expenseCategories = [
  { key: 'fuel_cost', label: 'Fuel', icon: Fuel, color: 'text-blue-600 dark:text-blue-400' },
  { key: 'salary', label: 'Salary', icon: null, color: 'text-green-600 dark:text-green-400' },
  { key: 'food', label: 'Food', icon: Utensils, color: 'text-green-600 dark:text-green-400' },
  { key: 'runner', label: 'Runner', icon: null, color: 'text-green-600 dark:text-green-400' },
  { key: 'staff_accommodation', label: 'Staff Accom.', icon: null, color: 'text-green-600 dark:text-green-400' },
  { key: 'repair', label: 'Repair', icon: Wrench, color: 'text-orange-600 dark:text-orange-400' },
  { key: 'tyre_tube', label: 'Tyre/Tube', icon: null, color: 'text-orange-600 dark:text-orange-400' },
  { key: 'body_wash', label: 'Body Wash', icon: null, color: 'text-orange-600 dark:text-orange-400' },
  { key: 'parking', label: 'Parking', icon: Car, color: 'text-purple-600 dark:text-purple-400' },
  { key: 'highway_charges', label: 'Highway', icon: null, color: 'text-purple-600 dark:text-purple-400' },
  { key: 'police', label: 'Police', icon: null, color: 'text-red-600 dark:text-red-400' },
  { key: 'emission_fitness', label: 'Emission', icon: null, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'permits_renewal', label: 'Permits', icon: FileText, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'log_sheet', label: 'Log Sheet', icon: null, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'ntc', label: 'NTC', icon: null, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'legal_court', label: 'Legal/Court', icon: null, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'temporary_permit', label: 'Temp Permit', icon: null, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'accident_compensation', label: 'Accident', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
  { key: 'vehicle_hire', label: 'Vehicle Hire', icon: null, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'short_misc', label: 'Short/Misc', icon: null, color: 'text-slate-600 dark:text-slate-400' },
  { key: 'other', label: 'Other', icon: null, color: 'text-slate-600 dark:text-slate-400' },
];

export function ExpenseBreakdownPreview({ expenses, busId, busNo, date }: ExpenseBreakdownPreviewProps) {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleNavigateToExpenses = () => {
    navigate(`/daily-bus-expenses?bus=${busId}&date=${date}`);
  };

  // No expenses entered
  if (!expenses) {
    return (
      <div className="mt-4 border-t pt-4">
        <h5 className="font-medium text-sm mb-3 text-muted-foreground">Daily Expense Breakdown</h5>
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">No expenses entered for {busNo}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Add daily expenses to calculate accurate profit margins
          </p>
          <Button onClick={handleNavigateToExpenses} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Expenses for {busNo}
          </Button>
        </div>
      </div>
    );
  }

  // Filter only non-zero expense categories
  const nonZeroExpenses = expenseCategories.filter(cat => {
    const value = expenses[cat.key as keyof DailyExpenseData];
    return typeof value === 'number' && value > 0;
  });

  const totalExpenses = expenses.total_daily_expenses || 0;

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-medium text-sm text-muted-foreground">Daily Expense Breakdown</h5>
        <Button variant="outline" size="sm" onClick={handleNavigateToExpenses}>
          <Edit className="mr-2 h-3 w-3" />
          Edit Expenses
        </Button>
      </div>

      {nonZeroExpenses.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No expense items recorded
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {nonZeroExpenses.map(cat => {
            const value = expenses[cat.key as keyof DailyExpenseData] as number;
            const Icon = cat.icon;
            return (
              <div
                key={cat.key}
                className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-1.5">
                  {Icon && <Icon className={`h-3.5 w-3.5 ${cat.color}`} />}
                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(value)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t bg-muted/30 rounded-md px-3 py-2">
        <span className="font-medium">Total Daily Expenses</span>
        <span className="font-semibold text-lg">{formatCurrency(totalExpenses)}</span>
      </div>
    </div>
  );
}
