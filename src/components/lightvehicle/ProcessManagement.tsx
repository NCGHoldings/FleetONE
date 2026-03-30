import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Truck, 
  Package, 
  Shield, 
  Cog, 
  FileCheck, 
  MapPin, 
  Wrench,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { LightVehicleOrder } from '@/hooks/useLightVehicleOrderManagement';

interface ProcessManagementProps {
  order: LightVehicleOrder;
  onUpdate?: (processType: string, data: any) => void;
}

interface Task {
  id: string;
  order_id: string;
  process_type: string;
  task_id: string;
  task_label: string;
  status: string;
  notes: string | null;
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

const processConfig = {
  supplier: {
    title: 'Supplier Management',
    icon: Truck,
    color: 'purple',
    phases: ['production_order', 'manufacturing'],
    defaultTasks: [
      { task_id: 'po_submission', task_label: 'Submit Production Order' },
      { task_id: 'spec_confirmation', task_label: 'Confirm Specifications' },
      { task_id: 'quality_check', task_label: 'Quality Checkpoints' },
      { task_id: 'production_updates', task_label: 'Production Updates' }
    ]
  },
  logistics: {
    title: 'Logistics Management',
    icon: Package,
    color: 'orange',
    phases: ['shipping_booking', 'port_operations'],
    defaultTasks: [
      { task_id: 'shipping_quote', task_label: 'Get Shipping Quotes' },
      { task_id: 'book_container', task_label: 'Book Container Space' },
      { task_id: 'export_docs', task_label: 'Prepare Export Documents' },
      { task_id: 'track_shipment', task_label: 'Track Shipment' }
    ]
  },
  customs: {
    title: 'Customs Management',
    icon: Shield,
    color: 'red',
    phases: ['customs_clearance'],
    defaultTasks: [
      { task_id: 'import_permit', task_label: 'Obtain Import Permit' },
      { task_id: 'duty_calculation', task_label: 'Calculate Duties' },
      { task_id: 'customs_declaration', task_label: 'Submit Declaration' },
      { task_id: 'clearance_approval', task_label: 'Get Clearance Approval' }
    ]
  },
  processing: {
    title: 'Vehicle Processing',
    icon: Cog,
    color: 'yellow',
    phases: ['vehicle_processing', 'final_inspection'],
    defaultTasks: [
      { task_id: 'facility_prep', task_label: 'Prepare Processing Facility' },
      { task_id: 'modifications', task_label: 'Apply Modifications' },
      { task_id: 'compliance_check', task_label: 'Compliance Check' },
      { task_id: 'final_qa', task_label: 'Final Quality Assurance' }
    ]
  },
  rmv: {
    title: 'RMV Registration',
    icon: FileCheck,
    color: 'indigo',
    phases: ['rmv_registration'],
    defaultTasks: [
      { task_id: 'inspection_booking', task_label: 'Book DMT Inspection' },
      { task_id: 'document_prep', task_label: 'Prepare Documentation' },
      { task_id: 'registration_fee', task_label: 'Pay Registration Fees' },
      { task_id: 'certificate_issue', task_label: 'Issue Certificate' }
    ]
  },
  delivery: {
    title: 'Delivery Management',
    icon: MapPin,
    color: 'teal',
    phases: ['delivery'],
    defaultTasks: [
      { task_id: 'delivery_schedule', task_label: 'Schedule Delivery' },
      { task_id: 'handover_prep', task_label: 'Prepare Handover Documents' },
      { task_id: 'customer_inspection', task_label: 'Customer Inspection' },
      { task_id: 'delivery_complete', task_label: 'Complete Delivery' }
    ]
  },
  afterSales: {
    title: 'After-Sales Service',
    icon: Wrench,
    color: 'green',
    phases: ['delivery'],
    defaultTasks: [
      { task_id: 'warranty_setup', task_label: 'Setup Warranty' },
      { task_id: 'service_schedule', task_label: 'Service Schedule' },
      { task_id: 'parts_inventory', task_label: 'Parts Inventory Setup' },
      { task_id: 'training_delivery', task_label: 'Customer Training' }
    ]
  }
};

export function ProcessManagement({ order, onUpdate }: ProcessManagementProps) {
  const [activeProcess, setActiveProcess] = useState('supplier');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    task_label: '',
    notes: '',
    due_date: '',
    status: 'pending'
  });

  useEffect(() => {
    loadTasks();
  }, [order.id]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lightvehicle_order_tasks')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // If no tasks exist, initialize with default tasks
      if (!data || data.length === 0) {
        await initializeDefaultTasks();
      } else {
        setTasks(data as any);
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const allTasks: any[] = [];

      Object.entries(processConfig).forEach(([processType, config]) => {
        config.defaultTasks.forEach(task => {
          allTasks.push({
            order_id: order.id,
            process_type: processType,
            task_id: task.task_id,
            task_label: task.task_label,
            status: 'pending',
            created_by: user?.id
          });
        });
      });

      const { data, error } = await supabase
        .from('lightvehicle_order_tasks')
        .insert(allTasks)
        .select();

      if (error) throw error;
      setTasks((data || []) as any);
    } catch (error: any) {
      console.error('Error initializing tasks:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default: return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getProcessTasks = (processKey: string) => {
    return tasks.filter(t => t.process_type === processKey);
  };

  const calculateProcessProgress = (processKey: string) => {
    const processTasks = getProcessTasks(processKey);
    if (processTasks.length === 0) return 0;
    const completedTasks = processTasks.filter(task => task.status === 'completed').length;
    return (completedTasks / processTasks.length) * 100;
  };

  const isProcessActive = (processKey: string) => {
    const process = processConfig[processKey as keyof typeof processConfig];
    return process.phases.includes(order.current_phase);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskForm({
      task_label: '',
      notes: '',
      due_date: '',
      status: 'pending'
    });
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      task_label: task.task_label,
      notes: task.notes || '',
      due_date: task.due_date || '',
      status: task.status
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editingTask) {
        // Update existing task
        const updateData: any = {
          task_label: taskForm.task_label,
          notes: taskForm.notes || null,
          due_date: taskForm.due_date || null,
          status: taskForm.status
        };

        if (taskForm.status === 'completed' && editingTask.status !== 'completed') {
          updateData.completed_at = new Date().toISOString();
          updateData.completed_by = user?.id;
        }

        const { error } = await supabase
          .from('lightvehicle_order_tasks')
          .update(updateData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        // Create new task
        const { error } = await (supabase as any)
          .from('lightvehicle_order_tasks')
          .insert({
            order_id: order.id,
            process_type: activeProcess,
            task_id: `custom_${Date.now()}`,
            task_label: taskForm.task_label,
            notes: taskForm.notes || null,
            due_date: taskForm.due_date || null,
            status: taskForm.status,
            created_by: user?.id
          });

        if (error) throw error;
        toast.success('Task added successfully');
      }

      setIsTaskModalOpen(false);
      loadTasks();
      onUpdate?.(activeProcess, { action: 'task_saved' });
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(`Failed to save task: ${error.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('lightvehicle_order_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task deleted successfully');
      loadTasks();
      onUpdate?.(activeProcess, { action: 'task_deleted' });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(`Failed to delete task: ${error.message}`);
    }
  };

  const handleMarkComplete = async (task: Task) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('lightvehicle_order_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id
        })
        .eq('id', task.id);

      if (error) throw error;
      toast.success('Task marked as completed');
      loadTasks();
      onUpdate?.(activeProcess, { action: 'task_completed', taskId: task.id });
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(`Failed to complete task: ${error.message}`);
    }
  };

  const handleStartTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('lightvehicle_order_tasks')
        .update({ status: 'in_progress' })
        .eq('id', task.id);

      if (error) throw error;
      toast.success('Task started');
      loadTasks();
      onUpdate?.(activeProcess, { action: 'task_started', taskId: task.id });
    } catch (error: any) {
      console.error('Error starting task:', error);
      toast.error(`Failed to start task: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            Process Management Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeProcess} onValueChange={setActiveProcess}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
              {Object.entries(processConfig).map(([key, config]) => {
                const Icon = config.icon;
                const progress = calculateProcessProgress(key);
                const isActive = isProcessActive(key);
                
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key} 
                    className={`flex flex-col items-center gap-1 h-auto py-3 ${
                      isActive ? 'ring-2 ring-blue-300' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">{config.title}</span>
                    <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-${config.color}-500 transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(processConfig).map(([processKey, config]) => (
              <TabsContent key={processKey} value={processKey} className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <config.icon className="h-6 w-6" />
                    <h3 className="text-xl font-semibold">{config.title}</h3>
                    {isProcessActive(processKey) && (
                      <Badge className="bg-green-100 text-green-800">Active Phase</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {Math.round(calculateProcessProgress(processKey))}% Complete
                    </span>
                    <Progress 
                      value={calculateProcessProgress(processKey)} 
                      className="w-24 h-2" 
                    />
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                  {getProcessTasks(processKey).map((task) => (
                    <Card key={task.id} className="border-l-4 border-l-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(task.status)}
                            <div>
                              <h4 className="font-medium">{task.task_label}</h4>
                              {task.notes && (
                                <p className="text-sm text-muted-foreground">{task.notes}</p>
                              )}
                              {task.due_date && (
                                <p className="text-xs text-muted-foreground">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(task.status)}>
                              {task.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleEditTask(task)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Task Actions */}
                        {task.status === 'pending' && (
                          <div className="mt-4 pt-4 border-t">
                            <Button size="sm" onClick={() => handleStartTask(task)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Start Task
                            </Button>
                          </div>
                        )}

                        {task.status === 'in_progress' && (
                          <div className="mt-4 pt-4 border-t flex gap-2">
                            <Button size="sm" onClick={() => handleMarkComplete(task)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Process Actions */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Process Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={handleAddTask}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                      <Button size="sm" variant="outline" onClick={loadTasks}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Name</Label>
              <Input
                value={taskForm.task_label}
                onChange={(e) => setTaskForm({ ...taskForm, task_label: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                placeholder="Enter notes (optional)"
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={taskForm.status}
                onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={!taskForm.task_label}>
              {editingTask ? 'Update Task' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
