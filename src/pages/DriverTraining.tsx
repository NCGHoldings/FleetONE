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
import { 
  GraduationCap, Plus, Clock, CheckCircle, XCircle, 
  Calendar, Users, BookOpen, Settings, Eye, Upload
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, parseISO } from "date-fns";

interface DriverTraining {
  id: string;
  training_id: string;
  driver_id: string;
  driver_name: string;
  training_type: string;
  training_date: string;
  duration?: number;
  instructor_name?: string;
  instructor_phone?: string;
  instructor_email?: string;
  status: string;
  notes?: string;
  documents?: any[];
  created_at: string;
  updated_at: string;
}

export default function DriverTraining() {
  const { hasRole } = useAuth();
  const [trainings, setTrainings] = useState<DriverTraining[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<DriverTraining | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    driver_id: '',
    driver_name: '',
    training_type: 'defensive_driving',
    training_date: '',
    duration: '',
    instructor_name: '',
    instructor_phone: '',
    instructor_email: '',
    status: 'scheduled',
    notes: ''
  });

  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_training')
        .select('*')
        .order('training_date', { ascending: false });

      if (error) throw error;
      setTrainings((data as any) || []);
    } catch (error) {
      console.error('Error fetching trainings:', error);
      toast.error('Failed to load training records');
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, employee_id')
        .order('first_name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
    fetchDrivers();
  }, []);

  const generateTrainingId = () => {
    const year = new Date().getFullYear();
    const lastTraining = trainings.find(t => t.training_id.startsWith(`TRN-${year}`));
    
    if (!lastTraining) {
      return `TRN-${year}-001`;
    }
    
    const lastNumber = parseInt(lastTraining.training_id.split('-')[2]) + 1;
    return `TRN-${year}-${String(lastNumber).padStart(3, '0')}`;
  };

  const handleSubmit = async () => {
    if (!isSupervisor) {
      toast.error('Access denied');
      return;
    }

    try {
      const trainingId = editingTraining ? editingTraining.training_id : generateTrainingId();
      
      const trainingData = {
        ...formData,
        training_id: trainingId,
        duration: formData.duration ? parseFloat(formData.duration) : null
      };

      if (editingTraining) {
        const { error } = await supabase
          .from('driver_training')
          .update(trainingData)
          .eq('id', editingTraining.id);

        if (error) throw error;
        toast.success('Training record updated successfully');
      } else {
        const { error } = await supabase
          .from('driver_training')
          .insert(trainingData);

        if (error) throw error;
        toast.success('Training record created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTrainings();
    } catch (error: any) {
      console.error('Error saving training:', error);
      toast.error(error.message || 'Failed to save training record');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (!isSupervisor) {
      toast.error('Access denied');
      return;
    }

    try {
      const { error } = await supabase
        .from('driver_training')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated successfully');
      fetchTrainings();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      driver_id: '',
      driver_name: '',
      training_type: 'defensive_driving',
      training_date: '',
      duration: '',
      instructor_name: '',
      instructor_phone: '',
      instructor_email: '',
      status: 'scheduled',
      notes: ''
    });
    setEditingTraining(null);
  };

  const handleEdit = (training: DriverTraining) => {
    if (!isSupervisor) {
      toast.error('Access denied');
      return;
    }
    
    setFormData({
      driver_id: training.driver_id || '',
      driver_name: training.driver_name || '',
      training_type: training.training_type || 'defensive_driving',
      training_date: training.training_date || '',
      duration: training.duration?.toString() || '',
      instructor_name: training.instructor_name || '',
      instructor_phone: training.instructor_phone || '',
      instructor_email: training.instructor_email || '',
      status: training.status || 'scheduled',
      notes: training.notes || ''
    });
    setEditingTraining(training);
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'scheduled': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getTrainingTypeDisplay = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const columns: ColumnDef<DriverTraining>[] = [
    {
      accessorKey: "training_id",
      header: "Training ID",
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
    },
    {
      accessorKey: "training_type",
      header: "Training Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {getTrainingTypeDisplay(row.getValue("training_type"))}
        </Badge>
      ),
    },
    {
      accessorKey: "training_date",
      header: "Date",
      cell: ({ row }) => {
        const date = row.getValue("training_date") as string;
        return format(parseISO(date), 'MMM dd, yyyy');
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.getValue("duration") as number;
        return duration ? `${duration} hours` : '-';
      },
    },
    {
      accessorKey: "instructor_name",
      header: "Instructor",
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
    ...(isSupervisor ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row.original)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Select onValueChange={(value) => updateStatus(row.original.id, value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      ),
    }] : []),
  ];

  const totalTrainings = trainings.length;
  const scheduledTrainings = trainings.filter(t => t.status === 'scheduled').length;
  const inProgressTrainings = trainings.filter(t => t.status === 'in_progress').length;
  const completedTrainings = trainings.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Driver Training</h1>
          <p className="text-muted-foreground">Manage driver training programs and certifications</p>
        </div>
        
        {isSupervisor && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Training
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTraining ? 'Edit Training Record' : 'Schedule New Training'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driver_id">Driver *</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.driver_id}
                    onChange={(e) => {
                      const selectedDriver = drivers.find(d => d.user_id === e.target.value);
                      setFormData(prev => ({
                        ...prev, 
                        driver_id: e.target.value,
                        driver_name: selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : ''
                      }));
                    }}
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(driver => (
                      <option key={driver.user_id} value={driver.user_id}>
                        {driver.first_name} {driver.last_name} ({driver.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="training_type">Training Type *</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.training_type}
                    onChange={(e) => setFormData(prev => ({...prev, training_type: e.target.value}))}
                  >
                    <option value="defensive_driving">Defensive Driving</option>
                    <option value="vehicle_safety">Vehicle Safety</option>
                    <option value="emergency_response">Emergency Response</option>
                    <option value="customer_service">Customer Service</option>
                    <option value="route_familiarization">Route Familiarization</option>
                    <option value="first_aid">First Aid & CPR</option>
                    <option value="heavy_vehicle_license">Heavy Vehicle License</option>
                    <option value="passenger_assistance">Passenger Assistance</option>
                    <option value="fuel_efficiency">Fuel Efficiency</option>
                    <option value="maintenance_basics">Maintenance Basics</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="training_date">Training Date *</Label>
                  <Input
                    id="training_date"
                    type="date"
                    value={formData.training_date}
                    onChange={(e) => setFormData(prev => ({...prev, training_date: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    step="0.5"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({...prev, duration: e.target.value}))}
                    placeholder="8"
                  />
                </div>
                
                <div>
                  <Label htmlFor="instructor_name">Instructor Name</Label>
                  <Input
                    id="instructor_name"
                    value={formData.instructor_name}
                    onChange={(e) => setFormData(prev => ({...prev, instructor_name: e.target.value}))}
                    placeholder="John Smith"
                  />
                </div>
                
                <div>
                  <Label htmlFor="instructor_phone">Instructor Phone</Label>
                  <Input
                    id="instructor_phone"
                    value={formData.instructor_phone}
                    onChange={(e) => setFormData(prev => ({...prev, instructor_phone: e.target.value}))}
                    placeholder="+94 77 123 4567"
                  />
                </div>
                
                <div>
                  <Label htmlFor="instructor_email">Instructor Email</Label>
                  <Input
                    id="instructor_email"
                    type="email"
                    value={formData.instructor_email}
                    onChange={(e) => setFormData(prev => ({...prev, instructor_email: e.target.value}))}
                    placeholder="instructor@company.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({...prev, status: e.target.value}))}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                    placeholder="Additional notes about the training..."
                    rows={3}
                  />
                </div>
                
                <div className="col-span-2">
                  <Button onClick={handleSubmit} className="w-full">
                    {editingTraining ? 'Update Training' : 'Schedule Training'}
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
          title="Total Trainings"
          value={totalTrainings.toString()}
          icon={<GraduationCap className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="all records"
        />
        <KPICard
          title="Scheduled"
          value={scheduledTrainings.toString()}
          icon={<Calendar className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="upcoming sessions"
        />
        <KPICard
          title="In Progress"
          value={inProgressTrainings.toString()}
          icon={<Clock className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="active sessions"
        />
        <KPICard
          title="Completed"
          value={completedTrainings.toString()}
          icon={<CheckCircle className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="successful completions"
        />
      </div>

      {/* Training Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Training Records</CardTitle>
          <CardDescription>
            Manage driver training programs, certifications and progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={trainings} />
        </CardContent>
      </Card>

      {/* Training Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Training Types Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                'Defensive Driving',
                'Vehicle Safety', 
                'Emergency Response',
                'Customer Service',
                'Route Familiarization',
                'First Aid & CPR'
              ].map(type => {
                const count = trainings.filter(t => 
                  getTrainingTypeDisplay(t.training_type) === type
                ).length;
                return (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm">{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completion Rate</span>
                  <span>{totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: totalTrainings > 0 ? `${(completedTrainings / totalTrainings) * 100}%` : '0%' 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="font-medium">{scheduledTrainings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Progress</span>
                  <span className="font-medium">{inProgressTrainings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium text-green-600">{completedTrainings}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}