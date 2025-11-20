import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Truck, Calendar, Settings, Fuel, Shield, Users, Gauge, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SinotruckImageGallery } from './SinotruckImageGallery';

interface TruckModel {
  id: string;
  truck_name: string;
  model_name: string;
  body_type?: string;
  drive_configuration?: string;
  year: number;
  condition: string;
  base_price: number;
  charger_price?: number;
  engine_model?: string;
  horsepower?: string;
  engine_type?: string;
  emission_standard?: string;
  displacement?: string;
  torque?: string;
  fuel_type?: string;
  fuel_tank_capacity?: string;
  transmission_model?: string;
  transmission_type?: string;
  gears?: string;
  clutch_type?: string;
  front_axle_capacity?: string;
  rear_axle_capacity?: string;
  suspension_type?: string;
  wheelbase?: string;
  tyre_size?: string;
  tyre_quantity?: string;
  rim_type?: string;
  cabin_model?: string;
  seating_capacity?: string;
  cabin_features?: string[];
  driver_seat_type?: string;
  overall_dimensions?: string;
  gvw_gcw?: string;
  payload_capacity?: string;
  curb_weight?: string;
  max_speed?: string;
  gradeability?: string;
  turning_radius?: string;
  abs_system?: boolean;
  cameras?: string;
  gps_tracking?: boolean;
  multimedia_system?: string;
  body_dimensions?: string;
  body_volume?: string;
  special_features?: any;
}

interface SinotruckTruckModelProfileProps {
  truckModel: TruckModel | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SinotruckTruckModelProfile({ truckModel, isOpen, onClose }: SinotruckTruckModelProfileProps) {
  const [images, setImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    if (truckModel && isOpen) {
      loadImages();
    }
  }, [truckModel?.id, isOpen]);

