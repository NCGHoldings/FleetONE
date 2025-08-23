import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { Bus, Wrench, DollarSign, Calendar, MoreHorizontal, Plus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Fleet {
  id: string;
  busNo: string;
  type: string;
  route: string;
  model: string;
  year: number;
  capacity: number;
  status: "active" | "maintenance" | "idle";
  lastService: string;
  nextService: string;
  mileage: number;
  avgDailyRevenue: number;
}

// Mock data
const fleetData: Fleet[] = [
  {
    id: "F001",
    busNo: "NK-2847",
    type: "Inter-City",
    route: "Colombo - Kandy",
    model: "Ashok Leyland Viking",
    year: 2020,
    capacity: 49,
    status: "active",
    lastService: "2024-01-10",
    nextService: "2024-04-10",
    mileage: 125000,
    avgDailyRevenue: 15500
  },
  {
    id: "F002",
    busNo: "NK-1234",
    type: "Highway",
    route: "Colombo - Galle",
    model: "Tata Starbus",
    year: 2019,
    capacity: 45,
    status: "active",
    lastService: "2024-01-05",
    nextService: "2024-04-05",
    mileage: 142000,
    avgDailyRevenue: 13200
  },
  {
    id: "F003",
    busNo: "NK-5678",
    type: "Hill Country",
    route: "Kandy - Nuwara Eliya",
    model: "Ashok Leyland Viking",
    year: 2021,
    capacity: 42,
    status: "maintenance",
    lastService: "2024-01-12",
    nextService: "2024-04-12",
    mileage: 98000,
    avgDailyRevenue: 12800
  },
  {
    id: "F004",
    busNo: "NK-9012",
    type: "City",
    route: "Colombo Local",
    model: "Tata Starbus",
    year: 2018,
    capacity: 38,
    status: "idle",
    lastService: "2023-12-28",
    nextService: "2024-03-28",
    mileage: 185000,
    avgDailyRevenue: 8500
  }
];

const getStatusBadge = (status: Fleet['status']) => {
  const variants = {
    active: { variant: "success" as const, label: "Active" },
    maintenance: { variant: "warning" as const, label: "Maintenance" },
    idle: { variant: "secondary" as const, label: "Idle" }
  };
  
  const config = variants[status];
  return <Badge className={`status-${config.variant.replace('secondary', 'neutral')}`}>{config.label}</Badge>;
};

const columns: ColumnDef<Fleet>[] = [
  {
    accessorKey: "busNo",
    header: "Bus No.",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "route",
    header: "Route",
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
    accessorKey: "mileage",
    header: "Mileage (km)",
    cell: ({ row }) => {
      const mileage = row.getValue("mileage") as number;
      return mileage.toLocaleString();
    },
  },
  {
    accessorKey: "avgDailyRevenue",
    header: "Avg Daily Revenue (₨)",
    cell: ({ row }) => {
      const revenue = row.getValue("avgDailyRevenue") as number;
      return `₨ ${revenue.toLocaleString()}`;
    },
  },
  {
    accessorKey: "nextService",
    header: "Next Service",
    cell: ({ row }) => {
      const date = new Date(row.getValue("nextService"));
      return date.toLocaleDateString();
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
  const [data] = useState<Fleet[]>(fleetData);

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
  const totalRevenue = data.reduce((sum, bus) => sum + bus.avgDailyRevenue, 0);
  const avgMileage = data.reduce((sum, bus, _, arr) => sum + bus.mileage / arr.length, 0);

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
          change={`${((activeBuses / totalBuses) * 100).toFixed(0)}%`}
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
        searchKey="busNo"
        title="Fleet Overview"
        onExport={handleExport}
      />
    </div>
  );
}