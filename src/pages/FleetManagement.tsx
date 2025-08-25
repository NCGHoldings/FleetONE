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
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-accent-hover to-primary p-8 text-accent-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <Bus className="w-10 h-10 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                Fleet Management
              </h1>
              <p className="text-accent-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                Monitor and optimize your entire bus fleet
              </p>
            </div>
          </div>
          <Button 
            onClick={handleAddBus} 
            className="gap-2 bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 animate-scale-in" 
            style={{ animationDelay: '0.2s' }}
          >
            <Plus className="w-4 h-4 animate-pulse-subtle" />
            Add New Bus
          </Button>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced KPI Cards with Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Total Buses"
              value={totalBuses.toString()}
              icon={<Bus className="w-5 h-5 group-hover:animate-wiggle" />}
              description="Fleet size"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Active Buses"
              value={activeBuses.toString()}
              change={totalBuses > 0 ? `${((activeBuses / totalBuses) * 100).toFixed(0)}%` : "0%"}
              changeType="positive"
              icon={<Bus className="w-5 h-5 group-hover:animate-bounce-subtle" />}
              description="On road now"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="professional-card hover:shadow-warning transition-all duration-500 group">
            <KPICard
              title="In Maintenance"
              value={maintenanceBuses.toString()}
              icon={<Wrench className="w-5 h-5 group-hover:animate-pulse-subtle" />}
              description="Under service"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <div className="professional-card hover:shadow-success transition-all duration-500 group">
            <KPICard
              title="Daily Revenue"
              value={`₨ ${totalRevenue.toLocaleString()}`}
              icon={<DollarSign className="w-5 h-5 group-hover:animate-bounce-notification" />}
              description="Fleet total"
            />
          </div>
        </div>
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