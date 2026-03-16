import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Bus, Link2, Wallet, Building2, CreditCard, Banknote, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFleetBuses, useBranchPettyCashFunds, useCreateOperationsExpense } from "@/hooks/useSchoolBusExpense";
import { findMatchingBus, getRouteBuses, normalizeBusNo } from "@/lib/bus-utils";

interface RouteExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  routeName: string;
  branchId: string;
  routeBusRegNos?: string[];
  onAddExpense?: (expense: {
    expense_type: string;
    description: string;
    amount: number;
    expense_date?: string;
    expense_category?: string;
    bus_id?: string;
    bus_no?: string;
  }) => Promise<void>;
}

const EXPENSE_TYPES = [
  { value: "maintenance", label: "🔧 Maintenance" },
  { value: "fuel", label: "⛽ Fuel" },
  { value: "parking", label: "🅿️ Parking" },
  { value: "tolls", label: "🛣️ Tolls" },
  { value: "cleaning", label: "🧹 Cleaning" },
  { value: "other", label: "📋 Other" }
];

const PAYMENT_METHODS = [
  { value: "petty_cash", label: "Petty Cash", icon: Wallet, color: "text-amber-600", desc: "Deduct from branch petty cash fund" },
  { value: "cash", label: "Cash", icon: Banknote, color: "text-green-600", desc: "Direct cash payment" },
  { value: "bank", label: "Bank Transfer", icon: Building2, color: "text-blue-600", desc: "Pay from bank account" },
  { value: "vendor_bill", label: "Vendor Bill", icon: CreditCard, color: "text-purple-600", desc: "Create AP Invoice for vendor" },
];

const MAINTENANCE_CATEGORIES = [
  "Engine Service", "Tire Replacement", "Oil Change", "Brake Service",
  "Battery Replacement", "AC Service", "Transmission Service", "General Repair"
];

const FUEL_CATEGORIES = [
  "Daily Fuel", "Weekly Fill", "Monthly Fuel", "Emergency Fuel"
];

const OTHER_CATEGORIES = [
  "Insurance", "License Renewal", "Cleaning", "Tolls", "Permits", "Emergency Repair"
];

