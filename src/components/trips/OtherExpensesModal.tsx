import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Trip {
  id: string;
  trip_no: string;
  fuel_cost: number;
  other_expenses: number;
  other_expenses_details?: any[];
}

interface OtherExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onUpdate: () => void;
}

interface ExpenseType {
  id: string;
  type_name: string;
}

interface ExpenseItem {
  id: string;
  type: string;
  description: string;
  amount: number;
}

export function OtherExpensesModal({ isOpen, onClose, trip, onUpdate }: OtherExpensesModalProps) {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [newExpense, setNewExpense] = useState({
    type: "",
    description: "",
    amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [customType, setCustomType] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchExpenseTypes();
      loadTripExpenses();
    }
  }, [isOpen, trip]);

  const fetchExpenseTypes = async () => {
    // Using static expense types for now since the table doesn't exist in types
    const staticTypes = [
      { id: '1', type_name: 'Food' },
      { id: '2', type_name: 'Police' },
      { id: '3', type_name: 'Phone' },
      { id: '4', type_name: 'Water' },
      { id: '5', type_name: 'Parking' },
      { id: '6', type_name: 'Toll' },
      { id: '7', type_name: 'Repair' },
      { id: '8', type_name: 'Other' },
    ];
    setExpenseTypes(staticTypes);
  };

  const loadTripExpenses = () => {
    if (trip?.other_expenses_details) {
      setExpenses(trip.other_expenses_details.map((expense, index) => ({
        id: `${index}`,
        ...expense
      })));
    } else {
      setExpenses([]);
    }
  };

  const addExpense = () => {
    if (!newExpense.type || !newExpense.description || !newExpense.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const expense: ExpenseItem = {
      id: Date.now().toString(),
      type: newExpense.type === "custom" ? customType : newExpense.type,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
    };

    setExpenses(prev => [...prev, expense]);
    setNewExpense({ type: "", description: "", amount: "" });
    setCustomType("");
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const handleSave = async () => {
    if (!trip) return;

    setLoading(true);
    try {
      const totalExpenses = getTotalExpenses();
      
      const { error } = await supabase
        .from('daily_trips')
        .update({
          other_expenses: totalExpenses,
          other_expenses_details: expenses.map(exp => ({
            type: exp.type,
            description: exp.description,
            amount: exp.amount
          })),
          total_expenses: (trip.fuel_cost || 0) + totalExpenses
        })
        .eq('id', trip.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expenses updated successfully",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating expenses:', error);
      toast({
        title: "Error",
        description: "Failed to update expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Other Expenses - {trip.trip_no}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Expense */}
          <div className="border rounded-lg p-4 bg-muted/10">
            <h3 className="font-medium mb-3">Add New Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Expense Type</Label>
                <Select 
                  value={newExpense.type} 
                  onValueChange={(value) => setNewExpense(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((type) => (
                      <SelectItem key={type.id} value={type.type_name}>
                        {type.type_name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom (specify below)</SelectItem>
                  </SelectContent>
                </Select>
                {newExpense.type === "custom" && (
                  <Input
                    placeholder="Enter custom type"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Expense description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Amount (₨)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  />
                  <Button onClick={addExpense} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div>
            <h3 className="font-medium mb-3">Expense Items</h3>
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expenses added yet
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{expense.type}</Badge>
                        <span className="font-medium">₨ {expense.amount.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{expense.description}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense(expense.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {expenses.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total Other Expenses:</span>
                <span>₨ {getTotalExpenses().toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Expenses"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}