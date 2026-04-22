import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, X, Fuel, Utensils, Wrench, Car, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { autoPostExpenseIfEnabled } from "@/hooks/useNCGExpressFinance";

interface ExpenseData {
  fuel_cost: number;
  fuel_liters?: number;
  diesel_price_per_liter?: number;
  salary: number;
  food: number;
  runner: number;
  staff_accommodation: number;
  repair: number;
  tyre_tube: number;
  body_wash: number;
  parking: number;
  highway_charges: number;
  police: number;
  emission_fitness: number;
  permits_renewal: number;
  log_sheet: number;
  ntc: number;
  legal_court: number;
  temporary_permit: number;
  accident_compensation: number;
  vehicle_hire: number;
  short_misc: number;
  other: number;
  notes?: string;
}

interface InlineExpenseEditorProps {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
  busNo: string;
  date: string;
  existingExpenses: Partial<ExpenseData> | null;
  onSaved: () => void;
}

const expenseFields = [
  { key: 'fuel_cost', label: 'FUEL EXPENSES', icon: Fuel, category: 'Operational' },
  { key: 'parking', label: 'PARKING FEE', icon: Car, category: 'Operational' },
  { key: 'highway_charges', label: 'HIGHWAY CHARGES', icon: null, category: 'Operational' },
  { key: 'salary', label: 'WAGES - DRIVERS & ASSISTA', icon: null, category: 'Staff' },
  { key: 'food', label: 'STAFF MEALS & WELFARE', icon: Utensils, category: 'Staff' },
  { key: 'runner', label: 'RUNNER', icon: null, category: 'Staff' },
  { key: 'staff_accommodation', label: 'STAFF ACCOMMODATION', icon: null, category: 'Staff' },
  { key: 'repair', label: 'BUS MAINTENANCE & REPAIR', icon: Wrench, category: 'Maintenance' },
  { key: 'tyre_tube', label: 'TYRE & TUBE EXPENSES', icon: null, category: 'Maintenance' },
  { key: 'body_wash', label: 'BODY WASH AND SERVICE', icon: null, category: 'Maintenance' },
  { key: 'police', label: 'FINES AND PENALTIES', icon: null, category: 'Administrative' },
  { key: 'emission_fitness', label: 'EMISSION REPORTS/ FITNESS', icon: null, category: 'Administrative' },
  { key: 'permits_renewal', label: 'PERMITS RENEWAL CHARGES', icon: FileText, category: 'Administrative' },
  { key: 'log_sheet', label: 'LOG SHEET CHARGES', icon: null, category: 'Administrative' },
  { key: 'ntc', label: 'NTC', icon: null, category: 'Administrative' },
  { key: 'legal_court', label: 'LEGAL & COURT FEE', icon: null, category: 'Administrative' },
  { key: 'temporary_permit', label: 'TEMPORY PERMIT', icon: null, category: 'Administrative' },
  { key: 'accident_compensation', label: 'ACCIDENT COMPENSATION', icon: AlertTriangle, category: 'Other' },
  { key: 'vehicle_hire', label: 'VEHICLE HIRE CHARGES', icon: null, category: 'Other' },
  { key: 'short_misc', label: 'SHORT - MISCELLANIOUS', icon: null, category: 'Other' },
  { key: 'other', label: 'OTHER EXPENSES', icon: null, category: 'Other' },
];

const defaultExpenses: ExpenseData = {
  fuel_cost: 0,
  salary: 0,
  food: 0,
  runner: 0,
  staff_accommodation: 0,
  repair: 0,
  tyre_tube: 0,
  body_wash: 0,
  parking: 0,
  highway_charges: 0,
  police: 0,
  emission_fitness: 0,
  permits_renewal: 0,
  log_sheet: 0,
  ntc: 0,
  legal_court: 0,
  temporary_permit: 0,
  accident_compensation: 0,
  vehicle_hire: 0,
  short_misc: 0,
  other: 0,
  notes: '',
};

export function InlineExpenseEditor({
  isOpen,
  onClose,
  busId,
  busNo,
  date,
  existingExpenses,
  onSaved,
}: InlineExpenseEditorProps) {
  const [formData, setFormData] = useState<ExpenseData>(defaultExpenses);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...defaultExpenses,
        ...existingExpenses,
      });
    }
  }, [isOpen, existingExpenses]);

  const handleChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [key]: numValue }));
  };

  const calculateTotal = () => {
    return expenseFields.reduce((sum, field) => {
      return sum + (formData[field.key as keyof ExpenseData] as number || 0);
    }, 0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const expenseData = {
        bus_id: busId,
        expense_date: date,
        ...formData,
        total_daily_expenses: calculateTotal(),
        created_by: user.user?.id,
      };

      const { error } = await supabase
        .from("daily_bus_expenses")
        .upsert(expenseData, {
          onConflict: "bus_id,expense_date",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Expenses saved for ${busNo}`,
      });

      // Auto-post to GL if enabled in settings (non-blocking)
      autoPostExpenseIfEnabled(busId, date);

      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error saving expenses:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save expenses",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const groupedFields = expenseFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof expenseFields>);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit Expenses - {busNo}</SheetTitle>
          <SheetDescription>
            Update daily expenses for {date}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
          <div className="space-y-6">
            {Object.entries(groupedFields).map(([category, fields]) => (
              <div key={category}>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">{category}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map(field => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          {Icon && <Icon className="h-3 w-3" />}
                          {field.label}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData[field.key as keyof ExpenseData] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4 border-t pt-4">
          <div className="w-full space-y-3">
            <div className="flex justify-between items-center bg-muted/50 rounded-lg px-4 py-3">
              <span className="font-medium">Total Expenses</span>
              <span className="font-bold text-lg">{formatCurrency(calculateTotal())}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Expenses
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
