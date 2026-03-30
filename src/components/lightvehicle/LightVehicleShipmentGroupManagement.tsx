import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Ship, 
  Plus, 
  Search,
  Package,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react';
import { ShipmentGroup, useLightVehicleShipmentGroupManagement } from '@/hooks/useLightVehicleShipmentGroupManagement';
import { LightVehicleShipmentGroupCard } from './LightVehicleShipmentGroupCard';
import { LightVehicleCreateShipmentGroupModal } from './LightVehicleCreateShipmentGroupModal';
import { LightVehicleAddOrdersToShipmentModal } from './LightVehicleAddOrdersToShipmentModal';
import { LightVehicleBulkUpdateModal } from './LightVehicleBulkUpdateModal';
import { EnhancedLightVehicleOrderDetailsModal } from './EnhancedLightVehicleOrderDetailsModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusTabs = [
  { value: 'all', label: 'All', icon: Package },
  { value: 'planning', label: 'Planning', icon: Clock },
  { value: 'confirmed', label: 'Confirmed', icon: TrendingUp },
  { value: 'in_transit', label: 'In Transit', icon: Ship },
  { value: 'customs', label: 'Customs', icon: Package },
  { value: 'delivered', label: 'Delivered', icon: Calendar },
];

export function LightVehicleShipmentGroupManagement() {
  const [shipments, setShipments] = useState<ShipmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<ShipmentGroup | null>(null);
  const [addOrdersShipment, setAddOrdersShipment] = useState<ShipmentGroup | null>(null);
  const [bulkUpdateShipment, setBulkUpdateShipment] = useState<ShipmentGroup | null>(null);
  const [deleteConfirmShipment, setDeleteConfirmShipment] = useState<ShipmentGroup | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { getShipmentGroups, deleteShipmentGroup } = useLightVehicleShipmentGroupManagement();

  const loadShipments = async () => {
    setLoading(true);
    const result = await getShipmentGroups();
    if (result.success) {
      setShipments(result.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirmShipment) return;
    const result = await deleteShipmentGroup(deleteConfirmShipment.id);
    if (result.success) {
      loadShipments();
    }
    setDeleteConfirmShipment(null);
  };

  // Filter shipments
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.shipment_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.shipment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = activeTab === 'all' || shipment.status === activeTab;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: shipments.length,
    planning: shipments.filter(s => s.status === 'planning').length,
    inTransit: shipments.filter(s => s.status === 'in_transit').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    totalOrders: shipments.reduce((sum, s) => sum + (s.orders?.length || 0), 0),
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Ship className="h-6 w-6 text-primary" />
              Shipment Management
            </h2>
            <p className="text-muted-foreground">
              Group and manage orders by shipment batches
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Shipment Group
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Shipments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.planning}</div>
              <div className="text-sm text-muted-foreground">Planning</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.inTransit}</div>
              <div className="text-sm text-muted-foreground">In Transit</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.totalOrders}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Tabs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shipments..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4">
                {statusTabs.map(tab => {
                  const count = tab.value === 'all' 
                    ? shipments.length 
                    : shipments.filter(s => s.status === tab.value).length;
                  return (
                    <TabsTrigger key={tab.value} value={tab.value} className="gap-1">
                      <tab.icon className="h-4 w-4 hidden sm:inline" />
                      {tab.label}
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading shipments...
                  </div>
                ) : filteredShipments.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? 'No shipments match your search' : 'No shipment groups yet'}
                    </p>
                    <Button onClick={() => setShowCreateModal(true)} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Shipment Group
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredShipments.map(shipment => (
                      <LightVehicleShipmentGroupCard
                        key={shipment.id}
                        shipment={shipment}
                        onEdit={(s) => setEditingShipment(s)}
                        onDelete={(s) => setDeleteConfirmShipment(s)}
                        onAddOrders={(s) => setAddOrdersShipment(s)}
                        onBulkUpdate={(s) => setBulkUpdateShipment(s)}
                        onViewOrder={(order) => setSelectedOrder(order)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingShipment) && (
        <LightVehicleCreateShipmentGroupModal
          open={showCreateModal || !!editingShipment}
          onClose={() => {
            setShowCreateModal(false);
            setEditingShipment(null);
          }}
          onSuccess={loadShipments}
          editShipment={editingShipment}
        />
      )}

      {/* Add Orders Modal */}
      {addOrdersShipment && (
        <LightVehicleAddOrdersToShipmentModal
          open={!!addOrdersShipment}
          onClose={() => setAddOrdersShipment(null)}
          onSuccess={loadShipments}
          shipment={addOrdersShipment}
        />
      )}

      {/* Bulk Update Modal */}
      {bulkUpdateShipment && (
        <LightVehicleBulkUpdateModal
          open={!!bulkUpdateShipment}
          onClose={() => setBulkUpdateShipment(null)}
          onSuccess={loadShipments}
          shipment={bulkUpdateShipment}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmShipment} onOpenChange={() => setDeleteConfirmShipment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the shipment group "{deleteConfirmShipment?.shipment_name}". 
              Orders in this group will become unassigned but will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Details Modal */}
      {selectedOrder && (
        <EnhancedLightVehicleOrderDetailsModal
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={loadShipments}
        />
      )}
    </>
  );
}
