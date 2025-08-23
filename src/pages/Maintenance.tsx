import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Wrench, Plus, Clock, CheckCircle, AlertTriangle, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, parseISO } from "date-fns";

interface MaintenanceRecord {
  id: string;
  bus_id: string;
  maintenance_no: string;
  service_type: string;
  description: string;
  scheduled_date: string;
  start_date?: string;
  completion_date?: string;
  status: string;
  priority: string;
  estimated_cost?: number;
  actual_cost?: number;
  estimated_hours?: number;
  actual_hours?: number;
  workshop?: string;
  bay_number?: string;
  supervisor_id?: string;
  created_by?: string;
  buses?: {
    bus_no: string;
    registration_number: string;
  };
}

export default function Maintenance() {
  const { hasRole } = useAuth();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    bus_id: '',
    service_type: 'routine',
    description: '',
    scheduled_date: '',
    priority: 'medium',
    estimated_cost: '',
    estimated_hours: '',
    workshop: '',
    bay_number: ''
  });

  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor') || hasRole('mechanic');

  const fetchMaintenanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          buses(bus_no, registration_number)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setMaintenanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to load maintenance records');
    }
  };

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_no, registration_number, current_mileage')
        .eq('status', 'active')
        .order('bus_no');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchBays = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_bays')
        .select('id, bay_name, bay_number')
        .eq('is_active', true)
        .order('bay_number');

      if (error) throw error;
      setBays(data || []);
    } catch (error) {
      console.error('Error fetching bays:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceRecords();
    fetchBuses();
    fetchBays();
  }, []);

  const handleSubmit = async () => {
    if (!isSupervisor) {
      toast.error('Access denied');
      return;
    }

    try {
      const maintenanceNo = `MNT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const { error } = await supabase
        .from('maintenance_records')
        .insert({
          ...formData,
          maintenance_no: maintenanceNo,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Maintenance record created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchMaintenanceRecords();
    } catch (error: any) {
      console.error('Error creating maintenance record:', error);
      toast.error(error.message || 'Failed to create maintenance record');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (!isSupervisor) {
      toast.error('Access denied');
      return;
    }

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'in_progress' && !maintenanceRecords.find(r => r.id === id)?.start_date) {
        updateData.start_date = new Date().toISOString().split('T')[0];
      }
      
      if (newStatus === 'completed') {
        updateData.completion_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('maintenance_records')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated successfully');
      fetchMaintenanceRecords();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      bus_id: '',
      service_type: 'routine',
      description: '',
      scheduled_date: '',
      priority: 'medium',
      estimated_cost: '',
      estimated_hours: '',
      workshop: '',
      bay_number: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const columns: ColumnDef<MaintenanceRecord>[] = [
    {
      accessorKey: "maintenance_no",
      header: "Maintenance #",
    },
    {
      accessorKey: "buses.bus_no",
      header: "Bus No",
    },
    {
      accessorKey: "service_type",
      header: "Service Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue("service_type")}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "scheduled_date",
      header: "Scheduled Date",
      cell: ({ row }) => {
        const date = row.getValue("scheduled_date") as string;
        return format(parseISO(date), 'MMM dd, yyyy');
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge variant={getPriorityColor(row.getValue("priority"))}>
          {row.getValue("priority")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusColor(row.getValue("status"))}>
          {String(row.getValue("status")).replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: "estimated_cost",
      header: "Est. Cost",
      cell: ({ row }) => {
        const cost = row.getValue("estimated_cost") as number;
        return cost ? `LKR ${cost.toLocaleString()}` : '-';
      },
    },
    ...(isSupervisor ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <Select onValueChange={(value) => updateStatus(row.original.id, value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Update Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    }] : []),
  ];

  const totalRecords = maintenanceRecords.length;
  const pendingRecords = maintenanceRecords.filter(r => r.status === 'pending').length;
  const inProgressRecords = maintenanceRecords.filter(r => r.status === 'in_progress').length;
  const completedRecords = maintenanceRecords.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Management</h1>
          <p className="text-muted-foreground">Track and manage vehicle maintenance schedules</p>
        </div>
        
        {isSupervisor && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Maintenance</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bus_id">Bus</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.bus_id}
                    onChange={(e) => setFormData(prev => ({...prev, bus_id: e.target.value}))}
                  >
                    <option value="">Select Bus</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id}>
                        {bus.bus_no} - {bus.registration_number} ({bus.current_mileage} km)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="service_type">Service Type</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.service_type}
                    onChange={(e) => setFormData(prev => ({...prev, service_type: e.target.value}))}
                  >
                    <option value="routine">Routine Service</option>
                    <option value="repair">Repair</option>
                    <option value="inspection">Inspection</option>
                    <option value="emergency">Emergency</option>
                    <option value="preventive">Preventive</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    placeholder="Describe the maintenance work needed..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData(prev => ({...prev, scheduled_date: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="estimated_cost">Estimated Cost (LKR)</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData(prev => ({...prev, estimated_cost: e.target.value}))}
                    placeholder="25000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="estimated_hours">Estimated Hours</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData(prev => ({...prev, estimated_hours: e.target.value}))}
                    placeholder="4"
                  />
                </div>
                
                <div>
                  <Label htmlFor="workshop">Workshop</Label>
                  <Input
                    id="workshop"
                    value={formData.workshop}
                    onChange={(e) => setFormData(prev => ({...prev, workshop: e.target.value}))}
                    placeholder="Main Workshop"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bay_number">Bay Number</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.bay_number}
                    onChange={(e) => setFormData(prev => ({...prev, bay_number: e.target.value}))}
                  >
                    <option value="">Select Bay</option>
                    {bays.map(bay => (
                      <option key={bay.id} value={bay.bay_number}>
                        Bay {bay.bay_number} - {bay.bay_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <Button onClick={handleSubmit} className="w-full">
                    Schedule Maintenance
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Records"
          value={totalRecords.toString()}
          icon={<Wrench className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
        <KPICard
          title="Pending"
          value={pendingRecords.toString()}
          icon={<Clock className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="awaiting start"
        />
        <KPICard
          title="In Progress"
          value={inProgressRecords.toString()}
          icon={<Settings className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="active work"
        />
        <KPICard
          title="Completed"
          value={completedRecords.toString()}
          icon={<CheckCircle className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
      </div>

      {/* Maintenance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Records</CardTitle>
          <CardDescription>
            Track all maintenance activities and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={maintenanceRecords} />
        </CardContent>
      </Card>
    </div>
  );
}