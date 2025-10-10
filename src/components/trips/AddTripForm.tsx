import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Calculator } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface AddTripFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  dieselPrice: number;
}

interface Bus {
  id: string;
  bus_no: string;
  model: string;
  capacity: number;
  expected_km_per_liter: number;
}

interface Route {
  id: string;
  route_no: string;
  route_name: string;
  distance_km: number;
}

interface StaffMember {
  name: string;
}

export function AddTripForm({ onSuccess, onCancel, dieselPrice }: AddTripFormProps) {
  const [formData, setFormData] = useState({
    trip_date: new Date(),
    bus_id: "",
    route_id: "",
    driver_name: "",
    conductor_name: "",
    start_time: "",
    end_time: "",
    odometer_start: "",
    odometer_end: "",
    income: "",
    fuel_cost: "",
    notes: "",
  });

  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<StaffMember[]>([]);
  const [conductors, setConductors] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState({
    distance_km: 0,
    fuel_liters: 0,
    km_per_liter: 0,
    performance_score: 0,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateValues();
  }, [formData.odometer_start, formData.odometer_end, formData.fuel_cost, dieselPrice]);

  const fetchData = async () => {
    try {
      const [busesRes, routesRes, allocationsRes] = await Promise.all([
        supabase.from('buses').select('id, bus_no, model, capacity, expected_km_per_liter').eq('status', 'active'),
        supabase.from('routes').select('id, route_no, route_name, distance_km').eq('is_active', true),
        supabase.from('driver_allocations').select('notes')
      ]);

      if (busesRes.data) setBuses(busesRes.data);
      if (routesRes.data) setRoutes(routesRes.data);
      
      // Extract unique driver and conductor names from driver_allocations notes
      if (allocationsRes.data) {
        const driverSet = new Set<string>();
        const conductorSet = new Set<string>();
        
        allocationsRes.data.forEach((allocation: any) => {
          try {
            const notes = typeof allocation.notes === 'string' 
              ? JSON.parse(allocation.notes) 
              : allocation.notes;
            
            if (notes?.driver) driverSet.add(notes.driver);
            if (notes?.conductor) conductorSet.add(notes.conductor);
          } catch (e) {
            // Skip invalid JSON
          }
        });
        
        setDrivers(Array.from(driverSet).sort().map(name => ({ name })));
        setConductors(Array.from(conductorSet).sort().map(name => ({ name })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
    }
  };

  const calculateValues = () => {
    const odometerStart = parseInt(formData.odometer_start) || 0;
    const odometerEnd = parseInt(formData.odometer_end) || 0;
    const fuelCost = parseFloat(formData.fuel_cost) || 0;

    const distance_km = odometerEnd > odometerStart ? odometerEnd - odometerStart : 0;
    const fuel_liters = fuelCost > 0 && dieselPrice > 0 ? fuelCost / dieselPrice : 0;
    const km_per_liter = fuel_liters > 0 && distance_km > 0 ? distance_km / fuel_liters : 0;
    
    // Calculate performance score based on expected km/L
    const selectedBus = buses.find(b => b.id === formData.bus_id);
    const expectedKmL = selectedBus?.expected_km_per_liter || 8;
    const performance_score = km_per_liter > 0 ? (km_per_liter / expectedKmL) * 100 : 0;

    setCalculations({
      distance_km: Math.round(distance_km * 100) / 100,
      fuel_liters: Math.round(fuel_liters * 100) / 100,
      km_per_liter: Math.round(km_per_liter * 100) / 100,
      performance_score: Math.round(performance_score * 100) / 100,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedRoute = routes.find(r => r.id === formData.route_id);
      const income = parseFloat(formData.income) || 0;
      const fuel_cost = parseFloat(formData.fuel_cost) || 0;
      const net_income = income - fuel_cost;

      // Create notes JSON with driver and conductor names
      const notesData = {
        driver: formData.driver_name || null,
        conductor: formData.conductor_name || null,
        notes: formData.notes || null
      };

      const tripData = {
        trip_no: `TRP-${format(formData.trip_date, 'yyyyMMdd')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
        trip_date: format(formData.trip_date, 'yyyy-MM-dd'),
        bus_id: formData.bus_id,
        route_id: formData.route_id,
        driver_id: null, // Store names in notes instead
        conductor_id: null, // Store names in notes instead
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        odometer_start: parseInt(formData.odometer_start) || null,
        odometer_end: parseInt(formData.odometer_end) || null,
        distance_km: calculations.distance_km,
        income: income,
        fuel_cost: fuel_cost,
        diesel_price_per_liter: dieselPrice,
        fuel_liters: calculations.fuel_liters,
        other_expenses: 0,
        total_expenses: fuel_cost,
        net_income: net_income,
        km_per_liter: calculations.km_per_liter,
        performance_score: calculations.performance_score,
        notes: JSON.stringify(notesData),
        status: 'scheduled' as const
      };

      const { error } = await supabase.from('daily_trips').insert([tripData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip added successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding trip:', error);
      toast({
        title: "Error",
        description: "Failed to add trip",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trip_date">Trip Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.trip_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.trip_date ? format(formData.trip_date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.trip_date}
                onSelect={(date) => date && setFormData(prev => ({ ...prev, trip_date: date }))}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bus_id">Bus</Label>
          <Select value={formData.bus_id} onValueChange={(value) => setFormData(prev => ({ ...prev, bus_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select bus" />
            </SelectTrigger>
            <SelectContent>
              {buses.map((bus) => (
                <SelectItem key={bus.id} value={bus.id}>
                  {bus.bus_no} - {bus.model} ({bus.capacity} seats)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="route_id">Route</Label>
          <Select value={formData.route_id} onValueChange={(value) => setFormData(prev => ({ ...prev, route_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select route" />
            </SelectTrigger>
            <SelectContent>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.route_no} - {route.route_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver_name">Driver</Label>
          <Select value={formData.driver_name} onValueChange={(value) => setFormData(prev => ({ ...prev, driver_name: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.name} value={driver.name}>
                  {driver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conductor_name">Conductor</Label>
          <Select value={formData.conductor_name} onValueChange={(value) => setFormData(prev => ({ ...prev, conductor_name: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select conductor" />
            </SelectTrigger>
            <SelectContent>
              {conductors.map((conductor) => (
                <SelectItem key={conductor.name} value={conductor.name}>
                  {conductor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
      </div>

      {/* Auto Calculations Display */}
      <div className="bg-muted/20 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Auto Calculations</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          placeholder="Additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Trip"}
        </Button>
      </div>
    </form>
  );
}