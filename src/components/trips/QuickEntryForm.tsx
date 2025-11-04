import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";

interface QuickEntryFormProps {
  tripId: string;
  busNo: string;
  route?: string;
  onSuccess: () => void;
  onSaveAndNext: () => void;
}

interface IncomeDetails {
  [key: string]: number;
  bus_collection: number;
  call_booking: number;
  agent_booking: number;
  luggage_income: number;
  miscellaneous_income: number;
  others: number;
}

interface ExpenseDetails {
  [key: string]: number;
  repair: number;
  tyre_tube: number;
  salary: number;
  police: number;
  food: number;
  emission_fitness: number;
  permits_renewal: number;
  staff_accommodation: number;
  highway_charges: number;
  accident_compensation: number;
  parking: number;
  log_sheet: number;
  vehicle_hire: number;
  ntc: number;
  runner: number;
  short_misc: number;
  temporary_permit: number;
  body_wash: number;
  legal_court: number;
  other: number;
}

export function QuickEntryForm({
  tripId,
  busNo,
  route,
  onSuccess,
  onSaveAndNext,
}: QuickEntryFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [distance, setDistance] = useState(0);

  const [income, setIncome] = useState<IncomeDetails>({
    bus_collection: 0,
    call_booking: 0,
    agent_booking: 0,
    luggage_income: 0,
    miscellaneous_income: 0,
    others: 0,
  });

  useEffect(() => {
    loadTripData();
  }, [tripId]);

  // Helper function to safely parse numbers from database
  const safeParseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const loadTripData = async () => {
    setLoading(true);
    try {
      // Fetch trip data
      const { data, error } = await supabase
        .from('daily_trips')
        .select('income_details, distance_km')
        .eq('id', tripId)
        .single();

      if (error) throw error;

      // Load distance
      if (data?.distance_km) {
        setDistance(safeParseNumber(data.distance_km));
      }

      if (data?.income_details && typeof data.income_details === 'object' && !Array.isArray(data.income_details)) {
        const incomeData = data.income_details as any;
        const parsedIncome: IncomeDetails = {
          bus_collection: safeParseNumber(incomeData.bus_collection),
          call_booking: safeParseNumber(incomeData.call_booking),
          agent_booking: safeParseNumber(incomeData.agent_booking),
          luggage_income: safeParseNumber(incomeData.luggage_income),
          miscellaneous_income: safeParseNumber(incomeData.miscellaneous_income),
          others: safeParseNumber(incomeData.others),
        };
        setIncome(parsedIncome);
      }
    } catch (error) {
      console.error('Error loading trip data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (obj: Record<string, number>): number => {
    return Object.values(obj).reduce((sum, val) => sum + (Number(val) || 0), 0 as number);
  };

  const handleSave = async (andNext: boolean = false) => {
    setSaving(true);
    try {
      const totalIncome = calculateTotal(income);

      console.log('💾 Saving Quick Entry Data (Revenue Only):', {
        tripId,
        income_details: income,
        totalIncome
      });

      const { error } = await supabase
        .from('daily_trips')
        .update({
          income_details: income as any,
          income: totalIncome,
        })
        .eq('id', tripId);

      if (error) throw error;

      console.log('✅ Revenue data saved successfully');

      if (totalIncome === 0) {
        toast({
          title: "Warning",
          description: "Income is zero. Please verify your entries.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Revenue saved: Rs. ${totalIncome.toLocaleString()}. Remember to add daily expenses separately.`,
        });
      }

      onSuccess();
      if (andNext) {
        onSaveAndNext();
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      toast({
        title: "Error",
        description: "Failed to save trip data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalRevenue = calculateTotal(income);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-auto p-2 md:p-3 pb-24 md:pb-6">
        <div className="max-w-6xl mx-auto space-y-3 md:space-y-4">
          {/* Expenses Managed Separately Banner */}
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">💡 Expenses Managed Separately</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fuel and operating expenses are now tracked per bus per day for accurate profitability analysis
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/daily-bus-expenses'}
                >
                  Manage Expenses
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Revenue Section */}
          <Card>
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-sm md:text-base">Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bus_collection" className="text-xs">Bus Collection</Label>
                  <Input
                    id="bus_collection"
                    type="number"
                    value={income.bus_collection || ''}
                    onChange={(e) => setIncome({ ...income, bus_collection: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="call_booking" className="text-xs">Call Booking</Label>
                  <Input
                    id="call_booking"
                    type="number"
                    value={income.call_booking || ''}
                    onChange={(e) => setIncome({ ...income, call_booking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="agent_booking" className="text-xs">Agent Booking</Label>
                  <Input
                    id="agent_booking"
                    type="number"
                    value={income.agent_booking || ''}
                    onChange={(e) => setIncome({ ...income, agent_booking: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="luggage_income" className="text-xs">Luggage Income</Label>
                  <Input
                    id="luggage_income"
                    type="number"
                    value={income.luggage_income || ''}
                    onChange={(e) => setIncome({ ...income, luggage_income: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="miscellaneous_income" className="text-xs">Miscellaneous Income</Label>
                  <Input
                    id="miscellaneous_income"
                    type="number"
                    value={income.miscellaneous_income || ''}
                    onChange={(e) => setIncome({ ...income, miscellaneous_income: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="others" className="text-xs">Others</Label>
                  <Input
                    id="others"
                    type="number"
                    value={income.others || ''}
                    onChange={(e) => setIncome({ ...income, others: safeParseNumber(e.target.value) })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          </div>
        </div>
      </div>

      {/* Sticky Footer with Summary and Actions - Ultra Compact */}
      <div className="fixed md:static bottom-0 left-0 right-0 border-t bg-card p-1.5 md:p-2 shadow-lg md:shadow-none">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-1.5 md:mb-2">
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0">Total Revenue</p>
              <p className="text-sm md:text-lg font-bold text-green-600">
                Rs {totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0">Expenses tracked separately</p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[10px] md:text-xs"
                onClick={() => window.location.href = '/daily-bus-expenses'}
              >
                Manage Daily Expenses →
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-1.5 md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full md:w-auto h-8 text-xs"
            >
              {saving ? "Saving..." : "Save & Stay"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-full md:w-auto h-8 text-xs"
            >
              {saving ? "Saving..." : "Save & Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}