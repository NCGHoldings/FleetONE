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
import { Wrench, Plus, Clock, CheckCircle, AlertTriangle, Settings, Upload, Timer, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, parseISO, addBusinessDays, isWeekend, addDays } from "date-fns";
import ServiceMasterUpload from "@/components/maintenance/ServiceMasterUpload";
import MaintenanceTimer from "@/components/maintenance/MaintenanceTimer";
import EnhancedMaintenanceTimer from "@/components/maintenance/EnhancedMaintenanceTimer";
import BayManagement from "@/components/maintenance/BayManagement";
import ServiceSuggestions from "@/components/maintenance/ServiceSuggestions";
import ServiceTypesAdmin from "@/components/maintenance/ServiceTypesAdmin";
import FinancialTable from "@/components/maintenance/FinancialTable";

interface MaintenanceRecord {
  id: string;
  bus_id: string;
  maintenance_no: string;
  service_type: string;
  description: string;
  scheduled_date: string;
  start_date?: string;
  completion_date?: string;
  estimated_delivery_date?: string;
  status: string;
  priority: string;
  estimated_cost?: number;
  actual_cost?: number;
  estimated_hours?: number;
  actual_hours?: number;
  parts_total_cost?: number;
  labor_total_cost?: number;
  profit_margin_percent?: number;
  workshop?: string;
  bay_number?: string;
  current_bay_id?: string;
  timer_status?: string;
  timer_started_at?: string;
  next_service_km?: number;
  next_service_date?: string;
  supervisor_id?: string;
  created_by?: string;
  buses?: {
    bus_no: string;
    registration_number: string;
    current_mileage: number;
  };
}

