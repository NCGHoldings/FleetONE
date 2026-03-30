import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bus, Calendar, Settings, Fuel, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SinotrukImageGallery } from './SinotrukImageGallery';

interface BusModel {
  id: string;
  bus_name: string;
  model_name: string;
  capacity: string;
  base_price: number;
  engine: string;
  manufactured_year: number;
  condition: string;
  image_url?: string;
  overall_dimension_mm?: string;
  wheel_base_mm?: string;
  minimum_turning_diameter_m?: string;
  emission?: string;
  transmission?: string;
  clutch?: string;
  retarder?: string;
  axle?: string;
  maintenance_free_wheel_edge?: string;
  brake_system?: string;
  suspension_system?: string;
  tire?: string;
  fuel_tank_capacity_l?: string;
  cool_box?: string;
  rearview_mirror?: string;
  interior_lights?: string;
  audiovisual_system?: string;
  middle?: string;
  front_windshield?: string;
  luggage_capacity?: string;
}

interface SinotrukBusModelProfileProps {
  busModel: BusModel | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SinotrukBusModelProfile({ busModel, isOpen, onClose }: SinotrukBusModelProfileProps) {
  const [images, setImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    if (busModel && isOpen) {
      loadImages();
    }
  }, [busModel?.id, isOpen]);

  const loadImages = async () => {
    if (!busModel) return;
    
    try {
      setLoadingImages(true);
      const { data, error } = await (supabase as any)
        .from('sinotruck_bus_model_images')
        .select('*')
        .eq('bus_model_id', busModel.id)
        .order('display_order');

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  if (!busModel) return null;

  const formatPrice = (price: number) => {
    return `LKR ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price)}`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'new':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'used':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'refurbished':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const specifications = [
    { label: 'Overall Dimension', value: busModel.overall_dimension_mm, unit: 'mm' },
    { label: 'Wheel Base', value: busModel.wheel_base_mm, unit: 'mm' },
    { label: 'Turning Diameter', value: busModel.minimum_turning_diameter_m, unit: 'm' },
    { label: 'Emission Standard', value: busModel.emission },
    { label: 'Transmission', value: busModel.transmission },
    { label: 'Clutch', value: busModel.clutch },
    { label: 'Retarder', value: busModel.retarder },
    { label: 'Axle', value: busModel.axle },
    { label: 'Brake System', value: busModel.brake_system },
    { label: 'Suspension', value: busModel.suspension_system },
    { label: 'Tire', value: busModel.tire },
    { label: 'Fuel Tank Capacity', value: busModel.fuel_tank_capacity_l, unit: 'L' },
  ];

  const features = [
    { label: 'Cool Box', value: busModel.cool_box },
    { label: 'Rearview Mirror', value: busModel.rearview_mirror },
    { label: 'Interior Lights', value: busModel.interior_lights },
    { label: 'Audiovisual System', value: busModel.audiovisual_system },
    { label: 'Middle Section', value: busModel.middle },
    { label: 'Front Windshield', value: busModel.front_windshield },
    { label: 'Luggage Capacity', value: busModel.luggage_capacity },
    { label: 'Maintenance Free Wheel', value: busModel.maintenance_free_wheel_edge },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Bus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-left">
                {busModel.bus_name}
              </DialogTitle>
              <p className="text-muted-foreground text-left">{busModel.model_name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Image Gallery */}
          {loadingImages ? (
            <div className="aspect-video bg-muted flex items-center justify-center rounded-lg">
              <p className="text-muted-foreground">Loading images...</p>
            </div>
          ) : (
            <SinotrukImageGallery images={images} />
          )}
          {/* Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{busModel.capacity}</p>
                <p className="text-sm text-muted-foreground">Capacity</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{busModel.manufactured_year}</p>
                <p className="text-sm text-muted-foreground">Year</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-lg font-semibold">{busModel.engine}</p>
                <p className="text-sm text-muted-foreground">Engine</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <Badge className={getConditionColor(busModel.condition)}>
                  {busModel.condition}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">Condition</p>
              </CardContent>
            </Card>
          </div>

          {/* Price */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Base Price</p>
              <p className="text-4xl font-bold text-primary">{formatPrice(busModel.base_price)}</p>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specifications.filter(spec => spec.value).map((spec, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span className="font-medium">
                      {spec.value} {spec.unit && <span className="text-muted-foreground">{spec.unit}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features & Comfort */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Features & Comfort
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.filter(feature => feature.value).map((feature, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-muted-foreground">{feature.label}</span>
                    <span className="font-medium">{feature.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}