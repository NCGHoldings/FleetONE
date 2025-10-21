import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { OtherIncomeModal } from "./OtherIncomeModal";
import { TyreSaleModal, type TyreEntry } from "./TyreSaleModal";
import type { NSPSalesData, OtherIncomeItem } from "@/pages/NSPDailySales";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DailySalesFormProps {
  onSave: (data: NSPSalesData) => void;
  isSaving: boolean;
}

export function DailySalesForm({ onSave, isSaving }: DailySalesFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [lssOutsideSale, setLssOutsideSale] = useState<number>(0);
  const [lssInsideSale, setLssInsideSale] = useState<number>(0);
  const [tyreEntries, setTyreEntries] = useState<TyreEntry[]>([]);
  const [pepiliyanaSale, setPepiliyanaSale] = useState<number>(0);
  const [otherIncome, setOtherIncome] = useState<OtherIncomeItem[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [showOtherIncomeModal, setShowOtherIncomeModal] = useState(false);
  const [showTyreSaleModal, setShowTyreSaleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing data when date changes
  useEffect(() => {
    loadExistingData(selectedDate);
  }, [selectedDate]);

  const loadExistingData = async (date: Date) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('nsp_daily_sales')
        .select('*')
        .eq('sale_date', format(date, 'yyyy-MM-dd'))
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLssOutsideSale(data.lss_outside_sale || 0);
        setLssInsideSale(data.lss_inside_sale || 0);
        // Handle tyre_entries - it may not exist in older records
        const tyreEntriesData = (data as any).tyre_entries;
        setTyreEntries(Array.isArray(tyreEntriesData) ? tyreEntriesData : []);
        setPepiliyanaSale(data.pepiliyana_sale || 0);
        setOtherIncome(Array.isArray(data.other_income) ? data.other_income as unknown as OtherIncomeItem[] : []);
        setNotes(data.notes || "");
      } else {
        // Reset form for new entry
        setLssOutsideSale(0);
        setLssInsideSale(0);
        setTyreEntries([]);
        setPepiliyanaSale(0);
        setOtherIncome([]);
        setNotes("");
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load existing data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTyreSaleTotal = () => {
    return tyreEntries.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotal = () => {
    const tyreSaleTotal = calculateTyreSaleTotal();
    const otherTotal = otherIncome.reduce((sum, item) => sum + item.amount, 0);
    return lssOutsideSale + lssInsideSale + tyreSaleTotal + pepiliyanaSale + otherTotal;
  };

  const handleAddTyre = (item: TyreEntry) => {
    setTyreEntries([...tyreEntries, item]);
    setShowTyreSaleModal(false);
  };

  const handleRemoveTyre = (index: number) => {
    setTyreEntries(tyreEntries.filter((_, i) => i !== index));
  };

  const handleAddOtherIncome = (item: OtherIncomeItem) => {
    setOtherIncome([...otherIncome, item]);
    setShowOtherIncomeModal(false);
  };

  const handleRemoveOtherIncome = (index: number) => {
    setOtherIncome(otherIncome.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Validate date is not in future
    if (selectedDate > new Date()) {
      toast({
        title: "Invalid Date",
        description: "Cannot save sales for future dates",
        variant: "destructive",
      });
      return;
    }

    const data: NSPSalesData = {
      sale_date: selectedDate,
      lss_outside_sale: lssOutsideSale,
      lss_inside_sale: lssInsideSale,
      tyre_entries: tyreEntries,
      pepiliyana_sale: pepiliyanaSale,
      other_income: otherIncome,
      notes: notes,
    };

    onSave(data);
  };

  const formatCurrency = (value: number) => {
    return `Rs. ${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Date Selector */}
      <div className="space-y-2">
        <Label htmlFor="date">Sale Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-12",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading existing data...</div>
      ) : (
        <>
          {/* LSS Sales */}
          <div className="space-y-4 p-6 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 rounded-lg">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              LSS Sales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lss-outside">Outside Sale</Label>
                <Input
                  id="lss-outside"
                  type="number"
                  value={lssOutsideSale}
                  onChange={(e) => setLssOutsideSale(Number(e.target.value))}
                  placeholder="0"
                  className="h-12 text-lg"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lss-inside">Inside Sale</Label>
                <Input
                  id="lss-inside"
                  type="number"
                  value={lssInsideSale}
                  onChange={(e) => setLssInsideSale(Number(e.target.value))}
                  placeholder="0"
                  className="h-12 text-lg"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Tyre Sales */}
          <div className="space-y-4 p-6 bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Tyre Sales
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTyreSaleModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tyre
              </Button>
            </div>

            {tyreEntries.length > 0 ? (
              <div className="space-y-2">
                {tyreEntries.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.type}</p>
                      {item.quantity && (
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      )}
                      <p className="text-sm text-green-600 font-semibold">
                        Rs. {item.amount.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTyre(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border-2 border-green-500/50 mt-3">
                  <span className="font-semibold">Total Tyre Sale:</span>
                  <span className="text-lg font-bold text-green-600">
                    Rs. {calculateTyreSaleTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tyre sales added yet
              </p>
            )}
          </div>

          {/* Pepiliyana Sales */}
          <div className="space-y-4 p-6 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 rounded-lg">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Pepiliyana Sales
            </h3>
            <div className="space-y-2">
              <Label htmlFor="pepiliyana-sale">Pepiliyana Sale</Label>
              <Input
                id="pepiliyana-sale"
                type="number"
                value={pepiliyanaSale}
                onChange={(e) => setPepiliyanaSale(Number(e.target.value))}
                placeholder="0"
                className="h-12 text-lg"
                min="0"
              />
            </div>
          </div>

          {/* Other Income */}
          <div className="space-y-4 p-6 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                Other Income
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOtherIncomeModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Other Income
              </Button>
            </div>

            {otherIncome.length > 0 ? (
              <div className="space-y-2">
                {otherIncome.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-green-600 font-semibold">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOtherIncome(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other income added yet
              </p>
            )}
          </div>

          {/* Total Sale */}
          <div className="p-8 bg-gradient-to-r from-emerald-500/10 to-green-500/10 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-500/50 rounded-lg">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                NSP Total Sale
              </p>
              <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(calculateTotal())}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about today's sales..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              size="lg"
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Daily Sales"}
            </Button>
          </div>
        </>
      )}

      <TyreSaleModal
        open={showTyreSaleModal}
        onClose={() => setShowTyreSaleModal(false)}
        onAdd={handleAddTyre}
      />

      <OtherIncomeModal
        open={showOtherIncomeModal}
        onClose={() => setShowOtherIncomeModal(false)}
        onAdd={handleAddOtherIncome}
      />
    </div>
  );
}
