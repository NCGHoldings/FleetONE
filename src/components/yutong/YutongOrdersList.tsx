import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, CreditCard, Truck, FileText, LayoutGrid, List, Ship, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useYutongOrderManagement, YutongOrder } from '@/hooks/useYutongOrderManagement';
import { EnhancedYutongOrderDetailsModal } from './EnhancedYutongOrderDetailsModal';
import { YutongCreateOrderModal } from './YutongCreateOrderModal';
import { YutongOrderCard } from './YutongOrderCard';
import { YutongShipmentGroupManagement } from './YutongShipmentGroupManagement';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, CheckCircle2, MinusCircle } from 'lucide-react';

const phaseLabels = {
  'order_confirmation': 'Order Confirmation',
  'lc_issuance': 'LC Issuance',
  'production_order': 'Production Order',
  'manufacturing': 'Manufacturing',
  'shipping_booking': 'Shipping Booking',
  'customs_clearance': 'Customs Clearance',
  'port_operations': 'Port Operations',
  'vehicle_processing': 'Vehicle Processing',
  'rmv_registration': 'RMV Registration',
  'final_inspection': 'Final Inspection',
  'delivery': 'Delivery'
};

const phaseColors = {
  'order_confirmation': 'bg-blue-100 text-blue-800',
  'lc_issuance': 'bg-purple-100 text-purple-800',
  'production_order': 'bg-orange-100 text-orange-800',
  'manufacturing': 'bg-yellow-100 text-yellow-800',
  'shipping_booking': 'bg-indigo-100 text-indigo-800',
  'customs_clearance': 'bg-pink-100 text-pink-800',
  'port_operations': 'bg-teal-100 text-teal-800',
  'vehicle_processing': 'bg-cyan-100 text-cyan-800',
  'rmv_registration': 'bg-lime-100 text-lime-800',
  'final_inspection': 'bg-amber-100 text-amber-800',
  'delivery': 'bg-green-100 text-green-800'
};

