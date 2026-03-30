import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Ship, ChevronDown, ChevronRight, Car, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ShipmentWithVehicles {
  id: string;
  shipment_number: string;
  shipment_name: string;
  status: string;
  expected_arrival_date: string | null;
  vehicles: {
    id: string;
    model: string;
    engine_no: string | null;
    chassis_no: string | null;
    customer_name: string | null;
    is_matched: boolean;
    color: string | null;
  }[];
}

export function LightVehicleShipmentVehicleView() {
  const [shipments, setShipments] = useState<ShipmentWithVehicles[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadShipments = async () => {
    setIsLoading(true);
    try {
      // Fetch shipments
      const { data: shipmentData, error: shipmentError } = await (supabase as any)
        .from('lightvehicle_shipment_groups')
        .select('id, shipment_no, shipment_name, status, expected_arrival_date')
        .order('created_at', { ascending: false });

      if (shipmentError) throw shipmentError;

      // Fetch vehicles for each shipment
      const shipmentsWithVehicles = await Promise.all(
        (shipmentData || []).map(async (shipment: any) => {
          const { data: vehicles } = await supabase
            .from('lightvehicle_vehicle_records')
            .select('id, model, engine_no, chassis_no, customer_name, is_matched, color')
            .eq('shipment_group_id', shipment.id);

          return {
            ...shipment,
            shipment_number: shipment.shipment_no,
            vehicles: vehicles || []
          };
        })
      );

      setShipments(shipmentsWithVehicles);
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500';
      case 'in_transit':
        return 'bg-blue-500';
      case 'customs':
        return 'bg-orange-500';
      case 'confirmed':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const shipmentsWithVehicles = shipments.filter(s => s.vehicles.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Shipment-wise Vehicle View</h3>
        <Button variant="outline" size="sm" onClick={loadShipments}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {shipmentsWithVehicles.length === 0 ? (
        <Card className="p-12 text-center">
          <Ship className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No shipments with vehicle data</p>
          <p className="text-sm text-muted-foreground">Link vehicle data sheets to shipments to see them here</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {shipmentsWithVehicles.map(shipment => {
            const matchedCount = shipment.vehicles.filter(v => v.is_matched).length;
            const isExpanded = expandedIds.has(shipment.id);

            return (
              <Card key={shipment.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(shipment.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <Ship className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{shipment.shipment_number}</CardTitle>
                              <p className="text-sm text-muted-foreground">{shipment.shipment_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(shipment.status)}>
                              {shipment.status.replace('_', ' ')}
                            </Badge>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{shipment.vehicles.length}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {matchedCount} matched
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                            style={{ width: `${(matchedCount / shipment.vehicles.length) * 100}%` }}
                          />
                        </div>
                      </CardHeader>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        {shipment.expected_arrival_date && (
                          <p className="text-sm text-muted-foreground mb-4">
                            Expected Arrival: {format(new Date(shipment.expected_arrival_date), 'MMM dd, yyyy')}
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {shipment.vehicles.map(vehicle => (
                            <div
                              key={vehicle.id}
                              className={`p-3 rounded-lg border ${
                                vehicle.is_matched
                                  ? 'bg-green-500/5 border-green-500/20'
                                  : 'bg-muted/30 border-muted'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-sm">{vehicle.model}</p>
                                {vehicle.is_matched ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                {vehicle.engine_no && (
                                  <p>Engine: <span className="font-mono">{vehicle.engine_no}</span></p>
                                )}
                                {vehicle.chassis_no && (
                                  <p>Chassis: <span className="font-mono">{vehicle.chassis_no}</span></p>
                                )}
                                {vehicle.color && (
                                  <p>Color: {vehicle.color}</p>
                                )}
                                {vehicle.customer_name && (
                                  <p className="text-foreground">Customer: {vehicle.customer_name}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
