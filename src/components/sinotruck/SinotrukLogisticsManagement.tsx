import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { Truck, Ship, Eye, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useSinotrukLogisticsManagement, SinotrukShipment } from '@/hooks/useSinotrukLogisticsManagement';
import { SinotrukShipmentDetailsModal } from './SinotrukShipmentDetailsModal';
import { SinotrukCreateShipmentModal } from './SinotrukCreateShipmentModal';

const statusColors = {
  'preparing': 'bg-yellow-100 text-yellow-800',
  'booked': 'bg-blue-100 text-blue-800',
  'in_transit': 'bg-indigo-100 text-indigo-800',
  'arrived': 'bg-green-100 text-green-800',
  'customs_clearance': 'bg-orange-100 text-orange-800',
  'delivered': 'bg-emerald-100 text-emerald-800',
  'delayed': 'bg-red-100 text-red-800'
};

const shippingMethodLabels = {
  'roro': 'RoRo (Roll-on/Roll-off)',
  'container': 'Container'
};

export function SinotrukLogisticsManagement() {
  const [shipments, setShipments] = useState<SinotrukShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<SinotrukShipment | null>(null);
  const [showShipmentDetails, setShowShipmentDetails] = useState(false);
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  
  const { getShipments, updateShipmentStatus } = useSinotrukLogisticsManagement();

  const loadShipments = async () => {
    try {
      setLoading(true);
      const result = await getShipments();
      if (result.success) {
        setShipments(result.data || []);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const handleStatusUpdate = async (shipmentId: string, newStatus: string) => {
    const result = await updateShipmentStatus(shipmentId, newStatus);
    if (result.success) {
      loadShipments();
    }
  };

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const columns: ColumnDef<SinotrukShipment>[] = [
    {
      header: "Shipment Info",
      cell: ({ row }) => {
        const shipment = row.original;
        const order = (shipment as any).sinotruck_orders;
        return (
          <div>
            <div className="font-medium">{shipment.shipment_reference}</div>
            <div className="text-sm text-muted-foreground">
              {order?.order_no} - {order?.bus_model}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "shipping_method",
      header: "Shipping Method",
      cell: ({ row }) => {
        const method = row.getValue("shipping_method") as string;
        return (
          <Badge variant="outline">
            {shippingMethodLabels[method as keyof typeof shippingMethodLabels] || method}
          </Badge>
        );
      },
    },
    {
      header: "Shipping Partner",
      cell: ({ row }) => {
        const partner = (row.original as any).sinotruck_shipping_partners;
        return partner ? (
          <div>
            <div className="font-medium">{partner.partner_name}</div>
            <div className="text-sm text-muted-foreground">{partner.contact_email}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">Not assigned</span>
        );
      },
    },
    {
      header: "Route",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.departure_port}</div>
          <div className="text-xs text-muted-foreground">↓</div>
          <div>{row.original.arrival_port}</div>
        </div>
      ),
    },
    {
      accessorKey: "vessel_name",
      header: "Vessel/Container",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.getValue("vessel_name") || 'TBD'}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.container_number || 'No container'}
          </div>
        </div>
      ),
    },
    {
      header: "Dates",
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="text-sm">
            <div>
              <span className="font-medium">Dep:</span> {' '}
              {shipment.scheduled_departure_date ? 
                format(new Date(shipment.scheduled_departure_date), 'MMM dd') : 
                'TBD'
              }
            </div>
            <div>
              <span className="font-medium">Arr:</span> {' '}
              {shipment.estimated_arrival_date ? 
                format(new Date(shipment.estimated_arrival_date), 'MMM dd') : 
                'TBD'
              }
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "current_status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("current_status")),
    },
    {
      accessorKey: "tracking_number",
      header: "Tracking",
      cell: ({ row }) => {
        const tracking = row.getValue("tracking_number") as string;
        return tracking ? (
          <div className="font-mono text-xs">{tracking}</div>
        ) : (
          <span className="text-muted-foreground text-xs">No tracking</span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedShipment(shipment);
                setShowShipmentDetails(true);
              }}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              title="Documents"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Logistics & Shipping Management
          </CardTitle>
          <Button onClick={() => setShowCreateShipment(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Shipment
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={shipments}
            searchKey="shipment_reference"
          />
        </CardContent>
      </Card>

      {showShipmentDetails && selectedShipment && (
        <SinotrukShipmentDetailsModal
          shipment={selectedShipment}
          open={showShipmentDetails}
          onClose={() => {
            setShowShipmentDetails(false);
            setSelectedShipment(null);
          }}
          onRefresh={loadShipments}
        />
      )}

      {showCreateShipment && (
        <SinotrukCreateShipmentModal
          open={showCreateShipment}
          onClose={() => setShowCreateShipment(false)}
          onSuccess={() => {
            setShowCreateShipment(false);
            loadShipments();
          }}
        />
      )}
    </>
  );
}