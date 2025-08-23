import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { Bus, Wrench, DollarSign, Calendar, MoreHorizontal, Plus, Loader2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Fleet {
  id: string;
  bus_no: string;
  type: string;
  route?: string;
  model: string;
  year: number;
  capacity: number;
  status: "active" | "maintenance" | "idle" | "retired";
  last_service_date?: string;
  next_service_date?: string;
  current_mileage: number;
  avg_daily_revenue?: number;
}

const getStatusBadge = (status: Fleet['status']) => {
  const variants = {
    active: { variant: "success" as const, label: "Active" },
    maintenance: { variant: "warning" as const, label: "Maintenance" },
    idle: { variant: "secondary" as const, label: "Idle" },
    retired: { variant: "destructive" as const, label: "Retired" }
  };
  
  const config = variants[status];
  return <Badge className={`status-${config.variant.replace('secondary', 'neutral').replace('destructive', 'error')}`}>{config.label}</Badge>;
};

const columns: ColumnDef<Fleet>[] = [
  {
    accessorKey: "bus_no",
    header: "Bus No.",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "route",
    header: "Route",
    cell: ({ row }) => row.getValue("route") || "-",
  },
  {
    accessorKey: "model",
    header: "Model",
  },
  {
    accessorKey: "year",
    header: "Year",
  },
  {
    accessorKey: "capacity",
    header: "Capacity",
    cell: ({ row }) => `${row.getValue("capacity")} seats`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getStatusBadge(row.getValue("status")),
  },
  {
    accessorKey: "current_mileage",
    header: "Mileage (km)",
    cell: ({ row }) => {
      const mileage = row.getValue("current_mileage") as number;
      return mileage.toLocaleString();
    },
  },
  {
    accessorKey: "avg_daily_revenue",
    header: "Avg Daily Revenue (₨)",
    cell: ({ row }) => {
      const revenue = row.getValue("avg_daily_revenue") as number;
      return revenue ? `₨ ${revenue.toLocaleString()}` : "-";
    },
  },
  {
    accessorKey: "next_service_date",
    header: "Next Service",
    cell: ({ row }) => {
      const date = row.getValue("next_service_date");
      return date ? new Date(date as string).toLocaleDateString() : "-";
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const fleet = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Bus</DropdownMenuItem>
            <DropdownMenuItem>Service History</DropdownMenuItem>
            <DropdownMenuItem>Schedule Maintenance</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function FleetManagement() {
  const [data, setData] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFleet();
  }, []);

  const fetchFleet = async () => {
    try {
      // Fetch buses with calculated average daily revenue
      const { data: buses, error } = await supabase
        .from('buses')
        .select('*')
        .order('bus_no');

      if (error) {
        console.error('Error fetching fleet:', error);
        toast({
          title: "Error",
          description: "Failed to load fleet data.",
          variant: "destructive",
        });
        return;
      }

      // For each bus, calculate average daily revenue from trips
      const busesWithRevenue = await Promise.all(
        buses?.map(async (bus) => {
          const { data: trips } = await supabase
            .from('daily_trips')
            .select('income, trip_date')
            .eq('bus_id', bus.id)
            .eq('status', 'completed');

          const totalRevenue = trips?.reduce((sum, trip) => sum + (trip.income || 0), 0) || 0;
          const tripCount = trips?.length || 0;
          const avgDailyRevenue = tripCount > 0 ? totalRevenue / tripCount : 0;

          return {
            id: bus.id,
            bus_no: bus.bus_no,
            type: bus.type,
            route: bus.route,
            model: bus.model,
            year: bus.year,
            capacity: bus.capacity,
            status: bus.status as Fleet['status'],
            last_service_date: bus.last_service_date,
            next_service_date: bus.next_service_date,
            current_mileage: bus.current_mileage || 0,
            avg_daily_revenue: Math.round(avgDailyRevenue),
          } as Fleet;
        }) || []
      );

      setData(busesWithRevenue);
    } catch (error) {
      console.error('Error in fetchFleet:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading fleet data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    console.log("Exporting fleet data...");
    // Export logic will be implemented here
  };

  const handleAddBus = () => {
    console.log("Adding new bus...");
    // Add bus logic will be implemented here
  };

  // Calculate KPIs
  const totalBuses = data.length;
  const activeBuses = data.filter(bus => bus.status === 'active').length;
  const maintenanceBuses = data.filter(bus => bus.status === 'maintenance').length;
  const totalRevenue = data.reduce((sum, bus) => sum + (bus.avg_daily_revenue || 0), 0);
  const avgMileage = data.reduce((sum, bus, _, arr) => sum + bus.current_mileage / arr.length, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fleet Management</h1>
            <p className="text-muted-foreground">Monitor and manage your bus fleet</p>
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
          <h1 className="text-3xl font-bold text-foreground">Fleet Management</h1>
          <p className="text-muted-foreground">Monitor and manage your bus fleet</p>
        </div>
        <Button onClick={handleAddBus} className="gap-2">
          <Plus className="w-4 h-4" />
          Add New Bus
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Buses"
          value={totalBuses.toString()}
          icon={<Bus className="w-5 h-5" />}
          description="Fleet size"
        />
        <KPICard
          title="Active Buses"
          value={activeBuses.toString()}
          change={totalBuses > 0 ? `${((activeBuses / totalBuses) * 100).toFixed(0)}%` : "0%"}
          changeType="positive"
          icon={<Bus className="w-5 h-5" />}
          description="On road now"
        />
        <KPICard
          title="In Maintenance"
          value={maintenanceBuses.toString()}
          icon={<Wrench className="w-5 h-5" />}
          description="Under service"
        />
        <KPICard
          title="Daily Revenue"
          value={`₨ ${totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          description="Fleet total"
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="bus_no"
        title="Fleet Overview"
        onExport={handleExport}
      />
    </div>
  );
}