import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, DollarSign, TrendingDown, TrendingUp, Gauge, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { COMPARISON_COLORS } from "@/lib/comparison-colors";
import ComparisonMetricCard from "./charts/ComparisonMetricCard";
import ComparisonBarChart from "./charts/ComparisonBarChart";
import ComparisonLineChart from "./charts/ComparisonLineChart";
import PerformanceGaugeChart from "./charts/PerformanceGaugeChart";
import ComparisonHeatMap from "./charts/ComparisonHeatMap";
import { Badge } from "@/components/ui/badge";

interface ComparisonItem {
  id: string;
  name: string;
  income: number;
  expenses: number;
  netProfit: number;
  trips: number;
  efficiency: number;
}

interface ComparisonDashboardProps {
  drivers: ComparisonItem[];
  routes: ComparisonItem[];
  buses: ComparisonItem[];
}

export default function ComparisonDashboard({
  drivers,
  routes,
  buses,
}: ComparisonDashboardProps) {
  const [comparisonType, setComparisonType] = useState<"drivers" | "routes" | "buses">("drivers");
  const [selected1, setSelected1] = useState<string>("");
  const [selected2, setSelected2] = useState<string>("");

  const data = comparisonType === "drivers" ? drivers : comparisonType === "routes" ? routes : buses;
  
  const item1 = data.find(d => d.id === selected1);
  const item2 = data.find(d => d.id === selected2);

  // Calculate performance scores
  const calculatePerformanceScore = (item: ComparisonItem) => {
    if (!item) return 0;
    const profitMargin = item.income > 0 ? (item.netProfit / item.income) * 100 : 0;
    const efficiencyScore = Math.min((item.efficiency / 15) * 100, 100);
    const volumeScore = Math.min((item.trips / 50) * 100, 100);
    return Math.round((profitMargin * 0.4) + (efficiencyScore * 0.3) + (volumeScore * 0.3));
  };

  const score1 = useMemo(() => item1 ? calculatePerformanceScore(item1) : 0, [item1]);
  const score2 = useMemo(() => item2 ? calculatePerformanceScore(item2) : 0, [item2]);

  const comparisonData = useMemo(() => {
    if (!item1 || !item2) return null;
    
    return [
      { label: "Income", value1: item1.income, value2: item2.income },
      { label: "Expenses", value1: item1.expenses, value2: item2.expenses },
      { label: "Profit", value1: item1.netProfit, value2: item2.netProfit },
    ];
  }, [item1, item2]);

  const heatMapMetrics = useMemo(() => {
    if (!item1 || !item2) return [];
    
    return [
      { 
        label: "Total Income", 
        value1: item1.income, 
        value2: item2.income,
        format: (v: number) => `₹${(v / 1000).toFixed(0)}k`
      },
      { 
        label: "Total Expenses", 
        value1: item1.expenses, 
        value2: item2.expenses,
        format: (v: number) => `₹${(v / 1000).toFixed(0)}k`
      },
      { 
        label: "Net Profit", 
        value1: item1.netProfit, 
        value2: item2.netProfit,
        format: (v: number) => `₹${(v / 1000).toFixed(0)}k`
      },
      { 
        label: "Total Trips", 
        value1: item1.trips, 
        value2: item2.trips,
        format: (v: number) => v.toString()
      },
      { 
        label: "Efficiency", 
        value1: item1.efficiency, 
        value2: item2.efficiency,
        format: (v: number) => `${v.toFixed(1)} km/L`
      },
    ];
  }, [item1, item2]);

  if (!item1 || !item2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Side-by-Side Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">Compare performance across drivers, routes, or buses</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Comparison Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={comparisonType === "drivers" ? "default" : "outline"}
              onClick={() => {
                setComparisonType("drivers");
                setSelected1("");
                setSelected2("");
              }}
            >
              Drivers
            </Button>
            <Button
              variant={comparisonType === "routes" ? "default" : "outline"}
              onClick={() => {
                setComparisonType("routes");
                setSelected1("");
                setSelected2("");
              }}
            >
              Routes
            </Button>
            <Button
              variant={comparisonType === "buses" ? "default" : "outline"}
              onClick={() => {
                setComparisonType("buses");
                setSelected1("");
                setSelected2("");
              }}
            >
              Buses
            </Button>
          </div>

          {/* Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select First {comparisonType.slice(0, -1)}</label>
              <Select value={selected1} onValueChange={setSelected1}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose a ${comparisonType.slice(0, -1)}`} />
                </SelectTrigger>
                <SelectContent>
                  {data.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={item.id === selected2}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Second {comparisonType.slice(0, -1)}</label>
              <Select value={selected2} onValueChange={setSelected2}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose a ${comparisonType.slice(0, -1)}`} />
                </SelectTrigger>
                <SelectContent>
                  {data.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={item.id === selected1}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-center py-12 text-muted-foreground">
            Select two {comparisonType} to compare
          </div>
        </CardContent>
      </Card>
    );
  }

  const profitMargin1 = item1.income > 0 ? ((item1.netProfit / item1.income) * 100) : 0;
  const profitMargin2 = item2.income > 0 ? ((item2.netProfit / item2.income) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Comparison Dashboard</CardTitle>
        <p className="text-sm text-muted-foreground">Compare performance across drivers, routes, or buses with detailed analytics</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Type Selector */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={comparisonType === "drivers" ? "default" : "outline"}
            onClick={() => {
              setComparisonType("drivers");
              setSelected1("");
              setSelected2("");
            }}
          >
            Drivers
          </Button>
          <Button
            variant={comparisonType === "routes" ? "default" : "outline"}
            onClick={() => {
              setComparisonType("routes");
              setSelected1("");
              setSelected2("");
            }}
          >
            Routes
          </Button>
          <Button
            variant={comparisonType === "buses" ? "default" : "outline"}
            onClick={() => {
              setComparisonType("buses");
              setSelected1("");
              setSelected2("");
            }}
          >
            Buses
          </Button>
        </div>

        {/* Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select First {comparisonType.slice(0, -1)}</label>
            <Select value={selected1} onValueChange={setSelected1}>
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${comparisonType.slice(0, -1)}`} />
              </SelectTrigger>
              <SelectContent>
                {data.map((item) => (
                  <SelectItem key={item.id} value={item.id} disabled={item.id === selected2}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select Second {comparisonType.slice(0, -1)}</label>
            <Select value={selected2} onValueChange={setSelected2}>
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${comparisonType.slice(0, -1)}`} />
              </SelectTrigger>
              <SelectContent>
                {data.map((item) => (
                  <SelectItem key={item.id} value={item.id} disabled={item.id === selected1}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm text-slate-600 dark:text-slate-400 mb-1">Entity 1</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{item1.name}</p>
              <Badge className="mt-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                Score: {score1.toFixed(1)}
              </Badge>
            </div>
            
            <div className="mx-8 text-4xl font-bold text-slate-400 dark:text-slate-600">VS</div>
            
            <div className="flex-1 text-right">
              <h3 className="text-sm text-slate-600 dark:text-slate-400 mb-1">Entity 2</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{item2.name}</p>
              <Badge className="mt-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                Score: {score2.toFixed(1)}
              </Badge>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-300 dark:border-slate-700 flex items-center justify-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <span className="text-lg font-semibold">
              Winner: {score1 > score2 ? (
                <span className="text-blue-600 dark:text-blue-400">{item1.name}</span>
              ) : score2 > score1 ? (
                <span className="text-purple-600 dark:text-purple-400">{item2.name}</span>
              ) : (
                <span className="text-slate-600 dark:text-slate-400">Tie</span>
              )}
            </span>
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
        </motion.div>

        {/* Tabbed Comparison Views */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ComparisonMetricCard
                title="Total Income"
                value1={item1.income}
                value2={item2.income}
                name1={item1.name}
                name2={item2.name}
                format={(v) => `₹${(v / 1000).toFixed(0)}k`}
                icon={<DollarSign className="h-5 w-5" />}
              />
              <ComparisonMetricCard
                title="Total Expenses"
                value1={item1.expenses}
                value2={item2.expenses}
                name1={item1.name}
                name2={item2.name}
                format={(v) => `₹${(v / 1000).toFixed(0)}k`}
                higherIsBetter={false}
              />
              <ComparisonMetricCard
                title="Net Profit"
                value1={item1.netProfit}
                value2={item2.netProfit}
                name1={item1.name}
                name2={item2.name}
                format={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <ComparisonMetricCard
                title="Efficiency"
                value1={item1.efficiency}
                value2={item2.efficiency}
                name1={item1.name}
                name2={item2.name}
                format={(v) => `${v.toFixed(1)} km/L`}
                icon={<Gauge className="h-5 w-5" />}
              />
            </div>

            <ComparisonBarChart
              name1={item1.name}
              name2={item2.name}
              data1={{
                income: item1.income,
                expenses: item1.expenses,
                netProfit: item1.netProfit,
              }}
              data2={{
                income: item2.income,
                expenses: item2.expenses,
                netProfit: item2.netProfit,
              }}
            />
          </TabsContent>

          {/* Detailed Tab */}
          <TabsContent value="detailed" className="space-y-6 mt-6">
            <ComparisonHeatMap
              name1={item1.name}
              name2={item2.name}
              metrics={heatMapMetrics}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Key Metrics - {item1.name}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Trips:</span>
                      <span className="font-semibold">{item1.trips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Income per Trip:</span>
                      <span className="font-semibold">₹{(item1.income / item1.trips).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Profit Margin:</span>
                      <span className="font-semibold">{profitMargin1.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Performance Score:</span>
                      <Badge variant={score1 >= 75 ? "default" : score1 >= 50 ? "secondary" : "destructive"}>
                        {score1}/100
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Key Metrics - {item2.name}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Trips:</span>
                      <span className="font-semibold">{item2.trips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Income per Trip:</span>
                      <span className="font-semibold">₹{(item2.income / item2.trips).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Profit Margin:</span>
                      <span className="font-semibold">{profitMargin2.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Performance Score:</span>
                      <Badge variant={score2 >= 75 ? "default" : score2 >= 50 ? "secondary" : "destructive"}>
                        {score2}/100
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6 mt-6">
            {comparisonData && (
              <ComparisonLineChart
                name1={item1.name}
                name2={item2.name}
                title="Financial Metrics Comparison"
                data={comparisonData}
                format={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
            <PerformanceGaugeChart
              name1={item1.name}
              name2={item2.name}
              score1={score1}
              score2={score2}
              title="Overall Performance Score"
            />

            <Card>
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Score Breakdown</h4>
                  <p className="text-xs text-muted-foreground">
                    Performance scores are calculated based on:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                    <li>• Profit Margin (40% weight)</li>
                    <li>• Fuel Efficiency (30% weight)</li>
                    <li>• Trip Volume (30% weight)</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h4 className="text-sm font-medium mb-2">{item1.name} Strengths</h4>
                    <div className="space-y-1 text-xs">
                      {item1.income > item2.income && (
                        <Badge variant="outline" className="mr-1">Higher Income</Badge>
                      )}
                      {item1.netProfit > item2.netProfit && (
                        <Badge variant="outline" className="mr-1">Better Profit</Badge>
                      )}
                      {item1.efficiency > item2.efficiency && (
                        <Badge variant="outline" className="mr-1">More Efficient</Badge>
                      )}
                      {item1.trips > item2.trips && (
                        <Badge variant="outline" className="mr-1">More Active</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">{item2.name} Strengths</h4>
                    <div className="space-y-1 text-xs">
                      {item2.income > item1.income && (
                        <Badge variant="outline" className="mr-1">Higher Income</Badge>
                      )}
                      {item2.netProfit > item1.netProfit && (
                        <Badge variant="outline" className="mr-1">Better Profit</Badge>
                      )}
                      {item2.efficiency > item1.efficiency && (
                        <Badge variant="outline" className="mr-1">More Efficient</Badge>
                      )}
                      {item2.trips > item1.trips && (
                        <Badge variant="outline" className="mr-1">More Active</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
