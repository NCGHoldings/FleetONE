import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { Calendar, DollarSign, Fuel, Route, MoreHorizontal, Plus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Trip {
  id: string;
  busNo: string;
  routeNo: string;
  route: string;
  driver: string;
  conductor: string;
  date: string;
  startTime: string;
  endTime: string;
  distance: number;
  income: number;
  fuelCost: number;
  netIncome: number;
  kmPerLiter: number;
  status: "completed" | "ongoing" | "cancelled";
}

// Mock data
const tripsData: Trip[] = [
  {
    id: "T001",
    busNo: "NK-2847",
    routeNo: "R101",
    route: "Colombo - Kandy",
    driver: "Sunil Perera",
    conductor: "Nimal Silva",
    date: "2024-01-15",
    startTime: "06:00",
    endTime: "10:30",
    distance: 115,
    income: 12500,
    fuelCost: 3200,
    netIncome: 9300,
    kmPerLiter: 12.8,
    status: "completed"
  },
  {
    id: "T002",
    busNo: "NK-1234",
    routeNo: "R102",
    route: "Colombo - Galle",
    driver: "Kamal Ranasinghe",
    conductor: "Prasad Kumara",
    date: "2024-01-15",
    startTime: "07:15",
    endTime: "11:45",
    distance: 98,
    income: 10800,
    fuelCost: 2950,
    netIncome: 7850,
    kmPerLiter: 11.2,
    status: "completed"
  },
  {
    id: "T003",
    busNo: "NK-5678",
    routeNo: "R103",
    route: "Kandy - Nuwara Eliya",
    driver: "Ranjan Fernando",
    conductor: "Chamara Dias",
    date: "2024-01-15",
    startTime: "08:00",
    endTime: "",
    distance: 0,
    income: 0,
    fuelCost: 0,
    netIncome: 0,
    kmPerLiter: 0,
    status: "ongoing"
  }
];

const getStatusBadge = (status: Trip['status']) => {
  const variants = {
    completed: { variant: "success" as const, label: "Completed" },
    ongoing: { variant: "warning" as const, label: "Ongoing" },
    cancelled: { variant: "destructive" as const, label: "Cancelled" }
  };
  
  const config = variants[status];
  return <Badge className={`status-${config.variant.replace('destructive', 'error')}`}>{config.label}</Badge>;
};

const columns: ColumnDef<Trip>[] = [
  {
    accessorKey: "busNo",
    header: "Bus No.",
  },
  {
    accessorKey: "routeNo",
    header: "Route No.",
  },
  {
    accessorKey: "route",
    header: "Route",
  },
  {
    accessorKey: "driver",
    header: "Driver",
  },
  {
    accessorKey: "conductor",
    header: "Conductor",
  },
  {
    accessorKey: "distance",
    header: "Distance (km)",
    cell: ({ row }) => {
      const distance = row.getValue("distance") as number;
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
    accessorKey: "fuelCost",
    header: "Fuel Cost (₨)",
    cell: ({ row }) => {
      const fuelCost = row.getValue("fuelCost") as number;
      return fuelCost > 0 ? `₨ ${fuelCost.toLocaleString()}` : "-";
    },
  },
  {
    accessorKey: "netIncome",
    header: "Net Income (₨)",
    cell: ({ row }) => {
      const netIncome = row.getValue("netIncome") as number;
      return netIncome > 0 ? `₨ ${netIncome.toLocaleString()}` : "-";
    },
  },
  {
    accessorKey: "kmPerLiter",
    header: "km/L",
    cell: ({ row }) => {
      const kmPerLiter = row.getValue("kmPerLiter") as number;
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
  const [data] = useState<Trip[]>(tripsData);

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
  const totalDistance = data.reduce((sum, trip) => sum + trip.distance, 0);
  const avgKmPerLiter = data.filter(trip => trip.kmPerLiter > 0)
    .reduce((sum, trip, _, arr) => sum + trip.kmPerLiter / arr.length, 0);

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
        searchKey="busNo"
        title="Today's Trips"
        onExport={handleExport}
      />
    </div>
  );
}