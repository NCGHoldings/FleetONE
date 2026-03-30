import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Factory, Eye, Send, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useSinotrukSupplierManagement, SinotrukSupplierOrder } from '@/hooks/useSinotrukSupplierManagement';
import { SinotrukSupplierOrderDetailsModal } from './SinotrukSupplierOrderDetailsModal';

const milestoneColors = {
  'order_received': 'bg-blue-100 text-blue-800',
  'production_started': 'bg-yellow-100 text-yellow-800',
  'chassis_assembly': 'bg-orange-100 text-orange-800',
  'body_assembly': 'bg-purple-100 text-purple-800',
  'interior_installation': 'bg-indigo-100 text-indigo-800',
  'quality_inspection': 'bg-pink-100 text-pink-800',
  'final_testing': 'bg-teal-100 text-teal-800',
  'ready_for_shipment': 'bg-green-100 text-green-800'
};

export function SinotrukSupplierManagement() {
  const [supplierOrders, setSupplierOrders] = useState<SinotrukSupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SinotrukSupplierOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  const { 
    getSupplierOrders, 
    updateSupplierOrderMilestone, 
    transmitOrderToSinotruk,
    milestoneLabels 
  } = useSinotrukSupplierManagement();

  const loadSupplierOrders = async () => {
    try {
      setLoading(true);
      const result = await getSupplierOrders();
      if (result.success) {
        setSupplierOrders(result.data || []);
      }
    } catch (error) {
      console.error('Error loading supplier orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplierOrders();
  }, []);

  const handleMilestoneUpdate = async (supplierOrderId: string, newMilestone: string) => {
    const result = await updateSupplierOrderMilestone(supplierOrderId, newMilestone);
    if (result.success) {
      loadSupplierOrders();
    }
  };

  const handleTransmitOrder = async (supplierOrderId: string) => {
    const result = await transmitOrderToSinotruk(supplierOrderId, {});
    if (result.success) {
      loadSupplierOrders();
    }
  };

  const getMilestoneBadge = (milestone: string) => {
    const label = milestoneLabels[milestone as keyof typeof milestoneLabels] || milestone;
    const colorClass = milestoneColors[milestone as keyof typeof milestoneColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {label}
      </Badge>
    );
  };

  const columns: ColumnDef<SinotrukSupplierOrder>[] = [
    {
      header: "Order Details",
      cell: ({ row }) => {
        const order = (row.original as any).sinotruck_orders;
        return (
          <div>
            <div className="font-medium">{order?.order_no}</div>
            <div className="text-sm text-muted-foreground">
              {order?.bus_model} (Qty: {order?.quantity})
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "sinotruck_order_reference",
      header: "Sinotruk Ref",
      cell: ({ row }) => {
        const ref = row.getValue("sinotruck_order_reference") as string;
        return ref ? (
          <div className="font-mono text-sm">{ref}</div>
        ) : (
          <Badge variant="outline">Not Transmitted</Badge>
        );
      },
    },
    {
      accessorKey: "chassis_number",
      header: "Chassis & Engine",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>Chassis: {row.getValue("chassis_number") || 'TBD'}</div>
          <div>Engine: {row.original.engine_number || 'TBD'}</div>
        </div>
      ),
    },
    {
      accessorKey: "current_milestone",
      header: "Production Status",
      cell: ({ row }) => getMilestoneBadge(row.getValue("current_milestone")),
    },
    {
      accessorKey: "production_progress_percentage",
      header: "Progress",
      cell: ({ row }) => {
        const progress = row.getValue("production_progress_percentage") as number || 0;
        return (
          <div className="space-y-1">
            <Progress value={progress} className="w-full h-2" />
            <div className="text-xs text-center">{Math.round(progress)}%</div>
          </div>
        );
      },
    },
    {
      accessorKey: "estimated_completion_date",
      header: "Est. Completion",
      cell: ({ row }) => {
        const date = row.getValue("estimated_completion_date");
        return date ? format(new Date(date as string), 'MMM dd, yyyy') : '-';
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const supplierOrder = row.original;
        const hasSinotrukRef = Boolean(supplierOrder.sinotruck_order_reference);
        
        return (
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedOrder(supplierOrder);
                setShowOrderDetails(true);
              }}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {!hasSinotrukRef && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleTransmitOrder(supplierOrder.id)}
                title="Transmit to Sinotruk"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
            
            <Select
              value={supplierOrder.current_milestone}
              onValueChange={(value) => handleMilestoneUpdate(supplierOrder.id, value)}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(milestoneLabels).map(([milestone, label]) => (
                  <SelectItem key={milestone} value={milestone}>
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Supplier & Production Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={supplierOrders}
            searchKey="sinotruck_order_reference"
          />
        </CardContent>
      </Card>

      {showOrderDetails && selectedOrder && (
        <SinotrukSupplierOrderDetailsModal
          supplierOrder={selectedOrder}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          onRefresh={loadSupplierOrders}
        />
      )}
    </>
  );
}