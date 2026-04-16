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
import { CalendarIcon, Bus, Link2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFleetBuses } from "@/hooks/useSchoolBusExpense";
import { findMatchingBus, getRouteBuses, normalizeBusNo } from "@/lib/bus-utils";

interface RouteExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  routeName: string;
  routeBusRegNos?: string[]; // Bus registration numbers from the route
  onAddExpense: (expense: {
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
  { value: "maintenance", label: "Maintenance" },
  { value: "fuel", label: "Fuel" },
  { value: "parking", label: "Parking" },
  { value: "other", label: "Other" }
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
  routeBusRegNos = [],
  onAddExpense 
}: RouteExpenseModalProps) {
  const { data: fleetBuses = [] } = useFleetBuses();
  
  const [formData, setFormData] = useState({
    expense_type: "",
    expense_category: "",
    description: "",
    amount: "",
    expense_date: new Date(),
    bus_id: "",
    bus_no: ""
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
    } else if (busId === "other") {
      // Allow manual entry - clear for now
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
    
    if (!formData.expense_type || !formData.description || !formData.amount) {
      return;
    }

    setLoading(true);
    
    try {
      await onAddExpense({
        expense_type: formData.expense_type,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date.toISOString().split('T')[0],
        expense_category: formData.expense_category || undefined,
        bus_id: formData.bus_id || undefined,
        bus_no: formData.bus_no || undefined
      });
      
      // Reset form
      setFormData({
        expense_type: "",
        expense_category: "",
        description: "",
        amount: "",
        expense_date: new Date(),
        bus_id: "",
        bus_no: ""
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Route Expense</DialogTitle>
          <DialogDescription>
            Add an expense for route: <strong>{routeName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bus Selection */}
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
                <SelectValue placeholder="Select bus (auto-suggested from route)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific bus</SelectItem>
                
                {/* Suggested buses from route */}
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
                
                {/* All other buses */}
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
            {formData.bus_no && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Linked to Fleet: {formData.bus_no}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense_type">Expense Type</Label>
            <Select 
              value={formData.expense_type} 
              onValueChange={(value) => setFormData({ 
                ...formData, 
                expense_type: value,
                expense_category: "" // Reset category when type changes
              })}
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

          {formData.expense_type && getCategoriesForType(formData.expense_type).length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="expense_category">Category (Optional)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter expense description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (LKR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Expense Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expense_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expense_date ? (
                    format(formData.expense_date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
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

          <div className="flex justify-end gap-2">
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
              disabled={loading || !formData.expense_type || !formData.description || !formData.amount}
            >
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