export function RouteExpenseModal({
  open,
  onOpenChange,
  routeId,
  routeName,
  branchId,
  routeBusRegNos = [],
  onAddExpense
}: RouteExpenseModalProps) {
  const { data: fleetBuses = [] } = useFleetBuses();
  const { data: pettyCashFunds = [] } = useBranchPettyCashFunds(branchId);
  const createExpense = useCreateOperationsExpense();

  const [formData, setFormData] = useState({
    expense_type: "",
    expense_category: "",
    description: "",
    amount: "",
    expense_date: new Date(),
    bus_id: "",
    bus_no: "",
    payment_method: "cash" as "petty_cash" | "cash" | "bank" | "vendor_bill",
    petty_cash_fund_id: "",
    vendor_name: "",
    bill_number: "",
  });
  const [loading, setLoading] = useState(false);

  // Get buses that match this route
  const suggestedBuses = useMemo(() => {
    return getRouteBuses(routeBusRegNos, fleetBuses);
  }, [routeBusRegNos, fleetBuses]);

  // Auto-select first suggested bus when modal opens
  useEffect(() => {
    if (open && suggestedBuses.length > 0 && !formData.bus_id) {
      const firstBus = suggestedBuses[0];
      setFormData(prev => ({
        ...prev,
        bus_id: firstBus.id,
        bus_no: firstBus.bus_no
      }));
    }
  }, [open, suggestedBuses]);

  // Auto-select first petty cash fund if petty cash selected
  useEffect(() => {
    if (formData.payment_method === "petty_cash" && pettyCashFunds.length > 0 && !formData.petty_cash_fund_id) {
      setFormData(prev => ({ ...prev, petty_cash_fund_id: pettyCashFunds[0].id }));
    }
  }, [formData.payment_method, pettyCashFunds]);

  const selectedFund = pettyCashFunds.find(f => f.id === formData.petty_cash_fund_id);
  const expenseAmount = parseFloat(formData.amount) || 0;
  const insufficientFunds = formData.payment_method === "petty_cash" && selectedFund && expenseAmount > selectedFund.current_balance;

  const getCategoriesForType = (type: string) => {
    switch (type) {
      case "maintenance": return MAINTENANCE_CATEGORIES;
      case "fuel": return FUEL_CATEGORIES;
      case "other": return OTHER_CATEGORIES;
      default: return [];
    }
  };

  const handleBusChange = (busId: string) => {
    if (busId === "none") {
      setFormData({ ...formData, bus_id: "", bus_no: "" });
    } else {
      const bus = fleetBuses.find(b => b.id === busId);
      setFormData({
        ...formData,
        bus_id: busId,
        bus_no: bus?.bus_no || ""
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.expense_type || !formData.description || !formData.amount) return;
    if (insufficientFunds) return;

    setLoading(true);

    try {
      await createExpense.mutateAsync({
        routeId,
        branchId,
        expense: {
          expense_type: formData.expense_type,
          description: formData.description,
          amount: expenseAmount,
          expense_date: formData.expense_date.toISOString().split('T')[0],
          expense_category: formData.expense_category || undefined,
        },
        busId: formData.bus_id || undefined,
        busNo: formData.bus_no || undefined,
        paymentMethod: formData.payment_method,
        pettyCashFundId: formData.petty_cash_fund_id || undefined,
        vendorName: formData.vendor_name || undefined,
        billNumber: formData.bill_number || undefined,
      });

      // Reset form
      setFormData({
        expense_type: "",
        expense_category: "",
        description: "",
        amount: "",
        expense_date: new Date(),
        bus_id: "",
        bus_no: "",
        payment_method: "cash",
        petty_cash_fund_id: "",
        vendor_name: "",
        bill_number: "",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Add Route Expense
          </DialogTitle>
          <DialogDescription>
            Route: <strong>{routeName}</strong> — Expense will auto-post to GL
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ====== PAYMENT METHOD ====== */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon;
                const isSelected = formData.payment_method === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, payment_method: method.value as any, petty_cash_fund_id: "", vendor_name: "", bill_number: "" })}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all",
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isSelected ? "text-blue-600" : method.color)} />
                    <div>
                      <p className="text-sm font-medium">{method.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{method.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ====== PETTY CASH FUND SELECTOR ====== */}
          {formData.payment_method === "petty_cash" && (
            <div className="space-y-2">
              <Label>Petty Cash Fund</Label>
              {pettyCashFunds.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No petty cash funds found for this branch. Create one in Finance → Petty Cash first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Select
                    value={formData.petty_cash_fund_id}
                    onValueChange={(v) => setFormData({ ...formData, petty_cash_fund_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select petty cash fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {pettyCashFunds.map(fund => (
                        <SelectItem key={fund.id} value={fund.id}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span>{fund.fund_name}</span>
                            <Badge variant={fund.current_balance > 0 ? "secondary" : "destructive"} className="text-xs">
                              Rs {fund.current_balance?.toLocaleString()}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFund && (
                    <div className={cn(
                      "p-3 rounded-lg text-sm",
                      insufficientFunds
                        ? "bg-red-50 dark:bg-red-950 border border-red-200"
                        : "bg-green-50 dark:bg-green-950 border border-green-200"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{selectedFund.fund_name}</span>
                        <span className={cn("font-bold", insufficientFunds ? "text-red-600" : "text-green-600")}>
                          Rs {selectedFund.current_balance?.toLocaleString()}
                        </span>
                      </div>
                      {expenseAmount > 0 && (
                        <div className="mt-1 flex justify-between items-center text-xs">
                          <span>After deduction:</span>
                          <span className={cn("font-semibold", insufficientFunds ? "text-red-600" : "text-green-600")}>
                            {insufficientFunds
                              ? "⚠️ Insufficient Balance"
                              : `Rs ${(selectedFund.current_balance - expenseAmount).toLocaleString()}`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ====== VENDOR BILL FIELDS ====== */}
          {formData.payment_method === "vendor_bill" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vendor Name</Label>
                <Input
                  placeholder="e.g. Lanka IOC"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bill Number (Optional)</Label>
                <Input
                  placeholder="e.g. BILL-001"
                  value={formData.bill_number}
                  onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ====== BUS SELECTION ====== */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bus className="h-4 w-4" />
              Bus (Optional)
            </Label>
            <Select
              value={formData.bus_id || "none"}
              onValueChange={handleBusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific bus</SelectItem>
                {suggestedBuses.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      Suggested (from route)
                    </div>
                    {suggestedBuses.map(bus => (
                      <SelectItem key={bus.id} value={bus.id}>
                        <div className="flex items-center gap-2">
                          <span>{bus.bus_no}</span>
                          <Badge variant="secondary" className="text-xs">
                            <Link2 className="h-3 w-3 mr-1" />
                            Route
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {fleetBuses.filter(b => !suggestedBuses.find(s => s.id === b.id)).length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      All Buses
                    </div>
                    {fleetBuses
                      .filter(b => !suggestedBuses.find(s => s.id === b.id))
                      .map(bus => (
                        <SelectItem key={bus.id} value={bus.id}>
                          {bus.bus_no} {bus.model && `- ${bus.model}`}
                        </SelectItem>
                      ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* ====== EXPENSE TYPE ====== */}
          <div className="space-y-2">
            <Label>Expense Type</Label>
            <Select
              value={formData.expense_type}
              onValueChange={(value) => setFormData({ ...formData, expense_type: value, expense_category: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expense type" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ====== CATEGORY ====== */}
          {formData.expense_type && getCategoriesForType(formData.expense_type).length > 0 && (
            <div className="space-y-2">
              <Label>Category (Optional)</Label>
              <Select
                value={formData.expense_category}
                onValueChange={(value) => setFormData({ ...formData, expense_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {getCategoriesForType(formData.expense_type).map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ====== DESCRIPTION ====== */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Enter expense description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* ====== AMOUNT + DATE ====== */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (LKR)</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.expense_date, "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expense_date}
                    onSelect={(date) => date && setFormData({ ...formData, expense_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* ====== AUTOMATION PREVIEW ====== */}
          {expenseAmount > 0 && formData.expense_type && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Auto Actions
              </p>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 space-y-0.5">
                <p>✅ Record expense in route_expenses</p>
                {formData.payment_method === "petty_cash" && selectedFund && (
                  <>
                    <p>✅ Deduct Rs {expenseAmount.toLocaleString()} from {selectedFund.fund_name}</p>
                    <p>✅ GL: DR Expense, CR Petty Cash Fund</p>
                  </>
                )}
                {formData.payment_method === "vendor_bill" && (
                  <>
                    <p>✅ Create AP Invoice (Rs {expenseAmount.toLocaleString()}){formData.vendor_name ? ` for ${formData.vendor_name}` : ""}</p>
                    <p>✅ GL: DR Expense, CR Trade Payable</p>
                  </>
                )}
                {(formData.payment_method === "cash" || formData.payment_method === "bank") && (
                  <p>✅ GL: DR Expense, CR {formData.payment_method === "bank" ? "Bank" : "Cash"}</p>
                )}
              </div>
            </div>
          )}

          {/* ====== SUBMIT ====== */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.expense_type || !formData.description || !formData.amount || insufficientFunds || (formData.payment_method === "petty_cash" && !formData.petty_cash_fund_id)}
            >
              {loading ? "Processing..." : "Add Expense & Auto-Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
