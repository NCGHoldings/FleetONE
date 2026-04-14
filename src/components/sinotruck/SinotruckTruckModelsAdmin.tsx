// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Eye, Copy, Images, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SinotruckTruckModelProfile } from './SinotruckTruckModelProfile';
import { SinotruckImageManager } from './SinotruckImageManager';

const formSchema = z.object({
  truck_name: z.string().min(1, 'Truck name is required'),
  model_name: z.string().min(1, 'Model is required'),
  body_type: z.string().default('Cargo'),
  drive_configuration: z.string().optional(),
  year: z.number().min(2000).max(new Date().getFullYear() + 2),
  condition: z.string().min(1, 'Condition is required'),
  base_price: z.number().min(1, 'Base price is required'),
  charger_price: z.number().optional(),
  capacity_kw: z.number().min(1, 'Capacity is required'),
  is_active: z.boolean().default(true),
  engine_model: z.string().optional(),
  horsepower: z.string().optional(),
  engine_type: z.string().optional(),
  emission_standard: z.string().optional(),
  displacement: z.string().optional(),
  torque: z.string().optional(),
  fuel_type: z.string().optional(),
  fuel_tank_capacity: z.string().optional(),
  transmission_model: z.string().optional(),
  transmission_type: z.string().optional(),
  gears: z.string().optional(),
  clutch_type: z.string().optional(),
  front_axle_capacity: z.string().optional(),
  rear_axle_capacity: z.string().optional(),
  suspension_type: z.string().optional(),
  wheelbase: z.string().optional(),
  tyre_size: z.string().optional(),
  tyre_quantity: z.string().optional(),
  rim_type: z.string().optional(),
  cabin_model: z.string().optional(),
  seating_capacity: z.string().optional(),
  driver_seat_type: z.string().optional(),
  overall_dimensions: z.string().optional(),
  gvw_gcw: z.string().optional(),
  payload_capacity: z.string().optional(),
  curb_weight: z.string().optional(),
  max_speed: z.string().optional(),
  gradeability: z.string().optional(),
  turning_radius: z.string().optional(),
  abs_system: z.boolean().default(false),
  cameras: z.string().optional(),
  gps_tracking: z.boolean().default(false),
  multimedia_system: z.string().optional(),
  body_dimensions: z.string().optional(),
  body_volume: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function SinotruckTruckModelsAdmin() {
  const [truckModels, setTruckModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<any | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [managingModelId, setManagingModelId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageCountsMap, setImageCountsMap] = useState<Record<string, {count: number, primaryImage?: string}>>({});
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true,
      abs_system: false,
      gps_tracking: false,
      body_type: 'Cargo',
      condition: 'Brand New',
    }
  });

  useEffect(() => {
    loadTruckModels();
  }, []);

  const loadTruckModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sinotruck_truck_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTruckModels(data || []);

      // Fetch image counts and primary images for each model
      const imageCounts: Record<string, {count: number, primaryImage?: string}> = {};
      
      for (const model of data || []) {
        const { data: images } = await supabase
          .from('sinotruck_truck_model_images')
          .select('image_url, is_primary')
          .eq('truck_model_id', model.id)
          .order('display_order', { ascending: true });
        
        const primaryImage = images?.find(img => img.is_primary)?.image_url || images?.[0]?.image_url;
        
        imageCounts[model.id] = {
          count: images?.length || 0,
          primaryImage: primaryImage
        };
      }
      
      setImageCountsMap(imageCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load truck models",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editingModel) {
        const { error } = await supabase
          .from('sinotruck_truck_models')
          .update(data as any)
          .eq('id', editingModel.id);

        if (error) throw error;
        toast({ title: "Success", description: "Truck model updated successfully" });
      } else {
        const { error } = await supabase
          .from('sinotruck_truck_models')
          .insert([data as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Truck model created successfully" });
      }

      setShowDialog(false);
      setEditingModel(null);
      form.reset();
      loadTruckModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (model: any) => {
    setEditingModel(model);
    form.reset(model as any);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this truck model?')) return;

    try {
      const { error } = await supabase
        .from('sinotruck_truck_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Truck model deleted" });
      loadTruckModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = (model: any) => {
    const duplicateData = { ...model };
    delete duplicateData.id;
    delete duplicateData.created_at;
    delete duplicateData.updated_at;
    duplicateData.truck_name = `${model.truck_name} (Copy)`;
    
    form.reset(duplicateData as any);
    setEditingModel(null);
    setShowDialog(true);
  };

  const handleViewProfile = (model: any) => {
    setSelectedModel(model);
    setIsProfileModalOpen(true);
  };

  const handleManageImages = (modelId: string) => {
    setManagingModelId(modelId);
    setImageManagerOpen(true);
  };

  const handleImageManagerClose = () => {
    setImageManagerOpen(false);
    setManagingModelId(null);
    loadTruckModels(); // Refresh to get updated images
  };

  const filteredModels = truckModels.filter(model =>
    model.truck_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.body_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Truck Models Management</CardTitle>
            <Button onClick={() => {
              setEditingModel(null);
              form.reset({
                is_active: true,
                abs_system: false,
                gps_tracking: false,
                body_type: 'Cargo',
                condition: 'Brand New',
              });
              setShowDialog(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Truck Model
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search truck models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : filteredModels.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No truck models found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModels.map((model) => (
                <Card key={model.id} className="overflow-hidden">
                  {/* Large image section at top */}
                  <div className="relative aspect-video bg-muted">
                    {imageCountsMap[model.id]?.primaryImage ? (
                      <img
                        src={imageCountsMap[model.id].primaryImage!}
                        alt={model.truck_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Truck className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {imageCountsMap[model.id]?.count > 0 && (
                      <Badge className="absolute top-2 left-2 bg-black/60 text-white">
                        <Images className="h-3 w-3 mr-1" />
                        {imageCountsMap[model.id].count}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Card content below image */}
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {/* Title and Active badge */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{model.truck_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          model.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {model.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {/* Specifications */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><span className="font-medium">Model:</span> {model.model_name}</p>
                        <p><span className="font-medium">Type:</span> {model.body_type}</p>
                        <p><span className="font-medium">Config:</span> {model.drive_configuration || 'N/A'}</p>
                        <p><span className="font-medium">Power:</span> {model.horsepower || 'N/A'}</p>
                        <p><span className="font-medium">Year:</span> {model.year}</p>
                        <p><span className="font-medium">Condition:</span> {model.condition}</p>
                      </div>
                      
                      {/* Price */}
                      <div className="text-lg font-bold text-primary">
                        LKR {model.base_price.toLocaleString()}
                      </div>
                      
                      {/* Action buttons in grid */}
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
                          onClick={() => handleManageImages(model.id)}
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
                          variant="destructive" 
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? 'Edit Truck Model' : 'Add New Truck Model'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="engine">Engine</TabsTrigger>
                  <TabsTrigger value="transmission">Transmission</TabsTrigger>
                  <TabsTrigger value="cabin">Cabin</TabsTrigger>
                  <TabsTrigger value="specs">Specs</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="truck_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Truck Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., SINOTRUCK HOWO NX" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., ZZ4187N361JE1R" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="body_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Cargo">Cargo</SelectItem>
                              <SelectItem value="Tipper">Tipper</SelectItem>
                              <SelectItem value="Freezer">Freezer</SelectItem>
                              <SelectItem value="Prime Mover">Prime Mover</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drive_configuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drive Configuration</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 4×2, 6×4, 8×4" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                          <FormLabel>Condition *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Brand New">Brand New</SelectItem>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="Used">Used</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity_kw"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity (KW) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="base_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (LKR) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="charger_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Charger Price (LKR)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Active</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="engine" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="engine_model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine Model</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., MC07.34-50" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="horsepower"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horsepower</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 340 HP" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engine_type"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Engine Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 6-cylinder inline, turbocharged diesel" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emission_standard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emission Standard</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Euro 5" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="displacement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Displacement</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 2.3L" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="torque"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Torque</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 1,050 Nm @ 1,200–1,800 rpm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuel_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Diesel" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuel_tank_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Tank Capacity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 400 L" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_speed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Speed</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 90–102 km/h" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gradeability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gradeability</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 30%" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="transmission" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="transmission_model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transmission Model</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., HW13709XST" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transmission_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Manual, AMT" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gears</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 9 Forward + 1 Reverse" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clutch_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clutch Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Heavy-duty single plate" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="front_axle_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Front Axle Capacity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 7.1 T" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rear_axle_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rear Axle Capacity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 16 T × 2" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="suspension_type"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Suspension Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Multi-leaf spring" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="wheelbase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wheelbase</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 2900 mm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tyre_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tyre Size</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 295/80R22.5" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tyre_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tyre Quantity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 6 + 1 spare" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rim_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rim Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Alloy rims" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="cabin" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cabin_model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cabin Model</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., H78L two sleeper" />
                          </FormControl>
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
                            <Input {...field} placeholder="e.g., Driver + 1 passenger" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="driver_seat_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver Seat Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Air suspension" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="multimedia_system"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Multimedia System</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., MP5" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cameras"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cameras</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 4-direction cameras" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="abs_system"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">ABS System</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gps_tracking"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">GPS Tracking</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="specs" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="overall_dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Dimensions</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., L×W×H" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gvw_gcw"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GVW/GCW</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., GVW: 45T or GCW: 80T" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payload_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payload Capacity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 31–33 tons" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="curb_weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Curb Weight</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 12–14 tons" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="turning_radius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Turning Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 8–9 m" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="body_dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Dimensions</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 4200 × 2300 × 1000 mm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="body_volume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Volume</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 9.6 m³" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingModel(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingModel ? 'Update' : 'Create'} Truck Model
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <SinotruckTruckModelProfile
        truckModel={selectedModel}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedModel(null);
        }}
      />

      {/* Image Manager */}
      {managingModelId && (
        <SinotruckImageManager
          truckModelId={managingModelId}
          truckModelName={truckModels.find(m => m.id === managingModelId)?.truck_name || ''}
          isOpen={imageManagerOpen}
          onClose={handleImageManagerClose}
          onUpdate={loadTruckModels}
        />
      )}
    </>
  );
}