export function YutongOrdersList() {
  const [orders, setOrders] = useState<YutongOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<YutongOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [activeOrderTab, setActiveOrderTab] = useState('overview');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showShipments, setShowShipments] = useState(false);
  const { getOrdersWithDetails, updateOrderPhase, voidOrder } = useYutongOrderManagement();
  const [orderToVoid, setOrderToVoid] = useState<YutongOrder | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const result = await getOrdersWithDetails();
        if (result.success) {
          setOrders((result.orders || []) as YutongOrder[]);
        }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handlePhaseUpdate = async (orderId: string, newPhase: string) => {
    const phases = Object.keys(phaseLabels);
    const phaseIndex = phases.indexOf(newPhase);
    const progressPercentage = Math.round(((phaseIndex + 1) / phases.length) * 100);
    
    const result = await updateOrderPhase(orderId, newPhase, progressPercentage);
    if (result.success) {
      loadOrders();
    }
  };

  const getPhaseBadge = (phase: string) => {
    const label = phaseLabels[phase as keyof typeof phaseLabels] || phase;
    const colorClass = phaseColors[phase as keyof typeof phaseColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {label}
      </Badge>
    );
  };

  const columns: ColumnDef<YutongOrder>[] = [
    {
      accessorKey: "order_no",
      header: "Order No",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("order_no")}</div>
      ),
    },
    {
      accessorKey: "bus_model",
      header: "Bus Model",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("bus_model")}</div>
          <div className="text-sm text-muted-foreground">
            Qty: {row.original.quantity}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "engine_number",
      header: "Engine No",
      cell: ({ row }) => {
        const engineNo = (row.original as any).engine_number;
        return (
          <div className="font-mono text-xs">
            {engineNo ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{engineNo}</span>
            ) : (
              <span className="text-muted-foreground italic">—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "chassis_number",
      header: "Chassis No",
      cell: ({ row }) => {
        const chassisNo = (row.original as any).chassis_number;
        return (
          <div className="font-mono text-xs">
            {chassisNo ? (
              <span className="text-blue-600 dark:text-blue-400 font-medium">{chassisNo}</span>
            ) : (
              <span className="text-muted-foreground italic">—</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Customer",
      cell: ({ row }) => {
        const quotation = (row.original as any).yutong_quotations;
        
        const customerName = quotation?.customer_name || 'N/A';
        const companyName = quotation?.company_name;
        
        return (
          <div>
            <div className="font-medium">{customerName}</div>
            {companyName && (
              <div className="text-sm text-muted-foreground">{companyName}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: "Total Amount",
      cell: ({ row }) => (
        <div className="font-medium">
          LKR {row.getValue<number>("total_amount").toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "payment_mode",
      header: "Payment Mode",
      cell: ({ row }) => {
        const mode = row.getValue("payment_mode") as string;
        return (
          <Badge variant={mode === 'cash' ? 'default' : 'secondary'}>
            {mode.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      header: "Financial Status",
      cell: ({ row }) => {
        const totalPaid = row.original.total_paid || 0;
        const totalAmount = row.original.total_amount;
        const percentage = (totalPaid / totalAmount) * 100;
        
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Paid: LKR {totalPaid.toLocaleString()}</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="w-full h-2" />
          </div>
        );
      },
    },
    {
      header: "VAT & Journal",
      cell: ({ row }) => {
        const arInvoice = (row.original as any).ar_invoices;
        const jeId = arInvoice?.journal_entry_id;
        const taxAmount = arInvoice?.tax_amount;
        
        return (
          <div className="space-y-1 text-sm min-w-[120px]">
            {taxAmount > 0 ? (
              <div className="flex items-center text-green-600 font-medium">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                LKR {taxAmount.toLocaleString()}
              </div>
            ) : (
              <div className="flex items-center text-muted-foreground text-xs">
                <MinusCircle className="h-3 w-3 mr-1" />
                No VAT
              </div>
            )}
            {jeId ? (
              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                JE Linked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-200">
                No JE
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "current_phase",
      header: "Current Phase",
      cell: ({ row }) => getPhaseBadge(row.getValue("current_phase")),
    },
    {
      accessorKey: "progress_percentage",
      header: "Progress",
      cell: ({ row }) => {
        const progress = row.getValue("progress_percentage") as number || 0;
        return (
          <div className="space-y-1">
            <Progress value={progress} className="w-full h-2" />
            <div className="text-xs text-center">{Math.round(progress)}%</div>
          </div>
        );
      },
    },
    {
      accessorKey: "order_date",
      header: "Order Date",
      cell: ({ row }) => {
        const date = row.getValue("order_date");
        return date ? format(new Date(date as string), 'MMM dd, yyyy') : '-';
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedOrder(order);
                setActiveOrderTab('overview');
                setShowOrderDetails(true);
              }}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {(order as any).yutong_invoice_records && (order as any).yutong_invoice_records.length > 0 ? (
              <Button 
                variant="outline" 
                size="sm"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                onClick={() => {
                  setSelectedOrder(order);
                  setActiveOrderTab('invoices');
                  setShowOrderDetails(true);
                }}
                title="View Invoice"
              >
                <FileText className="h-4 w-4 mr-1" />
                {(order as any).yutong_invoice_records[0].invoice_no}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                className="border-dashed"
                onClick={() => {
                  setSelectedOrder(order);
                  setActiveOrderTab('invoices');
                  setShowOrderDetails(true);
                }}
                title="Create Invoice"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Inv
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              title="Financial Details"
            >
              <CreditCard className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => setOrderToVoid(order)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Select
              value={order.current_phase}
              onValueChange={(value) => handlePhaseUpdate(order.id, value)}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(phaseLabels).map(([phase, label]) => (
                  <SelectItem key={phase} value={phase}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
  ];

  // Show Shipment Management if toggled
  if (showShipments) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowShipments(false)} className="gap-2">
          ← Back to Orders
        </Button>
        <YutongShipmentGroupManagement />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Yutong Orders Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowShipments(true)} className="gap-2">
              <Ship className="h-4 w-4" />
              Manage Shipments
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setShowCreateOrder(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Order
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <DataTable 
              columns={columns} 
              data={orders}
              searchKey="order_no"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orders.map(order => (
                <YutongOrderCard
                  key={order.id}
                  order={order}
                  onViewDetails={(o) => {
                    setSelectedOrder(o);
                    setShowOrderDetails(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showOrderDetails && selectedOrder && (
        <EnhancedYutongOrderDetailsModal
          order={selectedOrder}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          onRefresh={loadOrders}
          defaultTab={activeOrderTab}
        />
      )}

      {showCreateOrder && (
        <YutongCreateOrderModal
          open={showCreateOrder}
          onClose={() => setShowCreateOrder(false)}
          onSuccess={() => {
            setShowCreateOrder(false);
            loadOrders();
          }}
        />
      )}

      <AlertDialog open={!!orderToVoid} onOpenChange={(open) => !open && setOrderToVoid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will void the order
              {orderToVoid && <strong> {orderToVoid.order_no}</strong>}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (orderToVoid) {
                  const result = await voidOrder(orderToVoid.id);
                  if (result.success) {
                    loadOrders();
                  }
                }
              }}
            >
              Void Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}