  const loadImages = async () => {
    if (!truckModel) return;
    
    try {
      setLoadingImages(true);
      const { data, error } = await supabase
        .from('sinotruck_truck_model_images')
        .select('*')
        .eq('truck_model_id', truckModel.id)
        .order('display_order');

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  if (!truckModel) return null;

  const formatPrice = (price: number) => {
    return `LKR ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price)}`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'new':
      case 'brand new':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'used':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            {truckModel.truck_name}
          </DialogTitle>
          <p className="text-muted-foreground">Model: {truckModel.model_name}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Gallery */}
          {!loadingImages && images.length > 0 && (
            <SinotruckImageGallery images={images} />
          )}

          {/* Key Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{truckModel.horsepower || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">Horsepower</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Truck className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{truckModel.drive_configuration || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">Configuration</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Fuel className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{truckModel.emission_standard || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">Emission</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{truckModel.payload_capacity || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">Payload</div>
              </CardContent>
            </Card>
          </div>

          {/* Price and Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="text-3xl font-bold text-primary">{formatPrice(truckModel.base_price)}</p>
                  {truckModel.charger_price && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Charger: {formatPrice(truckModel.charger_price)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge className={getConditionColor(truckModel.condition)}>
                    {truckModel.condition}
                  </Badge>
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {truckModel.year}
                  </Badge>
                  {truckModel.body_type && (
                    <Badge variant="secondary">{truckModel.body_type}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engine & Performance */}
          {(truckModel.engine_model || truckModel.horsepower) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Engine & Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {truckModel.engine_model && (
                    <div>
                      <p className="text-sm text-muted-foreground">Engine Model</p>
                      <p className="font-medium">{truckModel.engine_model}</p>
                    </div>
                  )}
                  {truckModel.horsepower && (
                    <div>
                      <p className="text-sm text-muted-foreground">Power Output</p>
                      <p className="font-medium">{truckModel.horsepower}</p>
                    </div>
                  )}
                  {truckModel.engine_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Engine Type</p>
                      <p className="font-medium">{truckModel.engine_type}</p>
                    </div>
                  )}
                  {truckModel.displacement && (
                    <div>
                      <p className="text-sm text-muted-foreground">Displacement</p>
                      <p className="font-medium">{truckModel.displacement}</p>
                    </div>
                  )}
                  {truckModel.torque && (
                    <div>
                      <p className="text-sm text-muted-foreground">Torque</p>
                      <p className="font-medium">{truckModel.torque}</p>
                    </div>
                  )}
                  {truckModel.fuel_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fuel Type</p>
                      <p className="font-medium">{truckModel.fuel_type}</p>
                    </div>
                  )}
                  {truckModel.fuel_tank_capacity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fuel Tank</p>
                      <p className="font-medium">{truckModel.fuel_tank_capacity}</p>
                    </div>
                  )}
                  {truckModel.max_speed && (
                    <div>
                      <p className="text-sm text-muted-foreground">Max Speed</p>
                      <p className="font-medium">{truckModel.max_speed}</p>
                    </div>
                  )}
                  {truckModel.gradeability && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gradeability</p>
                      <p className="font-medium">{truckModel.gradeability}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transmission & Driveline */}
          {truckModel.transmission_model && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Transmission & Driveline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transmission Model</p>
                    <p className="font-medium">{truckModel.transmission_model}</p>
                  </div>
                  {truckModel.transmission_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{truckModel.transmission_type}</p>
                    </div>
                  )}
                  {truckModel.gears && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gears</p>
                      <p className="font-medium">{truckModel.gears}</p>
                    </div>
                  )}
                  {truckModel.clutch_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Clutch</p>
                      <p className="font-medium">{truckModel.clutch_type}</p>
                    </div>
                  )}
                  {truckModel.front_axle_capacity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Front Axle</p>
                      <p className="font-medium">{truckModel.front_axle_capacity}</p>
                    </div>
                  )}
                  {truckModel.rear_axle_capacity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Rear Axle</p>
                      <p className="font-medium">{truckModel.rear_axle_capacity}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cabin & Comfort */}
          {truckModel.cabin_model && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cabin & Comfort
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cabin Model</p>
                    <p className="font-medium">{truckModel.cabin_model}</p>
                  </div>
                  {truckModel.seating_capacity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Seating</p>
                      <p className="font-medium">{truckModel.seating_capacity}</p>
                    </div>
                  )}
                  {truckModel.driver_seat_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Driver Seat</p>
                      <p className="font-medium">{truckModel.driver_seat_type}</p>
                    </div>
                  )}
                  {truckModel.cabin_features && truckModel.cabin_features.length > 0 && (
                    <div className="col-span-full">
                      <p className="text-sm text-muted-foreground mb-2">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {truckModel.cabin_features.map((feature, idx) => (
                          <Badge key={idx} variant="secondary">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Safety & Electronics */}
          {(truckModel.abs_system || truckModel.cameras || truckModel.gps_tracking) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Safety & Electronics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {truckModel.abs_system && (
                    <div>
                      <p className="text-sm text-muted-foreground">ABS System</p>
                      <p className="font-medium">✓ Equipped</p>
                    </div>
                  )}
                  {truckModel.cameras && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cameras</p>
                      <p className="font-medium">{truckModel.cameras}</p>
                    </div>
                  )}
                  {truckModel.gps_tracking && (
                    <div>
                      <p className="text-sm text-muted-foreground">GPS Tracking</p>
                      <p className="font-medium">✓ Equipped</p>
                    </div>
                  )}
                  {truckModel.multimedia_system && (
                    <div>
                      <p className="text-sm text-muted-foreground">Multimedia</p>
                      <p className="font-medium">{truckModel.multimedia_system}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dimensions & Performance */}
          {(truckModel.overall_dimensions || truckModel.gvw_gcw) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Dimensions & Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {truckModel.overall_dimensions && (
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Dimensions</p>
                      <p className="font-medium">{truckModel.overall_dimensions}</p>
                    </div>
                  )}
                  {truckModel.wheelbase && (
                    <div>
                      <p className="text-sm text-muted-foreground">Wheelbase</p>
                      <p className="font-medium">{truckModel.wheelbase}</p>
                    </div>
                  )}
                  {truckModel.gvw_gcw && (
                    <div>
                      <p className="text-sm text-muted-foreground">GVW/GCW</p>
                      <p className="font-medium">{truckModel.gvw_gcw}</p>
                    </div>
                  )}
                  {truckModel.payload_capacity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payload Capacity</p>
                      <p className="font-medium">{truckModel.payload_capacity}</p>
                    </div>
                  )}
                  {truckModel.curb_weight && (
                    <div>
                      <p className="text-sm text-muted-foreground">Curb Weight</p>
                      <p className="font-medium">{truckModel.curb_weight}</p>
                    </div>
                  )}
                  {truckModel.turning_radius && (
                    <div>
                      <p className="text-sm text-muted-foreground">Turning Radius</p>
                      <p className="font-medium">{truckModel.turning_radius}</p>
                    </div>
                  )}
                  {truckModel.body_dimensions && (
                    <div>
                      <p className="text-sm text-muted-foreground">Body Dimensions</p>
                      <p className="font-medium">{truckModel.body_dimensions}</p>
                    </div>
                  )}
                  {truckModel.body_volume && (
                    <div>
                      <p className="text-sm text-muted-foreground">Body Volume</p>
                      <p className="font-medium">{truckModel.body_volume}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Features */}
          {truckModel.special_features && Object.keys(truckModel.special_features).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Special Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(truckModel.special_features).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
