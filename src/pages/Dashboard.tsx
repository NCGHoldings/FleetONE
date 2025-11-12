import { useState, useEffect } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bus, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Wrench,
  AlertTriangle,
  Activity,
  BarChart3,
  Upload,
  Clock
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [pendingConductorSubmissions, setPendingConductorSubmissions] = useState(0);
  const [pendingLateRequests, setPendingLateRequests] = useState(0);

  useEffect(() => {
    loadPendingCounts();
  }, []);

  const loadPendingCounts = async () => {
    // Load pending conductor submissions
    const { count: conductorCount } = await supabase
      .from('conductor_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setPendingConductorSubmissions(conductorCount || 0);

    // Load pending late entry requests
    const { count: lateCount } = await supabase
      .from('late_entry_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setPendingLateRequests(lateCount || 0);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-accent p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm animate-pulse-subtle">
                <BarChart3 className="w-8 h-8 animate-bounce-subtle" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                  Transport Dashboard
                </h1>
                <p className="text-primary-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                  Real-time insights into your fleet operations
                </p>
              </div>
            </div>
          </div>
          <div className="text-right animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-primary-foreground/70">System Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-lg font-semibold">All Systems Online</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced KPI Cards with Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Total Revenue"
              value="₨ 2.4M"
              change="+12.5%"
              changeType="positive"
              icon={<DollarSign className="w-6 h-6 group-hover:animate-bounce-notification" />}
              description="This month vs last month"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Active Buses"
              value="45"
              change="+2"
              changeType="positive"
              icon={<Bus className="w-6 h-6 group-hover:animate-wiggle" />}
              description="Currently on routes"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Daily Trips"
              value="238"
              change="-3.2%"
              changeType="negative"
              icon={<Calendar className="w-6 h-6 group-hover:animate-pulse-subtle" />}
              description="Completed today"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Staff"
              value="156"
              change="+5"
              changeType="positive"
              icon={<Users className="w-6 h-6 group-hover:animate-bounce-subtle" />}
              description="Total active staff"
            />
          </div>
        </div>
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

      {/* Data Entry Control Row */}
      {(pendingConductorSubmissions > 0 || pendingLateRequests > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingConductorSubmissions > 0 && (
            <Card className="card-elevated border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-warning" />
                    Conductor Submissions
                  </div>
                  <Badge variant="default" className="bg-warning">
                    {pendingConductorSubmissions} Pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {pendingConductorSubmissions} conductor trip sheet{pendingConductorSubmissions !== 1 ? 's' : ''} awaiting review
                </p>
                <Button onClick={() => navigate('/trips/conductor-submissions')} className="w-full">
                  Review Submissions
                </Button>
              </CardContent>
            </Card>
          )}

          {pendingLateRequests > 0 && (
            <Card className="card-elevated border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-destructive" />
                    Late Entry Requests
                  </div>
                  <Badge variant="destructive">
                    {pendingLateRequests} Pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {pendingLateRequests} late entry request{pendingLateRequests !== 1 ? 's' : ''} awaiting approval
                </p>
                <Button onClick={() => navigate('/trips/late-entry-requests')} className="w-full" variant="destructive">
                  Review Requests
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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