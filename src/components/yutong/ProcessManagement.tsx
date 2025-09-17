import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { YutongOrder } from '@/hooks/useYutongOrderManagement';

interface ProcessManagementProps {
  order: YutongOrder;
  onUpdate?: (processType: string, data: any) => void;
}

const processConfig = {
  supplier: {
    title: 'Supplier Management',
    icon: Truck,
    color: 'purple',
    phases: ['production_order', 'manufacturing'],
    tasks: [
      { id: 'po_submission', label: 'Submit Production Order', status: 'completed' },
      { id: 'spec_confirmation', label: 'Confirm Specifications', status: 'in_progress' },
      { id: 'quality_check', label: 'Quality Checkpoints', status: 'pending' },
      { id: 'production_updates', label: 'Production Updates', status: 'pending' }
    ]
  },
  logistics: {
    title: 'Logistics Management',
    icon: Package,
    color: 'orange',
    phases: ['shipping_booking', 'port_operations'],
    tasks: [
      { id: 'shipping_quote', label: 'Get Shipping Quotes', status: 'completed' },
      { id: 'book_container', label: 'Book Container Space', status: 'pending' },
      { id: 'export_docs', label: 'Prepare Export Documents', status: 'pending' },
      { id: 'track_shipment', label: 'Track Shipment', status: 'pending' }
    ]
  },
  customs: {
    title: 'Customs Management',
    icon: Shield,
    color: 'red',
    phases: ['customs_clearance'],
    tasks: [
      { id: 'import_permit', label: 'Obtain Import Permit', status: 'in_progress' },
      { id: 'duty_calculation', label: 'Calculate Duties', status: 'pending' },
      { id: 'customs_declaration', label: 'Submit Declaration', status: 'pending' },
      { id: 'clearance_approval', label: 'Get Clearance Approval', status: 'pending' }
    ]
  },
  processing: {
    title: 'Vehicle Processing',
    icon: Cog,
    color: 'yellow',
    phases: ['vehicle_processing', 'final_inspection'],
    tasks: [
      { id: 'facility_prep', label: 'Prepare Processing Facility', status: 'pending' },
      { id: 'modifications', label: 'Apply Modifications', status: 'pending' },
      { id: 'compliance_check', label: 'Compliance Check', status: 'pending' },
      { id: 'final_qa', label: 'Final Quality Assurance', status: 'pending' }
    ]
  },
  rmv: {
    title: 'RMV Registration',
    icon: FileCheck,
    color: 'indigo',
    phases: ['rmv_registration'],
    tasks: [
      { id: 'inspection_booking', label: 'Book DMT Inspection', status: 'pending' },
      { id: 'document_prep', label: 'Prepare Documentation', status: 'pending' },
      { id: 'registration_fee', label: 'Pay Registration Fees', status: 'pending' },
      { id: 'certificate_issue', label: 'Issue Certificate', status: 'pending' }
    ]
  },
  delivery: {
    title: 'Delivery Management',
    icon: MapPin,
    color: 'teal',
    phases: ['delivery'],
    tasks: [
      { id: 'delivery_schedule', label: 'Schedule Delivery', status: 'pending' },
      { id: 'handover_prep', label: 'Prepare Handover Documents', status: 'pending' },
      { id: 'customer_inspection', label: 'Customer Inspection', status: 'pending' },
      { id: 'delivery_complete', label: 'Complete Delivery', status: 'pending' }
    ]
  },
  afterSales: {
    title: 'After-Sales Service',
    icon: Wrench,
    color: 'green',
    phases: ['delivery'],
    tasks: [
      { id: 'warranty_setup', label: 'Setup Warranty', status: 'pending' },
      { id: 'service_schedule', label: 'Service Schedule', status: 'pending' },
      { id: 'parts_inventory', label: 'Parts Inventory Setup', status: 'pending' },
      { id: 'training_delivery', label: 'Customer Training', status: 'pending' }
    ]
  }
};

export function ProcessManagement({ order, onUpdate }: ProcessManagementProps) {
  const [activeProcess, setActiveProcess] = useState('supplier');
  const [taskUpdates, setTaskUpdates] = useState<{ [key: string]: string }>({});

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

  const calculateProcessProgress = (processKey: string) => {
    const process = processConfig[processKey as keyof typeof processConfig];
    const completedTasks = process.tasks.filter(task => task.status === 'completed').length;
    return (completedTasks / process.tasks.length) * 100;
  };

  const isProcessActive = (processKey: string) => {
    const process = processConfig[processKey as keyof typeof processConfig];
    return process.phases.includes(order.current_phase);
  };

  return (
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
                {config.tasks.map((task, index) => (
                  <Card key={task.id} className="border-l-4 border-l-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <h4 className="font-medium">{task.label}</h4>
                            <p className="text-sm text-muted-foreground">
                              Task #{index + 1} for {config.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Task Update Section */}
                      {task.status === 'in_progress' && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Progress Update:</label>
                            <Textarea 
                              placeholder="Enter progress update..."
                              value={taskUpdates[task.id] || ''}
                              onChange={(e) => setTaskUpdates(prev => ({
                                ...prev,
                                [task.id]: e.target.value
                              }))}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => onUpdate?.(processKey, {
                              taskId: task.id,
                              status: 'completed',
                              update: taskUpdates[task.id]
                            })}>
                              Mark Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onUpdate?.(processKey, {
                              taskId: task.id,
                              status: 'in_progress',
                              update: taskUpdates[task.id]
                            })}>
                              Save Progress
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Start Task Section */}
                      {task.status === 'pending' && (
                        <div className="mt-4 pt-4 border-t">
                          <Button 
                            size="sm" 
                            onClick={() => onUpdate?.(processKey, {
                              taskId: task.id,
                              status: 'in_progress'
                            })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Start Task
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
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                    <Button size="sm" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Review
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                    {isProcessActive(processKey) && (
                      <Button size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Phase
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}