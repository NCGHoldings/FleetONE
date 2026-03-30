// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Upload, Image, Eye, Copy, Images, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SinotrukBusModelProfile } from './SinotrukBusModelProfile';
import { SinotrukImageManager } from './SinotrukImageManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  bus_name: z.string().min(1, 'Bus name is required'),
  model: z.string().min(1, 'Model is required'),
  seating_capacity: z.string().min(1, 'Seating capacity is required'),
  engine: z.string().min(1, 'Engine is required'),
  manufactured_year: z.number().min(1900, 'Valid year required').max(new Date().getFullYear() + 1),
  condition: z.string().min(1, 'Condition is required'),
  unit_price: z.number().min(1, 'Unit price is required'),
  is_active: z.boolean().default(true),
  visibility: z.enum(['all', 'super_admin_only']).default('all'),
  // New detailed specification fields
  overall_dimension_mm: z.string().optional(),
  wheel_base_mm: z.string().optional(),
  minimum_turning_diameter_m: z.string().optional(),
  emission: z.string().optional(),
  transmission: z.string().optional(),
  clutch: z.string().optional(),
  retarder: z.string().optional(),
  axle: z.string().optional(),
  maintenance_free_wheel_edge: z.string().optional(),
  brake_system: z.string().optional(),
  suspension_system: z.string().optional(),
  tire: z.string().optional(),
  fuel_tank_capacity_l: z.string().optional(),
  cool_box: z.string().optional(),
  rearview_mirror: z.string().optional(),
  interior_lights: z.string().optional(),
  audiovisual_system: z.string().optional(),
  middle: z.string().optional(),
  front_windshield: z.string().optional(),
  luggage_capacity: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface BusModel {
  id: string;
  bus_name: string;
  model_name: string; // This maps to 'model' in our form
  capacity: string; // This maps to 'seating_capacity' in our form - changed to string
  engine: string;
  manufactured_year: number;
  condition: string;
  base_price: number; // This maps to 'unit_price' in our form
  is_active: boolean;
  visibility?: string;
  created_at: string;
  image_url?: string;
  // New detailed specification fields
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

export function SinotrukBusModelsAdmin() {
  const [busModels, setBusModels] = useState<BusModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<BusModel | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<BusModel | null>(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [managingModelId, setManagingModelId] = useState<string | null>(null);
  const [imageCountsMap, setImageCountsMap] = useState<Record<string, { count: number; primaryImage: string | null }>>({});
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true,
      visibility: 'all'
    }
  });

  const loadBusModels = async () => {
    try {
      setLoading(true);
      console.log('Loading bus models...');
      const { data, error } = await (supabase as any)
        .from('sinotruck_bus_models')
        .select('*')
        .order('bus_name');

      console.log('Bus models query result:', { data, error });

      if (error) throw error;
      setBusModels((data || []).map(model => ({
        ...model,
        capacity: model.capacity?.toString() || ''
      })));
      
      // Load image counts and primary images for each model
      if (data && data.length > 0) {
        const imageCountsPromises = data.map(async (model) => {
          const { data: images } = await (supabase as any)
            .from('sinotruck_bus_model_images')
            .select('id, image_url, is_primary')
            .eq('bus_model_id', model.id);
          
          const primaryImage = images?.find(img => img.is_primary)?.image_url || images?.[0]?.image_url || null;
          
          return {
            id: model.id,
            count: images?.length || 0,
            primaryImage
          };
        });
        
        const imageCounts = await Promise.all(imageCountsPromises);
        const countsMap = imageCounts.reduce((acc, { id, count, primaryImage }) => {
          acc[id] = { count, primaryImage };
          return acc;
        }, {} as Record<string, { count: number; primaryImage: string | null }>);
        
        setImageCountsMap(countsMap);
      }
      
      console.log('Bus models loaded successfully:', data?.length || 0, 'records');
    } catch (error: any) {
      console.error('Error loading bus models:', error);
      toast({
        title: "Error",
        description: "Failed to load bus models",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusModels();
  }, []);

  const handleImageUpload = async (file: File, modelId: string) => {
    try {
      setUploadingImage(modelId);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${modelId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sinotruck-bus-models')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sinotruck-bus-models')
        .getPublicUrl(filePath);

      const { error: updateError } = await (supabase as any)
        .from('sinotruck_bus_models')
        .update({ image_url: publicUrl })
        .eq('id', modelId);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Image uploaded successfully" });
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSubmit = async (data: FormData) => {
    try {
      // Map form data to database column names
      const dbData = {
        bus_name: data.bus_name,
        model_name: data.model,
        capacity: data.seating_capacity,
        engine: data.engine,
        manufactured_year: data.manufactured_year,
        condition: data.condition,
        base_price: data.unit_price,
        is_active: data.is_active,
        visibility: data.visibility || 'all',
        // New detailed specification fields
        overall_dimension_mm: data.overall_dimension_mm || null,
        wheel_base_mm: data.wheel_base_mm || null,
        minimum_turning_diameter_m: data.minimum_turning_diameter_m || null,
        emission: data.emission || null,
        transmission: data.transmission || null,
        clutch: data.clutch || null,
        retarder: data.retarder || null,
        axle: data.axle || null,
        maintenance_free_wheel_edge: data.maintenance_free_wheel_edge || null,
        brake_system: data.brake_system || null,
        suspension_system: data.suspension_system || null,
        tire: data.tire || null,
        fuel_tank_capacity_l: data.fuel_tank_capacity_l || null,
        cool_box: data.cool_box || null,
        rearview_mirror: data.rearview_mirror || null,
        interior_lights: data.interior_lights || null,
        audiovisual_system: data.audiovisual_system || null,
        middle: data.middle || null,
        front_windshield: data.front_windshield || null,
        luggage_capacity: data.luggage_capacity || null
      };

      if (editingModel) {
        const { error } = await (supabase as any)
          .from('sinotruck_bus_models')
          .update(dbData)
          .eq('id', editingModel.id);

        if (error) throw error;
        toast({ title: "Success", description: "Bus model updated successfully" });
      } else {
        const { error } = await (supabase as any)
          .from('sinotruck_bus_models')
          .insert([dbData]);

        if (error) throw error;
        toast({ title: "Success", description: "Bus model created successfully" });
      }

      setShowDialog(false);
      setEditingModel(null);
      form.reset();
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (model: BusModel) => {
    setEditingModel(model);
    // Map database fields to form fields
    form.reset({
      bus_name: model.bus_name,
      model: model.model_name,
      seating_capacity: model.capacity || '',
      engine: model.engine,
      manufactured_year: model.manufactured_year,
      condition: model.condition,
      unit_price: model.base_price,
      is_active: model.is_active,
      visibility: (model.visibility as 'all' | 'super_admin_only') || 'all',
      // New detailed specification fields
      overall_dimension_mm: model.overall_dimension_mm || '',
      wheel_base_mm: model.wheel_base_mm || '',
      minimum_turning_diameter_m: model.minimum_turning_diameter_m || '',
      emission: model.emission || '',
      transmission: model.transmission || '',
      clutch: model.clutch || '',
      retarder: model.retarder || '',
      axle: model.axle || '',
      maintenance_free_wheel_edge: model.maintenance_free_wheel_edge || '',
      brake_system: model.brake_system || '',
      suspension_system: model.suspension_system || '',
      tire: model.tire || '',
      fuel_tank_capacity_l: model.fuel_tank_capacity_l || '',
      cool_box: model.cool_box || '',
      rearview_mirror: model.rearview_mirror || '',
      interior_lights: model.interior_lights || '',
      audiovisual_system: model.audiovisual_system || '',
      middle: model.middle || '',
      front_windshield: model.front_windshield || '',
      luggage_capacity: model.luggage_capacity || ''
    });
    setShowDialog(true);
  };

  const handleViewProfile = (model: BusModel) => {
    setSelectedModel(model);
    setIsProfileModalOpen(true);
  };

  const handleDuplicate = async (model: BusModel) => {
    try {
      const dbData = {
        bus_name: `${model.bus_name} (Copy)`,
        model_name: model.model_name,
        capacity: model.capacity,
        engine: model.engine,
        manufactured_year: model.manufactured_year,
        condition: model.condition,
        base_price: model.base_price,
        is_active: model.is_active,
        visibility: model.visibility || 'all',
        overall_dimension_mm: model.overall_dimension_mm || null,
        wheel_base_mm: model.wheel_base_mm || null,
        minimum_turning_diameter_m: model.minimum_turning_diameter_m || null,
        emission: model.emission || null,
        transmission: model.transmission || null,
        clutch: model.clutch || null,
        retarder: model.retarder || null,
        axle: model.axle || null,
        maintenance_free_wheel_edge: model.maintenance_free_wheel_edge || null,
        brake_system: model.brake_system || null,
        suspension_system: model.suspension_system || null,
        tire: model.tire || null,
        fuel_tank_capacity_l: model.fuel_tank_capacity_l || null,
        cool_box: model.cool_box || null,
        rearview_mirror: model.rearview_mirror || null,
        interior_lights: model.interior_lights || null,
        audiovisual_system: model.audiovisual_system || null,
        middle: model.middle || null,
        front_windshield: model.front_windshield || null,
        luggage_capacity: model.luggage_capacity || null
      };

      const { error } = await (supabase as any)
        .from('sinotruck_bus_models')
        .insert([dbData]);

      if (error) throw error;
      toast({ title: "Success", description: "Bus model duplicated successfully" });
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bus model?')) return;

    try {
      const { error } = await (supabase as any)
        .from('sinotruck_bus_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Bus model deleted successfully" });
      loadBusModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sinotruk Bus Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading bus models...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sinotruk Bus Models</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingModel(null);
                form.reset({ is_active: true });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bus Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? 'Edit Bus Model' : 'Add New Bus Model'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bus_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bus Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Sinotruk ZK6129H" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., ZK6129H" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="seating_capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seating Capacity</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 49 seats"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="engine"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Engine</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., YC6L280-30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="manufactured_year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufactured Year</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1900"
                                max={new Date().getFullYear() + 1}
                                placeholder="e.g., 2024"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., New, Used, Refurbished" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unit_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price (LKR)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 12500000"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Detailed Specifications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Detailed Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="overall_dimension_mm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overall Dimension (mm)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 12000x2550x3200" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="wheel_base_mm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wheel Base (mm)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 6150" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minimum_turning_diameter_m"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Turning Diameter (m)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 22" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emission"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emission</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Euro VI" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transmission"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transmission</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Manual/Automatic" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="clutch"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Clutch</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Single plate dry clutch" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="retarder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Retarder</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Engine brake" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="axle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Axle</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Front/Rear axle specifications" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maintenance_free_wheel_edge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maintenance-free Wheel Edge</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Yes/No" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="brake_system"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brake System</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Air brake system" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="suspension_system"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Suspension System</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Air suspension" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tire"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tire</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 295/80R22.5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fuel_tank_capacity_l"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fuel Tank Capacity (L)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 300" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cool_box"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cool Box</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Available/Not available" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rearview_mirror"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rearview Mirror</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Electric adjustable" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="interior_lights"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interior Lights</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., LED lights" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="audiovisual_system"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Audiovisual System</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Entertainment system specifications" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="middle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Middle section specifications" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="front_windshield"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Front Windshield</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Laminated safety glass" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="luggage_capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Luggage Capacity</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 8.5 cubic meters" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Active</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visibility</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'all'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select visibility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="super_admin_only">Super Admin Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingModel ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {busModels.map((model) => (
            <Card key={model.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {imageCountsMap[model.id]?.primaryImage ? (
                  <img
                    src={imageCountsMap[model.id].primaryImage!}
                    alt={model.bus_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {imageCountsMap[model.id]?.count > 0 && (
                  <Badge className="absolute top-2 left-2 bg-black/60 text-white">
                    <Images className="h-3 w-3 mr-1" />
                    {imageCountsMap[model.id].count}
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{model.bus_name}</h3>
                      {model.visibility === 'super_admin_only' && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Restricted
                        </Badge>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      model.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium">Model:</span> {model.model_name}</p>
                    <p><span className="font-medium">Capacity:</span> {model.capacity}</p>
                    <p><span className="font-medium">Year:</span> {model.manufactured_year}</p>
                    <p><span className="font-medium">Condition:</span> {model.condition}</p>
                    <p><span className="font-medium">Engine:</span> {model.engine}</p>
                  </div>
                  
                  <div className="text-lg font-bold text-primary">
                    LKR {model.base_price.toLocaleString()}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleViewProfile(model)}
                      className="col-span-2"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        setManagingModelId(model.id);
                        setImageManagerOpen(true);
                      }}
                      className="col-span-2"
                    >
                      <Images className="h-4 w-4 mr-1" />
                      Manage Images
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(model)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDuplicate(model)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(model.id)}
                      className="col-span-2"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {busModels.length === 0 && (
          <div className="text-center py-12">
            <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No bus models found</h3>
            <p className="text-muted-foreground">Get started by adding your first bus model.</p>
          </div>
        )}
      </CardContent>
      
      <SinotrukBusModelProfile
        busModel={selectedModel}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedModel(null);
        }}
      />
      
      {managingModelId && (
        <SinotrukImageManager
          busModelId={managingModelId}
          busModelName={busModels.find(m => m.id === managingModelId)?.bus_name || ''}
          isOpen={imageManagerOpen}
          onClose={() => {
            setImageManagerOpen(false);
            setManagingModelId(null);
          }}
          onUpdate={() => {
            loadBusModels();
          }}
        />
      )}
    </Card>
  );
}
