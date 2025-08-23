import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bus, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Wrench,
  AlertTriangle,
  Activity
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

// Mock data for demonstration
const revenueData = [
  { month: 'Jan', revenue: 65000, expenses: 35000 },
  { month: 'Feb', revenue: 72000, expenses: 38000 },
  { month: 'Mar', revenue: 68000, expenses: 36000 },
  { month: 'Apr', revenue: 78000, expenses: 42000 },
  { month: 'May', revenue: 85000, expenses: 45000 },
  { month: 'Jun', revenue: 92000, expenses: 48000 },
];

const fleetUtilization = [
  { name: 'Active', value: 45, color: 'hsl(var(--success))' },
  { name: 'Maintenance', value: 8, color: 'hsl(var(--warning))' },
  { name: 'Idle', value: 12, color: 'hsl(var(--muted))' },
];

const recentAlerts = [
  { id: 1, message: "Bus NK-2847 insurance expires in 5 days", type: "warning", time: "2 hours ago" },
  { id: 2, message: "Maintenance due for Bus NK-1234", type: "info", time: "4 hours ago" },
  { id: 3, message: "Route permit for Colombo-Kandy expires soon", type: "warning", time: "1 day ago" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your transport operations.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Last updated</p>
          <p className="text-lg font-semibold">Just now</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value="₨ 2.4M"
          change="+12.5%"
          changeType="positive"
          icon={<DollarSign className="w-6 h-6" />}
          description="This month vs last month"
        />
        <KPICard
          title="Active Buses"
          value="45"
          change="+2"
          changeType="positive"
          icon={<Bus className="w-6 h-6" />}
          description="Currently on routes"
        />
        <KPICard
          title="Daily Trips"
          value="238"
          change="-3.2%"
          changeType="negative"
          icon={<Calendar className="w-6 h-6" />}
          description="Completed today"
        />
        <KPICard
          title="Staff"
          value="156"
          change="+5"
          changeType="positive"
          icon={<Users className="w-6 h-6" />}
          description="Total active staff"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Revenue vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                <Bar dataKey="expenses" fill="hsl(var(--muted))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fleet Utilization */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Fleet Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fleetUtilization}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {fleetUtilization.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {fleetUtilization.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === 'warning' ? 'bg-warning' : 
                    alert.type === 'info' ? 'bg-primary' : 'bg-destructive'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Fuel Efficiency</span>
              <span className="font-semibold">12.5 km/L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">On-time Performance</span>
              <span className="font-semibold text-success">94.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Maintenance Due</span>
              <span className="font-semibold text-warning">8 buses</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Customer Rating</span>
              <span className="font-semibold">4.7/5</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}