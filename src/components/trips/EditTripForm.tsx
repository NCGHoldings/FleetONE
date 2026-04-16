import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Trip {
  id: string;
  trip_no: string;
  bus_id: string;
  route_id: string;
  driver_id?: string;
  conductor_id?: string;
  bus_no: string;
  route_no: string;
  route: string;
  driver_name?: string;
  conductor_name?: string;
  whatsapp?: string;
  trip_date: string;
  start_time?: string;
  end_time?: string;
  odometer_start?: number;
  odometer_end?: number;
  distance_km: number;
  income: number;
  fuel_cost: number;
  diesel_price_per_liter?: number;
  fuel_liters?: number;
  other_expenses: number;
  other_expenses_details?: any[];
  total_expenses: number;
  net_income: number;
  km_per_liter: number;
  performance_score?: number;
  audit_log?: any[];
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
}

interface EditTripFormProps {
  trip: Trip;
  onSuccess: () => void;
  onCancel: () => void;
  dieselPrice: number;
}

interface Bus {
  id: string;
  bus_no: string;
  model: string;
  expected_km_per_liter: number;
}

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
}

export function EditTripForm({ trip, onSuccess, onCancel, dieselPrice }: EditTripFormProps) {
  const [formData, setFormData] = useState({
    start_time: trip.start_time || "",
    end_time: trip.end_time || "",
    odometer_start: trip.odometer_start?.toString() || "",
    odometer_end: trip.odometer_end?.toString() || "",
    income: trip.income.toString(),
    fuel_cost: trip.fuel_cost.toString(),
    status: trip.status,
    notes: "",
  });

  const [buses, setBuses] = useState<Bus[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState({
    distance_km: 0,
    fuel_liters: 0,
    km_per_liter: 0,
    performance_score: 0,
    net_income: 0,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateValues();
  }, [formData.odometer_start, formData.odometer_end, formData.fuel_cost, formData.income, dieselPrice]);

  const fetchData = async () => {
    try {
      const [busesRes, profilesRes] = await Promise.all([
        supabase.from('buses').select('id, bus_no, model, expected_km_per_liter').eq('status', 'active'),
        supabase.from('profiles').select('user_id, first_name, last_name, employee_id').eq('status', 'active')
      ]);

      if (busesRes.data) setBuses(busesRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateValues = () => {
    const odometerStart = parseInt(formData.odometer_start) || 0;
    const odometerEnd = parseInt(formData.odometer_end) || 0;
    const fuelCost = parseFloat(formData.fuel_cost) || 0;
    const income = parseFloat(formData.income) || 0;

    const distance_km = odometerEnd > odometerStart ? odometerEnd - odometerStart : 0;
    const fuel_liters = fuelCost > 0 && dieselPrice > 0 ? fuelCost / dieselPrice : 0;
    const km_per_liter = fuel_liters > 0 && distance_km > 0 ? distance_km / fuel_liters : 0;
    
    // Calculate performance score based on expected km/L
    const selectedBus = buses.find(b => b.id === trip.bus_id);
    const expectedKmL = selectedBus?.expected_km_per_liter || 8;
    const performance_score = km_per_liter > 0 ? (km_per_liter / expectedKmL) * 100 : 0;
    const net_income = income - fuelCost - trip.other_expenses;

    setCalculations({
      distance_km: Math.round(distance_km * 100) / 100,
      fuel_liters: Math.round(fuel_liters * 100) / 100,
      km_per_liter: Math.round(km_per_liter * 100) / 100,
      performance_score: Math.round(performance_score * 100) / 100,
      net_income: Math.round(net_income * 100) / 100,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        odometer_start: parseInt(formData.odometer_start) || null,
        odometer_end: parseInt(formData.odometer_end) || null,
        distance_km: calculations.distance_km,
        income: parseFloat(formData.income) || 0,
        fuel_cost: parseFloat(formData.fuel_cost) || 0,
        diesel_price_per_liter: dieselPrice,
        fuel_liters: calculations.fuel_liters,
        total_expenses: parseFloat(formData.fuel_cost) + trip.other_expenses,
        net_income: calculations.net_income,
        km_per_liter: calculations.km_per_liter,
        performance_score: calculations.performance_score,
        status: formData.status,
        audit_log: [
          ...(trip.audit_log || []),
          {
            timestamp: new Date().toISOString(),
            action: 'updated',
            changes: {
              income: { from: trip.income, to: parseFloat(formData.income) },
              fuel_cost: { from: trip.fuel_cost, to: parseFloat(formData.fuel_cost) },
              distance_km: { from: trip.distance_km, to: calculations.distance_km },
              status: { from: trip.status, to: formData.status }
            },
            notes: formData.notes
          }
        ]
      };

      const { error } = await supabase
        .from('daily_trips')
        .update(updateData)
        .eq('id', trip.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip updated successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: "Error",
        description: "Failed to update trip",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Trip Info Header */}
      <div className="bg-muted/20 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Trip ID:</span>
            <div className="font-mono font-medium">{trip.trip_no}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Bus:</span>
            <div className="font-medium">{trip.bus_no}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Route:</span>
            <div className="font-medium">{trip.route_no}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <div className="font-medium">{new Date(trip.trip_date).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="odometer_start">Odometer Start</Label>
          <Input
            type="number"
            placeholder="Starting odometer reading"
            value={formData.odometer_start}
            onChange={(e) => setFormData(prev => ({ ...prev, odometer_start: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="odometer_end">Odometer End</Label>
          <Input
            type="number"
            placeholder="Ending odometer reading"
            value={formData.odometer_end}
            onChange={(e) => setFormData(prev => ({ ...prev, odometer_end: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="income">Income (₨)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Total income"
            value={formData.income}
            onChange={(e) => setFormData(prev => ({ ...prev, income: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuel_cost">Fuel Cost (₨)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Total fuel cost"
            value={formData.fuel_cost}
            onChange={(e) => setFormData(prev => ({ ...prev, fuel_cost: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Diesel price: ₨{dieselPrice}/L
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Other Expenses</Label>
          <div className="p-2 border rounded bg-muted/10">
            <span className="font-medium">₨ {trip.other_expenses.toLocaleString()}</span>
            {trip.other_expenses_details && trip.other_expenses_details.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {trip.other_expenses_details.length} expense item{trip.other_expenses_details.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Updated Calculations Display */}
      <div className="bg-muted/20 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Updated Calculations</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Distance:</span>
            <div className="font-medium">{calculations.distance_km} km</div>
          </div>
          <div>
            <span className="text-muted-foreground">Fuel Liters:</span>
            <div className="font-medium">{calculations.fuel_liters} L</div>
          </div>
          <div>
            <span className="text-muted-foreground">Efficiency:</span>
            <div className="font-medium">{calculations.km_per_liter} km/L</div>
          </div>
          <div>
            <span className="text-muted-foreground">Performance:</span>
            <div className={`font-medium ${calculations.performance_score >= 100 ? 'text-green-600' : calculations.performance_score >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {calculations.performance_score}%
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Net Income:</span>
            <div className={`font-medium ${calculations.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₨ {calculations.net_income.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      {trip.audit_log && trip.audit_log.length > 0 && (
        <div className="bg-muted/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4" />
            <span className="font-medium">Edit History</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {trip.audit_log.map((log: any, index: number) => (
              <div key={index} className="text-xs p-2 bg-background rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {log.action}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.notes && (
                  <div className="text-muted-foreground">{log.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Update Notes</Label>
        <Textarea
          placeholder="Reason for changes..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Trip"}
        </Button>
      </div>
    </form>
  );
}