import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Bus, Star, FileText, Eye, Clock, Award, TrendingUp, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { StaffDetailView } from "@/components/staff/StaffDetailView";

interface StaffMember {
  id: string;
  staff_id: string;
  name: string;
  phone?: string;
  license_number?: string;
  role: 'driver' | 'conductor' | 'both';
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

interface StaffPerformanceData {
  totalKm: number;
  totalTrips: number;
  performanceScore: number;
  complaints: number;
  fuelEfficiency: number;
  rating: number;
}

export default function StaffPerformance() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [performanceData, setPerformanceData] = useState<Record<string, StaffPerformanceData>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_number: '',
    role: 'driver' as 'driver' | 'conductor' | 'both',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, []);

  // Create staff table if it doesn't exist and populate with existing data
  const initializeStaffTable = async () => {
    try {
      // First try to create the staff_performance table if it doesn't exist
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS staff_performance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            staff_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            license_number TEXT,
            role TEXT CHECK (role IN ('driver', 'conductor', 'both')) DEFAULT 'driver',
            status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE staff_performance ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "All authenticated users can view staff performance" ON staff_performance;
          DROP POLICY IF EXISTS "Supervisors can manage staff performance" ON staff_performance;
          CREATE POLICY "All authenticated users can view staff performance" ON staff_performance FOR SELECT USING (auth.role() = 'authenticated'::text);
          CREATE POLICY "Supervisors can manage staff performance" ON staff_performance FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
        `
      });

      if (createError) {
        console.log('Table might already exist:', createError);
      }
    } catch (error) {
      console.error('Error initializing staff table:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      await initializeStaffTable();
      
      // Try to fetch from staff_performance table first
      const { data: existingStaff, error: staffError } = await supabase
        .from('staff_performance')
        .select('*')
        .order('name');

      if (staffError && !staffError.message.includes('does not exist')) {
        throw staffError;
      }

      // If no staff exist, extract from allocation and trips data
      if (!existingStaff || existingStaff.length === 0) {
        await extractStaffFromTripsData();
        return;
      }
      
      const staffData = existingStaff || [];
      setStaff(staffData);
      
      // Fetch performance data for each staff member  
      const performancePromises = staffData.map(async (member) => {
        const performance = await fetchStaffPerformance(member.staff_id);
        return { id: member.staff_id, performance };
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

  const extractStaffFromTripsData = async () => {
    try {
      // Get all driver allocations
      const { data: allocations } = await supabase
        .from('driver_allocations')
        .select('*');

      // Get all daily trips
      const { data: trips } = await supabase
        .from('daily_trips')
        .select('*');

      // Get profile data for name resolution
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone, license_number');

      const staffMap = new Map<string, { name: string; phone?: string; license?: string; roles: Set<string> }>();

      // Process allocations
      allocations?.forEach(allocation => {
        const notes = allocation.notes ? (typeof allocation.notes === 'string' ? JSON.parse(allocation.notes) : allocation.notes) : {};
        
        if (allocation.driver_id) {
          const profile = profiles?.find(p => p.user_id === allocation.driver_id);
          const name = notes.driver || (profile ? `${profile.first_name} ${profile.last_name}` : `Driver-${allocation.driver_id.slice(0, 8)}`);
          
          if (!staffMap.has(allocation.driver_id)) {
            staffMap.set(allocation.driver_id, {
              name,
              phone: notes.whatsapp || profile?.phone,
              license: profile?.license_number,
              roles: new Set(['driver'])
            });
          } else {
            staffMap.get(allocation.driver_id)!.roles.add('driver');
          }
        }

        if (allocation.conductor_id) {
          const profile = profiles?.find(p => p.user_id === allocation.conductor_id);
          const name = notes.conductor || (profile ? `${profile.first_name} ${profile.last_name}` : `Conductor-${allocation.conductor_id.slice(0, 8)}`);
          
          if (!staffMap.has(allocation.conductor_id)) {
            staffMap.set(allocation.conductor_id, {
              name,
              phone: profile?.phone,
              license: profile?.license_number,
              roles: new Set(['conductor'])
            });
          } else {
            staffMap.get(allocation.conductor_id)!.roles.add('conductor');
          }
        }
      });

      // Process trips (in case there are trips without allocations)
      trips?.forEach(trip => {
        if (trip.driver_id) {
          const profile = profiles?.find(p => p.user_id === trip.driver_id);
          const name = profile ? `${profile.first_name} ${profile.last_name}` : `Driver-${trip.driver_id.slice(0, 8)}`;
          
          if (!staffMap.has(trip.driver_id)) {
            staffMap.set(trip.driver_id, {
              name,
              phone: profile?.phone,
              license: profile?.license_number,
              roles: new Set(['driver'])
            });
          } else {
            staffMap.get(trip.driver_id)!.roles.add('driver');
          }
        }

        if (trip.conductor_id) {
          const profile = profiles?.find(p => p.user_id === trip.conductor_id);
          const name = profile ? `${profile.first_name} ${profile.last_name}` : `Conductor-${trip.conductor_id.slice(0, 8)}`;
          
          if (!staffMap.has(trip.conductor_id)) {
            staffMap.set(trip.conductor_id, {
              name,
              phone: profile?.phone,
              license: profile?.license_number,
              roles: new Set(['conductor'])
            });
          } else {
            staffMap.get(trip.conductor_id)!.roles.add('conductor');
          }
        }
      });

      // Convert to staff members with EMP001 format IDs
      const staffMembers: Omit<StaffMember, 'id'>[] = [];
      let empCounter = 1;

      staffMap.forEach((data, userId) => {
        const roleArray = Array.from(data.roles);
        const role = roleArray.length > 1 ? 'both' : roleArray[0] as 'driver' | 'conductor';
        
        staffMembers.push({
          staff_id: `EMP${empCounter.toString().padStart(3, '0')}`,
          name: data.name,
          phone: data.phone,
          license_number: data.license,
          role,
          status: 'active'
        });
        empCounter++;
      });

      if (staffMembers.length > 0) {
        // Insert into staff_performance table
        const { data: insertedStaff, error: insertError } = await supabase
          .from('staff_performance')
          .insert(staffMembers)
          .select();

        if (insertError) throw insertError;

        setStaff(insertedStaff || []);
        
        // Fetch performance data
        const performancePromises = (insertedStaff || []).map(async (member) => {
          const performance = await fetchStaffPerformance(member.staff_id);
          return { id: member.staff_id, performance };
        });
        
        const performances = await Promise.all(performancePromises);
        const performanceMap = performances.reduce((acc, { id, performance }) => {
          acc[id] = performance;
          return acc;
        }, {} as Record<string, StaffPerformanceData>);
        
        setPerformanceData(performanceMap);
      }
    } catch (error) {
      console.error('Error extracting staff from trips data:', error);
      toast({
        title: "Error",
        description: "Failed to extract staff data from trips",
        variant: "destructive",
      });
    }
  };

  const fetchStaffPerformance = async (staffId: string): Promise<StaffPerformanceData> => {
    try {
      // Find staff member by staff_id to get their original data sources
      const { data: staffMember } = await supabase
        .from('staff_performance')
        .select('name')
        .eq('staff_id', staffId)
        .single();

      if (!staffMember) {
        return { totalKm: 0, totalTrips: 0, performanceScore: 0, complaints: 0, fuelEfficiency: 0, rating: 0 };
      }

      // Search for trips by staff name in allocation notes and trip data
      const { data: allocations } = await supabase
        .from('driver_allocations')
        .select('*');

      const { data: trips } = await supabase
        .from('daily_trips')
        .select('*');

      // Find trips related to this staff member by matching names
      const relatedTripIds = new Set<string>();
      
      allocations?.forEach(allocation => {
        const notes = allocation.notes ? (typeof allocation.notes === 'string' ? JSON.parse(allocation.notes) : allocation.notes) : {};
        if (notes.driver === staffMember.name || notes.conductor === staffMember.name) {
          relatedTripIds.add(allocation.trip_id);
        }
      });

      const relatedTrips = trips?.filter(trip => 
        relatedTripIds.has(trip.trip_no) || 
        trip.trip_no?.includes(staffId)
      ) || [];

      // Fetch complaints by searching for staff name
      const { data: complaints } = await supabase
        .from('feedback_complaints')
        .select('*')
        .ilike('description', `%${staffMember.name}%`);

      const totalKm = relatedTrips.reduce((sum, trip) => sum + (trip.distance_km || 0), 0);
      const totalTrips = relatedTrips.length;
      
      // Calculate fuel efficiency (average km per liter)
      const fuelEfficiencyTrips = relatedTrips.filter(trip => trip.km_per_liter && trip.km_per_liter > 0);
      const avgFuelEfficiency = fuelEfficiencyTrips.length > 0 
        ? fuelEfficiencyTrips.reduce((sum, trip) => sum + trip.km_per_liter, 0) / fuelEfficiencyTrips.length 
        : 0;

      // Calculate performance score based on fuel efficiency and complaints
      let performanceScore = 0;
      if (avgFuelEfficiency > 0) {
        // Assume expected efficiency is 8 km/l, scale accordingly
        const efficiencyScore = Math.min(100, (avgFuelEfficiency / 8) * 100);
        const complaintPenalty = Math.min(30, complaints?.length * 10); // -10 points per complaint, max -30
        performanceScore = Math.max(0, efficiencyScore - complaintPenalty);
      }

      // Calculate rating based on performance score
      const rating = performanceScore > 0 ? (performanceScore / 100) * 5 : 0;
      
      return {
        totalKm,
        totalTrips,
        performanceScore: Math.round(performanceScore * 10) / 10,
        complaints: complaints?.length || 0,
        fuelEfficiency: Math.round(avgFuelEfficiency * 10) / 10,
        rating: Math.round(rating * 10) / 10
      };
    } catch (error) {
      console.error('Error fetching staff performance:', error);
      return {
        totalKm: 0,
        totalTrips: 0,
        performanceScore: 0,
        complaints: 0,
        fuelEfficiency: 0,
        rating: 0
      };
    }
  };

  const handleAddStaff = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter staff name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate next staff ID
      const { data: lastStaff } = await supabase
        .from('staff_performance')
        .select('staff_id')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (lastStaff && lastStaff.length > 0) {
        const lastId = lastStaff[0].staff_id;
        const match = lastId.match(/EMP(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const newStaffId = `EMP${nextNumber.toString().padStart(3, '0')}`;

      const { data: newStaff, error } = await supabase
        .from('staff_performance')
        .insert([{
          staff_id: newStaffId,
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          license_number: formData.license_number.trim() || null,
          role: formData.role,
          status: formData.status
        }])
        .select()
        .single();

      if (error) throw error;

      setStaff([...staff, newStaff]);
      setShowAddForm(false);
      setFormData({ name: '', phone: '', license_number: '', role: 'driver', status: 'active' });
      
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
    } catch (error) {
      console.error('Error adding staff:', error);
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStaff = async (staffMember: StaffMember) => {
    try {
      const { error } = await supabase
        .from('staff_performance')
        .update({
          name: staffMember.name,
          phone: staffMember.phone,
          license_number: staffMember.license_number,
          role: staffMember.role,
          status: staffMember.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffMember.id);

      if (error) throw error;

      setStaff(staff.map(s => s.id === staffMember.id ? { ...s, ...staffMember } : s));
      setEditingStaff(null);
      
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
    } catch (error) {
      console.error('Error updating staff:', error);
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const { error } = await supabase
        .from('staff_performance')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      setStaff(staff.filter(s => s.id !== staffId));
      
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
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
      accessorKey: "staff_id",
      header: "Staff ID",
      cell: ({ row }) => (
        <div className="font-medium font-mono">{row.getValue("staff_id")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        editingStaff?.id === row.original.id ? (
          <Input
            value={editingStaff.name}
            onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
            className="w-full"
          />
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="link"
                className="p-0 h-auto font-medium text-primary hover:underline"
                onClick={() => setSelectedStaff(row.original)}
              >
                {row.getValue("name")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <StaffDetailView 
                staff={row.original} 
                performanceData={performanceData[row.original.staff_id]} 
              />
            </DialogContent>
          </Dialog>
        )
      ),
    },
    {
      accessorKey: "license_number",
      header: "License No.",
      cell: ({ row }) => (
        editingStaff?.id === row.original.id ? (
          <Input
            value={editingStaff.license_number || ''}
            onChange={(e) => setEditingStaff({ ...editingStaff, license_number: e.target.value })}
            placeholder="License number"
            className="w-full"
          />
        ) : (
          <div className="text-sm">{row.getValue("license_number") || "N/A"}</div>
        )
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        editingStaff?.id === row.original.id ? (
          <Input
            value={editingStaff.phone || ''}
            onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
            placeholder="Phone number"
            className="w-full"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {row.getValue("phone") || "N/A"}
          </div>
        )
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        editingStaff?.id === row.original.id ? (
          <Select value={editingStaff.role} onValueChange={(value) => setEditingStaff({ ...editingStaff, role: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="conductor">Conductor</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="capitalize">
            {row.getValue("role")}
          </Badge>
        )
      ),
    },
    {
      id: "performance",
      header: "Performance",
      cell: ({ row }) => {
        const perf = performanceData[row.original.staff_id];
        return (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">{perf?.performanceScore?.toFixed(1) || "0.0"}%</span>
            {perf?.fuelEfficiency > 0 && (
              <div className="text-xs text-muted-foreground">
                ({perf.fuelEfficiency} km/L)
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "totalKm",
      header: "Total KM",
      cell: ({ row }) => {
        const perf = performanceData[row.original.staff_id];
        return (
          <div className="text-sm font-medium">
            {perf?.totalKm?.toLocaleString() || "0"} km
            {perf?.totalTrips > 0 && (
              <div className="text-xs text-muted-foreground">
                {perf.totalTrips} trips
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const perf = performanceData[row.original.staff_id];
        return getRatingStars(perf?.rating || 0);
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        editingStaff?.id === row.original.id ? (
          <Select value={editingStaff.status} onValueChange={(value) => setEditingStaff({ ...editingStaff, status: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge className={getStatusColor(row.getValue("status"))}>
            {row.getValue("status")}
          </Badge>
        )
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {editingStaff?.id === row.original.id ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleUpdateStaff(editingStaff)}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingStaff(null)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <StaffDetailView 
                    staff={row.original} 
                    performanceData={performanceData[row.original.staff_id]} 
                  />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={() => setEditingStaff(row.original)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteStaff(row.original.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <DocumentUpload
                linkedTable="staff_performance"
                linkedRowId={row.original.id}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-primary to-primary-hover p-8 text-accent-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <User className="w-10 h-10 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                Staff Performance
              </h1>
              <p className="text-accent-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                Monitor and evaluate staff performance metrics
              </p>
            </div>
          </div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Drivers</CardTitle>
            <Bus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter(s => s.role === 'driver' || s.role === 'both').length}
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
                   Object.values(performanceData).length).toFixed(1) + '%'
                : "0.0%"}
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
              {Object.values(performanceData).filter(p => p.performanceScore >= 80).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Staff Members</h2>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={staff}
        searchKey="name"
        title=""
      />

      {/* Add Staff Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter staff name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="license">License Number</Label>
              <Input
                id="license"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="Enter license number"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="conductor">Conductor</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStaff}>
                Add Staff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}