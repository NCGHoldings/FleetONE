import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { 
  Eye, 
  DollarSign, 
  Truck, 
  Package, 
  Shield, 
  Cog, 
  FileCheck, 
  MapPin, 
  Wrench,
  FileText,
  MessageSquare,
  Calendar,
  User
} from 'lucide-react';
import { YutongOrder } from '@/hooks/useYutongOrderManagement';
import { YutongOrderJourney } from './YutongOrderJourney';
import { ProcessManagement } from './ProcessManagement';
import { YutongOrderInvoiceGenerator } from './YutongOrderInvoiceGenerator';
import { YutongPaymentTracking } from './YutongPaymentTracking';
import { FinanceDocumentPreviewModal } from '../accounting/shared/FinanceDocumentPreviewModal';

interface EnhancedYutongOrderDetailsModalProps {
  order: YutongOrder | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  defaultTab?: string;
}

const processTabsConfig = [
  { key: 'supplier', label: 'Supplier', icon: Truck },
  { key: 'logistics', label: 'Logistics', icon: Package },
  { key: 'customs', label: 'Customs', icon: Shield },
  { key: 'processing', label: 'Processing', icon: Cog },
  { key: 'rmv', label: 'RMV', icon: FileCheck },
  { key: 'delivery', label: 'Delivery', icon: MapPin },
  { key: 'after-sales', label: 'After-Sales', icon: Wrench }
];

export function EnhancedYutongOrderDetailsModal({ 
  order, 
  open, 
  onClose, 
  onRefresh,
  defaultTab = 'overview'
}: EnhancedYutongOrderDetailsModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPOPreview, setShowPOPreview] = useState(false);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Order Management - {order.order_no}
            </DialogTitle>
            <Button size="sm" variant="outline" onClick={() => setShowPOPreview(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Print PO Template
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Journey</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Customer</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Order Number</label>
                      <p className="font-mono text-base">{order.order_no}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                      <p>{format(new Date(order.order_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bus Model</label>
                      <p className="font-medium">{order.bus_model}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                      <p className="text-lg font-bold">{order.quantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Phase</label>
                    <div className="mt-2">
                      <Badge className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
                        {order.current_phase.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Overall Progress</label>
                    <div className="mt-2 space-y-2">
                      <Progress value={order.progress_percentage || 0} className="w-full h-3" />
                      <p className="text-base font-semibold">{Math.round(order.progress_percentage || 0)}% Complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Engine Type</label>
                    <p className="font-medium">{order.engine_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gearbox</label>
                    <p className="font-medium">{order.gearbox_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Seating</label>
                    <p className="font-medium">{order.seating_capacity || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Color</label>
                    <p className="font-medium">{order.color_scheme || 'Not specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Journey Tab */}
          <TabsContent value="journey" className="space-y-6">
            <YutongOrderJourney 
              order={order} 
              onUpdatePhase={(phase, data) => {
                console.log('Phase update:', phase, data);
                onRefresh();
              }}
            />
          </TabsContent>

          {/* Financial Tab - Now with full Payment Tracking */}
          <TabsContent value="financial" className="space-y-6">
            <YutongPaymentTracking 
              orderId={order.id} 
              onRefresh={onRefresh} 
            />
          </TabsContent>

          {/* Operations Tab with Process Management */}
          <TabsContent value="operations" className="space-y-6">
            <ProcessManagement 
              order={order} 
              onUpdate={(processType, data) => {
                console.log('Process update:', processType, data);
                onRefresh();
              }}
            />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <YutongOrderInvoiceGenerator 
              order={order}
              onRefresh={onRefresh}
            />
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Communication History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Communication logs and messaging system coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Tab */}
          <TabsContent value="customer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Customer details and history coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      {showPOPreview && (
        <FinanceDocumentPreviewModal
          open={showPOPreview}
          onOpenChange={setShowPOPreview}
          documentType="purchase_order"
          documentData={order}
        />
      )}
    </Dialog>
  );
}