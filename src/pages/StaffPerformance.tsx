import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Bus, Star, FileText, Eye, Clock, Award, TrendingUp } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { StaffDetailView } from "@/components/staff/StaffDetailView";

interface StaffMember {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
  hire_date?: string;
  status: string;
  date_of_birth?: string;
  address?: string;
  nic?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

interface StaffPerformanceData {
  totalKm: number;
  totalTrips: number;
  performanceScore: number;
  complaints: number;
  onTimePercentage: number;
  rating: number;
}

export default function StaffPerformance() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [performanceData, setPerformanceData] = useState<Record<string, StaffPerformanceData>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (error) throw error;
      
      const staffData = data || [];
      setStaff(staffData);
      
      // Fetch performance data for each staff member
      const performancePromises = staffData.map(async (member) => {
        const performance = await fetchStaffPerformance(member.user_id);
        return { id: member.user_id, performance };
      });
      
      const performances = await Promise.all(performancePromises);
      const performanceMap = performances.reduce((acc, { id, performance }) => {
        acc[id] = performance;
        return acc;
      }, {} as Record<string, StaffPerformanceData>);
      
      setPerformanceData(performanceMap);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch staff data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffPerformance = async (userId: string): Promise<StaffPerformanceData> => {
    try {
      // Fetch trip data for driver/conductor
      const { data: trips } = await supabase
        .from('daily_trips')
        .select('*')
        .or(`driver_id.eq.${userId},conductor_id.eq.${userId}`);

      // Fetch complaints
      const { data: complaints } = await supabase
        .from('feedback_complaints')
        .select('id')
        .eq('staff_group', userId);

      const totalKm = trips?.reduce((sum, trip) => sum + (trip.distance_km || 0), 0) || 0;
      const totalTrips = trips?.length || 0;
      const performanceScore = trips?.reduce((sum, trip) => sum + (trip.performance_score || 0), 0) / (totalTrips || 1) || 0;
      const complaintsCount = complaints?.length || 0;
      
      return {
        totalKm,
        totalTrips,
        performanceScore: Math.round(performanceScore * 10) / 10,
        complaints: complaintsCount,
        onTimePercentage: 85 + Math.random() * 10, // Mock data
        rating: 3.5 + Math.random() * 1.5 // Mock rating
      };
    } catch (error) {
      return {
        totalKm: 0,
        totalTrips: 0,
        performanceScore: 0,
        complaints: 0,
        onTimePercentage: 0,
        rating: 0
      };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-success text-success-foreground';
      case 'inactive': return 'bg-secondary text-secondary-foreground';
      case 'suspended': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  const columns: ColumnDef<StaffMember>[] = [
    {
      accessorKey: "employee_id",
      header: "Staff ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("employee_id")}</div>
      ),
    },
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary hover:underline"
              onClick={() => setSelectedStaff(row.original)}
            >
              {row.original.first_name} {row.original.last_name}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <StaffDetailView 
              staff={row.original} 
              performanceData={performanceData[row.original.user_id]} 
            />
          </DialogContent>
        </Dialog>
      ),
    },
    {
      accessorKey: "license_number",
      header: "License No.",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("license_number") || "N/A"}</div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          {row.getValue("phone") || "N/A"}
        </div>
      ),
    },
    {
      id: "performance",
      header: "Performance",
      cell: ({ row }) => {
        const perf = performanceData[row.original.user_id];
        return (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            {perf?.performanceScore?.toFixed(1) || "0.0"}
          </div>
        );
      },
    },
    {
      id: "totalKm",
      header: "Total KM",
      cell: ({ row }) => {
        const perf = performanceData[row.original.user_id];
        return (
          <div className="text-sm font-medium">
            {perf?.totalKm?.toLocaleString() || "0"} km
          </div>
        );
      },
    },
    {
      id: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const perf = performanceData[row.original.user_id];
        return getRatingStars(perf?.rating || 0);
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.getValue("status"))}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
                View Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <StaffDetailView 
                staff={row.original} 
                performanceData={performanceData[row.original.user_id]} 
              />
            </DialogContent>
          </Dialog>
          <DocumentUpload
            linkedTable="profiles"
            linkedRowId={row.original.id}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Performance</h1>
          <p className="text-muted-foreground">
            Monitor and evaluate staff performance metrics
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <User className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter(s => s.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Award className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(performanceData).length > 0
                ? (Object.values(performanceData).reduce((sum, p) => sum + p.performanceScore, 0) / 
                   Object.values(performanceData).length).toFixed(1)
                : "0.0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(performanceData).filter(p => p.performanceScore > 8).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={staff}
        searchKey="first_name"
        title="Staff Members"
      />
    </div>
  );
}