import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useFleetOperatingCosts, 
  useFleetCostTrends, 
  useFleetCostsByCategory,
  VehicleOperatingCost 
} from "@/hooks/useFleetFinancials";
import { 
  Fuel, 
  Wrench, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Bus,
  DollarSign,
  Gauge,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";

export const VehicleOperatingCostView = () => {
  const [dateRange, setDateRange] = useState<"1m" | "3m" | "6m" | "12m" | "custom">("3m");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  // Calculate date range
  const getDateRange = () => {
    const end = endOfMonth(new Date());
    let start: Date;

    switch (dateRange) {
      case "1m":
        start = startOfMonth(new Date());
        break;
      case "3m":
        start = startOfMonth(subMonths(new Date(), 2));
        break;
      case "6m":
        start = startOfMonth(subMonths(new Date(), 5));
        break;
      case "12m":
        start = startOfMonth(subMonths(new Date(), 11));
        break;
      case "custom":
        start = customStartDate || startOfMonth(subMonths(new Date(), 2));
        break;
      default:
        start = startOfMonth(subMonths(new Date(), 2));
    }

    return { startDate: start, endDate: customEndDate || end };
  };

  const { startDate, endDate } = getDateRange();

  const { data: operatingCosts, isLoading, refetch } = useFleetOperatingCosts(startDate, endDate);
  const { data: trends } = useFleetCostTrends(6);
  const { data: categoryData } = useFleetCostsByCategory(startDate, endDate);

  const summary = operatingCosts?.summary;
  const vehicleCosts = operatingCosts?.vehicleCosts || [];
  const costBreakdown = operatingCosts?.costBreakdown || [];

  // Columns for vehicle cost table
  const vehicleColumns = [
    {
      accessorKey: "busNo",
      header: "Vehicle",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => (
        <div className="flex items-center gap-2">
          <Bus className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.busNo}</span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => (
        <Badge variant="outline">{row.original.category}</Badge>
      ),
    },
    {
      accessorKey: "totalKm",
      header: "Total KM",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => (
        <span>{row.original.totalKm.toLocaleString()} km</span>
      ),
    },
    {
      accessorKey: "totalFuelCost",
      header: "Fuel Cost",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => (
        <CurrencyDisplay amount={row.original.totalFuelCost} />
      ),
    },
    {
      accessorKey: "totalMaintenanceCost",
      header: "Maintenance",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => (
        <CurrencyDisplay amount={row.original.totalMaintenanceCost} />
      ),
    },
    {
      accessorKey: "totalCost",
      header: "Total Cost",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.totalCost} />
        </span>
      ),
    },
    {
      accessorKey: "costPerKm",
      header: "Cost/KM",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => {
        const costPerKm = row.original.costPerKm;
        const isHigh = costPerKm > 100; // Threshold for high cost per km
        return (
          <div className="flex items-center gap-1">
            <span className={isHigh ? "text-destructive font-semibold" : ""}>
              Rs. {costPerKm.toFixed(2)}
            </span>
            {isHigh && <AlertTriangle className="h-3 w-3 text-destructive" />}
          </div>
        );
      },
    },
    {
      accessorKey: "fuelEfficiency",
      header: "Fuel Eff.",
      cell: ({ row }: { row: { original: VehicleOperatingCost } }) => (
        <span>{row.original.fuelEfficiency.toFixed(2)} km/L</span>
      ),
    },
  ];

  // Chart colors matching semantic tokens
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  // Find most/least expensive vehicles
  const sortedByCostPerKm = [...vehicleCosts].sort((a, b) => b.costPerKm - a.costPerKm);
  const mostExpensive = sortedByCostPerKm.slice(0, 3);
  const leastExpensive = sortedByCostPerKm.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Vehicle Operating Costs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze operating costs per vehicle across the fleet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">This Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Operating Cost</p>
              <h3 className="text-2xl font-bold mt-1">
                <CurrencyDisplay amount={summary?.totalCost || 0} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.vehicleCount || 0} vehicles
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Cost per KM</p>
              <h3 className="text-2xl font-bold mt-1">
                Rs. {(summary?.averageCostPerKm || 0).toFixed(2)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {(summary?.totalKm || 0).toLocaleString()} total KM
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-chart-1/10 flex items-center justify-center">
              <Gauge className="h-6 w-6 text-chart-1" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fuel Cost</p>
              <h3 className="text-2xl font-bold mt-1">
                <CurrencyDisplay amount={summary?.totalFuelCost || 0} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.totalCost ? ((summary.totalFuelCost / summary.totalCost) * 100).toFixed(0) : 0}% of total
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
              <Fuel className="h-6 w-6 text-chart-2" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Fuel Efficiency</p>
              <h3 className="text-2xl font-bold mt-1">
                {(summary?.averageFuelEfficiency || 0).toFixed(2)} km/L
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Fleet average
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-chart-3/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-chart-3" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cost Breakdown Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="category"
                  label={({ name, value }) => `${name}`}
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, '']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Monthly Trend Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Cost Trend</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, '']}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="fuelCost" 
                  stackId="1"
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.6}
                  name="Fuel"
                />
                <Area 
                  type="monotone" 
                  dataKey="maintenanceCost" 
                  stackId="1"
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.6}
                  name="Maintenance"
                />
                <Area 
                  type="monotone" 
                  dataKey="salaryCost" 
                  stackId="1"
                  stroke="hsl(var(--chart-3))" 
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.6}
                  name="Salary"
                />
                <Area 
                  type="monotone" 
                  dataKey="otherCost" 
                  stackId="1"
                  stroke="hsl(var(--chart-4))" 
                  fill="hsl(var(--chart-4))"
                  fillOpacity={0.6}
                  name="Other"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Category Comparison */}
      {categoryData && categoryData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cost by Vehicle Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="fuelCost" name="Fuel" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maintenanceCost" name="Maintenance" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Most/Least Expensive Vehicles */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold">Highest Cost per KM</h3>
          </div>
          <div className="space-y-3">
            {mostExpensive.map((vehicle, index) => (
              <div key={vehicle.busId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{vehicle.busNo}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-destructive">Rs. {vehicle.costPerKm.toFixed(2)}/km</p>
                  <p className="text-sm text-muted-foreground">
                    <CurrencyDisplay amount={vehicle.totalCost} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-chart-3" />
            <h3 className="text-lg font-semibold">Lowest Cost per KM</h3>
          </div>
          <div className="space-y-3">
            {leastExpensive.map((vehicle, index) => (
              <div key={vehicle.busId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{vehicle.busNo}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-chart-3">Rs. {vehicle.costPerKm.toFixed(2)}/km</p>
                  <p className="text-sm text-muted-foreground">
                    <CurrencyDisplay amount={vehicle.totalCost} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Vehicle Table */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">Vehicle-wise Cost Details</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed breakdown of operating costs per vehicle
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable 
            columns={vehicleColumns} 
            data={vehicleCosts} 
            searchKey="busNo"
          />
        )}
      </Card>
    </div>
  );
};
