import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

// Using the same interface definitions as in SpecialHireForm
interface AdditionalCharge {
  id: string;
  type: string;
  amount: number;
  distance?: number;
  reason?: string;
  applyPerBus: boolean;
  busesCount: number;
}

interface OtherExpense {
  id: string;
  label: string;
  amount: number;
}

const additionalChargeTypes = [
  { value: 'permits', label: 'Permits Cost' },
  { value: 'highway', label: 'Highway Charges' },
  { value: 'additional_fuel', label: 'Additional Fuel Costs' },
  { value: 'driver_charges', label: 'Driver Charges' },
  { value: 'additional_distance', label: 'Additional Distance/KM' },
  { value: 'pass_through', label: 'Pass-Through Charge (No Cost)' },
  { value: 'internal_cost', label: 'Internal Cost (Not Charged to Customer)' },
  { value: 'refund', label: 'Refund/Adjustment' },
  { value: 'other', label: 'Other' }
];

interface AdditionalChargesSectionProps {
  additionalCharges: AdditionalCharge[];
  addAdditionalCharge: () => void;
  removeAdditionalCharge: (id: string) => void;
  updateAdditionalCharge: (id: string, field: string, value: any) => void;
  watchedNumberOfBuses: number;
  otherExpenses: OtherExpense[];
  addOtherExpense: () => void;
  removeOtherExpense: (id: string) => void;
  updateOtherExpense: (id: string, field: keyof OtherExpense, value: any) => void;
}

export function AdditionalChargesSection({
  additionalCharges,
  addAdditionalCharge,
  removeAdditionalCharge,
  updateAdditionalCharge,
  watchedNumberOfBuses,
  otherExpenses,
  addOtherExpense,
  removeOtherExpense,
  updateOtherExpense
}: AdditionalChargesSectionProps) {
  return (
    <Card className="shadow-sm border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <CardContent className="p-4 sm:p-6 md:p-8 space-y-8">
        {/* Additional Charges */}
        <div className="space-y-8">
          <div className="flex items-center justify-between p-5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-xl font-bold text-foreground">
              Additional Charges
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={addAdditionalCharge}
              className="text-base font-medium px-6 py-3 h-12"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Charge
            </Button>
          </div>

          {additionalCharges.map((charge, index) => (
            <Card key={charge.id} className="p-8 border-2 border-muted bg-card shadow-lg">
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-2xl font-bold text-foreground">Additional Charge #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => removeAdditionalCharge(charge.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 px-6 py-3 h-12"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <Label className="text-lg font-bold text-foreground">
                      Charge Type *
                    </Label>
                    <Select
                      value={charge.type}
                      onValueChange={(value) => updateAdditionalCharge(charge.id, 'type', value)}
                    >
                      <SelectTrigger className="h-14 text-lg">
                        <SelectValue placeholder="Select charge type" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {additionalChargeTypes.map((type) => (
                          <SelectItem
                            key={type.value}
                            value={type.value}
                            className="cursor-pointer hover:bg-accent text-lg py-3"
                          >
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {charge.type === 'additional_distance' ? (
                    <div className="space-y-4">
                      <Label className="text-lg font-bold text-foreground">
                        Additional Distance (KM) *
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={charge.distance || ''}
                        onChange={(e) => updateAdditionalCharge(charge.id, 'distance', parseFloat(e.target.value) || 0)}
                        placeholder="Enter additional kilometers (e.g., 50)"
                        className="h-14 text-lg"
                      />
                      {charge.distance && charge.distance > 0 && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Auto-calculated charge: {charge.distance} KM × Exceeding Rate = LKR {(charge.amount || 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Label className="text-lg font-bold text-foreground">
                        Amount (LKR) *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={charge.amount}
                        onChange={(e) => updateAdditionalCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="Enter amount (negative for refunds)"
                        className="h-14 text-lg"
                      />
                      {charge.amount < 0 && (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                          💡 Negative amounts will reduce the total cost
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {charge.type === 'other' && (
                  <div className="space-y-4">
                    <Label className="text-lg font-bold text-foreground">
                      Reason / Description *
                    </Label>
                    <Input
                      value={charge.reason || ''}
                      onChange={(e) => updateAdditionalCharge(charge.id, 'reason', e.target.value)}
                      placeholder="Please specify the reason for this charge"
                      className="h-14 text-lg"
                    />
                  </div>
                )}

                {charge.type === 'internal_cost' && (
                  <div className="space-y-4">
                    <Label className="text-lg font-bold text-foreground">
                      Cost Description *
                    </Label>
                    <Input
                      value={charge.reason || ''}
                      onChange={(e) => updateAdditionalCharge(charge.id, 'reason', e.target.value)}
                      placeholder="e.g., wages, staff costs, operational expenses"
                      className="h-14 text-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      This cost will be deducted from profit but NOT charged to the customer
                    </p>
                  </div>
                )}

                {/* Per Bus Application Settings */}
                <div className="border-t pt-6 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-lg font-bold text-foreground">
                        Apply to Multiple Buses
                      </Label>
                      <p className="text-base text-muted-foreground">
                        Enable this if the charge should be applied per bus
                      </p>
                    </div>
                    <Switch
                      checked={charge.applyPerBus}
                      onCheckedChange={(checked) => updateAdditionalCharge(charge.id, 'applyPerBus', checked)}
                      className="scale-125"
                    />
                  </div>

                  {charge.applyPerBus && (
                    <div className="space-y-4">
                      <Label className="text-lg font-bold text-foreground">
                        Number of Buses *
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max={watchedNumberOfBuses}
                        value={charge.busesCount}
                        onChange={(e) => updateAdditionalCharge(charge.id, 'busesCount', e.target.value ? parseInt(e.target.value) : 1)}
                        placeholder="Enter number of buses"
                        className="h-14 text-lg w-40"
                      />
                      <p className="text-base text-muted-foreground">
                        Maximum: {watchedNumberOfBuses} buses (total buses for this trip)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Other Expenses (Internal Costs) */}
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div className="text-xl font-bold text-foreground">
                Other Expenses (Internal Costs)
              </div>
              <p className="text-base text-muted-foreground">
                Internal expenses that will be deducted from profit (not charged to customer)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOtherExpense}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Expense
            </Button>
          </div>

          {otherExpenses.map((expense, index) => (
            <Card key={expense.id} className="p-4 border border-muted bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-foreground">Expense Description</Label>
                  <Input
                    value={expense.label}
                    onChange={(e) => updateOtherExpense(expense.id, 'label', e.target.value)}
                    placeholder="e.g., Office Expenses, Staff Costs, etc."
                    className="mt-1"
                  />
                </div>
                <div className="w-32">
                  <Label className="text-sm font-medium text-foreground">Amount (LKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expense.amount}
                    onChange={(e) => updateOtherExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeOtherExpense(expense.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-6"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
