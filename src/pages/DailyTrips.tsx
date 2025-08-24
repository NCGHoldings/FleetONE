import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { Calendar, DollarSign, Fuel, Route, MoreHorizontal, Plus, Loader2, FileText, Edit, Calculator, Download, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddTripForm } from "@/components/trips/AddTripForm";
import { OtherExpensesModal } from "@/components/trips/OtherExpensesModal";
import { ExportModal } from "@/components/trips/ExportModal";
import { EditTripForm } from "@/components/trips/EditTripForm";

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
  time?: string;
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

const createColumns = (
  handleViewDetailsLocal: (tripId: string) => void,
  handleEditTripLocal: (trip: Trip) => void,
  handleViewExpensesLocal: (trip: Trip) => void,
  handleCancelTripLocal: (tripId: string) => void
): ColumnDef<Trip>[] => [
  {
    accessorKey: "trip_no",
    header: "Trip ID",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("trip_no")}</span>
    ),
  },
  {
    accessorKey: "trip_date",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("trip_date") as string;
      return new Date(date).toLocaleDateString();
    },
  },
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
    accessorKey: "whatsapp",
    header: "WhatsApp",
    cell: ({ row }) => {
      const whatsapp = row.getValue("whatsapp") as string;
      return whatsapp ? (
        <span className="text-green-600">✓ Sent</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => row.getValue("time") || "-",
  },
  {
    accessorKey: "start_time",
    header: "Start Time",
    cell: ({ row }) => row.getValue("start_time") || "-",
  },
  {
    accessorKey: "end_time",
    header: "End Time",
    cell: ({ row }) => row.getValue("end_time") || "-",
  },
  {
    accessorKey: "odometer_start",
    header: "Odo Start",
    cell: ({ row }) => {
      const value = row.getValue("odometer_start") as number;
      return value ? value.toLocaleString() : "-";
    },
  },
  {
    accessorKey: "odometer_end",
    header: "Odo End",
    cell: ({ row }) => {
      const value = row.getValue("odometer_end") as number;
      return value ? value.toLocaleString() : "-";
    },
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
    accessorKey: "other_expenses",
    header: "Other Expenses",
    cell: ({ row }) => {
      const expenses = row.getValue("other_expenses") as number;
      const details = row.original.other_expenses_details;
      return (
        <div className="text-center">
          <span>{expenses > 0 ? `₨ ${expenses.toLocaleString()}` : "-"}</span>
          {details && details.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {details.length} item{details.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "total_expenses",
    header: "Total Expenses",
    cell: ({ row }) => {
      const total = row.getValue("total_expenses") as number;
      return total > 0 ? `₨ ${total.toLocaleString()}` : "-";
    },
  },
  {
    accessorKey: "net_income",
    header: "Net Income (₨)",
    cell: ({ row }) => {
      const netIncome = row.getValue("net_income") as number;
      const className = netIncome >= 0 ? "text-green-600" : "text-red-600";
      return (
        <span className={className}>
          {netIncome !== 0 ? `₨ ${netIncome.toLocaleString()}` : "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "km_per_liter",
    header: "km/L",
    cell: ({ row }) => {
      const kmPerLiter = row.getValue("km_per_liter") as number;
      const performance = row.original.performance_score;
      return (
        <div className="text-center">
          <span>{kmPerLiter > 0 ? kmPerLiter.toFixed(1) : "-"}</span>
          {performance && (
            <div className={`text-xs mt-1 ${performance >= 100 ? 'text-green-600' : performance >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {performance.toFixed(0)}% eff.
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getStatusBadge(row.getValue("status")),
  },
  {
    id: "actions",
    header: "Actions",
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
            <DropdownMenuItem onClick={() => handleViewDetailsLocal(trip.id)}>
              <FileText className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditTripLocal(trip)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Trip
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewExpensesLocal(trip)}>
              <Calculator className="h-4 w-4 mr-2" />
              View Expenses
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => handleCancelTripLocal(trip.id)}>
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [dieselPrice, setDieselPrice] = useState<number>(150);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleViewDetailsLocal = (tripId: string) => {
    console.log("Viewing details for trip:", tripId);
  };

  const handleEditTripLocal = (trip: Trip) => {
    setEditingTrip(trip);
    setShowEditForm(true);
  };

  const handleViewExpensesLocal = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowExpensesModal(true);
  };

  const handleCancelTripLocal = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('daily_trips')
        .update({ status: 'cancelled' })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip cancelled successfully",
      });
      
      fetchTrips();
    } catch (error) {
      console.error('Error cancelling trip:', error);
      toast({
        title: "Error",
        description: "Failed to cancel trip",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchDieselPrice();
  }, []);

  const safeParseJSON = (str?: string | any) => {
    if (!str) return {};
    if (typeof str === 'object') return str;
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  };

  const fetchDieselPrice = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'diesel_price_per_liter')
        .single();

      if (settings) {
        setDieselPrice(parseFloat(settings.setting_value as string));
      }
    } catch (error) {
      console.error('Error fetching diesel price:', error);
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      // Fetch daily trips data
      const { data: trips, error } = await supabase
        .from('daily_trips')
        .select('*')
        .order('trip_date', { ascending: false });

      if (error) {
        console.error('Error fetching trips:', error);
        setData([]);
        return;
      }

      if (!trips || trips.length === 0) {
        setData([]);
        return;
      }

      // Also fetch additional data from driver allocations for better display
      const { data: allocations } = await supabase
        .from('driver_allocations')
        .select('*');

      // Transform the data to match our interface
      const transformedTrips: Trip[] = trips.map(trip => {
        // Find matching allocation data for better display
        const allocation = allocations?.find(a => a.trip_id === trip.trip_no);
        const notes = allocation ? safeParseJSON(allocation.notes) : {};

        return {
          id: trip.id,
          trip_no: trip.trip_no || `T${trip.id.slice(0, 4)}`,
          bus_id: trip.bus_id || '',
          route_id: trip.route_id || '',
          driver_id: trip.driver_id,
          conductor_id: trip.conductor_id,
          bus_no: notes.bus_no || `Bus-${trip.bus_id?.slice(0, 8) || 'Unknown'}`,
          route_no: notes.route_no || `R-${trip.route_id?.slice(0, 8) || 'Unknown'}`,
          route: notes.route || `Route-${trip.route_id?.slice(0, 8) || 'Unknown'}`,
          driver_name: notes.driver || (trip.driver_id ? `Driver-${trip.driver_id.slice(0, 8)}` : undefined),
          conductor_name: notes.conductor || (trip.conductor_id ? `Conductor-${trip.conductor_id.slice(0, 8)}` : undefined),
          whatsapp: notes.whatsapp || trip.whatsapp,
          trip_date: trip.trip_date,
          start_time: trip.start_time,
          end_time: trip.end_time,
          time: notes.time,
          odometer_start: trip.odometer_start,
          odometer_end: trip.odometer_end,
          distance_km: trip.distance_km || 0,
          income: trip.income || 0,
          fuel_cost: trip.fuel_cost || 0,
          diesel_price_per_liter: trip.diesel_price_per_liter,
          fuel_liters: trip.fuel_liters,
          other_expenses: trip.other_expenses || 0,
          other_expenses_details: Array.isArray(trip.other_expenses_details) ? trip.other_expenses_details : [],
          total_expenses: trip.total_expenses || 0,
          net_income: trip.net_income || 0,
          km_per_liter: trip.km_per_liter || 0,
          performance_score: trip.performance_score,
          audit_log: Array.isArray(trip.audit_log) ? trip.audit_log : [],
          status: trip.status as Trip['status'] || 'scheduled',
        };
      });

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
    setShowExportModal(true);
  };

  const handleAddTrip = () => {
    setShowAddForm(true);
  };

  const handleTripAdded = () => {
    setShowAddForm(false);
    fetchTrips();
  };

  const handleTripUpdated = () => {
    setShowEditForm(false);
    setEditingTrip(null);
    fetchTrips();
  };

  // Import driver allocation data for selected date range
  const importDriverAllocationData = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      // Fetch driver allocations for the selected date range
      const { data: allocations, error: allocError } = await supabase
        .from('driver_allocations')
        .select('*')
        .gte('allocation_date', startDate)
        .lte('allocation_date', endDate)
        .not('bus_id', 'is', null); // Only get records with valid bus_id

      if (allocError) {
        console.error('Error fetching allocations:', allocError);
        toast({
          title: "Error",
          description: "Failed to fetch driver allocations",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      if (!allocations || allocations.length === 0) {
        toast({
          title: "No Data", 
          description: "No valid driver allocations found for the selected date range",
        });
        setImporting(false);
        return;
      }

      console.log('Found allocations:', allocations);

      // Transform allocations to daily trips format, ensuring all required fields are present
      const tripsToInsert = allocations
        .filter(allocation => allocation.bus_id && allocation.trip_id) // Extra safety check
        .map(allocation => {
          const notes = safeParseJSON(allocation.notes);
          
          return {
            trip_no: allocation.trip_id,
            bus_id: allocation.bus_id, // This should now never be null
            route_id: allocation.route_id || null,
            driver_id: allocation.driver_id || null,
            conductor_id: allocation.conductor_id || null,
            trip_date: allocation.allocation_date,
            start_time: allocation.start_time || null,
            end_time: allocation.end_time || null,
            whatsapp: allocation.whatsapp_sent ? 'sent' : null,
            status: 'scheduled' as const,
            income: 0,
            fuel_cost: 0,
            other_expenses: 0,
            total_expenses: 0,
            net_income: 0,
            distance_km: 0,
            km_per_liter: 0,
            notes: allocation.notes || null,
          };
        });

      console.log('Trips to insert:', tripsToInsert);

      if (tripsToInsert.length === 0) {
        toast({
          title: "No Valid Data",
          description: "No complete allocation records found (missing bus_id or trip_id)",
        });
        setImporting(false);
        return;
      }

      // Check for existing trips to avoid duplicates
      const existingTripIds = data.map(trip => trip.trip_no);
      const newTrips = tripsToInsert.filter(trip => !existingTripIds.includes(trip.trip_no));

      if (newTrips.length === 0) {
        toast({
          title: "Info",
          description: "All trips from the selected date range already exist",
        });
        setImporting(false);
        return;
      }

      // Insert trips into daily_trips table
      const { error: insertError } = await supabase
        .from('daily_trips')
        .insert(newTrips);

      if (insertError) {
        console.error('Insert error:', insertError);
        toast({
          title: "Error",
          description: `Failed to import trips: ${insertError.message}`,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      toast({
        title: "Success",
        description: `Successfully imported ${newTrips.length} trips from driver allocations`,
      });

      // Refresh the trips list
      await fetchTrips();

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: `Import failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
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
        <div className="flex gap-2">
          <Button onClick={handleAddTrip} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Trip
          </Button>
        </div>
      </div>

      {/* Import Driver Allocations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Import from Driver Allocations
          </CardTitle>
          <CardDescription>
            Select a date range to automatically import scheduled driver allocations as daily trips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button 
              onClick={importDriverAllocationData}
              disabled={importing || !startDate || !endDate}
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  Import Trips
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
        columns={createColumns(handleViewDetailsLocal, handleEditTripLocal, handleViewExpensesLocal, handleCancelTripLocal)}
        data={data}
        searchKey="bus_no"
        title="Daily Trips"
        onExport={handleExport}
      />

      {/* Modals */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Trip</DialogTitle>
          </DialogHeader>
          <AddTripForm 
            onSuccess={handleTripAdded}
            onCancel={() => setShowAddForm(false)}
            dieselPrice={dieselPrice}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
          </DialogHeader>
          {editingTrip && (
            <EditTripForm 
              trip={editingTrip}
              onSuccess={handleTripUpdated}
              onCancel={() => setShowEditForm(false)}
              dieselPrice={dieselPrice}
            />
          )}
        </DialogContent>
      </Dialog>

      <OtherExpensesModal
        isOpen={showExpensesModal}
        onClose={() => setShowExpensesModal(false)}
        trip={selectedTrip}
        onUpdate={fetchTrips}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={data}
      />
    </div>
  );
}