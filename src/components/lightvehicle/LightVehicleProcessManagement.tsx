// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Car, 
  ClipboardCheck, 
  Truck, 
  Settings, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface LightVehicleOrder {
  id: string;
  order_number?: string;
  status: string;
  vehicle_name?: string;
  brand?: string;
  customer_name?: string;
}

interface LightVehicleProcessManagementProps {
  order: LightVehicleOrder;
  onRefresh?: () => void;
}

interface ProcessTask {
  id: string;
  label: string;
  completed: boolean;
  category: string;
  taskName: string;
}

const vehiclePreparationTasks: ProcessTask[] = [
  { id: 'exterior_wash', taskName: 'Exterior wash and cleaning', label: 'Exterior wash and cleaning', completed: false, category: 'cleaning' },
  { id: 'interior_clean', taskName: 'Interior deep cleaning', label: 'Interior deep cleaning', completed: false, category: 'cleaning' },
  { id: 'engine_check', taskName: 'Engine bay cleaning and check', label: 'Engine bay cleaning and check', completed: false, category: 'mechanical' },
  { id: 'oil_change', taskName: 'Oil and filter change', label: 'Oil and filter change', completed: false, category: 'mechanical' },
  { id: 'tire_check', taskName: 'Tire condition and pressure check', label: 'Tire condition and pressure check', completed: false, category: 'mechanical' },
  { id: 'brake_inspect', taskName: 'Brake system inspection', label: 'Brake system inspection', completed: false, category: 'safety' },
  { id: 'light_check', taskName: 'All lights functioning check', label: 'All lights functioning check', completed: false, category: 'safety' },
  { id: 'ac_check', taskName: 'A/C system check', label: 'A/C system check', completed: false, category: 'comfort' },
  { id: 'battery_test', taskName: 'Battery test and terminals clean', label: 'Battery test and terminals clean', completed: false, category: 'electrical' },
  { id: 'fluid_levels', taskName: 'All fluid levels topped up', label: 'All fluid levels topped up', completed: false, category: 'mechanical' }
];

const inspectionTasks: ProcessTask[] = [
  { id: 'body_condition', taskName: 'Body condition inspection', label: 'Body condition inspection', completed: false, category: 'exterior' },
  { id: 'paint_quality', taskName: 'Paint quality assessment', label: 'Paint quality assessment', completed: false, category: 'exterior' },
  { id: 'glass_condition', taskName: 'Glass/windshield condition', label: 'Glass/windshield condition', completed: false, category: 'exterior' },
  { id: 'interior_condition', taskName: 'Interior upholstery condition', label: 'Interior upholstery condition', completed: false, category: 'interior' },
  { id: 'dashboard_function', taskName: 'Dashboard and gauges functional', label: 'Dashboard and gauges functional', completed: false, category: 'interior' },
  { id: 'engine_run', taskName: 'Engine running test', label: 'Engine running test', completed: false, category: 'mechanical' },
  { id: 'transmission_test', taskName: 'Transmission smooth operation', label: 'Transmission smooth operation', completed: false, category: 'mechanical' },
  { id: 'steering_check', taskName: 'Steering alignment check', label: 'Steering alignment check', completed: false, category: 'mechanical' },
  { id: 'safety_features', taskName: 'Safety features test (airbags, ABS)', label: 'Safety features test (airbags, ABS)', completed: false, category: 'safety' },
  { id: 'road_test', taskName: 'Road test completed', label: 'Road test completed', completed: false, category: 'final' }
];

const deliveryTasks: ProcessTask[] = [
  { id: 'final_clean', taskName: 'Final vehicle cleaning', label: 'Final vehicle cleaning', completed: false, category: 'preparation' },
  { id: 'fuel_level', taskName: 'Fuel tank filled', label: 'Fuel tank filled', completed: false, category: 'preparation' },
  { id: 'documents_ready', taskName: 'All documents prepared', label: 'All documents prepared', completed: false, category: 'documentation' },
  { id: 'registration_complete', taskName: 'Registration certificate ready', label: 'Registration certificate ready', completed: false, category: 'documentation' },
  { id: 'insurance_arranged', taskName: 'Insurance arranged', label: 'Insurance arranged', completed: false, category: 'documentation' },
  { id: 'owner_manual', taskName: 'Owner manual provided', label: 'Owner\'s manual provided', completed: false, category: 'handover' },
  { id: 'spare_key', taskName: 'Spare key(s) provided', label: 'Spare key(s) provided', completed: false, category: 'handover' },
  { id: 'warranty_explained', taskName: 'Warranty terms explained', label: 'Warranty terms explained', completed: false, category: 'handover' },
  { id: 'customer_signature', taskName: 'Customer acceptance signature', label: 'Customer acceptance signature', completed: false, category: 'final' },
  { id: 'delivery_photo', taskName: 'Delivery photos taken', label: 'Delivery photos taken', completed: false, category: 'final' }
];

