import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { Calendar, DollarSign, Fuel, Route, MoreHorizontal, Plus, Loader2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Trip {
  id: string;
  trip_no: string;
  bus_no: string;
  route_no: string;
  route: string;
  driver_name?: string;
  conductor_name?: string;
  trip_date: string;
  start_time?: string;
  end_time?: string;
  distance_km: number;
  income: number;
  fuel_cost: number;
  net_income: number;
  km_per_liter: number;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
}

const getStatusBadge = (status: Trip['status']) => {
  const variants = {
    scheduled: { variant: "secondary" as const, label: "Scheduled" },
    ongoing: { variant: "warning" as const, label: "Ongoing" },
    completed: { variant: "success" as const, label: "Completed" },
    cancelled: { variant: "destructive" as const, label: "Cancelled" }
  };
  
  const config = variants[status];
  return <Badge className={`status-${config.variant.replace('destructive', 'error')}`}>{config.label}</Badge>;
};

const columns: ColumnDef<Trip>[] = [
  {
    accessorKey: "bus_no",
    header: "Bus No.",
  },
  {
    accessorKey: "route_no",
    header: "Route No.",
  },
  {
    accessorKey: "route",
    header: "Route",
  },
  {
    accessorKey: "driver_name",
    header: "Driver",
    cell: ({ row }) => row.getValue("driver_name") || "-",
  },
  {
    accessorKey: "conductor_name",
    header: "Conductor",
    cell: ({ row }) => row.getValue("conductor_name") || "-",
  },
  {
    accessorKey: "distance_km",
    header: "Distance (km)",
    cell: ({ row }) => {
      const distance = row.getValue("distance_km") as number;
      return distance > 0 ? distance.toFixed(1) : "-";
    },
  },
  {
    accessorKey: "income",
    header: "Income (₨)",
    cell: ({ row }) => {
      const income = row.getValue("income") as number;
      return income > 0 ? `₨ ${income.toLocaleString()}` : "-";
    },
  },
  {
    accessorKey: "fuel_cost",
    header: "Fuel Cost (₨)",
    cell: ({ row }) => {
      const fuelCost = row.getValue("fuel_cost") as number;
      return fuelCost > 0 ? `₨ ${fuelCost.toLocaleString()}` : "-";
    },
  },
  {
    accessorKey: "net_income",
    header: "Net Income (₨)",
    cell: ({ row }) => {
      const netIncome = row.getValue("net_income") as number;
      return netIncome > 0 ? `₨ ${netIncome.toLocaleString()}` : "-";
    },
  },
  {
    accessorKey: "km_per_liter",
    header: "km/L",
    cell: ({ row }) => {
      const kmPerLiter = row.getValue("km_per_liter") as number;
      return kmPerLiter > 0 ? kmPerLiter.toFixed(1) : "-";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getStatusBadge(row.getValue("status")),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Trip</DropdownMenuItem>
            <DropdownMenuItem>Print Receipt</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Cancel Trip
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function DailyTrips() {
  const [data, setData] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data: trips, error } = await supabase
        .from('daily_trips')
        .select(`
          *,
          buses!inner(bus_no),
          routes!inner(route_no, route_name),
          driver:profiles!daily_trips_driver_id_fkey(first_name, last_name),
          conductor:profiles!daily_trips_conductor_id_fkey(first_name, last_name)
        `)
        .order('trip_date', { ascending: false });

      if (error) {
        console.error('Error fetching trips:', error);
        toast({
          title: "Error",
          description: "Failed to load trips data.",
          variant: "destructive",
        });
        return;
      }

      // Transform the data to match our interface
      const transformedTrips: Trip[] = trips?.map(trip => ({
        id: trip.id,
        trip_no: trip.trip_no || `T-${trip.id.slice(0, 8)}`,
        bus_no: trip.buses?.bus_no || 'Unknown',
        route_no: trip.routes?.route_no || 'Unknown',
        route: trip.routes?.route_name || 'Unknown Route',
        driver_name: trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : undefined,
        conductor_name: trip.conductor ? `${trip.conductor.first_name} ${trip.conductor.last_name}` : undefined,
        trip_date: trip.trip_date,
        start_time: trip.start_time,
        end_time: trip.end_time,
        distance_km: trip.distance_km || 0,
        income: trip.income || 0,
        fuel_cost: trip.fuel_cost || 0,
        net_income: trip.net_income || 0,
        km_per_liter: trip.km_per_liter || 0,
        status: trip.status as Trip['status'],
      })) || [];

      setData(transformedTrips);
    } catch (error) {
      console.error('Error in fetchTrips:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading trips.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    console.log("Exporting trips data...");
    // Export logic will be implemented here
  };

  const handleAddTrip = () => {
    console.log("Adding new trip...");
    // Add trip logic will be implemented here
  };

  // Calculate KPIs
  const totalTrips = data.length;
  const completedTrips = data.filter(trip => trip.status === 'completed').length;
  const totalIncome = data.reduce((sum, trip) => sum + trip.income, 0);
  const totalDistance = data.reduce((sum, trip) => sum + trip.distance_km, 0);
  const avgKmPerLiter = data.filter(trip => trip.km_per_liter > 0)
    .reduce((sum, trip, _, arr) => sum + trip.km_per_liter / arr.length, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Daily Trips</h1>
            <p className="text-muted-foreground">Monitor and manage daily bus operations</p>
          </div>
          <Button disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-muted/20 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Trips</h1>
          <p className="text-muted-foreground">Monitor and manage daily bus operations</p>
        </div>
        <Button onClick={handleAddTrip} className="gap-2">
          <Plus className="w-4 h-4" />
          Add New Trip
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Trips"
          value={totalTrips.toString()}
          icon={<Calendar className="w-5 h-5" />}
          description="Today"
        />
        <KPICard
          title="Total Income"
          value={`₨ ${totalIncome.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          description="Today's earnings"
        />
        <KPICard
          title="Total Distance"
          value={`${totalDistance.toFixed(0)} km`}
          icon={<Route className="w-5 h-5" />}
          description="Covered today"
        />
        <KPICard
          title="Avg Efficiency"
          value={`${avgKmPerLiter.toFixed(1)} km/L`}
          icon={<Fuel className="w-5 h-5" />}
          description="Fleet average"
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="bus_no"
        title="Today's Trips"
        onExport={handleExport}
      />
    </div>
  );
}