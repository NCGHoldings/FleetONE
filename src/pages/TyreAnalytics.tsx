import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTyreManagement } from "@/hooks/useTyreManagement";
import { 
  BarChart3, TrendingUp, DollarSign, Calendar,
  Target, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function TyreAnalytics() {
  const { tyres, inspections, rotations } = useTyreManagement();

  // Calculate analytics
  const totalCost = tyres?.reduce((sum, t) => sum + (t.purchase_cost || 0), 0) || 0;
  const avgLifespan = tyres?.length > 0 
    ? tyres.reduce((sum, t) => sum + (t.current_km - t.km_at_installation), 0) / tyres.length 
    : 0;

  // Brand performance data
  const brandData = tyres?.reduce((acc: any, tyre) => {
    if (!acc[tyre.tyre_brand]) {
      acc[tyre.tyre_brand] = {
        brand: tyre.tyre_brand,
        count: 0,
        avgCondition: 0,
        totalKm: 0,
        totalCost: 0,
      };
    }
    acc[tyre.tyre_brand].count++;
    acc[tyre.tyre_brand].avgCondition += tyre.condition_percentage;
    acc[tyre.tyre_brand].totalKm += (tyre.current_km - tyre.km_at_installation);
    acc[tyre.tyre_brand].totalCost += tyre.purchase_cost || 0;
    return acc;
  }, {});

  const brandChartData = brandData ? Object.values(brandData).map((item: any) => ({
    brand: item.brand,
    avgCondition: Math.round(item.avgCondition / item.count),
    avgKm: Math.round(item.totalKm / item.count),
    costPerKm: (item.totalCost / item.totalKm).toFixed(2),
  })) : [];

  // Condition distribution
  const conditionData = [
    { name: "Excellent (≥70%)", value: tyres?.filter(t => t.condition_percentage >= 70).length || 0, color: "#10B981" },
    { name: "Good (50-69%)", value: tyres?.filter(t => t.condition_percentage >= 50 && t.condition_percentage < 70).length || 0, color: "#14B8A6" },
    { name: "Fair (30-49%)", value: tyres?.filter(t => t.condition_percentage >= 30 && t.condition_percentage < 50).length || 0, color: "#F59E0B" },
    { name: "Critical (<30%)", value: tyres?.filter(t => t.condition_percentage < 30).length || 0, color: "#EF4444" },
  ];

  // Monthly cost trend (simulated - would be calculated from actual dates)
  const monthlyCostData = [
    { month: "Jan", cost: 180000 },
    { month: "Feb", cost: 225000 },
    { month: "Mar", cost: 135000 },
    { month: "Apr", cost: 315000 },
    { month: "May", cost: 270000 },
    { month: "Jun", cost: 195000 },
  ];

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      {/* Hero Header */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-8 shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Tyre Analytics & Insights
          </h1>
          <p className="text-white/90 text-lg">
            Comprehensive analysis of tyre performance, costs, and predictions
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Investment</p>
              <p className="text-3xl font-bold text-blue-600">LKR {(totalCost / 1000).toFixed(0)}K</p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Lifespan</p>
              <p className="text-3xl font-bold text-emerald-600">{avgLifespan.toFixed(0)} km</p>
            </div>
            <TrendingUp className="w-12 h-12 text-emerald-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inspections</p>
              <p className="text-3xl font-bold text-purple-600">{inspections?.length || 0}</p>
            </div>
            <Target className="w-12 h-12 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Rotations</p>
              <p className="text-3xl font-bold text-amber-600">{rotations?.length || 0}</p>
            </div>
            <Calendar className="w-12 h-12 text-amber-500 opacity-50" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Condition Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Fleet Condition Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={conditionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {conditionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Brand Performance */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Brand Performance Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={brandChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="brand" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgCondition" fill="#6366F1" name="Avg Condition %" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Average KM by Brand</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={brandChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="brand" type="category" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="avgKm" fill="#8B5CF6" name="Average KM" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Monthly Tyre Expenditure Trend
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyCostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `LKR ${value.toLocaleString()}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#EC4899" 
                  strokeWidth={3}
                  dot={{ fill: '#EC4899', r: 5 }}
                  name="Monthly Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold">30-Day Forecast</h3>
                <p className="text-sm text-muted-foreground">
                  Predicted replacement needs and budget requirements
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Tyres Needing Replacement</p>
                <p className="text-3xl font-bold text-red-500 mt-1">
                  {tyres?.filter(t => t.condition_percentage < 30).length || 0}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-3xl font-bold text-amber-500 mt-1">
                  LKR {((tyres?.filter(t => t.condition_percentage < 30).length || 0) * 45000).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Rotations Needed</p>
                <p className="text-3xl font-bold text-blue-500 mt-1">
                  {tyres?.filter(t => {
                    const kmSinceRotation = t.current_km - (t.last_rotation_date ? t.km_at_installation : 0);
                    return kmSinceRotation > 20000;
                  }).length || 0}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}