export function LightVehicleProcessManagement({ order, onRefresh }: LightVehicleProcessManagementProps) {
  const [activeTab, setActiveTab] = useState('preparation');
  const [preparationTasks, setPreparationTasks] = useState<ProcessTask[]>(vehiclePreparationTasks);
  const [inspectionTaskList, setInspectionTaskList] = useState<ProcessTask[]>(inspectionTasks);
  const [deliveryTaskList, setDeliveryTaskList] = useState<ProcessTask[]>(deliveryTasks);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTaskState();
  }, [order.id]);

  const loadTaskState = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lightvehicle_order_tasks')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;

      if (data && data.length > 0) {
        // Map by task_name to completed status
        const taskMap = new Map(data.map(t => [t.task_name, t.status === 'completed']));
        
        setPreparationTasks(prev => prev.map(task => ({
          ...task,
          completed: taskMap.get(task.taskName) || false
        })));
        
        setInspectionTaskList(prev => prev.map(task => ({
          ...task,
          completed: taskMap.get(task.taskName) || false
        })));
        
        setDeliveryTaskList(prev => prev.map(task => ({
          ...task,
          completed: taskMap.get(task.taskName) || false
        })));
      }
    } catch (error) {
      console.error('Error loading task state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskToggle = async (task: ProcessTask, taskType: 'preparation' | 'inspection' | 'delivery', completed: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if task exists
      const { data: existingTask } = await supabase
        .from('lightvehicle_order_tasks')
        .select('id')
        .eq('order_id', order.id)
        .eq('task_name', task.taskName)
        .maybeSingle();

      if (existingTask) {
        // Update existing task
        const { error } = await supabase
          .from('lightvehicle_order_tasks')
          .update({
            status: completed ? 'completed' : 'pending',
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTask.id);

        if (error) throw error;
      } else {
        // Insert new task
        const { error } = await supabase
          .from('lightvehicle_order_tasks')
          .insert({
            order_id: order.id,
            task_name: task.taskName,
            process_type: taskType,
            status: completed ? 'completed' : 'pending',
            completed_at: completed ? new Date().toISOString() : null,
            created_by: user?.id
          });

        if (error) throw error;
      }

      // Update local state
      if (taskType === 'preparation') {
        setPreparationTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed } : t));
      } else if (taskType === 'inspection') {
        setInspectionTaskList(prev => prev.map(t => t.id === task.id ? { ...t, completed } : t));
      } else {
        setDeliveryTaskList(prev => prev.map(t => t.id === task.id ? { ...t, completed } : t));
      }

      toast.success(completed ? 'Task completed!' : 'Task unchecked');
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const getProgress = (tasks: ProcessTask[]) => {
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getStatusIcon = (progress: number) => {
    if (progress === 100) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (progress > 0) return <Clock className="h-5 w-5 text-blue-600" />;
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  const renderTaskList = (tasks: ProcessTask[], taskType: 'preparation' | 'inspection' | 'delivery') => {
    const categories = [...new Set(tasks.map(t => t.category))];
    
    return (
      <div className="space-y-6">
        {categories.map(category => (
          <div key={category}>
            <h4 className="font-medium text-sm capitalize mb-3 text-muted-foreground">{category}</h4>
            <div className="space-y-2">
              {tasks.filter(t => t.category === category).map(task => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    task.completed ? 'bg-green-50 border-green-200' : 'bg-background hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) => handleTaskToggle(task, taskType, !!checked)}
                  />
                  <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.label}
                  </span>
                  {task.completed && (
                    <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const preparationProgress = getProgress(preparationTasks);
  const inspectionProgress = getProgress(inspectionTaskList);
  const deliveryProgress = getProgress(deliveryTaskList);
  const overallProgress = Math.round((preparationProgress + inspectionProgress + deliveryProgress) / 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Operations & Processing
          </span>
          <Badge variant="outline">{overallProgress}% Complete</Badge>
        </CardTitle>
        <Progress value={overallProgress} className="w-full" />
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preparation" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Preparation
              <Badge variant="secondary" className="ml-1">{preparationProgress}%</Badge>
            </TabsTrigger>
            <TabsTrigger value="inspection" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Inspection
              <Badge variant="secondary" className="ml-1">{inspectionProgress}%</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery
              <Badge variant="secondary" className="ml-1">{deliveryProgress}%</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preparation" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(preparationProgress)}
                  <span className="font-medium">Vehicle Preparation</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {preparationTasks.filter(t => t.completed).length} of {preparationTasks.length} tasks
                </span>
              </div>
              <Progress value={preparationProgress} className="h-2" />
              {renderTaskList(preparationTasks, 'preparation')}
            </div>
          </TabsContent>

          <TabsContent value="inspection" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(inspectionProgress)}
                  <span className="font-medium">Quality Inspection</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {inspectionTaskList.filter(t => t.completed).length} of {inspectionTaskList.length} tasks
                </span>
              </div>
              <Progress value={inspectionProgress} className="h-2" />
              {renderTaskList(inspectionTaskList, 'inspection')}
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(deliveryProgress)}
                  <span className="font-medium">Delivery Checklist</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {deliveryTaskList.filter(t => t.completed).length} of {deliveryTaskList.length} tasks
                </span>
              </div>
              <Progress value={deliveryProgress} className="h-2" />
              {renderTaskList(deliveryTaskList, 'delivery')}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
