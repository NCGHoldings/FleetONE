import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Users, Trophy, TrendingUp, Fuel, Target, Award, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { ResponsiveRadar } from "@nivo/radar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

interface DriverStats {
  driverId: string;
  driverName: string;
  totalTrips: number;
  totalDistance: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  avgEfficiency: number;
  completionRate: number;
  rank: number;
}

interface DriverPerformanceSectionProps {
  driverStats: DriverStats[];
}

export default function DriverPerformanceSection({ driverStats }: DriverPerformanceSectionProps) {
  // Filter out unknown drivers
  const validDrivers = driverStats.filter(d => d.driverName !== 'Unknown Driver' && d.driverId);
  
  if (validDrivers.length === 0) {
    return (
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No Driver Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Driver assignments are not found for trips in this period. 
              Assign drivers to trips in the Daily Trips page to see analytics here.
            </p>
            <Badge variant="outline" className="mt-2">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Missing driver_id in daily_trips
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topDrivers = validDrivers.slice(0, 5);
  const totalDrivers = validDrivers.length;
  const avgIncome = totalDrivers > 0 ? validDrivers.reduce((sum, d) => sum + (d.netIncome ?? 0), 0) / totalDrivers : 0;
  const avgEfficiency = totalDrivers > 0 ? validDrivers.reduce((sum, d) => sum + (d.avgEfficiency ?? 0), 0) / totalDrivers : 0;
  const topPerformer = validDrivers[0];

  // Prepare radar chart data
  const radarData = topDrivers.map(driver => {
    const maxIncome = Math.max(...validDrivers.map(d => d.totalIncome ?? 0), 1);
    const maxDistance = Math.max(...validDrivers.map(d => d.totalDistance ?? 0), 1);
    const maxTrips = Math.max(...validDrivers.map(d => d.totalTrips ?? 0), 1);
    const maxEfficiency = Math.max(...validDrivers.map(d => d.avgEfficiency ?? 0), 1);
    
    return {
      driver: driver.driverName.split(' ')[0],
      income: ((driver.totalIncome ?? 0) / maxIncome) * 100,
      distance: ((driver.totalDistance ?? 0) / maxDistance) * 100,
      trips: ((driver.totalTrips ?? 0) / maxTrips) * 100,
      efficiency: ((driver.avgEfficiency ?? 0) / maxEfficiency) * 100,
    };
  });

  // Bar chart data for comparison
  const barChartData = topDrivers.map(driver => ({
    name: driver.driverName.split(' ')[0],
    income: driver.totalIncome ?? 0,
    expenses: driver.totalExpenses ?? 0,
    profit: driver.netIncome ?? 0,
  }));

  const gradientColors = [
    'from-blue-500 to-purple-600',
    'from-purple-500 to-pink-600',
    'from-cyan-500 to-blue-600',
    'from-indigo-500 to-purple-600',
  ];

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Drivers</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                    {totalDrivers}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                  <Users className="w-6 h-6 text-white" />
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
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                  <p className="text-xl font-bold truncate max-w-[150px]">{topPerformer?.driverName}</p>
                  <p className="text-sm text-muted-foreground">Rs {topPerformer?.netIncome.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
                  <Trophy className="w-6 h-6 text-white" />
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
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Net Income</p>
                  <p className="text-2xl font-bold text-emerald-600">Rs {avgIncome.toLocaleString()}</p>
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
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Efficiency</p>
                  <p className="text-2xl font-bold text-cyan-600">{(avgEfficiency ?? 0).toFixed(2)} km/L</p>
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
        {/* Driver Comparison Bar Chart */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Driver Income Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => `Rs ${((v ?? 0)/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip 
                    formatter={(value: number) => [`Rs ${value.toLocaleString()}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="profit" name="Net Profit" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Multi-Dimensional Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveRadar
                data={[
                  { metric: 'Income', ...Object.fromEntries(topDrivers.map(d => [d.driverName.split(' ')[0], ((d.totalIncome ?? 0) / Math.max(...validDrivers.map(x => x.totalIncome ?? 0), 1)) * 100])) },
                  { metric: 'Distance', ...Object.fromEntries(topDrivers.map(d => [d.driverName.split(' ')[0], ((d.totalDistance ?? 0) / Math.max(...validDrivers.map(x => x.totalDistance ?? 0), 1)) * 100])) },
                  { metric: 'Trips', ...Object.fromEntries(topDrivers.map(d => [d.driverName.split(' ')[0], ((d.totalTrips ?? 0) / Math.max(...validDrivers.map(x => x.totalTrips ?? 0), 1)) * 100])) },
                  { metric: 'Efficiency', ...Object.fromEntries(topDrivers.map(d => [d.driverName.split(' ')[0], ((d.avgEfficiency ?? 0) / Math.max(...validDrivers.map(x => x.avgEfficiency ?? 0), 1)) * 100])) },
                  { metric: 'Profit', ...Object.fromEntries(topDrivers.map(d => [d.driverName.split(' ')[0], ((d.netIncome ?? 0) / Math.max(...validDrivers.map(x => x.netIncome ?? 0), 1)) * 100])) },
                ]}
                keys={topDrivers.map(d => d.driverName.split(' ')[0])}
                indexBy="metric"
                maxValue={100}
                margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
                borderColor={{ from: 'color' }}
                gridLabelOffset={20}
                dotSize={8}
                dotColor={{ theme: 'background' }}
                dotBorderWidth={2}
                colors={['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B']}
                blendMode="multiply"
                motionConfig="gentle"
                legends={[
                  {
                    anchor: 'top-left',
                    direction: 'column',
                    translateX: -50,
                    translateY: -40,
                    itemWidth: 80,
                    itemHeight: 20,
                    itemTextColor: '#999',
                    symbolSize: 12,
                    symbolShape: 'circle',
                  }
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Leaderboard Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Driver Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="w-32">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validDrivers.map((driver, idx) => {
                  const performanceScore = ((driver.netIncome ?? 0) / Math.max(...validDrivers.map(d => d.netIncome ?? 0), 1)) * 100;
                  return (
                    <TableRow key={driver.driverId} className="hover:bg-muted/30">
                      <TableCell>
                        {driver.rank <= 3 ? (
                          <span className="text-2xl">{['🥇', '🥈', '🥉'][driver.rank - 1]}</span>
                        ) : (
                          <Badge variant="outline" className="font-bold">#{driver.rank}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{driver.driverName}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{driver.totalTrips ?? 0}</TableCell>
                      <TableCell className="text-right font-mono">{(driver.totalDistance ?? 0).toFixed(0)} km</TableCell>
                      <TableCell className="text-right font-mono">Rs {(driver.totalIncome ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${(driver.netIncome ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Rs {(driver.netIncome ?? 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={(driver.avgEfficiency ?? 0) >= 12 ? 'default' : (driver.avgEfficiency ?? 0) >= 10 ? 'secondary' : 'destructive'}>
                          {(driver.avgEfficiency ?? 0).toFixed(2)} km/L
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={performanceScore} className="h-2" />
                          <span className="text-xs text-muted-foreground w-10">{(performanceScore ?? 0).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
