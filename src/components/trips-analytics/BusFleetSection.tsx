import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Bus, Fuel, TrendingUp, Activity, Gauge, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface BusStats {
  busNo: string;
  busModel?: string;
  busType?: string;
  busCapacity?: number;
  totalTrips: number;
  totalDistance: number;
  currentOdo: number;
  avgEfficiency: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  lastTripDate: string;
  utilizationRate: number;
}

interface BusFleetSectionProps {
  busStats: BusStats[];
}

export default function BusFleetSection({ busStats }: BusFleetSectionProps) {
  const totalBuses = busStats.length;
  const totalFleetIncome = busStats.reduce((sum, b) => sum + b.totalIncome, 0);
  const totalFleetDistance = busStats.reduce((sum, b) => sum + b.totalDistance, 0);
  const avgFleetEfficiency = busStats.reduce((sum, b) => sum + b.avgEfficiency, 0) / totalBuses;
  const topBus = busStats[0];

  // Utilization chart data
  const utilizationData = busStats.slice(0, 8).map(bus => ({
    name: bus.busNo,
    value: bus.utilizationRate,
    income: bus.totalIncome,
  }));

  // Distance comparison data
  const distanceData = busStats.slice(0, 10).map(bus => ({
    name: bus.busNo,
    distance: bus.totalDistance,
    trips: bus.totalTrips,
  }));

  // Efficiency ranking
  const efficiencyRanking = [...busStats].sort((a, b) => b.avgEfficiency - a.avgEfficiency);

  const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-6">
      {/* Fleet Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Fleet</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                    {totalBuses} Buses
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Bus className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fleet Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600">₨{(totalFleetIncome / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Distance</p>
                  <p className="text-2xl font-bold text-purple-600">{totalFleetDistance.toLocaleString()} km</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-600">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Efficiency</p>
                  <p className="text-2xl font-bold text-cyan-600">{avgFleetEfficiency.toFixed(2)} km/L</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600">
                  <Fuel className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bus Utilization Pie Chart */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              Fleet Utilization Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={utilizationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  >
                    {utilizationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toFixed(1)}% utilization`,
                      props.payload.name
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distance Comparison Bar Chart */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Distance by Bus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => `${v} km`} />
                  <YAxis type="category" dataKey="name" width={70} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} km`, 'Distance']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="distance" fill="url(#distanceGradient)" radius={[0, 4, 4, 0]} />
                  <defs>
                    <linearGradient id="distanceGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Ranking */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-emerald-500" />
            Fuel Efficiency Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {efficiencyRanking.slice(0, 8).map((bus, idx) => (
              <motion.div
                key={bus.busNo}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`${idx < 3 ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{bus.busNo}</span>
                      <Badge variant={idx < 3 ? 'default' : 'secondary'}>#{idx + 1}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">{bus.avgEfficiency.toFixed(2)} km/L</div>
                    <div className="mt-2">
                      <Progress 
                        value={(bus.avgEfficiency / Math.max(...busStats.map(b => b.avgEfficiency))) * 100} 
                        className="h-2"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{bus.totalTrips} trips</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fleet Performance Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-primary" />
            Complete Fleet Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Bus No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                  <TableHead>Last Trip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {busStats.map((bus, idx) => (
                  <TableRow key={bus.busNo} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-bold">{bus.busNo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{bus.busType || 'Standard'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{bus.totalTrips}</TableCell>
                    <TableCell className="text-right font-mono">{Number(bus.totalDistance).toFixed(0)} km</TableCell>
                    <TableCell className="text-right font-mono">₨{bus.totalIncome.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${bus.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ₨{bus.netIncome.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={bus.avgEfficiency >= 12 ? 'default' : bus.avgEfficiency >= 10 ? 'secondary' : 'destructive'}>
                        {bus.avgEfficiency.toFixed(2)} km/L
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Progress value={bus.utilizationRate} className="h-2 w-16" />
                        <span className="text-xs">{bus.utilizationRate.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {bus.lastTripDate || 'N/A'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
