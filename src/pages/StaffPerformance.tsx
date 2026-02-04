import { useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStaffPerformance, StaffMemberPerformance } from "@/hooks/useStaffPerformance";
import { PerformanceInsightsPanel } from "@/components/staff/PerformanceInsightsPanel";
import { StaffPerformanceCharts } from "@/components/staff/StaffPerformanceCharts";
import { CommissionHistory } from "@/components/staff/CommissionHistory";
import { AttendanceCalendar } from "@/components/staff/AttendanceCalendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, Phone, Bus, Star, Eye, Clock, Award, TrendingUp, 
  RefreshCw, Users, DollarSign, AlertTriangle, Filter,
  Calendar, Fuel, Route, MapPin, PhoneCall, FileText
} from "lucide-react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";

export default function StaffPerformance() {
  const { staffPerformance, loading, summary, insights, refetch } = useStaffPerformance();
  const [selectedStaff, setSelectedStaff] = useState<StaffMemberPerformance | null>(null);
  const [staffTypeFilter, setStaffTypeFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch attendance when staff is selected
  const fetchStaffAttendance = async (staffId: string) => {
    setAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .or(`staff_id.eq.${staffId},staff_registry_id.eq.${staffId}`)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      setAttendanceData(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Filter staff based on filters
  const filteredStaff = useMemo(() => {
    return staffPerformance.filter(staff => {
      // Type filter
      if (staffTypeFilter !== "all" && staff.staff_type !== staffTypeFilter) return false;
      
      // Tier filter
      if (tierFilter !== "all" && staff.performanceTier !== tierFilter) return false;
      
      // Search
      if (searchQuery && !staff.staff_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
  }, [staffPerformance, staffTypeFilter, tierFilter, searchQuery]);

  const getStatusColor = (tier: string) => {
    switch (tier) {
      case 'excellent': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'good': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'average': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'needs_improvement': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'average': return 'Average';
      case 'needs_improvement': return 'Needs Improvement';
      default: return tier;
    }
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const handleStaffClick = (staff: StaffMemberPerformance) => {
    setSelectedStaff(staff);
    fetchStaffAttendance(staff.id);
  };

  const columns: ColumnDef<StaffMemberPerformance>[] = [
    {
      accessorKey: "staff_name",
      header: "Staff Member",
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary hover:underline flex items-center gap-2"
              onClick={() => handleStaffClick(row.original)}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <div>{row.getValue("staff_name")}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {row.original.staff_type}
                </div>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div>{row.original.staff_name}</div>
                  <div className="text-sm font-normal text-muted-foreground capitalize">
                    {row.original.staff_type} • {getTierLabel(row.original.performanceTier)}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            <StaffDetailContent 
              staff={row.original} 
              attendance={attendanceData}
              attendanceLoading={attendanceLoading}
            />
          </DialogContent>
        </Dialog>
      ),
    },
    {
      accessorKey: "staff_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.getValue("staff_type") === 'driver' ? 'default' : 'secondary'} className="capitalize">
          {row.getValue("staff_type")}
        </Badge>
      ),
    },
    {
      id: "performance",
      header: "Performance",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  row.original.performanceScore >= 80 ? 'bg-green-500' :
                  row.original.performanceScore >= 60 ? 'bg-blue-500' :
                  row.original.performanceScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${row.original.performanceScore}%` }}
              />
            </div>
            <span className="text-sm font-medium">{row.original.performanceScore}%</span>
          </div>
          <Badge className={`text-xs w-fit ${getStatusColor(row.original.performanceTier)}`}>
            {getTierLabel(row.original.performanceTier)}
          </Badge>
        </div>
      ),
    },
    {
      id: "trips",
      header: "Trips / KM",
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.totalTrips} trips</div>
          <div className="text-muted-foreground">{row.original.totalKm.toLocaleString()} km</div>
        </div>
      ),
    },
    {
      id: "efficiency",
      header: "Fuel Efficiency",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className={`font-medium ${
            row.original.avgFuelEfficiency >= 8 ? 'text-green-600' :
            row.original.avgFuelEfficiency >= 6 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {row.original.avgFuelEfficiency > 0 ? `${row.original.avgFuelEfficiency} km/L` : '-'}
          </span>
        </div>
      ),
    },
    {
      id: "attendance",
      header: "Attendance",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className={`font-medium ${
            row.original.attendanceRate >= 80 ? 'text-green-600' :
            row.original.attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {row.original.attendanceRate}%
          </span>
        </div>
      ),
    },
    {
      id: "commission",
      header: "Commission",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.commissionEarned > 0 ? (
            <span className="font-medium text-green-600">
              LKR {row.original.commissionEarned.toLocaleString()}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      id: "complaints",
      header: "Complaints",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.complaintsCount > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-red-600 font-medium">{row.original.complaintsCount}</span>
            </>
          ) : (
            <span className="text-green-600 text-sm">None</span>
          )}
        </div>
      ),
    },
    {
      id: "rating",
      header: "Rating",
      cell: ({ row }) => getRatingStars(row.original.rating),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Dialog 
          open={openDialogId === row.original.id} 
          onOpenChange={(open) => {
            if (open) {
              setOpenDialogId(row.original.id);
              handleStaffClick(row.original);
            } else {
              setOpenDialogId(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div>{row.original.staff_name}</div>
                  <div className="text-sm font-normal text-muted-foreground capitalize">
                    {row.original.staff_type} • {getTierLabel(row.original.performanceTier)}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            <StaffDetailContent 
              staff={row.original} 
              attendance={attendanceData}
              attendanceLoading={attendanceLoading}
            />
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-primary to-primary-hover p-8 text-accent-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Staff Performance
              </h1>
              <p className="text-accent-foreground/80 text-lg">
                Real-time performance metrics from all modules
              </p>
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={refetch}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl" />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalActiveStaff}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalDrivers} drivers, {summary.totalConductors} conductors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHoursThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total hours worked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              LKR {summary.totalCommissionsEarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgPerformanceScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Across all staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.topPerformersCount}</div>
            <p className="text-xs text-muted-foreground">Scoring 80%+</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complaints</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.complaintsThisMonth > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.complaintsThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Staff Table - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={staffTypeFilter} onValueChange={setStaffTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Staff Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="driver">Drivers</SelectItem>
                    <SelectItem value="conductor">Conductors</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Performance Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="excellent">Excellent (80%+)</SelectItem>
                    <SelectItem value="good">Good (60-79%)</SelectItem>
                    <SelectItem value="average">Average (40-59%)</SelectItem>
                    <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <DataTable
            columns={columns}
            data={filteredStaff}
            searchKey="staff_name"
            title=""
          />
        </div>

        {/* Insights Panel - 1 column */}
        <div>
          <PerformanceInsightsPanel 
            insights={insights}
            onInsightClick={(staffId) => {
              const staff = staffPerformance.find(s => s.id === staffId);
              if (staff) handleStaffClick(staff);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Staff Detail Content Component
function StaffDetailContent({ 
  staff, 
  attendance,
  attendanceLoading 
}: { 
  staff: StaffMemberPerformance;
  attendance: any[];
  attendanceLoading: boolean;
}) {
  return (
    <Tabs defaultValue="overview" className="mt-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="commissions">Commissions</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Trips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staff.totalTrips}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Total KM</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staff.totalKm.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-yellow-500" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Fuel Efficiency</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staff.avgFuelEfficiency} km/L</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">LKR {staff.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact & Identity */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span>{staff.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">NIC:</span>
                  <span>{staff.nic || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Address:</span>
                  <span className="truncate">{staff.address || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Emergency Contact:</span>
                  <span>{staff.emergency_contact || "Not provided"}</span>
                </div>
              </div>
              
              {/* Salary & Financial */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Salary Type:</span>
                  <Badge variant="outline" className="capitalize">{staff.salary_type || '-'}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Daily Rate:</span>
                  <span>{staff.daily_rate ? `LKR ${staff.daily_rate.toLocaleString()}` : '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Monthly Salary:</span>
                  <span>{staff.monthly_salary ? `LKR ${staff.monthly_salary.toLocaleString()}` : '-'}</span>
                </div>
              </div>
            </div>
            
            {/* Notes Section */}
            {staff.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium">Notes:</span>
                    <p className="text-muted-foreground mt-1">{staff.notes}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Timestamps */}
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Member Since:</span>
                <span className="font-medium text-foreground">
                  {staff.created_at ? format(new Date(staff.created_at), 'MMM dd, yyyy') : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last Updated:</span>
                <span className="font-medium text-foreground">
                  {staff.updated_at ? format(new Date(staff.updated_at), 'MMM dd, yyyy') : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="attendance" className="mt-4">
        <AttendanceCalendar 
          attendance={attendance} 
          selectedMonth={new Date()} 
          loading={attendanceLoading}
        />
      </TabsContent>

      <TabsContent value="performance" className="mt-4">
        <StaffPerformanceCharts staffId={staff.id} staffName={staff.staff_name} />
      </TabsContent>

      <TabsContent value="commissions" className="mt-4">
        <CommissionHistory staffId={staff.id} />
      </TabsContent>
    </Tabs>
  );
}