export default function Maintenance() {
  const { hasRole } = useAuth();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [serviceTypes, setServiceTypes] = useState<string[]>(['routine', 'repair', 'inspection', 'emergency', 'preventive']);
  const [selectedBayId, setSelectedBayId] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState({
    bus_id: '',
    service_type: 'routine',
    description: '',
    scheduled_date: '',
    priority: 'medium',
    estimated_cost: '',
    estimated_hours: '',
    estimated_delivery_date: '',
    workshop: '',
    bay_number: '',
    next_service_km: '',
    next_service_date: '',
    parts_total_cost: 0,
    labor_total_cost: 0,
    profit_margin_percent: 20
  });

  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor') || hasRole('mechanic');

  const fetchMaintenanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          buses(bus_no, registration_number, current_mileage)
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
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_master')
        .select('service_type')
        .order('service_type');

      if (error) throw error;
      
      const uniqueTypes = [...new Set(data?.map(item => item.service_type) || [])];
      setServiceTypes(prev => [...new Set([...prev, ...uniqueTypes])]);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  };

  const calculateDeliveryDate = (scheduledDate: string, estimatedHours: number) => {
    if (!scheduledDate || !estimatedHours) return '';

    let currentDate = new Date(scheduledDate);
    let remainingHours = estimatedHours;
    
    const dailyHours = 8; // 8 working hours per day
    const saturdayHours = 4; // 4 hours on Saturday
    
    while (remainingHours > 0) {
      const dayOfWeek = currentDate.getDay();
      
      if (dayOfWeek === 0) { // Sunday - skip
        currentDate = addDays(currentDate, 1);
        continue;
      }
      
      const availableHours = dayOfWeek === 6 ? saturdayHours : dailyHours; // Saturday or weekday
      remainingHours -= availableHours;
      
      if (remainingHours > 0) {
        currentDate = addDays(currentDate, 1);
      }
    }
    
    return currentDate.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!isSupervisor) {
      toast.error('Access denied');
      return;
    }

    try {
      const maintenanceNo = `MNT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const deliveryDate = calculateDeliveryDate(
        formData.scheduled_date, 
        parseFloat(formData.estimated_hours) || 0
      );

      const totalCost = formData.parts_total_cost + formData.labor_total_cost;
      const profitAmount = (totalCost * formData.profit_margin_percent) / 100;
      const finalCost = totalCost + profitAmount;
      
      const { error } = await supabase
        .from('maintenance_records')
        .insert({
          ...formData,
          maintenance_no: maintenanceNo,
          estimated_cost: finalCost || parseFloat(formData.estimated_cost) || null,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          estimated_delivery_date: deliveryDate || formData.estimated_delivery_date,
          next_service_km: formData.next_service_km ? parseInt(formData.next_service_km) : null,
          next_service_date: formData.next_service_date || null,
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
      estimated_delivery_date: '',
      workshop: '',
      bay_number: '',
      next_service_km: '',
      next_service_date: '',
      parts_total_cost: 0,
      labor_total_cost: 0,
      profit_margin_percent: 20
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

  const handleSuggestionApply = (suggestion: any) => {
    setFormData(prev => ({
      ...prev,
      description: suggestion.description,
      estimated_hours: suggestion.estimatedHours.toString(),
      estimated_cost: suggestion.estimatedCost.toString(),
      parts_total_cost: suggestion.parts.reduce((total: number, part: any) => 
        total + (part.quantity * part.unit_cost), 0),
      labor_total_cost: suggestion.estimatedCost - suggestion.parts.reduce((total: number, part: any) => 
        total + (part.quantity * part.unit_cost), 0),
      estimated_delivery_date: calculateDeliveryDate(prev.scheduled_date, suggestion.estimatedHours)
    }));
  };

  const columns: ColumnDef<MaintenanceRecord>[] = [
    {
      accessorKey: "maintenance_no",
      header: "Maintenance #",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="p-0 h-auto font-normal"
          onClick={() => {
            setSelectedRecord(row.original);
            setActiveTab('details');
          }}
        >
          {row.getValue("maintenance_no")}
        </Button>
      ),
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
      accessorKey: "estimated_delivery_date",
      header: "Est. Delivery",
      cell: ({ row }) => {
        const date = row.getValue("estimated_delivery_date") as string;
        return date ? format(parseISO(date), 'MMM dd, yyyy') : '-';
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
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const timerStatus = row.original.timer_status;
        return (
          <div className="space-y-1">
            <Badge variant={getStatusColor(status)}>
              {status.replace('_', ' ')}
            </Badge>
            {timerStatus && timerStatus !== 'stopped' && (
              <Badge variant="outline" className="text-xs">
                <Timer className="h-3 w-3 mr-1" />
                {timerStatus}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "estimated_cost",
      header: "Est. Cost",
      cell: ({ row }) => {
        const cost = row.getValue("estimated_cost") as number;
        return cost ? `₨${cost.toLocaleString()}` : '-';
      },
    },
    {
      accessorKey: "current_bay_id",
      header: "Bay",
      cell: ({ row }) => {
        const bayId = row.original.current_bay_id;
        const bay = bays.find(b => b.id === bayId);
        return bayId ? (
          <Badge variant="secondary">
            <MapPin className="h-3 w-3 mr-1" />
            {bay?.bay_number || 'Unknown'}
          </Badge>
        ) : '-';
      },
    },
    ...(isSupervisor ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-1">
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedRecord(row.original);
              setActiveTab('timer');
            }}
          >
            <Timer className="h-4 w-4" />
          </Button>
        </div>
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
          <p className="text-muted-foreground">Enhanced maintenance with master data, timers, and bay management</p>
        </div>
        
        <div className="flex gap-2">
          {isSupervisor && (
            <>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Schedule Maintenance</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="basic" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="suggestions">Service Suggestions</TabsTrigger>
                      <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
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
                            {serviceTypes.map(type => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </option>
                            ))}
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
                          <Label htmlFor="workshop">Workshop</Label>
                          <Input
                            id="workshop"
                            value={formData.workshop}
                            onChange={(e) => setFormData(prev => ({...prev, workshop: e.target.value}))}
                            placeholder="Main Workshop"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="suggestions">
                      <ServiceSuggestions
                        serviceType={formData.service_type}
                        onSuggestionApply={handleSuggestionApply}
                      />
                    </TabsContent>
                    
                    <TabsContent value="scheduling" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="scheduled_date">Scheduled Date</Label>
                          <Input
                            id="scheduled_date"
                            type="date"
                            value={formData.scheduled_date}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              const estimatedHours = parseFloat(formData.estimated_hours) || 0;
                              const deliveryDate = calculateDeliveryDate(newDate, estimatedHours);
                              setFormData(prev => ({
                                ...prev, 
                                scheduled_date: newDate,
                                estimated_delivery_date: deliveryDate
                              }));
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="estimated_delivery_date">Est. Delivery Date</Label>
                          <Input
                            id="estimated_delivery_date"
                            type="date"
                            value={formData.estimated_delivery_date}
                            onChange={(e) => setFormData(prev => ({...prev, estimated_delivery_date: e.target.value}))}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="estimated_hours">Estimated Hours</Label>
                          <Input
                            id="estimated_hours"
                            type="number"
                            step="0.5"
                            value={formData.estimated_hours}
                            onChange={(e) => {
                              const hours = e.target.value;
                              const deliveryDate = calculateDeliveryDate(formData.scheduled_date, parseFloat(hours) || 0);
                              setFormData(prev => ({
                                ...prev, 
                                estimated_hours: hours,
                                estimated_delivery_date: deliveryDate
                              }));
                            }}
                            placeholder="4"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="estimated_cost">Estimated Cost (₨)</Label>
                          <Input
                            id="estimated_cost"
                            type="number"
                            value={formData.estimated_cost}
                            onChange={(e) => setFormData(prev => ({...prev, estimated_cost: e.target.value}))}
                            placeholder="25000"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="next_service_km">Next Service (KM)</Label>
                          <Input
                            id="next_service_km"
                            type="number"
                            value={formData.next_service_km}
                            onChange={(e) => setFormData(prev => ({...prev, next_service_km: e.target.value}))}
                            placeholder="150000"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="next_service_date">Next Service Date</Label>
                          <Input
                            id="next_service_date"
                            type="date"
                            value={formData.next_service_date}
                            onChange={(e) => setFormData(prev => ({...prev, next_service_date: e.target.value}))}
                          />
                        </div>

                        <div>
                          <Label>Bay Assignment</Label>
                          <BayManagement
                            onBaySelect={setSelectedBayId}
                            selectedBayId={selectedBayId}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSubmit} className="min-w-[120px]">
                      Schedule Maintenance
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={() => setActiveTab('upload')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Master Data
              </Button>
            </>
          )}
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedRecord}>
            {selectedRecord ? 'Details' : 'Select Record'}
          </TabsTrigger>
          <TabsTrigger value="timer" disabled={!selectedRecord}>
            {selectedRecord ? 'Timer' : 'No Timer'}
          </TabsTrigger>
          {isSupervisor && <TabsTrigger value="admin">Admin</TabsTrigger>}
          {isSupervisor && <TabsTrigger value="upload">Master Data</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Maintenance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Records</CardTitle>
              <CardDescription>
                Track all maintenance activities with real-time timers and bay management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={maintenanceRecords} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {selectedRecord && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Maintenance #</Label>
                      <p className="font-medium">{selectedRecord.maintenance_no}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Bus</Label>
                      <p className="font-medium">{selectedRecord.buses?.bus_no}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Service Type</Label>
                      <p className="font-medium capitalize">{selectedRecord.service_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Priority</Label>
                      <Badge variant={getPriorityColor(selectedRecord.priority)}>
                        {selectedRecord.priority}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge variant={getStatusColor(selectedRecord.status)}>
                        {selectedRecord.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Workshop</Label>
                      <p className="font-medium">{selectedRecord.workshop || 'Not assigned'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedRecord.description}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scheduling & Costs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Scheduled Date</Label>
                      <p className="font-medium">
                        {format(parseISO(selectedRecord.scheduled_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Est. Delivery</Label>
                      <p className="font-medium">
                        {selectedRecord.estimated_delivery_date 
                          ? format(parseISO(selectedRecord.estimated_delivery_date), 'MMM dd, yyyy')
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Est. Hours</Label>
                      <p className="font-medium">{selectedRecord.estimated_hours || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Actual Hours</Label>
                      <p className="font-medium">{selectedRecord.actual_hours || 'Not completed'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Est. Cost</Label>
                      <p className="font-medium">
                        {selectedRecord.estimated_cost 
                          ? `₨${selectedRecord.estimated_cost.toLocaleString()}` 
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Actual Cost</Label>
                      <p className="font-medium">
                        {selectedRecord.actual_cost 
                          ? `₨${selectedRecord.actual_cost.toLocaleString()}` 
                          : 'Not completed'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timer" className="space-y-6">
          {selectedRecord && (
            <div className="grid gap-6 lg:grid-cols-2">
              <EnhancedMaintenanceTimer
                maintenanceId={selectedRecord.id}
                serviceType={selectedRecord.service_type}
                bayId={selectedRecord.current_bay_id}
                onTimerUpdate={fetchMaintenanceRecords}
              />
              
              <div>
                <BayManagement
                  onBaySelect={(bayId) => {
                    // Assign selected record to bay
                    // Implementation here would update the maintenance record
                  }}
                  selectedBayId={selectedRecord.current_bay_id}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <div className="grid gap-6">
            <ServiceTypesAdmin />
            <FinancialTable />
          </div>
        </TabsContent>

        {isSupervisor && (
          <TabsContent value="upload" className="space-y-6">
            <ServiceMasterUpload />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}