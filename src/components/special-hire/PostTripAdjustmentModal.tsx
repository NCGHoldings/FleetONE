import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Calculator,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  Eye,
  GitBranch
} from "lucide-react";
import { toast } from "sonner";
import {
  usePostTripAdjustment,
  type AdditionalExpense,
  type TripAdjustment,
} from "@/hooks/usePostTripAdjustment";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PostTripAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  quotationNo: string;
  customerName: string;
  originalAmount: number;
  originalKm?: number;
  advancePaid: number;
  defaultKmRate?: number;
  onAdjustmentSaved?: () => void;
  onRequestInvoiceGeneration?: () => void;
}

export const PostTripAdjustmentModal = ({
  open,
  onOpenChange,
  quotationId,
  quotationNo,
  customerName,
  originalAmount,
  originalKm = 0,
  advancePaid,
  defaultKmRate = 300,
  onAdjustmentSaved,
  onRequestInvoiceGeneration,
}: PostTripAdjustmentModalProps) => {
  const {
    loading,
    calculateTotals,
    saveAdjustmentDraft,
    finalizeAdjustment,
    getAdjustment,
  } = usePostTripAdjustment();

  // Form state
  const [actualKm, setActualKm] = useState<number>(originalKm);
  const [kmRate, setKmRate] = useState<number>(defaultKmRate);
  const [notes, setNotes] = useState("");
  const [additionalExpenses, setAdditionalExpenses] = useState<
    AdditionalExpense[]
  >([]);

  // Calculated values
  const [extraKm, setExtraKm] = useState(0);
  const [totals, setTotals] = useState({
    extra_km_total_charge: 0,
    total_additional_expenses: 0,
    adjustment_amount: 0,
    final_trip_amount: originalAmount,
    balance_due: originalAmount - advancePaid,
  });
  const [adjustmentFinalized, setAdjustmentFinalized] = useState(false);

  // Load existing adjustment
  useEffect(() => {
    if (open && quotationId) {
      loadExistingAdjustment();
    }
  }, [open, quotationId]);

  const loadExistingAdjustment = async () => {
    const { data } = await getAdjustment(quotationId);
    if (data) {
      setActualKm(data.actual_km_traveled || originalKm);
      setKmRate(data.extra_km_charge_per_km || defaultKmRate);
      setNotes(data.notes || "");
      setAdditionalExpenses(
        (data.additional_expenses as AdditionalExpense[]) || []
      );
    }
  };

  // Recalculate whenever inputs change
  useEffect(() => {
    const calculated = calculateTotals(
      originalAmount,
      extraKm,
      kmRate,
      additionalExpenses,
      advancePaid
    );
    setTotals(calculated);
  }, [extraKm, kmRate, additionalExpenses, originalAmount, advancePaid]);

  // Calculate extra KM whenever actual KM changes
  useEffect(() => {
    setExtraKm(actualKm - originalKm);
  }, [actualKm, originalKm]);

  const addExpenseLine = () => {
    setAdditionalExpenses([
      ...additionalExpenses,
      {
        description: "",
        amount: 0,
        category: "other",
      },
    ]);
  };

  const removeExpenseLine = (index: number) => {
    setAdditionalExpenses(additionalExpenses.filter((_, i) => i !== index));
  };

  const updateExpenseLine = (
    index: number,
    field: keyof AdditionalExpense,
    value: any
  ) => {
    const updated = [...additionalExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalExpenses(updated);
  };

  const buildAdjustment = (status: "draft" | "finalized"): TripAdjustment => ({
    quotation_id: quotationId,
    actual_km_traveled: actualKm,
    original_quoted_km: originalKm,
    extra_km: extraKm,
    extra_km_charge_per_km: kmRate,
    extra_km_total_charge: totals.extra_km_total_charge,
    additional_expenses: additionalExpenses,
    total_additional_expenses: totals.total_additional_expenses,
    original_quotation_amount: originalAmount,
    adjustment_amount: totals.adjustment_amount,
    final_trip_amount: totals.final_trip_amount,
    advance_already_paid: advancePaid,
    balance_due: totals.balance_due,
    notes,
    adjustment_status: status,
  });

  const handleSaveDraft = async () => {
    const { data, error } = await saveAdjustmentDraft(buildAdjustment("draft"));
    if (!error) {
      onAdjustmentSaved?.();
    }
  };

  const handleFinalize = async () => {
    const adjustment = buildAdjustment("finalized");
    const { data, error } = await finalizeAdjustment(adjustment);
    if (!error) {
      setAdjustmentFinalized(true);
      onAdjustmentSaved?.();
      toast.success('Adjustment finalized successfully!');
    }
  };

  const handleProceedToInvoice = () => {
    onOpenChange(false);
    if (onRequestInvoiceGeneration) {
      onRequestInvoiceGeneration();
    }
  };

  const isExtraKmPositive = extraKm > 0;
  const hasAdjustments = extraKm !== 0 || additionalExpenses.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post-Trip Adjustments</DialogTitle>
          <DialogDescription>
            Add extra kilometers and additional expenses for this trip
          </DialogDescription>
        </DialogHeader>

        {/* Trip Info Header */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quotation No:</span>
                <p className="font-semibold">{quotationNo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-semibold">{customerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Original Amount:</span>
                <p className="font-semibold">
                  LKR {originalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KM Adjustment Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Kilometer Adjustment</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Original Quoted KM</Label>
              <Input
                type="number"
                value={originalKm}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Actual KM Traveled</Label>
              <Input
                type="number"
                value={actualKm}
                onChange={(e) => setActualKm(Number(e.target.value))}
                placeholder="Enter actual kilometers"
              />
            </div>

            <div className="space-y-2">
              <Label>Rate per Extra KM (LKR)</Label>
              <Input
                type="number"
                value={kmRate}
                onChange={(e) => setKmRate(Number(e.target.value))}
                placeholder="300"
              />
            </div>

            <div className="space-y-2">
              <Label>Extra/Less KM</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={extraKm}
                  disabled
                  className={`bg-muted font-semibold ${
                    isExtraKmPositive ? "text-destructive" : "text-green-600"
                  }`}
                />
                {isExtraKmPositive ? (
                  <ArrowUp className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                ) : extraKm < 0 ? (
                  <ArrowDown className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                ) : null}
              </div>
            </div>
          </div>

          {extraKm !== 0 && (
            <Alert
              variant={isExtraKmPositive ? "destructive" : "default"}
              className={!isExtraKmPositive ? "border-green-500" : ""}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isExtraKmPositive
                  ? `Customer traveled ${Math.abs(extraKm)} km MORE than quoted. Additional charge: LKR ${totals.extra_km_total_charge.toLocaleString()}`
                  : `Customer traveled ${Math.abs(extraKm)} km LESS than quoted. Credit: LKR ${Math.abs(totals.extra_km_total_charge).toLocaleString()}`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Additional Expenses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Additional Expenses</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={addExpenseLine}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>

          {additionalExpenses.length === 0 ? (
            <Alert>
              <AlertDescription>
                No additional expenses added. Click "Add Expense" to add
                parking, toll, or other charges.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {additionalExpenses.map((expense, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description (e.g., Parking fees)"
                          value={expense.description}
                          onChange={(e) =>
                            updateExpenseLine(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={expense.category}
                          onValueChange={(value) =>
                            updateExpenseLine(index, "category", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="toll">Toll</SelectItem>
                            <SelectItem value="parking">Parking</SelectItem>
                            <SelectItem value="waiting">Waiting Time</SelectItem>
                            <SelectItem value="driver_meals">
                              Driver Meals
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={expense.amount || ""}
                          onChange={(e) =>
                            updateExpenseLine(
                              index,
                              "amount",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="col-span-1 flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExpenseLine(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Notes Section */}
        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder="Add any notes or explanations for these adjustments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Separator />

        {/* Final Calculation Summary */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Final Calculation</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Original Quotation Amount:</span>
                <span className="font-semibold">
                  LKR {originalAmount.toLocaleString()}
                </span>
              </div>

              {extraKm !== 0 && (
                <div className="flex justify-between">
                  <span>
                    Extra KM Charge ({Math.abs(extraKm)} km @ LKR {kmRate}):
                  </span>
                  <span
                    className={`font-semibold ${
                      isExtraKmPositive ? "text-destructive" : "text-green-600"
                    }`}
                  >
                    {isExtraKmPositive ? "+" : ""}
                    LKR {totals.extra_km_total_charge.toLocaleString()}
                  </span>
                </div>
              )}

              {additionalExpenses.length > 0 && (
                <div className="flex justify-between">
                  <span>Additional Expenses:</span>
                  <span className="font-semibold text-destructive">
                    +LKR {totals.total_additional_expenses.toLocaleString()}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-base">
                <span className="font-semibold">Final Trip Amount:</span>
                <span className="font-bold text-lg">
                  LKR {totals.final_trip_amount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Less: Advance Already Paid:</span>
                <span className="font-semibold text-green-600">
                  -LKR {advancePaid.toLocaleString()}
                </span>
              </div>

              <Separator className="bg-primary/30" />

              <div className="flex justify-between text-lg pt-2">
                <span className="font-bold">Balance Due:</span>
                <span className="font-bold text-2xl text-primary">
                  LKR {totals.balance_due.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!adjustmentFinalized ? (
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={loading || !hasAdjustments}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={loading || !hasAdjustments}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Finalize Adjustment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                Adjustment finalized successfully! You can now generate and send the balance invoice to the customer.
              </AlertDescription>
            </Alert>
            
            {/* Document Flow Info */}
            <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800">
              <GitBranch className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800 dark:text-purple-300">
                <strong>Document Flow:</strong> This adjustment has been saved to the document flow. 
                You can view, edit, or regenerate the adjustment document from the Document Flow dashboard.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleProceedToInvoice} className="gap-2">
                <FileText className="h-4 w-4" />
                Next: Generate Invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
