import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Factory, Camera, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { useYutongSupplierManagement, YutongSupplierOrder, ProductionUpdate } from '@/hooks/useYutongSupplierManagement';

interface YutongSupplierOrderDetailsModalProps {
  supplierOrder: YutongSupplierOrder;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function YutongSupplierOrderDetailsModal({
  supplierOrder,
  open,
  onClose,
  onRefresh
}: YutongSupplierOrderDetailsModalProps) {
  const [productionUpdates, setProductionUpdates] = useState<ProductionUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    milestone: supplierOrder.current_milestone,
    milestone_completed: false,
    progress_notes: '',
    quality_check_passed: undefined as undefined | boolean,
    issues_identified: '',
    estimated_next_milestone_date: '',
  });

  const { 
    getProductionUpdates, 
    addProductionUpdate, 
    updateSupplierOrderMilestone,
    milestoneLabels 
  } = useYutongSupplierManagement();

  const loadProductionUpdates = async () => {
    try {
      setLoading(true);
      const result = await getProductionUpdates(supplierOrder.id);
      if (result.success) {
        setProductionUpdates(result.data || []);
      }
    } catch (error) {
      console.error('Error loading production updates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadProductionUpdates();
    }
  }, [open, supplierOrder.id]);

  const handleAddUpdate = async () => {
    const result = await addProductionUpdate({
      supplier_order_id: supplierOrder.id,
      ...newUpdate,
    });

    if (result.success) {
      loadProductionUpdates();
      onRefresh();
      setNewUpdate({
        milestone: supplierOrder.current_milestone,
        milestone_completed: false,
        progress_notes: '',
        quality_check_passed: undefined,
        issues_identified: '',
        estimated_next_milestone_date: '',
      });
    }
  };

  const handleUpdateOrderDetails = async () => {
    const result = await updateSupplierOrderMilestone(
      supplierOrder.id,
      supplierOrder.current_milestone,
      supplierOrder.production_progress_percentage,
      {
        chassis_number: supplierOrder.chassis_number,
        engine_number: supplierOrder.engine_number,
        vin_number: supplierOrder.vin_number,
        supplier_notes: supplierOrder.supplier_notes,
      }
    );

    if (result.success) {
      onRefresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Supplier Order Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="production">Production Updates</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Yutong Reference</Label>
                    <div className="font-mono text-sm mt-1">
                      {supplierOrder.yutong_order_reference || 'Not assigned'}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Current Milestone</Label>
                    <div className="mt-1">
                      <Badge className="bg-blue-100 text-blue-800">
                        {milestoneLabels[supplierOrder.current_milestone as keyof typeof milestoneLabels]}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Production Progress</Label>
                    <div className="mt-1 space-y-1">
                      <Progress value={supplierOrder.production_progress_percentage} className="w-full" />
                      <div className="text-sm text-center">{supplierOrder.production_progress_percentage}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="chassis">Chassis Number</Label>
                    <Input
                      id="chassis"
                      value={supplierOrder.chassis_number || ''}
                      placeholder="Enter chassis number"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="engine">Engine Number</Label>
                    <Input
                      id="engine"
                      value={supplierOrder.engine_number || ''}
                      placeholder="Enter engine number"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vin">VIN Number</Label>
                    <Input
                      id="vin"
                      value={supplierOrder.vin_number || ''}
                      placeholder="Enter VIN number"
                      className="mt-1"
                    />
                  </div>

                  <Button onClick={handleUpdateOrderDetails} className="w-full">
                    Update Vehicle Details
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Production Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Production Start Date</Label>
                    <div className="mt-1">
                      {supplierOrder.production_start_date ? 
                        format(new Date(supplierOrder.production_start_date), 'MMM dd, yyyy') : 
                        'Not set'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Estimated Completion</Label>
                    <div className="mt-1">
                      {supplierOrder.estimated_completion_date ? 
                        format(new Date(supplierOrder.estimated_completion_date), 'MMM dd, yyyy') : 
                        'Not set'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Actual Completion</Label>
                    <div className="mt-1">
                      {supplierOrder.actual_completion_date ? 
                        format(new Date(supplierOrder.actual_completion_date), 'MMM dd, yyyy') : 
                        'In progress'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Order Status</Label>
                    <div className="mt-1">
                      <Badge variant={supplierOrder.status === 'transmitted' ? 'default' : 'secondary'}>
                        {supplierOrder.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Production Update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="milestone">Milestone</Label>
                    <select
                      id="milestone"
                      value={newUpdate.milestone}
                      onChange={(e) => setNewUpdate({ ...newUpdate, milestone: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      {Object.entries(milestoneLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                      id="completed"
                      checked={newUpdate.milestone_completed}
                      onCheckedChange={(checked) => 
                        setNewUpdate({ ...newUpdate, milestone_completed: !!checked })
                      }
                    />
                    <Label htmlFor="completed">Milestone Completed</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Progress Notes</Label>
                  <Textarea
                    id="notes"
                    value={newUpdate.progress_notes}
                    onChange={(e) => setNewUpdate({ ...newUpdate, progress_notes: e.target.value })}
                    placeholder="Enter progress notes..."
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="quality-pass"
                      checked={newUpdate.quality_check_passed === true}
                      onCheckedChange={(checked) => 
                        setNewUpdate({ 
                          ...newUpdate, 
                          quality_check_passed: checked ? true : undefined 
                        })
                      }
                    />
                    <Label htmlFor="quality-pass">Quality Check Passed</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="quality-fail"
                      checked={newUpdate.quality_check_passed === false}
                      onCheckedChange={(checked) => 
                        setNewUpdate({ 
                          ...newUpdate, 
                          quality_check_passed: checked ? false : undefined 
                        })
                      }
                    />
                    <Label htmlFor="quality-fail">Quality Issues Found</Label>
                  </div>
                </div>

                {newUpdate.quality_check_passed === false && (
                  <div>
                    <Label htmlFor="issues">Issues Identified</Label>
                    <Textarea
                      id="issues"
                      value={newUpdate.issues_identified}
                      onChange={(e) => setNewUpdate({ ...newUpdate, issues_identified: e.target.value })}
                      placeholder="Describe quality issues..."
                      className="mt-1"
                    />
                  </div>
                )}

                <Button onClick={handleAddUpdate} className="w-full">
                  Add Production Update
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productionUpdates.map((update) => (
                    <div key={update.id} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {milestoneLabels[update.milestone as keyof typeof milestoneLabels]}
                          </Badge>
                          {update.milestone_completed && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {update.quality_check_passed === false && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(update.update_time), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      
                      {update.progress_notes && (
                        <p className="text-sm mb-2">{update.progress_notes}</p>
                      )}
                      
                      {update.issues_identified && (
                        <p className="text-sm text-red-600 mb-2">
                          <strong>Issues:</strong> {update.issues_identified}
                        </p>
                      )}
                      
                      {update.photos && update.photos.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Camera className="h-4 w-4" />
                          {update.photos.length} photo(s)
                        </div>
                      )}
                      
                      {update.videos && update.videos.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Video className="h-4 w-4" />
                          {update.videos.length} video(s)
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {productionUpdates.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No production updates available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Certificates & Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  Document management coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}