import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Eye, Copy, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VEHICLE_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "suv", label: "SUV" },
  { value: "sedan", label: "Sedans" },
  { value: "pickup", label: "Pickup" },
  { value: "compact", label: "Compact" },
  { value: "hatchback", label: "Hatchback" }
];

const VEHICLE_BRANDS = [
  { value: "all", label: "All" },
  { value: "daihatsu", label: "Daihatsu" },
  { value: "honda", label: "Honda" },
  { value: "hyundai", label: "Hyundai" },
  { value: "isuzu", label: "Isuzu" },
  { value: "kia", label: "KIA" },
  { value: "mazda", label: "Mazda" },
  { value: "mitsubishi", label: "Mitsubishi" },
  { value: "nissan", label: "Nissan" },
  { value: "perodua", label: "Perodua" },
  { value: "subaru", label: "Subaru" },
  { value: "suzuki", label: "Suzuki" },
  { value: "toyota", label: "Toyota" }
];

const formSchema = z.object({
  vehicle_name: z.string().min(1, 'Vehicle name is required'),
  model_name: z.string().min(1, 'Model is required'),
  brand: z.string().min(1, 'Brand is required'),
  category: z.string().min(1, 'Category is required'),
  engine_cc: z.string().optional(),
  transmission: z.string().optional(),
  fuel_type: z.string().optional(),
  drive_type: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  base_price: z.number().min(1, 'Price is required'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface VehicleModel {
  id: string;
  vehicle_name: string;
  model_name: string;
  brand: string;
  category: string;
  engine_cc?: string;
  transmission?: string;
  fuel_type?: string;
  drive_type?: string;
  year?: number;
  base_price: number;
  is_active: boolean;
  created_at: string;
  image_url?: string;
}

export function LightVehicleModelsAdmin() {
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true,
      brand: 'toyota',
      category: 'sedan',
      transmission: 'automatic',
      fuel_type: 'petrol',
      drive_type: '2wd',
    }
  });

  const loadVehicleModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lightvehicle_models')
        .select('*')
        .order('vehicle_name');

      if (error) throw error;
      setVehicleModels(data || []);
      setFilteredModels(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load vehicle models",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicleModels();
  }, []);

  useEffect(() => {
    let filtered = vehicleModels;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(m => m.brand === selectedBrand);
    }
    setFilteredModels(filtered);
  }, [selectedCategory, selectedBrand, vehicleModels]);

  const handleSubmit = async (data: FormData) => {
    try {
      const dbData = {
        vehicle_name: data.vehicle_name,
        model_name: data.model_name,
        brand: data.brand,
        category: data.category,
        engine_cc: data.engine_cc || null,
        transmission: data.transmission || null,
        fuel_type: data.fuel_type || null,
        drive_type: data.drive_type || null,
        year: data.year || null,
        base_price: data.base_price,
        is_active: data.is_active,
      };

      if (editingModel) {
        const { error } = await supabase
          .from('lightvehicle_models')
          .update(dbData)
          .eq('id', editingModel.id);

        if (error) throw error;
        toast({ title: "Success", description: "Vehicle model updated successfully" });
      } else {
        const { error } = await supabase
          .from('lightvehicle_models')
          .insert([dbData]);

        if (error) throw error;
        toast({ title: "Success", description: "Vehicle model created successfully" });
      }

      setShowDialog(false);
      setEditingModel(null);
      form.reset();
      loadVehicleModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (model: VehicleModel) => {
    setEditingModel(model);
    form.reset({
      vehicle_name: model.vehicle_name,
      model_name: model.model_name,
      brand: model.brand,
      category: model.category,
      engine_cc: model.engine_cc || '',
      transmission: model.transmission || '',
      fuel_type: model.fuel_type || '',
      drive_type: model.drive_type || '',
      year: model.year,
      base_price: model.base_price,
      is_active: model.is_active,
    });
    setShowDialog(true);
  };

  const handleDuplicate = async (model: VehicleModel) => {
    try {
      const dbData = {
        vehicle_name: `${model.vehicle_name} (Copy)`,
        model_name: model.model_name,
        brand: model.brand,
        category: model.category,
        engine_cc: model.engine_cc,
        transmission: model.transmission,
        fuel_type: model.fuel_type,
        drive_type: model.drive_type,
        year: model.year,
        base_price: model.base_price,
        is_active: model.is_active,
      };

      const { error } = await supabase
        .from('lightvehicle_models')
        .insert([dbData]);

      if (error) throw error;
      toast({ title: "Success", description: "Vehicle model duplicated successfully" });
      loadVehicleModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle model?')) return;

    try {
      const { error } = await supabase
        .from('lightvehicle_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Vehicle model deleted successfully" });
      loadVehicleModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      suv: 'bg-blue-100 text-blue-800',
      sedan: 'bg-green-100 text-green-800',
      pickup: 'bg-orange-100 text-orange-800',
      compact: 'bg-purple-100 text-purple-800',
      hatchback: 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getBrandBadgeColor = (brand: string) => {
    const colors: Record<string, string> = {
      honda: 'bg-red-100 text-red-800',
      toyota: 'bg-blue-100 text-blue-800',
      mitsubishi: 'bg-yellow-100 text-yellow-800',
      suzuki: 'bg-green-100 text-green-800',
    };
    return colors[brand] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Light Vehicle Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading vehicle models...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle>Light Vehicle Models</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_BRANDS.map((brand) => (
                  <SelectItem key={brand.value} value={brand.value}>{brand.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingModel(null);
                  form.reset({ is_active: true, brand: 'toyota', category: 'sedan' });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle Model
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingModel ? 'Edit Vehicle Model' : 'Add New Vehicle Model'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vehicle_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Honda CR-V" {...field} />
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
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., CR-V EX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select brand" />
                                </SelectTrigger>
                              </FormControl>
                    <SelectContent>
                      <SelectItem value="daihatsu">Daihatsu</SelectItem>
                      <SelectItem value="honda">Honda</SelectItem>
                      <SelectItem value="hyundai">Hyundai</SelectItem>
                      <SelectItem value="isuzu">Isuzu</SelectItem>
                      <SelectItem value="kia">KIA</SelectItem>
                      <SelectItem value="mazda">Mazda</SelectItem>
                      <SelectItem value="mitsubishi">Mitsubishi</SelectItem>
                      <SelectItem value="nissan">Nissan</SelectItem>
                      <SelectItem value="perodua">Perodua</SelectItem>
                      <SelectItem value="subaru">Subaru</SelectItem>
                      <SelectItem value="suzuki">Suzuki</SelectItem>
                      <SelectItem value="toyota">Toyota</SelectItem>
                    </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="suv">SUV</SelectItem>
                                <SelectItem value="sedan">Sedan</SelectItem>
                                <SelectItem value="pickup">Pickup</SelectItem>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="hatchback">Hatchback</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="engine_cc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Engine</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 1500cc Turbo" {...field} />
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select transmission" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="automatic">Automatic</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="cvt">CVT</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fuel_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fuel Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fuel type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="petrol">Petrol</SelectItem>
                                <SelectItem value="diesel">Diesel</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                                <SelectItem value="electric">Electric</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="drive_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Drive Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select drive type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="2wd">2WD</SelectItem>
                                <SelectItem value="4wd">4WD</SelectItem>
                                <SelectItem value="awd">AWD</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="e.g., 2024"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
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
                            <FormLabel>Base Price (LKR)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                          <FormItem className="flex items-center gap-2">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => (
            <Card key={model.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{model.vehicle_name}</h3>
                      <p className="text-sm text-muted-foreground">{model.model_name}</p>
                    </div>
                  </div>
                  {!model.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>

                <div className="flex gap-2 mb-3">
                  <Badge className={getBrandBadgeColor(model.brand)}>
                    {model.brand.charAt(0).toUpperCase() + model.brand.slice(1)}
                  </Badge>
                  <Badge className={getCategoryBadgeColor(model.category)}>
                    {model.category.charAt(0).toUpperCase() + model.category.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground mb-3">
                  {model.engine_cc && <p>Engine: {model.engine_cc}</p>}
                  {model.transmission && <p>Transmission: {model.transmission}</p>}
                  {model.fuel_type && <p>Fuel: {model.fuel_type}</p>}
                  {model.year && <p>Year: {model.year}</p>}
                </div>

                <div className="text-lg font-bold text-primary mb-3">
                  LKR {model.base_price.toLocaleString()}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(model)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDuplicate(model)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(model.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredModels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No vehicle models found. Add your first vehicle model to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
